import { useState } from "react";
import { Plus, Play, Pause, Target, Calendar, Clock, Edit, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";
import { tasks, sprints, users } from "../data/mockData";
import { UserAvatar } from "../components/UserAvatar";
import { Link } from "react-router";

interface Sprint {
  id: number;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: "Активный" | "Завершен" | "Запланирован";
  projectId: number;
}

interface Task {
  id: number;
  key: string;
  title: string;
  description: string;
  priority: string;
  assigneeId: number | null;
  storyPoints?: number;
  status: string;
  sprintId?: number | null;
  projectId: number;
  order: number;
}

interface ScrumBacklogProps {
  projectId: number;
}

export default function ScrumBacklog({ projectId }: ScrumBacklogProps) {
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [customDuration, setCustomDuration] = useState(false);
  const [dragOverSprintId, setDragOverSprintId] = useState<number | null>(null);

  const projectSprints = sprints.filter((s) => s.projectId === projectId);
  const projectTasks = tasks.filter((t) => t.projectId === projectId);

  // Задачи бэклога продукта (без спринта)
  const backlogTasks = projectTasks.filter((t) => !t.sprintId).sort((a, b) => a.order - b.order);

  const getSprintTasks = (sprintId: number) => {
    return projectTasks.filter((t) => t.sprintId === sprintId).sort((a, b) => a.order - b.order);
  };

  const calculateSprintProgress = (sprintId: number) => {
    const sprintTasks = getSprintTasks(sprintId);
    if (sprintTasks.length === 0) return 0;
    const completedTasks = sprintTasks.filter((t) => t.status === "Выполнено").length;
    return Math.round((completedTasks / sprintTasks.length) * 100);
  };

  const calculateSprintStoryPoints = (sprintId: number) => {
    const sprintTasks = getSprintTasks(sprintId);
    const total = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completed = sprintTasks
      .filter((t) => t.status === "Выполнено")
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    return { total, completed };
  };

  const handleMoveTaskUp = (task: Task) => {
    console.log("Переместить задачу вверх:", task.id);
  };

  const handleMoveTaskDown = (task: Task) => {
    console.log("Переместить задачу вниз:", task.id);
  };

  const handleStartSprint = (sprintId: number) => {
    console.log("Запустить спринт:", sprintId);
  };

  const handleCompleteSprint = (sprintId: number) => {
    console.log("Завершить спринт:", sprintId);
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTask(null);
    setDragOverSprintId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (sprintId: number) => {
    setDragOverSprintId(sprintId);
  };

  const handleDragLeave = () => {
    setDragOverSprintId(null);
  };

  const handleDrop = (e: React.DragEvent, sprintId: number) => {
    e.preventDefault();
    
    if (draggedTask) {
      console.log(`✅ Перемещение задачи ${draggedTask.key} (ID: ${draggedTask.id}) в спринт ID: ${sprintId}`);
      alert(`Задача "${draggedTask.title}" перемещена в спринт!`);
      // Здесь будет логика обновления задачи в реальном приложении
      setDraggedTask(null);
      setDragOverSprintId(null);
    }
  };

  const renderTask = (task: Task, showMoveButtons: boolean = true, isDraggable: boolean = false) => {
    const assignee = task.assigneeId ? users.find((u) => u.id === task.assigneeId) : null;
    const priorityColors = {
      Критический: "bg-red-100 text-red-700 border-red-300",
      Высокий: "bg-orange-100 text-orange-700 border-orange-300",
      Средний: "bg-yellow-100 text-yellow-700 border-yellow-300",
      Низкий: "bg-green-100 text-green-700 border-green-300",
    };

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
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded border ${
                priorityColors[task.priority as keyof typeof priorityColors]
              }`}
            >
              {task.priority}
            </span>
            {task.storyPoints && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded">
                {task.storyPoints} SP
              </span>
            )}
          </div>
          <Link to={`/tasks/${task.id}`} className="block">
            <p className="font-medium hover:text-blue-600">{task.title}</p>
          </Link>
          <p className="text-sm text-slate-600 mt-1">{task.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {assignee ? (
            <UserAvatar user={assignee} size="sm" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-xs text-slate-500">?</span>
            </div>
          )}

          {showMoveButtons && (
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleMoveTaskUp(task)}
                className="p-1 hover:bg-slate-100 rounded"
                title="Переместить вверх"
              >
                <ArrowUp size={14} className="text-slate-600" />
              </button>
              <button
                onClick={() => handleMoveTaskDown(task)}
                className="p-1 hover:bg-slate-100 rounded"
                title="Переместить вниз"
              >
                <ArrowDown size={14} className="text-slate-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

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
          onClick={() => {
            setSelectedSprint(null);
            setCustomDuration(false);
            setShowSprintModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Создать спринт
        </button>
      </div>

      {/* Main Board Layout: Backlog + Sprint Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Product Backlog Column */}
        <div className="flex-shrink-0 w-96">
          <div className="bg-white border-2 border-purple-200 rounded-xl shadow-sm h-full flex flex-col max-h-[800px]">
            <div className="p-4 border-b border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl flex-shrink-0">
              <div className="mb-3">
                <h3 className="text-lg font-bold text-purple-900">Бэклог продукта</h3>
                <p className="text-sm text-purple-700 mt-1">
                  {backlogTasks.length} задач · {backlogTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)} SP
                </p>
              </div>
              <button
                onClick={() => console.log("Добавить задачу в бэклог")}
                className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus size={16} />
                Добавить задачу
              </button>
            </div>

            <div className="p-3 overflow-y-auto flex-1">
              <div className="space-y-2">
                {backlogTasks.length > 0 ? (
                  backlogTasks.map((task) => renderTask(task, true, true))
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
        {projectSprints
          .filter((s) => s.status !== "Завершен")
          .map((sprint) => {
            const sprintTasks = getSprintTasks(sprint.id);
            const progress = calculateSprintProgress(sprint.id);
            const { total: totalSP, completed: completedSP } = calculateSprintStoryPoints(sprint.id);
            const isActive = sprint.status === "Активный";

            return (
              <div key={sprint.id} className="flex-shrink-0 w-96">
                <div
                  className={`bg-white border-2 rounded-xl shadow-sm h-full flex flex-col max-h-[800px] transition-all ${
                    dragOverSprintId === sprint.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-blue-200"
                  }`}
                  onDragOver={handleDragOver}
                  onDragEnter={() => handleDragEnter(sprint.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, sprint.id)}
                >
                  <div className="p-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl flex-shrink-0">
                    {/* Sprint Header */}
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
                            {sprint.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            setSelectedSprint(sprint);
                            setCustomDuration(sprint.duration === 0);
                            setShowSprintModal(true);
                          }}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors"
                          title="Редактировать спринт"
                        >
                          <Edit size={16} className="text-slate-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Вы уверены, что хотите удалить этот спринт?")) {
                              console.log("Удалить спринт:", sprint.id);
                            }
                          }}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                          title="Удалить спринт"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </div>

                    {/* Sprint Details */}
                    <div className="space-y-1 text-xs text-slate-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Target size={12} />
                        <span className="truncate">{sprint.goal}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>
                          {new Date(sprint.startDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })} -{" "}
                          {new Date(sprint.endDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{sprint.duration} нед.</span>
                      </div>
                    </div>

                    {/* Sprint Progress */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Прогресс</span>
                        <span className="font-semibold">{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-700">
                        <span><span className="font-semibold">{sprintTasks.length}</span> задач</span>
                        <span>
                          <span className="font-semibold">{completedSP} / {totalSP}</span> SP
                        </span>
                      </div>
                    </div>

                    {/* Sprint Actions */}
                    <div className="flex items-center gap-2">
                      {!isActive && sprint.status === "Запланирован" && (
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
                      {sprintTasks.length > 0 ? (
                        sprintTasks.map((task) => renderTask(task, false, false))
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <p className="text-sm">Нет задач</p>
                          <p className="text-xs mt-1">Перетащит из бэклога</p>
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
      {projectSprints.filter((s) => s.status === "Завершен").length > 0 && (
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-bold mb-4">Завершенные спринты</h3>
          <div className="space-y-3">
            {projectSprints
              .filter((s) => s.status === "Завершен")
              .map((sprint) => {
                const sprintTasks = getSprintTasks(sprint.id);
                const { total: totalSP, completed: completedSP } = calculateSprintStoryPoints(sprint.id);

                return (
                  <div
                    key={sprint.id}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <div>
                      <h4 className="font-semibold">{sprint.name}</h4>
                      <p className="text-sm text-slate-600">
                        {new Date(sprint.startDate).toLocaleDateString("ru-RU")} -{" "}
                        {new Date(sprint.endDate).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="font-semibold">{sprintTasks.length}</span> задач
                      </div>
                      <div>
                        <span className="font-semibold">
                          {completedSP} / {totalSP}
                        </span>{" "}
                        SP
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 font-medium">
                        Подробнее
                      </button>
                    </div>
                  </div>
                );
              })}
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
                  setCustomDuration(false);
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
                  defaultValue={selectedSprint?.name}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Спринт 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Цель спринта *</label>
                <textarea
                  defaultValue={selectedSprint?.goal}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Основная цель, которую нужно достичь в этом спринте..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Длительность *</label>
                <select
                  defaultValue={selectedSprint?.duration || 2}
                  onChange={(e) => setCustomDuration(e.target.value === "0")}
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
                  defaultValue={selectedSprint?.startDate}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {customDuration && (
                <div>
                  <label className="block text-sm font-medium mb-2">Дата окончания *</label>
                  <input
                    type="date"
                    defaultValue={selectedSprint?.endDate}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowSprintModal(false);
                    setSelectedSprint(null);
                    setCustomDuration(false);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    console.log("Сохранение спринта");
                    setShowSprintModal(false);
                    setSelectedSprint(null);
                    setCustomDuration(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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