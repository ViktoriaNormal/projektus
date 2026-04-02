import { useState, useEffect, useCallback, useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Edit,
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Columns,
  Layers,
  FileText,
  Sliders,
  GripVertical,
  Layout,
  Save,
  Loader2,
  Lock,
  AlertCircle,
  Info,
  Paperclip,
  Tag,
  CheckSquare,
  Link2,
  MessageCircle,
  Shield,
  Users,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  getTemplateReferences,
  getProjectTemplates,
  getProjectTemplate,
  updateProjectTemplate,
  createTemplateBoard,
  updateTemplateBoard,
  deleteTemplateBoard,
  reorderTemplateBoards,
  createTemplateBoardColumn,
  updateTemplateBoardColumn,
  deleteTemplateBoardColumn,
  reorderTemplateBoardColumns,
  createTemplateBoardSwimlane,
  updateTemplateBoardSwimlane,
  deleteTemplateBoardSwimlane,
  reorderTemplateBoardSwimlanes,
  createTemplateBoardField,
  updateTemplateBoardField,
  deleteTemplateBoardField,
  createTemplateProjectParam,
  updateTemplateProjectParam,
  deleteTemplateProjectParam,
  createTemplateRole,
  updateTemplateRole,
  deleteTemplateRole,
  type TemplateReferences,
  type ProjectTemplateDetail,
  type TemplateBoard,
  type TemplateBoardColumn,
  type TemplateBoardSwimlane,
  type TemplateBoardField,
  type TemplateProjectParam,
  type TemplateRole,
  type TemplateRolePermission,
} from "@/app/api/admin";

// ── Types (internal, for UI state) ──────────────────────────

interface TaskField {
  id: string;
  name: string;
  type: "text" | "number" | "datetime" | "select" | "multiselect" | "checkbox" | "user";
  isSystem: boolean;
  isRequired: boolean;
  options?: string[];
}

// ════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════

export default function ProjectTemplates() {
  const [templates, setTemplates] = useState<ProjectTemplateDetail[]>([]);
  const [refs, setRefs] = useState<TemplateReferences | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await getProjectTemplates();
      setTemplates(data);
    } catch (e: any) {
      toast.error(e.message || "Не удалось загрузить шаблоны");
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [tpls, references] = await Promise.all([
          getProjectTemplates(),
          getTemplateReferences(),
        ]);
        setTemplates(tpls);
        setRefs(references);
      } catch (e: any) {
        toast.error(e.message || "Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  if (editingTemplateId && refs) {
    return (
      <TemplateEditor
        templateId={editingTemplateId}
        refs={refs}
        onSave={() => {
          setEditingTemplateId(null);
          loadTemplates();
        }}
        onCancel={() => {
          setEditingTemplateId(null);
          loadTemplates();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Шаблоны проектов</h1>
        <p className="text-slate-600 mt-1">
          Два преднастроенных шаблона для Scrum и Kanban проектов
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            refs={refs}
            onEdit={() => setEditingTemplateId(template.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Template Card (list view) — full board preview
// ════════════════════════════════════════════════════════════════

function TemplateCard({ template, refs, onEdit }: { template: ProjectTemplateDetail; refs: TemplateReferences | null; onEdit: () => void }) {

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-100 hover:shadow-lg transition-all">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-lg">
              <Layout className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{template.name}</h3>
              {template.description && (
                <p className="text-sm text-slate-500 mt-0.5">{template.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onEdit}
            className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
            title="Редактировать"
          >
            <Edit size={18} />
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-slate-500">Тип проекта: </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              template.projectType === "scrum"
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            }`}>
              {template.projectType === "scrum" ? "Scrum" : "Kanban"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Досок: </span>
            <span className="font-semibold">{template.boards.length}</span>
          </div>
        </div>

        {/* Boards preview */}
        <div className="space-y-3">
          {template.boards.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-slate-200 p-6 text-center">
              <p className="text-sm text-slate-500">Доски ещё не добавлены. Нажмите «Редактировать», чтобы настроить шаблон.</p>
            </div>
          )}
          {template.boards.map((board) => {
            const systemFields = board.fields.filter(f => f.isSystem);
            const customFields = board.fields.filter(f => !f.isSystem);

            return (
              <div key={board.id} className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                  <p className="font-semibold text-sm">{board.name}</p>
                  {board.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{board.description}</p>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {/* Columns */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Этапы работы (колонки)
                    </p>
                    {board.columns.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {board.columns.map((col) => (
                          <span
                            key={col.id}
                            className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-md border border-purple-100 font-medium"
                          >
                            {col.name}
                            {col.wipLimit != null && (
                              <span className="text-purple-400 ml-1 font-normal">WIP:{col.wipLimit}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Колонки ещё не добавлены</p>
                    )}
                  </div>

                  {/* Swimlanes */}
                  {board.swimlaneGroupBy && board.swimlanes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Дорожки (по {board.fields.find(f => f.id === board.swimlaneGroupBy)?.name || board.swimlaneGroupBy})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {board.swimlanes.map((sw) => (
                          <span
                            key={sw.id}
                            className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs rounded-md border border-amber-100 font-medium"
                          >
                            {sw.name}
                            {sw.wipLimit != null && (
                              <span className="text-amber-400 ml-1 font-normal">WIP:{sw.wipLimit}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All task fields */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Параметры задач
                    </p>
                    {board.fields.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {systemFields.map((f) => (
                          <span
                            key={f.id}
                            className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200"
                          >
                            {f.name}{f.isRequired && <span className="text-red-400 ml-0.5">*</span>}
                          </span>
                        ))}
                        {customFields.map((f) => (
                          <span
                            key={f.id}
                            className="px-2.5 py-1 bg-purple-50 text-purple-600 text-xs rounded-md border border-purple-100"
                          >
                            {f.name}{f.isRequired && <span className="text-red-400 ml-0.5">*</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Параметры не настроены</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Project params preview */}
        {template.params.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Параметры проекта
            </p>
            <div className="flex flex-wrap gap-1.5">
              {template.params.map((p) => (
                <span
                  key={p.id}
                  className={`px-2.5 py-1 text-xs rounded-md border font-medium ${
                    p.isSystem
                      ? "bg-slate-100 text-slate-600 border-slate-200"
                      : "bg-purple-50 text-purple-600 border-purple-100"
                  }`}
                >
                  {p.name}
                  {p.isRequired && <span className="text-red-400 ml-0.5">*</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Roles preview */}
        {template.roles.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Роли проекта
            </p>
            <div className="flex flex-wrap gap-1.5">
              {template.roles.map((r) => (
                <span
                  key={r.id}
                  className={`px-2.5 py-1 text-xs rounded-md border font-medium ${
                    r.isAdmin
                      ? "bg-amber-50 text-amber-700 border-amber-100"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                  title={r.description || undefined}
                >
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Note Textarea with debounced save
// ════════════════════════════════════════════════════════════════

function NoteTextarea({ value, onSave, inputClassName, rows: rowsProp }: { value: string | null; onSave: (val: string | null) => void; inputClassName?: string; rows?: number }) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFixedHeight = inputClassName?.includes("h-[");
  const textareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el && !hasFixedHeight) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [hasFixedHeight]);

  // Sync from server when value changes externally (e.g. after reload)
  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  function handleChange(newVal: string) {
    setLocalValue(newVal);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSave(newVal || null);
    }, 600);
  }

  function handleClear() {
    setLocalValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onSave(null);
  }

  // Save on unmount if pending
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => {
          handleChange(e.target.value);
          if (!hasFixedHeight) {
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }
        }}
        rows={rowsProp || 1}
        className={`w-full pr-8 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none overflow-hidden ${inputClassName || "px-3 py-1.5"}`}
        placeholder="Правила работы, пояснения для команды..."
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1.5 p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors"
          title="Очистить заметку"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// WIP Limit Input with debounced save
// ════════════════════════════════════════════════════════════════

function WipLimitInput({ value, onSave }: { value: number | null; onSave: (val: number | null) => void }) {
  const [local, setLocal] = useState(value != null ? String(value) : "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localRef = useRef(local);
  const valueRef = useRef(value);
  const onSaveRef = useRef(onSave);
  localRef.current = local;
  valueRef.current = value;
  onSaveRef.current = onSave;

  useEffect(() => {
    setLocal(value != null ? String(value) : "");
  }, [value]);

  function handleChange(raw: string) {
    const v = raw.replace(/[^0-9]/g, "");
    setLocal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const parsed = v !== "" ? Number(v) : null;
      onSave(parsed);
    }, 600);
  }

  // Save pending on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        const parsed = localRef.current !== "" ? Number(localRef.current) : null;
        if (parsed !== valueRef.current) {
          onSaveRef.current(parsed);
        }
      }
    };
  }, []);

  return (
    <div>
      <label className="block text-xs font-medium mb-1">WIP лимит</label>
      <input
        type="text"
        inputMode="numeric"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => {
          if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
          onSave(local !== "" ? Number(local) : null);
        }}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Без лимита"
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Debounced Input / Textarea (no clear button)
// ════════════════════════════════════════════════════════════════

function DebouncedInput({ value, onSave, className, placeholder, required, requiredMessage }: {
  value: string; onSave: (val: string) => void; className?: string; placeholder?: string; required?: boolean; requiredMessage?: string;
}) {
  const [local, setLocal] = useState(value);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const localRef = useRef(local);
  const onSaveRef = useRef(onSave);
  localRef.current = local;
  onSaveRef.current = onSave;

  useEffect(() => { if (!dirtyRef.current) setLocal(value); }, [value]);

  function trySave(v: string) {
    if (required && !v.trim()) {
      setError(requiredMessage || "Поле не может быть пустым");
      return;
    }
    setError("");
    onSave(v);
  }

  function handleChange(v: string) {
    setLocal(v);
    if (required && v.trim()) setError("");
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { dirtyRef.current = false; trySave(v); }, 1500);
  }

  useEffect(() => () => {
    if (timerRef.current) { clearTimeout(timerRef.current); dirtyRef.current = false; if (!required || localRef.current.trim()) onSaveRef.current(localRef.current); }
  }, []);

  return (
    <div>
      <input type="text" value={local} onChange={e => handleChange(e.target.value)} className={`${className} ${error ? "border-red-400 ring-2 ring-red-200" : ""}`} placeholder={placeholder} />
      {error && (
        <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function DebouncedTextarea({ value, onSave, className, placeholder, rows }: {
  value: string; onSave: (val: string) => void; className?: string; placeholder?: string; rows?: number;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const localRef = useRef(local);
  const onSaveRef = useRef(onSave);
  localRef.current = local;
  onSaveRef.current = onSave;

  // Only sync from server when not actively editing
  useEffect(() => { if (!dirtyRef.current) setLocal(value); }, [value]);

  function handleChange(v: string) {
    setLocal(v);
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { dirtyRef.current = false; onSave(v); }, 1500);
  }

  useEffect(() => () => {
    if (timerRef.current) { clearTimeout(timerRef.current); dirtyRef.current = false; onSaveRef.current(localRef.current); }
  }, []);

  return <textarea value={local} onChange={e => handleChange(e.target.value)} className={className} placeholder={placeholder} rows={rows} />;
}

// ════════════════════════════════════════════════════════════════
// Helper: build labels from refs
// ════════════════════════════════════════════════════════════════

function buildColumnSystemTypeLabels(refs: TemplateReferences): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of refs.columnSystemTypes) map[t.key] = t.name;
  return map;
}

function buildFieldTypeLabels(refs: TemplateReferences, opts?: { projectType?: string; scope?: string }): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of refs.fieldTypes) {
    if (opts?.projectType && t.availableFor && !t.availableFor.includes(opts.projectType)) continue;
    if (opts?.scope && t.allowedScopes && !t.allowedScopes.includes(opts.scope)) continue;
    map[t.key] = t.name;
  }
  return map;
}

