import { useState } from "react";
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
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────

interface TemplateColumn {
  id: string;
  name: string;
  systemType: string;
  wipLimit: number | null;
  order: number;
  isLocked?: boolean; // non-editable, non-deletable
}

interface TemplateSwimlane {
  id: string;
  name: string;
  value: string;
  wipLimit: number | null;
  order: number;
}

interface TaskField {
  id: string;
  name: string;
  type: "text" | "number" | "datetime" | "select" | "multiselect" | "checkbox" | "user";
  isSystem: boolean;
  isRequired: boolean;
  order: number;
  options?: string[];
}

interface TemplateBoard {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  columns: TemplateColumn[];
  swimlaneGroupBy: string;
  swimlanes: TemplateSwimlane[];
  // Task template config
  priorityType: "priority" | "service_class"; // kanban can choose; scrum always "priority"
  priorityValues: string[];
  estimationUnit: "story_points" | "time"; // scrum can choose; kanban always "time"
  customFields: TaskField[];
}

interface ProjectTemplate {
  id: string;
  name: string;
  type: "scrum" | "kanban";
  description: string;
  boards: TemplateBoard[];
}

// ── Constants ──────────────────────────────────────────────────

// System types assignable to columns (on_pause and cancelled are NOT column types)
const COLUMN_SYSTEM_TYPE_LABELS: Record<string, string> = {
  initial: "Начальный",
  in_progress: "В работе",
  completed: "Выполнено",
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Текст",
  number: "Число",
  datetime: "Дата и время",
  select: "Выпадающий список",
  multiselect: "Множественный выбор",
  checkbox: "Флажок",
  user: "Пользователь",
};

const SWIMLANE_GROUP_LABELS: Record<string, string> = {
  priority: "приоритету",
  service_class: "классу обслуживания",
  assignee: "исполнителю",
  type: "типу задачи",
  tags: "меткам",
};

const DEFAULT_PRIORITY_VALUES = ["Низкий", "Средний", "Высокий", "Критичный"];
const DEFAULT_SERVICE_CLASS_VALUES = ["Ускоренный", "С фиксированной датой", "Стандартный", "Нематериальный"];

function getSystemFieldNames(templateType: "scrum" | "kanban", board: TemplateBoard): string[] {
  const fields = [
    "Название", "Описание", "Статус",
    "Автор", "Исполнитель", "Наблюдатели",
    "Крайний срок выполнения",
  ];

  if (templateType === "scrum") {
    fields.push("Приоритет");
    fields.push("Спринт");
    fields.push(board.estimationUnit === "story_points" ? "Оценка (Story Points)" : "Оценка (время)");
  } else {
    fields.push(board.priorityType === "service_class" ? "Класс обслуживания" : "Приоритет");
    fields.push("Оценка (время)");
  }

  return fields;
}

