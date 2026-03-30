import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate, useBlocker } from "react-router";
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
  ChevronUp,
  Loader2,
  Search,
  Info,
  AlertCircle,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import Board from "./Board";
import BoardSettingsModal from "../components/modals/BoardSettingsModal";
import ScrumBacklog from "./ScrumBacklog";
import KanbanMetrics from "./KanbanMetrics";
import ProjectOverview from "./ProjectOverview";
import ProjectParamsSection from "../components/project/ProjectParamsSection";
import type { ParamValidationError } from "../components/project/ProjectParamsSection";
import ProjectRolesSection from "../components/project/ProjectRolesSection";
import { getProject, updateProject, deleteProject as deleteProjectApi, type ProjectResponse } from "../api/projects";
import { getProjectMembers, addProjectMember, updateMemberRoles, removeMember, type ProjectMemberResponse } from "../api/projects";
import { getProjectBoards, createBoard, updateBoard, deleteBoard as deleteBoardApi, getBoardColumns, getBoardSwimlanes, getProjectReferences, type BoardResponse, type ColumnResponse, type SwimlaneResponse, type ProjectReferences } from "../api/boards";
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
}

interface DraggableBoardTabProps {
  board: BoardTab;
  index: number;
  isActive: boolean;
  moveBoard: (dragIndex: number, hoverIndex: number) => void;
  onSelect: (id: string) => void;
  onEdit: (board: BoardTab) => void;
  onDelete: (id: string) => void;
}

