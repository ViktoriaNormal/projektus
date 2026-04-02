import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router";
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
  Settings,
  Check,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "../components/UserAvatar";
import {
  getBoard, getBoardColumns, getBoardSwimlanes, getBoardFields, createColumn, updateColumn, deleteColumn, reorderColumns,
  type BoardResponse, type BoardField, type ColumnResponse, type SwimlaneResponse,
} from "../api/boards";
import { searchTasks, updateTask, type TaskResponse } from "../api/tasks";
import { getTaskFieldValues, type TaskFieldValue } from "../api/field-values";
import { getProjectSprints, getSprintTasks, type SprintResponse } from "../api/sprints";
import { getUser, type UserProfileResponse } from "../api/users";

const ItemType = {
  TASK: "TASK",
  COLUMN: "COLUMN",
  SWIMLANE: "SWIMLANE",
};

interface BoardProps {
  boardId: string | null;
  projectId?: string;
  projectType?: string;
  onBoardChanged?: () => void;
}

interface Filters {
  assignees: string[];
  priorities: string[];
  tags: string[];
}

// ── Computed Swimlanes ────────────────────────────────────────

interface ComputedSwimlane {
  key: string;
  name: string;
  taskIds: Set<string>;
  wipLimit: number | null;
}

function getTaskValueForField(
  task: TaskResponse,
  field: BoardField,
  fieldValuesMap: Map<string, TaskFieldValue[]>,
): string | null {
  if (field.isSystem) {
    switch (field.fieldType) {
      case "priority": return task.priority || null;
      case "user": return task.executorUserId || null;
      case "estimation": return task.estimation || null;
      case "datetime": return task.deadline || null;
      case "tags": {
        const names = task.tags?.map(t => t.name).sort();
        return names && names.length > 0 ? names.join(", ") : null;
      }
      default: return null;
    }
  }
  const fvs = fieldValuesMap.get(task.id);
  const fv = fvs?.find(v => v.fieldId === field.id);
  if (!fv) return null;
  if (field.fieldType === "number") return fv.valueNumber != null ? String(fv.valueNumber) : null;
  if (field.fieldType === "datetime") return fv.valueDatetime ? fv.valueDatetime.slice(0, 16) : null;
  return fv.valueText || null;
}