function createDefaultBoard(name: string, templateType: "scrum" | "kanban"): TemplateBoard {
  const ts = Date.now();
  if (templateType === "scrum") {
    return {
      id: `board-${ts}`,
      name,
      description: "",
      isDefault: false,
      columns: [
        { id: `col-${ts}-0`, name: "Бэклог спринта", systemType: "initial", wipLimit: null, order: 1, isLocked: true },
        { id: `col-${ts}-1`, name: "В работе", systemType: "in_progress", wipLimit: null, order: 2 },
        { id: `col-${ts}-2`, name: "На проверке", systemType: "in_progress", wipLimit: null, order: 3 },
        { id: `col-${ts}-3`, name: "Выполнено", systemType: "completed", wipLimit: null, order: 4 },
      ],
      swimlaneGroupBy: "",
      swimlanes: [],
      priorityType: "priority",
      priorityValues: [...DEFAULT_PRIORITY_VALUES],
      estimationUnit: "story_points",
      customFields: [],
    };
  }
  return {
    id: `board-${ts}`,
    name,
    description: "",
    isDefault: false,
    columns: [
      { id: `col-${ts}-1`, name: "Надо сделать", systemType: "initial", wipLimit: null, order: 1 },
      { id: `col-${ts}-2`, name: "Готово к работе", systemType: "initial", wipLimit: null, order: 2 },
      { id: `col-${ts}-3`, name: "В работе", systemType: "in_progress", wipLimit: null, order: 3 },
      { id: `col-${ts}-4`, name: "На проверке", systemType: "in_progress", wipLimit: null, order: 4 },
      { id: `col-${ts}-5`, name: "Выполнено", systemType: "completed", wipLimit: null, order: 5 },
    ],
    swimlaneGroupBy: "service_class",
    swimlanes: [
      { id: `sw-${ts}-1`, name: "Ускоренный", value: "Ускоренный", wipLimit: null, order: 1 },
      { id: `sw-${ts}-2`, name: "С фиксированной датой", value: "С фиксированной датой", wipLimit: null, order: 2 },
      { id: `sw-${ts}-3`, name: "Стандартный", value: "Стандартный", wipLimit: null, order: 3 },
      { id: `sw-${ts}-4`, name: "Нематериальный", value: "Нематериальный", wipLimit: null, order: 4 },
    ],
    priorityType: "service_class",
    priorityValues: [...DEFAULT_SERVICE_CLASS_VALUES],
    estimationUnit: "time",
    customFields: [],
  };
}

// ── Mock data ──────────────────────────────────────────────────

const INITIAL_TEMPLATES: ProjectTemplate[] = [
  {
    id: "tpl-scrum",
    name: "Scrum стандартный",
    type: "scrum",
    description: "Стандартный шаблон для Scrum-проектов с настройками по умолчанию",
    boards: [
      {
        id: "board-scrum-1",
        name: "Основная доска",
        description: "Доска для основного хода разработки",
        isDefault: true,
        columns: [
          { id: "col-s1", name: "Бэклог спринта", systemType: "initial", wipLimit: null, order: 1, isLocked: true },
          { id: "col-s2", name: "В работе", systemType: "in_progress", wipLimit: null, order: 2 },
          { id: "col-s3", name: "На проверке", systemType: "in_progress", wipLimit: null, order: 3 },
          { id: "col-s4", name: "Выполнено", systemType: "completed", wipLimit: null, order: 4 },
        ],
        swimlaneGroupBy: "",
        swimlanes: [],
        priorityType: "priority",
        priorityValues: [...DEFAULT_PRIORITY_VALUES],
        estimationUnit: "story_points",
        customFields: [],
      },
    ],
  },
  {
    id: "tpl-kanban",
    name: "Kanban стандартный",
    type: "kanban",
    description: "Стандартный шаблон для Kanban-проектов с поддержкой WIP лимитов",
    boards: [
      {
        id: "board-kanban-1",
        name: "Основная доска",
        description: "Kanban-доска с поддержкой WIP лимитов",
        isDefault: true,
        columns: [
          { id: "col-k1", name: "Надо сделать", systemType: "initial", wipLimit: null, order: 1 },
          { id: "col-k2", name: "Готово к работе", systemType: "initial", wipLimit: null, order: 2 },
          { id: "col-k3", name: "В работе", systemType: "in_progress", wipLimit: null, order: 3 },
          { id: "col-k4", name: "На проверке", systemType: "in_progress", wipLimit: null, order: 4 },
          { id: "col-k5", name: "Выполнено", systemType: "completed", wipLimit: null, order: 5 },
        ],
        swimlaneGroupBy: "service_class",
        swimlanes: [
          { id: "sw-1", name: "Ускоренный", value: "Ускоренный", wipLimit: null, order: 1 },
          { id: "sw-2", name: "С фиксированной датой", value: "С фиксированной датой", wipLimit: null, order: 2 },
          { id: "sw-3", name: "Стандартный", value: "Стандартный", wipLimit: null, order: 3 },
          { id: "sw-4", name: "Нематериальный", value: "Нематериальный", wipLimit: null, order: 4 },
        ],
        priorityType: "service_class",
        priorityValues: [...DEFAULT_SERVICE_CLASS_VALUES],
        estimationUnit: "time",
        customFields: [],
      },
    ],
  },
];

