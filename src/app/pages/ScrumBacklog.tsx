import { useState, useEffect, useCallback } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { Plus, Play, Pause, Target, Calendar, Clock, Edit, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  getProjectSprints,
  createSprint,
  updateSprint,
  deleteSprint as deleteSprintApi,
  startSprint,
  completeSprint,
  getProductBacklog,
  moveTasksToSprint,
  type SprintResponse,
} from "../api/sprints";
import { searchTasks, type TaskResponse } from "../api/tasks";
import { getUser, type UserProfileResponse } from "../api/users";

// ── Helpers ─────────────────────────────────────────────────

const SPRINT_STATUS_MAP: Record<string, string> = {
  planned: "Запланирован",
  active: "Активный",
  completed: "Завершён",
};

function toAvatarUser(u: UserProfileResponse) {
  return { fullName: u.fullName, avatarUrl: u.avatarUrl ?? undefined };
}

interface ScrumBacklogProps {
  projectId: string;
}

export default function ScrumBacklog({ projectId }: ScrumBacklogProps) {
  // Data state
  const [sprints, setSprints] = useState<SprintResponse[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<TaskResponse[]>([]);
  const [sprintTasks, setSprintTasks] = useState<Map<string, TaskResponse[]>>(new Map());
  const [userCache, setUserCache] = useState<Map<string, UserProfileResponse>>(new Map());
  const [loading, setLoading] = useState(true);

  // UI state
  const [showSprintModal, setShowSprintModal] = useState(false);
  useBodyScrollLock(showSprintModal);
  const [selectedSprint, setSelectedSprint] = useState<SprintResponse | null>(null);
  const [draggedTask, setDraggedTask] = useState<TaskResponse | null>(null);
  const [customDuration, setCustomDuration] = useState(false);
  const [dragOverSprintId, setDragOverSprintId] = useState<string | null>(null);

  // Sprint form
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [sprintStartDate, setSprintStartDate] = useState("");
  const [sprintEndDate, setSprintEndDate] = useState("");
  const [sprintDuration, setSprintDuration] = useState(2);

  // ── Data Loading ────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sprintsData, backlog] = await Promise.all([
        getProjectSprints(projectId),
        getProductBacklog(projectId),
      ]);
      setSprints(sprintsData);
      setBacklogTasks(backlog);

      // Load tasks for each non-completed sprint
      const taskMap = new Map<string, TaskResponse[]>();
      const allTasks = await searchTasks({ projectId });

      // Group tasks by sprint (tasks that are not in backlog have a columnId which maps to a sprint)
      // For now, we use the product backlog endpoint for backlog and search tasks for sprint tasks
      // The backlog tasks are those returned by getProductBacklog
      const backlogTaskIds = new Set(backlog.map((t) => t.id));
      const nonBacklogTasks = allTasks.filter((t) => !backlogTaskIds.has(t.id));

      // Map sprint tasks - tasks in sprints are those not in product backlog
      // Since API doesn't directly link tasks to sprints, we'll show all project tasks
      // that are not in the product backlog as "sprint tasks"
      for (const sprint of sprintsData) {
        taskMap.set(sprint.id, []);
      }

      setSprints(sprintsData);
      setSprintTasks(taskMap);

      // Cache user profiles for executors
      const userIds = new Set<string>();
      [...backlog, ...nonBacklogTasks].forEach((t) => {
        if (t.executorId) userIds.add(t.executorId);
      });
      const newCache = new Map(userCache);
      await Promise.allSettled(
        [...userIds].filter((id) => !newCache.has(id)).map(async (id) => {
          try {
            const u = await getUser(id);
            newCache.set(id, u);
          } catch { /* skip */ }
        })
      );
      setUserCache(newCache);
    } catch (e: any) {
      toast.error("Ошибка загрузки данных бэклога");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Sprint form helpers ─────────────────────────────────────

  const openSprintModal = (sprint: SprintResponse | null) => {
    setSelectedSprint(sprint);
    if (sprint) {
      setSprintName(sprint.name);
      setSprintGoal(sprint.goal ?? "");
      setSprintStartDate(sprint.startDate.slice(0, 10));
      setSprintEndDate(sprint.endDate.slice(0, 10));
      setCustomDuration(true);
    } else {
      setSprintName("");
      setSprintGoal("");
      setSprintStartDate("");
      setSprintEndDate("");
      setSprintDuration(2);
      setCustomDuration(false);
    }
    setShowSprintModal(true);
  };

  const handleSaveSprint = async () => {
    if (!sprintName || !sprintStartDate) return;

    const endDate = customDuration
      ? sprintEndDate
      : new Date(new Date(sprintStartDate).getTime() + sprintDuration * 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

    try {
      if (selectedSprint) {
        await updateSprint(selectedSprint.id, {
          name: sprintName,
          goal: sprintGoal || null,
          startDate: sprintStartDate,
          endDate: endDate,
        });
        toast.success("Спринт обновлён");
      } else {
        await createSprint(projectId, {
          name: sprintName,
          goal: sprintGoal || null,
          startDate: sprintStartDate,
          endDate: endDate,
        });
        toast.success("Спринт создан");
      }
      setShowSprintModal(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Ошибка сохранения спринта");
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот спринт?")) return;
    try {
      await deleteSprintApi(sprintId);
      toast.success("Спринт удалён");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Ошибка удаления спринта");
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    try {
      await startSprint(sprintId);
      toast.success("Спринт запущен");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Ошибка запуска спринта");
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    try {
      await completeSprint(sprintId);
      toast.success("Спринт завершён");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Ошибка завершения спринта");
    }
  };

  // ── Drag & Drop ─────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, task: TaskResponse) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverSprintId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, sprintId: string) => {
    e.preventDefault();
    if (!draggedTask) return;

    try {
      await moveTasksToSprint(projectId, {
        sprintId,
        taskIds: [draggedTask.id],
      });
      toast.success(`Задача ${draggedTask.key} перемещена в спринт`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Ошибка перемещения задачи");
    }
    setDraggedTask(null);
    setDragOverSprintId(null);
  };

  // ── Render task card ────────────────────────────────────────

  const renderTask = (task: TaskResponse, isDraggable: boolean = false) => {
    const executor = task.executorId ? userCache.get(task.executorId) : null;

    return (
      <div
        key={task.id}
        draggable={isDraggable}
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
        className={`flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors group ${
          isDraggable ? "cursor-move" : ""
        }`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Link
              to={`/tasks/${task.id}`}
              className="text-xs font-mono text-slate-500 font-semibold hover:text-blue-600"
            >
              {task.key}
            </Link>
          </div>
          <Link to={`/tasks/${task.id}`} className="block">
            <p className="font-medium hover:text-blue-600">{task.name}</p>
          </Link>
          {task.description && (
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {executor ? (
            <UserAvatar user={toAvatarUser(executor)} size="sm" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-xs text-slate-500">?</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Main Render ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Бэклог и Спринты</h2>
          <p className="text-sm text-slate-600 mt-1">
            Управление бэклогом продукта и спринтами
          </p>
        </div>
        <button
          onClick={() => openSprintModal(null)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Создать спринт
        </button>
      </div>

      {/* Main Board Layout */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Product Backlog Column */}
        <div className="flex-shrink-0 w-96">
          <div className="bg-white border-2 border-purple-200 rounded-xl shadow-sm h-full flex flex-col max-h-[800px]">
            <div className="p-4 border-b border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl flex-shrink-0">
              <div className="mb-3">
                <h3 className="text-lg font-bold text-purple-900">Бэклог продукта</h3>
                <p className="text-sm text-purple-700 mt-1">
                  {backlogTasks.length} задач
                </p>
              </div>
            </div>

            <div className="p-3 overflow-y-auto flex-1">
              <div className="space-y-2">
                {backlogTasks.length > 0 ? (
                  backlogTasks.map((task) => renderTask(task, true))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>Бэклог пуст</p>
                    <p className="text-sm mt-1">Создайте первую задачу</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sprint Columns */}
        {sprints
          .filter((s) => s.status !== "completed")
          .map((sprint) => {
            const tasks = sprintTasks.get(sprint.id) ?? [];
            const isActive = sprint.status === "active";
            const statusLabel = SPRINT_STATUS_MAP[sprint.status] ?? sprint.status;

            return (
              <div key={sprint.id} className="flex-shrink-0 w-96">
                <div
                  className={`bg-white border-2 rounded-xl shadow-sm h-full flex flex-col max-h-[800px] transition-all ${
                    dragOverSprintId === sprint.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-blue-200"
                  }`}
                  onDragOver={handleDragOver}
                  onDragEnter={() => setDragOverSprintId(sprint.id)}
                  onDragLeave={() => setDragOverSprintId(null)}
                  onDrop={(e) => handleDrop(e, sprint.id)}
                >
                  <div className="p-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl flex-shrink-0">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold truncate">{sprint.name}</h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded flex-shrink-0 ${
                              isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openSprintModal(sprint)}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors"
                          title="Редактировать спринт"
                        >
                          <Edit size={16} className="text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteSprint(sprint.id)}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                          title="Удалить спринт"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 mb-3">
                      {sprint.goal && (
                        <div className="flex items-center gap-1">
                          <Target size={12} />
                          <span className="truncate">{sprint.goal}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>
                          {new Date(sprint.startDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })} –{" "}
                          {new Date(sprint.endDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {sprint.status === "planned" && (
                        <button
                          onClick={() => handleStartSprint(sprint.id)}
                          className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 text-sm"
                        >
                          <Play size={14} />
                          Запустить
                        </button>
                      )}
                      {isActive && (
                        <button
                          onClick={() => handleCompleteSprint(sprint.id)}
                          className="flex-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-1.5 text-sm"
                        >
                          <Pause size={14} />
                          Завершить
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 overflow-y-auto flex-1">
                    <div className="space-y-2">
                      {tasks.length > 0 ? (
                        tasks.map((task) => renderTask(task, false))
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <p className="text-sm">Нет задач</p>
                          <p className="text-xs mt-1">Перетащите из бэклога</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Completed Sprints */}
      {sprints.filter((s) => s.status === "completed").length > 0 && (
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-bold mb-4">Завершённые спринты</h3>
          <div className="space-y-3">
            {sprints
              .filter((s) => s.status === "completed")
              .map((sprint) => (
                <div
                  key={sprint.id}
                  className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <div>
                    <h4 className="font-semibold">{sprint.name}</h4>
                    <p className="text-sm text-slate-600">
                      {new Date(sprint.startDate).toLocaleDateString("ru-RU")} –{" "}
                      {new Date(sprint.endDate).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  {sprint.goal && (
                    <p className="text-sm text-slate-500 max-w-sm truncate">{sprint.goal}</p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Sprint Modal */}
      {showSprintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {selectedSprint ? "Редактировать спринт" : "Создать спринт"}
              </h2>
              <button
                onClick={() => {
                  setShowSprintModal(false);
                  setSelectedSprint(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название спринта *</label>
                <input
                  type="text"
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Спринт 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Цель спринта</label>
                <textarea
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Основная цель спринта..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Длительность *</label>
                <select
                  value={customDuration ? 0 : sprintDuration}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCustomDuration(val === 0);
                    if (val > 0) setSprintDuration(val);
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 неделя</option>
                  <option value={2}>2 недели</option>
                  <option value={3}>3 недели</option>
                  <option value={4}>4 недели</option>
                  <option value={0}>Своя длительность</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Дата начала *</label>
                <input
                  type="date"
                  value={sprintStartDate}
                  onChange={(e) => setSprintStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {customDuration && (
                <div>
                  <label className="block text-sm font-medium mb-2">Дата окончания *</label>
                  <input
                    type="date"
                    value={sprintEndDate}
                    onChange={(e) => setSprintEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowSprintModal(false);
                    setSelectedSprint(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveSprint}
                  disabled={!sprintName || !sprintStartDate}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedSprint ? "Сохранить" : "Создать"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