function computeSwimlanesFromTasks(
  tasks: TaskResponse[],
  field: BoardField,
  fieldValuesMap: Map<string, TaskFieldValue[]>,
  backendSwimlanes: SwimlaneResponse[],
  userCache: Map<string, UserProfileResponse>,
  sprints: SprintResponse[],
  priorityOptions?: string[],
): ComputedSwimlane[] {
  const wipMap = new Map(backendSwimlanes.map(s => [s.name, s.wipLimit]));
  const make = (name: string, ids: string[]): ComputedSwimlane => ({
    key: name, name, taskIds: new Set(ids), wipLimit: wipMap.get(name) ?? null,
  });
  const getVal = (t: TaskResponse) => getTaskValueForField(t, field, fieldValuesMap);
  const resolveUser = (id: string) => userCache.get(id)?.fullName || id;
  const resolveSprint = (id: string) => sprints.find(s => s.id === id)?.name || id;

  // Checkbox: always 2 lanes
  if (field.fieldType === "checkbox") {
    return [
      make(`${field.name}: да`, tasks.filter(t => getVal(t) === "true").map(t => t.id)),
      make(`${field.name}: нет`, tasks.filter(t => getVal(t) !== "true").map(t => t.id)),
    ];
  }

  // Select / Priority: fixed lanes from options
  if (field.fieldType === "select" || field.fieldType === "priority") {
    const opts = (field.fieldType === "priority" && priorityOptions?.length ? priorityOptions : field.options) || [];
    const lanes = opts.map(opt => make(opt, tasks.filter(t => getVal(t) === opt).map(t => t.id)));
    const assigned = new Set(opts);
    const unmatched = tasks.filter(t => { const v = getVal(t); return v == null || !assigned.has(v); });
    if (unmatched.length > 0) lanes.push(make("Значение не задано", unmatched.map(t => t.id)));
    return lanes;
  }

  // User / Sprint: dynamic values + "Значение не задано"
  if (field.fieldType === "user" || field.fieldType === "sprint") {
    const groups = new Map<string, string[]>();
    const nullIds: string[] = [];
    for (const task of tasks) {
      const v = getVal(task);
      if (!v) { nullIds.push(task.id); continue; }
      if (!groups.has(v)) groups.set(v, []);
      groups.get(v)!.push(task.id);
    }
    const resolve = field.fieldType === "user" ? resolveUser : resolveSprint;
    const lanes = [...groups.entries()].map(([val, ids]) => make(resolve(val), ids));
    if (nullIds.length > 0) lanes.push(make("Значение не задано", nullIds));
    return lanes;
  }

  // Multiselect / User list / Sprint list / Tags: group by unique combinations
  if (field.fieldType === "multiselect" || field.fieldType === "user_list" || field.fieldType === "sprint_list" || field.fieldType === "tags") {
    const groups = new Map<string, string[]>();
    const nullIds: string[] = [];
    for (const task of tasks) {
      const raw = getVal(task);
      if (!raw) { nullIds.push(task.id); continue; }
      const parts = raw.split(",").map(s => s.trim()).filter(Boolean).sort();
      if (parts.length === 0) { nullIds.push(task.id); continue; }
      const resolve = field.fieldType === "user_list" ? resolveUser : field.fieldType === "sprint_list" ? resolveSprint : (v: string) => v;
      const displayKey = parts.map(resolve).join(", ");
      if (!groups.has(displayKey)) groups.set(displayKey, []);
      groups.get(displayKey)!.push(task.id);
    }
    const lanes = [...groups.entries()].map(([key, ids]) => make(key, ids));
    if (nullIds.length > 0) lanes.push(make("Значение не задано", nullIds));
    return lanes;
  }

  // Text / Number / Datetime / Estimation / Tags: group by unique values
  const groups = new Map<string, string[]>();
  const nullIds: string[] = [];
  for (const task of tasks) {
    const v = getVal(task);
    if (!v) { nullIds.push(task.id); continue; }
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v)!.push(task.id);
  }
  const lanes = [...groups.entries()].map(([val, ids]) => make(val, ids));
  if (nullIds.length > 0) lanes.push(make("Значение не задано", nullIds));
  return lanes;
}

const COLUMN_TYPE_LABELS: Record<string, string> = {
  initial: "Начальный",
  in_progress: "В работе",
  completed: "Завершено",
};

function toAvatarUser(u: UserProfileResponse) {
  return { fullName: u.fullName, avatarUrl: u.avatarUrl ?? undefined };
}

// ── Validation (same as BoardSettingsModal) ─────────────────

function validateColumnOrder(cols: ColumnResponse[]): string | null {
  if (cols.length === 0) return null;
  const countInitial = cols.filter(c => c.systemType === "initial").length;
  const countInProgress = cols.filter(c => c.systemType === "in_progress").length;
  const countCompleted = cols.filter(c => c.systemType === "completed").length;
  if (countInitial === 0) return `Должна быть минимум одна колонка с типом «${COLUMN_TYPE_LABELS["initial"]}».`;
  if (countInProgress === 0) return `Должна быть минимум одна колонка с типом «${COLUMN_TYPE_LABELS["in_progress"]}».`;
  if (countCompleted === 0) return `Должна быть минимум одна колонка с типом «${COLUMN_TYPE_LABELS["completed"]}».`;
  let phase: "early" | "middle" | "final" = "early";
  let lastPhaseCol: ColumnResponse | null = null;
  for (const col of cols) {
    const st = col.systemType || "";
    if (st === "initial") {
      if (phase === "middle" || phase === "final")
        return `Колонка «${col.name}» (тип «${COLUMN_TYPE_LABELS[st]}») не может стоять после колонки «${lastPhaseCol?.name}» (тип «${COLUMN_TYPE_LABELS[lastPhaseCol?.systemType || ""]}»).`;
    } else if (st === "in_progress") {
      if (phase === "final")
        return `Колонка «${col.name}» (тип «${COLUMN_TYPE_LABELS[st]}») не может стоять после колонки «${lastPhaseCol?.name}» (тип «${COLUMN_TYPE_LABELS[lastPhaseCol?.systemType || ""]}»).`;
      phase = "middle"; lastPhaseCol = col;
    } else if (st === "completed") {
      phase = "final"; lastPhaseCol = col;
    }
  }
  return null;
}

