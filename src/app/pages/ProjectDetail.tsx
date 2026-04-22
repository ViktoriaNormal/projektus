import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate, useBlocker, useSearchParams } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useProjectPermissions } from "../hooks/useProjectPermissions";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Users,
  Settings,
  TrendingUp,
  Plus,
  X,
  Trash2,
  Layout,
  Edit,
  BarChart3,
  FileText,
  Menu,
  Copy,
  Check,
  ChevronUp,
  ChevronLeft,
  Loader2,
  Search,
  Info,
  AlertCircle,
  Layers,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import Board from "./Board";
import BoardSettingsModal from "../components/modals/BoardSettingsModal";
import ScrumBacklog from "./ScrumBacklog";
import KanbanMetrics from "./KanbanMetrics";
import Analytics from "./Analytics";
import ProjectOverview from "./ProjectOverview";
import ProjectParamsSection from "../components/project/ProjectParamsSection";
import type { ParamValidationError } from "../components/project/ProjectParamsSection";
import ProjectRolesSection from "../components/project/ProjectRolesSection";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ScrollableTabs } from "../components/ui/ScrollableTabs";
import { Select, SelectOption } from "../components/ui/Select";
import { formatDate } from "../lib/format";
import { toastError } from "../lib/errors";
import { EmptyState } from "../components/ui/EmptyState";
import { TermTooltip } from "../components/ui/TermTooltip";
import { getProject, updateProject, deleteProject as deleteProjectApi, type ProjectResponse } from "../api/projects";
import { getProjectMembers, addProjectMember, updateMemberRoles, removeMember, type ProjectMemberResponse } from "../api/projects";
import { getProjectBoards, createBoard, updateBoard, deleteBoard as deleteBoardApi, getBoardColumns, getBoardSwimlanes, getBoardFields, getBoard, getProjectReferences, createSwimlane, deleteSwimlane, type BoardResponse, type BoardField, type ColumnResponse, type SwimlaneResponse, type ProjectReferences } from "../api/boards";
import { getProjectRoles, type ProjectRole } from "../api/project-roles";
import { getProjectParams, type ProjectParam } from "../api/project-params";
import { searchUsers, getUser, type UserProfileResponse } from "../api/users";
import { toast } from "sonner";

// ── Helpers ─────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  active: "Активный",
  archived: "Архивирован",
  paused: "Приостановлен",
};

const STATUS_REVERSE: Record<string, "active" | "archived" | "paused"> = {
  "Активный": "active",
  "Архивирован": "archived",
  "Приостановлен": "paused",
};

function toAvatarUser(u: UserProfileResponse) {
  return { fullName: u.fullName, avatarUrl: u.avatarUrl ?? undefined };
}

// ── Draggable Board Tab ─────────────────────────────────────

interface BoardTab {
  id: string;
  name: string;
  description: string | null;
  order: number;
  isDefault: boolean;
}

interface DraggableBoardTabProps {
  board: BoardTab;
  index: number;
  isActive: boolean;
  moveBoard: (dragIndex: number, hoverIndex: number) => void;
  onSelect: (id: string) => void;
  onEdit: (board: BoardTab) => void;
  onDelete: (id: string) => void;
  canEditBoard?: boolean;
  canDelete?: boolean;
}