const DraggableBoardTab = ({
  board,
  index,
  isActive,
  moveBoard,
  onSelect,
  onEdit,
  onDelete,
}: DraggableBoardTabProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: "BOARD_TAB",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "BOARD_TAB",
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveBoard(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`flex items-center gap-1.5 cursor-move ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        onClick={() => onSelect(board.id)}
        className={`px-4 py-2.5 rounded-t-lg font-medium transition-all whitespace-nowrap border-b-2 ${
          isActive
            ? "bg-white text-blue-600 border-blue-600"
            : "bg-slate-50 text-slate-700 border-transparent hover:bg-slate-100"
        }`}
      >
        <span>{board.name}</span>
        {board.description && (
          <div className="text-xs opacity-75 mt-1 font-normal">{board.description}</div>
        )}
      </button>
      <div className="flex items-center gap-0.5 pb-0.5">
        <button
          onClick={() => onEdit(board)}
          className="p-1.5 hover:bg-slate-200 rounded transition-all"
          title="Настройки доски"
        >
          <Settings size={14} className="text-slate-600" />
        </button>
        <button
          onClick={() => onDelete(board.id)}
          className="p-1.5 hover:bg-red-100 rounded transition-all"
          title="Удалить доску"
        >
          <Trash2 size={14} className="text-red-600" />
        </button>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────

export default function ProjectDetail() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  // Data state
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [owner, setOwner] = useState<UserProfileResponse | null>(null);
  const [boardTabs, setBoardTabs] = useState<BoardTab[]>([]);
  const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
  const [memberUsers, setMemberUsers] = useState<Map<string, UserProfileResponse>>(new Map());
  const [boardColumns, setBoardColumns] = useState<ColumnResponse[]>([]);
  const [boardSwimlanes, setBoardSwimlanes] = useState<SwimlaneResponse[]>([]);
  const [refs, setRefs] = useState<ProjectReferences | null>(null);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);
  const [projectParams, setProjectParams] = useState<ProjectParam[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "boards" | "backlog" | "metrics" | "params">("overview");
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [showBoardSettingsModal, setShowBoardSettingsModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<BoardTab | null>(null);
  const [selectedMember, setSelectedMember] = useState<ProjectMemberResponse | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Add member modal state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfileResponse[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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
      })));
      if (sorted.length > 0 && !activeBoardId) {
        setActiveBoardId(sorted[0].id);
      }
    } catch { /* silently */ }
  }, [projectId, activeBoardId]);

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
      setBoardColumns([]);
      setBoardSwimlanes([]);
      return;
    }
    try {
      const [cols, swims] = await Promise.all([
        getBoardColumns(activeBoardId),
        getBoardSwimlanes(activeBoardId),
      ]);
      setBoardColumns(cols.sort((a, b) => a.order - b.order));
      setBoardSwimlanes(swims.sort((a, b) => a.order - b.order));
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
      setProjectParams(p.sort((a, b) => a.order - b.order));
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
      toast.error(e.message || "Ошибка сохранения проекта");
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
      toast.error(e.message || "Ошибка удаления проекта");
    }
  };

  const handleAddMember = async () => {
    if (!project || !selectedUserId) return;
    try {
      await addProjectMember(project.id, {
        userId: selectedUserId,
        roles: newMemberRoles.length > 0 ? newMemberRoles : undefined,
      });
      toast.success("Участник добавлен");
      setShowAddMemberModal(false);
      setSelectedUserId(null);
      setNewMemberRoles([]);
      setUserSearchQuery("");
      setSearchResults([]);
      loadMembers();
    } catch (e: any) {
      toast.error(e.message || "Ошибка добавления участника");
    }
  };

  const handleEditMember = async () => {
    if (!project || !selectedMember) return;
    try {
      await updateMemberRoles(project.id, selectedMember.id, selectedRoles);
      toast.success("Роли участника обновлены");
      setShowEditMemberModal(false);
      setSelectedMember(null);
      setSelectedRoles([]);
      loadMembers();
    } catch (e: any) {
      toast.error(e.message || "Ошибка обновления участника");
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
      const admins = members.filter(m => m.roles.includes(adminRole.id));
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
      toast.error(e.message || "Ошибка удаления участника");
    }
  };

  const handleCreateBoard = async (name: string, description: string) => {
    if (!project) return;
    try {
      const newBoard = await createBoard({
        projectId: project.id,
        name,
        description,
        order: boardTabs.length + 1,
      });
      toast.success("Доска создана");
      await loadBoards();
      setActiveBoardId(newBoard.id);
    } catch (e: any) {
      toast.error(e.message || "Ошибка создания доски");
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту доску?")) return;
    try {
      await deleteBoardApi(boardId);
      toast.success("Доска удалена");
      if (activeBoardId === boardId) {
        setActiveBoardId(null);
      }
      loadBoards();
    } catch (e: any) {
      toast.error(e.message || "Ошибка удаления доски");
    }
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
    { id: "boards", label: "Доски задач", icon: Layout },
    ...(projectType === "scrum" ? [{ id: "backlog", label: "Бэклог и спринты", icon: FileText }] : []),
    ...(projectType === "kanban" ? [{ id: "metrics", label: "Метрики Kanban", icon: TrendingUp }] : []),
    { id: "params", label: "Параметры и участники проекта", icon: Settings },
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
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Compact Header */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-mono font-bold rounded">
              {project.key}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(project.key);
                setCopiedKey(true);
                setTimeout(() => setCopiedKey(false), 2000);
              }}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
              title="Копировать ключ"
            >
              <Copy size={16} className={copiedKey ? "text-green-600" : "text-slate-600"} />
            </button>
          </div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-semibold rounded">
            {projectType === "scrum" ? "Scrum" : "Kanban"}
          </span>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded ${
              project.status === "active"
                ? "bg-green-100 text-green-700"
                : project.status === "paused"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {statusLabel}
          </span>
          <div className="ml-auto">
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
      <div className="bg-white rounded-xl shadow-md border border-slate-100">
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

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Full Header - only on overview */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
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
                    <h1 className="text-4xl font-bold mb-2">{project.name}</h1>
                    <p className="text-blue-100">{project.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-blue-100">
                  <div className="flex items-center gap-2">
                    {owner && <UserAvatar user={toAvatarUser(owner)} size="sm" />}
                    <span>Ответственный: {owner?.fullName ?? "—"}</span>
                  </div>
                  <span>•</span>
                  <span>Создан: {new Date(project.createdAt).toLocaleDateString("ru-RU")}</span>
                </div>
              </div>

              {/* Overview Content */}
              <ProjectOverview
                projectId={project.id}
                projectType={projectType}
                members={members}
                memberUsers={memberUsers}
              />
            </div>
          )}

          {/* Boards Tab */}
          {activeTab === "boards" && (
            <div className="space-y-6 overflow-hidden">
              <DndProvider backend={HTML5Backend}>
                <div className="border-b border-slate-200 bg-slate-50 -mx-6 px-6">
                  <div className="flex items-center gap-2 overflow-x-auto pb-0">
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
                      />
                    ))}
                    <button
                      onClick={async () => {
                        await handleCreateBoard("Новая доска", "");
                      }}
                      className="px-4 py-2 border border-dashed border-slate-300 rounded-t-lg hover:border-blue-400 hover:text-blue-600 hover:bg-white transition-all flex items-center gap-2 text-slate-600 whitespace-nowrap"
                    >
                      <Plus size={16} />
                      Добавить доску
                    </button>
                  </div>
                </div>
              </DndProvider>

              {/* Board Controls */}
              {activeBoard && (
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div>
                      <span className="font-semibold">Колонок:</span> {boardColumns.length}
                    </div>
                    {boardSwimlanes.length > 0 && (
                      <div>
                        <span className="font-semibold">Дорожек:</span> {boardSwimlanes.length}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Board Content */}
              {activeBoard ? (
                <Board boardId={activeBoardId} projectId={project.id} />
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                  <Layout size={48} className="mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600 mb-4">Нет досок задач</p>
                  <button
                    onClick={() => handleCreateBoard("Основная доска", "")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Создать первую доску
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Backlog Tab */}
          {activeTab === "backlog" && (
            <div className="space-y-6">
              <ScrumBacklog projectId={project.id} />
            </div>
          )}

          {/* Metrics Tab */}
          {activeTab === "metrics" && (
            <div className="space-y-6">
              <KanbanMetrics projectId={project.id} />
            </div>
          )}

          {/* Params & Members Tab */}
          {activeTab === "params" && (
            <div className="space-y-8">
              {/* Параметры проекта (объединённый блок) */}
              {refs && (
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
                    return { userId: m.userId, fullName: u?.fullName || m.userId };
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
                      toast.error(e.message || "Не удалось сохранить");
                    }
                  }}
                />
              )}

              {/* Роли на проекте (из шаблона + кастомные) */}
              {refs && (
                <ProjectRolesSection
                  projectId={project.id}
                  projectType={projectType}
                  refs={refs}
                  roles={projectRoles}
                  onReload={loadProjectRoles}
                />
              )}

              {/* Участники проекта */}
              <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Участники проекта</h3>
                    <p className="text-sm text-slate-600">
                      Всего участников: {members.length}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Добавить участника
                  </button>
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
                  {members.map((member) => {
                    const user = memberUsers.get(member.userId);
                    if (!user) return null;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <UserAvatar user={toAvatarUser(user)} size="md" />
                          <div className="flex-1">
                            <p className="font-medium">{user.fullName}</p>
                            <p className="text-sm text-slate-600">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {member.roles.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {member.roles.map((roleId) => {
                                  const roleDef = projectRoles.find(r => r.id === roleId);
                                  return (
                                    <span
                                      key={roleId}
                                      className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded"
                                    >
                                      {roleDef?.name || roleId}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">Без роли</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedMember(member);
                                  setSelectedRoles([...member.roles]);
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Добавить участника</h2>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedUserId(null);
                  setNewMemberRoles([]);
                  setUserSearchQuery("");
                  setSearchResults([]);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Поиск пользователя *</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    placeholder="Введите имя или email..."
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
                          setUserSearchQuery(user.fullName);
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                      >
                        <UserAvatar user={toAvatarUser(user)} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{user.fullName}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUserId && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                    <span className="text-sm text-blue-700 flex-1">{userSearchQuery}</span>
                    <button
                      onClick={() => {
                        setSelectedUserId(null);
                        setUserSearchQuery("");
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
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

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setSelectedUserId(null);
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
                  disabled={!selectedUserId}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditMemberModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Изменить роли участника</h2>
              <button
                onClick={() => {
                  setShowEditMemberModal(false);
                  setSelectedMember(null);
                  setSelectedRoles([]);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Участник</label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  {memberUsers.get(selectedMember.userId) && (
                    <>
                      <UserAvatar
                        user={toAvatarUser(memberUsers.get(selectedMember.userId)!)}
                        size="sm"
                      />
                      <span className="font-medium">
                        {memberUsers.get(selectedMember.userId)!.fullName}
                      </span>
                    </>
                  )}
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

              <div className="flex gap-3 pt-4">
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
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Board Settings Modal */}
      {showBoardSettingsModal && selectedBoard && selectedBoard.id && (
        <BoardSettingsModal
          isOpen={showBoardSettingsModal}
          onClose={() => {
            setShowBoardSettingsModal(false);
            setSelectedBoard(null);
            loadBoards();
            loadBoardDetails();
          }}
          boardId={selectedBoard.id}
          boardName={selectedBoard.name}
          boardDescription={selectedBoard.description ?? ""}
          projectType={projectType}
          refs={refs}
          onBoardUpdated={() => {
            loadBoards();
            loadBoardDetails();
          }}
        />
      )}

      {/* Navigation blocker modal */}
      {showBlockerModal && blocker.state === "blocked" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-start gap-3 mb-4">
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
            <button
              onClick={() => { setShowBlockerModal(false); blocker.reset?.(); }}
              className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Вернуться к параметрам
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