// ── Task Card ───────────────────────────────────────────────

function TaskCard({ task, userCache, moveTask, returnUrl }: {
  task: TaskResponse;
  userCache: Map<string, UserProfileResponse>;
  moveTask: (taskId: string, columnId: string, swimlaneId: string | null) => void;
  returnUrl?: string;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType.TASK,
    item: { id: task.id, columnId: task.columnId, swimlaneId: task.swimlaneId },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const executor = task.executorUserId ? userCache.get(task.executorUserId) : null;

  return (
    <Link
      to={`/tasks/${task.id}${returnUrl ? `?returnUrl=${returnUrl}` : ""}`}
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
  columnId, swimlaneId, children, moveTask, onAddTask, canAddTask = true, addTaskHint,
}: {
  columnId: string;
  swimlaneId: string | null;
  children: React.ReactNode;
  moveTask: (taskId: string, columnId: string, swimlaneId: string | null) => void;
  onAddTask: () => void;
  canAddTask?: boolean;
  addTaskHint?: string;
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
      {canAddTask && (
        <div>
          <button
            onClick={onAddTask}
            className="mt-3 w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all text-slate-600 flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Добавить задачу
          </button>
          {addTaskHint && (
            <p className="text-xs text-slate-400 text-center mt-1.5">{addTaskHint}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Column Header with inline editing ───────────────────────

function ColumnHeader({
  column, index, columns, moveColumn, taskCount, isScrum,
  onUpdate, onAddAfter, onRemove,
}: {
  column: ColumnResponse;
  index: number;
  columns: ColumnResponse[];
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
  taskCount: number;
  isScrum: boolean;
  onUpdate: (colId: string, field: string, value: any) => void;
  onAddAfter: (afterIndex: number) => void;
  onRemove: (colId: string) => void;
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

  const [showMenu, setShowMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(column.name);
  const [editingWip, setEditingWip] = useState(false);
  const [wipVal, setWipVal] = useState(column.wipLimit != null ? String(column.wipLimit) : "");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const wipInputRef = useRef<HTMLInputElement>(null);

  const locked = !!column.isLocked;
  const showWip = !isScrum && column.systemType !== "completed";

  function saveName() {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== column.name) onUpdate(column.id, "name", trimmed);
    else setNameVal(column.name);
    setEditingName(false);
  }

  function saveWip() {
    const parsed = wipVal.trim() === "" ? null : parseInt(wipVal, 10);
    if (parsed !== null && isNaN(parsed)) { setWipVal(column.wipLimit != null ? String(column.wipLimit) : ""); }
    else if (parsed !== column.wipLimit) onUpdate(column.id, "wipLimit", parsed);
    setEditingWip(false);
  }

  return (
    <th
      ref={(node) => drag(drop(node))}
      className={`p-4 text-left font-semibold min-w-[280px] border-b-2 border-slate-300 bg-slate-100 ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2">
        <GripVertical size={18} className="text-slate-400 cursor-move shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className="flex items-center gap-2">
            {editingName ? (
              <input ref={nameInputRef} autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
                onBlur={saveName} onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setNameVal(column.name); setEditingName(false); } }}
                className="text-slate-700 text-sm font-semibold bg-white border border-blue-400 rounded px-1.5 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500" />
            ) : (
              <span className="text-slate-700 truncate cursor-pointer hover:text-blue-600" onClick={() => { if (!locked) { setEditingName(true); } }}>
                {column.name}
              </span>
            )}
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-200 text-slate-600 shrink-0">{taskCount}</span>
          </div>
          {/* WIP */}
          {showWip && column.wipLimit != null && !editingWip && (
            <div className="text-xs text-slate-500 font-normal mt-1 cursor-pointer hover:text-blue-600"
              onClick={() => { setWipVal(column.wipLimit != null ? String(column.wipLimit) : ""); setEditingWip(true); }}>
              WIP: {taskCount} / {column.wipLimit}
            </div>
          )}
          {showWip && editingWip && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-slate-500">WIP:</span>
              <input ref={wipInputRef} autoFocus value={wipVal} onChange={e => setWipVal(e.target.value)}
                onBlur={saveWip} onKeyDown={e => { if (e.key === "Enter") saveWip(); if (e.key === "Escape") { setWipVal(column.wipLimit != null ? String(column.wipLimit) : ""); setEditingWip(false); } }}
                className="w-12 text-xs bg-white border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="∞" />
            </div>
          )}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onAddAfter(index)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Добавить колонку после">
            <Plus size={14} />
          </button>
          {!locked && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors" title="Настройки колонки">
                <Settings size={14} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[180px]">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <label className="text-xs font-medium text-slate-500">Системный тип</label>
                      <select value={column.systemType || ""} onChange={e => { onUpdate(column.id, "systemType", e.target.value); setShowMenu(false); }}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {Object.entries(COLUMN_TYPE_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                    {showWip && (
                      <div className="px-3 py-2 border-b border-slate-100">
                        <label className="text-xs font-medium text-slate-500">WIP-лимит</label>
                        <input type="number" min="0" value={wipVal} onChange={e => setWipVal(e.target.value)}
                          onBlur={() => { saveWip(); }}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Без лимита" />
                      </div>
                    )}
                    <button onClick={() => { onRemove(column.id); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <Trash2 size={14} /> Удалить колонку
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </th>
  );
}

// ── Swimlane Row ────────────────────────────────────────────

function SwimlaneRow({
  swimlane, columns, tasks, userCache, moveTask, onAddTask, canAddTaskInColumn, getAddTaskHint, returnUrl,
}: {
  swimlane: ComputedSwimlane;
  columns: ColumnResponse[];
  tasks: TaskResponse[];
  userCache: Map<string, UserProfileResponse>;
  moveTask: (taskId: string, columnId: string, swimlaneId: string | null) => void;
  onAddTask: (columnId: string, swimlaneId: string | null) => void;
  canAddTaskInColumn?: (col: ColumnResponse) => boolean;
  getAddTaskHint?: (col: ColumnResponse) => string | undefined;
  returnUrl?: string;
}) {
  const swimlaneTasks = tasks.filter((t) => swimlane.taskIds.has(t.id));

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
            {swimlane.wipLimit != null && (
              <div className="text-xs text-slate-500 font-normal mt-1">
                WIP: {swimlaneTasks.length} / {swimlane.wipLimit}
              </div>
            )}
          </div>
        </div>
      </td>
      {columns.map((column) => {
        const cellTasks = tasks.filter((t) => t.columnId === column.id && swimlane.taskIds.has(t.id));
        return (
          <td key={column.id} className="p-4 align-top bg-slate-50">
            <DropZone columnId={column.id} swimlaneId={null} moveTask={moveTask}
              onAddTask={() => onAddTask(column.id, null)}
              canAddTask={canAddTaskInColumn ? canAddTaskInColumn(column) : true}
              addTaskHint={getAddTaskHint?.(column)}>
              {cellTasks.map((task) => (
                <TaskCard key={task.id} task={task} userCache={userCache} moveTask={moveTask} returnUrl={returnUrl} />
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

export default function Board({ boardId, projectId, projectType, onBoardChanged }: BoardProps) {
  const navigate = useNavigate();
  const [columns, setColumns] = useState<ColumnResponse[]>([]);
  const [computedSwimlanes, setComputedSwimlanes] = useState<ComputedSwimlane[]>([]);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [userCache, setUserCache] = useState<Map<string, UserProfileResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ assignees: [], priorities: [], tags: [] });
  const [columnError, setColumnError] = useState<{ message: string; dismissible: boolean } | null>(null);
  const [activeSprintName, setActiveSprintName] = useState<string | null>(null);
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);

  const isScrum = projectType === "scrum";

  const loadData = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const [boardMeta, cols, backendSwims] = await Promise.all([
        getBoard(boardId),
        getBoardColumns(boardId),
        getBoardSwimlanes(boardId),
      ]);
      setColumns(cols.sort((a, b) => a.order - b.order));

      // Load sprints for Scrum and for sprint field resolution
      let allSprints: SprintResponse[] = [];
      let boardTasks: TaskResponse[] = [];

      if (projectId) {
        try {
          allSprints = await getProjectSprints(projectId).catch(() => []);

          if (isScrum) {
            const activeSprint = allSprints.find(s => s.status === "active");
            if (activeSprint) {
              setActiveSprintName(activeSprint.name);
              setActiveSprintId(activeSprint.id);
              const sprintTasks = await getSprintTasks(activeSprint.id).catch(() => [] as TaskResponse[]);
              const colIds = new Set(cols.map(c => c.id));
              const initialCol = cols.find(c => c.systemType === "initial");
              boardTasks = sprintTasks
                .filter(t => t.boardId === boardId)
                .map(t => {
                  if (!t.columnId || !colIds.has(t.columnId)) {
                    return { ...t, columnId: initialCol?.id ?? cols[0]?.id ?? null };
                  }
                  return t;
                })
                .filter(t => t.columnId !== null);
            } else {
              setActiveSprintName(null);
              setActiveSprintId(null);
              boardTasks = [];
            }
          } else {
            const t = await searchTasks({ projectId });
            const colIds = new Set(cols.map((c) => c.id));
            boardTasks = t.filter((task) => colIds.has(task.columnId));
          }
        } catch { /**/ }
      }
      setTasks(boardTasks);

      // Load user cache
      const userIds = new Set<string>();
      boardTasks.forEach((task) => { if (task.executorUserId) userIds.add(task.executorUserId); });
      const cache = new Map<string, UserProfileResponse>();
      await Promise.allSettled(
        [...userIds].map(async (uid) => {
          try { const u = await getUser(uid); cache.set(uid, u); } catch { /**/ }
        })
      );

      // Compute swimlanes from field values
      const groupByFieldId = boardMeta.swimlaneGroupBy;
      if (groupByFieldId && boardTasks.length >= 0) {
        const boardFields = await getBoardFields(boardId).catch(() => [] as BoardField[]);
        // Virtual "tags" field when __tags__ is selected
        const field: BoardField | undefined = groupByFieldId === "__tags__"
          ? { id: "__tags__", name: "Теги", fieldType: "tags", isSystem: true, isRequired: false, options: null }
          : boardFields.find(f => f.id === groupByFieldId);
        if (field) {
          // For custom fields, load field values per task
          let fvMap = new Map<string, TaskFieldValue[]>();
          if (!field.isSystem && boardTasks.length > 0) {
            await Promise.allSettled(
              boardTasks.map(async (t) => {
                try {
                  const fvs = await getTaskFieldValues(t.id);
                  fvMap.set(t.id, Array.isArray(fvs) ? fvs : []);
                } catch { /**/ }
              })
            );
          }
          // For user fields on custom fields, resolve additional user IDs
          if ((field.fieldType === "user" || field.fieldType === "user_list") && !field.isSystem) {
            const extraIds = new Set<string>();
            for (const fvs of fvMap.values()) {
              const fv = fvs.find(v => v.fieldId === field.id);
              if (fv?.valueText) fv.valueText.split(",").map(s => s.trim()).filter(Boolean).forEach(id => extraIds.add(id));
            }
            await Promise.allSettled(
              [...extraIds].filter(id => !cache.has(id)).map(async (uid) => {
                try { const u = await getUser(uid); cache.set(uid, u); } catch { /**/ }
              })
            );
          }

          const computed = computeSwimlanesFromTasks(
            boardTasks, field, fvMap, backendSwims.sort((a, b) => a.order - b.order),
            cache, allSprints, boardMeta.priorityOptions,
          );
          setComputedSwimlanes(computed);
        } else {
          setComputedSwimlanes([]);
        }
      } else {
        setComputedSwimlanes([]);
      }

      setUserCache(cache);
    } catch { /**/ } finally {
      setLoading(false);
    }
  }, [boardId, projectId, isScrum]);

  useEffect(() => { loadData(); }, [loadData]);

  const reloadColumns = useCallback(async () => {
    if (!boardId) return;
    try {
      const cols = await getBoardColumns(boardId);
      setColumns(cols.sort((a, b) => a.order - b.order));
    } catch { /**/ }
    onBoardChanged?.();
  }, [boardId, onBoardChanged]);

  // ── Column management ───────────────────────────────────────

  async function handleAddColumnAfter(afterIndex: number) {
    if (!boardId) return;
    const systemType = (afterIndex >= 0 && columns[afterIndex])
      ? columns[afterIndex].systemType || "initial"
      : "initial";
    const order = afterIndex + 2;
    try {
      await createColumn(boardId, { name: "Новая колонка", systemType, order });
      setColumnError(null);
      await reloadColumns();
    } catch (e: any) {
      setColumnError({ message: e.message || "Ошибка создания колонки", dismissible: true });
    }
  }

  async function handleUpdateColumn(colId: string, field: string, value: any) {
    if (!boardId) return;
    if (field === "systemType") {
      const testCols = columns.map(c => c.id === colId ? { ...c, systemType: value } : c);
      const err = validateColumnOrder(testCols);
      if (err) { setColumnError({ message: err, dismissible: true }); return; }
      setColumnError(null);
    }
    if (field === "name" && typeof value === "string" && !value.trim()) {
      setColumnError({ message: "Название колонки не может быть пустым", dismissible: false }); return;
    }
    if (field === "name") setColumnError(null);
    try {
      await updateColumn(boardId, colId, { [field]: value });
      await reloadColumns();
    } catch (e: any) { setColumnError({ message: e.message || "Ошибка обновления колонки", dismissible: true }); }
  }

  async function handleRemoveColumn(colId: string) {
    if (!boardId) return;
    const remaining = columns.filter(c => c.id !== colId);
    const err = validateColumnOrder(remaining);
    if (err) { setColumnError({ message: err, dismissible: true }); return; }
    try {
      await deleteColumn(boardId, colId);
      setColumnError(null);
      await reloadColumns();
    } catch (e: any) { setColumnError({ message: e.message || "Ошибка удаления колонки", dismissible: true }); }
  }

  const moveTask = async (taskId: string, columnId: string, _swimlaneId: string | null) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, columnId } : t));
    try {
      await updateTask(taskId, { columnId });
    } catch (e: any) {
      toast.error(e.message || "Ошибка перемещения задачи");
      loadData(); // rollback
    }
  };

  const moveColumn = (dragIndex: number, hoverIndex: number) => {
    if (isScrum && (dragIndex === 0 || hoverIndex === 0)) return;
    const newCols = [...columns];
    const [dragged] = newCols.splice(dragIndex, 1);
    newCols.splice(hoverIndex, 0, dragged);
    const err = validateColumnOrder(newCols);
    if (err) return; // silently reject invalid drag
    newCols.forEach((c, i) => (c.order = i + 1));
    setColumns(newCols);
    if (boardId) {
      const orders = newCols.map((c, i) => ({ columnId: c.id, order: i + 1 }));
      reorderColumns(boardId, orders).then(() => onBoardChanged?.()).catch(() => reloadColumns());
    }
  };

  const getColumnTaskCount = (columnId: string) => tasks.filter((t) => t.columnId === columnId).length;

  const getFilteredTasks = (columnId: string) => {
    return tasks.filter((t) => t.columnId === columnId);
  };

  const boardReturnUrl = encodeURIComponent(`/projects/${projectId}?tab=boards`);

  const handleAddTask = (columnId: string, swimlaneId: string | null) => {
    if (!boardId || !projectId) return;
    if (isScrum && activeSprintId) {
      navigate(`/tasks/new?projectId=${projectId}&boardId=${boardId}&sprintId=${activeSprintId}&returnUrl=${boardReturnUrl}`);
    } else {
      navigate(`/tasks/new?projectId=${projectId}&boardId=${boardId}&backlog=1&returnUrl=${boardReturnUrl}`);
    }
  };

  // Determine which columns can have the "Add task" button
  const canAddTaskInColumn = (col: ColumnResponse): boolean => {
    if (isScrum) {
      // No active sprint — no task creation allowed
      if (!activeSprintName) return false;
      return col.systemType === "initial" && columns.indexOf(col) === 0;
    }
    return true;
  };

  const getAddTaskHint = (col: ColumnResponse): string | undefined => {
    if (isScrum && canAddTaskInColumn(col) && activeSprintName) {
      return `В бэклог спринта «${activeSprintName}» (текущий активный спринт)`;
    }
    return undefined;
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

  const noActiveSprint = isScrum && !activeSprintName;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4 min-w-0">
        {/* Scrum: no active sprint banner */}
        {noActiveSprint && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle size={20} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Нет активного спринта</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Доска отображает задачи только активного спринта. Перейдите во вкладку «Бэклог и спринты», чтобы создать и запустить спринт.
              </p>
            </div>
          </div>
        )}
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
                options={[...new Set(tasks.map((t) => t.executorUserId).filter(Boolean) as string[])]}
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
                options={computedSwimlanes.map((s) => s.name)}
                selectedValues={filters.tags}
                onToggle={(v) => toggleFilter("tags", v)}
                renderOption={(v) => v}
              />
            </div>
          </div>
        )}

        {/* Column error */}
        {columnError && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-300 rounded-xl text-red-800 text-sm" style={{ overflowAnchor: "none" }}>
            <AlertCircle size={18} className="shrink-0" />
            <span className="flex-1">{columnError.message}</span>
            {columnError.dismissible && (
              <button onClick={() => setColumnError(null)} className="p-0.5 hover:bg-red-100 rounded shrink-0"><X size={16} /></button>
            )}
          </div>
        )}

        {/* Board */}
        <div className="w-full overflow-x-auto">
          <div className="bg-white rounded-xl shadow-md border border-slate-100">
            <table className="border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {computedSwimlanes.length > 0 && (
                    <th className="p-4 text-left font-semibold text-slate-700 w-48 sticky left-0 bg-slate-50 z-10" />
                  )}
                  {columns.map((column, index) => (
                    <ColumnHeader
                      key={column.id}
                      column={column}
                      index={index}
                      columns={columns}
                      moveColumn={moveColumn}
                      taskCount={getColumnTaskCount(column.id)}
                      isScrum={isScrum}
                      onUpdate={handleUpdateColumn}
                      onAddAfter={handleAddColumnAfter}
                      onRemove={handleRemoveColumn}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {computedSwimlanes.length > 0 ? (
                  computedSwimlanes.map((swimlane) => (
                    <SwimlaneRow
                      key={swimlane.key}
                      swimlane={swimlane}
                      columns={columns}
                      tasks={tasks}
                      userCache={userCache}
                      moveTask={moveTask}
                      onAddTask={handleAddTask}
                      canAddTaskInColumn={canAddTaskInColumn}
                      getAddTaskHint={getAddTaskHint}
                      returnUrl={boardReturnUrl}
                    />
                  ))
                ) : (
                  <tr>
                    {columns.map((column) => {
                      const cellTasks = getFilteredTasks(column.id);
                      return (
                        <td key={column.id} className="p-4 align-top bg-slate-50">
                          <DropZone
                            columnId={column.id}
                            swimlaneId={null}
                            moveTask={moveTask}
                            onAddTask={() => handleAddTask(column.id, null)}
                            canAddTask={canAddTaskInColumn(column)}
                            addTaskHint={getAddTaskHint(column)}
                          >
                            {cellTasks.map((task) => (
                              <TaskCard key={task.id} task={task} userCache={userCache} moveTask={moveTask} returnUrl={boardReturnUrl} />
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