const DraggableBoardTab = ({
  board,
  index,
  isActive,
  moveBoard,
  onSelect,
  onEdit,
  onDelete,
  canEditBoard = true,
  canDelete = true,
}: DraggableBoardTabProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: "BOARD_TAB",
    item: { index },
    canDrag: canEditBoard,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "BOARD_TAB",
    hover: (item: { index: number }) => {
      if (!canEditBoard) return;
      if (item.index !== index) {
        moveBoard(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`flex items-center gap-1.5 ${canEditBoard ? "cursor-move" : ""} ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        onClick={() => onSelect(board.id)}
        className={`px-4 py-2.5 rounded-t-lg font-medium transition-all whitespace-nowrap border-b-2 text-left ${
          isActive
            ? "bg-white text-blue-600 border-blue-600"
            : "bg-slate-50 text-slate-700 border-transparent hover:bg-slate-100"
        }`}
      >
        <span className="flex items-center gap-1.5">
          {board.name}
          {board.isDefault && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-normal">по умолчанию</span>
          )}
        </span>
        {/* Always render the description slot (with a non-breaking space fallback) so all
            tabs in the row end up the same height regardless of which ones have descriptions. */}
        <div className="text-xs opacity-75 mt-1 font-normal whitespace-pre-wrap min-h-4">
          {board.description || " "}
        </div>
      </button>
      {canEditBoard && (
        <div className="flex items-center gap-0.5 pb-0.5">
          <button
            onClick={() => onEdit(board)}
            className="p-1.5 hover:bg-slate-200 rounded transition-all"
            title="Настройки доски"
          >
            <Settings size={14} className="text-slate-600" />
          </button>
          {canDelete && !board.isDefault && (
            <button
              onClick={() => onDelete(board.id)}
              className="p-1.5 hover:bg-red-100 rounded transition-all"
              title="Удалить доску"
            >
              <Trash2 size={14} className="text-red-600" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────

export default function ProjectDetail() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { hasFullPermission } = useAuth();
  const canEditProject = hasFullPermission('system.projects.manage');
  const { can, canEdit, loading: permLoading } = useProjectPermissions(projectId);

  // Data state
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [owner, setOwner] = useState<UserProfileResponse | null>(null);
  const [boardTabs, setBoardTabs] = useState<BoardTab[]>([]);
  const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
  const [memberUsers, setMemberUsers] = useState<Map<string, UserProfileResponse>>(new Map());
  const [boardColumns, setBoardColumns] = useState<ColumnResponse[]>([]);
  const [boardSwimlanes, setBoardSwimlanes] = useState<SwimlaneResponse[]>([]);
  const [computedSwimlaneCount, setComputedSwimlaneCount] = useState<number | null>(null);
  const [boardFields, setBoardFields] = useState<BoardField[]>([]);
  const [swimlaneGroupBy, setSwimlaneGroupBy] = useState<string>("");
  const [currentPriorityType, setCurrentPriorityType] = useState<string>("");
  const [refs, setRefs] = useState<ProjectReferences | null>(null);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);
  const [projectParams, setProjectParams] = useState<ProjectParam[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [urlSearchParams] = useSearchParams();
  const initialTab = urlSearchParams.get("tab") as "overview" | "boards" | "backlog" | "metrics" | "params" | "analytics" | null;
  const [activeTab, setActiveTab] = useState<"overview" | "boards" | "backlog" | "metrics" | "params" | "analytics">(
    initialTab && ["overview", "boards", "backlog", "metrics", "params", "analytics"].includes(initialTab) ? initialTab : "overview"
  );
  // Allow the task-detail "Назад" navigation to restore the exact board the user came from
  // (via ?boardId=... in the return URL). Falls back to the first board when omitted.
  const initialBoardId = urlSearchParams.get("boardId");
  const [activeBoardId, setActiveBoardId] = useState<string | null>(initialBoardId);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [showBoardSettingsModal, setShowBoardSettingsModal] = useState(false);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const [deleteBoardTarget, setDeleteBoardTarget] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<BoardTab | null>(null);
  const [selectedMember, setSelectedMember] = useState<ProjectMemberResponse | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [archivingProject, setArchivingProject] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Add member modal state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfileResponse[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  // Full profile of the user picked in the Add-Member modal — stored separately so the
  // blue "picked" chip can display fullName + login even after the search-results list
  // is cleared (memberUsers only has existing project members, not candidates).
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfileResponse | null>(null);
  const [newMemberRoles, setNewMemberRoles] = useState<string[]>([]);

  // Params tab state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "archived" | "paused">("active");
  const [savingProject, setSavingProject] = useState(false);

  // Param validation
  const [paramErrors, setParamErrors] = useState<ParamValidationError[]>([]);
  const hasParamErrors = activeTab === "params" && paramErrors.length > 0;
  const [showTabBlockWarning, setShowTabBlockWarning] = useState(false);

  // Block route navigation when params tab has errors
  const blocker = useBlocker(hasParamErrors);
  const [showBlockerModal, setShowBlockerModal] = useState(false);

  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowBlockerModal(true);
    }
  }, [blocker.state]);

  // ── Data Loading ────────────────────────────────────────────

  const loadProject = useCallback(async (showSpinner = false) => {
    if (!projectId) return;
    try {
      if (showSpinner) setLoading(true);
      const p = await getProject(projectId);
      setProject(p);
      setEditName(p.name);
      setEditDescription(p.description);
      setEditStatus(p.status);

      // Load owner
      try {
        const o = await getUser(p.ownerId);
        setOwner(o);
      } catch { /* owner may not be accessible */ }
    } catch {
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadBoards = useCallback(async () => {
    if (!projectId) return;
    try {
      const b = await getProjectBoards(projectId);
      const sorted = [...b].sort((a, c) => a.order - c.order);
      setBoardTabs(sorted.map((x) => ({
        id: x.id,
        name: x.name,
        description: x.description,
        order: x.order,
        isDefault: x.isDefault ?? false,
      })));
      if (sorted.length > 0) {
        // Use the functional setter so the "fallback" check reads the current
        // activeBoardId — callers (e.g. confirmDeleteBoard) may have just switched the
        // active board right before invoking loadBoards(), and a stale closure value
        // would cause the fallback to clobber their pick.
        setActiveBoardId((prev) => {
          const exists = prev && sorted.some((s) => s.id === prev);
          if (exists) return prev;
          // When there's no valid selection yet (fresh load, deleted board, stale URL),
          // prefer the project's default board over the first-by-order one.
          const defaultBoard = sorted.find((s) => s.isDefault);
          return (defaultBoard ?? sorted[0]).id;
        });
      }
    } catch { /* silently */ }
  }, [projectId]);

  const loadMembers = useCallback(async () => {
    if (!projectId) return;
    try {
      const m = await getProjectMembers(projectId);
      setMembers(m);

      // Load user profiles for members
      const userMap = new Map<string, UserProfileResponse>();
      await Promise.allSettled(
        m.map(async (member) => {
          try {
            const u = await getUser(member.userId);
            userMap.set(member.userId, u);
          } catch { /* skip */ }
        })
      );
      setMemberUsers(userMap);
    } catch { /* silently */ }
  }, [projectId]);

  const loadBoardDetails = useCallback(async () => {
    if (!activeBoardId) {
      setBoardColumns([]); setBoardSwimlanes([]); setBoardFields([]); setSwimlaneGroupBy("");
      return;
    }
    try {
      const [cols, swims, fields, boardMeta] = await Promise.all([
        getBoardColumns(activeBoardId),
        getBoardSwimlanes(activeBoardId),
        getBoardFields(activeBoardId),
        getBoard(activeBoardId),
      ]);
      setBoardColumns(cols.sort((a, b) => a.order - b.order));
      setBoardSwimlanes(swims.sort((a, b) => a.order - b.order));
      setBoardFields(fields);
      setSwimlaneGroupBy(boardMeta.swimlaneGroupBy || "");
      setCurrentPriorityType(boardMeta.priorityType || "");
    } catch { /* silently */ }
  }, [activeBoardId]);

  const loadRefs = useCallback(async () => {
    try {
      const r = await getProjectReferences();
      setRefs(r);
    } catch { /* silently */ }
  }, []);

  const loadProjectRoles = useCallback(async () => {
    if (!projectId) return;
    try {
      const r = await getProjectRoles(projectId);
      setProjectRoles(r.sort((a, b) => a.order - b.order));
    } catch { /* silently */ }
  }, [projectId]);

  const loadProjectParams = useCallback(async () => {
    if (!projectId) return;
    try {
      const p = await getProjectParams(projectId);
      setProjectParams(p);
    } catch { /* silently */ }
  }, [projectId]);

  useEffect(() => { loadProject(true); }, [loadProject]);
  useEffect(() => { loadRefs(); }, []);
  useEffect(() => { if (project) loadBoards(); }, [project?.id]);
  useEffect(() => { if (project) loadMembers(); }, [project?.id]);
  useEffect(() => { if (project) loadProjectRoles(); }, [project?.id]);
  useEffect(() => { if (project) loadProjectParams(); }, [project?.id]);
  useEffect(() => { loadBoardDetails(); }, [activeBoardId]);

  // ── Handlers ────────────────────────────────────────────────

  const handleSaveProject = async () => {
    if (!project) return;
    setSavingProject(true);
    try {
      const updated = await updateProject(project.id, {
        name: editName,
        description: editDescription,
        status: editStatus,
      });
      setProject(updated);
      toast.success("Проект сохранён");
    } catch (e: any) {
      toastError(e, "Ошибка сохранения проекта");
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    try {
      await deleteProjectApi(project.id);
      toast.success("Проект удалён");
      navigate("/projects");
    } catch (e: any) {
      toastError(e, "Ошибка удаления проекта");
    }
  };

  const handleToggleArchive = async () => {
    if (!project) return;
    const nextStatus = project.status === "archived" ? "active" : "archived";
    setArchivingProject(true);
    try {
      const updated = await updateProject(project.id, { status: nextStatus });
      setProject(updated);
      setEditStatus(updated.status);
      toast.success(nextStatus === "archived" ? "Проект архивирован" : "Проект разархивирован");
    } catch (e: any) {
      toastError(e, "Ошибка изменения статуса проекта");
    } finally {
      setArchivingProject(false);
    }
  };

  const handleAddMember = async () => {
    if (!project || !selectedUserId) return;
    if (newMemberRoles.length === 0) { toast.error("Выберите хотя бы одну роль"); return; }
    try {
      await addProjectMember(project.id, {
        userId: selectedUserId,
        roles: newMemberRoles.length > 0 ? newMemberRoles : undefined,
      });
      toast.success("Участник добавлен");
      setShowAddMemberModal(false);
      setSelectedUserId(null);
      setSelectedUserProfile(null);
      setNewMemberRoles([]);
      setUserSearchQuery("");
      setSearchResults([]);
      loadMembers();
    } catch (e: any) {
      toastError(e, "Ошибка добавления участника");
    }
  };

  const handleEditMember = async () => {
    if (!project || !selectedMember) return;
    if (selectedRoles.length === 0) { toast.error("Выберите хотя бы одну роль"); return; }
    try {
      await updateMemberRoles(project.id, selectedMember.id, selectedRoles);
      toast.success("Роли участника обновлены");
      setShowEditMemberModal(false);
      setSelectedMember(null);
      setSelectedRoles([]);
      loadMembers();
    } catch (e: any) {
      toastError(e, "Ошибка обновления участника");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!project) return;
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    // Protect owner
    if (member.userId === project.ownerId) {
      toast.error("Нельзя удалить ответственного за проект. Сначала назначьте другого ответственного.");
      return;
    }

    // Protect last admin
    const adminRole = projectRoles.find(r => r.isAdmin);
    if (adminRole) {
      const admins = members.filter(m => (m.roles || []).some(r => r.id === adminRole.id));
      if (admins.length === 1 && admins[0].id === memberId) {
        toast.error("Нельзя удалить последнего администратора проекта. Сначала назначьте роль администратора другому участнику.");
        return;
      }
    }

    if (!confirm("Вы уверены, что хотите удалить этого участника из проекта?")) return;
    try {
      await removeMember(project.id, memberId);
      toast.success("Участник удалён");
      loadMembers();
    } catch (e: any) {
      toastError(e, "Ошибка удаления участника");
    }
  };

  const handleCreateBoard = async (name: string, description: string) => {
    if (!project) return;
    try {
      const newBoard = await createBoard({
        projectId: project.id,
        name,
        description,
        order: (boardTabs.length > 0 ? Math.max(...boardTabs.map(b => b.order)) : 0) + 1,
      });
      await loadBoards();
      setActiveBoardId(newBoard.id);
    } catch (e: any) {
      toastError(e, "Ошибка создания доски");
    }
  };

  const handleDeleteBoard = (boardId: string) => {
    const board = boardTabs.find(b => b.id === boardId);
    // Mirrors the template deletion rules: can't remove the board marked "по умолчанию"
    // and can't remove the last board — there must always be at least one board on the
    // project, as in the template editor.
    if (!board || board.isDefault) return;
    if (boardTabs.length <= 1) return;
    setDeleteBoardTarget(boardId);
  };

  const confirmDeleteBoard = async () => {
    if (!deleteBoardTarget) return;
    try {
      await deleteBoardApi(deleteBoardTarget);
      if (activeBoardId === deleteBoardTarget) {
        const idx = boardTabs.findIndex(b => b.id === deleteBoardTarget);
        const remaining = boardTabs.filter(b => b.id !== deleteBoardTarget);
        // After delete the active board slides one position to the left (same convention
        // as the template editor's `activeBoardIndex = max(0, index - 1)` fallback) and
        // falls back to the first remaining board if we were at index 0.
        if (remaining.length > 0) {
          setActiveBoardId(idx > 0 ? remaining[idx - 1].id : remaining[0].id);
        } else {
          setActiveBoardId(null);
        }
      }
      loadBoards();
    } catch (e: any) {
      toastError(e, "Ошибка удаления доски");
    } finally {
      setDeleteBoardTarget(null);
    }
  };

  const handleSetSwimlaneGroupBy = async (val: string) => {
    if (!activeBoardId) return;
    try {
      // Delete existing swimlanes (fetch fresh to include any auto-created ones)
      const freshSwims = await getBoardSwimlanes(activeBoardId);
      for (const sw of freshSwims) {
        try { await deleteSwimlane(activeBoardId, sw.id); } catch { /**/ }
      }
      await updateBoard(activeBoardId, { swimlaneGroupBy: val || null });
      setSwimlaneGroupBy(val);

      // Auto-create swimlanes for static types (checkbox/select/priority)
      // Dynamic types (user, user_list, tags, etc.) are auto-created by Board.tsx from task data
      if (val) {
        const freshFields = await getBoardFields(activeBoardId);
        const freshBoard = await getBoard(activeBoardId);
        const field = freshFields.find(f => f.id === val);
        let expectedValues: string[] | null = null;
        if (field) {
          if (field.fieldType === "checkbox") {
            expectedValues = [`${field.name}: да`, `${field.name}: нет`];
          } else if (field.fieldType === "select" || field.fieldType === "priority") {
            const priorityFieldId = freshFields.find(f => f.isSystem && (f.fieldType === "priority" || f.name.toLowerCase().includes("приоритизаци")))?.id;
            if (field.id === priorityFieldId) {
              const defaults = (refs?.priorityTypeOptions || []).find(o => o.key === freshBoard.priorityType)?.defaultValues || [];
              expectedValues = (freshBoard.priorityOptions && freshBoard.priorityOptions.length > 0) ? freshBoard.priorityOptions : defaults.length > 0 ? defaults : null;
            } else {
              expectedValues = (field.options && field.options.length > 0) ? field.options : null;
            }
          } else if (field.fieldType === "multiselect" && field.options?.length) {
            expectedValues = field.options;
          }
        }
        if (expectedValues && expectedValues.length > 0) {
          for (let i = 0; i < expectedValues.length; i++) {
            try { await createSwimlane(activeBoardId, { name: expectedValues[i], order: i + 1 }); } catch { /**/ }
          }
        }
      }
      await loadBoardDetails();
      setBoardRefreshKey(k => k + 1);
    } catch (e: any) { toastError(e, "Ошибка"); }
  };

  const moveBoard = (dragIndex: number, hoverIndex: number) => {
    const newBoards = [...boardTabs];
    const [dragged] = newBoards.splice(dragIndex, 1);
    newBoards.splice(hoverIndex, 0, dragged);
    newBoards.forEach((board, idx) => (board.order = idx + 1));
    setBoardTabs(newBoards);
    // Persist order via API
    newBoards.forEach((board) => {
      updateBoard(board.id, { order: board.order }).catch(() => {});
    });
  };

  const handleSearchUsers = async (q: string) => {
    setUserSearchQuery(q);
    // Any edit of the search input drops the previous selection so the blue "selected"
    // chip doesn't linger (with a now-stale display name) and the results list / empty
    // state comes back as the user expects.
    if (selectedUserId) {
      setSelectedUserId(null);
      setSelectedUserProfile(null);
    }
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchUsers(q);
      // Filter out already-added members
      const memberUserIds = new Set(members.map((m) => m.userId));
      setSearchResults(results.filter((u) => !memberUserIds.has(u.id)));
    } catch { /* silently */ }
  };

  // ── Loading / Error ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={40} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Проект не найден</h2>
          <p className="text-slate-500">Проект с ID {projectId} не существует</p>
          <Link
            to="/projects"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Вернуться к списку проектов
          </Link>
        </div>
      </div>
    );
  }

  // ── Derived state ───────────────────────────────────────────

  const statusLabel = STATUS_MAP[project.status] ?? project.status;
  const projectType = project.projectType;

  const tabs = [
    { id: "overview", label: "Обзор проекта", icon: BarChart3 },
    ...(can("project.boards") || can("project.tasks") ? [{ id: "boards", label: "Доски задач", icon: Layout }] : []),
    ...(projectType === "scrum" && can("project.sprints") ? [{ id: "backlog", label: "Бэклог и спринты", icon: FileText }] : []),
    ...(can("project.settings") || can("project.members") || can("project.roles") ? [{ id: "params", label: "Параметры и участники проекта", icon: Settings }] : []),
    ...(can("project.analytics") ? [{ id: "analytics", label: "Аналитика", icon: TrendingUp }] : []),
    ...(projectType === "kanban" && can("project.analytics") ? [{ id: "metrics", label: "Прогнозирование", icon: TrendingUp }] : []),
  ];

  const activeBoard = boardTabs.find((b) => b.id === activeBoardId);

  function handleTabChange(tabId: string) {
    if (hasParamErrors && tabId !== "params") {
      setShowTabBlockWarning(true);
      return;
    }
    setActiveTab(tabId as any);
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 min-w-0">
      {/* Back button */}
      <button
        onClick={() => navigate("/projects")}
        className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition-colors"
      >
        <ChevronLeft size={16} />
        <span>Назад к списку проектов</span>
      </button>

      {/* Compact Header */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
        <div className="flex items-center flex-wrap gap-x-3 gap-y-2 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-mono font-bold rounded">
              {project.key}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(project.key);
                setCopiedKey(true);
                setTimeout(() => setCopiedKey(false), 1500);
              }}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
              title="Копировать ключ"
              aria-label="Копировать ключ проекта"
            >
              {copiedKey ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-600" />}
            </button>
          </div>
          <h1 className="text-xl md:text-2xl font-bold break-words min-w-0 flex-1 basis-full md:basis-auto">{project.name}</h1>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-semibold rounded shrink-0">
            {projectType === "scrum" ? "Scrum" : "Kanban"}
          </span>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded shrink-0 ${
              project.status === "active"
                ? "bg-green-100 text-green-700"
                : project.status === "paused"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {statusLabel}
          </span>
          {(canEditProject || canEdit("project.settings")) && (
            <div className="ml-auto flex items-center gap-1 shrink-0">
              <button
                onClick={handleToggleArchive}
                disabled={archivingProject}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={project.status === "archived" ? "Разархивировать проект" : "Архивировать проект"}
              >
                {archivingProject ? (
                  <Loader2 size={20} className="text-slate-600 animate-spin" />
                ) : project.status === "archived" ? (
                  <ArchiveRestore size={20} className="text-blue-600" />
                ) : (
                  <Archive size={20} className="text-slate-600" />
                )}
              </button>
              <button
                onClick={() => setShowDeleteProject(!showDeleteProject)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title={showDeleteProject ? "Скрыть" : "Удалить проект"}
              >
                {showDeleteProject ? (
                  <ChevronUp size={20} className="text-slate-600" />
                ) : (
                  <Trash2 size={20} className="text-red-600" />
                )}
              </button>
            </div>
          )}
        </div>
        {showDeleteProject && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800 mb-3">
              Вы уверены, что хотите удалить проект? Это действие необратимо.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteProject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Да, удалить проект
              </button>
              <button
                onClick={() => setShowDeleteProject(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab block warning — visible until errors are fixed */}
      {showTabBlockWarning && hasParamErrors && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-xl flex items-start gap-3" style={{ overflowAnchor: "none" }}>
          <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Невозможно покинуть вкладку параметров</p>
            <p className="text-xs text-red-700 mt-0.5">Заполните все обязательные параметры проекта корректно перед переходом на другую вкладку.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md border border-slate-100 min-w-0">
        {/* Desktop tabs */}
        <div className="border-b border-slate-200 p-4 hidden md:block">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile burger menu */}
        <div className="border-b border-slate-200 p-4 md:hidden">
          <div className="relative">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                {tabs.find((t) => t.id === activeTab) && (
                  <>
                    {(() => {
                      const Icon = tabs.find((t) => t.id === activeTab)!.icon;
                      return <Icon size={20} />;
                    })()}
                    <span className="font-medium">{tabs.find((t) => t.id === activeTab)!.label}</span>
                  </>
                )}
              </div>
              <Menu size={20} className={`transition-transform ${showMobileMenu ? "rotate-90" : ""}`} />
            </button>

            {showMobileMenu && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        handleTabChange(tab.id);
                        if (!hasParamErrors || tab.id === "params") setShowMobileMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-b border-slate-100 last:border-b-0 ${
                        activeTab === tab.id
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 min-w-0">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Full Header - only on overview */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-4 md:p-8 text-white shadow-lg min-w-0">
                <div className="mb-4">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-mono font-bold rounded">
                      {project.key}
                    </span>
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold rounded">
                      {projectType === "scrum" ? "Scrum" : "Kanban"}
                    </span>
                    <span
                      className={`px-3 py-1 text-sm font-semibold rounded ${
                        project.status === "active"
                          ? "bg-green-500/30 text-white"
                          : project.status === "paused"
                          ? "bg-yellow-500/30 text-white"
                          : "bg-slate-500/30 text-white"
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-4xl font-bold mb-2 break-words">{project.name}</h1>
                  {project.description && (
                    <p className="text-blue-100 break-words whitespace-pre-wrap">{project.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-blue-100 text-sm md:text-base">
                  <div className="flex items-center gap-2 min-w-0">
                    {owner && <UserAvatar user={toAvatarUser(owner)} size="sm" />}
                    <span className="min-w-0 break-words">Ответственный: {owner?.fullName ?? "—"}</span>
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <span>Создан: {formatDate(project.createdAt, "dmy")}</span>
                </div>
              </div>

              {/* Overview Content */}
              <ProjectOverview
                projectId={project.id}
                projectType={projectType}
                projectOwnerId={project.ownerId}
                members={members}
                memberUsers={memberUsers}
              />
            </div>
          )}

          {/* Boards Tab */}
          {activeTab === "boards" && (
            <div className="space-y-6">
              <DndProvider backend={HTML5Backend}>
                <div className="border-b border-slate-200 bg-slate-50 -mx-6 px-6 py-2">
                  <ScrollableTabs
                    trailing={canEdit("project.boards") ? (
                      <button
                        onClick={async () => {
                          await handleCreateBoard("Новая доска", "");
                        }}
                        className="px-4 py-2 border border-dashed border-slate-300 rounded-t-lg hover:border-blue-400 hover:text-blue-600 hover:bg-white transition-all flex items-center gap-2 text-slate-600 whitespace-nowrap"
                      >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Добавить доску</span>
                      </button>
                    ) : null}
                  >
                    {boardTabs.map((board, index) => (
                      <DraggableBoardTab
                        key={board.id}
                        board={board}
                        index={index}
                        isActive={activeBoardId === board.id}
                        moveBoard={moveBoard}
                        onSelect={setActiveBoardId}
                        onEdit={(b) => {
                          setSelectedBoard(b);
                          setShowBoardSettingsModal(true);
                        }}
                        onDelete={handleDeleteBoard}
                        canEditBoard={canEdit("project.boards")}
                        canDelete={boardTabs.length > 1}
                      />
                    ))}
                  </ScrollableTabs>
                </div>
              </DndProvider>

              {/* Board Controls */}
              {activeBoard && (() => {
                const priorityTypeLabel = (refs?.priorityTypeOptions || []).find(o => o.key === currentPriorityType)?.name;
                const priorityFieldId = boardFields.find(f => f.isSystem && (f.fieldType === "priority" || f.name.toLowerCase().includes("приоритизаци")))?.id;
                function getFieldDisplayName(f: BoardField): string {
                  if (f.id === priorityFieldId && priorityTypeLabel) return priorityTypeLabel;
                  return f.name;
                }
                const selectedField = boardFields.find(f => f.id === swimlaneGroupBy);
                return (
                  <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">Колонок:</span> {boardColumns.length}
                        <div className="relative group">
                          <Info size={14} className="text-slate-400 cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 w-80 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
                            <p className="font-medium mb-1">Правила колонок:</p>
                            <p>Минимум по одной колонке типов «Начальный», «В работе» и «Завершено».</p>
                            <p className="mt-1">Порядок: Начальный → В работе → Завершено.</p>
                            <div className="absolute left-3 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1"><span className="font-semibold">Дорожек:</span> {computedSwimlaneCount ?? boardSwimlanes.length}<TermTooltip term="swimlane" /></div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Группировать задачи по:</label>
                      <div className="max-w-md">
                        <Select
                          value={swimlaneGroupBy}
                          onValueChange={handleSetSwimlaneGroupBy}
                          disabled={!canEdit("project.boards")}
                          ariaLabel="Группировка задач"
                        >
                          <SelectOption value="">Без дорожек</SelectOption>
                          {boardFields
                            .filter(f => ["priority", "select", "checkbox", "multiselect", "user", "user_list", "tags"].includes(f.fieldType) && f.fieldType !== "column" && !f.name.toLowerCase().includes("статус"))
                            .map(f => (
                              <SelectOption key={f.id} value={f.id}>{getFieldDisplayName(f)}</SelectOption>
                            ))}
                          {!boardFields.some(f => f.fieldType === "tags") && (
                            <SelectOption value="__tags__">Теги</SelectOption>
                          )}
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Board Content */}
              {activeBoard ? (
                <Board key={`${activeBoardId}-${boardRefreshKey}`} boardId={activeBoardId} projectId={project.id} projectType={projectType}
                  onBoardChanged={() => { loadBoards(); loadBoardDetails(); }}
                  onSwimlanesComputed={setComputedSwimlaneCount}
                  canEditTasks={canEdit("project.tasks")}
                  canEditBoard={canEdit("project.boards")} />
              ) : (
                <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                  <EmptyState
                    icon={<Layout size={48} />}
                    title="Нет досок задач"
                    action={(
                      <button
                        onClick={() => handleCreateBoard("Основная доска", "")}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Создать первую доску
                      </button>
                    )}
                  />
                </div>
              )}
            </div>
          )}

          {/* Backlog Tab */}
          {activeTab === "backlog" && (
            <div className="space-y-6">
              <ScrumBacklog projectId={project.id} canEdit={canEdit("project.sprints")} />
            </div>
          )}

          {/* Metrics Tab (Kanban) */}
          {activeTab === "metrics" && (
            <div className="space-y-6">
              <KanbanMetrics projectId={project.id} />
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <Analytics projectId={project.id} projectType={projectType} />
            </div>
          )}

          {/* Params & Members Tab */}
          {activeTab === "params" && (
            <div className="space-y-8">
              {/* Параметры проекта (объединённый блок) */}
              {can("project.settings") && refs && (
                <div className={!canEdit("project.settings") ? "pointer-events-none opacity-75" : ""}>
                <ProjectParamsSection
                  projectId={project.id}
                  projectKey={project.key}
                  projectName={project.name}
                  projectDescription={project.description}
                  projectType={projectType}
                  projectStatus={project.status}
                  projectOwnerId={project.ownerId}
                  projectCreatedAt={project.createdAt}
                  members={members.map(m => {
                    const u = memberUsers.get(m.userId);
                    return { userId: m.userId, fullName: u?.fullName || m.userId, username: u?.username, avatarUrl: u?.avatarUrl ?? undefined };
                  })}
                  refs={refs}
                  params={projectParams}
                  onReload={loadProjectParams}
                  onValidationChange={setParamErrors}
                  onProjectUpdate={async (patch) => {
                    try {
                      await updateProject(project.id, patch as any);
                      await loadProject();
                      await loadProjectParams();
                      toast.success("Параметры проекта обновлены");
                    } catch (e: any) {
                      toastError(e, "Не удалось сохранить");
                    }
                  }}
                />
                </div>
              )}

              {/* Роли на проекте (из шаблона + кастомные) */}
              {can("project.roles") && refs && (
                <div className={!canEdit("project.roles") ? "pointer-events-none opacity-75" : ""}>
                <ProjectRolesSection
                  projectId={project.id}
                  projectType={projectType}
                  refs={refs}
                  roles={projectRoles}
                  onReload={loadProjectRoles}
                />
                </div>
              )}

              {/* Участники проекта */}
              {can("project.members") && <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden p-4 md:p-6">
                <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">Участники проекта</h3>
                    <p className="text-sm text-slate-600">
                      Всего участников: {members.length}
                    </p>
                  </div>
                  {canEdit("project.members") && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shrink-0"
                    >
                      <Plus size={20} />
                      <span className="hidden sm:inline">Добавить участника</span>
                      <span className="sm:hidden">Добавить</span>
                    </button>
                  )}
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <div className="flex items-start gap-2">
                    <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      На проекте должен быть минимум один участник с полными проектными правами доступа.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(() => {
                    // Project admins (role.isAdmin === true) stay pinned to the top. Within
                    // the non-admin bucket members are sorted alphabetically by their role
                    // name (using the member's alphabetically-first role as the sort key so
                    // multi-role members still have a deterministic position). Russian
                    // collation handles cyrillic correctly. "Без роли" members, if any,
                    // fall to the very bottom.
                    const adminRoleIds = new Set(
                      projectRoles.filter((r) => r.isAdmin).map((r) => r.id),
                    );
                    const primaryRoleName = (m: typeof members[0]) => {
                      const names = (m.roles ?? [])
                        .filter((r) => !adminRoleIds.has(r.id))
                        .map((r) => r.name)
                        .sort((x, y) => x.localeCompare(y, "ru"));
                      return names[0] ?? "";
                    };
                    return [...members].sort((a, b) => {
                      const aAdmin = (a.roles ?? []).some((r) => adminRoleIds.has(r.id));
                      const bAdmin = (b.roles ?? []).some((r) => adminRoleIds.has(r.id));
                      if (aAdmin !== bAdmin) return aAdmin ? -1 : 1;
                      const aRole = primaryRoleName(a);
                      const bRole = primaryRoleName(b);
                      // Members without a non-admin role (empty string) go last.
                      if (!aRole && bRole) return 1;
                      if (aRole && !bRole) return -1;
                      return aRole.localeCompare(bRole, "ru");
                    });
                  })().map((member) => {
                    const user = memberUsers.get(member.userId);
                    if (!user) return null;

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <UserAvatar user={toAvatarUser(user)} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{user.fullName}</p>
                            <p className="text-sm text-slate-600 truncate">{user.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4">
                          <div className="min-w-0 md:text-right">
                            {(member.roles || []).length > 0 ? (
                              <div className="flex flex-wrap gap-1 md:justify-end">
                                {(() => {
                                  // Pin admin-role badges first so the most privileged role
                                  // is the first thing the user reads when scanning the row.
                                  // The relative order of non-admin roles is preserved from
                                  // the backend (`project_role.order`).
                                  const adminRoleIds = new Set(
                                    projectRoles.filter((r) => r.isAdmin).map((r) => r.id),
                                  );
                                  const list = member.roles ?? [];
                                  const admins = list.filter((r) => adminRoleIds.has(r.id));
                                  const others = list.filter((r) => !adminRoleIds.has(r.id));
                                  return [...admins, ...others].map((role) => (
                                    <span
                                      key={role.id}
                                      className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded"
                                    >
                                      {role.name}
                                    </span>
                                  ));
                                })()}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">Без роли</p>
                            )}
                          </div>
                          {canEdit("project.members") && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setSelectedMember(member);
                                  setSelectedRoles((member.roles || []).map((r) => r.id));
                                  setShowEditMemberModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Редактировать роли"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Удалить из проекта"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>}
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        open={showAddMemberModal}
        onOpenChange={(next) => {
          setShowAddMemberModal(next);
          if (!next) {
            setSelectedUserId(null);
            setSelectedUserProfile(null);
            setNewMemberRoles([]);
            setUserSearchQuery("");
            setSearchResults([]);
          }
        }}
        size="md"
      >
        <ModalHeader>
          <ModalTitle>Добавить участника</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Поиск пользователя *</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Введите имя или логин..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {searchResults.length > 0 && !selectedUserId && (
                <div className="mt-2 border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setSelectedUserProfile(user);
                        setUserSearchQuery(user.fullName);
                        setSearchResults([]);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                    >
                      <UserAvatar user={toAvatarUser(user)} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <p className="text-xs text-slate-500">{user.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedUserId && (() => {
                // Show fullName + login of the picked user in the blue chip so the admin
                // can verify identity before saving (two people can share a fullName).
                const picked = selectedUserProfile
                  ?? memberUsers.get(selectedUserId)
                  ?? searchResults.find((u) => u.id === selectedUserId);
                return (
                  <div className="mt-2 flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-700 truncate">
                        {picked?.fullName ?? userSearchQuery}
                      </p>
                      {picked?.username && (
                        <p className="text-xs text-blue-600 truncate">{picked.username}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUserId(null);
                        setSelectedUserProfile(null);
                        setUserSearchQuery("");
                      }}
                      className="text-blue-500 hover:text-blue-700 shrink-0 mt-0.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })()}
            </div>

            {selectedUserId && projectRoles.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Роли (опционально)</label>
                <div className="border border-slate-200 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
                  {projectRoles.map((role) => (
                    <label key={role.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={newMemberRoles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewMemberRoles([...newMemberRoles, role.id]);
                          } else {
                            setNewMemberRoles(newMemberRoles.filter(r => r !== role.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium">{role.name}</span>
                        {role.description && <p className="text-xs text-slate-500">{role.description}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => {
              setShowAddMemberModal(false);
              setSelectedUserId(null);
              setSelectedUserProfile(null);
              setNewMemberRoles([]);
              setUserSearchQuery("");
              setSearchResults([]);
            }}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Отмена
          </button>
          <button
            onClick={handleAddMember}
            disabled={!selectedUserId || newMemberRoles.length === 0}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Добавить
          </button>
        </ModalFooter>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        open={showEditMemberModal && !!selectedMember}
        onOpenChange={(next) => {
          setShowEditMemberModal(next);
          if (!next) {
            setSelectedMember(null);
            setSelectedRoles([]);
          }
        }}
        size="md"
      >
        {selectedMember && (
          <>
            <ModalHeader>
              <ModalTitle>Изменить роли участника</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Участник</label>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    {memberUsers.get(selectedMember.userId) && (() => {
                      const u = memberUsers.get(selectedMember.userId)!;
                      return (
                        <>
                          <UserAvatar user={toAvatarUser(u)} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.fullName}</p>
                            {u.username && <p className="text-xs text-slate-500 truncate">{u.username}</p>}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Роли</label>
                  <div className="border border-slate-200 rounded-lg p-3 space-y-1 max-h-60 overflow-y-auto">
                    {projectRoles.map((role) => (
                      <label key={role.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles([...selectedRoles, role.id]);
                            } else {
                              setSelectedRoles(selectedRoles.filter(r => r !== role.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-sm font-medium">{role.name}</span>
                          {role.description && <p className="text-xs text-slate-500">{role.description}</p>}
                        </div>
                      </label>
                    ))}
                    {projectRoles.length === 0 && (
                      <p className="text-sm text-slate-400 italic p-2">Нет доступных ролей</p>
                    )}
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <button
                onClick={() => {
                  setShowEditMemberModal(false);
                  setSelectedMember(null);
                  setSelectedRoles([]);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleEditMember}
                disabled={selectedRoles.length === 0}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Сохранить
              </button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* Board Settings Modal */}
      {showBoardSettingsModal && selectedBoard && selectedBoard.id && (
        <BoardSettingsModal
          isOpen={showBoardSettingsModal}
          onClose={() => {
            setShowBoardSettingsModal(false);
            setSelectedBoard(null);
            loadBoards();
            loadBoardDetails();
            setBoardRefreshKey(k => k + 1);
          }}
          boardId={selectedBoard.id}
          boardName={selectedBoard.name}
          boardDescription={selectedBoard.description ?? ""}
          projectType={projectType}
          refs={refs}
          onBoardUpdated={() => {
            loadBoards();
            loadBoardDetails();
            setBoardRefreshKey(k => k + 1);
          }}
        />
      )}

      {/* Delete board confirmation */}
      <ConfirmDialog
        open={!!deleteBoardTarget}
        onOpenChange={(next) => { if (!next) setDeleteBoardTarget(null); }}
        title="Удалить доску"
        description={`Вы уверены, что хотите удалить доску «${boardTabs.find(b => b.id === deleteBoardTarget)?.name ?? ""}»? Это действие необратимо.`}
        variant="danger"
        confirmLabel="Удалить"
        onConfirm={confirmDeleteBoard}
      />

      {/* Navigation blocker modal */}
      <Modal
        open={showBlockerModal && blocker.state === "blocked"}
        onOpenChange={(next) => { if (!next) { setShowBlockerModal(false); blocker.reset?.(); } }}
        size="md"
        hideCloseButton
      >
        <ModalBody>
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">Не все параметры заполнены</h2>
              <p className="text-sm text-slate-600 mt-1">
                Заполните все обязательные параметры проекта перед переходом на другую страницу.
              </p>
              <ul className="text-xs text-red-700 mt-2 space-y-0.5">
                {paramErrors.map(e => <li key={e.paramId}>— {e.message}</li>)}
              </ul>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => { setShowBlockerModal(false); blocker.reset?.(); }}
            className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Вернуться к параметрам
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
