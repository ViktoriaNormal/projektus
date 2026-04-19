import { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "../ui/Modal";
import { ResponsiveTabs, type ResponsiveTab } from "../ui/ResponsiveTabs";
import { Select, SelectOption } from "../ui/Select";
import { toastError } from "../../lib/errors";
import { DebouncedInput, DebouncedTextarea, NoteTextarea, WipLimitInput } from "./board-settings/inputs";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Columns,
  Layers,
  FileText,
  Lock,
  Info,
  Sliders,
  AlertCircle,
  Paperclip,
  Tag,
  CheckSquare,
  Link2,
  MessageCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  getBoard,
  updateBoard,
  getBoardColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
  getBoardSwimlanes,
  createSwimlane,
  updateSwimlane,
  deleteSwimlane,
  reorderSwimlanes,
  getBoardFields,
  createBoardField,
  deleteBoardField,
  updateBoardField,
  getBoardNotes,
  createColumnNote,
  createSwimlaneNote,
  updateNote,
  deleteNote,
  type ColumnResponse,
  type SwimlaneResponse,
  type BoardField,
  type NoteResponse,
  type ProjectReferences,
} from "../../api/boards";

// ── Helpers ────────────────────────────────────────────────────

const SYSTEM_FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Текст", number: "Число", datetime: "Дата и время", select: "Выпадающий список",
  multiselect: "Множественный выбор", checkbox: "Флажок", user: "Пользователь",
  user_list: "Список пользователей", column: "Текущая колонка на доске задач или статус отмены задачи",
  priority: "Выбор из списка", estimation: "Оценка", sprint: "Итерация разработки", tags: "Метки",
};

function buildFieldTypeLabels(refs: ProjectReferences, opts?: { projectType?: string; scope?: string }): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of refs.fieldTypes) {
    if (opts?.projectType && t.availableFor && !t.availableFor.includes(opts.projectType)) continue;
    if (opts?.scope && t.allowedScopes && !t.allowedScopes.includes(opts.scope)) continue;
    map[t.key] = t.name;
  }
  return map;
}

function buildPriorityTypeLabels(refs: ProjectReferences): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of refs.priorityTypeOptions) map[t.key] = t.name;
  return map;
}

function buildColumnSystemTypeLabels(refs: ProjectReferences): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of refs.columnSystemTypes) map[t.key] = t.name;
  return map;
}

// ── DebouncedInput ─────────────────────────────────────────────

// Helpers (DebouncedInput, DebouncedTextarea, NoteTextarea, WipLimitInput) extracted to ./board-settings/inputs.tsx

// ── Types ──────────────────────────────────────────────────────

interface BoardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
  boardDescription: string;
  projectType: string;
  refs: ProjectReferences | null;
  onBoardUpdated: () => void;
}

// ── Main Modal ─────────────────────────────────────────────────

