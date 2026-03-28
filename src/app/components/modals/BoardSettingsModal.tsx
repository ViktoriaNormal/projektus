import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import {
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
  type ColumnResponse,
  type SwimlaneResponse,
  type BoardField,
  type ProjectReferences,
} from "../../api/boards";

// ── NoteTextarea (exact copy from template editor) ──────────

function NoteTextarea({ value, onSave }: { value: string | null; onSave: (val: string | null) => void }) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, []);

  useEffect(() => { setLocalValue(value ?? ""); }, [value]);

  function handleChange(newVal: string) {
    setLocalValue(newVal);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { onSave(newVal || null); }, 600);
  }

  function handleClear() {
    setLocalValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onSave(null);
  }

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => { handleChange(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
        rows={1}
        className="w-full px-3 py-1.5 pr-8 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none overflow-hidden"
        placeholder="Правила работы, пояснения для команды..."
      />
      {localValue && (
        <button onClick={handleClear} className="absolute right-2 top-1.5 p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors" title="Очистить заметку">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

const SYSTEM_FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Текст", number: "Число", datetime: "Дата и время", select: "Выпадающий список",
  multiselect: "Множественный выбор", checkbox: "Флажок", user: "Пользователь",
  user_list: "Список пользователей", column: "Текущая колонка на доске задач или статус отмены задачи",
  priority: "Выбор из списка", estimation: "Оценка", sprint: "Итерация разработки", tags: "Метки",
};

function buildFieldTypeLabels(refs: ProjectReferences): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of refs.fieldTypes) map[t.key] = t.name;
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

// ── Types ───────────────────────────────────────────────────

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

// ── Main Modal ──────────────────────────────────────────────

export default function BoardSettingsModal({
  isOpen, onClose, boardId, boardName, boardDescription, projectType, refs, onBoardUpdated,
}: BoardSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"params" | "columns" | "swimlanes" | "template">("params");

  // Board params
  const [editName, setEditName] = useState(boardName);
  const [editDescription, setEditDescription] = useState(boardDescription);

  // Columns
  const [columns, setColumns] = useState<ColumnResponse[]>([]);
  const [columnError, setColumnError] = useState("");

  // Swimlanes
  const [swimlanes, setSwimlanes] = useState<SwimlaneResponse[]>([]);

  // Board fields (system + custom)
  const [boardFields, setBoardFields] = useState<BoardField[]>([]);

  // Custom field form
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState("");

  // Priority editing
  const [editingValues, setEditingValues] = useState(false);
  const [valueInput, setValueInput] = useState("");
  const [editedValues, setEditedValues] = useState<string[]>([]);

  const isScrum = projectType === "scrum";

  useEffect(() => { setEditName(boardName); setEditDescription(boardDescription); }, [boardName, boardDescription]);

  // ── Data loading ──────────────────────────────────────────

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
    try { const f = await getBoardFields(boardId); setBoardFields(f.sort((a, b) => a.order - b.order)); } catch { /**/ }
  }, [boardId]);

  // Derived: custom fields and priority field
  const customFields = boardFields.filter(f => !f.isSystem);
  const priorityRefName = refs?.systemTaskFields?.find((f: any) => f.key === "priority")?.name;
  const priorityField = boardFields.find(f => f.isSystem && f.name === priorityRefName && f.fieldType === "select");

  useEffect(() => {
    if (!editingValues && priorityField) {
      setEditedValues(priorityField.options || []);
    }
  }, [priorityField?.options, editingValues]);

  useEffect(() => {
    if (isOpen && boardId) { loadColumns(); loadSwimlanes(); loadBoardFields(); }
  }, [isOpen, boardId]);

  if (!isOpen || !refs) return null;

  const FIELD_TYPE_LABELS = buildFieldTypeLabels(refs);
  const COLUMN_TYPE_LABELS = buildColumnSystemTypeLabels(refs);
  const priorityTypeLabels = buildPriorityTypeLabels(refs);
  const pt = isScrum ? "scrum" : "kanban";
  const systemFields = refs.systemTaskFields.filter((f) => f.availableFor.includes(pt));
  const availablePriorityTypes = refs.priorityTypeOptions.filter((o) => o.availableFor.includes(pt));
  const availableEstimationUnits = refs.estimationUnits.filter((u) => u.availableFor.includes(pt));
  const columnSystemTypes = refs.columnSystemTypes || [];

  // ── Board params handlers ─────────────────────────────────

  async function saveBoardParams(patch: Partial<{ name: string; description: string }>) {
    try { await updateBoard(boardId, patch); onBoardUpdated(); } catch (e: any) { toast.error(e.message || "Ошибка сохранения"); }
  }

  // ── Column handlers ───────────────────────────────────────

  async function addCol() {
    try { await createColumn(boardId, { name: "Новая колонка", systemType: "in_progress", order: columns.length + 1 }); await loadColumns(); } catch (e: any) { toast.error(e.message || "Ошибка"); }
  }

  async function updateCol(colId: string, field: string, value: any) {
    try { await updateColumn(boardId, colId, { [field]: value }); await loadColumns(); } catch (e: any) { toast.error(e.message || "Ошибка"); }
  }

  async function removeCol(colId: string) {
    try { await deleteColumn(boardId, colId); await loadColumns(); } catch (e: any) { toast.error(e.message || "Ошибка"); }
  }

  async function moveCol(colId: string, dir: "up" | "down") {
    const idx = columns.findIndex((c) => c.id === colId);
    if (idx < 0) return;
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= columns.length) return;
    const newCols = [...columns];
    [newCols[idx], newCols[newIdx]] = [newCols[newIdx], newCols[idx]];
    const orders = newCols.map((c, i) => ({ columnId: c.id, order: i + 1 }));
    setColumns(newCols.map((c, i) => ({ ...c, order: i + 1 })));
    try { await reorderColumns(boardId, orders); } catch { /**/ }
  }

  // ── Swimlane handlers ─────────────────────────────────────

  async function addSwim() {
    try { await createSwimlane(boardId, { name: "Новая дорожка", order: swimlanes.length + 1 }); await loadSwimlanes(); } catch (e: any) { toast.error(e.message || "Ошибка"); }
  }

  async function updateSwim(swId: string, field: string, value: any) {
    try { await updateSwimlane(boardId, swId, { [field]: value }); await loadSwimlanes(); } catch (e: any) { toast.error(e.message || "Ошибка"); }
  }

  async function removeSwim(swId: string) {
    try { await deleteSwimlane(boardId, swId); await loadSwimlanes(); } catch (e: any) { toast.error(e.message || "Ошибка"); }
  }

  async function moveSwim(swId: string, dir: "up" | "down") {
    const idx = swimlanes.findIndex((s) => s.id === swId);
    if (idx < 0) return;
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= swimlanes.length) return;
    const ns = [...swimlanes];
    [ns[idx], ns[newIdx]] = [ns[newIdx], ns[idx]];
    const orders = ns.map((s, i) => ({ swimlaneId: s.id, order: i + 1 }));
    setSwimlanes(ns.map((s, i) => ({ ...s, order: i + 1 })));
    try { await reorderSwimlanes(boardId, orders); } catch { /**/ }
  }

  // ── Custom field handlers ─────────────────────────────────

  function addFieldOption() {
    if (optionInput.trim() && !newFieldOptions.includes(optionInput.trim())) {
      setNewFieldOptions([...newFieldOptions, optionInput.trim()]); setOptionInput("");
    }
  }

  async function handleAddField() {
    if (!newFieldName.trim()) return;
    try {
      await createBoardField(boardId, {
        name: newFieldName.trim(), fieldType: newFieldType, isRequired: newFieldRequired,
        order: customFields.length + 1,
        options: ["select", "multiselect"].includes(newFieldType) ? newFieldOptions : undefined,
      });
      setNewFieldName(""); setNewFieldType("text"); setNewFieldRequired(false); setNewFieldOptions([]); setShowAddFieldForm(false);
      await loadBoardFields();
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  }

  async function removeField(fieldId: string) {
    try { await deleteBoardField(boardId, fieldId); await loadBoardFields(); } catch (e: any) { toast.error(e.message || "Ошибка"); }
  }

  // ── Priority handlers ─────────────────────────────────────

  function addValue() {
    if (valueInput.trim() && !editedValues.includes(valueInput.trim())) {
      setEditedValues([...editedValues, valueInput.trim()]); setValueInput("");
    }
  }

  async function saveValues() {
    if (!priorityField) return;
    try {
      await updateBoardField(boardId, priorityField.id, { options: editedValues });
      await loadBoardFields(); setEditingValues(false);
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  }

  async function handlePriorityTypeChange(type: string) {
    try { await updateBoard(boardId, { priorityType: type }); onBoardUpdated(); } catch (e: any) { toast.error(e.message || "Ошибка"); }
  }

  async function handleEstimationUnitChange(unit: string) {
    try { await updateBoard(boardId, { estimationUnit: unit }); onBoardUpdated(); } catch (e: any) { toast.error(e.message || "Ошибка"); }
  }

  // ── LockedField helper ────────────────────────────────────

  const LockedField = ({ name, description }: { name: string; description?: string }) => (
    <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center gap-3">
      <Lock size={14} className="text-slate-400 shrink-0" />
      <div className="flex-1">
        <span className="text-sm font-medium">{name}</span>
        {description && <span className="text-xs text-slate-500 ml-2">{description}</span>}
      </div>
      <span className="text-xs text-slate-400">Обязательный</span>
    </div>
  );

  const tabs = [
    { key: "params" as const, icon: Sliders, label: "Параметры" },
    { key: "columns" as const, icon: Columns, label: `Колонки (${columns.length})` },
    { key: "swimlanes" as const, icon: Layers, label: `Дорожки (${swimlanes.length})` },
    { key: "template" as const, icon: FileText, label: "Шаблон задачи" },
  ];

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
          <h2 className="text-xl font-bold">Настройки доски</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 shrink-0">
          <div className="flex gap-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                  activeTab === tab.key ? "bg-purple-100 text-purple-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ═══ PARAMS TAB ═══ */}
          {activeTab === "params" && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium mb-2">Название доски <span className="text-red-500">*</span></label>
                <NoteTextarea value={editName} onSave={(val) => { setEditName(val ?? ""); saveBoardParams({ name: val ?? "" }); }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Описание доски</label>
                <NoteTextarea value={editDescription} onSave={(val) => { setEditDescription(val ?? ""); saveBoardParams({ description: val ?? "" }); }} />
              </div>
            </div>
          )}

          {/* ═══ COLUMNS TAB ═══ */}
          {activeTab === "columns" && (
            <div className="space-y-4">
              {/* Ordering rule */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Правило порядка колонок:</p>
                    <p>
                      Колонки с системным типом <strong>«{COLUMN_TYPE_LABELS["initial"]}»</strong> должны располагаться перед колонками с системным типом <strong>«{COLUMN_TYPE_LABELS["in_progress"]}»</strong>,
                      а те — перед колонками с системным типом <strong>«{COLUMN_TYPE_LABELS["completed"]}»</strong>.
                      Между колонками с системными типами «{COLUMN_TYPE_LABELS["initial"]}» и «{COLUMN_TYPE_LABELS["completed"]}» обязательно должна быть хотя бы одна колонка с системным типом «{COLUMN_TYPE_LABELS["in_progress"]}».
                    </p>
                  </div>
                </div>
              </div>

              {columnError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span className="flex-1">{columnError}</span>
                  <button onClick={() => setColumnError("")} className="p-0.5 hover:bg-red-100 rounded"><X size={16} /></button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Настройте колонки доски задач. К каждой колонке можно добавить заметку.</p>
                  {isScrum && (
                    <p className="text-xs text-purple-600 mt-1">Scrum: колонка «Бэклог спринта» обязательна и всегда первая.</p>
                  )}
                </div>
                <button onClick={addCol} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shrink-0">
                  <Plus size={18} /> Добавить колонку
                </button>
              </div>

              <div className="space-y-3">
                {columns.map((col, index) => {
                  const locked = !!col.isLocked;
                  return (
                    <div key={col.id} className={`p-4 border rounded-lg ${locked ? "border-purple-200 bg-purple-50/50" : "border-slate-200 bg-slate-50"}`}>
                      <div className={`grid grid-cols-1 gap-3 ${isScrum ? "md:grid-cols-5" : "md:grid-cols-6"}`}>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium mb-1">
                            Название колонки * {locked && <Lock size={12} className="inline ml-1 text-purple-500" />}
                          </label>
                          <input type="text" value={col.name}
                            onChange={(e) => updateCol(col.id, "name", e.target.value)}
                            disabled={locked}
                            className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${locked ? "bg-slate-100 text-slate-500" : ""}`}
                            placeholder="Название..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Системный тип *</label>
                          <select value={col.systemType || ""}
                            onChange={(e) => updateCol(col.id, "systemType", e.target.value)}
                            disabled={locked}
                            className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${locked ? "bg-slate-100 text-slate-500" : ""}`}
                          >
                            {Object.entries(COLUMN_TYPE_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                        {!isScrum && (
                          <div>
                            <label className="block text-xs font-medium mb-1">WIP лимит</label>
                            <input type="number" value={col.wipLimit ?? ""}
                              onChange={(e) => updateCol(col.id, "wipLimit", e.target.value ? Number(e.target.value) : null)}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Без лимита"
                            />
                          </div>
                        )}
                        <div className="flex items-end gap-1">
                          {!locked ? (
                            <>
                              <button onClick={() => moveCol(col.id, "up")} disabled={index === 0 || (isScrum && index === 1)} className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUp size={16} /></button>
                              <button onClick={() => moveCol(col.id, "down")} disabled={index === columns.length - 1} className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDown size={16} /></button>
                              <button onClick={() => removeCol(col.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                            </>
                          ) : (
                            <span className="text-xs text-purple-500 flex items-center gap-1 p-2"><Lock size={14} /> Закреплена</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-xs font-medium mb-1 text-slate-500">Заметка</label>
                        <NoteTextarea value={col.note ?? null} onSave={(val) => updateCol(col.id, "note", val)} />
                      </div>
                    </div>
                  );
                })}

                {columns.length === 0 && (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                    <Columns size={48} className="mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-600 mb-4">Нет колонок</p>
                    <button onClick={addCol} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">Добавить первую колонку</button>
                  </div>
                )}
              </div>

              {/* System types reference */}
              <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Системные типы колонок</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  {columnSystemTypes.map((t) => (
                    <div key={t.key}>
                      <span className="font-medium">{t.name}</span> — {t.description}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ SWIMLANES TAB ═══ */}
          {activeTab === "swimlanes" && (
            <div className="space-y-4">
              <div className="mb-6">
                <h3 className="font-semibold text-slate-700 mb-2">Группировка задач в дорожки</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Дорожки автоматически создаются на основе уникальных значений выбранного параметра задачи.
                  К каждой дорожке можно добавить заметку.
                </p>
                <button onClick={addSwim} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm">
                  <Plus size={16} /> Добавить дорожку
                </button>
              </div>

              {swimlanes.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-700">Дорожки ({swimlanes.length})</h3>
                  {swimlanes.map((sw, index) => (
                    <div key={sw.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium mb-1">Название дорожки</label>
                          <NoteTextarea value={sw.name} onSave={(val) => updateSwim(sw.id, "name", val ?? "")} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">WIP лимит</label>
                          <input type="number" value={sw.wipLimit ?? ""}
                            onChange={(e) => updateSwim(sw.id, "wipLimit", e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Без лимита"
                          />
                        </div>
                        <div className="flex items-end gap-1">
                          <button onClick={() => moveSwim(sw.id, "up")} disabled={index === 0} className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUp size={16} /></button>
                          <button onClick={() => moveSwim(sw.id, "down")} disabled={index === swimlanes.length - 1} className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDown size={16} /></button>
                          <button onClick={() => removeSwim(sw.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-xs font-medium mb-1 text-slate-500">Заметка</label>
                        <NoteTextarea value={sw.note ?? null} onSave={(val) => updateSwim(sw.id, "note", val)} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                  <Layers size={48} className="mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600 mb-2">Дорожки не используются</p>
                  <p className="text-sm text-slate-500">Нажмите кнопку выше, чтобы добавить дорожку</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ TEMPLATE TAB ═══ */}
          {activeTab === "template" && (
            <div className="space-y-6">
              {/* System fields */}
              <div>
                <h3 className="text-lg font-bold mb-1">Системные параметры задач</h3>
                <p className="text-sm text-slate-500 mb-4">Эти параметры являются обязательными и не могут быть убраны.</p>
                <div className="space-y-2">
                  {systemFields.filter((f) => f.key !== "priority" && f.key !== "estimation" && f.key !== "sprint").map((f) => (
                    <LockedField key={f.key} name={f.name} description={SYSTEM_FIELD_TYPE_LABELS[f.fieldType] || f.fieldType} />
                  ))}

                  {/* Priority / Service Class */}
                  <div className="p-4 border border-purple-200 rounded-lg bg-purple-50/50">
                    <div className="flex items-center gap-3 mb-3">
                      <Lock size={14} className="text-purple-500 shrink-0" />
                      <span className="text-sm font-medium">{priorityTypeLabels[availablePriorityTypes[0]?.key] || "Приоритет"}</span>
                      <span className="text-xs text-slate-400">Обязательный</span>
                    </div>
                    {availablePriorityTypes.length > 1 && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-600 mb-2">Тип параметра:</p>
                        <div className="flex gap-2">
                          {availablePriorityTypes.map((opt) => (
                            <button key={opt.key} onClick={() => handlePriorityTypeChange(opt.key)}
                              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${opt.key === (availablePriorityTypes[0]?.key) ? "bg-purple-600 text-white border-purple-600" : "border-slate-200 hover:bg-slate-50"}`}
                            >
                              {opt.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-600">Значения:</p>
                        {!editingValues && (
                          <button onClick={() => { setEditingValues(true); setEditedValues(priorityField?.options || []); }} className="text-xs text-purple-600 hover:text-purple-800">Изменить</button>
                        )}
                      </div>
                      {editingValues ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {editedValues.map((val) => (
                              <span key={val} className="px-2 py-1 bg-white border border-slate-200 rounded text-sm flex items-center gap-1.5">
                                {val}
                                <button onClick={() => setEditedValues(editedValues.filter((v) => v !== val))} className="hover:text-red-600"><X size={12} /></button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input type="text" value={valueInput} onChange={(e) => setValueInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addValue())}
                              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Новое значение..."
                            />
                            <button onClick={addValue} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg"><Plus size={16} /></button>
                          </div>
                          <p className="text-xs text-slate-400">Введите значение и нажмите <strong>+</strong> (или Enter).</p>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingValues(false)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Отмена</button>
                            <button onClick={saveValues} className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">Сохранить</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {(priorityField?.options || []).map((val) => (
                            <span key={val} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs">{val}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estimation */}
                  <div className="p-4 border border-purple-200 rounded-lg bg-purple-50/50">
                    <div className="flex items-center gap-3 mb-3">
                      <Lock size={14} className="text-purple-500 shrink-0" />
                      <span className="text-sm font-medium">Оценка трудозатрат</span>
                      <span className="text-xs text-slate-400">Обязательный</span>
                    </div>
                    {availableEstimationUnits.length > 1 ? (
                      <div>
                        <p className="text-xs text-slate-600 mb-2">Единица измерения:</p>
                        <div className="flex gap-2">
                          {availableEstimationUnits.map((unit) => (
                            <button key={unit.key} onClick={() => handleEstimationUnitChange(unit.key)}
                              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${unit.key === availableEstimationUnits[0]?.key ? "bg-purple-600 text-white border-purple-600" : "border-slate-200 hover:bg-slate-50"}`}
                            >
                              {unit.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Единица измерения: {availableEstimationUnits[0]?.name || "время"}</p>
                    )}
                  </div>

                  {/* Sprint */}
                  {systemFields.find((f) => f.key === "sprint") && (
                    <LockedField name="Спринт" description="Итерация разработки" />
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
                      <div className="flex items-center gap-2"><MessageCircle size={14} className="shrink-0" /> Комментирование с @упоминаниями</div>
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
                  {!showAddFieldForm && (
                    <button onClick={() => setShowAddFieldForm(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
                      <Plus size={18} /> Добавить параметр
                    </button>
                  )}
                </div>

                {showAddFieldForm && (
                  <div className="p-4 border-2 border-purple-300 rounded-lg bg-purple-50 mb-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Название параметра *</label>
                          <input type="text" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Например: Отдел"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Тип параметра *</label>
                          <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {["select", "multiselect"].includes(newFieldType) && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Варианты для выбора</label>
                          <div className="flex gap-2 mb-2">
                            <input type="text" value={optionInput} onChange={(e) => setOptionInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFieldOption(); } }}
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Введите вариант..."
                            />
                            <button onClick={addFieldOption} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg"><Plus size={18} /></button>
                          </div>
                          <p className="text-xs text-slate-400">Введите вариант и нажмите <strong>+</strong> (или Enter).</p>
                          {newFieldOptions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {newFieldOptions.map((opt) => (
                                <span key={opt} className="px-2 py-1 bg-white border border-slate-200 rounded text-sm flex items-center gap-2">
                                  {opt}
                                  <button onClick={() => setNewFieldOptions(newFieldOptions.filter((o) => o !== opt))} className="hover:text-red-600"><X size={14} /></button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="cf-req" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} className="w-4 h-4 text-purple-600 rounded" />
                        <label htmlFor="cf-req" className="text-sm">Обязательное поле</label>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => { setShowAddFieldForm(false); setNewFieldName(""); setNewFieldType("text"); setNewFieldRequired(false); setNewFieldOptions([]); }} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">Отмена</button>
                        <button onClick={handleAddField} disabled={!newFieldName.trim()} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">Добавить</button>
                      </div>
                    </div>
                  </div>
                )}

                {customFields.filter((f) => !f.isSystem).length > 0 ? (
                  <div className="space-y-2">
                    {customFields.filter((f) => !f.isSystem).map((field) => (
                      <div key={field.id} className="p-4 border border-slate-200 rounded-lg bg-white flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical size={18} className="text-slate-400" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{field.name}</p>
                              {field.isRequired && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">обязательное</span>}
                              <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">кастомное</span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">Тип: {FIELD_TYPE_LABELS[field.fieldType] || field.fieldType}</p>
                            {field.options && field.options.length > 0 && (
                              <p className="text-xs text-slate-500 mt-1">Варианты: {field.options.join(", ")}</p>
                            )}
                          </div>
                        </div>
                        <button onClick={() => removeField(field.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                    ))}
                  </div>
                ) : !showAddFieldForm ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                    <p className="text-slate-600 mb-3">Нет кастомных параметров</p>
                    <button onClick={() => setShowAddFieldForm(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Добавить первый параметр</button>
                  </div>
                ) : null}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
