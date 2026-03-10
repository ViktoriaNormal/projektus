import { useState } from "react";
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
} from "lucide-react";
import { users, boardTasks, boardColumns, boardSwimlanes } from "../data/mockData";
import { UserAvatar } from "../components/UserAvatar";

const ItemType = {
  TASK: "TASK",
  COLUMN: "COLUMN",
  SWIMLANE: "SWIMLANE",
};

interface Task {
  id: number;
  key: string;
  title: string;
  priority: string;
  assigneeId: number | null;
  columnId: number;
  swimlaneId: number | null;
  tags: string[];
  storyPoints?: number;
  status: string;
}

interface BoardProps {
  boardId: number | null;
}

interface Filters {
  assignees: number[];
  priorities: string[];
  tags: string[];
  statuses: string[];
}

interface Column {
  id: number;
  name: string;
  order: number;
  wipLimit?: number;
  boardId: number;
}

interface Swimlane {
  id: number;
  name: string;
  order: number;
  wipLimit?: number;
  boardId: number;
}

function TaskCard({ task, moveTask }: { task: Task; moveTask: (taskId: number, columnId: number, swimlaneId: number | null) => void }) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType.TASK,
    item: { id: task.id, columnId: task.columnId, swimlaneId: task.swimlaneId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const assignee = users.find((u) => u.id === task.assigneeId);

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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MoreVertical size={14} />
        </button>
      </div>
      <p className="text-sm font-medium mb-2 hover:text-blue-600">{task.title}</p>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {task.tags.map((tag, index) => (
          <span
            key={index}
            className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        {assignee ? (
          <div className="flex items-center gap-2">
            <UserAvatar 
              user={assignee} 
              size="sm" 
              className="w-6 h-6"
            />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
            <User size={14} className="text-slate-400" />
          </div>
        )}
        {task.storyPoints && (
          <span className="text-xs font-semibold text-slate-600">
            {task.storyPoints} SP
          </span>
        )}
      </div>
    </Link>
  );
}

function DropZone({
  columnId,
  swimlaneId,
  children,
  moveTask,
  tasks,
  onAddTask,
}: {
  columnId: number;
  swimlaneId: number | null;
  children: React.ReactNode;
  moveTask: (taskId: number, columnId: number, swimlaneId: number | null) => void;
  tasks: Task[];
  onAddTask: () => void;
}) {
  const [{ isOver }, drop] = useDrop({
    accept: ItemType.TASK,
    drop: (item: { id: number }) => {
      moveTask(item.id, columnId, swimlaneId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`min-h-[200px] p-2 rounded-lg transition-colors ${
        isOver ? "bg-blue-50 ring-2 ring-blue-300" : ""
      }`}
    >
      <div className="space-y-3">
        {children}
      </div>
      <button
        onClick={onAddTask}
        className="mt-3 w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all text-slate-600 flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Добавить задачу
      </button>
    </div>
  );
}

function DraggableColumnHeader({
  column,
  index,
  moveColumn,
  taskCount,
  onDelete,
}: {
  column: Column;
  index: number;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
  taskCount: number;
  onDelete: (id: number) => void;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType.COLUMN,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemType.COLUMN,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveColumn(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <th
      ref={(node) => drag(drop(node))}
      className={`p-4 text-left font-semibold min-w-[280px] border-b-2 border-slate-300 bg-slate-100 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <GripVertical size={18} className="text-slate-400 cursor-move" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-700">{column.name}</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-200 text-slate-600">
                {taskCount}
              </span>
            </div>
            {column.wipLimit && (
              <div className="text-xs text-slate-500 font-normal mt-1">
                WIP: {taskCount} / {column.wipLimit}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => console.log("Add column after", index)}
            className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
            title="Добавить колонку"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => onDelete(column.id)}
            className="p-1 hover:bg-red-100 rounded text-slate-600 hover:text-red-600 transition-colors"
            title="Удалить колонку"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </th>
  );
}

function DraggableSwimlaneRow({
  swimlane,
  index,
  columns,
  moveSwimlane,
  getTasksForCell,
  moveTask,
  tasks,
  onDelete,
  onAddSwimlane,
  onAddTask,
}: {
  swimlane: Swimlane;
  index: number;
  columns: Column[];
  moveSwimlane: (dragIndex: number, hoverIndex: number) => void;
  getTasksForCell: (columnId: number, swimlaneId: number | null) => Task[];
  moveTask: (taskId: number, columnId: number, swimlaneId: number | null) => void;
  tasks: Task[];
  onDelete: (id: number) => void;
  onAddSwimlane: (afterId: number) => void;
  onAddTask: (columnId: number, swimlaneId: number | null) => void;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType.SWIMLANE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemType.SWIMLANE,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveSwimlane(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <tr
      ref={(node) => drag(drop(node))}
      className={`border-b border-slate-200 ${isDragging ? "opacity-50" : ""}`}
    >
      <td
        className="p-4 font-semibold align-top sticky left-0 z-10 border-r-2 border-slate-300 bg-slate-100"
      >
        <div className="flex items-start gap-2">
          <GripVertical size={18} className="text-slate-400 cursor-move flex-shrink-0 mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-700">{swimlane.name}</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-200 text-slate-600">
                {tasks.filter((t) => t.swimlaneId === swimlane.id).length}
              </span>
            </div>
            {swimlane.wipLimit && (
              <div className="text-xs text-slate-500 font-normal mt-1">
                WIP: {tasks.filter((t) => t.swimlaneId === swimlane.id).length} / {swimlane.wipLimit}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onAddSwimlane(swimlane.id)}
              className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
              title="Добавить дорожку ниже"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => onDelete(swimlane.id)}
              className="p-1 hover:bg-red-100 rounded text-slate-600 hover:text-red-600 transition-colors"
              title="Удалить дорожку"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </td>
      {columns.map((column) => {
        const cellTasks = getTasksForCell(column.id, swimlane.id);
        return (
          <td key={column.id} className="p-4 align-top bg-slate-50">
            <DropZone
              columnId={column.id}
              swimlaneId={swimlane.id}
              moveTask={moveTask}
              tasks={cellTasks}
              onAddTask={() => onAddTask(column.id, swimlane.id)}
            >
              <div className="space-y-3">
                {cellTasks.map((task) => (
                  <TaskCard key={task.id} task={task} moveTask={moveTask} />
                ))}
              </div>
            </DropZone>
          </td>
        );
      })}
    </tr>
  );
}

function FilterDropdown({
  label,
  options,
  selectedValues,
  onToggle,
  renderOption,
}: {
  label: string;
  options: any[];
  selectedValues: any[];
  onToggle: (value: any) => void;
  renderOption: (option: any) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter((option) =>
    renderOption(option).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCount = selectedValues.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg hover:border-blue-400 transition-colors text-left flex items-center justify-between"
      >
        <span className="text-sm font-medium">
          {label}
          {selectedCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {selectedCount}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-64 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-7 pr-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="overflow-y-auto p-2">
              {filteredOptions.length > 0 ? (
                <div className="space-y-1">
                  {filteredOptions.map((option, idx) => (
                    <label
                      key={idx}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.includes(option)}
                        onChange={() => onToggle(option)}
                        className="rounded text-blue-600"
                      />
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

export default function Board({ boardId }: BoardProps) {
  const [tasks, setTasks] = useState<Task[]>(boardTasks);
  const [filters, setFilters] = useState<Filters>({
    assignees: [],
    priorities: [],
    tags: [],
    statuses: [],
  });
  const [columns, setColumns] = useState<Column[]>(
    boardColumns.filter((c) => c.boardId === boardId).sort((a, b) => a.order - b.order)
  );
  
  // Параметр группировки дорожек (в реальном приложении берется из настроек доски)
  const [swimlaneGroupBy, setSwimlaneGroupBy] = useState<string>("priority"); // 'priority', 'assignee', 'type', 'tags', ''
  
  // Автоматическая генерация дорожек на основе параметра группировки
  const generateSwimlanes = (): Swimlane[] => {
    if (!swimlaneGroupBy) return [];
    
    const uniqueValues = new Set<string | number>();
    
    tasks.forEach((task) => {
      if (swimlaneGroupBy === "priority") {
        uniqueValues.add(task.priority);
      } else if (swimlaneGroupBy === "assignee") {
        if (task.assigneeId) uniqueValues.add(task.assigneeId);
      } else if (swimlaneGroupBy === "type") {
        uniqueValues.add(task.status); // Используем status как type для примера
      } else if (swimlaneGroupBy === "tags") {
        task.tags.forEach((tag) => uniqueValues.add(tag));
      }
    });
    
    return Array.from(uniqueValues).map((value, index) => ({
      id: index + 1,
      name: swimlaneGroupBy === "assignee" 
        ? users.find((u) => u.id === value)?.fullName || "Без исполнителя"
        : String(value),
      order: index + 1,
      wipLimit: null,
      boardId: boardId || 0,
    }));
  };
  
  const swimlanes = generateSwimlanes();

  // Функция для определения, к какой дорожке относится задача
  const getTaskSwimlaneId = (task: Task): number | null => {
    if (!swimlaneGroupBy) return null;
    
    let matchValue: string | number | null = null;
    
    if (swimlaneGroupBy === "priority") {
      matchValue = task.priority;
    } else if (swimlaneGroupBy === "assignee") {
      matchValue = task.assigneeId;
    } else if (swimlaneGroupBy === "type") {
      matchValue = task.status;
    } else if (swimlaneGroupBy === "tags") {
      matchValue = task.tags[0] || null; // Берём первую метку
    }
    
    if (matchValue === null) return null;
    
    const swimlane = swimlanes.find((s) => {
      if (swimlaneGroupBy === "assignee") {
        return users.find((u) => u.id === matchValue)?.fullName === s.name;
      }
      return String(matchValue) === s.name;
    });
    
    return swimlane ? swimlane.id : null;
  };

  const moveTask = (taskId: number, columnId: number, swimlaneId: number | null) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, columnId, swimlaneId } : task
      )
    );
  };

  const moveColumn = (dragIndex: number, hoverIndex: number) => {
    const draggedColumn = columns[dragIndex];
    const newColumns = [...columns];
    newColumns.splice(dragIndex, 1);
    newColumns.splice(hoverIndex, 0, draggedColumn);
    newColumns.forEach((col, idx) => (col.order = idx + 1));
    setColumns(newColumns);
  };

  const moveSwimlane = (dragIndex: number, hoverIndex: number) => {
    const draggedSwimlane = swimlanes[dragIndex];
    const newSwimlanes = [...swimlanes];
    newSwimlanes.splice(dragIndex, 1);
    newSwimlanes.splice(hoverIndex, 0, draggedSwimlane);
    newSwimlanes.forEach((swim, idx) => (swim.order = idx + 1));
    setSwimlanes(newSwimlanes);
  };

  const getTasksForCell = (columnId: number, swimlaneId: number | null) => {
    return tasks.filter((t) => {
      const matchesColumn = t.columnId === columnId;
      
      // Проверяем соответствие дорожке на основе группировки
      let matchesSwimlane = true;
      if (swimlaneGroupBy && swimlaneId !== null) {
        const swimlane = swimlanes.find((s) => s.id === swimlaneId);
        if (swimlane) {
          if (swimlaneGroupBy === "priority") {
            matchesSwimlane = t.priority === swimlane.name;
          } else if (swimlaneGroupBy === "assignee") {
            const assignee = users.find((u) => u.id === t.assigneeId);
            matchesSwimlane = assignee?.fullName === swimlane.name;
          } else if (swimlaneGroupBy === "type") {
            matchesSwimlane = t.status === swimlane.name;
          } else if (swimlaneGroupBy === "tags") {
            matchesSwimlane = t.tags.includes(swimlane.name);
          }
        }
      } else if (!swimlaneGroupBy) {
        matchesSwimlane = t.swimlaneId === swimlaneId;
      }
      
      const matchesAssignee = filters.assignees.length === 0 || (t.assigneeId && filters.assignees.includes(t.assigneeId));
      const matchesPriority = filters.priorities.length === 0 || filters.priorities.includes(t.priority);
      const matchesTags = filters.tags.length === 0 || t.tags.some((tag) => filters.tags.includes(tag));
      const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(t.status);

      return matchesColumn && matchesSwimlane && matchesAssignee && matchesPriority && matchesTags && matchesStatus;
    });
  };

  const getColumnTaskCount = (columnId: number) => {
    return tasks.filter((t) => t.columnId === columnId).length;
  };

  const handleAddSwimlane = (afterSwimlaneId: number | null) => {
    console.log("Добавление дорожки после:", afterSwimlaneId);
  };

  const handleDeleteColumn = (columnId: number) => {
    if (confirm("Вы уверены, что хотите удалить эту колонку?")) {
      setColumns(columns.filter((c) => c.id !== columnId));
    }
  };

  const handleDeleteSwimlane = (swimlaneId: number) => {
    if (confirm("Вы уверены, что хотите удалить эту дорожку?")) {
      setSwimlanes(swimlanes.filter((s) => s.id !== swimlaneId));
    }
  };

  const handleAddTask = (columnId: number, swimlaneId: number | null) => {
    console.log("Добавление задачи в колонку:", columnId, "дорожка:", swimlaneId);
  };

  const handleAddColumn = (afterIndex: number) => {
    console.log("Добавление колонки после индекса:", afterIndex);
  };

  const toggleFilter = (filterType: keyof Filters, value: any) => {
    setFilters((prev) => {
      const current = prev[filterType] as any[];
      if (current.includes(value)) {
        return { ...prev, [filterType]: current.filter((v) => v !== value) };
      } else {
        return { ...prev, [filterType]: [...current, value] };
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      assignees: [],
      priorities: [],
      tags: [],
      statuses: [],
    });
  };

  const hasActiveFilters = Object.values(filters).some((f) => f.length > 0);

  // Получаем уникальные значения для фильтров
  const uniqueAssignees = Array.from(new Set(tasks.map((t) => t.assigneeId).filter(Boolean)));
  const uniquePriorities = Array.from(new Set(tasks.map((t) => t.priority)));
  const uniqueTags = Array.from(new Set(tasks.flatMap((t) => t.tags)));
  const uniqueStatuses = Array.from(new Set(tasks.map((t) => t.status)));

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4 overflow-hidden">
        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700">Фильтры</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X size={14} />
                Сбросить все
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <FilterDropdown
              label="Исполнитель"
              options={uniqueAssignees}
              selectedValues={filters.assignees}
              onToggle={(value) => toggleFilter("assignees", value)}
              renderOption={(assigneeId) => {
                const user = users.find((u) => u.id === assigneeId);
                return user?.fullName || "";
              }}
            />

            <FilterDropdown
              label="Приоритет"
              options={uniquePriorities}
              selectedValues={filters.priorities}
              onToggle={(value) => toggleFilter("priorities", value)}
              renderOption={(priority) => priority}
            />

            <FilterDropdown
              label="Метки"
              options={uniqueTags}
              selectedValues={filters.tags}
              onToggle={(value) => toggleFilter("tags", value)}
              renderOption={(tag) => tag}
            />

            <FilterDropdown
              label="Статус"
              options={uniqueStatuses}
              selectedValues={filters.statuses}
              onToggle={(value) => toggleFilter("statuses", value)}
              renderOption={(status) => status}
            />
          </div>
        </div>

        {/* Board with overflow */}
        <div className="overflow-x-auto -mx-0">
          <div className="bg-white rounded-xl shadow-md border border-slate-100">
            <table className="border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {swimlanes.length > 0 && (
                    <th className="p-4 text-left font-semibold text-slate-700 w-48 sticky left-0 bg-slate-50 z-10">
                      {/* Пустая ячейка на пересечении заголовков */}
                    </th>
                  )}
                  {columns.map((column, index) => (
                    <DraggableColumnHeader
                      key={column.id}
                      column={column}
                      index={index}
                      moveColumn={moveColumn}
                      taskCount={getColumnTaskCount(column.id)}
                      onDelete={handleDeleteColumn}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {swimlanes.length > 0 ? (
                  <>
                    {swimlanes.map((swimlane, index) => (
                      <DraggableSwimlaneRow
                        key={swimlane.id}
                        swimlane={swimlane}
                        index={index}
                        columns={columns}
                        moveSwimlane={moveSwimlane}
                        getTasksForCell={getTasksForCell}
                        moveTask={moveTask}
                        tasks={tasks}
                        onDelete={handleDeleteSwimlane}
                        onAddSwimlane={handleAddSwimlane}
                        onAddTask={handleAddTask}
                      />
                    ))}
                  </>
                ) : (
                  <tr>
                    {columns.map((column) => {
                      const cellTasks = getTasksForCell(column.id, null);
                      return (
                        <td key={column.id} className="p-4 align-top bg-slate-50">
                          <DropZone
                            columnId={column.id}
                            swimlaneId={null}
                            moveTask={moveTask}
                            tasks={cellTasks}
                            onAddTask={() => handleAddTask(column.id, null)}
                          >
                            <div className="space-y-3">
                              {cellTasks.map((task) => (
                                <TaskCard key={task.id} task={task} moveTask={moveTask} />
                              ))}
                            </div>
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