import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Plus,
  User,
  X,
  GripVertical,
  Trash2,
  Loader2,
  Settings,
  Check,
  AlertCircle,
  StickyNote,
} from "lucide-react";
import { FilterDropdown } from "../components/FilterDropdown";
import { toast } from "sonner";
import { UserAvatar } from "../components/UserAvatar";
import {
  getBoard, getBoardColumns, getBoardSwimlanes, getBoardFields, getBoardNotes, createColumnNote, createSwimlaneNote, updateNote, deleteNote,
  createColumn, updateColumn, deleteColumn, reorderColumns, createSwimlane, updateSwimlane, reorderSwimlanes,
  type BoardResponse, type BoardField, type ColumnResponse, type SwimlaneResponse, type NoteResponse,
} from "../api/boards";
import { searchTasks, updateTask, type TaskResponse } from "../api/tasks";
import { getTaskFieldValues, setTaskFieldValue, type TaskFieldValue } from "../api/field-values";
import { getProjectSprints, getSprintTasks, type SprintResponse } from "../api/sprints";
import { getUser, type UserProfileResponse } from "../api/users";
import { getTaskWatchers } from "../api/watchers";
import { getProjectMembers, type ProjectMemberResponse } from "../api/projects";

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
  onSwimlanesComputed?: (count: number) => void;
  canEditTasks?: boolean;
  canEditBoard?: boolean;
}

const FILTERABLE_TYPES = new Set(["priority", "select", "checkbox", "multiselect", "user", "user_list", "tags"]);

// ── Computed Swimlanes ────────────────────────────────────────

interface ComputedSwimlane {
  key: string;
  name: string;
  value?: string | null;
  taskIds: Set<string>;
  wipLimit: number | null;
  backendId?: string;
  order?: number;
}

