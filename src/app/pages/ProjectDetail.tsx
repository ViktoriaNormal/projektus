import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Users,
  CheckSquare,
  Settings,
  Activity,
  TrendingUp,
  Clock,
  Plus,
  X,
  Trash2,
  Layout,
  Edit,
  BarChart3,
  FileText,
  Menu,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  projects,
  users,
  tasks,
  sprints,
  projectMembers,
  projectRoles,
  boards,
  boardColumns,
  boardSwimlanes,
} from "../data/mockData";
import { UserAvatar } from "../components/UserAvatar";
import Board from "./Board";
import BoardSettingsModal from "../components/modals/BoardSettingsModal";
import ScrumBacklog from "./ScrumBacklog";
import KanbanMetrics from "./KanbanMetrics";
import ProjectOverview from "./ProjectOverview";

interface BoardTab {
  id: number;
  name: string;
  description: string;
  isDefault: boolean;
  order: number;
}

interface DraggableBoardTabProps {
  board: BoardTab;
  index: number;
  isActive: boolean;
  moveBoard: (dragIndex: number, hoverIndex: number) => void;
  onSelect: (id: number) => void;
  onEdit: (board: BoardTab) => void;
  onDelete: (id: number) => void;
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
        <div className="flex items-center gap-2">
          <span>{board.name}</span>
          {board.isDefault && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">по умолчанию</span>
          )}
        </div>
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

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = projects.find((p) => p.id === Number(id));
  
  const [activeTab, setActiveTab] = useState<"overview" | "boards" | "backlog" | "metrics" | "params">("overview");
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [showBoardSettingsModal, setShowBoardSettingsModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(3);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedBoard, setSelectedBoard] = useState<any>(null);
  const [boardTabs, setBoardTabs] = useState<BoardTab[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Проект не найден</h2>
          <p className="text-slate-500">Проект с ID {id} не существует</p>
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

  const owner = users.find((u) => u.id === project.ownerId);
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const projectSprints = sprints.filter((s) => s.projectId === project.id);
  const members = projectMembers.filter((pm) => pm.projectId === project.id);

  // Инициализация досок при монтировании
  useEffect(() => {
    const projectBoards = boards
      .filter((b) => b.projectId === project.id)
      .sort((a, b) => a.order - b.order);
    
    setBoardTabs(projectBoards);
    
    if (projectBoards.length > 0 && activeBoardId === null) {
      setActiveBoardId(projectBoards[0].id);
    }
  }, [project.id, activeBoardId]);

  const activeBoard = boardTabs.find((b) => b.id === activeBoardId);
  const boardCols = boardColumns.filter((c) => c.boardId === activeBoardId).sort((a, b) => a.order - b.order);
  const boardSwims = boardSwimlanes.filter((s) => s.boardId === activeBoardId).sort((a, b) => a.order - b.order);

  // Пользователи, которых можно добавить в проект
  const availableUsers = users.filter(
    (u) => u.isActive && !members.some((m) => m.userId === u.id)
  );

  const handleAddMember = () => {
    if (!selectedUserId) return;
    console.log("Добавление участника:", { userId: selectedUserId, roleId: selectedRoleId });
    setShowAddMemberModal(false);
    setSelectedUserId(null);
    setSelectedRoleId(3);
  };

  const handleEditMember = () => {
    if (!selectedMember) return;
    console.log("Изменение участника:", { userId: selectedMember.userId, roleId: selectedRoleId });
    setShowEditMemberModal(false);
    setSelectedMember(null);
    setSelectedRoleId(3);
  };

  const handleRemoveMember = (memberId: number) => {
    console.log("Удаление участника:", memberId);
  };

  const handleDeleteBoard = (boardId: number) => {
    if (confirm("Вы уверены, что хотите удалить эту доску?")) {
      console.log("Удаление доски:", boardId);
    }
  };

  const moveBoard = (dragIndex: number, hoverIndex: number) => {
    const draggedBoard = boardTabs[dragIndex];
    const newBoards = [...boardTabs];
    newBoards.splice(dragIndex, 1);
    newBoards.splice(hoverIndex, 0, draggedBoard);
    newBoards.forEach((board, idx) => (board.order = idx + 1));
    setBoardTabs(newBoards);
  };

  const tabs = [
    { id: "overview", label: "Обзор проекта", icon: BarChart3 },
    { id: "boards", label: "Доски задач", icon: Layout },
    ...(project.type === "scrum" ? [{ id: "backlog", label: "Бэклог и спринты", icon: FileText }] : []),
    ...(project.type === "kanban" ? [{ id: "metrics", label: "Метрики Kanban", icon: TrendingUp }] : []),
    { id: "params", label: "Параметры проекта", icon: Settings },
  ];

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
            {project.type === "scrum" ? "Scrum" : "Kanban"}
          </span>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded ${
              project.status === "Активный"
                ? "bg-green-100 text-green-700"
                : project.status === "Приостановлен"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {project.status}
          </span>
          <div className="ml-auto">
            <button
              onClick={() => setShowDeleteProject(!showDeleteProject)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title={showDeleteProject ? "Скрыть" : "Удалить проект"}
            >
              {showDeleteProject ? <ChevronUp size={20} className="text-slate-600" /> : <Trash2 size={20} className="text-red-600" />}
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
                onClick={() => {
                  console.log("Удаление проекта:", project.id);
                  navigate("/projects");
                }}
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

      {/* Tabs in two rows */}
      <div className="bg-white rounded-xl shadow-md border border-slate-100">
        {/* Desktop tabs */}
        <div className="border-b border-slate-200 p-4 hidden md:block">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
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
                        setActiveTab(tab.id as any);
                        setShowMobileMenu(false);
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
                        {project.type === "scrum" ? "Scrum" : "Kanban"}
                      </span>
                      <span
                        className={`px-3 py-1 text-sm font-semibold rounded ${
                          project.status === "Активный"
                            ? "bg-green-500/30 text-white"
                            : project.status === "Приостановлен"
                            ? "bg-yellow-500/30 text-white"
                            : "bg-slate-500/30 text-white"
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <h1 className="text-4xl font-bold mb-2">{project.name}</h1>
                    <p className="text-blue-100">{project.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-blue-100">
                  <div className="flex items-center gap-2">
                    {owner && <UserAvatar user={owner} size="sm" />}
                    <span>Ответственный: {owner?.fullName}</span>
                  </div>
                  <span>•</span>
                  <span>Создан: {new Date(project.createdAt).toLocaleDateString("ru-RU")}</span>
                </div>
              </div>

              {/* Overview Content */}
              <ProjectOverview projectId={project.id} projectType={project.type} />
            </div>
          )}

          {/* Boards Tab */}
          {activeTab === "boards" && (
            <div className="space-y-6 overflow-hidden">
              {/* Board Tabs */}
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
                      onClick={() => {
                        setSelectedBoard({
                          id: null,
                          name: "",
                          description: "",
                          isDefault: false,
                          order: boardTabs.length + 1
                        });
                        setShowBoardSettingsModal(true);
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
                      <span className="font-semibold">Колонок:</span> {boardCols.length}
                    </div>
                    {boardSwims.length > 0 && (
                      <div>
                        <span className="font-semibold">Дорожек:</span> {boardSwims.length}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Board Content */}
              {activeBoard ? (
                <Board boardId={activeBoardId} />
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                  <Layout size={48} className="mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600 mb-4">Нет досок задач</p>
                  <button
                    onClick={() => {
                      setSelectedBoard({
                        id: null,
                        name: "",
                        description: "",
                        isDefault: false,
                        order: 1
                      });
                      setShowBoardSettingsModal(true);
                    }}
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

          {/* Members Tab */}
          {activeTab === "members" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Участники проекта</h3>
                  <p className="text-sm text-slate-600">
                    Всего участников: {members.length}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  Добавить участника
                </button>
              </div>

              <div className="space-y-3">
                {members.map((member) => {
                  const user = users.find((u) => u.id === member.userId);
                  const role = projectRoles.find((r) => r.id === member.roleId);
                  if (!user) return null;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <UserAvatar user={user} size="md" />
                        <div className="flex-1">
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-sm text-slate-600">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-700">{role?.name}</p>
                          <p className="text-xs text-slate-500">
                            С {new Date(member.joinedAt).toLocaleDateString("ru-RU")}
                          </p>
                        </div>
                        {member.userId !== project.ownerId && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setSelectedRoleId(member.roleId);
                                setShowEditMemberModal(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Редактировать"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "params" && (
            <div className="space-y-6">
              {/* Настройки */}
              <div>
                <h3 className="text-lg font-bold mb-4">Настройки проекта</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Название проекта</label>
                    <input
                      type="text"
                      defaultValue={project.name}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Ключ проекта (неизменяемый)
                    </label>
                    <input
                      type="text"
                      value={project.key}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Тип проекта (неизменяемый)
                    </label>
                    <input
                      type="text"
                      value={project.type === "scrum" ? "Scrum" : "Kanban"}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Описание</label>
                    <textarea
                      defaultValue={project.description}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Ответственный</label>
                    <select
                      defaultValue={project.ownerId}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {users
                        .filter((u) => u.isActive)
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Статус проекта</label>
                    <select
                      defaultValue={project.status}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Активный">Активный</option>
                      <option value="Приостановлен">Приостановлен</option>
                      <option value="Архивирован">Архивирован</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Сохранить изменения
                    </button>
                  </div>
                </div>
              </div>

              {/* Участники проекта */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Участники проекта</h3>
                    <p className="text-sm text-slate-600">
                      Всего участников: {members.length}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Добавить участника
                  </button>
                </div>

                <div className="space-y-3">
                  {members.map((member) => {
                    const user = users.find((u) => u.id === member.userId);
                    const role = projectRoles.find((r) => r.id === member.roleId);
                    if (!user) return null;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <UserAvatar user={user} size="md" />
                          <div className="flex-1">
                            <p className="font-medium">{user.fullName}</p>
                            <p className="text-sm text-slate-600">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-700">{role?.name}</p>
                            <p className="text-xs text-slate-500">
                              С {new Date(member.joinedAt).toLocaleDateString("ru-RU")}
                            </p>
                          </div>
                          {member.userId !== project.ownerId && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedMember(member);
                                  setSelectedRoleId(member.roleId);
                                  setShowEditMemberModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Редактировать"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Удалить"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
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

      {/* Modals */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Добавить участника</h2>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedUserId(null);
                  setSelectedRoleId(3);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Пользователь *</label>
                <select
                  value={selectedUserId || ""}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Выберите пользователя</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Роль в проекте *</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {projectRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setSelectedUserId(null);
                    setSelectedRoleId(3);
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

      {showEditMemberModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Изменить участника</h2>
              <button
                onClick={() => {
                  setShowEditMemberModal(false);
                  setSelectedMember(null);
                  setSelectedRoleId(3);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Пользователь *</label>
                <select
                  value={selectedMember.userId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Выберите пользователя</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Роль в проекте *</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {projectRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditMemberModal(false);
                    setSelectedMember(null);
                    setSelectedRoleId(3);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Отмена
                </button>
                <button
                  onClick={handleEditMember}
                  disabled={!selectedUserId}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBoardSettingsModal && selectedBoard && (() => {
        // Генерируем доступные значения для дорожек на основе задач
        const swimlaneGroupBy = "priority"; // В реальном приложении это берется из настроек доски
        const availableSwimlaneValues: string[] = [];
        
        if (swimlaneGroupBy === "priority") {
          const priorities = Array.from(new Set(tasks.filter(t => t.projectId === project?.id).map(t => t.priority)));
          availableSwimlaneValues.push(...priorities);
        } else if (swimlaneGroupBy === "assignee") {
          const assigneeIds = Array.from(new Set(tasks.filter(t => t.projectId === project?.id && t.assigneeId).map(t => t.assigneeId)));
          availableSwimlaneValues.push(...assigneeIds.map(id => users.find(u => u.id === id)?.fullName || ""));
        } else if (swimlaneGroupBy === "type") {
          const statuses = Array.from(new Set(tasks.filter(t => t.projectId === project?.id).map(t => t.status)));
          availableSwimlaneValues.push(...statuses);
        } else if (swimlaneGroupBy === "tags") {
          const allTags = tasks.filter(t => t.projectId === project?.id).flatMap(t => t.tags || []);
          const uniqueTags = Array.from(new Set(allTags));
          availableSwimlaneValues.push(...uniqueTags);
        }
        
        // Генерируем начальные дорожки (в реальном приложении это берется из настроек доски)
        const initialSwimlanes = availableSwimlaneValues.map((value, index) => ({
          id: index + 1,
          name: value,
          value: value,
          wipLimit: null,
          order: index + 1,
        }));
        
        return (
          <BoardSettingsModal
            isOpen={showBoardSettingsModal}
            onClose={() => {
              setShowBoardSettingsModal(false);
              setSelectedBoard(null);
            }}
            boardName={selectedBoard.name}
            boardDescription={selectedBoard.description}
            columns={boardCols}
            swimlaneGroupBy={swimlaneGroupBy}
            swimlanes={initialSwimlanes}
            availableSwimlaneValues={availableSwimlaneValues}
            onSave={(cols, newSwimlaneGroupBy, swimlanes, selectedSystemFields, customFields, boardName, boardDescription) => {
              console.log("Saving board settings:", { 
                columns: cols, 
                swimlaneGroupBy: newSwimlaneGroupBy,
                swimlanes,
                taskTemplate: {
                  systemFields: selectedSystemFields,
                  customFields
                },
                boardName,
                boardDescription
              });
              setShowBoardSettingsModal(false);
              setSelectedBoard(null);
            }}
          />
        );
      })()}
    </div>
  );
}