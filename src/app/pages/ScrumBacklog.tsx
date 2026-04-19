import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Play, CheckCircle2, Target, Calendar, AlarmClock, Edit, Trash2, X, AlertCircle, ChevronDown, Check, User } from "lucide-react";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Select, SelectOption } from "../components/ui/Select";
import { formatDate } from "../lib/format";
import { toastError } from "../lib/errors";
import { UserAvatar } from "../components/UserAvatar";
import { BacklogTaskCard } from "../components/scrum-backlog/BacklogTaskCard";
import { CompletedSprintRow } from "../components/scrum-backlog/CompletedSprintRow";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  getProjectSprints,
  createSprint,
  updateSprint,
  deleteSprint as deleteSprintApi,
  startSprint,
  completeSprint,
  getProductBacklog,
  addTaskToBacklog,
  moveTasksToSprint,
  getSprintTasks,
  type SprintResponse,
} from "../api/sprints";
import { type TaskResponse } from "../api/tasks";
import { getUser, type UserProfileResponse } from "../api/users";
import { getProjectBoards, type BoardResponse } from "../api/boards";
import { getProject, updateProject, type ProjectResponse } from "../api/projects";

// ── Helpers ─────────────────────────────────────────────────

const SPRINT_STATUS_MAP: Record<string, string> = {
  planned: "Запланирован",
  active: "Активный",
  completed: "Завершён",
};

function toAvatarUser(u: UserProfileResponse) {
  return { fullName: u.fullName, avatarUrl: u.avatarUrl ?? undefined };
}

function groupTasksByBoard(tasks: TaskResponse[], boards: BoardResponse[]): { board: BoardResponse; tasks: TaskResponse[] }[] {
  const boardMap = new Map<string, TaskResponse[]>();
  for (const t of tasks) {
    const list = boardMap.get(t.boardId) ?? [];
    list.push(t);
    boardMap.set(t.boardId, list);
  }
  // Return groups in board order, only boards that have tasks
  return boards
    .filter(b => boardMap.has(b.id))
    .map(b => ({ board: b, tasks: boardMap.get(b.id)! }));
}

interface ScrumBacklogProps {
  projectId: string;
  canEdit?: boolean;
}