function getTaskValueForField(
  task: TaskResponse,
  field: BoardField,
  fieldValuesMap: Map<string, TaskFieldValue[]>,
  watcherMap?: Map<string, string[]>,
): string | null {
  if (field.isSystem) {
    switch (field.fieldType) {
      case "priority": return task.priority || null;
      case "user": {
        const n = field.name.toLowerCase();
        if (n.includes("автор") || n.includes("owner")) return task.ownerUserId || null;
        return task.executorUserId || null;
      }
      case "user_list": {
        const watchers = watcherMap?.get(task.id);
        return watchers && watchers.length > 0 ? watchers.sort().join(", ") : null;
      }
      case "estimation": return task.estimation || null;
      case "datetime": return task.deadline || null;
      case "tags": {
        const names = task.tags?.map(t => t.name).sort();
        return names && names.length > 0 ? names.join(", ") : null;
      }
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
  watcherMap?: Map<string, string[]>,
): ComputedSwimlane[] {
  const backendMap = new Map(backendSwimlanes.map(s => [s.name, s]));
  const make = (name: string, ids: string[], value?: string | null): ComputedSwimlane => {
    const backend = backendMap.get(name);
    return {
      key: name, name, value: value !== undefined ? value : name,
      taskIds: new Set(ids),
      wipLimit: backend?.wipLimit ?? null,
      backendId: backend?.id,
      order: backend?.order,
    };
  };
  const sortByOrder = (lanes: ComputedSwimlane[]) =>
    lanes.sort((a, b) => {
      if (a.order != null && b.order != null) return a.order - b.order;
      if (a.order != null) return -1;
      if (b.order != null) return 1;
      return 0;
    });
  const getVal = (t: TaskResponse) => getTaskValueForField(t, field, fieldValuesMap, watcherMap);
  const resolveUser = (id: string) => userCache.get(id)?.fullName || id;
  const resolveSprint = (id: string) => sprints.find(s => s.id === id)?.name || id;
  const addMissingBackendLanes = (lanes: ComputedSwimlane[]) => {
    const usedNames = new Set(lanes.map(l => l.name));
    for (const [name, backend] of backendMap) {
      if (!usedNames.has(name)) {
        lanes.push({ key: name, name, taskIds: new Set(), wipLimit: backend.wipLimit ?? null, backendId: backend.id, order: backend.order });
      }
    }
  };

  // Checkbox: always 2 lanes
  if (field.fieldType === "checkbox") {
    const lanes = [
      make(`${field.name}: да`, tasks.filter(t => getVal(t) === "true").map(t => t.id), "true"),
      make(`${field.name}: нет`, tasks.filter(t => getVal(t) !== "true").map(t => t.id), "false"),
    ];
    addMissingBackendLanes(lanes);
    return sortByOrder(lanes);
  }

  // Select / Priority: fixed lanes from options
  if (field.fieldType === "select" || field.fieldType === "priority") {
    const opts = (field.fieldType === "priority" && priorityOptions?.length ? priorityOptions : field.options) || [];
    const lanes = opts.map(opt => make(opt, tasks.filter(t => getVal(t) === opt).map(t => t.id)));
    const assigned = new Set(opts);
    const unmatched = tasks.filter(t => { const v = getVal(t); return v == null || !assigned.has(v); });
    if (unmatched.length > 0) lanes.push(make("Значение не задано", unmatched.map(t => t.id), null));
    addMissingBackendLanes(lanes);
    return sortByOrder(lanes);
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
    const lanes = [...groups.entries()].map(([val, ids]) => make(resolve(val), ids, val));
    if (nullIds.length > 0) lanes.push(make("Значение не задано", nullIds, null));
    return sortByOrder(lanes);
  }

  // Multiselect / User list / Sprint list / Tags: group by unique combinations
  if (field.fieldType === "multiselect" || field.fieldType === "user_list" || field.fieldType === "sprint_list" || field.fieldType === "tags") {
    const groups = new Map<string, { ids: string[]; raw: string }>();
    const nullIds: string[] = [];
    for (const task of tasks) {
      const raw = getVal(task);
      if (!raw) { nullIds.push(task.id); continue; }
      const parts = raw.split(",").map(s => s.trim()).filter(Boolean).sort();
      if (parts.length === 0) { nullIds.push(task.id); continue; }
      const resolve = field.fieldType === "user_list" ? resolveUser : field.fieldType === "sprint_list" ? resolveSprint : (v: string) => v;
      const displayKey = parts.map(resolve).join(", ");
      if (!groups.has(displayKey)) groups.set(displayKey, { ids: [], raw: parts.join(",") });
      groups.get(displayKey)!.ids.push(task.id);
    }
    const lanes = [...groups.entries()].map(([key, { ids, raw }]) => make(key, ids, raw));
    if (nullIds.length > 0) lanes.push(make("Значение не задано", nullIds, null));
    return sortByOrder(lanes);
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
  if (nullIds.length > 0) lanes.push(make("Значение не задано", nullIds, null));
  return sortByOrder(lanes);
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

function TaskCard({ task, userCache, moveTask, returnUrl, canDrag = true }: {
  task: TaskResponse;
  userCache: Map<string, UserProfileResponse>;
  moveTask: (taskId: string, columnId: string, swimlaneId: string | null) => void;
  returnUrl?: string;
  canDrag?: boolean;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType.TASK,
    item: { id: task.id, columnId: task.columnId, swimlaneId: task.swimlaneId },
    canDrag,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const executor = task.executorUserId ? userCache.get(task.executorUserId) : null;

  return (
    <Link
      to={`/tasks/${task.id}${returnUrl ? `?returnUrl=${returnUrl}` : ""}`}
      ref={drag}
      className={`bg-white p-3 rounded-lg shadow-md border border-slate-200 hover:shadow-xl hover:border-blue-400 transition-all ${canDrag ? "cursor-move" : "cursor-pointer"} flex items-center gap-3 ${
        isDragging ? "opacity-50 scale-95" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-slate-500 font-semibold">{task.key}</span>
          {task.priority && (
            <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{task.priority}</span>
          )}
        </div>
        <p className="text-sm font-medium hover:text-blue-600 truncate">{task.name}</p>
      </div>
      <div className="shrink-0">
        {executor ? (
          <UserAvatar user={toAvatarUser(executor)} size="sm" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
            <User size={14} className="text-slate-400" />
          </div>
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
  onUpdate, onAddAfter, onRemove, note, onSaveNote, readOnly = false,
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
  note: string | null;
  onSaveNote: (val: string | null) => void;
  readOnly?: boolean;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType.COLUMN,
    item: { index },
    canDrag: !readOnly,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: ItemType.COLUMN,
    hover: (item: { index: number }) => {
      if (readOnly) return;
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
            {editingName && !readOnly ? (
              <input ref={nameInputRef} autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
                onBlur={saveName} onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setNameVal(column.name); setEditingName(false); } }}
                className="text-slate-700 text-sm font-semibold bg-white border border-blue-400 rounded px-1.5 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500" />
            ) : (
              <span className={`text-slate-700 truncate ${!readOnly && !locked ? "cursor-pointer hover:text-blue-600" : ""}`} onClick={() => { if (!locked && !readOnly) { setEditingName(true); } }}>
                {column.name}
              </span>
            )}
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-200 text-slate-600 shrink-0">{taskCount}</span>
          </div>
          {/* WIP */}
          {showWip && column.wipLimit != null && !editingWip && (
            <div className={`text-xs text-slate-500 font-normal mt-1 ${!readOnly ? "cursor-pointer hover:text-blue-600" : ""}`}
              onClick={() => { if (!readOnly) { setWipVal(column.wipLimit != null ? String(column.wipLimit) : ""); setEditingWip(true); } }}>
              WIP: {taskCount} / {column.wipLimit}
            </div>
          )}
          {showWip && editingWip && !readOnly && (
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
        {!readOnly && (
        <div className="flex items-center gap-0.5 shrink-0">
          <NotePopover note={note} onSave={onSaveNote} />
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
        )}
      </div>
    </th>
  );
}

// ── Swimlane Row ────────────────────────────────────────────

function SwimlaneRow({
  swimlane, index, columns, tasks, userCache, moveTask, onAddTask, canAddTaskInColumn, getAddTaskHint, returnUrl, moveSwimlane, canDrag, note, onSaveNote, isScrum, onUpdateWip, canEditTasks = true,
}: {
  swimlane: ComputedSwimlane;
  index: number;
  columns: ColumnResponse[];
  tasks: TaskResponse[];
  userCache: Map<string, UserProfileResponse>;
  moveTask: (taskId: string, columnId: string, swimlaneId: string | null) => void;
  onAddTask: (columnId: string, swimlaneId: string | null) => void;
  canAddTaskInColumn?: (col: ColumnResponse) => boolean;
  getAddTaskHint?: (col: ColumnResponse) => string | undefined;
  returnUrl?: string;
  moveSwimlane: (dragIndex: number, hoverIndex: number) => void;
  canDrag: boolean;
  note: string | null;
  onSaveNote?: (val: string | null) => void;
  isScrum?: boolean;
  onUpdateWip?: (swimlaneId: string, value: number | null) => void;
  canEditTasks?: boolean;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType.SWIMLANE,
    item: { index },
    canDrag: () => canDrag,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
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

  const swimlaneTasks = tasks.filter((t) => swimlane.taskIds.has(t.id));
  const showWip = !isScrum && !!swimlane.backendId;
  const canEditWip = showWip && !!onUpdateWip;

  const [editingWip, setEditingWip] = useState(false);
  const [wipVal, setWipVal] = useState(swimlane.wipLimit != null ? String(swimlane.wipLimit) : "");

  function saveWip() {
    const parsed = wipVal.trim() === "" ? null : parseInt(wipVal, 10);
    if (parsed !== null && isNaN(parsed)) { setWipVal(swimlane.wipLimit != null ? String(swimlane.wipLimit) : ""); }
    else if (parsed !== swimlane.wipLimit && onUpdateWip && swimlane.backendId) onUpdateWip(swimlane.backendId, parsed);
    setEditingWip(false);
  }

  return (
    <tr ref={(node) => drag(drop(node))} className={`border-b border-slate-200 ${isDragging ? "opacity-50" : ""}`}>
      <td className="p-4 font-semibold align-top sticky left-0 z-10 border-r-2 border-slate-300 bg-slate-100">
        <div className="flex items-start gap-2">
          <GripVertical size={18} className={`flex-shrink-0 mt-1 ${canDrag ? "text-slate-400 cursor-move" : "text-slate-200 cursor-default"}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-700">{swimlane.name}</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-200 text-slate-600">{swimlaneTasks.length}</span>
              {onSaveNote && <NotePopover note={note} onSave={onSaveNote} align="left" />}
            </div>
            {showWip && swimlane.wipLimit != null && !editingWip && (
              <div className={`text-xs text-slate-500 font-normal mt-1 ${canEditWip ? "cursor-pointer hover:text-blue-600" : ""}`}
                onClick={() => { if (canEditWip) { setWipVal(swimlane.wipLimit != null ? String(swimlane.wipLimit) : ""); setEditingWip(true); } }}>
                WIP: {swimlaneTasks.length} / {swimlane.wipLimit}
              </div>
            )}
            {showWip && editingWip && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-slate-500">WIP:</span>
                <input autoFocus value={wipVal} onChange={e => setWipVal(e.target.value)}
                  onBlur={saveWip} onKeyDown={e => { if (e.key === "Enter") saveWip(); if (e.key === "Escape") { setWipVal(swimlane.wipLimit != null ? String(swimlane.wipLimit) : ""); setEditingWip(false); } }}
                  className="w-12 text-xs bg-white border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="∞" />
              </div>
            )}
          </div>
        </div>
      </td>
      {columns.map((column) => {
        const cellTasks = tasks.filter((t) => t.columnId === column.id && swimlane.taskIds.has(t.id));
        return (
          <td key={column.id} className="p-4 align-top bg-slate-50">
            <DropZone columnId={column.id} swimlaneId={swimlane.backendId ?? null} moveTask={moveTask}
              onAddTask={() => onAddTask(column.id, swimlane.backendId ?? null)}
              canAddTask={canAddTaskInColumn ? canAddTaskInColumn(column) : true}
              addTaskHint={getAddTaskHint?.(column)}>
              {cellTasks.map((task) => (
                <TaskCard key={task.id} task={task} userCache={userCache} moveTask={moveTask} returnUrl={returnUrl} canDrag={canEditTasks} />
              ))}
            </DropZone>
          </td>
        );
      })}
    </tr>
  );
}


// ── Note Popover ───────────────────────────────────────────

function NotePopover({ note, onSave, align = "right" }: { note: string | null; onSave: (val: string | null) => void; align?: "left" | "right" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(note ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalValue(note ?? ""); }, [note]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleChange(val: string) {
    setLocalValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { onSave(val || null); }, 600);
  }

  function handleClear() {
    setLocalValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onSave(null);
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`p-1 rounded transition-colors ${note ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"}`}
        title={note ? "Редактировать заметку" : "Добавить заметку"}
      >
        <StickyNote size={14} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className={`absolute top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-3 w-64 ${align === "left" ? "left-0" : "right-0"}`} onClick={(e) => e.stopPropagation()}>
            <label className="block text-xs font-medium text-slate-500 mb-1">Заметка</label>
            <div className="relative">
              <textarea
                value={localValue}
                onChange={(e) => handleChange(e.target.value)}
                rows={3}
                className="w-full px-3 py-1.5 pr-7 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Правила, пояснения..."
                autoFocus
              />
              {localValue && (
                <button onClick={handleClear} className="absolute right-2 top-1.5 p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors" title="Очистить">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Board Component ────────────────────────────────────

export default function Board({ boardId, projectId, projectType, onBoardChanged, onSwimlanesComputed, canEditTasks = true, canEditBoard = true }: BoardProps) {
  const navigate = useNavigate();
  const onBoardChangedRef = useRef(onBoardChanged);
  onBoardChangedRef.current = onBoardChanged;
  const onSwimlanesComputedRef = useRef(onSwimlanesComputed);
  onSwimlanesComputedRef.current = onSwimlanesComputed;
  const [columns, setColumns] = useState<ColumnResponse[]>([]);
  const [computedSwimlanes, setComputedSwimlanes] = useState<ComputedSwimlane[]>([]);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [userCache, setUserCache] = useState<Map<string, UserProfileResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [filterFields, setFilterFields] = useState<BoardField[]>([]);
  const [fieldValuesMap, setFieldValuesMap] = useState<Map<string, TaskFieldValue[]>>(new Map());
  const [watcherMap, setWatcherMap] = useState<Map<string, string[]>>(new Map());
  const [allSprints, setAllSprints] = useState<SprintResponse[]>([]);
  const [swimlaneField, setSwimlaneField] = useState<BoardField | null>(null);
  const [notes, setNotes] = useState<NoteResponse[]>([]);
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
      boardTasks.forEach((task) => {
        if (task.executorUserId) userIds.add(task.executorUserId);
        if (task.ownerUserId) userIds.add(task.ownerUserId);
      });
      const cache = new Map<string, UserProfileResponse>();
      await Promise.allSettled(
        [...userIds].map(async (uid) => {
          try { const u = await getUser(uid); cache.set(uid, u); } catch { /**/ }
        })
      );

      // Load board fields and custom field values (for swimlanes + filters)
      const boardFields = await getBoardFields(boardId).catch(() => [] as BoardField[]);
      const filterable = boardFields.filter(f => FILTERABLE_TYPES.has(f.fieldType) && f.fieldType !== "column" && !f.name.toLowerCase().includes("статус"));
      // Add virtual tags field if not in board fields
      if (!boardFields.some(f => f.fieldType === "tags")) {
        filterable.push({ id: "__tags__", name: "Теги", fieldType: "tags", isSystem: true, isRequired: false, options: null });
      }
      setFilterFields(filterable);

      // Load custom field values for all tasks (needed for filters + swimlanes)
      let fvMap = new Map<string, TaskFieldValue[]>();
      const hasCustomFilterable = filterable.some(f => !f.isSystem);
      if ((hasCustomFilterable || boardMeta.swimlaneGroupBy) && boardTasks.length > 0) {
        await Promise.allSettled(
          boardTasks.map(async (t) => {
            try {
              const fvs = await getTaskFieldValues(t.id);
              fvMap.set(t.id, Array.isArray(fvs) ? fvs : []);
            } catch { /**/ }
          })
        );
      }
      setFieldValuesMap(fvMap);
      setAllSprints(allSprints);

      // Resolve extra user IDs from custom user/user_list fields
      const userFieldIds = filterable.filter(f => (f.fieldType === "user" || f.fieldType === "user_list") && !f.isSystem);
      if (userFieldIds.length > 0) {
        const extraIds = new Set<string>();
        for (const fvs of fvMap.values()) {
          for (const uf of userFieldIds) {
            const fv = fvs.find(v => v.fieldId === uf.id);
            if (fv?.valueText) fv.valueText.split(",").map(s => s.trim()).filter(Boolean).forEach(id => extraIds.add(id));
          }
        }
        await Promise.allSettled(
          [...extraIds].filter(id => !cache.has(id)).map(async (uid) => {
            try { const u = await getUser(uid); cache.set(uid, u); } catch { /**/ }
          })
        );
      }

      // Load watchers if swimlane groups by system user_list field (watchers)
      const groupByFieldId = boardMeta.swimlaneGroupBy;
      let wMap = new Map<string, string[]>();
      if (groupByFieldId && projectId && boardTasks.length > 0) {
        const watcherField = boardFields.find(f => f.id === groupByFieldId && f.fieldType === "user_list" && f.isSystem)
          || filterable.find(f => f.id === groupByFieldId && f.fieldType === "user_list" && f.isSystem);
        if (watcherField) {
          const members = await getProjectMembers(projectId).catch(() => [] as ProjectMemberResponse[]);
          const memberToUser = new Map(members.map(m => [m.id, m.userId]));
          await Promise.allSettled(
            boardTasks.map(async (t) => {
              try {
                const watchers = await getTaskWatchers(t.id);
                const uIds = watchers.map(w => memberToUser.get(w.memberId)).filter((id): id is string => !!id);
                if (uIds.length > 0) wMap.set(t.id, uIds);
              } catch { /**/ }
            })
          );
          const watcherUserIds = new Set<string>();
          for (const ids of wMap.values()) ids.forEach(id => watcherUserIds.add(id));
          await Promise.allSettled(
            [...watcherUserIds].filter(id => !cache.has(id)).map(async (uid) => {
              try { const u = await getUser(uid); cache.set(uid, u); } catch { /**/ }
            })
          );
        }
      }
      setWatcherMap(wMap);

      // Compute swimlanes from field values
      if (groupByFieldId) {
        const swimField: BoardField | undefined = groupByFieldId === "__tags__"
          ? filterable.find(f => f.id === "__tags__")
          : boardFields.find(f => f.id === groupByFieldId);
        setSwimlaneField(swimField || null);
        if (swimField) {
          const computed = computeSwimlanesFromTasks(
            boardTasks, swimField, fvMap, backendSwims.sort((a, b) => a.order - b.order),
            cache, allSprints, boardMeta.priorityOptions, wMap,
          );

          // For dynamic field types: remove stale backend swimlanes not in computed set
          const isDynamic = !["select", "priority", "checkbox"].includes(swimField.fieldType);
          if (isDynamic) {
            const computedNames = new Set(computed.map(s => s.name));
            for (const bs of backendSwims) {
              if (!computedNames.has(bs.name)) {
                try { await deleteSwimlane(boardId, bs.id); } catch { /**/ }
              }
            }
          }

          // Auto-create backend swimlanes for computed lanes without backendId
          const lanesToCreate = computed.filter(s => !s.backendId);
          if (lanesToCreate.length > 0) {
            let maxOrder = Math.max(0, ...computed.filter(s => s.order != null).map(s => s.order!));
            for (const lane of lanesToCreate) {
              try {
                const created = await createSwimlane(boardId, { name: lane.name, order: ++maxOrder });
                lane.backendId = created.id;
                lane.order = maxOrder;
              } catch { /**/ }
            }
          }

          // Notify parent if backend swimlanes changed
          if (isDynamic || lanesToCreate.length > 0) {
            onBoardChangedRef.current?.();
          }

          setComputedSwimlanes(computed);
          onSwimlanesComputedRef.current?.(computed.length);
        } else {
          setComputedSwimlanes([]);
          onSwimlanesComputedRef.current?.(0);
        }
      } else {
        setSwimlaneField(null);
        setComputedSwimlanes([]);
        onSwimlanesComputedRef.current?.(0);
      }

      setUserCache(cache);

      // Load notes
      const boardNotes = await getBoardNotes(boardId).catch(() => [] as NoteResponse[]);
      setNotes(boardNotes);
    } catch { /**/ } finally {
      setLoading(false);
    }
  }, [boardId, projectId, isScrum]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Note helpers ──────────────────────────────────────────────

  const loadNotes = useCallback(async () => {
    if (!boardId) return;
    try { setNotes(await getBoardNotes(boardId)); } catch { /**/ }
  }, [boardId]);

  const getColumnNote = (colId: string): string | null =>
    notes.find(n => n.columnId === colId)?.content ?? null;

  const getSwimlaneNote = (swId: string | undefined): string | null =>
    swId ? (notes.find(n => n.swimlaneId === swId)?.content ?? null) : null;

  const saveColumnNote = async (colId: string, content: string | null) => {
    const existing = notes.find(n => n.columnId === colId);
    try {
      if (content) {
        if (existing) await updateNote(existing.id, content);
        else await createColumnNote(colId, content);
      } else if (existing) {
        await deleteNote(existing.id);
      }
      await loadNotes();
      onBoardChanged?.();
    } catch { /**/ }
  };

  const saveSwimlaneNote = async (swId: string, content: string | null) => {
    const existing = notes.find(n => n.swimlaneId === swId);
    try {
      if (content) {
        if (existing) await updateNote(existing.id, content);
        else await createSwimlaneNote(swId, content);
      } else if (existing) {
        await deleteNote(existing.id);
      }
      await loadNotes();
      onBoardChanged?.();
    } catch { /**/ }
  };

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

  async function handleUpdateSwimlane(swimId: string, field: string, value: any) {
    if (!boardId) return;
    if (field === "wipLimit") {
      setComputedSwimlanes(prev => prev.map(s => s.backendId === swimId ? { ...s, wipLimit: value } : s));
    }
    try {
      await updateSwimlane(boardId, swimId, { [field]: value });
      onBoardChanged?.();
    } catch (e: any) {
      toast.error(e.message || "Ошибка обновления дорожки");
      if (field === "wipLimit") loadData();
    }
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

  const moveTask = async (taskId: string, columnId: string, swimlaneId: string | null) => {
    if (!canEditTasks) return;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, columnId } : t));

    // Find if task moved to a different swimlane and determine the target field value
    const targetLane = swimlaneId ? computedSwimlanes.find(s => s.backendId === swimlaneId) : null;
    const currentLane = swimlaneId ? computedSwimlanes.find(s => s.taskIds.has(taskId)) : null;
    const swimlaneChanged = targetLane && currentLane && targetLane.backendId !== currentLane.backendId;

    if (swimlaneId) {
      setComputedSwimlanes((prev) => prev.map((s) => {
        const newTaskIds = new Set(s.taskIds);
        if (s.backendId === swimlaneId) newTaskIds.add(taskId);
        else newTaskIds.delete(taskId);
        return { ...s, taskIds: newTaskIds };
      }));
    }
    try {
      await updateTask(taskId, { columnId, swimlaneId });

      // Update underlying field value when moving between swimlanes
      if (swimlaneChanged && swimlaneField && targetLane.value !== undefined) {
        const ft = swimlaneField.fieldType;
        const val = targetLane.value;
        if (swimlaneField.isSystem) {
          if (ft === "priority") await updateTask(taskId, { priority: val });
          else if (ft === "estimation") await updateTask(taskId, { estimation: val });
        } else {
          const data: { valueText?: string | null; valueNumber?: number | null; valueDatetime?: string | null } = {};
          if (ft === "number") data.valueNumber = val ? Number(val) : null;
          else if (ft === "datetime") data.valueDatetime = val || null;
          else data.valueText = val || null;
          await setTaskFieldValue(taskId, swimlaneField.id, data);
        }
      }
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

  const moveSwimlane = (dragIndex: number, hoverIndex: number) => {
    const newLanes = [...computedSwimlanes];
    const [dragged] = newLanes.splice(dragIndex, 1);
    newLanes.splice(hoverIndex, 0, dragged);
    newLanes.forEach((lane, i) => { lane.order = i + 1; });
    setComputedSwimlanes(newLanes);
    if (boardId && newLanes.every(l => l.backendId)) {
      const orders = newLanes.map((l, i) => ({ swimlaneId: l.backendId!, order: i + 1 }));
      reorderSwimlanes(boardId, orders).then(() => onBoardChanged?.()).catch(() => loadData());
    }
  };

  const getColumnTaskCount = (columnId: string) => filteredTasks.filter((t) => t.columnId === columnId).length;

  const getFilteredTasks = (columnId: string) => {
    return filteredTasks.filter((t) => t.columnId === columnId);
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
    if (!canEditTasks) return false;
    if (isScrum) {
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

  const toggleFilter = (fieldId: string, value: string) => {
    setFilters((prev) => {
      const current = prev[fieldId] || [];
      return {
        ...prev,
        [fieldId]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  };

  const clearFilters = () => setFilters({});
  const hasActiveFilters = Object.values(filters).some((f) => f.length > 0);

  // Build filter options for each filterable field
  const getFilterOptions = (field: BoardField): { value: string; label: string }[] => {
    const seen = new Map<string, string>(); // value → label
    for (const task of tasks) {
      const raw = getTaskValueForField(task, field, fieldValuesMap, watcherMap);
      if (raw == null) continue;
      if (field.fieldType === "multiselect" || field.fieldType === "user_list" || field.fieldType === "sprint_list" || field.fieldType === "tags") {
        for (const part of raw.split(",").map(s => s.trim()).filter(Boolean)) {
          if (!seen.has(part)) {
            let label = part;
            if (field.fieldType === "user_list" || (field.fieldType === "user" && field.isSystem)) label = userCache.get(part)?.fullName || part;
            else if (field.fieldType === "sprint_list") label = allSprints.find(s => s.id === part)?.name || part;
            seen.set(part, label);
          }
        }
      } else {
        if (!seen.has(raw)) {
          let label = raw;
          if (field.fieldType === "user") label = userCache.get(raw)?.fullName || raw;
          else if (field.fieldType === "sprint") label = allSprints.find(s => s.id === raw)?.name || raw;
          else if (field.fieldType === "checkbox") label = raw === "true" ? "Да" : "Нет";
          seen.set(raw, label);
        }
      }
    }
    // For select/priority with predefined options, include all options even if unused
    if ((field.fieldType === "select" || field.fieldType === "priority") && field.options) {
      for (const opt of field.options) {
        if (!seen.has(opt)) seen.set(opt, opt);
      }
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  };

  // Check if a task passes all active filters
  const taskPassesFilters = (task: TaskResponse): boolean => {
    for (const [fieldId, selectedValues] of Object.entries(filters)) {
      if (selectedValues.length === 0) continue;
      const field = filterFields.find(f => f.id === fieldId);
      if (!field) continue;
      const raw = getTaskValueForField(task, field, fieldValuesMap, watcherMap);
      if (field.fieldType === "multiselect" || field.fieldType === "user_list" || field.fieldType === "sprint_list" || field.fieldType === "tags") {
        const parts = raw ? raw.split(",").map(s => s.trim()).filter(Boolean) : [];
        if (!parts.some(p => selectedValues.includes(p))) return false;
      } else {
        if (!raw || !selectedValues.includes(raw)) return false;
      }
    }
    return true;
  };

  const filteredTasks = hasActiveFilters ? tasks.filter(taskPassesFilters) : tasks;

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
        {tasks.length > 0 && filterFields.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Фильтры</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium">
                  <X size={12} /> Сбросить
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {filterFields.map((field) => {
                const opts = getFilterOptions(field);
                if (opts.length === 0) return null;
                return (
                  <FilterDropdown
                    key={field.id}
                    label={field.name}
                    options={opts.map(o => o.value)}
                    selectedValues={filters[field.id] || []}
                    onToggle={(v) => toggleFilter(field.id, v)}
                    renderOption={(v) => opts.find(o => o.value === v)?.label || v}
                  />
                );
              })}
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
                      note={getColumnNote(column.id)}
                      onSaveNote={canEditBoard ? (val) => saveColumnNote(column.id, val) : () => {}}
                      readOnly={!canEditBoard}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {computedSwimlanes.length > 0 ? (
                  (() => {
                    const canDrag = computedSwimlanes.length > 1 && computedSwimlanes.every(s => !!s.backendId);
                    return computedSwimlanes.map((swimlane, index) => (
                      <SwimlaneRow
                        key={swimlane.key}
                        swimlane={swimlane}
                        index={index}
                        columns={columns}
                        tasks={filteredTasks}
                        userCache={userCache}
                        moveTask={moveTask}
                        onAddTask={handleAddTask}
                        canAddTaskInColumn={canAddTaskInColumn}
                        getAddTaskHint={getAddTaskHint}
                        returnUrl={boardReturnUrl}
                        moveSwimlane={moveSwimlane}
                        canDrag={canDrag}
                        note={getSwimlaneNote(swimlane.backendId)}
                        onSaveNote={canEditBoard && swimlane.backendId ? (val) => saveSwimlaneNote(swimlane.backendId!, val) : undefined}
                        isScrum={isScrum}
                        onUpdateWip={(swimId, value) => handleUpdateSwimlane(swimId, "wipLimit", value)}
                        canEditTasks={canEditTasks}
                      />
                    ));
                  })()
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
                              <TaskCard key={task.id} task={task} userCache={userCache} moveTask={moveTask} returnUrl={boardReturnUrl} canDrag={canEditTasks} />
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
