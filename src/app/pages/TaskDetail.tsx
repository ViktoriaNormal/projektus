import {
  Calendar, User, Tag, FileText, CheckSquare, Link as LinkIcon, AlertTriangle,
  X, Plus, Send, Paperclip, MessageSquare, BarChart3, Trash2, Eye,
  Copy, Check, ChevronRight, Loader2, Upload, Download,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Select, SelectOption } from "../components/ui/Select";
import { formatDate } from "../lib/format";
import { toastError } from "../lib/errors";
import { DependenciesSection } from "../components/task-detail/DependenciesSection";
import { AttachmentsSection } from "../components/task-detail/AttachmentsSection";
import { useProjectPermissions } from "../hooks/useProjectPermissions";
import { useParams, Link, useNavigate, useSearchParams, useBlocker } from "react-router";
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
import { getTaskDependencies, addDependency, deleteDependency, type TaskDependency, type DependencyType } from "../api/dependencies";
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
  const [projectIdForPerms, setProjectIdForPerms] = useState<string | undefined>(undefined);
  const { can: canArea, canEdit: canEditArea, loading: permLoading } = useProjectPermissions(projectIdForPerms);
  const canViewTask = isCreateMode || canArea("project.tasks");
  const canEditTask = isCreateMode || canEditArea("project.tasks");
  const [owner, setOwner] = useState<UserProfileResponse | null>(null);
  const [executor, setExecutor] = useState<UserProfileResponse | null>(null);
  const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
  const [memberUsers, setMemberUsers] = useState<Map<string, UserProfileResponse>>(new Map());
  const [columns, setColumns] = useState<ColumnResponse[]>([]);
  const [boardFields, setBoardFields] = useState<BoardField[]>([]);
  const [checklists, setChecklists] = useState<ChecklistResponse[]>([]);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [deletingDepIds, setDeletingDepIds] = useState<Set<string>>(new Set());
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
  const [activeTab, setActiveTab] = useState<"details" | "comments">(
    searchParams.get("tab") === "comments" ? "comments" : "details"
  );
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [boardAllTags, setBoardAllTags] = useState<TagResponse[]>([]);

  const [showAttachmentModal, setShowAttachmentModal] = useState(false);

  // Form state
  const [checklistTitle, setChecklistTitle] = useState("");
  const [newItemContent, setNewItemContent] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState("");
  const [linkType, setLinkType] = useState<DependencyType>("relates_to");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string; content: string } | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deadlineFocused, setDeadlineFocused] = useState(false);
  const [deadlineLocal, setDeadlineLocal] = useState<string | null>(null);
  const [estimationLocal, setEstimationLocal] = useState<string | null>(null);
  const [estimationFocused, setEstimationFocused] = useState(false);
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
      try { const p = await getProject(t.projectId); setProject(p); setProjectIdForPerms(p.id); } catch { /**/ }
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
      setProjectTasks(tasks.filter(pt => pt.id !== taskId && pt.projectId === t.projectId));
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

      if (proj) { setProject(proj); setProjectIdForPerms(proj.id); }
      let sprints: SprintResponse[] = [];
      try { sprints = await getProjectSprints(pId); setProjectSprints(sprints); } catch { /**/ }
      setColumns(cols.sort((a, b) => a.order - b.order));
      setBoardFields(fields);
      setMembers(mems);
      setProjectTasks(tasks.filter(pt => pt.projectId === pId));

      // Resolve the initial column of the synthetic create-mode task. Priority:
      // 1. Explicit `columnId` from the URL — e.g. user clicked "+" in a specific column
      //    on the board; the new task inherits that column as its starting status.
      // 2. Otherwise, for an ACTIVE sprint, fall back to the board's initial column so
      //    the user doesn't see the "column will be assigned on sprint start" notice
      //    for an already-running sprint.
      const urlColumnId = searchParams.get("columnId");
      const urlSprintId = searchParams.get("sprintId");
      let initialColumnId: string | null = null;
      if (urlColumnId && cols.some((c) => c.id === urlColumnId)) {
        initialColumnId = urlColumnId;
      } else if (urlSprintId) {
        const sprint = sprints.find(s => s.id === urlSprintId);
        if (sprint?.status === "active") {
          const initCol = cols.find(c => c.systemType === "initial");
          if (initCol) initialColumnId = initCol.id;
        }
      }

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
        columnId: initialColumnId,
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

  // Always open the task detail at the top of the page, regardless of where the user was
  // scrolled on the previous page. Instant scroll (no smoothing) to avoid a visible jump.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [taskId]);

  // When the user clicks the reply-quote inside a comment we highlight its parent comment
  // (Telegram-style jump to original). Any subsequent click anywhere else on the page
  // should dismiss the highlight. The setTimeout(0) defers attaching the listener so the
  // click that *triggered* the highlight doesn't immediately clear it.
  useEffect(() => {
    if (!highlightedCommentId) return;
    const handler = () => setHighlightedCommentId(null);
    const timer = setTimeout(() => {
      document.addEventListener("click", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handler);
    };
  }, [highlightedCommentId]);

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
        columnId: task.columnId || undefined,
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
          ? fieldValues.map(fv => ({ fieldId: fv.fieldId, valueText: fv.valueText, valueNumber: fv.valueNumber != null ? String(fv.valueNumber) : null, valueDatetime: fv.valueDatetime }))
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
      toastError(e, "Ошибка создания задачи");
    } finally {
      setCreateSaving(false);
    }
  };

  // ── Handlers ────────────────────────────────────────────────

  const handleUpdateField = async (field: string, value: any) => {
    if (!canEditTask) return;
    if (!task) return;
    setTask(prev => prev ? { ...prev, [field]: value } : prev);
    if (isCreateMode) return;
    try {
      await updateTask(task.id, { [field]: value });
      // When the task is moved into a "completed" column, blocks / is_blocked_by links
      // no longer make sense — remove them symmetrically via the API.
      if (field === "columnId") {
        const targetCol = columns.find(c => c.id === value);
        if (targetCol?.systemType === "completed") {
          const toDelete = dependencies.filter(d => d.type === "blocks" || d.type === "is_blocked_by");
          if (toDelete.length > 0) {
            await Promise.allSettled(toDelete.map(d => deleteDependency(task.id, d.id)));
            setDependencies(prev => prev.filter(d => d.type !== "blocks" && d.type !== "is_blocked_by"));
          }
        }
      }
    } catch (e: any) {
      toastError(e, "Ошибка обновления");
      loadTask(); // rollback to server state
    }
  };

  const handleSaveName = () => {
    if (isCreateMode) {
      setTask(prev => prev ? { ...prev, name: editName.trim() } : prev);
      return;
    }
    const trimmed = editName.trim();
    // Don't persist an empty title — the validation summary at the top of the page shows
    // the "Название задачи не заполнено" error and the navigation blocker keeps the user
    // on the page until the field is filled, so no additional UI feedback is needed here.
    if (!trimmed) return;
    if (trimmed !== task?.name) handleUpdateField("name", trimmed);
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
      // Clean up dependencies on both sides before soft-deleting the task, so stale blocks /
      // is_blocked_by / parent / subtask / relates_to rows don't linger on the counterparts.
      if (dependencies.length > 0) {
        await Promise.allSettled(dependencies.map((d) => deleteDependency(task.id, d.id)));
      }
      await deleteTask(task.id);
      toast.success("Задача удалена");
      const ret = searchParams.get("returnUrl");
      ret ? navigate(ret) : navigate(-1);
    } catch (e: any) { toastError(e, "Ошибка удаления"); }
  };

  const handleDeleteDependency = async (dep: TaskDependency) => {
    if (!task) return;
    setDeletingDepIds((prev) => new Set(prev).add(dep.id));
    try {
      await deleteDependency(task.id, dep.id);
      setDependencies((prev) => prev.filter((d) => d.id !== dep.id));
    } catch (e: any) {
      toastError(e, "Ошибка удаления связи");
    } finally {
      setDeletingDepIds((prev) => {
        const next = new Set(prev);
        next.delete(dep.id);
        return next;
      });
    }
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
    } catch (e: any) { toastError(e, "Ошибка создания чек-листа"); }
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
    } catch (e: any) { toastError(e, "Ошибка"); }
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
    } catch (e: any) { toastError(e, "Ошибка"); }
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
    } catch (e: any) { toastError(e, "Ошибка"); }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    if (isCreateMode) {
      setChecklists(prev => prev.filter(cl => cl.id !== checklistId));
      return;
    }
    try {
      await deleteChecklist(checklistId);
      if (task) setChecklists(await getTaskChecklists(task.id));
    } catch (e: any) { toastError(e, "Ошибка"); }
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
    } catch (e: any) { toastError(e, "Ошибка"); }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (isCreateMode) {
      setChecklists(prev => prev.map(cl => ({ ...cl, items: cl.items.filter(it => it.id !== itemId) })));
      return;
    }
    try {
      await deleteChecklistItem(itemId);
      if (task) setChecklists(await getTaskChecklists(task.id));
    } catch (e: any) { toastError(e, "Ошибка"); }
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
    } catch (e: any) { toastError(e, "Ошибка"); }
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
    } catch (e: any) { toastError(e, "Ошибка"); }
  };

  // Dependencies
  const handleAddDependency = async () => {
    if (!task || !selectedTaskId) return;
    if (dependencies.some(d => d.dependsOnTaskId === selectedTaskId)) {
      toast.error("Связь с этой задачей уже существует");
      return;
    }
    if (linkType === "blocks" || linkType === "is_blocked_by") {
      if (task.columnSystemType === "completed") {
        toast.error("Нельзя добавить блокирующую связь для завершённой задачи");
        return;
      }
      const target = projectTasks.find(t => t.id === selectedTaskId);
      if (target?.columnSystemType === "completed") {
        toast.error("Нельзя добавить блокирующую связь с завершённой задачей");
        return;
      }
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
    } catch (e: any) { toastError(e, "Ошибка"); }
  };

  // Comments
  const handleAddComment = async () => {
    if (!canEditTask) return;
    if (!task || !commentText.trim()) return;
    try {
      await createComment(task.id, {
        content: commentText.trim(),
        parentCommentId: replyTo?.id || undefined,
      });
      setCommentText("");
      setReplyTo(null);
      setComments(await getTaskComments(task.id));
    } catch (e: any) { toastError(e, "Ошибка"); }
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
    // Insert the user's login (`@username`) — NOT the full name. This mirrors the
    // Telegram/Slack-style handle and keeps mentions unambiguous when two members share
    // the same full name. Fall back to fullName only for users without a login set.
    const handle = user.username || user.fullName;
    const mention = `@${handle} `;
    setCommentText(before + mention + after);
    setShowMentionDropdown(false);
    commentTextareaRef.current?.focus();
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task) return;
    try {
      await deleteComment(commentId);
      setComments(await getTaskComments(task.id));
    } catch (e: any) { toastError(e, "Ошибка"); }
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
    } catch (e: any) { toastError(e, "Ошибка загрузки"); }
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
      toastError(e, "Ошибка скачивания файла");
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
    } catch (e: any) { toastError(e, "Ошибка"); }
  };

  // Watchers
  const handleAddWatcher = async (memberId: string) => {
    if (!task) return;
    if (isCreateMode) {
      if (!watchers.some(w => w.memberId === memberId)) {
        setWatchers(prev => [...prev, { taskId: "", memberId }]);
      }

      return;
    }
    try {
      await addWatcher(task.id, memberId);
      setWatchers(await getTaskWatchers(task.id));

    } catch (e: any) { toastError(e, "Ошибка"); }
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
    } catch (e: any) { toastError(e, "Ошибка"); }
  };

  // Field values
  const handleSetFieldValue = async (fieldId: string, field: BoardField, rawValue: string) => {
    if (!canEditTask) return;
    if (!task) return;
    const data: { valueText?: string | null; valueNumber?: number | null; valueDatetime?: string | null } = {};
    if (field.fieldType === "number") {
      data.valueNumber = rawValue ? Number(rawValue) : null;
    } else if (field.fieldType === "datetime") {
      data.valueDatetime = rawValue ? new Date(rawValue).toISOString() : null;
    } else {
      data.valueText = rawValue || null;
    }
    // Keep local state in sync regardless of mode so the input stays responsive while
    // the user is editing. The validation summary at the top of the page and the red
    // per-field outlines reflect the current (possibly invalid) state the same way as
    // in create mode.
    setFieldValues(prev => {
      const existing = prev.findIndex(v => v.fieldId === fieldId);
      const entry = { fieldId, valueText: data.valueText ?? null, valueNumber: data.valueNumber ?? null, valueDatetime: data.valueDatetime ?? null };
      if (existing >= 0) { const next = [...prev]; next[existing] = entry; return next; }
      return [...prev, entry];
    });
    if (isCreateMode) return;
    // Skip the server round-trip while the new value would leave a required parameter
    // empty — the navigation blocker keeps the user on the page until the input is
    // fixed, and once it is the next keystroke/blur will persist through this same
    // function with a valid payload.
    if (field.isRequired) {
      const implicitlyFilled = (field.fieldType === "select" && field.options && field.options.length > 0)
        || field.fieldType === "checkbox";
      if (!implicitlyFilled && !rawValue.trim()) return;
    }
    try {
      await setTaskFieldValue(task.id, fieldId, data);
      setFieldValues(await getTaskFieldValues(task.id));
    } catch (e: any) { toastError(e, "Ошибка"); }
  };

  const getFieldValue = (fieldId: string, field: BoardField): string => {
    const fv = fieldValues.find(v => v.fieldId === fieldId);
    if (!fv) return "";
    if (field.fieldType === "number") return fv.valueNumber != null ? String(fv.valueNumber) : "";
    if (field.fieldType === "datetime") {
      // Backend stores datetime in UTC ISO. Convert back to the user's local time zone and
      // format as "YYYY-MM-DDTHH:MM" so <input type="date"> / <input type="time"> show
      // exactly what the user entered, not a TZ-shifted representation.
      if (!fv.valueDatetime) return "";
      const d = new Date(fv.valueDatetime);
      if (isNaN(d.getTime())) return "";
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
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

  // System field validation.
  // `editName` holds the current textarea contents in both create and edit mode — we
  // validate against it (not against `task.name`) so that clearing the title immediately
  // triggers the error, even though we intentionally don't persist an empty value to
  // the backend. Same approach lets create-mode feedback appear on the very first keystroke.
  if (!editName.trim()) allErrors.push({ fieldId: "_name", message: "Название задачи не заполнено" });
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

  // Navigation blocker (edit mode only): keeps the user on this page while required
  // parameters are invalid. The big red notice below the "Назад" button explains why
  // the click didn't do anything — same UX as the project-params tab block.
  const shouldBlockNav = !isCreateMode && hasFieldErrors;
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    shouldBlockNav && currentLocation.pathname !== nextLocation.pathname,
  );
  const [showNavBlockWarning, setShowNavBlockWarning] = useState(false);
  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowNavBlockWarning(true);
      blocker.reset();
    }
  }, [blocker]);
  // Hide the notice as soon as the user fixes the validation errors.
  useEffect(() => {
    if (!hasFieldErrors && showNavBlockWarning) setShowNavBlockWarning(false);
  }, [hasFieldErrors, showNavBlockWarning]);

  // ── User options for selects ────────────────────────────────
  const memberUserOptions: UserOption[] = members.map(m => {
    const u = memberUsers.get(m.userId);
    return { id: m.userId, fullName: u?.fullName || m.userId, username: u?.username, avatarUrl: u?.avatarUrl ?? undefined };
  });
  const memberUserOptionsById: UserOption[] = members.map(m => {
    const u = memberUsers.get(m.userId);
    return { id: m.id, fullName: u?.fullName || m.userId, username: u?.username, avatarUrl: u?.avatarUrl ?? undefined };
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
          {user.username && <p className="text-xs text-slate-500 truncate">{user.username}</p>}
        </div>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded"><X size={14} /></button>
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

  if (!isCreateMode && !permLoading && projectIdForPerms && !canViewTask) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle size={48} className="text-amber-500 mb-3" />
        <h2 className="text-xl font-bold mb-2">Нет доступа</h2>
        <p className="text-slate-500 mb-4">У вас нет прав на просмотр задач этого проекта</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Назад</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button (view mode only) */}
      {!isCreateMode && (
        <button onClick={() => {
          if (shouldBlockNav) { setShowNavBlockWarning(true); return; }
          const ret = searchParams.get("returnUrl");
          ret ? navigate(ret) : navigate(-1);
        }}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition-colors">
          <ChevronRight size={16} className="rotate-180" />
          <span>Назад</span>
        </button>
      )}

      {/* Nav block notice — same pattern as the project-params tab block. Shown only
          once the user actually tries to leave, not preemptively. */}
      {showNavBlockWarning && shouldBlockNav && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-xl flex items-start gap-3" style={{ overflowAnchor: "none" }}>
          <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Невозможно покинуть страницу задачи</p>
            <p className="text-xs text-red-700 mt-0.5">Заполните все обязательные параметры задачи корректно перед переходом на другую страницу.</p>
          </div>
        </div>
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
            <textarea value={editName} onChange={e => { if (!canEditTask) return; setEditName(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              onBlur={handleSaveName} readOnly={!canEditTask}
              className={`text-3xl font-bold mb-1 w-full px-3 py-2 border-2 border-transparent rounded-lg transition-colors resize-none overflow-hidden ${canEditTask ? "hover:border-slate-300 focus:border-blue-500 focus:outline-none" : "cursor-default"}`}
              rows={1} placeholder="Название задачи *" />
            {fieldErrorIds.has("_name") && (
              <div className="flex items-center gap-1.5 mb-2 ml-3 text-xs text-red-600">
                <AlertTriangle size={12} className="shrink-0" />
                <span>{getError("_name")}</span>
              </div>
            )}

            {/* Editable Description */}
            <textarea value={editDescription} onChange={e => { if (!canEditTask) return; setEditDescription(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              onBlur={handleSaveDescription} readOnly={!canEditTask}
              className={`text-slate-600 w-full px-3 py-2 border-2 border-transparent rounded-lg transition-colors resize-none overflow-hidden ${canEditTask ? "hover:border-slate-300 focus:border-blue-500 focus:outline-none" : "cursor-default"}`}
              rows={2} placeholder="Описание задачи" />
          </div>
          {!isCreateMode && canEditTask && (
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
              {canEditTask && <button onClick={() => handleRemoveTag(tag.id)} className="opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"><X size={14} /></button>}
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
          ) : canEditTask ? (
            <button onClick={handleOpenTagInput}
              className="px-3 py-1 border-2 border-dashed border-slate-300 text-slate-600 text-sm rounded hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center gap-1">
              <Plus size={14} /> Добавить тег
            </button>
          ) : null}
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
              <MessageSquare size={18} /> Комментарии ({comments.length})
            </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "details" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - System Fields */}
              <div className={`space-y-6 ${!canEditTask && !isCreateMode ? "pointer-events-none opacity-75" : ""}`}>
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
                          {owner.username && <p className="text-xs text-slate-500 truncate">{owner.username}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-2 bg-slate-50 rounded-lg text-sm text-slate-400">
                        {isCreateMode ? "Будет назначен автоматически" : "Не определён"}
                      </div>
                    )}
                  </div>

                  {/* Priority / Service Class */}
                  {(() => {
                    const isServiceClass = boardData?.priorityType === "service_class";
                    const label = isServiceClass ? "Класс обслуживания" : "Приоритет";
                    const opts = boardData?.priorityOptions?.length
                      ? boardData.priorityOptions
                      : ["Низкий", "Средний", "Высокий", "Критичный"];
                    return (
                      <div className="mb-4">
                        <label className="flex items-center gap-2 text-slate-600 text-sm mb-2"><AlertTriangle size={16} /><span>{label}</span></label>
                        <Select
                          value={task.priority || ""}
                          onValueChange={(v) => handleUpdateField("priority", v || null)}
                          placeholder="Не указан"
                        >
                          <SelectOption value="">Не указан</SelectOption>
                          {opts.map(opt => (
                            <SelectOption key={opt} value={opt}>{opt}</SelectOption>
                          ))}
                        </Select>
                      </div>
                    );
                  })()}

                  {/* Column (Status) */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-slate-600 text-sm mb-2"><BarChart3 size={16} /><span>Колонка</span></label>
                    {task.columnId ? (
                      <Select
                        value={task.columnId}
                        onValueChange={(v) => handleUpdateField("columnId", v)}
                        // While creating a task, the starting column is pinned to the one
                        // the user clicked "+" in (or the sprint's initial column for
                        // active-sprint boards). After the task is saved the Select
                        // becomes editable and acts as a normal status switcher.
                        disabled={isCreateMode}
                      >
                        {columns.map(col => (
                          <SelectOption key={col.id} value={col.id}>{col.name}</SelectOption>
                        ))}
                      </Select>
                    ) : (
                      <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        Задача в бэклоге — колонка будет назначена при запуске спринта
                      </div>
                    )}
                  </div>

                  {/* Deadline */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-slate-600 text-sm mb-2"><Calendar size={16} /><span>Крайний срок</span></label>
                    <input type="date" value={deadlineLocal !== null ? deadlineLocal : (task.deadline ? task.deadline.slice(0, 10) : "")}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={e => setDeadlineLocal(e.target.value)}
                      onFocus={() => { setDeadlineFocused(true); setDeadlineLocal(task.deadline ? task.deadline.slice(0, 10) : ""); }}
                      onBlur={() => {
                        setDeadlineFocused(false);
                        const val = deadlineLocal ?? "";
                        const newValue = val ? new Date(val).toISOString() : null;
                        const oldValue = task.deadline || null;
                        if (newValue !== oldValue) handleUpdateField("deadline", newValue);
                        setDeadlineLocal(null);
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !deadlineFocused && fieldErrorIds.has("_deadline") ? "border-red-400 bg-red-50" : "border-slate-200"
                      }`} />
                    {!deadlineFocused && fieldErrorIds.has("_deadline") && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-red-600">
                        <AlertTriangle size={12} className="shrink-0" />
                        <span>{getError("_deadline")}</span>
                      </div>
                    )}
                  </div>

                  {/* Estimation */}
                  {(() => {
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
                          <input type="text"
                            value={estimationFocused ? (estimationLocal ?? "") : (task.estimation || "")}
                            onFocus={() => { setEstimationFocused(true); setEstimationLocal(task.estimation || ""); }}
                            onChange={e => setEstimationLocal(e.target.value)}
                            onBlur={() => {
                              setEstimationFocused(false);
                              const val = (estimationLocal ?? "").trim();
                              const newValue = val || null;
                              if (newValue !== (task.estimation || null)) handleUpdateField("estimation", newValue);
                              setEstimationLocal(null);
                            }}
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
                      {formatDate(isCreateMode ? Date.now() : ((task as any).createdAt || Date.now()), "long")}
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
                            <Select
                              value={val}
                              onValueChange={(v) => handleSetFieldValue(field.id, field, v)}
                              placeholder="Не выбрано"
                            >
                              {!field.isRequired && <SelectOption value="">Не выбрано</SelectOption>}
                              {field.options.map(opt => <SelectOption key={opt} value={opt}>{opt}</SelectOption>)}
                            </Select>
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
                          const dtDate = val ? val.slice(0, 10) : "";
                          const dtTime = val ? val.slice(11, 16) : "";
                          control = (
                            <div className="flex gap-2">
                              <input type="date" defaultValue={dtDate} onBlur={e => {
                                const d = e.target.value;
                                const tEl = e.target.parentElement?.querySelector('input[type="time"]') as HTMLInputElement | null;
                                const t = tEl?.value || dtTime || "00:00";
                                handleSetFieldValue(field.id, field, d ? `${d}T${t}` : "");
                              }} className={inputCls} />
                              <input type="time" defaultValue={dtTime} onBlur={e => {
                                const t = e.target.value;
                                const dEl = e.target.parentElement?.querySelector('input[type="date"]') as HTMLInputElement | null;
                                const d = dEl?.value || dtDate;
                                if (d) handleSetFieldValue(field.id, field, `${d}T${t || "00:00"}`);
                              }} className={inputCls} />
                            </div>
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
                <div className={!canEditTask && !isCreateMode ? "pointer-events-none" : ""}>
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
                    {canEditTask && <button onClick={() => setShowChecklistModal(true)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1">
                      <Plus size={16} /> Добавить
                    </button>}
                  </div>
                  {checklists.length > 0 ? (
                    <div className={`space-y-4 ${!canEditTask && !isCreateMode ? "pointer-events-none" : ""}`}>
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
                                  className="opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all shrink-0">
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
                <AttachmentsSection
                  attachments={attachments}
                  canEditTask={canEditTask}
                  isCreateMode={isCreateMode}
                  onAdd={() => setShowAttachmentModal(true)}
                  onDownload={handleDownloadAttachment}
                  onDelete={handleDeleteAttachment}
                />

                {/* Dependencies / Links */}
                <DependenciesSection
                  dependencies={dependencies}
                  getDepTask={getDepTask}
                  buildTaskHref={(t) => {
                    const ret = searchParams.get("returnUrl");
                    return ret
                      ? `/tasks/${t.id}?returnUrl=${encodeURIComponent(ret)}`
                      : `/tasks/${t.id}`;
                  }}
                  canEditTask={canEditTask}
                  onAddDependency={() => setShowLinkModal(true)}
                  onDeleteDependency={handleDeleteDependency}
                  deletingIds={deletingDepIds}
                />
              </div>
            </div>
          )}

          {activeTab === "comments" && (() => {
            // Render comments as a flat, chronologically-ordered list (Telegram-style) —
            // replies stay in order with everything else, and the parent message is shown
            // as an inline quote inside the reply for visual context.
            const sortedComments = [...comments].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );

            // Resolve the comment author robustly: the backend's `author_id` may be a
            // user id (memberUsers is keyed by user id) or a project member id — try both.
            const resolveAuthor = (id: string): UserProfileResponse | null => {
              if (memberUsers.has(id)) return memberUsers.get(id)!;
              const mem = members.find((m) => m.id === id);
              return mem ? memberUsers.get(mem.userId) ?? null : null;
            };

            const renderComment = (c: typeof comments[0]) => {
              const author = resolveAuthor(c.authorId);
              const parentComment = c.parentCommentId ? comments.find(p => p.id === c.parentCommentId) : null;
              const parentAuthor = parentComment ? resolveAuthor(parentComment.authorId) : null;
              const isHighlighted = highlightedCommentId === c.id;

              return (
                <div key={c.id}>
                  <div className="flex gap-3">
                    {author ? <UserAvatar user={{ fullName: author.fullName, avatarUrl: author.avatarUrl ?? undefined }} size="sm" /> : <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />}
                    <div className="flex-1">
                      <div
                        id={`comment-${c.id}`}
                        className={`rounded-lg p-3 transition-colors ${
                          isHighlighted ? "bg-blue-50 ring-2 ring-blue-400" : "bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1 gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{author?.fullName || "Пользователь"}</div>
                            {author?.username && (
                              <div className="text-xs text-slate-500 truncate">{author.username}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString("ru-RU")}</span>
                            {canEditTask && (<>
                              <button onClick={() => handleReply(c)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors text-xs">Ответить</button>
                              <button onClick={() => handleDeleteComment(c.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={12} /></button>
                            </>)}
                          </div>
                        </div>
                        {parentComment && (
                          <button
                            type="button"
                            onClick={(e) => {
                              // Telegram-style jump-to-source: scroll the original comment
                              // into view and keep it highlighted until the user clicks
                              // anywhere else (handled by a top-level effect).
                              e.stopPropagation();
                              setHighlightedCommentId(parentComment.id);
                              const el = document.getElementById(`comment-${parentComment.id}`);
                              if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
                            }}
                            className="block w-full text-left border-l-2 border-blue-300 pl-2 mb-2 text-xs text-slate-500 italic truncate cursor-pointer hover:text-blue-600 transition-colors"
                          >
                            {parentAuthor?.fullName || "Пользователь"}: {parentComment.content.slice(0, 100)}{parentComment.content.length > 100 ? "..." : ""}
                          </button>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{c.content.split(/(@[^\s@]+)/g).map((part, i) =>
                          part.startsWith("@") ? <span key={i} className="text-blue-600 font-medium">{part}</span> : part
                        )}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            };

            return (
            <div>
              <div className="space-y-4 mb-6">
                {sortedComments.length > 0 ? sortedComments.map(c => renderComment(c)) : (
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
              {canEditTask && (<>
              <div className="relative">
                <textarea ref={commentTextareaRef} value={commentText} onChange={handleCommentInput}
                  onKeyDown={e => { if (e.key === "Escape") setShowMentionDropdown(false); if (e.key === "Enter" && !e.shiftKey && !showMentionDropdown) { e.preventDefault(); handleAddComment(); } }}
                  placeholder="Добавить комментарий... (@ для упоминания)"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} />

                {/* Mention dropdown */}
                {showMentionDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto">
                    {[...memberUsers.values()]
                      .filter(u => u.fullName.toLowerCase().includes(mentionFilter) || (u.username ?? "").toLowerCase().includes(mentionFilter))
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
                    {[...memberUsers.values()].filter(u => u.fullName.toLowerCase().includes(mentionFilter) || (u.username ?? "").toLowerCase().includes(mentionFilter)).length === 0 && (
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
              </>)}
            </div>
            );
          })()}
        </div>
      </div>

      {/* Delete Task Modal */}
      <ConfirmDialog
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Удалить задачу"
        description={`Вы уверены, что хотите удалить задачу «${task.key}: ${task.name}»?`}
        variant="danger"
        confirmLabel="Удалить"
        onConfirm={handleDeleteTask}
      />

      {/* Create Checklist Modal */}
      <Modal
        open={showChecklistModal}
        onOpenChange={(next) => { setShowChecklistModal(next); if (!next) setChecklistTitle(""); }}
        size="md"
      >
        <ModalHeader>
          <ModalTitle>Создать чек-лист</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div>
            <label className="block text-sm font-medium mb-2">Название *</label>
            <input type="text" value={checklistTitle} onChange={e => setChecklistTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreateChecklist(); }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Например: Чек-лист по тестированию" />
          </div>
        </ModalBody>
        <ModalFooter>
          <button onClick={() => { setShowChecklistModal(false); setChecklistTitle(""); }}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium">Отмена</button>
          <button onClick={handleCreateChecklist} disabled={!checklistTitle.trim()}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">Создать</button>
        </ModalFooter>
      </Modal>

      {/* Add Link Modal */}
      <Modal
        open={showLinkModal}
        onOpenChange={(next) => { setShowLinkModal(next); if (!next) setSelectedTaskId(""); }}
        size="md"
      >
        <ModalHeader>
          <ModalTitle>Добавить связь</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {(() => {
            const currentIsCompleted = task?.columnSystemType === "completed";
            const isBlockingType = linkType === "blocks" || linkType === "is_blocked_by";
            const candidates = projectTasks
              .filter(t => !dependencies.some(d => d.dependsOnTaskId === t.id))
              .filter(t => !(isBlockingType && t.columnSystemType === "completed"));
            return (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Тип связи</label>
                  <Select
                    value={linkType}
                    onValueChange={(v) => {
                      const next = v as DependencyType;
                      setLinkType(next);
                      // If switching to a blocking type and the currently selected target is
                      // completed, clear the selection so the user has to pick a valid task.
                      if ((next === "blocks" || next === "is_blocked_by") && selectedTaskId) {
                        const sel = projectTasks.find(t => t.id === selectedTaskId);
                        if (sel?.columnSystemType === "completed") setSelectedTaskId("");
                      }
                    }}
                  >
                    <SelectOption value="blocks" disabled={currentIsCompleted}>Блокирует</SelectOption>
                    <SelectOption value="is_blocked_by" disabled={currentIsCompleted}>Блокируется</SelectOption>
                    <SelectOption value="parent">Родительская</SelectOption>
                    <SelectOption value="subtask">Подзадача</SelectOption>
                    <SelectOption value="relates_to">Связана с</SelectOption>
                  </Select>
                  {currentIsCompleted && (
                    <p className="text-xs text-slate-500 mt-1">
                      Для завершённой задачи нельзя добавить связь «Блокирует» или «Блокируется».
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Задача *</label>
                  <Select value={selectedTaskId} onValueChange={setSelectedTaskId} placeholder="Выберите задачу">
                    {candidates.map(t => (
                      <SelectOption key={t.id} value={t.id}>{t.key}: {t.name}</SelectOption>
                    ))}
                  </Select>
                  {isBlockingType && (
                    <p className="text-xs text-slate-500 mt-1">
                      Завершённые задачи скрыты — блокирующие связи с ними не создаются.
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </ModalBody>
        <ModalFooter>
          <button onClick={() => { setShowLinkModal(false); setSelectedTaskId(""); }}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium">Отмена</button>
          <button onClick={handleAddDependency} disabled={!selectedTaskId}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">Добавить</button>
        </ModalFooter>
      </Modal>

      {/* Upload Attachment Modal */}
      <Modal open={showAttachmentModal} onOpenChange={setShowAttachmentModal} size="md">
        <ModalHeader>
          <ModalTitle>Добавить вложение</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); }}>
            <Upload size={32} className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-600">{uploadingFile ? "Загрузка..." : "Нажмите или перетащите файл сюда"}</p>
            <p className="text-xs text-slate-400 mt-1">Максимальный размер: 10 МБ</p>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} />
        </ModalBody>
        <ModalFooter>
          <button onClick={() => setShowAttachmentModal(false)} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium">Закрыть</button>
        </ModalFooter>
      </Modal>

    </div>
  );
}