export default function BoardSettingsModal({
  isOpen, onClose, boardId, boardName, boardDescription, projectType, refs, onBoardUpdated,
}: BoardSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"params" | "columns" | "swimlanes" | "template">("params");

  // Columns
  const [columns, setColumns] = useState<ColumnResponse[]>([]);
  const [columnError, setColumnError] = useState<{ colId: string; message: string } | null>(null);

  // Swimlanes
  const [swimlanes, setSwimlanes] = useState<SwimlaneResponse[]>([]);

  // Notes (separate from columns/swimlanes)
  const [notes, setNotes] = useState<NoteResponse[]>([]);

  // Board fields
  const [boardFields, setBoardFields] = useState<BoardField[]>([]);

  // Board-level state for priority/estimation (loaded from parent props, updated via API)
  const [currentBoardName, setCurrentBoardName] = useState(boardName);
  const [currentBoardDescription, setCurrentBoardDescription] = useState(boardDescription);
  const [currentIsDefault, setCurrentIsDefault] = useState(false);
  const [currentPriorityType, setCurrentPriorityType] = useState<string>("");
  const [currentEstimationUnit, setCurrentEstimationUnit] = useState<string>("");
  const [currentSwimlaneGroupBy, setCurrentSwimlaneGroupBy] = useState<string>("");
  const [currentPriorityOptions, setCurrentPriorityOptions] = useState<string[]>([]);

  const isScrum = projectType === "scrum";

  useEffect(() => { setCurrentBoardName(boardName); setCurrentBoardDescription(boardDescription); }, [boardName, boardDescription]);

  // ── Data loading ────────────────────────────────────────────

  const loadColumns = useCallback(async () => {
    if (!boardId) return;
    try { const c = await getBoardColumns(boardId); setColumns(c.sort((a, b) => a.order - b.order)); } catch { /**/ }
  }, [boardId]);

  const loadSwimlanes = useCallback(async () => {
    if (!boardId) return;
    try { const s = await getBoardSwimlanes(boardId); setSwimlanes(s.sort((a, b) => a.order - b.order)); } catch { /**/ }
  }, [boardId]);

  const loadBoardFields = useCallback(async () => {
    if (!boardId) return;
    try { const f = await getBoardFields(boardId); setBoardFields(f); } catch { /**/ }
  }, [boardId]);

  const loadNotes = useCallback(async () => {
    if (!boardId) return;
    try { const n = await getBoardNotes(boardId); setNotes(n); } catch { /**/ }
  }, [boardId]);

  const loadBoardMeta = useCallback(async () => {
    if (!boardId) return;
    try {
      const b = await getBoard(boardId);
      setCurrentIsDefault(b.isDefault ?? false);
      setCurrentPriorityType(b.priorityType || "");
      setCurrentEstimationUnit(b.estimationUnit || "");
      setCurrentSwimlaneGroupBy(b.swimlaneGroupBy || "");
      setCurrentPriorityOptions(b.priorityOptions || []);
      setCurrentBoardName(b.name);
      setCurrentBoardDescription(b.description || "");
    } catch { /**/ }
  }, [boardId]);

  useEffect(() => {
    if (isOpen && boardId) { loadColumns(); loadSwimlanes(); loadBoardFields(); loadNotes(); loadBoardMeta(); }
  }, [isOpen, boardId]);

  if (!isOpen || !refs) return null;

  const COLUMN_TYPE_LABELS = buildColumnSystemTypeLabels(refs);
  const pt = isScrum ? "scrum" : "kanban";
  const columnSystemTypes = refs.columnSystemTypes || [];

  // ── Board params handlers ───────────────────────────────────

  async function saveBoardParams(patch: Partial<{ name: string; description: string | null }>) {
    try { await updateBoard(boardId, patch); onBoardUpdated(); } catch (e: any) { toastError(e, "Ошибка сохранения"); }
  }

  async function handleSetDefault() {
    try {
      await updateBoard(boardId, { isDefault: true });
      setCurrentIsDefault(true);
      onBoardUpdated();
    } catch (e: any) { toastError(e, "Ошибка"); }
  }

  // ── Column handlers ─────────────────────────────────────────

  function getColumnNote(colId: string): string | null {
    return notes.find(n => n.columnId === colId)?.content ?? null;
  }

  function getSwimlaneNote(swId: string): string | null {
    return notes.find(n => n.swimlaneId === swId)?.content ?? null;
  }

  async function saveColumnNote(colId: string, content: string | null) {
    const existing = notes.find(n => n.columnId === colId);
    try {
      if (content) {
        if (existing) { await updateNote(existing.id, content); }
        else { await createColumnNote(colId, content); }
      } else if (existing) {
        await deleteNote(existing.id);
      }
      await loadNotes();
    } catch { /**/ }
  }

  async function saveSwimlaneNote(swId: string, content: string | null) {
    const existing = notes.find(n => n.swimlaneId === swId);
    try {
      if (content) {
        if (existing) { await updateNote(existing.id, content); }
        else { await createSwimlaneNote(swId, content); }
      } else if (existing) {
        await deleteNote(existing.id);
      }
      await loadNotes();
    } catch { /**/ }
  }

  // ── Column order validation (same rules as templates) ────────
  function validateColumnOrder(cols: ColumnResponse[]): string | null {
    if (cols.length === 0) return null;
    // Minimum 1 column of each system type
    const countInitial = cols.filter(c => c.systemType === "initial").length;
    const countInProgress = cols.filter(c => c.systemType === "in_progress").length;
    const countCompleted = cols.filter(c => c.systemType === "completed").length;
    if (countInitial === 0) return `Должна быть минимум одна колонка с типом «${COLUMN_TYPE_LABELS["initial"]}».`;
    if (countInProgress === 0) return `Должна быть минимум одна колонка с типом «${COLUMN_TYPE_LABELS["in_progress"]}».`;
    if (countCompleted === 0) return `Должна быть минимум одна колонка с типом «${COLUMN_TYPE_LABELS["completed"]}».`;
    // Phase ordering
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

  async function addColumnAfter(afterIndex: number) {
    const systemType = (afterIndex >= 0 && columns[afterIndex])
      ? columns[afterIndex].systemType || "initial"
      : "initial";
    const order = afterIndex + 2;
    try {
      await createColumn(boardId, { name: "Новая колонка", systemType, order });
      setColumnError(null);
      await loadColumns();
    } catch (e: any) {
      if (e.code === "INVALID_COLUMN_ORDER") setColumnError({ colId: columns[afterIndex]?.id || "", message: e.message });
      else toastError(e, "Ошибка");
    }
  }

  async function updateCol(colId: string, field: string, value: any) {
    if (field === "systemType") {
      const testCols = columns.map(c => c.id === colId ? { ...c, systemType: value } : c);
      const err = validateColumnOrder(testCols);
      if (err) { setColumnError({ colId, message: err }); return; }
      setColumnError(null);
    }
    try { await updateColumn(boardId, colId, { [field]: value }); await loadColumns(); } catch (e: any) { toastError(e, "Ошибка"); }
  }

  async function removeCol(colId: string) {
    const remaining = columns.filter(c => c.id !== colId);
    const err = validateColumnOrder(remaining);
    if (err) { setColumnError({ colId, message: err }); return; }
    try { await deleteColumn(boardId, colId); setColumnError(null); await loadColumns(); } catch (e: any) { toastError(e, "Ошибка"); }
  }

  async function moveCol(colId: string, dir: "up" | "down") {
    const idx = columns.findIndex(c => c.id === colId);
    if (idx < 0) return;
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= columns.length) return;
    if (isScrum && (idx === 0 || newIdx === 0)) return;
    const newCols = [...columns];
    [newCols[idx], newCols[newIdx]] = [newCols[newIdx], newCols[idx]];
    const err = validateColumnOrder(newCols);
    if (err) { setColumnError({ colId, message: err }); return; }
    setColumnError(null);
    const orders = newCols.map((c, i) => ({ columnId: c.id, order: i + 1 }));
    setColumns(newCols.map((c, i) => ({ ...c, order: i + 1 })));
    try { await reorderColumns(boardId, orders); } catch (e: any) { toastError(e, "Не удалось переместить колонку"); await loadColumns(); }
  }

  // ── Swimlane handlers ───────────────────────────────────────

  async function handleSetSwimlaneGroupBy(val: string) {
    try {
      // Delete existing swimlanes (fetch fresh to include any auto-created ones)
      const freshSwims = await getBoardSwimlanes(boardId);
      for (const sw of freshSwims) {
        try { await deleteSwimlane(boardId, sw.id); } catch { /**/ }
      }

      await updateBoard(boardId, { swimlaneGroupBy: val || null });
      setCurrentSwimlaneGroupBy(val);
      onBoardUpdated();

      // Reload fields + swimlanes to get fresh state
      await loadBoardFields();
      const freshSwimlanes = await getBoardSwimlanes(boardId);
      const freshFields = await getBoardFields(boardId);

      // Auto-create swimlanes if group-by is set and no swimlanes exist
      if (val && freshSwimlanes.length === 0) {
        const field = freshFields.find(f => f.id === val);
        let expectedValues: string[] | null = null;
        if (field) {
          if (field.fieldType === "checkbox") {
            expectedValues = [`${field.name}: да`, `${field.name}: нет`];
          } else if (field.fieldType === "select" || field.fieldType === "priority") {
            const priorityFieldId = freshFields.find(f => f.isSystem && (f.fieldType === "priority" || f.name.toLowerCase().includes("приоритизаци")))?.id;
            if (field.id === priorityFieldId) {
              const defaults = (refs?.priorityTypeOptions || []).find(o => o.key === currentPriorityType)?.defaultValues || [];
              expectedValues = currentPriorityOptions.length > 0 ? currentPriorityOptions : defaults.length > 0 ? defaults : null;
            } else {
              expectedValues = (field.options && field.options.length > 0) ? field.options : null;
            }
          }
        }
        if (expectedValues && expectedValues.length > 0) {
          for (let i = 0; i < expectedValues.length; i++) {
            try { await createSwimlane(boardId, { name: expectedValues[i], order: i + 1 }); } catch { /**/ }
          }
        }
      }

      await loadSwimlanes();
    } catch (e: any) { toastError(e, "Ошибка"); }
  }

  async function updateSwim(swId: string, field: string, value: any) {
    try { await updateSwimlane(boardId, swId, { [field]: value }); await loadSwimlanes(); } catch (e: any) { toastError(e, "Ошибка"); }
  }

  // Sync swimlanes with field options (add missing, remove extras)
  async function syncSwimlanesWithOptions(expectedValues: string[]) {
    if (!currentSwimlaneGroupBy) return;
    const currentNames = new Set(swimlanes.map(s => s.name));
    const expectedSet = new Set(expectedValues);
    // Add missing swimlanes
    for (const val of expectedValues) {
      if (!currentNames.has(val)) {
        try { await createSwimlane(boardId, { name: val, order: swimlanes.length + 1 }); } catch { /**/ }
      }
    }
    // Remove extra swimlanes
    for (const sw of swimlanes) {
      if (!expectedSet.has(sw.name)) {
        try { await deleteSwimlane(boardId, sw.id); } catch { /**/ }
      }
    }
    await loadSwimlanes();
  }

  async function moveSwim(swId: string, dir: "up" | "down") {
    const idx = swimlanes.findIndex(s => s.id === swId);
    if (idx < 0) return;
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= swimlanes.length) return;
    const ns = [...swimlanes];
    [ns[idx], ns[newIdx]] = [ns[newIdx], ns[idx]];
    const orders = ns.map((s, i) => ({ swimlaneId: s.id, order: i + 1 }));
    setSwimlanes(ns.map((s, i) => ({ ...s, order: i + 1 })));
    try { await reorderSwimlanes(boardId, orders); } catch { /**/ }
  }

  // ── Tabs config ─────────────────────────────────────────────

  const tabs = [
    { key: "params" as const, icon: Sliders, label: "Параметры доски" },
    { key: "columns" as const, icon: Columns, label: `Колонки (${columns.length})` },
    { key: "swimlanes" as const, icon: Layers, label: `Дорожки (${swimlanes.length})` },
    { key: "template" as const, icon: FileText, label: "Шаблон задачи" },
  ];

  // ── Render ──────────────────────────────────────────────────

  return (
    <Modal
      open={isOpen}
      onOpenChange={(next) => { if (!next) onClose(); }}
      size="5xl"
      hideCloseButton
      className="overflow-hidden"
    >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
          <h2 className="text-xl font-bold">Настройки доски</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 shrink-0 p-2">
          <ResponsiveTabs
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as typeof activeTab)}
            variant="scroll"
            tabs={tabs.map((t) => ({
              id: t.key,
              label: (<><t.icon size={18} /> {t.label}</>),
              textLabel: t.label,
            })) satisfies ResponsiveTab[]}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "params" && (
            <BoardParamsTab
              name={currentBoardName}
              description={currentBoardDescription}
              isDefault={currentIsDefault}
              onSave={saveBoardParams}
              onSetDefault={handleSetDefault}
            />
          )}
          {activeTab === "columns" && (
            <BoardColumnsTab
              columns={columns}
              isScrum={isScrum}
              error={columnError}
              onDismissError={() => setColumnError(null)}
              onAddAfter={addColumnAfter}
              onUpdate={updateCol}
              onRemove={removeCol}
              onMove={moveCol}
              columnSystemTypeLabels={COLUMN_TYPE_LABELS}
              columnSystemTypes={columnSystemTypes}
              getNote={getColumnNote}
              onSaveNote={saveColumnNote}
            />
          )}
          {activeTab === "swimlanes" && (
            <BoardSwimlanesTab
              swimlaneGroupBy={currentSwimlaneGroupBy}
              swimlanes={swimlanes}
              boardFields={boardFields}
              refs={refs}
              projectType={pt}
              currentPriorityType={currentPriorityType}
              onSetGroupBy={handleSetSwimlaneGroupBy}
              onUpdate={updateSwim}
              onMove={moveSwim}
              getNote={getSwimlaneNote}
              onSaveNote={saveSwimlaneNote}
            />
          )}
          {activeTab === "template" && (
            <BoardTaskTemplateTab
              isScrum={isScrum}
              boardId={boardId}
              boardFields={boardFields}
              currentPriorityType={currentPriorityType}
              currentEstimationUnit={currentEstimationUnit}
              currentSwimlaneGroupBy={currentSwimlaneGroupBy}
              currentPriorityOptions={currentPriorityOptions}
              refs={refs}
              onReload={async () => { await loadBoardFields(); await loadBoardMeta(); await loadSwimlanes(); }}
              onBoardUpdated={onBoardUpdated}
              onClearSwimlaneGroupBy={() => handleSetSwimlaneGroupBy("")}
              onSyncSwimlanes={syncSwimlanesWithOptions}
              setCurrentPriorityType={setCurrentPriorityType}
              setCurrentEstimationUnit={setCurrentEstimationUnit}
              setCurrentPriorityOptions={setCurrentPriorityOptions}
            />
          )}
        </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab: Board Params
