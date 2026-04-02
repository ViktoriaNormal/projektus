import {
  Calendar, User, Tag, FileText, CheckSquare, Link as LinkIcon, AlertTriangle,
  X, Plus, Send, Paperclip, MessageSquare, BarChart3, Trash2, Eye,
  Copy, Check, ChevronRight, Loader2, Upload, Download,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useParams, Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { UserAvatar } from "../components/UserAvatar";
import { UserSelect, UserMultiSelect, type UserOption } from "../components/UserSelect";
import { SprintSelect, SprintMultiSelect, type SprintOption } from "../components/SprintSelect";
import { getTask, createTask, updateTask, deleteTask, searchTasks, type TaskResponse } from "../api/tasks";
import { getProject, type ProjectResponse } from "../api/projects";
import { getUser, type UserProfileResponse } from "../api/users";
import { getProjectMembers, type ProjectMemberResponse } from "../api/projects";
import { useAuth } from "../contexts/AuthContext";
import { getProjectBoards, getBoard, getBoardColumns, getBoardFields, type BoardResponse, type BoardField, type ColumnResponse } from "../api/boards";
import { getTaskChecklists, createChecklist, addChecklistItem, setChecklistItemStatus, updateChecklist, deleteChecklist, updateChecklistItem, deleteChecklistItem, type ChecklistResponse } from "../api/checklists";
import { getTaskTags, addTagToTask, removeTagFromTask, getBoardTags, type TagResponse } from "../api/tags";
import { getTaskDependencies, addDependency, type TaskDependency, type DependencyType } from "../api/dependencies";
import { getTaskComments, createComment, deleteComment, type CommentResponse } from "../api/comments";
import { getTaskAttachments, uploadAttachment, deleteAttachment, type AttachmentResponse } from "../api/attachments";
import { getTaskWatchers, addWatcher, removeWatcher, type TaskWatcher } from "../api/watchers";
import { getTaskFieldValues, setTaskFieldValue, type TaskFieldValue } from "../api/field-values";
import { moveTasksToSprint, getProjectSprints, type SprintResponse } from "../api/sprints";

export default function TaskDetail() {
  const { id: taskId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const isCreateMode = taskId === "new";

  // Data state
  const [task, setTask] = useState<TaskResponse | null>(null);
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [owner, setOwner] = useState<UserProfileResponse | null>(null);
  const [executor, setExecutor] = useState<UserProfileResponse | null>(null);
  const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
  const [memberUsers, setMemberUsers] = useState<Map<string, UserProfileResponse>>(new Map());
  const [columns, setColumns] = useState<ColumnResponse[]>([]);
  const [boardFields, setBoardFields] = useState<BoardField[]>([]);
  const [checklists, setChecklists] = useState<ChecklistResponse[]>([]);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [attachments, setAttachments] = useState<AttachmentResponse[]>([]);
  const [watchers, setWatchers] = useState<TaskWatcher[]>([]);
  const [fieldValues, setFieldValues] = useState<TaskFieldValue[]>([]);
  const [projectTasks, setProjectTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardData, setBoardData] = useState<BoardResponse | null>(null);
  const [projectSprints, setProjectSprints] = useState<SprintResponse[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<"details" | "comments">("details");
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [boardAllTags, setBoardAllTags] = useState<TagResponse[]>([]);

  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  useBodyScrollLock(showDeleteModal || showChecklistModal || showLinkModal || showAttachmentModal);

  // Form state
  const [checklistTitle, setChecklistTitle] = useState("");
  const [newItemContent, setNewItemContent] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState("");
  const [linkType, setLinkType] = useState<DependencyType>("relates_to");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string; content: string } | null>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Create mode
  const [createSaving, setCreateSaving] = useState(false);

  // ── Data Loading ────────────────────────────────────────────

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    try {
      const t = await getTask(taskId);
      setTask(t);
      setEditName(t.name);
      setEditDescription(t.description || "");

      // Load project & sprints
      try { const p = await getProject(t.projectId); setProject(p); } catch { /**/ }
      try { setProjectSprints(await getProjectSprints(t.projectId)); } catch { /**/ }

      // Load owner & executor (use userId fields for user profile lookup)
      try { const o = await getUser(t.ownerUserId); setOwner(o); } catch { /**/ }
      if (t.executorUserId) { try { const e = await getUser(t.executorUserId); setExecutor(e); } catch { /**/ } }

      // Load board data using task.boardId
      if (t.boardId) {
        try {
          setBoardId(t.boardId);
          const [board, cols, fields] = await Promise.all([
            getBoard(t.boardId),
            getBoardColumns(t.boardId),
            getBoardFields(t.boardId),
          ]);
          setBoardData(board);
          setColumns(cols.sort((a, b) => a.order - b.order));
          setBoardFields(fields);
        } catch { /**/ }
      }

      // Load members
      try {
        const m = await getProjectMembers(t.projectId);
        setMembers(m);
        const uMap = new Map<string, UserProfileResponse>();
        await Promise.allSettled(m.map(async (member) => {
          try { const u = await getUser(member.userId); uMap.set(member.userId, u); } catch { /**/ }
        }));
        setMemberUsers(uMap);
      } catch { /**/ }

      // Load checklists, tags, dependencies, comments, attachments, watchers, field values, project tasks
      const [cl, tg, deps, cmts, atts, wts, fvs, tasks] = await Promise.all([
        getTaskChecklists(taskId).catch(() => []),
        getTaskTags(taskId).catch(() => []),
        getTaskDependencies(taskId).catch(() => []),
        getTaskComments(taskId).catch(() => []),
        getTaskAttachments(taskId).catch(() => []),
        getTaskWatchers(taskId).catch(() => []),
        getTaskFieldValues(taskId).catch(() => []),
        searchTasks({ projectId: t.projectId }).catch(() => []),
      ]);
      setChecklists(cl);
      setTags(tg);
      setDependencies(deps);
      setComments(cmts);
      setAttachments(atts);
      setWatchers(wts);
      setFieldValues(fvs);
      setProjectTasks(tasks.filter(pt => pt.id !== taskId));
    } catch {
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // ── Create mode loading ──────────────────────────────────────

  const createModeLoaded = useRef(false);

  const loadCreateMode = useCallback(async () => {
    const pId = searchParams.get("projectId");
    const bId = searchParams.get("boardId");
    if (!pId || !bId) { setLoading(false); return; }

    // If already loaded, only update the owner when currentUser becomes available
    if (createModeLoaded.current) {
      if (currentUser?.id) {
        const u = memberUsers.get(currentUser.id);
        if (u) setOwner(u);
        const ownerMember = members.find(m => m.userId === currentUser.id);
        setTask(prev => prev ? { ...prev, ownerUserId: currentUser.id, ownerMemberId: ownerMember?.id || "" } : prev);
      }
      return;
    }

    try {
      setBoardId(bId);

      const [proj, board, cols, fields, mems, tasks] = await Promise.all([
        getProject(pId).catch(() => null),
        getBoard(bId).catch(() => null as BoardResponse | null),
        getBoardColumns(bId).catch(() => [] as ColumnResponse[]),
        getBoardFields(bId).catch(() => [] as BoardField[]),
        getProjectMembers(pId).catch(() => [] as ProjectMemberResponse[]),
        searchTasks({ projectId: pId }).catch(() => [] as TaskResponse[]),
      ]);
      if (board) setBoardData(board);

      if (proj) setProject(proj);
      try { setProjectSprints(await getProjectSprints(pId)); } catch { /**/ }
      setColumns(cols.sort((a, b) => a.order - b.order));
      setBoardFields(fields);
      setMembers(mems);
      setProjectTasks(tasks);

      const uMap = new Map<string, UserProfileResponse>();
      await Promise.allSettled(mems.map(async (m) => {
        try { const u = await getUser(m.userId); uMap.set(m.userId, u); } catch { /**/ }
      }));
      setMemberUsers(uMap);

      // Owner = current authenticated user
      let ownerUserId = currentUser?.id || "";
      let ownerMemberId = "";
      if (ownerUserId && uMap.has(ownerUserId)) {
        setOwner(uMap.get(ownerUserId)!);
        ownerMemberId = mems.find(m => m.userId === ownerUserId)?.id || "";
      } else if (mems.length > 0) {
        ownerUserId = mems[0].userId;
        ownerMemberId = mems[0].id;
        if (uMap.has(ownerUserId)) setOwner(uMap.get(ownerUserId)!);
      }

      // Set synthetic empty task so the main render works
      setTask({
        id: "",
        key: "",
        projectId: pId,
        boardId: bId,
        ownerMemberId,
        executorMemberId: null,
        ownerUserId,
        executorUserId: null,
        name: "",
        description: null,
        deadline: null,
        columnId: null,
        swimlaneId: null,
        progress: null,
        priority: null,
        estimation: null,
      });
      setEditName("");
      setEditDescription("");
      createModeLoaded.current = true;
    } finally {
      setLoading(false);
    }
  }, [searchParams, currentUser]);

  useEffect(() => {
    if (isCreateMode) loadCreateMode();
    else loadTask();
  }, [isCreateMode, loadCreateMode, loadTask]);

  // ── Create task handler ─────────────────────────────────────

  const handleCreateTask = async () => {
    if (!task) return;
    const pId = searchParams.get("projectId");
    const bId = searchParams.get("boardId");
    if (!pId || !bId) return;
    if (!task.name.trim()) { toast.error("Введите название задачи"); return; }

    const ownerMember = task.ownerMemberId
      ? members.find(m => m.id === task.ownerMemberId)
      : (currentUser ? members.find(m => m.userId === currentUser.id) || members[0] : members[0]);
    if (!ownerMember) { toast.error("Не удалось определить участника проекта"); return; }

    const executorMember = task.executorMemberId
      ? members.find(m => m.id === task.executorMemberId)
      : null;

    setCreateSaving(true);
    try {
      const sprintId = searchParams.get("sprintId");
      const newTask = await createTask({
        projectId: pId,
        ownerMemberId: ownerMember.id,
        name: task.name.trim(),
        boardId: bId,
        description: task.description || undefined,
        executorMemberId: executorMember?.id,
        priority: task.priority || undefined,
        deadline: task.deadline || undefined,
        estimation: task.estimation || undefined,
        // Nested entities
        checklists: checklists.length > 0
          ? checklists.map(cl => ({ name: cl.name, items: cl.items.map(it => ({ content: it.content, isChecked: it.isChecked, order: it.order })) }))
          : undefined,
        tags: tags.length > 0 ? tags.map(t => t.name) : undefined,
        watcherMemberIds: watchers.length > 0 ? watchers.map(w => w.memberId) : undefined,
        fieldValues: fieldValues.length > 0
          ? fieldValues.map(fv => ({ fieldId: fv.fieldId, valueText: fv.valueText, valueNumber: fv.valueNumber, valueDatetime: fv.valueDatetime }))
          : undefined,
        dependencies: dependencies.length > 0
          ? dependencies.map(d => ({ dependsOnTaskId: d.dependsOnTaskId, type: d.type }))
          : undefined,
        addToBacklog: (!sprintId && searchParams.get("backlog") === "1") || undefined,
      });

      // If creating from a sprint, move the task to that sprint
      if (sprintId && pId) {
        try {
          await moveTasksToSprint(pId, { sprintId, taskIds: [newTask.id] });
        } catch { /**/ }
      }

      // Upload pending attachments
      if (pendingFiles.length > 0) {
        await Promise.allSettled(pendingFiles.map(f => uploadAttachment(newTask.id, f)));
      }

      toast.success("Задача создана");
      const ret = searchParams.get("returnUrl");
      navigate(`/tasks/${newTask.id}${ret ? `?returnUrl=${encodeURIComponent(ret)}` : ""}`, { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Ошибка создания задачи");
    } finally {
      setCreateSaving(false);
    }
  };

  // ── Handlers ────────────────────────────────────────────────

  const handleUpdateField = async (field: string, value: any) => {
    if (!task) return;
    if (isCreateMode) {
      setTask(prev => prev ? { ...prev, [field]: value } : prev);
      return;
    }
    try {
      await updateTask(task.id, { [field]: value });
      await loadTask();
    } catch (e: any) { toast.error(e.message || "Ошибка обновления"); }
  };

  const handleSaveName = () => {
    if (isCreateMode) {
      setTask(prev => prev ? { ...prev, name: editName.trim() } : prev);
      return;
    }
    if (editName.trim() && editName !== task?.name) handleUpdateField("name", editName.trim());
  };

  const handleSaveDescription = () => {
    if (isCreateMode) {
      setTask(prev => prev ? { ...prev, description: editDescription.trim() || null } : prev);
      return;
    }
    const val = editDescription.trim() || null;
    if (val !== (task?.description || null)) handleUpdateField("description", val);
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    try {
      await deleteTask(task.id);
      toast.success("Задача удалена");
      navigate("/tasks");
    } catch (e: any) { toast.error(e.message || "Ошибка удаления"); }
  };

  const handleCopyKey = () => {
    if (!task) return;
    navigator.clipboard.writeText(task.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Create mode: local ID counter for synthetic entities ──
  const localIdCounter = useRef(0);
  const nextLocalId = () => `local-${++localIdCounter.current}`;

  // Checklists
  const handleCreateChecklist = async () => {
    if (!task || !checklistTitle.trim()) return;
    if (isCreateMode) {
      setChecklists(prev => [...prev, { id: nextLocalId(), taskId: "", name: checklistTitle.trim(), items: [] }]);
      setChecklistTitle("");
      setShowChecklistModal(false);
      return;
    }
    try {
      await createChecklist(task.id, { name: checklistTitle.trim() });
      setChecklistTitle("");
      setShowChecklistModal(false);
      setChecklists(await getTaskChecklists(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка создания чек-листа"); }
  };

  const handleAddItem = async (checklistId: string) => {
    const content = newItemContent[checklistId]?.trim();
    if (!content) return;
    if (isCreateMode) {
      setChecklists(prev => prev.map(cl =>
        cl.id === checklistId
          ? { ...cl, items: [...cl.items, { id: nextLocalId(), checklistId, content, isChecked: false, order: cl.items.length }] }
          : cl
      ));
      setNewItemContent(prev => ({ ...prev, [checklistId]: "" }));
      return;
    }
    try {
      await addChecklistItem(checklistId, { content });
      setNewItemContent(prev => ({ ...prev, [checklistId]: "" }));
      if (task) setChecklists(await getTaskChecklists(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const handleToggleItem = async (itemId: string, checked: boolean) => {
    if (isCreateMode) {
      setChecklists(prev => prev.map(cl => ({
        ...cl,
        items: cl.items.map(it => it.id === itemId ? { ...it, isChecked: checked } : it),
      })));
      return;
    }
    try {
      await setChecklistItemStatus(itemId, checked);
      if (task) setChecklists(await getTaskChecklists(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  // Checklist editing/deleting
  const handleRenameChecklist = async (checklistId: string, name: string) => {
    if (!name.trim()) return;
    if (isCreateMode) {
      setChecklists(prev => prev.map(cl => cl.id === checklistId ? { ...cl, name: name.trim() } : cl));
      return;
    }
    try {
      await updateChecklist(checklistId, { name: name.trim() });
      if (task) setChecklists(await getTaskChecklists(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    if (isCreateMode) {
      setChecklists(prev => prev.filter(cl => cl.id !== checklistId));
      return;
    }
    try {
      await deleteChecklist(checklistId);
      if (task) setChecklists(await getTaskChecklists(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const handleEditItem = async (itemId: string, content: string) => {
    if (!content.trim()) return;
    if (isCreateMode) {
      setChecklists(prev => prev.map(cl => ({
        ...cl, items: cl.items.map(it => it.id === itemId ? { ...it, content: content.trim() } : it),
      })));
      return;
    }
    try {
      await updateChecklistItem(itemId, { content: content.trim() });
      if (task) setChecklists(await getTaskChecklists(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (isCreateMode) {
      setChecklists(prev => prev.map(cl => ({ ...cl, items: cl.items.filter(it => it.id !== itemId) })));
      return;
    }
    try {
      await deleteChecklistItem(itemId);
      if (task) setChecklists(await getTaskChecklists(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  // Tags — load board tags for suggestions
  const boardTagsLoaded = useRef(false);
  useEffect(() => {
    if (boardId && !boardTagsLoaded.current) {
      boardTagsLoaded.current = true;
      getBoardTags(boardId).then(setBoardAllTags).catch(() => {});
    }
  }, [boardId]);

  const handleOpenTagInput = () => {
    setShowTagInput(true);
    setNewTag("");
  };

  const handleAddTag = async (name?: string) => {
    const tagName = (name || newTag).trim();
    if (!task || !boardId || !tagName) return;
    if (tags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
      setNewTag("");
      setShowTagInput(false);
      return;
    }
    if (isCreateMode) {
      setTags(prev => [...prev, { id: nextLocalId(), boardId: boardId!, name: tagName }]);
      setNewTag("");
      setShowTagInput(false);
      return;
    }
    try {
      await addTagToTask(boardId, task.id, { name: tagName });
      setNewTag("");
      setShowTagInput(false);
      setTags(await getTaskTags(task.id));
      // Refresh board tags for future suggestions
      setBoardAllTags(await getBoardTags(boardId));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!task) return;
    if (isCreateMode) {
      setTags(prev => prev.filter(t => t.id !== tagId));
      return;
    }
    try {
      await removeTagFromTask(task.id, tagId);
      setTags(await getTaskTags(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  // Dependencies
  const handleAddDependency = async () => {
    if (!task || !selectedTaskId) return;
    if (dependencies.some(d => d.dependsOnTaskId === selectedTaskId)) {
      toast.error("Связь с этой задачей уже существует");
      return;
    }
    if (isCreateMode) {
      setDependencies(prev => [...prev, { id: nextLocalId(), taskId: "", dependsOnTaskId: selectedTaskId, type: linkType }]);
      setSelectedTaskId("");
      setShowLinkModal(false);
      return;
    }
    try {
      await addDependency(task.id, { dependsOnTaskId: selectedTaskId, type: linkType });
      setSelectedTaskId("");
      setShowLinkModal(false);
      setDependencies(await getTaskDependencies(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  // Comments
  const handleAddComment = async () => {
    if (!task || !commentText.trim()) return;
    try {
      await createComment(task.id, {
        content: commentText.trim(),
        parentCommentId: replyTo?.id || undefined,
      });
      setCommentText("");
      setReplyTo(null);
      setComments(await getTaskComments(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const handleReply = (comment: CommentResponse) => {
    const author = memberUsers.get(comment.authorId);
    setReplyTo({ id: comment.id, authorName: author?.fullName || "Пользователь", content: comment.content });
    commentTextareaRef.current?.focus();
  };

  const handleCommentInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);
    const cursorPos = e.target.selectionStart;
    // Check if user just typed @
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    if (atMatch) {
      setShowMentionDropdown(true);
      setMentionFilter(atMatch[1].toLowerCase());
      setMentionCursorPos(cursorPos);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (user: UserProfileResponse) => {
    const textBeforeCursor = commentText.slice(0, mentionCursorPos);
    const atIdx = textBeforeCursor.lastIndexOf("@");
    const before = commentText.slice(0, atIdx);
    const after = commentText.slice(mentionCursorPos);
    const mention = `@${user.fullName} `;
    setCommentText(before + mention + after);
    setShowMentionDropdown(false);
    commentTextareaRef.current?.focus();
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task) return;
    try {
      await deleteComment(commentId);
      setComments(await getTaskComments(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  // Attachments
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleFileUpload = async (file: File) => {
    if (!task) return;
    if (isCreateMode) {
      // Store locally, upload after task creation
      setPendingFiles(prev => [...prev, file]);
      setAttachments(prev => [...prev, {
        id: `pending-${Date.now()}-${file.name}`,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      } as any]);
      setShowAttachmentModal(false);
      return;
    }
    setUploadingFile(true);
    try {
      await uploadAttachment(task.id, file);
      setAttachments(await getTaskAttachments(task.id));
      setShowAttachmentModal(false);
    } catch (e: any) { toast.error(e.message || "Ошибка загрузки"); }
    finally { setUploadingFile(false); }
  };

  const handleDownloadAttachment = async (att: AttachmentResponse) => {
    try {
      const token = localStorage.getItem("access_token");
      const resp = await fetch(`/api/v1/tasks/attachments/${att.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error("Ошибка скачивания");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || "Ошибка скачивания файла");
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (!task) return;
    if (isCreateMode) {
      // Remove from pending files by matching index
      const idx = attachments.findIndex(a => a.id === attId);
      if (idx >= 0) {
        setAttachments(prev => prev.filter(a => a.id !== attId));
        setPendingFiles(prev => prev.filter((_, i) => i !== idx));
      }
      return;
    }
    try {
      await deleteAttachment(attId);
      setAttachments(await getTaskAttachments(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  // Watchers
  const handleAddWatcher = async (memberId: string) => {
    if (!task) return;
    if (isCreateMode) {
      if (!watchers.some(w => w.memberId === memberId)) {
        setWatchers(prev => [...prev, { taskId: "", memberId }]);
      }
      setShowWatcherModal(false);
      return;
    }
    try {
      await addWatcher(task.id, memberId);
      setWatchers(await getTaskWatchers(task.id));
      setShowWatcherModal(false);
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const handleRemoveWatcher = async (memberId: string) => {
    if (!task) return;
    if (isCreateMode) {
      setWatchers(prev => prev.filter(w => w.memberId !== memberId));
      return;
    }
    try {
      await removeWatcher(task.id, memberId);
      setWatchers(await getTaskWatchers(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  // Field values
  const handleSetFieldValue = async (fieldId: string, field: BoardField, rawValue: string) => {
    if (!task) return;
    const data: { valueText?: string | null; valueNumber?: number | null; valueDatetime?: string | null } = {};
    if (field.fieldType === "number") {
      data.valueNumber = rawValue ? Number(rawValue) : null;
    } else if (field.fieldType === "datetime") {
      data.valueDatetime = rawValue ? new Date(rawValue).toISOString() : null;
    } else {
      data.valueText = rawValue || null;
    }
    if (isCreateMode) {
      setFieldValues(prev => {
        const existing = prev.findIndex(v => v.fieldId === fieldId);
        const entry = { fieldId, valueText: data.valueText ?? null, valueNumber: data.valueNumber ?? null, valueDatetime: data.valueDatetime ?? null };
        if (existing >= 0) { const next = [...prev]; next[existing] = entry; return next; }
        return [...prev, entry];
      });
      return;
    }
    try {
      await setTaskFieldValue(task.id, fieldId, data);
      setFieldValues(await getTaskFieldValues(task.id));
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const getFieldValue = (fieldId: string, field: BoardField): string => {
    const fv = fieldValues.find(v => v.fieldId === fieldId);
    if (!fv) return "";
    if (field.fieldType === "number") return fv.valueNumber != null ? String(fv.valueNumber) : "";
    if (field.fieldType === "datetime") return fv.valueDatetime ? fv.valueDatetime.slice(0, 16) : "";
    return fv.valueText || "";
  };

  // ── Derived data ────────────────────────────────────────────

  const currentColumn = columns.find(c => c.id === task?.columnId);
  const blockingDeps = dependencies.filter(d => d.type === "blocks");
  const blockedByDeps = dependencies.filter(d => d.type === "is_blocked_by");
  const parentDeps = dependencies.filter(d => d.type === "parent");
  const subtaskDeps = dependencies.filter(d => d.type === "subtask");
  const relatedDeps = dependencies.filter(d => d.type === "relates_to");

  const getDepTask = (dep: TaskDependency) => projectTasks.find(t => t.id === dep.dependsOnTaskId);

  // Progress — only from checklists
  const totalChecklistItems = checklists.reduce((sum, c) => sum + c.items.length, 0);
  const completedChecklistItems = checklists.reduce((sum, c) => sum + c.items.filter(i => i.isChecked).length, 0);
  const hasProgress = totalChecklistItems > 0;
  const progressValue = hasProgress ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 0;

  // Custom fields (non-system)
  const customFields = boardFields.filter(f => !f.isSystem);

  // ── Validation for all fields ──────────────────────────────
  const allErrors: { fieldId: string; message: string }[] = [];

  // System field validation
  if (!task?.name?.trim()) allErrors.push({ fieldId: "_name", message: "Название задачи не заполнено" });
  if (task?.estimation && boardData?.estimationUnit) {
    const estVal = task.estimation.trim();
    if (estVal && isNaN(Number(estVal))) allErrors.push({ fieldId: "_estimation", message: "Оценка трудозатрат должна быть числом" });
  }
  if (task?.deadline && new Date(task.deadline) < new Date(new Date().toISOString().slice(0, 10))) {
    allErrors.push({ fieldId: "_deadline", message: "Крайний срок просрочен" });
  }

  // Custom field validation
  for (const f of customFields) {
    const val = getFieldValue(f.id, f);
    // select with options always has a value (first option selected by default), checkbox always has state
    const implicitlyFilled = (f.fieldType === "select" && f.options && f.options.length > 0)
      || f.fieldType === "checkbox";
    if (f.isRequired && !implicitlyFilled && (!val || !val.trim())) {
      allErrors.push({ fieldId: f.id, message: `Обязательный параметр «${f.name}» не заполнен` });
    } else if (val && f.fieldType === "number" && isNaN(Number(val))) {
      allErrors.push({ fieldId: f.id, message: `Параметр «${f.name}» должен быть числом` });
    }
  }

  // Aliases for backward compatibility in custom fields section
  const fieldErrors = allErrors.filter(e => !e.fieldId.startsWith("_"));
  const hasFieldErrors = allErrors.length > 0;
  const fieldErrorIds = new Set(allErrors.map(e => e.fieldId));
  const getError = (id: string) => allErrors.find(e => e.fieldId === id)?.message;

  // ── User options for selects ────────────────────────────────
  const memberUserOptions: UserOption[] = members.map(m => {
    const u = memberUsers.get(m.userId);
    return { id: m.userId, fullName: u?.fullName || m.userId, email: u?.email, avatarUrl: u?.avatarUrl ?? undefined };
  });
  const memberUserOptionsById: UserOption[] = members.map(m => {
    const u = memberUsers.get(m.userId);
    return { id: m.id, fullName: u?.fullName || m.userId, email: u?.email, avatarUrl: u?.avatarUrl ?? undefined };
  });

  // Sprint options for selects
  const sprintOptions: SprintOption[] = projectSprints.map(s => ({
    id: s.id, name: s.name, status: s.status, startDate: s.startDate, endDate: s.endDate,
  }));

  // ── User card helper ────────────────────────────────────────
  const renderUserCard = (user: UserProfileResponse, onRemove?: () => void) => (
    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg group">
      <div className="flex items-center gap-3">
        <UserAvatar user={{ fullName: user.fullName, avatarUrl: user.avatarUrl ?? undefined }} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{user.fullName}</p>
          {user.email && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 truncate">{user.email}</span>
              <button onClick={() => { navigator.clipboard.writeText(user.email); toast.success("Email скопирован"); }}
                className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0"><Copy size={12} /></button>
            </div>
          )}
        </div>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded"><X size={14} /></button>
      )}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={40} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Задача не найдена</h2>
          <p className="text-slate-500">Задача с ID {taskId} не существует</p>
          <Link to="/tasks" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Вернуться к списку задач
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button (view mode only) */}
      {!isCreateMode && (
        <button onClick={() => {
          const ret = searchParams.get("returnUrl");
          ret ? navigate(ret) : navigate(-1);
        }}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition-colors">
          <ChevronRight size={16} className="rotate-180" />
          <span>Назад</span>
        </button>
      )}

      {/* Create mode action bar */}
      {isCreateMode && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
          <span className="text-sm font-medium text-blue-800">Создание новой задачи — заполните поля и нажмите «Создать задачу»</span>
          <div className="flex gap-3">
            <button onClick={() => {
              const ret = searchParams.get("returnUrl");
              ret ? navigate(ret) : navigate(-1);
            }}
              className="px-4 py-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
              Отмена
            </button>
            <button onClick={handleCreateTask} disabled={!editName.trim() || createSaving || hasFieldErrors}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {createSaving && <Loader2 size={16} className="animate-spin" />}
              Создать задачу
            </button>
          </div>
        </div>
      )}

      {/* Validation errors summary */}
      {hasFieldErrors && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 mb-1">Не все параметры заполнены корректно ({allErrors.length})</p>
              <ul className="text-xs text-red-700 space-y-0.5">
                {allErrors.map(e => <li key={e.fieldId}>— {e.message}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {!isCreateMode && (
            <div className="flex items-center gap-3 mb-3">
              <span className="text-slate-600 font-mono text-sm flex items-center gap-2">
                {task.key}
                <button onClick={handleCopyKey} className="p-1 hover:bg-slate-100 rounded transition-colors" title="Копировать ключ">
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </span>
              {currentColumn && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded">{currentColumn.name}</span>
              )}
            </div>
            )}

            {/* Editable Title */}
            <textarea value={editName} onChange={e => { setEditName(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              onBlur={handleSaveName}
              className="text-3xl font-bold mb-1 w-full px-3 py-2 border-2 border-transparent rounded-lg hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors resize-none overflow-hidden"
              rows={1} placeholder="Название задачи *" />
            {fieldErrorIds.has("_name") && (
              <div className="flex items-center gap-1.5 mb-2 ml-3 text-xs text-red-600">
                <AlertTriangle size={12} className="shrink-0" />
                <span>{getError("_name")}</span>
              </div>
            )}

            {/* Editable Description */}
            <textarea value={editDescription} onChange={e => { setEditDescription(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              onBlur={handleSaveDescription}
              className="text-slate-600 w-full px-3 py-2 border-2 border-transparent rounded-lg hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors resize-none overflow-hidden"
              rows={2} placeholder="Описание задачи" />
          </div>
          {!isCreateMode && (
            <button onClick={() => setShowDeleteModal(true)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Удалить задачу">
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {/* Progress (only shown when checklists exist) */}
        {hasProgress && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Прогресс выполнения (по чек-листам)</span>
              <span className="font-semibold text-blue-600">{progressValue}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all" style={{ width: `${progressValue}%` }} />
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {tags.map(tag => (
            <span key={tag.id} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded inline-flex items-center gap-2 group">
              <Tag size={14} /> {tag.name}
              <button onClick={() => handleRemoveTag(tag.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
            </span>
          ))}
          {showTagInput ? (
            <div className="relative">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleAddTag();
                  if (e.key === "Escape") { setShowTagInput(false); setNewTag(""); }
                }}
                onBlur={() => setTimeout(() => { setShowTagInput(false); setNewTag(""); }, 150)}
                className="px-3 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                placeholder="Введите тег..."
                autoFocus
              />
              {newTag.trim() && (() => {
                const suggestions = boardAllTags
                  .filter(bt => bt.name.toLowerCase().includes(newTag.toLowerCase()) && !tags.some(t => t.name.toLowerCase() === bt.name.toLowerCase()));
                const exactMatch = boardAllTags.some(bt => bt.name.toLowerCase() === newTag.trim().toLowerCase());
                const alreadyAdded = tags.some(t => t.name.toLowerCase() === newTag.trim().toLowerCase());
                return (suggestions.length > 0 || (!exactMatch && !alreadyAdded)) ? (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                    {suggestions.map(bt => (
                      <button key={bt.id} onMouseDown={e => { e.preventDefault(); handleAddTag(bt.name); }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors">
                        {bt.name}
                      </button>
                    ))}
                    {!exactMatch && !alreadyAdded && (
                      <button onMouseDown={e => { e.preventDefault(); handleAddTag(); }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors text-blue-600 border-t border-slate-100">
                        Создать «{newTag.trim()}»
                      </button>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <button onClick={handleOpenTagInput}
              className="px-3 py-1 border-2 border-dashed border-slate-300 text-slate-600 text-sm rounded hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center gap-1">
              <Plus size={14} /> Добавить тег
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md border border-slate-100">
        <div className="border-b border-slate-200">
          <div className="flex gap-1 p-2">
            <button onClick={() => setActiveTab("details")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === "details" ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <FileText size={18} /> Детали по задаче
            </button>
            {!isCreateMode && (
            <button onClick={() => setActiveTab("comments")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === "comments" ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <MessageSquare size={18} /> Комментарии
            </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "details" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - System Fields */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-4">Детали</h2>

                  {/* Executor */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-slate-600 text-sm mb-2"><User size={16} /><span>Исполнитель</span></label>
                    <UserSelect
                      options={memberUserOptionsById}
                      value={task.executorMemberId}
                      placeholder="Не назначен"
                      onChange={memberId => {
                        if (isCreateMode) {
                          const member = members.find(m => m.id === memberId);
                          setTask(prev => prev ? { ...prev, executorMemberId: memberId, executorUserId: member?.userId || null } : prev);
                          if (member) {
                            const u = memberUsers.get(member.userId);
                            if (u) setExecutor(u); else setExecutor(null);
                          } else { setExecutor(null); }
                        } else {
                          handleUpdateField("executorMemberId", memberId);
                        }
                      }}
                    />
                  </div>

                  {/* Owner */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-slate-600 text-sm mb-2"><User size={16} /><span>Автор</span></label>
                    {owner ? (
                      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg">
                        <UserAvatar user={{ fullName: owner.fullName, avatarUrl: owner.avatarUrl ?? undefined }} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{owner.fullName}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500 truncate">{owner.email}</span>
                            <button onClick={() => { navigator.clipboard.writeText(owner.email); toast.success("Email скопирован"); }}
                              className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0"><Copy size={12} /></button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-2 bg-slate-50 rounded-lg text-sm text-slate-400">
                        {isCreateMode ? "Будет назначен автоматически" : "Не определён"}
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  {task.priority !== undefined && (
                    <div className="mb-4">
                      <label className="flex items-center gap-2 text-slate-600 text-sm mb-2"><AlertTriangle size={16} /><span>Приоритет</span></label>
                      <select value={task.priority || ""} onChange={e => handleUpdateField("priority", e.target.value || null)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Не указан</option>
                        <option value="Низкий">Низкий</option>
                        <option value="Средний">Средний</option>
                        <option value="Высокий">Высокий</option>
                        <option value="Критичный">Критичный</option>
                      </select>
                    </div>
                  )}

                  {/* Column (Status) */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-slate-600 text-sm mb-2"><BarChart3 size={16} /><span>Колонка</span></label>
                    {task.columnId ? (
                      <select value={task.columnId} onChange={e => handleUpdateField("columnId", e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {columns.map(col => (
                          <option key={col.id} value={col.id}>{col.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        Задача в бэклоге — колонка будет назначена при запуске спринта
                      </div>
                    )}
                  </div>

                  {/* Deadline */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-slate-600 text-sm mb-2"><Calendar size={16} /><span>Крайний срок</span></label>
                    <input type="date" value={task.deadline ? task.deadline.slice(0, 10) : ""}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={e => handleUpdateField("deadline", e.target.value ? new Date(e.target.value).toISOString() : null)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        fieldErrorIds.has("_deadline") ? "border-red-400 bg-red-50" : "border-slate-200"
                      }`} />
                    {fieldErrorIds.has("_deadline") && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-red-600">
                        <AlertTriangle size={12} className="shrink-0" />
                        <span>{getError("_deadline")}</span>
                      </div>
                    )}
                  </div>

                  {/* Estimation */}
                  {task.estimation !== undefined && (() => {
                    const unit = boardData?.estimationUnit || "story_points";
                    const isStoryPoints = unit === "story_points";
                    const isTime = unit === "time";
                    const label = isStoryPoints ? "Оценка трудозатрат (Story Points)" : "Оценка трудозатрат (часы)";
                    const placeholder = isStoryPoints ? "Например: 3" : "Например: 4";
                    const suffix = isStoryPoints ? "SP" : "ч";
                    const estError = fieldErrorIds.has("_estimation");
                    return (
                      <div className="mb-4">
                        <label className="flex items-center gap-2 text-slate-600 text-sm mb-2"><BarChart3 size={16} /><span>{label}</span></label>
                        <div className="relative">
                          <input type="text" value={task.estimation || ""} onChange={e => handleUpdateField("estimation", e.target.value || null)}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${suffix ? "pr-12" : ""} ${estError ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                            placeholder={placeholder} />
                          {suffix && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">{suffix}</span>
                          )}
                        </div>
                        {estError && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-red-600">
                            <AlertTriangle size={12} className="shrink-0" />
                            <span>{getError("_estimation")}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Created at */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-slate-600 text-sm mb-2"><Calendar size={16} /><span>Дата создания</span></label>
                    <div className="px-4 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                      {new Date(isCreateMode ? Date.now() : ((task as any).createdAt || Date.now()))
                        .toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>

                {/* Custom Fields (values editable, structure managed via board settings) */}
                {customFields.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-3">Кастомные параметры задачи</h3>
                    <p className="text-xs text-slate-500 mb-3">Управление параметрами — в шаблоне задачи доски</p>

                    <div className="space-y-3">
                      {customFields.map(field => {
                        const val = getFieldValue(field.id, field);
                        const hasError = fieldErrorIds.has(field.id);
                        const errorMsg = fieldErrors.find(e => e.fieldId === field.id)?.message;
                        const inputCls = `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${hasError ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-purple-500"}`;

                        let control: React.ReactNode;

                        if (field.fieldType === "checkbox") {
                          control = (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={val === "true"} onChange={e => handleSetFieldValue(field.id, field, e.target.checked ? "true" : "false")}
                                className="w-4 h-4 text-purple-600 rounded" />
                              <span className="text-sm">{val === "true" ? "Да" : "Нет"}</span>
                            </label>
                          );
                        } else if (field.fieldType === "select" && field.options) {
                          control = (
                            <select value={val} onChange={e => handleSetFieldValue(field.id, field, e.target.value)} className={inputCls}>
                              {!field.isRequired && <option value="">Не выбрано</option>}
                              {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          );
                        } else if (field.fieldType === "multiselect" && field.options) {
                          const selected = val ? val.split(",").map(s => s.trim()) : [];
                          control = (
                            <div className="border border-slate-200 rounded-lg p-2 space-y-1">
                              {field.options.map(opt => {
                                const isChecked = selected.includes(opt);
                                const isLastChecked = isChecked && selected.length === 1 && field.isRequired;
                                return (
                                  <label key={opt} className={`flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded transition-colors ${isLastChecked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                                    <input type="checkbox" checked={isChecked} disabled={isLastChecked}
                                      onChange={e => {
                                        const updated = e.target.checked ? [...selected, opt] : selected.filter(s => s !== opt);
                                        handleSetFieldValue(field.id, field, updated.length > 0 ? updated.join(",") : "");
                                      }}
                                      className="w-4 h-4 text-purple-600 rounded" />
                                    <span className="text-sm">{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        } else if (field.fieldType === "datetime") {
                          control = (
                            <input type="datetime-local" value={val} onChange={e => handleSetFieldValue(field.id, field, e.target.value)} className={inputCls} />
                          );
                        } else if (field.fieldType === "number") {
                          control = (
                            <input type="number" value={val}
                              onChange={e => {
                                const v = e.target.value;
                                if (v && isNaN(Number(v))) return;
                                handleSetFieldValue(field.id, field, v);
                              }}
                              className={inputCls} placeholder="Введите число..." />
                          );
                        } else if (field.fieldType === "user") {
                          control = (
                            <UserSelect
                              options={memberUserOptions}
                              value={val || null}
                              placeholder="Не выбран"
                              required={field.isRequired}
                              onChange={userId => handleSetFieldValue(field.id, field, userId || "")}
                            />
                          );
                        } else if (field.fieldType === "user_list") {
                          const selectedIds = val ? val.split(",").map(s => s.trim()).filter(Boolean) : [];
                          control = (
                            <UserMultiSelect
                              options={memberUserOptions}
                              value={selectedIds}
                              onChange={ids => handleSetFieldValue(field.id, field, ids.join(","))}
                            />
                          );
                        } else if (field.fieldType === "sprint") {
                          control = (
                            <SprintSelect
                              options={sprintOptions}
                              value={val || null}
                              placeholder="Не выбран"
                              required={field.isRequired}
                              onChange={sprintId => handleSetFieldValue(field.id, field, sprintId || "")}
                            />
                          );
                        } else if (field.fieldType === "sprint_list") {
                          const selectedIds = val ? val.split(",").map(s => s.trim()).filter(Boolean) : [];
                          control = (
                            <SprintMultiSelect
                              options={sprintOptions}
                              value={selectedIds}
                              onChange={ids => handleSetFieldValue(field.id, field, ids.join(","))}
                            />
                          );
                        } else {
                          // text (default)
                          control = (
                            <input type="text" value={val} onChange={e => handleSetFieldValue(field.id, field, e.target.value)}
                              className={inputCls} placeholder="Введите значение..." />
                          );
                        }

                        return (
                          <div key={field.id} className={`p-3 border rounded-lg ${hasError ? "border-red-400 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                            <div className="flex items-center gap-1 mb-2">
                              <span className="text-sm font-medium">{field.name}</span>
                              {field.isRequired && <span className="text-red-500 text-sm">*</span>}
                            </div>
                            {control}
                            {hasError && errorMsg && (
                              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                                <AlertTriangle size={12} className="shrink-0" />
                                <span>{errorMsg}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Watchers */}
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-3"><Eye size={18} /> Наблюдатели ({watchers.length})</h3>
                  <UserMultiSelect
                    options={memberUserOptionsById}
                    value={watchers.map(w => w.memberId)}
                    placeholder="Добавить наблюдателя..."
                    onChange={selectedIds => {
                      const currentIds = watchers.map(w => w.memberId);
                      const added = selectedIds.filter(id => !currentIds.includes(id));
                      const removed = currentIds.filter(id => !selectedIds.includes(id));
                      added.forEach(id => handleAddWatcher(id));
                      removed.forEach(id => handleRemoveWatcher(id));
                    }}
                  />
                </div>
              </div>

              {/* Right Column - Checklists, Links */}
              <div className="space-y-6">
                {/* Checklists */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2"><CheckSquare size={18} /> Чек-листы ({checklists.length})</h2>
                    <button onClick={() => setShowChecklistModal(true)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1">
                      <Plus size={16} /> Добавить
                    </button>
                  </div>
                  {checklists.length > 0 ? (
                    <div className="space-y-4">
                      {checklists.map(checklist => (
                        <div key={checklist.id} className="border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <input type="text" defaultValue={checklist.name}
                              onBlur={e => { if (e.target.value !== checklist.name) handleRenameChecklist(checklist.id, e.target.value); }}
                              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                              className="font-semibold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-0 py-0.5 flex-1" />
                            <button onClick={() => handleDeleteChecklist(checklist.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0 ml-2" title="Удалить чек-лист">
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {checklist.items.map(item => (
                              <div key={item.id} className="flex items-center gap-3 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group">
                                <input type="checkbox" checked={item.isChecked}
                                  onChange={e => handleToggleItem(item.id, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 rounded cursor-pointer shrink-0" />
                                <input type="text" defaultValue={item.content}
                                  onBlur={e => { if (e.target.value !== item.content) handleEditItem(item.id, e.target.value); }}
                                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                  className={`text-sm flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-0 ${item.isChecked ? "line-through text-slate-400" : ""}`} />
                                <button onClick={() => handleDeleteItem(item.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all shrink-0">
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                          {/* Add item inline */}
                          <div className="flex gap-2 mt-2">
                            <input type="text" value={newItemContent[checklist.id] || ""}
                              onChange={e => setNewItemContent(prev => ({ ...prev, [checklist.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === "Enter") handleAddItem(checklist.id); }}
                              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Новый пункт..." />
                            <button onClick={() => handleAddItem(checklist.id)}
                              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={14} /></button>
                          </div>
                          <div className="mt-2 text-xs text-slate-600">
                            Завершено: {checklist.items.filter(i => i.isChecked).length} из {checklist.items.length}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 py-3">Нет чек-листов</p>
                  )}
                </div>

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Paperclip size={18} /> Вложения ({attachments.length})</h2>
                    <button onClick={() => setShowAttachmentModal(true)} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"><Plus size={16} /> Добавить</button>
                  </div>
                  {attachments.length > 0 ? (
                    <div className="space-y-2">
                      {attachments.map(att => (
                        <div key={att.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Paperclip size={14} className="text-slate-400" />
                                <span className="text-sm font-medium">{att.fileName}</span>
                              </div>
                              <div className="text-xs text-slate-500 ml-5">{(att.fileSize / 1024 / 1024).toFixed(2)} МБ</div>
                            </div>
                            <div className="flex items-center gap-1">
                              {!isCreateMode && (
                                <button onClick={(e) => { e.preventDefault(); handleDownloadAttachment(att); }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Скачать">
                                  <Download size={14} />
                                </button>
                              )}
                              <button onClick={() => handleDeleteAttachment(att.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 py-3">Нет вложений</p>
                  )}
                </div>

                {/* Dependencies / Links */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2"><LinkIcon size={18} /> Связи</h2>
                    <button onClick={() => setShowLinkModal(true)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1">
                      <Plus size={16} /> Добавить
                    </button>
                  </div>
                  <div className="space-y-2">
                    {blockingDeps.map(dep => {
                      const t = getDepTask(dep);
                      if (!t) return null;
                      return (
                        <div key={dep.id} className="p-3 border border-slate-200 rounded-lg">
                          <div className="text-xs text-red-600 font-medium mb-1">Блокирует</div>
                          <Link to={`/tasks/${t.id}`} className="text-sm text-blue-600 hover:underline">{t.key}: {t.name}</Link>
                        </div>
                      );
                    })}
                    {blockedByDeps.map(dep => {
                      const t = getDepTask(dep);
                      if (!t) return null;
                      return (
                        <div key={dep.id} className="p-3 border border-slate-200 rounded-lg">
                          <div className="text-xs text-orange-600 font-medium mb-1">Блокируется</div>
                          <Link to={`/tasks/${t.id}`} className="text-sm text-blue-600 hover:underline">{t.key}: {t.name}</Link>
                        </div>
                      );
                    })}
                    {parentDeps.map(dep => {
                      const t = getDepTask(dep);
                      if (!t) return null;
                      return (
                        <div key={dep.id} className="p-3 border border-slate-200 rounded-lg">
                          <div className="text-xs text-purple-600 font-medium mb-1">Родительская</div>
                          <Link to={`/tasks/${t.id}`} className="text-sm text-blue-600 hover:underline">{t.key}: {t.name}</Link>
                        </div>
                      );
                    })}
                    {subtaskDeps.map(dep => {
                      const t = getDepTask(dep);
                      if (!t) return null;
                      return (
                        <div key={dep.id} className="p-3 border border-slate-200 rounded-lg">
                          <div className="text-xs text-teal-600 font-medium mb-1">Подзадача</div>
                          <Link to={`/tasks/${t.id}`} className="text-sm text-blue-600 hover:underline">{t.key}: {t.name}</Link>
                        </div>
                      );
                    })}
                    {relatedDeps.map(dep => {
                      const t = getDepTask(dep);
                      if (!t) return null;
                      return (
                        <div key={dep.id} className="p-3 border border-slate-200 rounded-lg">
                          <div className="text-xs text-blue-600 font-medium mb-1">Связана с</div>
                          <Link to={`/tasks/${t.id}`} className="text-sm text-blue-600 hover:underline">{t.key}: {t.name}</Link>
                        </div>
                      );
                    })}
                    {dependencies.length === 0 && <p className="text-sm text-slate-400 py-3">Нет связей</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "comments" && (() => {
            // Build tree: root comments + replies grouped by parent
            const rootComments = comments.filter(c => !c.parentCommentId);
            const repliesByParent = new Map<string, typeof comments>();
            comments.filter(c => c.parentCommentId).forEach(c => {
              const list = repliesByParent.get(c.parentCommentId!) ?? [];
              list.push(c);
              repliesByParent.set(c.parentCommentId!, list);
            });

            const renderComment = (c: typeof comments[0], isReply = false) => {
              const author = memberUsers.get(c.authorId);
              const replies = repliesByParent.get(c.id) ?? [];
              // Find parent comment for reply context
              const parentComment = c.parentCommentId ? comments.find(p => p.id === c.parentCommentId) : null;
              const parentAuthor = parentComment ? memberUsers.get(parentComment.authorId) : null;

              return (
                <div key={c.id}>
                  <div className="flex gap-3">
                    {author ? <UserAvatar user={{ fullName: author.fullName, avatarUrl: author.avatarUrl ?? undefined }} size="sm" /> : <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />}
                    <div className="flex-1">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{author?.fullName || "Пользователь"}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString("ru-RU")}</span>
                            <button onClick={() => handleReply(c)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors text-xs">Ответить</button>
                            <button onClick={() => handleDeleteComment(c.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        {parentComment && (
                          <div className="border-l-2 border-blue-300 pl-2 mb-2 text-xs text-slate-500 italic truncate">
                            {parentAuthor?.fullName || "Пользователь"}: {parentComment.content.slice(0, 100)}{parentComment.content.length > 100 ? "..." : ""}
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{c.content.split(/(@[^\s@]+(?:\s[^\s@]+){0,2})/g).map((part, i) =>
                          part.startsWith("@") ? <span key={i} className="text-blue-600 font-medium">{part}</span> : part
                        )}</p>
                      </div>
                    </div>
                  </div>
                  {replies.length > 0 && (
                    <div className="space-y-3 mt-3">
                      {replies.map(r => renderComment(r, true))}
                    </div>
                  )}
                </div>
              );
            };

            return (
            <div>
              <div className="space-y-4 mb-6">
                {rootComments.length > 0 ? rootComments.map(c => renderComment(c)) : (
                  <p className="text-center py-8 text-slate-400">Нет комментариев</p>
                )}
              </div>

              {/* Reply indicator */}
              {replyTo && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <span className="text-blue-700 flex-1 truncate">Ответ для <strong>{replyTo.authorName}</strong>: {replyTo.content.slice(0, 80)}{replyTo.content.length > 80 ? "..." : ""}</span>
                  <button onClick={() => setReplyTo(null)} className="p-0.5 text-slate-400 hover:text-red-600"><X size={14} /></button>
                </div>
              )}

              {/* Comment input with mention support */}
              <div className="relative">
                <textarea ref={commentTextareaRef} value={commentText} onChange={handleCommentInput}
                  onKeyDown={e => { if (e.key === "Escape") setShowMentionDropdown(false); if (e.key === "Enter" && !e.shiftKey && !showMentionDropdown) { e.preventDefault(); handleAddComment(); } }}
                  placeholder="Добавить комментарий... (@ для упоминания)"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} />

                {/* Mention dropdown */}
                {showMentionDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto">
                    {[...memberUsers.values()]
                      .filter(u => u.fullName.toLowerCase().includes(mentionFilter))
                      .slice(0, 6)
                      .map(u => (
                        <button key={u.id} onMouseDown={e => { e.preventDefault(); insertMention(u); }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left transition-colors">
                          <UserAvatar user={{ fullName: u.fullName, avatarUrl: u.avatarUrl ?? undefined }} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.fullName}</p>
                            {u.username && <p className="text-xs text-slate-500 truncate">{u.username}</p>}
                          </div>
                        </button>
                      ))}
                    {[...memberUsers.values()].filter(u => u.fullName.toLowerCase().includes(mentionFilter)).length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-3">Не найдено</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button onClick={handleAddComment} disabled={!commentText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Send size={16} /> Отправить
                </button>
              </div>
            </div>
            );
          })()}
        </div>
      </div>

      {/* Delete Task Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-start gap-3 mb-4">
              <Trash2 size={24} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-slate-800">Удалить задачу</h2>
                <p className="text-sm text-slate-600 mt-1">Вы уверены, что хотите удалить задачу «{task.key}: {task.name}»?</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium">Отмена</button>
              <button onClick={handleDeleteTask} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Checklist Modal */}
      {showChecklistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Создать чек-лист</h2>
              <button onClick={() => { setShowChecklistModal(false); setChecklistTitle(""); }} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Название *</label>
              <input type="text" value={checklistTitle} onChange={e => setChecklistTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreateChecklist(); }}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Например: Чек-лист по тестированию" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowChecklistModal(false); setChecklistTitle(""); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium">Отмена</button>
              <button onClick={handleCreateChecklist} disabled={!checklistTitle.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Добавить связь</h2>
              <button onClick={() => { setShowLinkModal(false); setSelectedTaskId(""); }} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Тип связи</label>
              <select value={linkType} onChange={e => setLinkType(e.target.value as DependencyType)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="blocks">Блокирует</option>
                <option value="is_blocked_by">Блокируется</option>
                <option value="parent">Родительская</option>
                <option value="subtask">Подзадача</option>
                <option value="relates_to">Связана с</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Задача *</label>
              <select value={selectedTaskId} onChange={e => setSelectedTaskId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Выберите задачу</option>
                {projectTasks.filter(t => !dependencies.some(d => d.dependsOnTaskId === t.id)).map(t => (
                  <option key={t.id} value={t.id}>{t.key}: {t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowLinkModal(false); setSelectedTaskId(""); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium">Отмена</button>
              <button onClick={handleAddDependency} disabled={!selectedTaskId}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">Добавить</button>
            </div>
          </div>
        </div>
      )}


      {/* Upload Attachment Modal */}
      {showAttachmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Добавить вложение</h2>
              <button onClick={() => setShowAttachmentModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="mb-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); }}>
                <Upload size={32} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600">{uploadingFile ? "Загрузка..." : "Нажмите или перетащите файл сюда"}</p>
                <p className="text-xs text-slate-400 mt-1">Максимальный размер: 10 МБ</p>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} />
            </div>
            <button onClick={() => setShowAttachmentModal(false)} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium">Закрыть</button>
          </div>
        </div>
      )}

    </div>
  );
}
