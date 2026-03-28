import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Plus,
  MoreVertical,
  User,
  X,
  ChevronDown,
  GripVertical,
  Trash2,
  Search,
  Loader2,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import { getBoardColumns, getBoardSwimlanes, type ColumnResponse, type SwimlaneResponse } from "../api/boards";
import { searchTasks, type TaskResponse } from "../api/tasks";
import { getUser, type UserProfileResponse } from "../api/users";

const ItemType = {
  TASK: "TASK",
  COLUMN: "COLUMN",
  SWIMLANE: "SWIMLANE",
};

interface BoardProps {
  boardId: string | null;
  projectId?: string;
}

interface Filters {
  assignees: string[];
  priorities: string[];
  tags: string[];
}

function toAvatarUser(u: UserProfileResponse) {
  return { fullName: u.fullName, avatarUrl: u.avatarUrl ?? undefined };
}

// ── Task Card ───────────────────────────────────────────────

function TaskCard({ task, userCache, moveTask }: {
  task: TaskResponse;
  userCache: Map<string, UserProfileResponse>;
  moveTask: (taskId: string, columnId: string, swimlaneId: string | null) => void;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType.TASK,
    item: { id: task.id, columnId: task.columnId, swimlaneId: task.swimlaneId },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const executor = task.executorId ? userCache.get(task.executorId) : null;

  return (
    <Link
      to={`/tasks/${task.id}`}
      ref={drag}
      className={`bg-white p-3 rounded-lg shadow-md border border-slate-200 hover:shadow-xl hover:border-blue-400 transition-all cursor-move block ${
        isDragging ? "opacity-50 scale-95" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-mono text-slate-500 font-semibold">{task.key}</span>
        <button
          className="p-1 hover:bg-slate-100 rounded"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <MoreVertical size={14} />
        </button>
      </div>
      <p className="text-sm font-medium mb-2 hover:text-blue-600">{task.name}</p>
      <div className="flex items-center justify-between">
        {executor ? (
          <UserAvatar user={toAvatarUser(executor)} size="sm" className="w-6 h-6" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
            <User size={14} className="text-slate-400" />
          </div>
        )}
        {task.progress !== null && task.progress !== undefined && (
          <span className="text-xs font-semibold text-slate-600">{task.progress}%</span>
        )}
      </div>
    </Link>
  );
}

// ── Drop Zone ───────────────────────────────────────────────

function DropZone({
  columnId, swimlaneId, children, moveTask, onAddTask,
}: {
  columnId: string;
  swimlaneId: string | null;
  children: React.ReactNode;
  moveTask: (taskId: string, columnId: string, swimlaneId: string | null) => void;
  onAddTask: () => void;
}) {
  const [{ isOver }, drop] = useDrop({
    accept: ItemType.TASK,
    drop: (item: { id: string }) => { moveTask(item.id, columnId, swimlaneId); },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <div
      ref={drop}
      className={`min-h-[200px] p-2 rounded-lg transition-colors ${isOver ? "bg-blue-50 ring-2 ring-blue-300" : ""}`}
    >
      <div className="space-y-3">{children}</div>
      <button
        onClick={onAddTask}
        className="mt-3 w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all text-slate-600 flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Добавить задачу
      </button>
    </div>
  );
}

// ── Draggable Column Header ─────────────────────────────────

function DraggableColumnHeader({
  column, index, moveColumn, taskCount,
}: {
  column: ColumnResponse;
  index: number;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
  taskCount: number;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType.COLUMN,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: ItemType.COLUMN,
    hover: (item: { index: number }) => {
      if (item.index !== index) { moveColumn(item.index, index); item.index = index; }
    },
  });

  return (
    <th
      ref={(node) => drag(drop(node))}
      className={`p-4 text-left font-semibold min-w-[280px] border-b-2 border-slate-300 bg-slate-100 ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <GripVertical size={18} className="text-slate-400 cursor-move" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-700">{column.name}</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-200 text-slate-600">{taskCount}</span>
            </div>
            {column.wipLimit && (
              <div className="text-xs text-slate-500 font-normal mt-1">
                WIP: {taskCount} / {column.wipLimit}
              </div>
            )}
          </div>
        </div>
      </div>
    </th>
  );
}

// ── Swimlane Row ────────────────────────────────────────────

function SwimlaneRow({
  swimlane, columns, tasks, userCache, moveTask, onAddTask,
}: {
  swimlane: SwimlaneResponse;
  columns: ColumnResponse[];
  tasks: TaskResponse[];
  userCache: Map<string, UserProfileResponse>;
  moveTask: (taskId: string, columnId: string, swimlaneId: string | null) => void;
  onAddTask: (columnId: string, swimlaneId: string | null) => void;
}) {
  const swimlaneTasks = tasks.filter((t) => t.swimlaneId === swimlane.id);

  return (
    <tr className="border-b border-slate-200">
      <td className="p-4 font-semibold align-top sticky left-0 z-10 border-r-2 border-slate-300 bg-slate-100">
        <div className="flex items-start gap-2">
          <GripVertical size={18} className="text-slate-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-700">{swimlane.name}</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-200 text-slate-600">{swimlaneTasks.length}</span>
            </div>
            {swimlane.wipLimit && (
              <div className="text-xs text-slate-500 font-normal mt-1">
                WIP: {swimlaneTasks.length} / {swimlane.wipLimit}
              </div>
            )}
          </div>
        </div>
      </td>
      {columns.map((column) => {
        const cellTasks = tasks.filter((t) => t.columnId === column.id && t.swimlaneId === swimlane.id);
        return (
          <td key={column.id} className="p-4 align-top bg-slate-50">
            <DropZone columnId={column.id} swimlaneId={swimlane.id} moveTask={moveTask} onAddTask={() => onAddTask(column.id, swimlane.id)}>
              {cellTasks.map((task) => (
                <TaskCard key={task.id} task={task} userCache={userCache} moveTask={moveTask} />
              ))}
            </DropZone>
          </td>
        );
      })}
    </tr>
  );
}

// ── Filter Dropdown ─────────────────────────────────────────

function FilterDropdown({
  label, options, selectedValues, onToggle, renderOption,
}: {
  label: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  renderOption: (option: string) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const filteredOptions = options.filter((o) => renderOption(o).toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg hover:border-blue-400 transition-colors text-left flex items-center justify-between"
      >
        <span className="text-sm font-medium">
          {label}
          {selectedValues.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{selectedValues.length}</span>
          )}
        </span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-64 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-7 pr-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="overflow-y-auto p-2">
              {filteredOptions.length > 0 ? (
                <div className="space-y-1">
                  {filteredOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedValues.includes(option)} onChange={() => onToggle(option)} className="rounded text-blue-600" />
                      <span className="text-sm">{renderOption(option)}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-2">Ничего не найдено</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Board Component ────────────────────────────────────

export default function Board({ boardId, projectId }: BoardProps) {
  const [columns, setColumns] = useState<ColumnResponse[]>([]);
  const [swimlanes, setSwimlanes] = useState<SwimlaneResponse[]>([]);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [userCache, setUserCache] = useState<Map<string, UserProfileResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ assignees: [], priorities: [], tags: [] });

  const loadData = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const [cols, swims] = await Promise.all([
        getBoardColumns(boardId),
        getBoardSwimlanes(boardId),
      ]);
      setColumns(cols.sort((a, b) => a.order - b.order));
      setSwimlanes(swims.sort((a, b) => a.order - b.order));

      // Load tasks if projectId is available
      if (projectId) {
        try {
          const t = await searchTasks({ projectId });
          // Filter to tasks on this board's columns
          const colIds = new Set(cols.map((c) => c.id));
          setTasks(t.filter((task) => colIds.has(task.columnId)));

          // Cache user profiles
          const userIds = new Set<string>();
          t.forEach((task) => { if (task.executorId) userIds.add(task.executorId); });
          const cache = new Map<string, UserProfileResponse>();
          await Promise.allSettled(
            [...userIds].map(async (uid) => {
              try { const u = await getUser(uid); cache.set(uid, u); } catch { /**/ }
            })
          );
          setUserCache(cache);
        } catch { /* tasks might fail if no tasks exist yet */ }
      }
    } catch { /**/ } finally {
      setLoading(false);
    }
  }, [boardId, projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const moveTask = (taskId: string, columnId: string, swimlaneId: string | null) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, columnId, swimlaneId } : t));
    // TODO: call updateTask API
  };

  const moveColumn = (dragIndex: number, hoverIndex: number) => {
    const newCols = [...columns];
    const [dragged] = newCols.splice(dragIndex, 1);
    newCols.splice(hoverIndex, 0, dragged);
    newCols.forEach((c, i) => (c.order = i + 1));
    setColumns(newCols);
  };

  const getColumnTaskCount = (columnId: string) => tasks.filter((t) => t.columnId === columnId).length;

  const getFilteredTasks = (columnId: string, swimlaneId: string | null) => {
    return tasks.filter((t) => {
      const matchCol = t.columnId === columnId;
      const matchSwim = swimlanes.length > 0 ? t.swimlaneId === swimlaneId : true;
      return matchCol && matchSwim;
    });
  };

  const handleAddTask = (columnId: string, swimlaneId: string | null) => {
    console.log("Добавление задачи:", { columnId, swimlaneId });
  };

  const toggleFilter = (filterType: keyof Filters, value: string) => {
    setFilters((prev) => {
      const current = prev[filterType];
      return {
        ...prev,
        [filterType]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  };

  const clearFilters = () => setFilters({ assignees: [], priorities: [], tags: [] });
  const hasActiveFilters = Object.values(filters).some((f) => f.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
        <p className="text-slate-600">Нет колонок на доске. Откройте настройки доски, чтобы добавить колонки.</p>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4 overflow-hidden">
        {/* Filters */}
        {tasks.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700">Фильтры</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
                  <X size={14} /> Сбросить все
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <FilterDropdown
                label="Исполнитель"
                options={[...new Set(tasks.map((t) => t.executorId).filter(Boolean) as string[])]}
                selectedValues={filters.assignees}
                onToggle={(v) => toggleFilter("assignees", v)}
                renderOption={(id) => userCache.get(id)?.fullName || id}
              />
              <FilterDropdown
                label="Колонка"
                options={columns.map((c) => c.name)}
                selectedValues={filters.priorities}
                onToggle={(v) => toggleFilter("priorities", v)}
                renderOption={(v) => v}
              />
              <FilterDropdown
                label="Дорожка"
                options={swimlanes.map((s) => s.name)}
                selectedValues={filters.tags}
                onToggle={(v) => toggleFilter("tags", v)}
                renderOption={(v) => v}
              />
            </div>
          </div>
        )}

        {/* Board */}
        <div className="overflow-x-auto">
          <div className="bg-white rounded-xl shadow-md border border-slate-100">
            <table className="border-collapse w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {swimlanes.length > 0 && (
                    <th className="p-4 text-left font-semibold text-slate-700 w-48 sticky left-0 bg-slate-50 z-10" />
                  )}
                  {columns.map((column, index) => (
                    <DraggableColumnHeader
                      key={column.id}
                      column={column}
                      index={index}
                      moveColumn={moveColumn}
                      taskCount={getColumnTaskCount(column.id)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {swimlanes.length > 0 ? (
                  swimlanes.map((swimlane) => (
                    <SwimlaneRow
                      key={swimlane.id}
                      swimlane={swimlane}
                      columns={columns}
                      tasks={tasks}
                      userCache={userCache}
                      moveTask={moveTask}
                      onAddTask={handleAddTask}
                    />
                  ))
                ) : (
                  <tr>
                    {columns.map((column) => {
                      const cellTasks = getFilteredTasks(column.id, null);
                      return (
                        <td key={column.id} className="p-4 align-top bg-slate-50">
                          <DropZone
                            columnId={column.id}
                            swimlaneId={null}
                            moveTask={moveTask}
                            onAddTask={() => handleAddTask(column.id, null)}
                          >
                            {cellTasks.map((task) => (
                              <TaskCard key={task.id} task={task} userCache={userCache} moveTask={moveTask} />
                            ))}
                          </DropZone>
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