// ════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════

export default function ProjectTemplates() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>(INITIAL_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);

  function openEditor(template: ProjectTemplate) {
    setEditingTemplate(JSON.parse(JSON.stringify(template)));
  }

  function handleSaveTemplate(updated: ProjectTemplate) {
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTemplate(null);
  }

  if (editingTemplate) {
    return (
      <TemplateEditor
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => setEditingTemplate(null)}
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
            onEdit={() => openEditor(template)}
          />
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Template Card
// ════════════════════════════════════════════════════════════════

function TemplateCard({ template, onEdit }: { template: ProjectTemplate; onEdit: () => void }) {
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
              template.type === "scrum"
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            }`}>
              {template.type === "scrum" ? "Scrum" : "Kanban"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Досок: </span>
            <span className="font-semibold">{template.boards.length}</span>
          </div>
        </div>

        {/* Boards preview */}
        <div className="space-y-3">
          {template.boards.map((board) => {
            const sysFields = getSystemFieldNames(template.type, board);
            const customNames = board.customFields.map((f) => f.name);
            const allFields = [...sysFields, ...customNames];

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
                  </div>

                  {/* Swimlanes */}
                  {board.swimlaneGroupBy && board.swimlanes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Дорожки (по {SWIMLANE_GROUP_LABELS[board.swimlaneGroupBy] || board.swimlaneGroupBy})
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
                    <div className="flex flex-wrap gap-1.5">
                      {allFields.map((name) => (
                        <span
                          key={name}
                          className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Template Editor
// ════════════════════════════════════════════════════════════════

function TemplateEditor({
  template,
  onSave,
  onCancel,
}: {
  template: ProjectTemplate;
  onSave: (t: ProjectTemplate) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<ProjectTemplate>(template);
  const [activeBoardIndex, setActiveBoardIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"params" | "columns" | "swimlanes" | "template">("params");
  const [saving, setSaving] = useState(false);

  const [columnError, setColumnError] = useState("");

  const board = data.boards[activeBoardIndex];
  const isScrum = data.type === "scrum";

  function updateTemplate(patch: Partial<ProjectTemplate>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function updateBoard(boardIndex: number, patch: Partial<TemplateBoard>) {
    setData((prev) => {
      const boards = [...prev.boards];
      boards[boardIndex] = { ...boards[boardIndex], ...patch };
      return { ...prev, boards };
    });
  }

  function addBoard() {
    const newBoard = createDefaultBoard(`Доска ${data.boards.length + 1}`, data.type);
    // If no boards exist, this one becomes default
    if (data.boards.length === 0) {
      newBoard.isDefault = true;
    }
    setData((prev) => ({ ...prev, boards: [...prev.boards, newBoard] }));
    setActiveBoardIndex(data.boards.length);
    setActiveTab("params");
  }

  function removeBoard(index: number) {
    if (data.boards.length <= 1) return;
    const removedWasDefault = data.boards[index].isDefault;
    setData((prev) => {
      const boards = prev.boards.filter((_, i) => i !== index);
      // If we removed the default board, make the first remaining board default
      if (removedWasDefault && boards.length > 0) {
        boards[0] = { ...boards[0], isDefault: true };
      }
      return { ...prev, boards };
    });
    if (activeBoardIndex >= data.boards.length - 1) {
      setActiveBoardIndex(Math.max(0, data.boards.length - 2));
    }
  }

  function setDefaultBoard(boardIndex: number) {
    setData((prev) => ({
      ...prev,
      boards: prev.boards.map((b, i) => ({ ...b, isDefault: i === boardIndex })),
    }));
  }

  function moveBoard(dragIndex: number, hoverIndex: number) {
    setData((prev) => {
      const boards = [...prev.boards];
      const [removed] = boards.splice(dragIndex, 1);
      boards.splice(hoverIndex, 0, removed);
      return { ...prev, boards };
    });
    setActiveBoardIndex(hoverIndex);
  }

  // ── Column order validation ──────────────────────────────────
  // Rule: initial < in_progress < completed
  // At least one in_progress must exist between initial and completed.

  const PHASE_EARLY = new Set(["initial"]);
  const PHASE_MIDDLE = new Set(["in_progress"]);
  const PHASE_FINAL = new Set(["completed"]);

  function validateColumnOrder(columns: TemplateColumn[]): string | null {
    if (columns.length === 0) return null;

    // Check ordering: all early before all middle before all final
    let phase: "early" | "middle" | "final" = "early";
    let hasMiddle = false;

    for (const col of columns) {
      const st = col.systemType;

      if (PHASE_EARLY.has(st)) {
        if (phase === "middle" || phase === "final") {
          return `Колонка «${col.name || "без названия"}» (тип «${COLUMN_SYSTEM_TYPE_LABELS[st]}») не может стоять после колонок с типом «${phase === "middle" ? "В работе" : "Выполнено"}».`;
        }
      } else if (PHASE_MIDDLE.has(st)) {
        if (phase === "final") {
          return `Колонка «${col.name || "без названия"}» (тип «${COLUMN_SYSTEM_TYPE_LABELS[st]}») не может стоять после колонок с типом «Выполнено».`;
        }
        phase = "middle";
        hasMiddle = true;
      } else if (PHASE_FINAL.has(st)) {
        phase = "final";
      }
    }

    // Must have at least one middle column
    const hasEarly = columns.some((c) => PHASE_EARLY.has(c.systemType));
    const hasFinal = columns.some((c) => PHASE_FINAL.has(c.systemType));
    if (hasEarly && hasFinal && !hasMiddle) {
      return "Между колонками с типом «Начальный» и «Выполнено» должна быть хотя бы одна колонка с типом «В работе».";
    }

    return null;
  }

  // ── Column helpers ──────────────────────────────────────────

  function addColumn() {
    const newCol: TemplateColumn = {
      id: `col-${Date.now()}`,
      name: "",
      systemType: "in_progress",
      wipLimit: null,
      order: board.columns.length + 1,
    };
    const next = [...board.columns, newCol];
    const err = validateColumnOrder(next);
    if (err) { setColumnError(err); return; }
    setColumnError("");
    updateBoard(activeBoardIndex, { columns: next });
  }

  function updateColumn(colId: string, field: string, value: any) {
    const columns = board.columns.map((c) => (c.id === colId ? { ...c, [field]: value } : c));
    if (field === "systemType") {
      const err = validateColumnOrder(columns);
      if (err) { setColumnError(err); return; }
    }
    setColumnError("");
    updateBoard(activeBoardIndex, { columns });
  }

  function removeColumn(colId: string) {
    const col = board.columns.find((c) => c.id === colId);
    if (col?.isLocked) return;
    const columns = board.columns.filter((c) => c.id !== colId);
    columns.forEach((c, i) => (c.order = i + 1));
    const err = validateColumnOrder(columns);
    if (err) { setColumnError(err); return; }
    setColumnError("");
    updateBoard(activeBoardIndex, { columns });
  }

  function moveColumn(colId: string, direction: "up" | "down") {
    const columns = [...board.columns];
    const index = columns.findIndex((c) => c.id === colId);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;
    // Can't move anything above the locked first column
    if (isScrum && (index === 0 || newIndex === 0)) return;
    [columns[index], columns[newIndex]] = [columns[newIndex], columns[index]];
    columns.forEach((c, i) => (c.order = i + 1));
    const err = validateColumnOrder(columns);
    if (err) { setColumnError(err); return; }
    setColumnError("");
    updateBoard(activeBoardIndex, { columns });
  }

  // ── Swimlane helpers ────────────────────────────────────────

  function handleSetSwimlaneGroupBy(value: string) {
    let swimlanes: TemplateSwimlane[] = [];
    if (value === "priority") {
      swimlanes = DEFAULT_PRIORITY_VALUES.map((v, i) => ({
        id: `sw-${Date.now()}-${i}`, name: v, value: v, wipLimit: null, order: i + 1,
      }));
    } else if (value === "service_class") {
      const vals = board.priorityType === "service_class" ? board.priorityValues : DEFAULT_SERVICE_CLASS_VALUES;
      swimlanes = vals.map((v, i) => ({
        id: `sw-${Date.now()}-${i}`, name: v, value: v, wipLimit: null, order: i + 1,
      }));
    }
    updateBoard(activeBoardIndex, { swimlaneGroupBy: value, swimlanes });
  }

  function updateSwimlane(swId: string, field: string, value: any) {
    const swimlanes = board.swimlanes.map((s) => (s.id === swId ? { ...s, [field]: value } : s));
    updateBoard(activeBoardIndex, { swimlanes });
  }

  function removeSwimlane(swId: string) {
    const swimlanes = board.swimlanes.filter((s) => s.id !== swId);
    swimlanes.forEach((s, i) => (s.order = i + 1));
    updateBoard(activeBoardIndex, { swimlanes });
  }

  function moveSwimlane(swId: string, direction: "up" | "down") {
    const swimlanes = [...board.swimlanes];
    const index = swimlanes.findIndex((s) => s.id === swId);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= swimlanes.length) return;
    [swimlanes[index], swimlanes[newIndex]] = [swimlanes[newIndex], swimlanes[index]];
    swimlanes.forEach((s, i) => (s.order = i + 1));
    updateBoard(activeBoardIndex, { swimlanes });
  }

  // ── Save ────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    // TODO: API call
    await new Promise((r) => setTimeout(r, 300));
    onSave(data);
    setSaving(false);
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
            {data.type === "scrum" ? "Scrum" : "Kanban"} — {data.name}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md font-medium flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Сохранение..." : "Сохранить шаблон"}
        </button>
      </div>

      {/* Template info */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <h2 className="text-lg font-bold mb-4">Основная информация</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Название шаблона <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => updateTemplate({ name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Тип проекта</label>
            <input
              type="text"
              value={data.type === "scrum" ? "Scrum" : "Kanban"}
              disabled
              className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Описание</label>
          <textarea
            value={data.description}
            onChange={(e) => updateTemplate({ description: e.target.value })}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={2}
          />
        </div>
      </div>

      {/* Boards section */}
      <DndProvider backend={HTML5Backend}>
      <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
        {/* Board tabs */}
        <div className="border-b border-slate-200 bg-slate-50 px-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-0 pt-3">
            {data.boards.map((b, i) => (
              <DraggableBoardTab
                key={b.id}
                board={b}
                index={i}
                isActive={i === activeBoardIndex}
                canDelete={data.boards.length > 1}
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

        {/* Board settings tabs */}
        {board && (
          <>
            <div className="border-b border-slate-200">
              <div className="flex gap-1 p-2">
                {([
                  { key: "params" as const, icon: Sliders, label: "Параметры" },
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
                  onChange={(patch) => updateBoard(activeBoardIndex, patch)}
                  onSetDefault={() => setDefaultBoard(activeBoardIndex)}
                />
              )}
              {activeTab === "columns" && (
                <BoardColumnsTab
                  columns={board.columns}
                  isScrum={isScrum}
                  error={columnError}
                  onDismissError={() => setColumnError("")}
                  onAdd={addColumn}
                  onUpdate={updateColumn}
                  onRemove={removeColumn}
                  onMove={moveColumn}
                />
              )}
              {activeTab === "swimlanes" && (
                <BoardSwimlanesTab
                  isScrum={isScrum}
                  swimlaneGroupBy={board.swimlaneGroupBy}
                  swimlanes={board.swimlanes}
                  onSetGroupBy={handleSetSwimlaneGroupBy}
                  onUpdate={updateSwimlane}
                  onRemove={removeSwimlane}
                  onMove={moveSwimlane}
                />
              )}
              {activeTab === "template" && (
                <BoardTaskTemplateTab
                  isScrum={isScrum}
                  board={board}
                  onUpdateBoard={(patch) => updateBoard(activeBoardIndex, patch)}
                />
              )}
            </div>
          </>
        )}
      </div>
      </DndProvider>
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
        <input
          type="text"
          value={board.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Введите название доски..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Описание доски</label>
        <textarea
          value={board.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
  onAdd,
  onUpdate,
  onRemove,
  onMove,
}: {
  columns: TemplateColumn[];
  isScrum: boolean;
  error: string;
  onDismissError: () => void;
  onAdd: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
}) {
  return (
    <div className="space-y-4">
      {/* Ordering rule */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Правило порядка колонок:</p>
            <p>
              Колонки с типом <strong>«Начальный»</strong> должны располагаться перед колонками <strong>«В работе»</strong>,
              а те — перед <strong>«Выполнено»</strong>.
              Между «Начальный» и «Выполнено» обязательно должна быть хотя бы одна колонка «В работе».
            </p>
            <p className="mt-1 text-amber-700">
              Статус <strong>«Отменено»</strong> назначается задаче напрямую (не через колонку). Отменённые задачи
              хранятся в отдельном разделе проекта.
            </p>
          </div>
        </div>
      </div>

      {/* Validation error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={onDismissError} className="p-0.5 hover:bg-red-100 rounded">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">
            Настройте колонки доски задач. Каждая колонка должна иметь системный тип.
          </p>
          {isScrum && (
            <p className="text-xs text-purple-600 mt-1">
              Scrum: колонка «Бэклог спринта» обязательна и всегда первая.
            </p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shrink-0"
        >
          <Plus size={18} />
          Добавить колонку
        </button>
      </div>

      <div className="space-y-3">
        {columns.map((column, index) => {
          const locked = !!column.isLocked;
          return (
            <div
              key={column.id}
              className={`p-4 border rounded-lg ${locked ? "border-purple-200 bg-purple-50/50" : "border-slate-200 bg-slate-50"}`}
            >
              <div className={`grid grid-cols-1 gap-3 ${isScrum ? "md:grid-cols-5" : "md:grid-cols-6"}`}>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1">
                    Название колонки *
                    {locked && <Lock size={12} className="inline ml-1 text-purple-500" />}
                  </label>
                  <input
                    type="text"
                    value={column.name}
                    onChange={(e) => onUpdate(column.id, "name", e.target.value)}
                    disabled={locked}
                    className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${locked ? "bg-slate-100 text-slate-500" : ""}`}
                    placeholder="Название..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Системный тип *</label>
                  <select
                    value={column.systemType}
                    onChange={(e) => onUpdate(column.id, "systemType", e.target.value)}
                    disabled={locked}
                    className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${locked ? "bg-slate-100 text-slate-500" : ""}`}
                  >
                    {Object.entries(COLUMN_SYSTEM_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                {!isScrum && (
                  <div>
                    <label className="block text-xs font-medium mb-1">WIP лимит</label>
                    <input
                      type="number"
                      value={column.wipLimit ?? ""}
                      onChange={(e) => onUpdate(column.id, "wipLimit", e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Без лимита"
                    />
                  </div>
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
            </div>
          );
        })}

        {columns.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            <Columns size={48} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-4">Нет колонок</p>
            <button
              onClick={onAdd}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Добавить первую колонку
            </button>
          </div>
        )}
      </div>

      {/* System types reference */}
      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Системные типы статусов задач</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
          <div><span className="font-medium">Начальный</span> — задача создана, но не взята в работу</div>
          <div><span className="font-medium">В работе</span> — задача взята в работу</div>
          <div><span className="font-medium">Выполнено</span> — задача выполнена и закрыта</div>
          <div className="text-slate-400"><span className="font-medium">Отменено</span> — задача не выполнена и закрыта (назначается задаче, не колонке)</div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab: Swimlanes
// ════════════════════════════════════════════════════════════════

function BoardSwimlanesTab({
  isScrum,
  swimlaneGroupBy,
  swimlanes,
  onSetGroupBy,
  onUpdate,
  onRemove,
  onMove,
}: {
  isScrum: boolean;
  swimlaneGroupBy: string;
  swimlanes: TemplateSwimlane[];
  onSetGroupBy: (val: string) => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
}) {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="font-semibold text-slate-700 mb-2">Группировка задач в дорожки</h3>
        <p className="text-sm text-slate-600 mb-2">
          Дорожки автоматически создаются на основе значений выбранного параметра задачи.
        </p>
        <p className="text-xs text-slate-500 mb-4">
          Дорожки можно строить по параметрам следующих типов:
          <strong> Выпадающий список</strong> (дорожка на каждое значение),
          <strong> Флажок</strong> (2 дорожки: да/нет),
          <strong> Пользователь</strong> (дорожка на каждого участника).
        </p>
        <div>
          <label className="block text-sm font-medium mb-2">Группировать задачи по:</label>
          <select
            value={swimlaneGroupBy}
            onChange={(e) => onSetGroupBy(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="">Без дорожек</option>
            <option value="priority">Приоритет задачи</option>
            {!isScrum && <option value="service_class">Класс обслуживания</option>}
            <option value="assignee">Исполнитель</option>
            <option value="type">Тип задачи</option>
            <option value="tags">Метки (теги)</option>
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
                  Группировка по {SWIMLANE_GROUP_LABELS[swimlaneGroupBy] || swimlaneGroupBy}
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

      {swimlaneGroupBy && swimlanes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700">Созданные дорожки ({swimlanes.length})</h3>
          {swimlanes.map((swimlane, index) => (
            <div key={swimlane.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1">Название дорожки</label>
                  <input
                    type="text"
                    value={swimlane.name}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">WIP лимит</label>
                  <input
                    type="number"
                    value={swimlane.wipLimit ?? ""}
                    onChange={(e) => onUpdate(swimlane.id, "wipLimit", e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Без лимита"
                  />
                </div>
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
                  <button
                    onClick={() => onRemove(swimlane.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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
  onUpdateBoard,
}: {
  isScrum: boolean;
  board: TemplateBoard;
  onUpdateBoard: (patch: Partial<TemplateBoard>) => void;
}) {
  // Custom field form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<TaskField["type"]>("text");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState("");

  // Priority/service class value editing
  const [editingValues, setEditingValues] = useState(false);
  const [valueInput, setValueInput] = useState("");
  const [editedValues, setEditedValues] = useState<string[]>([...board.priorityValues]);

  function handleAddCustomField() {
    if (!newName.trim()) return;
    const field: TaskField = {
      id: `cf-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      isSystem: false,
      isRequired: newRequired,
      order: board.customFields.length + 1,
      options: ["select", "multiselect"].includes(newType) ? newOptions : undefined,
    };
    onUpdateBoard({ customFields: [...board.customFields, field] });
    setNewName("");
    setNewType("text");
    setNewRequired(false);
    setNewOptions([]);
    setShowAddForm(false);
  }

  function removeCustomField(fieldId: string) {
    onUpdateBoard({ customFields: board.customFields.filter((f) => f.id !== fieldId) });
  }

  function addOption() {
    if (optionInput.trim() && !newOptions.includes(optionInput.trim())) {
      setNewOptions([...newOptions, optionInput.trim()]);
      setOptionInput("");
    }
  }

  function addValue() {
    if (valueInput.trim() && !editedValues.includes(valueInput.trim())) {
      setEditedValues([...editedValues, valueInput.trim()]);
      setValueInput("");
    }
  }

  function saveValues() {
    onUpdateBoard({ priorityValues: editedValues });
    setEditingValues(false);
  }

  function handlePriorityTypeChange(type: "priority" | "service_class") {
    const values = type === "priority" ? [...DEFAULT_PRIORITY_VALUES] : [...DEFAULT_SERVICE_CLASS_VALUES];
    onUpdateBoard({ priorityType: type, priorityValues: values });
    setEditedValues(values);
  }

  function handleEstimationUnitChange(unit: "story_points" | "time") {
    onUpdateBoard({ estimationUnit: unit });
  }

  // Locked system field row
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

  const priorityLabel = board.priorityType === "service_class" ? "Класс обслуживания" : "Приоритет";

  return (
    <div className="space-y-6">
      {/* System fields */}
      <div>
        <h3 className="text-lg font-bold mb-1">Системные параметры задач</h3>
        <p className="text-sm text-slate-500 mb-4">
          Эти параметры являются обязательными и не могут быть убраны из шаблона.
        </p>

        <div className="space-y-2">
          <LockedField name="Название" description="Текст" />
          <LockedField name="Описание" description="Текст" />
          <LockedField name="Статус" description="Колонка на доске задач" />
          <LockedField name="Автор" description="Пользователь" />
          <LockedField name="Исполнитель" description="Пользователь" />
          <LockedField name="Наблюдатели" description="Список пользователей" />
          <LockedField name="Крайний срок выполнения" description="Дата и время" />

          {/* Priority / Service Class — configurable */}
          <div className="p-4 border border-purple-200 rounded-lg bg-purple-50/50">
            <div className="flex items-center gap-3 mb-3">
              <Lock size={14} className="text-purple-500 shrink-0" />
              <span className="text-sm font-medium">{priorityLabel}</span>
              <span className="text-xs text-slate-400">Обязательный</span>
            </div>

            {/* Kanban: choose between priority and service class */}
            {!isScrum && (
              <div className="mb-3">
                <p className="text-xs text-slate-600 mb-2">Тип параметра:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePriorityTypeChange("priority")}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                      board.priorityType === "priority"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Приоритет
                  </button>
                  <button
                    onClick={() => handlePriorityTypeChange("service_class")}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                      board.priorityType === "service_class"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Класс обслуживания
                  </button>
                </div>
              </div>
            )}

            {/* Current values */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-600">Значения:</p>
                {!editingValues && (
                  <button
                    onClick={() => { setEditingValues(true); setEditedValues([...board.priorityValues]); }}
                    className="text-xs text-purple-600 hover:text-purple-800"
                  >
                    Изменить
                  </button>
                )}
              </div>

              {editingValues ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {editedValues.map((val) => (
                      <span key={val} className="px-2 py-1 bg-white border border-slate-200 rounded text-sm flex items-center gap-1.5">
                        {val}
                        <button onClick={() => setEditedValues(editedValues.filter((v) => v !== val))} className="hover:text-red-600">
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
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addValue())}
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Новое значение..."
                    />
                    <button onClick={addValue} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg"><Plus size={16} /></button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingValues(false)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Отмена</button>
                    <button onClick={saveValues} className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">Сохранить</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {board.priorityValues.map((val) => (
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
              <span className="text-sm font-medium">
                Оценка трудозатрат
              </span>
              <span className="text-xs text-slate-400">Обязательный</span>
            </div>

            {isScrum ? (
              <div>
                <p className="text-xs text-slate-600 mb-2">Единица измерения:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEstimationUnitChange("story_points")}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                      board.estimationUnit === "story_points"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Story Points
                  </button>
                  <button
                    onClick={() => handleEstimationUnitChange("time")}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                      board.estimationUnit === "time"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Время (дни/часы/минуты)
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Единица измерения: дата и время</p>
            )}
          </div>

          {/* Sprint — Scrum only */}
          {isScrum && (
            <LockedField name="Спринт" description="Итерация разработки" />
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
              Добавьте дополнительные параметры для задач
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
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Введите вариант..."
                    />
                    <button onClick={addOption} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors">
                      <Plus size={18} />
                    </button>
                  </div>
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

        {board.customFields.length > 0 ? (
          <div className="space-y-2">
            {board.customFields.map((field) => (
              <div
                key={field.id}
                className="p-4 border border-slate-200 rounded-lg bg-white flex items-center justify-between"
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
                    <p className="text-sm text-slate-600 mt-1">Тип: {FIELD_TYPE_LABELS[field.type]}</p>
                    {field.options && (
                      <p className="text-xs text-slate-500 mt-1">Варианты: {field.options.join(", ")}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeCustomField(field.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
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