// Labels for system task field types
// These are different from custom field types — they include special types like column, user_list, priority, etc.
const SYSTEM_FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Текст",
  number: "Число",
  datetime: "Дата и время",
  select: "Выпадающий список",
  multiselect: "Множественный выбор",
  checkbox: "Флажок",
  user: "Пользователь",
  user_list: "Список пользователей",
  column: "Текущая колонка на доске задач или статус отмены задачи ",
  priority: "Выбор из списка",
  estimation: "Оценка",
  sprint: "Итерация разработки",
  tags: "Метки",
};


function buildPriorityTypeLabels(refs: TemplateReferences): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of refs.priorityTypeOptions) map[t.key] = t.name;
  return map;
}

function getDefaultValuesForPriorityType(refs: TemplateReferences, priorityType: string): string[] {
  const opt = refs.priorityTypeOptions.find(o => o.key === priorityType);
  return opt ? [...opt.defaultValues] : [];
}

// ════════════════════════════════════════════════════════════════
// Template Editor
// ════════════════════════════════════════════════════════════════

function TemplateEditor({
  templateId,
  refs,
  onSave,
  onCancel,
}: {
  templateId: string;
  refs: TemplateReferences;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<ProjectTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBoardIndex, setActiveBoardIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"params" | "columns" | "swimlanes" | "template">("params");

  const [columnError, setColumnError] = useState<{ colId: string; message: string } | null>(null);

  const COLUMN_SYSTEM_TYPE_LABELS = buildColumnSystemTypeLabels(refs);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const detail = await getProjectTemplate(templateId);
        setData(detail);
      } catch (e: any) {
        toast.error(e.message || "Не удалось загрузить шаблон");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [templateId]);

  // Reload full template from server
  async function reloadTemplate() {
    try {
      const detail = await getProjectTemplate(templateId);
      setData(detail);
    } catch (e: any) {
      toast.error(e.message || "Не удалось обновить данные");
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  const board = data.boards[activeBoardIndex];
  const isScrum = data.projectType === "scrum";

  // ── Board management ──────────────────────────────────────

  async function addBoard() {
    // Inherit priorityType and estimationUnit from the default board (or first board)
    const defaultBoard = data!.boards.find(b => b.isDefault) || data!.boards[0];
    const priorityType = defaultBoard?.priorityType || (isScrum ? "priority" : "service_class");
    const estimationUnit = defaultBoard?.estimationUnit || (isScrum ? "story_points" : "time");
    try {
      const newBoard = await createTemplateBoard(templateId, {
        name: "Новая доска",
        isDefault: data!.boards.length === 0,
        priorityType,
        estimationUnit,
        swimlaneGroupBy: null,
      });
      const detail = await getProjectTemplate(templateId);
      setData(detail);
      const idx = detail.boards.findIndex(b => b.id === newBoard.id);
      setActiveBoardIndex(idx >= 0 ? idx : detail.boards.length - 1);
      setActiveTab("params");
    } catch (e: any) {
      toast.error(e.message || "Не удалось добавить доску");
    }
  }

  async function removeBoard(index: number) {
    const boardToRemove = data!.boards[index];
    if (data!.boards.length <= 1 || boardToRemove.isDefault) return;
    try {
      await deleteTemplateBoard(templateId, boardToRemove.id);
      await reloadTemplate();
      if (activeBoardIndex >= data!.boards.length - 1) {
        setActiveBoardIndex(Math.max(0, activeBoardIndex - 1));
      }
    } catch (e: any) {
      toast.error(e.message || "Не удалось удалить доску");
    }
  }

  async function setDefaultBoard(boardIndex: number) {
    const targetBoard = data!.boards[boardIndex];
    try {
      await updateTemplateBoard(templateId, targetBoard.id, { isDefault: true });
      await reloadTemplate();
    } catch (e: any) {
      toast.error(e.message || "Не удалось установить доску по умолчанию");
    }
  }

  async function moveBoard(dragIndex: number, hoverIndex: number) {
    // Optimistic: reorder locally, then send to server
    const boards = [...data!.boards];
    const [removed] = boards.splice(dragIndex, 1);
    boards.splice(hoverIndex, 0, removed);
    const orders = boards.map((b, i) => ({ boardId: b.id, order: i + 1 }));
    setData(prev => prev ? { ...prev, boards } : prev);
    setActiveBoardIndex(hoverIndex);
    try {
      await reorderTemplateBoards(templateId, orders);
    } catch (e: any) {
      toast.error(e.message || "Не удалось изменить порядок досок");
      await reloadTemplate();
    }
  }

  // ── Board update helper ──────────────────────────────────
  async function handleUpdateBoard(boardId: string, patch: Partial<{
    name: string; description: string; isDefault: boolean; order: number;
    priorityType: string; estimationUnit: string; swimlaneGroupBy: string | null;
  }>) {
    const isTextOnly = Object.keys(patch).every(k => k === "name" || k === "description");
    try {
      await updateTemplateBoard(templateId, boardId, patch);
      if (isTextOnly) {
        // Update state without full reload to avoid overwriting user input
        setData(prev => {
          if (!prev) return prev;
          const boards = prev.boards.map(b => b.id === boardId ? { ...b, ...patch } : b);
          return { ...prev, boards };
        });
      } else {
        await reloadTemplate();
      }
    } catch (e: any) {
      toast.error(e.message || "Не удалось обновить доску");
    }
  }

  // ── Column validation ──────────────────────────────────────

  const PHASE_EARLY = new Set(["initial"]);
  const PHASE_MIDDLE = new Set(["in_progress"]);
  const PHASE_FINAL = new Set(["completed"]);

  function validateColumnOrder(columns: TemplateBoardColumn[]): string | null {
    if (columns.length === 0) return null;

    // Minimum 1 column of each system type
    const countInitial = columns.filter(c => PHASE_EARLY.has(c.systemType)).length;
    const countInProgress = columns.filter(c => PHASE_MIDDLE.has(c.systemType)).length;
    const countCompleted = columns.filter(c => PHASE_FINAL.has(c.systemType)).length;
    if (countInitial === 0) return `Должна быть минимум одна колонка с типом «${COLUMN_SYSTEM_TYPE_LABELS["initial"]}».`;
    if (countInProgress === 0) return `Должна быть минимум одна колонка с типом «${COLUMN_SYSTEM_TYPE_LABELS["in_progress"]}».`;
    if (countCompleted === 0) return `Должна быть минимум одна колонка с типом «${COLUMN_SYSTEM_TYPE_LABELS["completed"]}».`;

    // Phase ordering
    let phase: "early" | "middle" | "final" = "early";
    let lastPhaseCol: TemplateBoardColumn | null = null;

    for (const col of columns) {
      const st = col.systemType;

      if (PHASE_EARLY.has(st)) {
        if (phase === "middle" || phase === "final") {
          return `Колонка «${col.name || "без названия"}» (тип «${COLUMN_SYSTEM_TYPE_LABELS[st]}») не может стоять после колонки «${lastPhaseCol?.name || "без названия"}» (тип «${COLUMN_SYSTEM_TYPE_LABELS[lastPhaseCol?.systemType || ""]}»).`;
        }
      } else if (PHASE_MIDDLE.has(st)) {
        if (phase === "final") {
          return `Колонка «${col.name || "без названия"}» (тип «${COLUMN_SYSTEM_TYPE_LABELS[st]}») не может стоять после колонки «${lastPhaseCol?.name || "без названия"}» (тип «${COLUMN_SYSTEM_TYPE_LABELS[lastPhaseCol?.systemType || ""]}»).`;
        }
        phase = "middle"; lastPhaseCol = col;
      } else if (PHASE_FINAL.has(st)) {
        phase = "final"; lastPhaseCol = col;
      }
    }

    return null;
  }

  // ── Column helpers ──────────────────────────────────────────

  async function addColumn(afterIndex: number) {
    if (!board) return;
    const systemType = (afterIndex >= 0 && board.columns[afterIndex])
      ? board.columns[afterIndex].systemType
      : "initial";
    // order = position right after the selected column (1-based)
    const order = afterIndex + 2;
    try {
      await createTemplateBoardColumn(templateId, board.id, {
        name: "Новая колонка",
        systemType,
        wipLimit: null,
        order,
      });
      setColumnError(null);
      await reloadTemplate();
    } catch (e: any) {
      if (e.code === "INVALID_COLUMN_ORDER") {
        setColumnError({ colId: board.columns[afterIndex]?.id || "", message: e.message });
      } else {
        toast.error(e.message || "Не удалось добавить колонку");
      }
    }
  }

  async function updateColumn(colId: string, field: string, value: any) {
    if (!board) return;
    // Client-side pre-validation for systemType changes
    if (field === "systemType") {
      const columns = board.columns.map((c) => (c.id === colId ? { ...c, systemType: value } : c));
      const err = validateColumnOrder(columns);
      if (err) { setColumnError({ colId, message: err }); return; }
    }
    setColumnError(null);
    try {
      await updateTemplateBoardColumn(templateId, board.id, colId, { [field]: value });
      if (field === "name") {
        // Update locally without reload to avoid overwriting user input
        setData(prev => {
          if (!prev) return prev;
          const boards = prev.boards.map((b, i) => i !== activeBoardIndex ? b : {
            ...b, columns: b.columns.map(c => c.id === colId ? { ...c, name: value } : c),
          });
          return { ...prev, boards };
        });
      } else {
        await reloadTemplate();
      }
    } catch (e: any) {
      if (e.code === "INVALID_COLUMN_ORDER" || e.code === "COLUMN_LOCKED") {
        setColumnError({ colId, message: e.message });
      } else {
        toast.error(e.message || "Не удалось обновить колонку");
      }
    }
  }

  async function removeColumn(colId: string) {
    if (!board) return;
    const col = board.columns.find((c) => c.id === colId);
    if (col?.isLocked) return;
    const remaining = board.columns.filter(c => c.id !== colId);
    const err = validateColumnOrder(remaining);
    if (err) { setColumnError({ colId, message: err }); return; }
    try {
      await deleteTemplateBoardColumn(templateId, board.id, colId);
      setColumnError(null);
      await reloadTemplate();
    } catch (e: any) {
      if (e.code === "INVALID_COLUMN_ORDER" || e.code === "COLUMN_LOCKED") {
        setColumnError({ colId, message: e.message });
      } else {
        toast.error(e.message || "Не удалось удалить колонку");
      }
    }
  }

  async function moveColumn(colId: string, direction: "up" | "down") {
    if (!board) return;
    const columns = [...board.columns];
    const index = columns.findIndex((c) => c.id === colId);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;
    if (isScrum && (index === 0 || newIndex === 0)) return;
    [columns[index], columns[newIndex]] = [columns[newIndex], columns[index]];
    columns.forEach((c, i) => (c.order = i + 1));
    const err = validateColumnOrder(columns);
    if (err) { setColumnError({ colId, message: err }); return; }
    setColumnError(null);
    const orders = columns.map(c => ({ columnId: c.id, order: c.order }));
    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      const boards = [...prev.boards];
      boards[activeBoardIndex] = { ...boards[activeBoardIndex], columns };
      return { ...prev, boards };
    });
    try {
      await reorderTemplateBoardColumns(templateId, board.id, orders);
    } catch (e: any) {
      toast.error(e.message || "Не удалось переместить колонку");
      await reloadTemplate();
    }
  }

  // ── Swimlane helpers ────────────────────────────────────────

  async function handleSetSwimlaneGroupBy(value: string) {
    if (!board) return;
    try {
      // Delete existing swimlanes when changing or clearing group-by
      if (board.swimlanes.length > 0) {
        for (const sw of board.swimlanes) {
          await deleteTemplateBoardSwimlane(templateId, board.id, sw.id);
        }
      }

      await updateTemplateBoard(templateId, board.id, {
        swimlaneGroupBy: value || null,
      });

      // Reload to get fresh state after backend processes the group-by change
      const freshData = await getProjectTemplate(templateId);
      const freshBoard = freshData.boards.find(b => b.id === board!.id);

      // Auto-create swimlanes if the group-by field is set and no swimlanes exist yet
      if (value && freshBoard && freshBoard.swimlanes.length === 0) {
        const field = freshBoard.fields.find(f => f.id === value);
        let expectedValues: string[] | null = null;
        if (field) {
          if (field.fieldType === "checkbox") {
            expectedValues = [`${field.name}: да`, `${field.name}: нет`];
          } else if (field.fieldType === "select" || field.fieldType === "priority") {
            const priorityFieldId = freshBoard.fields.find(f => f.isSystem && (f.fieldType === "priority" || f.name.toLowerCase().includes("приоритизаци")))?.id;
            if (field.id === priorityFieldId) {
              const defaults = refs.priorityTypeOptions.find(o => o.key === freshBoard.priorityType)?.defaultValues || [];
              expectedValues = (freshBoard.priorityOptions && freshBoard.priorityOptions.length > 0) ? freshBoard.priorityOptions : defaults.length > 0 ? defaults : null;
            } else {
              expectedValues = (field.options && field.options.length > 0) ? field.options : null;
            }
          }
        }
        if (expectedValues && expectedValues.length > 0) {
          for (let i = 0; i < expectedValues.length; i++) {
            await createTemplateBoardSwimlane(templateId, freshBoard.id, {
              name: expectedValues[i],
              order: i + 1,
            });
          }
          // Reload again to include created swimlanes
          setData(await getProjectTemplate(templateId));
          return;
        }
      }

      setData(freshData);
    } catch (e: any) {
      toast.error(e.message || "Не удалось изменить группировку");
    }
  }

  async function updateSwimlane(swId: string, field: string, value: any) {
    if (!board) return;
    try {
      await updateTemplateBoardSwimlane(templateId, board.id, swId, { [field]: value });
      await reloadTemplate();
    } catch (e: any) {
      toast.error(e.message || "Не удалось обновить дорожку");
    }
  }

  async function syncSwimlanesWithOptions(expectedValues: string[]) {
    if (!board || !board.swimlaneGroupBy) return;
    const currentNames = new Set(board.swimlanes.map(s => s.name));
    const expectedSet = new Set(expectedValues);
    for (const val of expectedValues) {
      if (!currentNames.has(val)) {
        try { await createTemplateBoardSwimlane(templateId, board.id, { name: val, order: board.swimlanes.length + 1 }); } catch { /**/ }
      }
    }
    for (const sw of board.swimlanes) {
      if (!expectedSet.has(sw.name)) {
        try { await deleteTemplateBoardSwimlane(templateId, board.id, sw.id); } catch { /**/ }
      }
    }
    await reloadTemplate();
  }

  async function moveSwimlane(swId: string, direction: "up" | "down") {
    if (!board) return;
    const swimlanes = [...board.swimlanes];
    const index = swimlanes.findIndex((s) => s.id === swId);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= swimlanes.length) return;
    [swimlanes[index], swimlanes[newIndex]] = [swimlanes[newIndex], swimlanes[index]];
    swimlanes.forEach((s, i) => (s.order = i + 1));
    const orders = swimlanes.map(s => ({ swimlaneId: s.id, order: s.order }));
    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      const boards = [...prev.boards];
      boards[activeBoardIndex] = { ...boards[activeBoardIndex], swimlanes };
      return { ...prev, boards };
    });
    try {
      await reorderTemplateBoardSwimlanes(templateId, board.id, orders);
    } catch (e: any) {
      toast.error(e.message || "Не удалось переместить дорожку");
      await reloadTemplate();
    }
  }

  // ── Save template name/description (debounced via NoteTextarea) ──

  async function handleUpdateTemplateProp(patch: Partial<{ name: string; description: string }>) {
    try {
      const updated = await updateProjectTemplate(templateId, patch);
      // Update state without full reload to avoid overwriting user input
      setData(prev => prev ? { ...prev, ...patch } : prev);
    } catch (e: any) {
      toast.error(e.message || "Не удалось сохранить изменения");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Редактирование шаблона</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {data.projectType === "scrum" ? "Scrum" : "Kanban"} — {data.name}
          </p>
        </div>
      </div>

      {/* Auto-save notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg">
        <Save size={16} className="text-green-600 shrink-0" />
        <p className="text-sm text-green-800">Все изменения сохраняются автоматически</p>
      </div>

      {/* Template info */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <h2 className="text-lg font-bold mb-4">Основная информация</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Название шаблона <span className="text-red-500">*</span>
            </label>
            <DebouncedInput
              value={data.name}
              onSave={(val) => handleUpdateTemplateProp({ name: val })}
              className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Название шаблона..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Тип проекта</label>
            <input
              type="text"
              value={data.projectType === "scrum" ? "Scrum" : "Kanban"}
              disabled
              className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Описание</label>
          <DebouncedTextarea
            value={data.description}
            onSave={(val) => handleUpdateTemplateProp({ description: val })}
            className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={4}
            placeholder="Описание шаблона..."
          />
        </div>
      </div>

      {/* Boards section */}
      <DndProvider backend={HTML5Backend}>
      <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-1">
            <Layout size={20} className="text-purple-600" />
            <h2 className="text-lg font-bold">Доски задач</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Настройте доски проекта: колонки рабочего процесса, дорожки, параметры задач и кастомные поля. Каждая доска представляет отдельный рабочий поток.
          </p>
        </div>
        {/* Board tabs */}
        <div className="border-b border-slate-200 bg-slate-50 px-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-0 pt-3">
            {data.boards.map((b, i) => (
              <DraggableBoardTab
                key={b.id}
                board={b}
                index={i}
                isActive={i === activeBoardIndex}
                canDelete={data.boards.length > 1 && !b.isDefault}
                onSelect={() => { setActiveBoardIndex(i); setActiveTab("params"); }}
                onDelete={() => removeBoard(i)}
                moveBoard={moveBoard}
              />
            ))}
            <button
              onClick={addBoard}
              className="px-4 py-2 border border-dashed border-slate-300 rounded-t-lg hover:border-purple-400 hover:text-purple-600 hover:bg-white transition-all flex items-center gap-2 text-slate-600 whitespace-nowrap text-sm shrink-0"
            >
              <Plus size={16} />
              Добавить доску
            </button>
          </div>
        </div>

        {/* Empty state when no boards */}
        {data.boards.length === 0 && (
          <div className="p-12 text-center">
            <Columns size={48} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-2">Нет досок в шаблоне</p>
            <p className="text-sm text-slate-500 mb-4">
              Добавьте первую доску, чтобы настроить колонки, дорожки и параметры задач
            </p>
            <button
              onClick={addBoard}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Добавить первую доску
            </button>
          </div>
        )}

        {/* Board settings tabs */}
        {board && (
          <>
            <div className="border-b border-slate-200">
              <div className="flex gap-1 p-2">
                {([
                  { key: "params" as const, icon: Sliders, label: "Параметры доски" },
                  { key: "columns" as const, icon: Columns, label: `Колонки (${board.columns.length})` },
                  { key: "swimlanes" as const, icon: Layers, label: `Дорожки (${board.swimlanes.length})` },
                  { key: "template" as const, icon: FileText, label: "Шаблон задачи" },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                      activeTab === tab.key
                        ? "bg-purple-100 text-purple-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {activeTab === "params" && (
                <BoardParamsTab
                  board={board}
                  onChange={(patch) => handleUpdateBoard(board.id, patch)}
                  onSetDefault={() => setDefaultBoard(activeBoardIndex)}
                />
              )}
              {activeTab === "columns" && (
                <BoardColumnsTab
                  columns={board.columns}
                  isScrum={isScrum}
                  error={columnError}
                  onDismissError={() => setColumnError(null)}
                  onAddAfter={(index) => addColumn(index)}
                  onUpdate={updateColumn}
                  onRemove={removeColumn}
                  onMove={moveColumn}
                  columnSystemTypeLabels={COLUMN_SYSTEM_TYPE_LABELS}
                  columnSystemTypes={refs.columnSystemTypes}
                />
              )}
              {activeTab === "swimlanes" && (
                <BoardSwimlanesTab
                  swimlaneGroupBy={board.swimlaneGroupBy || ""}
                  swimlanes={board.swimlanes}
                  boardFields={board.fields}
                  board={board}
                  refs={refs}
                  isScrum={isScrum}
                  onSetGroupBy={handleSetSwimlaneGroupBy}
                  onUpdate={updateSwimlane}
                  onMove={moveSwimlane}
                />
              )}
              {activeTab === "template" && (
                <BoardTaskTemplateTab
                  isScrum={isScrum}
                  board={board}
                  templateId={templateId}
                  refs={refs}
                  onReload={reloadTemplate}
                  onClearSwimlaneGroupBy={() => handleSetSwimlaneGroupBy("")}
                  onSyncSwimlanes={syncSwimlanesWithOptions}
                />
              )}
            </div>
          </>
        )}
      </div>
      </DndProvider>

      {/* Project Parameters */}
      <ProjectParamsSection
        templateId={templateId}
        isScrum={isScrum}
        refs={refs}
        params={data.params || []}
        onReload={reloadTemplate}
      />

      {/* Project Roles */}
      <ProjectRolesSection
        templateId={templateId}
        projectType={data.projectType}
        refs={refs}
        roles={data.roles || []}
        onReload={reloadTemplate}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Draggable Board Tab
// ════════════════════════════════════════════════════════════════

function DraggableBoardTab({
  board,
  index,
  isActive,
  canDelete,
  onSelect,
  onDelete,
  moveBoard,
}: {
  board: TemplateBoard;
  index: number;
  isActive: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
  moveBoard: (dragIndex: number, hoverIndex: number) => void;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: "TEMPLATE_BOARD_TAB",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "TEMPLATE_BOARD_TAB",
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
      className={`cursor-move ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        onClick={onSelect}
        className={`px-4 py-2.5 rounded-t-lg font-medium transition-all whitespace-nowrap border-b-2 text-left ${
          isActive
            ? "bg-white text-purple-600 border-purple-600"
            : "bg-slate-50 text-slate-700 border-transparent hover:bg-slate-100"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{board.name || "Без названия"}</span>
          {board.isDefault && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">по умолчанию</span>
          )}
          {canDelete && isActive && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 hover:bg-red-100 text-red-500 rounded inline-flex"
              title="Удалить доску"
            >
              <Trash2 size={16} />
            </span>
          )}
        </div>
        <div className="text-xs opacity-75 mt-1 font-normal truncate max-w-48 min-h-4">
          {board.description || "\u00A0"}
        </div>
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab: Board Params
// ════════════════════════════════════════════════════════════════

function BoardParamsTab({
  board,
  onChange,
  onSetDefault,
}: {
  board: TemplateBoard;
  onChange: (patch: Partial<TemplateBoard>) => void;
  onSetDefault: () => void;
}) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <label className="block text-sm font-medium mb-2">
          Название доски <span className="text-red-500">*</span>
        </label>
        <DebouncedInput
          value={board.name}
          onSave={(val) => onChange({ name: val })}
          className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
          placeholder="Введите название доски..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Описание доски</label>
        <DebouncedTextarea
          value={board.description}
          onSave={(val) => onChange({ description: val })}
          className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          rows={4}
          placeholder="Для каких задач предназначена доска..."
        />
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="board-default"
          checked={board.isDefault}
          onChange={() => { if (!board.isDefault) onSetDefault(); }}
          disabled={board.isDefault}
          className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
        />
        <label htmlFor="board-default" className="text-sm font-medium">
          Доска по умолчанию
        </label>
        {board.isDefault && (
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
  columns,
  isScrum,
  error,
  onDismissError,
  onAddAfter,
  onUpdate,
  onRemove,
  onMove,
  columnSystemTypeLabels,
  columnSystemTypes,
}: {
  columns: TemplateBoardColumn[];
  isScrum: boolean;
  error: { colId: string; message: string } | null;
  onDismissError: () => void;
  onAddAfter: (afterIndex: number) => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  columnSystemTypeLabels: Record<string, string>;
  columnSystemTypes: TemplateReferences["columnSystemTypes"];
}) {

  const addButton = (afterIndex: number) => (
    <div className="flex justify-center py-1">
      <button
        onClick={() => onAddAfter(afterIndex)}
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
        {columns.map((column, index) => {
          const locked = !!column.isLocked;
          const colErr = error?.colId === column.id ? error.message : null;
          return (
            <div key={column.id}>
              <div
                className={`p-4 border rounded-lg ${colErr ? "border-red-400 ring-2 ring-red-100" : locked ? "border-purple-200 bg-purple-50/50" : "border-slate-200 bg-slate-50"}`}
              >
                <div className={`grid grid-cols-1 gap-3 ${isScrum ? "md:grid-cols-5" : "md:grid-cols-6"}`}>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1">
                      Название колонки *
                      {locked && <Lock size={12} className="inline ml-1 text-purple-500" />}
                    </label>
                    {locked ? (
                      <input
                        type="text"
                        value={column.name}
                        disabled
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-500"
                      />
                    ) : (
                      <DebouncedInput
                        value={column.name}
                        onSave={(val) => onUpdate(column.id, "name", val)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Название..."
                        required
                        requiredMessage="Название колонки не может быть пустым"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Системный тип *</label>
                    <select
                      value={column.systemType}
                      onChange={(e) => onUpdate(column.id, "systemType", e.target.value)}
                      disabled={locked}
                      className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${locked ? "bg-slate-100 text-slate-500" : ""}`}
                    >
                      {Object.entries(columnSystemTypeLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  {!isScrum && column.systemType !== "completed" && (
                    <WipLimitInput
                      value={column.wipLimit}
                      onSave={(val) => onUpdate(column.id, "wipLimit", val)}
                    />
                  )}
                  <div className="flex items-end gap-1">
                    {!locked && (
                      <>
                        <button
                          onClick={() => onMove(column.id, "up")}
                          disabled={index === 0 || (isScrum && index === 1)}
                          className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => onMove(column.id, "down")}
                          disabled={index === columns.length - 1}
                          className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          onClick={() => onRemove(column.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {locked && (
                      <span className="text-xs text-purple-500 flex items-center gap-1 p-2">
                        <Lock size={14} /> Закреплена
                      </span>
                    )}
                  </div>
                </div>
                {/* Note */}
                <div className="mt-3">
                  <label className="block text-xs font-medium mb-1 text-slate-500">Заметка</label>
                  <NoteTextarea
                    value={column.note}
                    onSave={(val) => onUpdate(column.id, "note", val)}
                  />
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
            <div key={t.key}>
              <span className="font-medium">{t.name}</span> — {t.description}
            </div>
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
  swimlaneGroupBy,
  swimlanes,
  onSetGroupBy,
  onUpdate,
  onMove,
  boardFields,
  board,
  refs,
  isScrum,
}: {
  swimlaneGroupBy: string;
  swimlanes: TemplateBoardSwimlane[];
  boardFields: TemplateBoardField[];
  board: TemplateBoard;
  refs: TemplateReferences;
  isScrum: boolean;
  onSetGroupBy: (val: string) => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onMove: (id: string, dir: "up" | "down") => void;
}) {
  // For the priority field, show the current priority type name (e.g. "Класс обслуживания") instead of generic field name
  const priorityTypeLabel = (refs.priorityTypeOptions || []).find(o => o.key === board.priorityType)?.name;
  // The priority field's description from backend contains "приоритизации" — use that to identify it reliably
  const priorityFieldId = boardFields.find(f => f.isSystem && (f.fieldType === "priority" || f.name.toLowerCase().includes("приоритизаци")))?.id;

  function getFieldDisplayName(f: TemplateBoardField): string {
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
          <select
            value={swimlaneGroupBy}
            onChange={(e) => onSetGroupBy(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="">Без дорожек</option>
            {boardFields
              .filter(f => ["priority", "select", "checkbox", "multiselect", "user", "user_list", "tags"].includes(f.fieldType) && f.fieldType !== "column" && !f.name.toLowerCase().includes("статус"))
              .map(f => (
                <option key={f.id} value={f.id}>{getFieldDisplayName(f)}</option>
              ))}
            {!boardFields.some(f => f.fieldType === "tags") && (
              <option value="__tags__">Теги</option>
            )}
          </select>
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
          <p className="text-sm text-slate-500">
            Выберите параметр группировки выше, чтобы использовать дорожки
          </p>
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
          {swimlanes.map((swimlane, index) => (
            <div key={swimlane.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1">
                    Название дорожки
                    <Lock size={12} className="inline ml-1 text-slate-400" />
                  </label>
                  <input
                    type="text"
                    value={swimlane.name}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-600"
                  />
                </div>
                {!isScrum && (
                  <WipLimitInput
                    value={swimlane.wipLimit}
                    onSave={(val) => onUpdate(swimlane.id, "wipLimit", val)}
                  />
                )}
                <div className="flex items-end gap-1">
                  <button
                    onClick={() => onMove(swimlane.id, "up")}
                    disabled={index === 0}
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => onMove(swimlane.id, "down")}
                    disabled={index === swimlanes.length - 1}
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>
              {/* Note */}
              <div className="mt-3">
                <label className="block text-xs font-medium mb-1 text-slate-500">Заметка</label>
                <NoteTextarea
                  value={swimlane.note}
                  onSave={(val) => onUpdate(swimlane.id, "note", val)}
                />
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
  isScrum,
  board,
  templateId,
  refs,
  onReload,
  onClearSwimlaneGroupBy,
  onSyncSwimlanes,
}: {
  isScrum: boolean;
  board: TemplateBoard;
  templateId: string;
  refs: TemplateReferences;
  onReload: () => Promise<void>;
  onClearSwimlaneGroupBy: () => Promise<void>;
  onSyncSwimlanes: (expectedValues: string[]) => Promise<void>;
}) {
  const projectType = isScrum ? "scrum" : "kanban";
  const FIELD_TYPE_LABELS = buildFieldTypeLabels(refs, { projectType, scope: "board_field" });
  const priorityTypeLabels = buildPriorityTypeLabels(refs);

  // Split fields into system and custom
  const systemFields = board.fields.filter(f => f.isSystem);
  const customFields = board.fields.filter(f => !f.isSystem);

  // Find priority and estimation fields by fieldType (most reliable), then fallback to name/description
  const priorityField = systemFields.find(f => f.fieldType === "priority")
    || systemFields.find(f =>
      f.name === "Приоритизация" ||
      f.name.toLowerCase().includes("приоритизаци")
    ) || null;
  const estimationFieldFound = systemFields.find(f => f.fieldType === "estimation")
    || systemFields.find(f =>
      f.name === "Оценка трудозатрат" ||
      f.name.toLowerCase().includes("оценка трудозатрат")
    ) || null;

  // Custom field form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<TaskField["type"]>("text");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState("");

  // Priority/service class value editing (inline)
  const [valueInput, setValueInput] = useState("");

  async function handleAddCustomField() {
    if (!newName.trim()) return;
    const trimmed = newName.trim();
    if (board.fields.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Параметр задачи с названием «${trimmed}» уже существует`);
      return;
    }
    try {
      await createTemplateBoardField(templateId, board.id, {
        name: newName.trim(),
        fieldType: newType,
        isRequired: newRequired,
        options: ["select", "multiselect"].includes(newType) ? newOptions : undefined,
      });
      setNewName("");
      setNewType("text");
      setNewRequired(false);
      setNewOptions([]);
      setShowAddForm(false);
      await onReload();
    } catch (e: any) {
      toast.error(e.message || "Не удалось добавить параметр");
    }
  }

  async function removeCustomField(fieldId: string) {
    try {
      const needClearSwimlanes = board.swimlaneGroupBy === fieldId;
      await deleteTemplateBoardField(templateId, board.id, fieldId);
      if (needClearSwimlanes) {
        await onClearSwimlaneGroupBy();
      } else {
        await onReload();
      }
    } catch (e: any) {
      toast.error(e.message || "Не удалось удалить параметр");
    }
  }

  async function handleUpdateCustomField(fieldId: string, updates: Partial<{ name: string; isRequired: boolean; options: string[] }>) {
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) return;
      if (board.fields.some(f => f.id !== fieldId && f.name.toLowerCase() === trimmed.toLowerCase())) {
        toast.error(`Параметр задачи с названием «${trimmed}» уже существует`);
        return;
      }
    }
    try {
      await updateTemplateBoardField(templateId, board.id, fieldId, updates);
      await onReload();
      if (updates.options && board.swimlaneGroupBy === fieldId) await onSyncSwimlanes(updates.options);
    } catch (e: any) {
      toast.error(e.message || "Не удалось обновить параметр");
    }
  }

  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [editFieldOptionInput, setEditFieldOptionInput] = useState("");

  function addOption() {
    if (optionInput.trim() && !newOptions.includes(optionInput.trim())) {
      setNewOptions([...newOptions, optionInput.trim()]);
      setOptionInput("");
    }
  }

  function getCurrentPriorityValues(): string[] {
    if (board.priorityOptions && board.priorityOptions.length > 0) return board.priorityOptions;
    return refs.priorityTypeOptions.find(o => o.key === board.priorityType)?.defaultValues || [];
  }

  async function addAndSaveValue() {
    if (!valueInput.trim()) return;
    const trimmed = valueInput.trim();
    const current = getCurrentPriorityValues();
    if (current.includes(trimmed)) { toast.info("Такое значение уже есть"); return; }
    const newOpts = [...current, trimmed];
    try {
      await updateTemplateBoard(templateId, board.id, { priorityOptions: newOpts });
      setValueInput("");
      await onReload();
      if (priorityField && board.swimlaneGroupBy === priorityField.id) await onSyncSwimlanes(newOpts);
    } catch (e: any) {
      toast.error(e.message || "Не удалось добавить значение");
    }
  }

  async function removeValue(val: string) {
    const current = getCurrentPriorityValues();
    const updated = current.filter(v => v !== val);
    if (updated.length === 0) { toast.error("Нельзя удалить последнее значение"); return; }
    try {
      await updateTemplateBoard(templateId, board.id, { priorityOptions: updated });
      await onReload();
      if (priorityField && board.swimlaneGroupBy === priorityField.id) await onSyncSwimlanes(updated);
    } catch (e: any) {
      toast.error(e.message || "Не удалось удалить значение");
    }
  }

  async function handlePriorityTypeChange(type: "priority" | "service_class") {
    const defaults = refs.priorityTypeOptions.find(o => o.key === type)?.defaultValues || [];
    try {
      await updateTemplateBoard(templateId, board.id, { priorityType: type, priorityOptions: defaults });
    } catch (e: any) {
      toast.error(e.message || "Не удалось изменить тип приоритизации");
      return;
    }
    // If swimlanes were grouped by the priority field, clear them
    if (priorityField && board.swimlaneGroupBy === priorityField.id) {
      await onClearSwimlaneGroupBy();
    } else {
      await onReload();
    }
  }

  async function handleEstimationUnitChange(unit: "story_points" | "time") {
    try {
      await updateTemplateBoard(templateId, board.id, { estimationUnit: unit });
      await onReload();
    } catch (e: any) {
      toast.error(e.message || "Не удалось изменить единицу оценки");
    }
  }

  // Get available estimation units for this project type
  const availableEstimationUnits = refs.estimationUnits.filter(u => u.availableFor.includes(projectType));
  // Get available priority types for this project type
  const availablePriorityTypes = refs.priorityTypeOptions.filter(o => o.availableFor.includes(projectType));
  // Sprint field — by fieldType "sprint"
  const sprintField = systemFields.find(f => f.fieldType === "sprint") || null;
  // Use the found estimation field
  const estimationField = estimationFieldFound;
  // Simple system fields: everything except priority, estimation, sprint
  const simpleSystemFields = systemFields.filter(f =>
    f.id !== priorityField?.id &&
    f.id !== estimationField?.id &&
    f.id !== sprintField?.id
  );

  // Locked system field row
  const LockedField = ({ name, description, isRequired }: { name: string; description?: string; isRequired?: boolean }) => (
    <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center gap-3">
      <Lock size={14} className="text-slate-400 shrink-0" />
      <div className="flex-1">
        <span className="text-sm font-medium">{name}{isRequired && <span className="text-red-500 ml-0.5">*</span>}</span>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );

  const priorityLabel = priorityTypeLabels[board.priorityType] || board.priorityType;

  return (
    <div className="space-y-6">
      {/* System fields */}
      <div>
        <h3 className="text-lg font-bold mb-1">Системные параметры задач</h3>
        <p className="text-sm text-slate-500 mb-4">
          Эти параметры являются системными и не могут быть удалены из шаблона задачи.
        </p>

        <div className="space-y-2">
          {simpleSystemFields.map(f => (
              <LockedField key={f.id} name={f.name} description={SYSTEM_FIELD_TYPE_LABELS[f.fieldType] || f.fieldType} isRequired={f.isRequired} />
            ))}

          {/* Priority / Service Class — configurable */}
          {priorityField && (
          <div className="p-4 border border-purple-200 rounded-lg bg-purple-50/50">
            <div className="flex items-center gap-3 mb-2">
              <Lock size={14} className="text-purple-500 shrink-0" />
              <span className="text-sm font-medium">{priorityLabel}{priorityField.isRequired && <span className="text-red-500 ml-0.5">*</span>}</span>
            </div>

            {/* Kanban: choose between priority and service class */}
            {availablePriorityTypes.length > 1 && (
              <div className="mb-3">
                <p className="text-xs text-slate-600 mb-2">Тип параметра:</p>
                <div className="flex gap-2">
                  {availablePriorityTypes.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => handlePriorityTypeChange(opt.key as "priority" | "service_class")}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                        board.priorityType === opt.key
                          ? "bg-purple-600 text-white border-purple-600"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Current values */}
            <div>
              <p className="text-xs text-slate-600 mb-2">Значения параметра {priorityLabel}:</p>
              {(() => {
                const fieldOpts = priorityField?.options?.length ? priorityField.options : [];
                const defaultOpts = refs.priorityTypeOptions.find(o => o.key === board.priorityType)?.defaultValues || [];
                const currentValues = fieldOpts.length > 0 ? fieldOpts : defaultOpts;
                return (<>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {currentValues.map((val) => (
                  <span key={val} className="px-2 py-1 bg-white border border-slate-200 rounded text-sm flex items-center gap-1.5">
                    {val}
                    <button
                      onClick={() => removeValue(val)}
                      disabled={currentValues.length <= 1}
                      className={currentValues.length <= 1 ? "opacity-30 cursor-not-allowed" : "hover:text-red-600"}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAndSaveValue())}
                  className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Новое значение..."
                />
                <button onClick={addAndSaveValue} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg" title="Добавить значение"><Plus size={16} /></button>
              </div>
              </>);
              })()}
            </div>
          </div>

          )}

          {/* Estimation */}
          {estimationField && (
          <div className="p-4 border border-purple-200 rounded-lg bg-purple-50/50">
            <div className="flex items-center gap-3 mb-2">
              <Lock size={14} className="text-purple-500 shrink-0" />
              <span className="text-sm font-medium">
                {estimationField.name}{estimationField.isRequired && <span className="text-red-500 ml-0.5">*</span>}
              </span>
            </div>
            {availableEstimationUnits.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-600 mb-2">Единица измерения:</p>
                <div className="flex gap-2">
                  {availableEstimationUnits.map(unit => (
                    <button
                      key={unit.key}
                      onClick={() => handleEstimationUnitChange(unit.key as "story_points" | "time")}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                        board.estimationUnit === unit.key
                          ? "bg-purple-600 text-white border-purple-600"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {unit.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(() => {
              const currentUnit = availableEstimationUnits.find(u => u.key === board.estimationUnit);
              const unitName = currentUnit?.name || board.estimationUnit;
              const example = board.estimationUnit === "story_points"
                ? "Пример: 1, 2, 3, 5, 8, 13 (числа Фибоначчи)"
                : "Пример: 2ч 30м, 4ч, 1д 2ч (часы и минуты)";
              return (
                <p className="text-xs text-slate-500">
                  Текущая единица: <strong>{unitName}</strong>. {example}
                </p>
              );
            })()}
          </div>

          )}

          {/* Sprint — Scrum only */}
          {sprintField && (
            <LockedField name={sprintField.name} description={SYSTEM_FIELD_TYPE_LABELS[sprintField.fieldType] || undefined} isRequired={sprintField.isRequired} />
          )}
        </div>
      </div>

      {/* Info block: additional built-in features */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 mb-2">
              Также в задачах предусмотрено:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <Paperclip size={14} className="shrink-0" />
                Прикрепление вложений (файлы, изображения)
              </div>
              <div className="flex items-center gap-2">
                <Tag size={14} className="shrink-0" />
                Добавление тегов к задачам
              </div>
              <div className="flex items-center gap-2">
                <CheckSquare size={14} className="shrink-0" />
                Чек-листы
              </div>
              <div className="flex items-center gap-2">
                <Link2 size={14} className="shrink-0" />
                Связи с другими задачами
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="shrink-0" />
                Комментирование с призывами пользователей (@упоминания)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Fields */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold">Кастомные параметры</h3>
            <p className="text-sm text-slate-500 mt-1">
              Добавьте дополнительные параметры для задач. Например, категории задач на проекте.
            </p>
          </div>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Добавить параметр
            </button>
          )}
        </div>

        {showAddForm && (
          <div className="p-4 border-2 border-purple-300 rounded-lg bg-purple-50 mb-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Название параметра *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Например: Отдел"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Тип параметра *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as TaskField["type"])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {["select", "multiselect"].includes(newType) && (
                <div>
                  <label className="block text-sm font-medium mb-1">Варианты для выбора</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={optionInput}
                      onChange={(e) => setOptionInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Введите вариант..."
                    />
                    <button onClick={addOption} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors" title="Добавить в список">
                      <Plus size={18} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Введите вариант и нажмите <strong>+</strong> (или Enter), чтобы добавить его в список.
                  </p>
                  {newOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newOptions.map((option) => (
                        <span key={option} className="px-2 py-1 bg-white border border-slate-200 rounded text-sm flex items-center gap-2">
                          {option}
                          <button onClick={() => setNewOptions(newOptions.filter((o) => o !== option))} className="hover:text-red-600">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="field-required"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <label htmlFor="field-required" className="text-sm">Обязательное поле</label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setShowAddForm(false); setNewName(""); setNewType("text"); setNewRequired(false); setNewOptions([]); }}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddCustomField}
                  disabled={!newName.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Добавить
                </button>
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
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedFieldId(isExpanded ? null : field.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <GripVertical size={18} className="text-slate-400" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{field.name}</p>
                          {field.isRequired && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">обязательное</span>
                          )}
                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">кастомное</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">Тип: {FIELD_TYPE_LABELS[field.fieldType] || field.fieldType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeCustomField(field.id); }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Удалить параметр"
                      >
                        <Trash2 size={16} />
                      </button>
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
                            <input
                              type="checkbox"
                              checked={field.isRequired}
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
                            <input
                              type="text"
                              value={editFieldOptionInput}
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
                            <button
                              onClick={() => {
                                const trimmed = editFieldOptionInput.trim();
                                if (trimmed && !(field.options || []).includes(trimmed)) {
                                  handleUpdateCustomField(field.id, { options: [...(field.options || []), trimmed] });
                                  setEditFieldOptionInput("");
                                }
                              }}
                              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          {field.options && field.options.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {field.options.map((opt) => (
                                <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                                  {opt}
                                  <button
                                    onClick={() => handleUpdateCustomField(field.id, { options: field.options!.filter(o => o !== opt) })}
                                    className="hover:text-red-600"
                                  >
                                    <X size={12} />
                                  </button>
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
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Добавить первый параметр
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Section: Project Parameters
// ════════════════════════════════════════════════════════════════

function ProjectParamsSection({ templateId, isScrum, refs, params, onReload }: {
  templateId: string;
  isScrum: boolean;
  refs: TemplateReferences;
  params: TemplateProjectParam[];
  onReload: () => Promise<void>;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState("");

  const [expandedParamId, setExpandedParamId] = useState<string | null>(null);
  const [editParamOptionInput, setEditParamOptionInput] = useState("");

  const projectType = isScrum ? "scrum" : "kanban";
  const FIELD_TYPE_LABELS_LOCAL = buildFieldTypeLabels(refs, { projectType, scope: "project_param" });
  const systemParams = params.filter(p => p.isSystem);
  const customParams = params.filter(p => !p.isSystem);

  async function handleUpdateCustomParam(paramId: string, updates: Partial<{ name: string; isRequired: boolean; options: string[] | null }>) {
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) return;
      if (params.some(p => p.id !== paramId && p.name.toLowerCase() === trimmed.toLowerCase())) {
        toast.error(`Параметр проекта с названием «${trimmed}» уже существует`);
        return;
      }
    }
    try {
      await updateTemplateProjectParam(templateId, paramId, updates);
      await onReload();
    } catch (e: any) {
      toast.error(e.message || "Не удалось обновить параметр");
    }
  }

  async function addCustomParam() {
    if (!newName.trim()) return;
    const trimmed = newName.trim();
    if (params.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Параметр проекта с названием «${trimmed}» уже существует`);
      return;
    }
    try {
      await createTemplateProjectParam(templateId, {
        name: newName.trim(),
        fieldType: newType,
        isRequired: newRequired,
        options: ["select", "multiselect"].includes(newType) ? newOptions : null,
      });
      setNewName("");
      setNewType("text");
      setNewRequired(false);
      setNewOptions([]);
      setShowAddForm(false);
      await onReload();
    } catch (e: any) {
      toast.error(e.message || "Не удалось добавить параметр");
    }
  }

  async function removeCustomParam(paramId: string) {
    try {
      await deleteTemplateProjectParam(templateId, paramId);
      await onReload();
    } catch (e: any) {
      toast.error(e.message || "Не удалось удалить параметр");
    }
  }

  function addOption() {
    if (optionInput.trim() && !newOptions.includes(optionInput.trim())) {
      setNewOptions([...newOptions, optionInput.trim()]);
      setOptionInput("");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <Settings size={20} className="text-purple-600" />
          <h2 className="text-lg font-bold">Параметры проекта</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Системные параметры задаются при создании каждого проекта на основе этого шаблона и не могут быть убраны. Дополнительно можно добавить кастомные параметры.
        </p>

        {/* System params */}
        <div className="space-y-2">
          {systemParams.map((param) => (
            <div key={param.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center gap-3">
              <Lock size={14} className="text-slate-400 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{param.name}{param.isRequired && <span className="text-red-500 ml-0.5">*</span>}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                    {SYSTEM_FIELD_TYPE_LABELS[param.fieldType] || FIELD_TYPE_LABELS_LOCAL[param.fieldType] || param.fieldType}
                  </span>
                </div>
                {param.options && param.options.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {param.options.map(opt => (
                      <span key={opt} className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded">{opt}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              Тип проекта ({isScrum ? "Scrum" : "Kanban"}) фиксируется при создании шаблона и определяет доступные функции:
              {isScrum
                ? " спринты, бэклог продукта, Story Points, Burndown-диаграмма."
                : " WIP-лимиты, классы обслуживания, специфичная для Kanban аналитика, прогнозирование сроков завершения работ методом Монте-Карло."
              }
            </p>
          </div>
        </div>

        {/* Custom params */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold">Кастомные параметры проекта</h3>
              <p className="text-sm text-slate-500 mt-0.5">Дополнительные параметры, специфичные для ваших проектов. Например, наименование заказчика.</p>
            </div>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                Добавить параметр
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="p-4 border-2 border-purple-300 rounded-lg bg-purple-50 mb-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Название параметра *</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Например: Бюджет проекта"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Тип параметра *</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {Object.entries(FIELD_TYPE_LABELS_LOCAL).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {["select", "multiselect"].includes(newType) && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Варианты для выбора</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Введите вариант..."
                      />
                      <button onClick={addOption} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors" title="Добавить в список">
                        <Plus size={18} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">
                      Введите вариант и нажмите <strong>+</strong> (или Enter), чтобы добавить его в список.
                    </p>
                    {newOptions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newOptions.map((option) => (
                          <span key={option} className="px-2 py-1 bg-white border border-slate-200 rounded text-sm flex items-center gap-2">
                            {option}
                            <button onClick={() => setNewOptions(newOptions.filter((o) => o !== option))} className="hover:text-red-600">
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="project-param-required"
                    checked={newRequired}
                    onChange={(e) => setNewRequired(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <label htmlFor="project-param-required" className="text-sm">Обязательное поле</label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setShowAddForm(false); setNewName(""); setNewType("text"); setNewRequired(false); setNewOptions([]); }}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={addCustomParam}
                    disabled={!newName.trim()}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            </div>
          )}

          {customParams.length > 0 ? (
            <div className="space-y-2">
              {customParams.map((param) => {
                const isExpanded = expandedParamId === param.id;
                return (
                  <div key={param.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedParamId(isExpanded ? null : param.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical size={18} className="text-slate-400" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{param.name}</p>
                            {param.isRequired && (
                              <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">обязательное</span>
                            )}
                            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">кастомное</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">Тип: {FIELD_TYPE_LABELS_LOCAL[param.fieldType] || param.fieldType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); removeCustomParam(param.id); }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Удалить параметр"
                        >
                          <Trash2 size={16} />
                        </button>
                        {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Название *</label>
                            <DebouncedInput
                              value={param.name}
                              onSave={(val) => handleUpdateCustomParam(param.id, { name: val })}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Название параметра..."
                              required
                              requiredMessage="Название параметра не может быть пустым"
                            />
                          </div>
                          <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={param.isRequired}
                                onChange={(e) => handleUpdateCustomParam(param.id, { isRequired: e.target.checked })}
                                className="w-4 h-4 text-purple-600 rounded"
                              />
                              <span className="text-sm">Обязательное поле</span>
                            </label>
                          </div>
                        </div>

                        {["select", "multiselect"].includes(param.fieldType) && (
                          <div>
                            <label className="block text-xs font-medium mb-1">Варианты для выбора</label>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={editParamOptionInput}
                                onChange={(e) => setEditParamOptionInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const trimmed = editParamOptionInput.trim();
                                    if (trimmed && !(param.options || []).includes(trimmed)) {
                                      handleUpdateCustomParam(param.id, { options: [...(param.options || []), trimmed] });
                                      setEditParamOptionInput("");
                                    }
                                  }
                                }}
                                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Введите вариант..."
                              />
                              <button
                                onClick={() => {
                                  const trimmed = editParamOptionInput.trim();
                                  if (trimmed && !(param.options || []).includes(trimmed)) {
                                    handleUpdateCustomParam(param.id, { options: [...(param.options || []), trimmed] });
                                    setEditParamOptionInput("");
                                  }
                                }}
                                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                            {param.options && param.options.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {param.options.map((opt) => (
                                  <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                                    {opt}
                                    <button
                                      onClick={() => handleUpdateCustomParam(param.id, { options: param.options!.filter(o => o !== opt) })}
                                      className="hover:text-red-600"
                                    >
                                      <X size={12} />
                                    </button>
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
              <p className="text-slate-600 mb-3">Нет кастомных параметров проекта</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Добавить первый параметр
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Section: Project Roles & Permissions
// ════════════════════════════════════════════════════════════════

function ProjectRolesSection({
  templateId,
  projectType,
  refs,
  roles,
  onReload,
}: {
  templateId: string;
  projectType: string;
  refs: TemplateReferences;
  roles: TemplateRole[];
  onReload: () => Promise<void>;
}) {
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [showAddRoleForm, setShowAddRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const allAreas = Array.isArray(refs.permissionAreas) ? refs.permissionAreas : [];
  const permissionAreas = allAreas.filter(a => a.availableFor?.includes(projectType));
  const accessLevels = Array.isArray(refs.accessLevels) ? refs.accessLevels : [];
  // Build lookup map by area key — also index by short name (without "project." prefix) for compatibility
  const areaMap: Record<string, typeof allAreas[number]> = {};
  for (const a of allAreas) {
    areaMap[a.area] = a;
    if (a.area.startsWith("project.")) areaMap[a.area.slice(8)] = a;
    else areaMap[`project.${a.area}`] = a;
  }

  async function handleAddRole() {
    if (!newRoleName.trim()) return;
    try {
      const defaultPerms: TemplateRolePermission[] = permissionAreas.map(a => ({ area: `project.${a.area}`, access: "none" as const }));
      const newRole = await createTemplateRole(templateId, {
        name: newRoleName.trim(),
        description: newRoleDescription.trim(),
        permissions: defaultPerms,
      });
      setNewRoleName("");
      setNewRoleDescription("");
      setShowAddRoleForm(false);
      await onReload();
      setExpandedRoleId(newRole.id);
    } catch (e: any) {
      toast.error(e.message || "Не удалось добавить роль");
    }
  }

  async function handleUpdateRole(roleId: string, patch: Partial<{ name: string; description: string }>) {
    try {
      await updateTemplateRole(templateId, roleId, patch);
      await onReload();
    } catch (e: any) {
      toast.error(e.message || "Не удалось обновить роль");
    }
  }

  async function handleUpdatePermission(roleId: string, area: string, access: TemplateRolePermission["access"]) {
    try {
      await updateTemplateRole(templateId, roleId, {
        permissions: [{ area, access }],
      });
      await onReload();
    } catch (e: any) {
      toast.error(e.message || "Не удалось обновить права");
    }
  }

  async function handleRemoveRole(roleId: string) {
    try {
      await deleteTemplateRole(templateId, roleId);
      await onReload();
    } catch (e: any) {
      toast.error(e.message || "Не удалось удалить роль");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-purple-600" />
            <h2 className="text-lg font-bold">Роли участников проекта</h2>
          </div>
          {!showAddRoleForm && (
            <button
              onClick={() => setShowAddRoleForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              Добавить роль
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Роли определяют права доступа участников к функциям проекта. При создании проекта из этого шаблона роли будут доступны для назначения участникам.
        </p>

        {showAddRoleForm && (
          <div className="p-4 border-2 border-purple-300 rounded-lg bg-purple-50 mb-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Название роли *</label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Например: Тестировщик"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Описание</label>
                  <input
                    type="text"
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Краткое описание роли..."
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">Права доступа можно настроить после создания роли.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddRoleForm(false); setNewRoleName(""); setNewRoleDescription(""); }}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddRole}
                  disabled={!newRoleName.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {roles.map((role) => {
            const isExpanded = expandedRoleId === role.id;
            return (
              <div key={role.id} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Role header */}
                <div
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${isExpanded ? "bg-purple-50 border-b border-slate-200" : "bg-slate-50 hover:bg-slate-100"}`}
                  onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                >
                  <Users size={18} className="text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{role.name || "Без названия"}</span>
                      </div>
                      {role.description && <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!role.isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveRole(role.id); }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Удалить роль"
                    >
                      <Trash2 size={16} />
                    </button>
                    )}
                    {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded: permissions */}
                {isExpanded && (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Название роли *</label>
                        <DebouncedInput
                          value={role.name}
                          onSave={(val) => handleUpdateRole(role.id, { name: val })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Название роли..."
                          required
                          requiredMessage="Название роли не может быть пустым"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Описание роли</label>
                        <DebouncedInput
                          value={role.description}
                          onSave={(val) => handleUpdateRole(role.id, { description: val })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Краткое описание роли..."
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Права доступа</p>
                      <div className="space-y-1.5">
                        {permissionAreas.map((areaDef) => {
                          const permArea = `project.${areaDef.area}`;
                          const perm = role.permissions.find(p => p.area === permArea);
                          const currentAccess = perm?.access || (role.isAdmin ? "full" : "none");
                          const allAccessLevels = [...accessLevels, ...(accessLevels.find(l => l.key === "none") ? [] : [{ key: "none", name: "Нет доступа", description: "" }])];
                          return (
                            <div key={areaDef.area} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg gap-3">
                              <div className="min-w-0">
                                <span className="text-sm font-medium">{areaDef.name}</span>
                                {areaDef.description && <p className="text-xs text-slate-500 mt-0.5">{areaDef.description}</p>}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {allAccessLevels.map((level) => (
                                  <button
                                    key={level.key}
                                    onClick={() => !role.isAdmin && handleUpdatePermission(role.id, permArea, level.key as TemplateRolePermission["access"])}
                                    disabled={role.isAdmin}
                                    className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                                      currentAccess === level.key
                                        ? level.key === "full"
                                          ? "bg-green-600 text-white border-green-600"
                                          : level.key === "view"
                                            ? "bg-amber-500 text-white border-amber-500"
                                            : "bg-slate-500 text-white border-slate-500"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                                    } ${role.isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                                    title={role.isAdmin ? "Права администратора нельзя изменить" : ((level as any).description || level.name)}
                                  >
                                    {level.key === "none" ? <EyeOff size={12} className="inline mr-1" /> : <Eye size={12} className="inline mr-1" />}
                                    {level.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {roles.length === 0 && !showAddRoleForm && (
            <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
              <p className="text-slate-600 mb-3">Нет ролей</p>
              <button
                onClick={() => setShowAddRoleForm(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Добавить первую роль
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