// ════════════════════════════════════════════════════════════════

function BoardParamsTab({
  name, description, isDefault, onSave, onSetDefault,
}: {
  name: string;
  description: string;
  isDefault: boolean;
  onSave: (patch: Partial<{ name: string; description: string | null }>) => void;
  onSetDefault: () => void;
}) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <label className="block text-sm font-medium mb-2">Название доски <span className="text-red-500">*</span></label>
        <DebouncedInput
          value={name}
          onSave={(val) => onSave({ name: val })}
          className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
          requiredMessage="Название доски не может быть пустым"
          placeholder="Введите название доски..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Описание доски</label>
        <DebouncedTextarea
          value={description}
          onSave={(val) => onSave({ description: val || null })}
          className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          rows={4}
          placeholder="Для каких задач предназначена доска..."
        />
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="board-default"
          checked={isDefault}
          onChange={() => { if (!isDefault) onSetDefault(); }}
          disabled={isDefault}
          className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
        />
        <label htmlFor="board-default" className="text-sm font-medium">
          Доска по умолчанию
        </label>
        {isDefault && (
          <span className="text-xs text-purple-600">Эта доска открывается при переходе в проект</span>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab: Columns
// ════════════════════════════════════════════════════════════════

function BoardColumnsTab({
  columns, isScrum, error, onDismissError, onAddAfter, onUpdate, onRemove, onMove,
  columnSystemTypeLabels, columnSystemTypes, getNote, onSaveNote,
}: {
  columns: ColumnResponse[];
  isScrum: boolean;
  error: { colId: string; message: string } | null;
  onDismissError: () => void;
  onAddAfter: (afterIndex: number) => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  columnSystemTypeLabels: Record<string, string>;
  columnSystemTypes: ProjectReferences["columnSystemTypes"];
  getNote: (colId: string) => string | null;
  onSaveNote: (colId: string, val: string | null) => void;
}) {
  const addButton = (afterIndex: number) => (
    <div className="flex justify-center py-1">
      <button onClick={() => onAddAfter(afterIndex)}
        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        title="Добавить колонку после"
      >
        <Plus size={18} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Ordering rule */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Правила колонок:</p>
            <p>
              На доске обязательно должна быть минимум одна колонка каждого системного типа: <strong>«{columnSystemTypeLabels["initial"]}»</strong>, <strong>«{columnSystemTypeLabels["in_progress"]}»</strong> и <strong>«{columnSystemTypeLabels["completed"]}»</strong>.
            </p>
            <p className="mt-1">
              Колонки с типом «{columnSystemTypeLabels["initial"]}» должны располагаться перед колонками с типом «{columnSystemTypeLabels["in_progress"]}»,
              а те — перед колонками с типом «{columnSystemTypeLabels["completed"]}».
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm text-slate-600">
          Настройте колонки доски задач. Каждая колонка должна иметь системный тип.
          К каждой колонке можно добавить заметку — например, чтобы зафиксировать правила работы на этом этапе.
        </p>
        {isScrum && (
          <p className="text-xs text-purple-600 mt-1">
            Scrum: колонка «Бэклог спринта» обязательна и всегда первая. В неё переносятся выбранные из бэклога продукта задачи на спринт.
          </p>
        )}
      </div>

      <div className="space-y-1">
        {columns.map((col, index) => {
          const locked = !!col.isLocked;
          const colErr = error?.colId === col.id ? error.message : null;
          return (
            <div key={col.id}>
              <div className={`p-4 border rounded-lg ${colErr ? "border-red-400 ring-2 ring-red-100" : locked ? "border-purple-200 bg-purple-50/50" : "border-slate-200 bg-slate-50"}`}>
                <div className={`grid grid-cols-1 gap-3 ${isScrum ? "md:grid-cols-5" : "md:grid-cols-6"}`}>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1">
                      Название колонки * {locked && <Lock size={12} className="inline ml-1 text-purple-500" />}
                    </label>
                    {locked ? (
                      <input type="text" value={col.name} disabled
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-500"
                      />
                    ) : (
                      <DebouncedInput
                        value={col.name}
                        onSave={(val) => onUpdate(col.id, "name", val)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Название..."
                        required
                        requiredMessage="Название колонки не может быть пустым"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Системный тип *</label>
                    <Select
                      value={col.systemType || ""}
                      onValueChange={(v) => onUpdate(col.id, "systemType", v)}
                      disabled={locked}
                    >
                      {Object.entries(columnSystemTypeLabels).map(([val, label]) => (
                        <SelectOption key={val} value={val}>{String(label)}</SelectOption>
                      ))}
                    </Select>
                  </div>
                  {!isScrum && col.systemType !== "completed" && (
                    <WipLimitInput value={col.wipLimit} onSave={(val) => onUpdate(col.id, "wipLimit", val)} />
                  )}
                  <div className="flex items-end gap-1">
                    {!locked && (
                      <>
                        <button onClick={() => onMove(col.id, "up")} disabled={index === 0 || (isScrum && index === 1)} className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUp size={16} /></button>
                        <button onClick={() => onMove(col.id, "down")} disabled={index === columns.length - 1} className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDown size={16} /></button>
                        <button onClick={() => onRemove(col.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </>
                    )}
                    {locked && (
                      <span className="text-xs text-purple-500 flex items-center gap-1 p-2"><Lock size={14} /> Закреплена</span>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium mb-1 text-slate-500">Заметка</label>
                  <NoteTextarea value={getNote(col.id)} onSave={(val) => onSaveNote(col.id, val)} />
                </div>
                {colErr && (
                  <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <span className="flex-1">{colErr}</span>
                    <button onClick={onDismissError} className="p-0.5 hover:bg-red-100 rounded shrink-0"><X size={14} /></button>
                  </div>
                )}
              </div>
              {addButton(index)}
            </div>
          );
        })}

      </div>

      {/* System types reference */}
      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Системные типы колонок</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
          {columnSystemTypes.map(t => (
            <div key={t.key}><span className="font-medium">{t.name}</span> — {t.description}</div>
          ))}
        </div>
        {!isScrum && (
          <p className="text-xs text-slate-500 mt-2">
            WIP-лимиты (лимиты незавершённой работы) можно задать только для колонок с типами «{columnSystemTypeLabels["initial"]}» и «{columnSystemTypeLabels["in_progress"]}».
            Для колонок с типом «{columnSystemTypeLabels["completed"]}» WIP-лимит не устанавливается, так как задачи в них уже завершены.
          </p>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab: Swimlanes
// ════════════════════════════════════════════════════════════════

function BoardSwimlanesTab({
  swimlaneGroupBy, swimlanes, boardFields, refs, projectType, currentPriorityType,
  onSetGroupBy, onUpdate, onMove, getNote, onSaveNote,
}: {
  swimlaneGroupBy: string;
  swimlanes: SwimlaneResponse[];
  boardFields: BoardField[];
  refs: ProjectReferences;
  projectType: string;
  currentPriorityType: string;
  onSetGroupBy: (val: string) => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  getNote: (swId: string) => string | null;
  onSaveNote: (swId: string, val: string | null) => void;
}) {
  const isScrum = projectType === "scrum";
  const priorityTypeLabel = (refs.priorityTypeOptions || []).find(o => o.key === currentPriorityType)?.name;
  const priorityFieldId = boardFields.find(f => f.isSystem && (f.fieldType === "priority" || f.name.toLowerCase().includes("приоритизаци")))?.id;

  function getFieldDisplayName(f: BoardField): string {
    if (f.id === priorityFieldId && priorityTypeLabel) return priorityTypeLabel;
    return f.name;
  }

  const selectedField = boardFields.find(f => f.id === swimlaneGroupBy);

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="font-semibold text-slate-700 mb-2">Группировка задач в дорожки</h3>
        <p className="text-sm text-slate-600 mb-2">
          Дорожки автоматически создаются на основе уникальных значений выбранного параметра задачи.
          К каждой дорожке можно добавить заметку — например, чтобы описать правила приоритизации или обработки задач в этой категории.
        </p>
        <div>
          <label className="block text-sm font-medium mb-2">Группировать задачи по:</label>
          <Select
            value={swimlaneGroupBy}
            onValueChange={onSetGroupBy}
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

        {swimlaneGroupBy && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Layers size={20} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-purple-900 mb-1">
                  Группировка по {selectedField ? getFieldDisplayName(selectedField) : swimlaneGroupBy}
                </h4>
                <p className="text-sm text-purple-700">
                  Дорожки будут созданы автоматически для каждого значения выбранного параметра.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!swimlaneGroupBy && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
          <Layers size={48} className="mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600 mb-2">Дорожки не используются</p>
          <p className="text-sm text-slate-500">Выберите параметр группировки выше, чтобы использовать дорожки</p>
        </div>
      )}

      {swimlaneGroupBy && swimlanes.length === 0 && (
        <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
          <Layers size={48} className="mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600">Дорожки будут автоматически созданы при появлении задач</p>
          <p className="text-sm text-slate-500 mt-1">Для данного параметра дорожки формируются динамически по значениям задач</p>
        </div>
      )}

      {swimlaneGroupBy && swimlanes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700">Дорожки ({swimlanes.length})</h3>
          {swimlanes.map((sw, index) => (
            <div key={sw.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1">
                    Название дорожки <Lock size={12} className="inline ml-1 text-slate-400" />
                  </label>
                  <input type="text" value={sw.name} disabled
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-600"
                  />
                </div>
                {!isScrum && (
                  <WipLimitInput value={sw.wipLimit} onSave={(val) => onUpdate(sw.id, "wipLimit", val)} />
                )}
                <div className="flex items-end gap-1">
                  <button onClick={() => onMove(sw.id, "up")} disabled={index === 0} className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUp size={16} /></button>
                  <button onClick={() => onMove(sw.id, "down")} disabled={index === swimlanes.length - 1} className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDown size={16} /></button>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium mb-1 text-slate-500">Заметка</label>
                <NoteTextarea value={getNote(sw.id)} onSave={(val) => onSaveNote(sw.id, val)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab: Task Template
// ════════════════════════════════════════════════════════════════

function BoardTaskTemplateTab({
  isScrum, boardId, boardFields, currentPriorityType, currentEstimationUnit,
  currentSwimlaneGroupBy, currentPriorityOptions, refs, onReload, onBoardUpdated, onClearSwimlaneGroupBy,
  onSyncSwimlanes, setCurrentPriorityType, setCurrentEstimationUnit, setCurrentPriorityOptions,
}: {
  isScrum: boolean;
  boardId: string;
  boardFields: BoardField[];
  currentPriorityType: string;
  currentEstimationUnit: string;
  currentSwimlaneGroupBy: string;
  currentPriorityOptions: string[];
  refs: ProjectReferences;
  onReload: () => Promise<void>;
  onBoardUpdated: () => void;
  onClearSwimlaneGroupBy: () => void;
  onSyncSwimlanes: (expectedValues: string[]) => Promise<void>;
  setCurrentPriorityType: (v: string) => void;
  setCurrentEstimationUnit: (v: string) => void;
  setCurrentPriorityOptions: (v: string[]) => void;
}) {
  const projectType = isScrum ? "scrum" : "kanban";
  const FIELD_TYPE_LABELS = buildFieldTypeLabels(refs, { projectType, scope: "board_field" });
  const priorityTypeLabels = buildPriorityTypeLabels(refs);

  const systemFields = boardFields.filter(f => f.isSystem);
  const customFields = boardFields.filter(f => !f.isSystem);

  const priorityField = systemFields.find(f => f.fieldType === "priority")
    || systemFields.find(f => f.name === "Приоритизация" || f.name.toLowerCase().includes("приоритизаци"))
    || null;
  const estimationField = systemFields.find(f => f.fieldType === "estimation")
    || systemFields.find(f => f.name === "Оценка трудозатрат" || f.name.toLowerCase().includes("оценка трудозатрат"))
    || null;
  const sprintField = systemFields.find(f => f.fieldType === "sprint") || null;
  const simpleSystemFields = systemFields.filter(f =>
    f.id !== priorityField?.id && f.id !== estimationField?.id && f.id !== sprintField?.id
  );

  // Custom field form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState("");

  // Priority value editing
  const [valueInput, setValueInput] = useState("");

  // Expanded custom field
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [editFieldOptionInput, setEditFieldOptionInput] = useState("");

  const availableEstimationUnits = refs.estimationUnits.filter(u => u.availableFor.includes(projectType));
  const availablePriorityTypes = refs.priorityTypeOptions.filter(o => o.availableFor.includes(projectType));
  const priorityLabel = priorityTypeLabels[currentPriorityType] || currentPriorityType;

  function getCurrentPriorityValues(): string[] {
    if (currentPriorityOptions.length > 0) return currentPriorityOptions;
    return refs.priorityTypeOptions.find(o => o.key === currentPriorityType)?.defaultValues || [];
  }

  function addOption() {
    if (optionInput.trim() && !newOptions.includes(optionInput.trim())) {
      setNewOptions([...newOptions, optionInput.trim()]); setOptionInput("");
    }
  }

  async function addAndSaveValue() {
    if (!valueInput.trim()) return;
    const trimmed = valueInput.trim();
    const current = getCurrentPriorityValues();
    if (current.includes(trimmed)) { toast.info("Такое значение уже есть"); return; }
    const newOpts = [...current, trimmed];
    try {
      await updateBoard(boardId, { priorityOptions: newOpts });
      setCurrentPriorityOptions(newOpts);
      setValueInput(""); await onReload();
      if (priorityField && currentSwimlaneGroupBy === priorityField.id) await onSyncSwimlanes(newOpts);
    } catch (e: any) { toastError(e, "Не удалось добавить значение"); }
  }

  async function removeValue(val: string) {
    const current = getCurrentPriorityValues();
    const updated = current.filter(v => v !== val);
    if (updated.length === 0) { toast.error("Нельзя удалить последнее значение"); return; }
    try {
      await updateBoard(boardId, { priorityOptions: updated });
      setCurrentPriorityOptions(updated);
      await onReload();
      if (priorityField && currentSwimlaneGroupBy === priorityField.id) await onSyncSwimlanes(updated);
    } catch (e: any) { toastError(e, "Не удалось удалить значение"); }
  }

  async function handlePriorityTypeChange(type: string) {
    const defaults = refs.priorityTypeOptions.find(o => o.key === type)?.defaultValues || [];
    try {
      await updateBoard(boardId, { priorityType: type, priorityOptions: defaults });
      setCurrentPriorityType(type);
      setCurrentPriorityOptions(defaults);
    } catch (e: any) { toastError(e, "Ошибка"); return; }
    // Reset swimlanes if they were grouped by the priority field
    if (priorityField && currentSwimlaneGroupBy === priorityField.id) {
      onClearSwimlaneGroupBy();
    } else {
      onBoardUpdated();
      await onReload();
    }
  }

  async function handleEstimationUnitChange(unit: string) {
    try {
      await updateBoard(boardId, { estimationUnit: unit });
      setCurrentEstimationUnit(unit);
      onBoardUpdated(); await onReload();
    } catch (e: any) { toastError(e, "Ошибка"); }
  }

  async function handleAddCustomField() {
    if (!newName.trim()) return;
    if (boardFields.some(f => f.name.toLowerCase() === newName.trim().toLowerCase())) {
      toast.error(`Параметр задачи с названием «${newName.trim()}» уже существует`);
      return;
    }
    try {
      await createBoardField(boardId, {
        name: newName.trim(), fieldType: newType, isRequired: newRequired,
        options: ["select", "multiselect"].includes(newType) ? newOptions : undefined,
      });
      setNewName(""); setNewType("text"); setNewRequired(false); setNewOptions([]); setShowAddForm(false);
      await onReload();
    } catch (e: any) { toastError(e, "Не удалось добавить параметр"); }
  }

  async function removeCustomField(fieldId: string) {
    const needClearSwimlanes = currentSwimlaneGroupBy === fieldId;
    try {
      await deleteBoardField(boardId, fieldId);
      if (needClearSwimlanes) {
        onClearSwimlaneGroupBy();
      } else {
        await onReload();
      }
    } catch (e: any) { toastError(e, "Ошибка"); }
  }

  async function handleUpdateCustomField(fieldId: string, updates: Partial<{ name: string; isRequired: boolean; options: string[] }>) {
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) return;
      if (boardFields.some(f => f.id !== fieldId && f.name.toLowerCase() === trimmed.toLowerCase())) {
        toast.error(`Параметр задачи с названием «${trimmed}» уже существует`); return;
      }
    }
    try {
      await updateBoardField(boardId, fieldId, updates);
      await onReload();
      if (updates.options && currentSwimlaneGroupBy === fieldId) await onSyncSwimlanes(updates.options);
    } catch (e: any) { toastError(e, "Ошибка"); }
  }

  const LockedField = ({ name, description, isRequired }: { name: string; description?: string; isRequired?: boolean }) => (
    <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center gap-3">
      <Lock size={14} className="text-slate-400 shrink-0" />
      <div className="flex-1">
        <span className="text-sm font-medium">{name}{isRequired && <span className="text-red-500 ml-0.5">*</span>}</span>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* System fields */}
      <div>
        <h3 className="text-lg font-bold mb-1">Системные параметры задач</h3>
        <p className="text-sm text-slate-500 mb-4">Эти параметры являются системными и не могут быть удалены.</p>
        <div className="space-y-2">
          {simpleSystemFields.map(f => (
            <LockedField key={f.id} name={f.name} description={SYSTEM_FIELD_TYPE_LABELS[f.fieldType] || f.fieldType} isRequired={f.isRequired} />
          ))}

          {/* Priority / Service Class */}
          {priorityField && (
            <div className="p-4 border border-purple-200 rounded-lg bg-purple-50/50">
              <div className="flex items-center gap-3 mb-2">
                <Lock size={14} className="text-purple-500 shrink-0" />
                <span className="text-sm font-medium">{priorityLabel}{priorityField.isRequired && <span className="text-red-500 ml-0.5">*</span>}</span>
              </div>
              {availablePriorityTypes.length > 1 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-600 mb-2">Тип параметра:</p>
                  <div className="flex gap-2">
                    {availablePriorityTypes.map(opt => (
                      <button key={opt.key} onClick={() => handlePriorityTypeChange(opt.key)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                          currentPriorityType === opt.key ? "bg-purple-600 text-white border-purple-600" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >{opt.name}</button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-600 mb-2">Значения параметра {priorityLabel}:</p>
                {(() => {
                  const currentValues = getCurrentPriorityValues();
                  return (
                    <>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {currentValues.map(val => (
                          <span key={val} className="px-2 py-1 bg-white border border-slate-200 rounded text-sm flex items-center gap-1.5">
                            {val}
                            <button onClick={() => removeValue(val)} disabled={currentValues.length <= 1}
                              className={currentValues.length <= 1 ? "opacity-30 cursor-not-allowed" : "hover:text-red-600"}
                            ><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={valueInput} onChange={(e) => setValueInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAndSaveValue())}
                          className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Новое значение..."
                        />
                        <button onClick={addAndSaveValue} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg" title="Добавить значение"><Plus size={16} /></button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Estimation */}
          {estimationField && (
            <div className="p-4 border border-purple-200 rounded-lg bg-purple-50/50">
              <div className="flex items-center gap-3 mb-2">
                <Lock size={14} className="text-purple-500 shrink-0" />
                <span className="text-sm font-medium">{estimationField.name}{estimationField.isRequired && <span className="text-red-500 ml-0.5">*</span>}</span>
              </div>
              {availableEstimationUnits.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-600 mb-2">Единица измерения:</p>
                  <div className="flex gap-2">
                    {availableEstimationUnits.map(unit => (
                      <button key={unit.key} onClick={() => handleEstimationUnitChange(unit.key)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                          currentEstimationUnit === unit.key ? "bg-purple-600 text-white border-purple-600" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >{unit.name}</button>
                    ))}
                  </div>
                </div>
              )}
              {(() => {
                const currentUnit = availableEstimationUnits.find(u => u.key === currentEstimationUnit);
                const unitName = currentUnit?.name || currentEstimationUnit;
                const example = currentEstimationUnit === "story_points"
                  ? "Пример: 1, 2, 3, 5, 8, 13 (числа Фибоначчи)"
                  : "Пример: 2ч 30м, 4ч, 1д 2ч (часы и минуты)";
                return <p className="text-xs text-slate-500">Текущая единица: <strong>{unitName}</strong>. {example}</p>;
              })()}
            </div>
          )}

          {/* Sprint */}
          {sprintField && (
            <LockedField name={sprintField.name} description={SYSTEM_FIELD_TYPE_LABELS[sprintField.fieldType] || undefined} isRequired={sprintField.isRequired} />
          )}
        </div>
      </div>

      {/* Built-in features */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 mb-2">Также в задачах предусмотрено:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-blue-800">
              <div className="flex items-center gap-2"><Paperclip size={14} className="shrink-0" /> Прикрепление вложений (файлы, изображения)</div>
              <div className="flex items-center gap-2"><Tag size={14} className="shrink-0" /> Добавление тегов к задачам</div>
              <div className="flex items-center gap-2"><CheckSquare size={14} className="shrink-0" /> Чек-листы</div>
              <div className="flex items-center gap-2"><Link2 size={14} className="shrink-0" /> Связи с другими задачами</div>
              <div className="flex items-center gap-2"><MessageCircle size={14} className="shrink-0" /> Комментирование с призывами пользователей (@упоминания)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Fields */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold">Кастомные параметры</h3>
            <p className="text-sm text-slate-500 mt-1">Добавьте дополнительные параметры для задач на этой доске.</p>
          </div>
          {!showAddForm && (
            <button onClick={() => setShowAddForm(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
              <Plus size={18} /> Добавить параметр
            </button>
          )}
        </div>

        {showAddForm && (
          <div className="p-4 border-2 border-purple-300 rounded-lg bg-purple-50 mb-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Название параметра *</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Например: Отдел"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Тип параметра *</label>
                  <Select value={newType} onValueChange={setNewType}>
                    {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => (
                      <SelectOption key={val} value={val}>{String(label)}</SelectOption>
                    ))}
                  </Select>
                </div>
              </div>
              {["select", "multiselect"].includes(newType) && (
                <div>
                  <label className="block text-sm font-medium mb-1">Варианты для выбора</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={optionInput} onChange={(e) => setOptionInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Введите вариант..."
                    />
                    <button onClick={addOption} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"><Plus size={18} /></button>
                  </div>
                  <p className="text-xs text-slate-400">Введите вариант и нажмите <strong>+</strong> (или Enter), чтобы добавить его в список.</p>
                  {newOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newOptions.map(opt => (
                        <span key={opt} className="px-2 py-1 bg-white border border-slate-200 rounded text-sm flex items-center gap-2">
                          {opt}
                          <button onClick={() => setNewOptions(newOptions.filter(o => o !== opt))} className="hover:text-red-600"><X size={14} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="cf-req" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} className="w-4 h-4 text-purple-600 rounded" />
                <label htmlFor="cf-req" className="text-sm">Обязательное поле</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowAddForm(false); setNewName(""); setNewType("text"); setNewRequired(false); setNewOptions([]); }}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Отмена</button>
                <button onClick={handleAddCustomField} disabled={!newName.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Добавить</button>
              </div>
            </div>
          </div>
        )}

        {customFields.length > 0 ? (
          <div className="space-y-2">
            {customFields.map((field) => {
              const isExpanded = expandedFieldId === field.id;
              return (
                <div key={field.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedFieldId(isExpanded ? null : field.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <GripVertical size={18} className="text-slate-400" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{field.name}</p>
                          {field.isRequired && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">обязательное</span>}
                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">кастомное</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">Тип: {FIELD_TYPE_LABELS[field.fieldType] || field.fieldType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); removeCustomField(field.id); }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Удалить параметр"
                      ><Trash2 size={16} /></button>
                      {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1">Название *</label>
                          <DebouncedInput
                            value={field.name}
                            onSave={(val) => handleUpdateCustomField(field.id, { name: val })}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Название параметра..."
                            required
                            requiredMessage="Название параметра не может быть пустым"
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={field.isRequired}
                              onChange={(e) => handleUpdateCustomField(field.id, { isRequired: e.target.checked })}
                              className="w-4 h-4 text-purple-600 rounded"
                            />
                            <span className="text-sm">Обязательное поле</span>
                          </label>
                        </div>
                      </div>

                      {["select", "multiselect"].includes(field.fieldType) && (
                        <div>
                          <label className="block text-xs font-medium mb-1">Варианты для выбора</label>
                          <div className="flex gap-2 mb-2">
                            <input type="text" value={editFieldOptionInput}
                              onChange={(e) => setEditFieldOptionInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const trimmed = editFieldOptionInput.trim();
                                  if (trimmed && !(field.options || []).includes(trimmed)) {
                                    handleUpdateCustomField(field.id, { options: [...(field.options || []), trimmed] });
                                    setEditFieldOptionInput("");
                                  }
                                }
                              }}
                              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Введите вариант..."
                            />
                            <button onClick={() => {
                              const trimmed = editFieldOptionInput.trim();
                              if (trimmed && !(field.options || []).includes(trimmed)) {
                                handleUpdateCustomField(field.id, { options: [...(field.options || []), trimmed] });
                                setEditFieldOptionInput("");
                              }
                            }}
                              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                            ><Plus size={16} /></button>
                          </div>
                          {field.options && field.options.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {field.options.map(opt => (
                                <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                                  {opt}
                                  <button onClick={() => handleUpdateCustomField(field.id, { options: field.options!.filter(o => o !== opt) })}
                                    className="hover:text-red-600"><X size={12} /></button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : !showAddForm ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
            <p className="text-slate-600 mb-3">Нет кастомных параметров</p>
            <button onClick={() => setShowAddForm(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Добавить первый параметр
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