export default function ScrumBacklog({ projectId, canEdit = true }: ScrumBacklogProps) {
  const navigate = useNavigate();

  // Data state
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [sprints, setSprints] = useState<SprintResponse[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<TaskResponse[]>([]);
  const [sprintTasks, setSprintTasks] = useState<Map<string, TaskResponse[]>>(new Map());
  const [userCache, setUserCache] = useState<Map<string, UserProfileResponse>>(new Map());
  const [boards, setBoards] = useState<BoardResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [deleteSprintTarget, setDeleteSprintTarget] = useState<string | null>(null);
  const [selectedSprint, setSelectedSprint] = useState<SprintResponse | null>(null);
  const [draggedTask, setDraggedTask] = useState<TaskResponse | null>(null);
  const [dragSource, setDragSource] = useState<"backlog" | string>("backlog"); // "backlog" or sprintId
  const [dragOverSprintId, setDragOverSprintId] = useState<string | null>(null);
  const [dragOverBacklog, setDragOverBacklog] = useState(false);

  // Sprint form
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [sprintStartDate, setSprintStartDate] = useState("");

  // Duration combobox
  const [durationOpen, setDurationOpen] = useState(false);
  const [durationInput, setDurationInput] = useState("");
  const durationRef = useRef<HTMLDivElement>(null);

  // Incomplete tasks setting (from project)
  const incompleteTasksAction = project?.incompleteTasksAction || "backlog";
  const handleSetIncompleteTasksAction = async (value: "backlog" | "next_sprint") => {
    setProject(prev => prev ? { ...prev, incompleteTasksAction: value } : prev);
    try {
      await updateProject(projectId, { incompleteTasksAction: value });
    } catch (e: any) {
      toastError(e, "Ошибка сохранения настройки");
      setProject(prev => prev ? { ...prev, incompleteTasksAction: incompleteTasksAction } : prev);
    }
  };

  // Completed sprint expansion
  const [expandedCompletedSprints, setExpandedCompletedSprints] = useState<Set<string>>(new Set());
  const [completedSprintTasks, setCompletedSprintTasks] = useState<Map<string, TaskResponse[]>>(new Map());

  // ── Data Loading ────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [proj, sprintsData, backlog] = await Promise.all([
        getProject(projectId),
        getProjectSprints(projectId),
        getProductBacklog(projectId),
      ]);
      setProject(proj);
      setSprints(sprintsData);
      setBacklogTasks(backlog);

      // Load tasks per sprint (active + planned) using the new endpoint
      const nonCompletedSprints = sprintsData.filter(s => s.status !== "completed");
      const taskMap = new Map<string, TaskResponse[]>();
      await Promise.allSettled(
        nonCompletedSprints.map(async (sprint) => {
          try {
            const tasks = await getSprintTasks(sprint.id);
            taskMap.set(sprint.id, tasks);
          } catch {
            taskMap.set(sprint.id, []);
          }
        })
      );
      setSprintTasks(taskMap);

      // Load boards
      try {
        const projectBoards = await getProjectBoards(projectId);
        setBoards(projectBoards.sort((a, b) => a.order - b.order));
      } catch { /**/ }

      // Cache user profiles
      const userIds = new Set<string>();
      const allLoadedTasks = [...backlog, ...[...taskMap.values()].flat()];
      allLoadedTasks.forEach(t => { if (t.executorUserId) userIds.add(t.executorUserId); });
      const newCache = new Map(userCache);
      await Promise.allSettled(
        [...userIds].filter(id => !newCache.has(id)).map(async (id) => {
          try { const u = await getUser(id); newCache.set(id, u); } catch { /**/ }
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

  // ── Sprint handlers ────────────────────────────────────────

  const projectDuration = project?.sprintDurationWeeks || 2;

  const handleSetProjectDuration = async (weeks: number) => {
    try {
      await updateProject(projectId, { sprintDurationWeeks: weeks });
      setProject(prev => prev ? { ...prev, sprintDurationWeeks: weeks } : prev);
    } catch (e: any) { toastError(e, "Ошибка"); }
  };

  const commitDurationInput = useCallback(() => {
    setDurationOpen(false);
    setDurationInput(prev => {
      const val = parseInt(prev, 10);
      if (val >= 1 && val <= 52) handleSetProjectDuration(val);
      return "";
    });
  }, [projectId]);

  // Close duration dropdown on outside click — also saves custom input
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (durationRef.current && !durationRef.current.contains(e.target as Node)) {
        commitDurationInput();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [commitDurationInput]);

  const openSprintModal = (sprint: SprintResponse | null) => {
    setSelectedSprint(sprint);
    if (sprint) {
      setSprintName(sprint.name);
      setSprintGoal(sprint.goal ?? "");
      setSprintStartDate(sprint.startDate.slice(0, 10));
    } else {
      setSprintName("");
      setSprintGoal("");
      // Default start date: day after the latest sprint end date, or today
      const nonCompleted = sprints.filter(s => s.status !== "completed");
      if (nonCompleted.length > 0) {
        const latestEnd = nonCompleted.reduce((max, s) => {
          const d = new Date(s.endDate);
          return d > max ? d : max;
        }, new Date(0));
        latestEnd.setDate(latestEnd.getDate() + 1);
        setSprintStartDate(latestEnd.toISOString().slice(0, 10));
      } else {
        setSprintStartDate(new Date().toISOString().slice(0, 10));
      }
    }
    setShowSprintModal(true);
  };

  const handleSaveSprint = async () => {
    if (!sprintName || !sprintStartDate) return;

    // Validate: no overlap with existing sprints
    const newStart = new Date(sprintStartDate);
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + projectDuration * 7);

    const otherSprints = sprints.filter(s => s.status !== "completed" && s.id !== selectedSprint?.id);
    for (const s of otherSprints) {
      const sStart = new Date(s.startDate);
      const sEnd = new Date(s.endDate);
      // Overlap: newStart <= sEnd AND newEnd >= sStart (даты не могут совпадать)
      if (newStart <= sEnd && newEnd >= sStart) {
        toast.error(`Даты пересекаются со спринтом «${s.name}» (${formatDate(sStart, "dmy")} – ${formatDate(sEnd, "dmy")})`);
        return;
      }
    }

    try {
      if (selectedSprint) {
        await updateSprint(selectedSprint.id, {
          name: sprintName,
          goal: sprintGoal || null,
          startDate: sprintStartDate,
          durationWeeks: projectDuration,
        });
      } else {
        await createSprint(projectId, {
          name: sprintName,
          goal: sprintGoal || null,
          startDate: sprintStartDate,
          durationWeeks: projectDuration,
        });
      }
      setShowSprintModal(false);
      refreshData();
    } catch (e: any) {
      toastError(e, "Ошибка сохранения спринта");
    }
  };

  const handleDeleteSprint = (sprintId: string) => {
    setDeleteSprintTarget(sprintId);
  };

  const confirmDeleteSprint = async () => {
    if (!deleteSprintTarget) return;
    try {
      await deleteSprintApi(deleteSprintTarget);
      refreshData();
    } catch (e: any) {
      toastError(e, "Ошибка удаления спринта");
    } finally {
      setDeleteSprintTarget(null);
    }
  };

  const refreshData = useCallback(async () => {
    try {
      const [proj, sprintsData, backlog] = await Promise.all([
        getProject(projectId),
        getProjectSprints(projectId),
        getProductBacklog(projectId),
      ]);
      setProject(proj);
      setSprints(sprintsData);
      setBacklogTasks(backlog);

      const active = sprintsData.filter(s => s.status !== "completed");
      const taskMap = new Map<string, TaskResponse[]>();
      await Promise.allSettled(
        active.map(async (sprint) => {
          try {
            const tasks = await getSprintTasks(sprint.id);
            taskMap.set(sprint.id, tasks);
          } catch {
            taskMap.set(sprint.id, []);
          }
        })
      );
      setSprintTasks(taskMap);

      const userIds = new Set<string>();
      const allLoadedTasks = [...backlog, ...[...taskMap.values()].flat()];
      allLoadedTasks.forEach(t => { if (t.executorUserId) userIds.add(t.executorUserId); });
      const newCache = new Map(userCache);
      await Promise.allSettled(
        [...userIds].filter(id => !newCache.has(id)).map(async (id) => {
          try { const u = await getUser(id); newCache.set(id, u); } catch { /**/ }
        })
      );
      setUserCache(newCache);
    } catch { /**/ }
  }, [projectId]);

  const handleStartSprint = async (sprintId: string) => {
    // Optimistic: mark as active
    setSprints(prev => prev.map(s => s.id === sprintId ? { ...s, status: "active" as const } : s));
    try {
      await startSprint(sprintId);
      refreshData();
    } catch (e: any) {
      toastError(e, "Ошибка запуска спринта");
      refreshData();
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    // Validate: if "next_sprint" is selected, there must be a planned sprint to move tasks to
    if (incompleteTasksAction === "next_sprint") {
      const currentSprint = sprints.find(s => s.id === sprintId);
      const hasNextSprint = sprints.some(s =>
        s.status === "planned" && s.id !== sprintId &&
        new Date(s.startDate) > new Date(currentSprint?.startDate || 0)
      );
      if (!hasNextSprint) {
        toast.error("Невозможно завершить спринт: для незавершённых задач активного спринта выбрана настройка «Перенести в следующий спринт», но следующего спринта не существует. Создайте новый спринт или измените настройку для незавершённых задач на «Вернуть в бэклог продукта».");
        return;
      }
    }

    // Optimistic: mark as completed
    const sprintName = sprints.find(s => s.id === sprintId)?.name;
    setSprints(prev => prev.map(s => s.id === sprintId ? { ...s, status: "completed" as const } : s));
    try {
      await completeSprint(sprintId, incompleteTasksAction);
      toast.success(`Спринт${sprintName ? ` «${sprintName}»` : ""} завершён. Завершённые задачи спринта можно просмотреть в разделе «Завершённые спринты» внизу страницы.`, { duration: 6000 });
      refreshData();
    } catch (e: any) {
      toastError(e, "Ошибка завершения спринта");
      refreshData();
    }
  };

  // ── Task handlers ──────────────────────────────────────────

  const returnUrl = encodeURIComponent(`/projects/${projectId}?tab=backlog`);

  const handleCreateTaskForBoard = (boardId: string) => {
    setShowBoardPicker(false);
    navigate(`/tasks/new?projectId=${projectId}&boardId=${boardId}&backlog=1&returnUrl=${returnUrl}`);
  };

  const [boardPickerTarget, setBoardPickerTarget] = useState<"backlog" | string>("backlog");

  const handleAddTaskToBacklog = () => {
    setBoardPickerTarget("backlog");
    if (boards.length === 1) {
      handleCreateTaskForBoard(boards[0].id);
    } else if (boards.length > 1) {
      setShowBoardPicker(true);
    } else {
      toast.error("На проекте нет досок");
    }
  };

  const handleAddTaskToSprint = (sprintId: string) => {
    setBoardPickerTarget(sprintId);
    if (boards.length === 1) {
      handleCreateTaskForBoardAndSprint(boards[0].id, sprintId);
    } else if (boards.length > 1) {
      setShowBoardPicker(true);
    } else {
      toast.error("На проекте нет досок");
    }
  };

  const handleCreateTaskForBoardAndSprint = (boardId: string, sprintId: string) => {
    setShowBoardPicker(false);
    navigate(`/tasks/new?projectId=${projectId}&boardId=${boardId}&sprintId=${sprintId}&returnUrl=${returnUrl}`);
  };

  // ── Completed sprint expand/collapse ────────────────────────

  const toggleCompletedSprint = async (sprintId: string) => {
    const next = new Set(expandedCompletedSprints);
    if (next.has(sprintId)) {
      next.delete(sprintId);
    } else {
      next.add(sprintId);
      if (!completedSprintTasks.has(sprintId)) {
        try {
          const tasks = await getSprintTasks(sprintId);
          setCompletedSprintTasks(prev => new Map(prev).set(sprintId, tasks));
        } catch {
          setCompletedSprintTasks(prev => new Map(prev).set(sprintId, []));
        }
      }
    }
    setExpandedCompletedSprints(next);
  };

  // ── Drag & Drop ────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, task: TaskResponse, source: "backlog" | string) => {
    setDraggedTask(task);
    setDragSource(source);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverSprintId(null);
    setDragOverBacklog(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropToSprint = async (e: React.DragEvent, sprintId: string) => {
    e.preventDefault();
    if (!draggedTask) return;
    if (dragSource === sprintId) { handleDragEnd(); return; }

    const task = draggedTask;
    const source = dragSource;

    // Optimistic UI update
    if (source === "backlog") {
      setBacklogTasks(prev => prev.filter(t => t.id !== task.id));
    } else {
      setSprintTasks(prev => {
        const next = new Map(prev);
        next.set(source, (next.get(source) ?? []).filter(t => t.id !== task.id));
        return next;
      });
    }
    setSprintTasks(prev => {
      const next = new Map(prev);
      next.set(sprintId, [...(next.get(sprintId) ?? []), task]);
      return next;
    });

    setDraggedTask(null);
    setDragOverSprintId(null);
    setDragOverBacklog(false);

    try {
      await moveTasksToSprint(projectId, { sprintId, taskIds: [task.id] });
    } catch (e: any) {
      toastError(e, "Ошибка перемещения задачи");
      loadData(); // rollback
    }
  };

  const handleDropToBacklog = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTask) return;
    if (dragSource === "backlog") { handleDragEnd(); return; }

    const task = draggedTask;
    const source = dragSource;

    // Optimistic UI update
    setSprintTasks(prev => {
      const next = new Map(prev);
      next.set(source, (next.get(source) ?? []).filter(t => t.id !== task.id));
      return next;
    });
    setBacklogTasks(prev => [...prev, task]);

    setDraggedTask(null);
    setDragOverSprintId(null);
    setDragOverBacklog(false);

    try {
      await addTaskToBacklog(projectId, task.id);
    } catch (e: any) {
      toastError(e, "Ошибка перемещения задачи в бэклог");
      loadData(); // rollback
    }
  };

  // ── Render task card ───────────────────────────────────────

  const renderTask = (task: TaskResponse, source: "backlog" | string, isDraggable: boolean = true) => (
    <BacklogTaskCard
      key={task.id}
      task={task}
      source={source}
      draggable={isDraggable && canEdit}
      returnUrl={returnUrl}
      userCache={userCache}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    />
  );

  // ── Main Render ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Sort: active sprint first, then by start date ascending
  const nonCompletedSprints = sprints
    .filter(s => s.status !== "completed")
    .sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  const completedSprints = sprints
    .filter(s => s.status === "completed")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Бэклог и Спринты</h2>
          <p className="text-sm text-slate-600 mt-1">Управление бэклогом продукта и спринтами</p>
        </div>
        {canEdit && (
          <button onClick={() => openSprintModal(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus size={20} /> Создать спринт
          </button>
        )}
      </div>

      {/* Sprint Duration Setting */}
      <div className={`bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4 flex-wrap ${!canEdit ? "pointer-events-none opacity-60" : ""}`}>
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-blue-600" />
          <span className="text-sm font-medium text-slate-700">Длительность спринтов на проекте:</span>
        </div>
        <div className="relative" ref={durationRef}>
          <button
            onClick={() => { setDurationOpen(v => !v); setDurationInput(""); }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:border-blue-400 transition-colors min-w-[160px] justify-between"
          >
            <span>{projectDuration === 1 ? "1 неделя" : projectDuration < 5 ? `${projectDuration} недели` : `${projectDuration} недель`}</span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${durationOpen ? "rotate-180" : ""}`} />
          </button>
          {durationOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={durationInput}
                  onChange={e => setDurationInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitDurationInput();
                  }}
                  placeholder="Кол-во недель..."
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="py-1">
                {[1, 2, 3, 4].map(w => (
                  <button
                    key={w}
                    onClick={() => { handleSetProjectDuration(w); setDurationOpen(false); setDurationInput(""); }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                      projectDuration === w ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{w === 1 ? "1 неделя" : `${w} недели`}</span>
                    {projectDuration === w && <Check size={16} className="text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <span className="text-xs text-slate-500">Все новые спринты будут создаваться с этой длительностью</span>

        <div className="w-px h-8 bg-slate-200 mx-2 hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Незавершённые задачи:</span>
        </div>
        <div className="min-w-[220px]">
          <Select
            value={incompleteTasksAction}
            onValueChange={(v) => handleSetIncompleteTasksAction(v as "backlog" | "next_sprint")}
            ariaLabel="Действие с незавершёнными задачами"
          >
            <SelectOption value="backlog">Вернуть в бэклог продукта</SelectOption>
            <SelectOption value="next_sprint">Перенести в следующий спринт</SelectOption>
          </Select>
        </div>
        <span className="text-xs text-slate-500">Куда переносить незавершённые задачи спринта при его завершении</span>
      </div>

      {/* Main Board Layout */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Product Backlog Column */}
        <div className="flex-shrink-0 w-96">
          <div
            className={`bg-white border-2 rounded-xl shadow-sm h-full flex flex-col max-h-[800px] transition-all ${
              dragOverBacklog ? "border-purple-500 bg-purple-50" : "border-purple-200"
            }`}
            onDragOver={handleDragOver}
            onDragEnter={() => setDragOverBacklog(true)}
            onDragLeave={() => setDragOverBacklog(false)}
            onDrop={handleDropToBacklog}
          >
            <div className="p-4 border-b border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-purple-900">Бэклог продукта</h3>
                  <p className="text-sm text-purple-700 mt-1">{backlogTasks.length} задач</p>
                </div>
                {canEdit && (
                  <button onClick={handleAddTaskToBacklog}
                    className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors" title="Добавить задачу в бэклог">
                    <Plus size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="p-3 overflow-y-auto flex-1">
              {backlogTasks.length > 0 ? (
                boards.length > 1 ? (
                  <div className="space-y-4">
                    {groupTasksByBoard(backlogTasks, boards).map(({ board, tasks: bTasks }) => (
                      <div key={board.id}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <div className="w-2 h-2 rounded-full bg-purple-400" />
                          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">{board.name}</span>
                          <span className="text-xs text-slate-400">({bTasks.length})</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 items-start">
                          {bTasks.map(task => renderTask(task, "backlog"))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 items-start">
                    {backlogTasks.map(task => renderTask(task, "backlog"))}
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>Бэклог пуст</p>
                  <p className="text-sm mt-1">Создайте первую задачу</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sprint Columns */}
        {nonCompletedSprints.map(sprint => {
          const tasks = sprintTasks.get(sprint.id) ?? [];
          const isActive = sprint.status === "active";
          const statusLabel = SPRINT_STATUS_MAP[sprint.status] ?? sprint.status;

          return (
            <div key={sprint.id} className="flex-shrink-0 w-96">
              <div
                className={`bg-white border-2 rounded-xl shadow-sm h-full flex flex-col max-h-[800px] transition-all ${
                  dragOverSprintId === sprint.id ? "border-blue-500 bg-blue-50" : "border-blue-200"
                }`}
                onDragOver={handleDragOver}
                onDragEnter={() => setDragOverSprintId(sprint.id)}
                onDragLeave={() => setDragOverSprintId(null)}
                onDrop={e => handleDropToSprint(e, sprint.id)}
              >
                <div className="p-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl flex-shrink-0">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold truncate">{sprint.name}</h3>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded shrink-0 ${
                          isActive ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleAddTaskToSprint(sprint.id)} className="p-1.5 hover:bg-white rounded-lg transition-colors" title="Добавить задачу в спринт">
                          <Plus size={16} className="text-blue-600" />
                        </button>
                        <button onClick={() => openSprintModal(sprint)} className="p-1.5 hover:bg-white rounded-lg transition-colors" title="Редактировать">
                          <Edit size={16} className="text-slate-600" />
                        </button>
                        <button onClick={() => handleDeleteSprint(sprint.id)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors" title="Удалить">
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    )}
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
                        {formatDate(sprint.startDate, "monthDay")} – {formatDate(sprint.endDate, "monthDay")}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{tasks.length} задач</div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2">
                      {sprint.status === "planned" && (
                        <button onClick={() => handleStartSprint(sprint.id)}
                          className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 text-sm">
                          <Play size={14} /> Запустить
                        </button>
                      )}
                      {isActive && (
                        <button onClick={() => handleCompleteSprint(sprint.id)}
                          className="flex-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-1.5 text-sm">
                          <CheckCircle2 size={14} /> Завершить
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-3 overflow-y-auto flex-1">
                  {tasks.length > 0 ? (
                    boards.length > 1 ? (
                      <div className="space-y-4">
                        {groupTasksByBoard(tasks, boards).map(({ board, tasks: bTasks }) => (
                          <div key={board.id}>
                            <div className="flex items-center gap-2 mb-2 px-1">
                              <div className="w-2 h-2 rounded-full bg-blue-400" />
                              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{board.name}</span>
                              <span className="text-xs text-slate-400">({bTasks.length})</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 items-start">
                              {bTasks.map(task => renderTask(task, sprint.id))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 items-start">
                        {tasks.map(task => renderTask(task, sprint.id))}
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p className="text-sm">Нет задач</p>
                      <p className="text-xs mt-1">Перетащите из бэклога</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completed Sprints */}
      {completedSprints.length > 0 && (
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-bold mb-4">Завершённые спринты</h3>
          <div className="space-y-3">
            {completedSprints.map(sprint => (
              <CompletedSprintRow
                key={sprint.id}
                sprint={sprint}
                tasks={completedSprintTasks.get(sprint.id) ?? []}
                boards={boards}
                isExpanded={expandedCompletedSprints.has(sprint.id)}
                onToggle={() => toggleCompletedSprint(sprint.id)}
                renderTask={renderTask}
                groupTasksByBoard={groupTasksByBoard}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sprint Modal */}
      <Modal
        open={showSprintModal}
        onOpenChange={(next) => { setShowSprintModal(next); if (!next) setSelectedSprint(null); }}
        size="md"
      >
        <ModalHeader>
          <ModalTitle>{selectedSprint ? "Редактировать спринт" : "Создать спринт"}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Название спринта *</label>
              <input type="text" value={sprintName} onChange={e => setSprintName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Спринт 1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Цель спринта</label>
              <textarea value={sprintGoal} onChange={e => setSprintGoal(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3} placeholder="Основная цель спринта..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Дата начала *</label>
              <input type="date" value={sprintStartDate} onChange={e => setSprintStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="px-4 py-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              Длительность: <span className="font-semibold">{projectDuration} нед.</span>
              <span className="text-xs text-slate-400 ml-2">(настройка на уровне проекта)</span>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button onClick={() => { setShowSprintModal(false); setSelectedSprint(null); }}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium">
            Отмена
          </button>
          <button onClick={handleSaveSprint} disabled={!sprintName || !sprintStartDate}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {selectedSprint ? "Сохранить" : "Создать"}
          </button>
        </ModalFooter>
      </Modal>

      {/* Board Picker Modal */}
      <Modal open={showBoardPicker} onOpenChange={setShowBoardPicker} size="md">
        <ModalHeader>
          <ModalTitle>Выберите доску для задачи</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-slate-600 mb-4">Параметры задачи будут определены шаблоном выбранной доски</p>
          <div className="space-y-2">
            {boards.map(board => (
              <button key={board.id} onClick={() => {
                if (boardPickerTarget === "backlog") {
                  handleCreateTaskForBoard(board.id);
                } else {
                  handleCreateTaskForBoardAndSprint(board.id, boardPickerTarget);
                }
              }}
                className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{board.name}</span>
                  {board.isDefault && <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">по умолчанию</span>}
                </div>
                {board.description && <p className="text-sm text-slate-500 mt-1">{board.description}</p>}
              </button>
            ))}
          </div>
        </ModalBody>
      </Modal>

      {/* Delete Sprint Confirmation */}
      <ConfirmDialog
        open={!!deleteSprintTarget}
        onOpenChange={(next) => { if (!next) setDeleteSprintTarget(null); }}
        title="Удалить спринт"
        description={deleteSprintTarget ? `Вы уверены, что хотите удалить спринт «${sprints.find(s => s.id === deleteSprintTarget)?.name ?? ""}»?` : ""}
        variant="danger"
        confirmLabel="Удалить"
        onConfirm={confirmDeleteSprint}
      />
    </div>
  );
}
