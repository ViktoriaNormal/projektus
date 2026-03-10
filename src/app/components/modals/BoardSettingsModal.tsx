import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Settings,
  Columns,
  Layers,
  RefreshCw,
  FileText,
  Check,
  Sliders,
} from "lucide-react";

interface Column {
  id: number;
  name: string;
  systemType: string;
  wipLimit: number | null;
  order: number;
}

interface Swimlane {
  id: number;
  name: string;
  wipLimit: number | null;
  order: number;
  value: string; // значение параметра для фильтрации
}

interface TaskField {
  id: number;
  name: string;
  type: "text" | "number" | "date" | "select" | "multiselect" | "checkbox" | "user";
  isSystem: boolean;
  isRequired: boolean;
  order: number;
  options?: string[];
}

interface BoardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardName: string;
  boardDescription?: string;
  columns: Column[];
  swimlaneGroupBy: string;
  swimlanes: Swimlane[];
  availableSwimlaneValues: string[]; // доступные значения для выбранного параметра
  onSave: (
    columns: Column[], 
    swimlaneGroupBy: string, 
    swimlanes: Swimlane[], 
    selectedSystemFields?: number[], 
    customFields?: TaskField[],
    boardName?: string,
    boardDescription?: string
  ) => void;
}

const SYSTEM_FIELDS: TaskField[] = [
  { id: 1, name: "Название", type: "text", isSystem: true, isRequired: true, order: 1 },
  { id: 2, name: "Описание", type: "text", isSystem: true, isRequired: false, order: 2 },
  { id: 3, name: "Исполнитель", type: "user", isSystem: true, isRequired: false, order: 3 },
  { id: 4, name: "Приоритет", type: "select", isSystem: true, isRequired: false, order: 4, options: ["Низкий", "Средний", "Высокий", "Критический"] },
  { id: 5, name: "Метки", type: "multiselect", isSystem: true, isRequired: false, order: 5 },
  { id: 6, name: "Дата начала", type: "date", isSystem: true, isRequired: false, order: 6 },
  { id: 7, name: "Дата завершения", type: "date", isSystem: true, isRequired: false, order: 7 },
  { id: 8, name: "Оценка времени", type: "number", isSystem: true, isRequired: false, order: 8 },
];

export default function BoardSettingsModal({
  isOpen,
  onClose,
  boardName,
  boardDescription,
  columns: initialColumns,
  swimlaneGroupBy: initialSwimlaneGroupBy,
  swimlanes: initialSwimlanes,
  availableSwimlaneValues,
  onSave,
}: BoardSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"columns" | "swimlanes" | "template" | "params">("columns");
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [swimlaneGroupBy, setSwimlaneGroupBy] = useState<string>(initialSwimlaneGroupBy);
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>(initialSwimlanes);

  // Board params state
  const [editedBoardName, setEditedBoardName] = useState<string>(boardName || "");
  const [editedBoardDescription, setEditedBoardDescription] = useState<string>(boardDescription || "");

  // Task Template state
  const [selectedSystemFields, setSelectedSystemFields] = useState<number[]>([1, 2, 3, 4]);
  const [customFields, setCustomFields] = useState<TaskField[]>([]);
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<TaskField["type"]>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState("");

  // Автоматически создаём дорожки при смене параметра группировки
  useEffect(() => {
    if (swimlaneGroupBy && availableSwimlaneValues.length > 0) {
      const newSwimlanes: Swimlane[] = availableSwimlaneValues.map((value, index) => {
        // Сохраняем WIP-лимит, если дорожка уже существовала
        const existingSwimlane = swimlanes.find((s) => s.value === value);
        return {
          id: existingSwimlane?.id || Date.now() + index,
          name: value,
          value: value,
          wipLimit: existingSwimlane?.wipLimit || null,
          order: index + 1,
        };
      });
      setSwimlanes(newSwimlanes);
    } else if (!swimlaneGroupBy) {
      setSwimlanes([]);
    }
  }, [swimlaneGroupBy, availableSwimlaneValues.join(',')]);

  if (!isOpen) return null;

  const handleAddColumn = () => {
    const newColumn: Column = {
      id: Date.now(),
      name: "",
      systemType: "in_progress",
      wipLimit: null,
      order: columns.length + 1,
    };
    setColumns([...columns, newColumn]);
  };

  const handleUpdateColumn = (id: number, field: string, value: any) => {
    setColumns(
      columns.map((col) => (col.id === id ? { ...col, [field]: value } : col))
    );
  };

  const handleRemoveColumn = (id: number) => {
    setColumns(columns.filter((col) => col.id !== id));
  };

  const handleMoveColumn = (id: number, direction: "up" | "down") => {
    const index = columns.findIndex((col) => col.id === id);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= columns.length) return;
    
    const newColumns = [...columns];
    [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];
    newColumns.forEach((col, i) => (col.order = i + 1));
    setColumns(newColumns);
  };

  const handleUpdateSwimlane = (id: number, field: string, value: any) => {
    setSwimlanes(
      swimlanes.map((swim) => (swim.id === id ? { ...swim, [field]: value } : swim))
    );
  };

  const handleRemoveSwimlane = (id: number) => {
    setSwimlanes(swimlanes.filter((swim) => swim.id !== id));
  };

  const handleMoveSwimlane = (id: number, direction: "up" | "down") => {
    const index = swimlanes.findIndex((swim) => swim.id === id);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= swimlanes.length) return;
    
    const newSwimlanes = [...swimlanes];
    [newSwimlanes[index], newSwimlanes[newIndex]] = [newSwimlanes[newIndex], newSwimlanes[index]];
    newSwimlanes.forEach((swim, i) => (swim.order = i + 1));
    setSwimlanes(newSwimlanes);
  };

  // Task Template handlers
  const handleToggleSystemField = (fieldId: number) => {
    // Название всегда обязательно
    if (fieldId === 1) return;
    
    if (selectedSystemFields.includes(fieldId)) {
      setSelectedSystemFields(selectedSystemFields.filter((id) => id !== fieldId));
    } else {
      setSelectedSystemFields([...selectedSystemFields, fieldId]);
    }
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return;

    const newField: TaskField = {
      id: Date.now(),
      name: newFieldName,
      type: newFieldType,
      isSystem: false,
      isRequired: newFieldRequired,
      order: SYSTEM_FIELDS.length + customFields.length + 1,
      options: ["select", "multiselect"].includes(newFieldType) ? newFieldOptions : undefined,
    };

    setCustomFields([...customFields, newField]);
    setNewFieldName("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setNewFieldOptions([]);
    setShowAddFieldForm(false);
  };

  const handleRemoveCustomField = (fieldId: number) => {
    setCustomFields(customFields.filter((f) => f.id !== fieldId));
  };

  const handleAddOption = () => {
    if (optionInput.trim() && !newFieldOptions.includes(optionInput.trim())) {
      setNewFieldOptions([...newFieldOptions, optionInput.trim()]);
      setOptionInput("");
    }
  };

  const handleRemoveOption = (option: string) => {
    setNewFieldOptions(newFieldOptions.filter((o) => o !== option));
  };

  const typeLabels = {
    text: "Текст",
    number: "Число",
    date: "Дата",
    select: "Выпадающий список",
    multiselect: "Множественный выбор",
    checkbox: "Флажок",
    user: "Пользователь",
  };

  const handleSave = () => {
    onSave(columns, swimlaneGroupBy, swimlanes, selectedSystemFields, customFields, editedBoardName, editedBoardDescription);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold">Настройки доски</h2>
            <p className="text-sm text-slate-600 mt-1">{boardName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setActiveTab("params")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === "params"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Sliders size={20} />
              Параметры доски
            </button>
            <button
              onClick={() => setActiveTab("columns")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === "columns"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Columns size={20} />
              Колонки ({columns.length})
            </button>
            <button
              onClick={() => setActiveTab("swimlanes")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === "swimlanes"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Layers size={20} />
              Дорожки ({swimlanes.length})
            </button>
            <button
              onClick={() => setActiveTab("template")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === "template"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FileText size={20} />
              Шаблон задачи
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "params" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-3">Основные параметры</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Настройте название и описание доски задач
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Название доски *
                  </label>
                  <input
                    type="text"
                    value={editedBoardName}
                    onChange={(e) => setEditedBoardName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Введите название доски..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Описание доски
                  </label>
                  <textarea
                    value={editedBoardDescription}
                    onChange={(e) => setEditedBoardDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Для каких задач предназначена доска..."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "columns" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Настройте колонки доски задач. Каждая колонка должна иметь системный тип.
                </p>
                <button
                  onClick={handleAddColumn}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  Добавить колонку
                </button>
              </div>

              <div className="space-y-3">
                {columns.map((column, index) => (
                  <div
                    key={column.id}
                    className="p-4 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium mb-1">
                          Название колонки *
                        </label>
                        <input
                          type="text"
                          value={column.name}
                          onChange={(e) =>
                            handleUpdateColumn(column.id, "name", e.target.value)
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Название..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Системный тип *</label>
                        <select
                          value={column.systemType}
                          onChange={(e) =>
                            handleUpdateColumn(column.id, "systemType", e.target.value)
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="initial">Начальный</option>
                          <option value="in_progress">В процессе</option>
                          <option value="on_pause">На паузе</option>
                          <option value="completed">Завершён</option>
                          <option value="cancelled">Отменён</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">WIP лимит</label>
                        <input
                          type="number"
                          value={column.wipLimit || ""}
                          onChange={(e) =>
                            handleUpdateColumn(
                              column.id,
                              "wipLimit",
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Без лимита"
                        />
                      </div>

                      <div className="flex items-end gap-1">
                        <button
                          onClick={() => handleMoveColumn(column.id, "up")}
                          disabled={index === 0}
                          className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Переместить вверх"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => handleMoveColumn(column.id, "down")}
                          disabled={index === columns.length - 1}
                          className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Переместить вниз"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          onClick={() => handleRemoveColumn(column.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {columns.length === 0 && (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                    <Columns size={48} className="mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-600 mb-4">Нет колонок</p>
                    <button
                      onClick={handleAddColumn}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Добавить первую колонку
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "swimlanes" && (
            <div className="space-y-4">
              <div className="mb-6">
                <h3 className="font-semibold text-slate-700 mb-2">Группировка задач в дорожки</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Дорожки автоматически создаются на основе значений выбранного параметра задачи.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Группировать задачи по:</label>
                    <select
                      value={swimlaneGroupBy}
                      onChange={(e) => setSwimlaneGroupBy(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Без дорожек</option>
                      <option value="priority">Приоритет задачи</option>
                      <option value="assignee">Исполнитель</option>
                      <option value="type">Тип задачи</option>
                      <option value="tags">Метки (теги)</option>
                    </select>
                  </div>

                  {swimlaneGroupBy && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Layers size={20} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-900 mb-1">
                            {swimlaneGroupBy === "priority" && "Группировка по приоритету"}
                            {swimlaneGroupBy === "assignee" && "Группировка по исполнителю"}
                            {swimlaneGroupBy === "type" && "Группировка по типу задачи"}
                            {swimlaneGroupBy === "tags" && "Группировка по меткам"}
                          </h4>
                          <p className="text-sm text-blue-700">
                            {swimlaneGroupBy === "priority" && "Дорожки будут созданы автоматически для каждого приоритета (Критический, Высокий, Средний, Низкий)."}
                            {swimlaneGroupBy === "assignee" && "Дорожки будут созданы автоматически для каждого исполнителя задачи."}
                            {swimlaneGroupBy === "type" && "Дорожки будут созданы автоматически для каждого типа задачи (История, Задача, Баг и т.д.)."}
                            {swimlaneGroupBy === "tags" && "Дорожки будут созданы автоматически для каждой уникальной метки задачи."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700">Созданные дорожки ({swimlanes.length})</h3>
                  </div>
                  
                  {swimlanes.map((swimlane, index) => (
                    <div
                      key={swimlane.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium mb-1">
                            Название дорожки
                          </label>
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
                            value={swimlane.wipLimit || ""}
                            onChange={(e) =>
                              handleUpdateSwimlane(
                                swimlane.id,
                                "wipLimit",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Без лимита"
                          />
                        </div>

                        <div className="flex items-end gap-1">
                          <button
                            onClick={() => handleMoveSwimlane(swimlane.id, "up")}
                            disabled={index === 0}
                            className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Переместить вверх"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            onClick={() => handleMoveSwimlane(swimlane.id, "down")}
                            disabled={index === swimlanes.length - 1}
                            className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Переместить вниз"
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveSwimlane(swimlane.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Удалить"
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
          )}

          {activeTab === "template" && (
            <div className="space-y-6">
              {/* System Fields */}
              <div>
                <h3 className="text-lg font-bold mb-3">Системные параметры</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Выберите системные параметры, которые будут использоваться в задачах
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SYSTEM_FIELDS.map((field) => (
                    <button
                      key={field.id}
                      onClick={() => handleToggleSystemField(field.id)}
                      disabled={field.id === 1}
                      className={`p-4 border-2 rounded-lg transition-all text-left ${
                        selectedSystemFields.includes(field.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      } ${field.id === 1 ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{field.name}</p>
                            {field.isRequired && (
                              <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                                обязательное
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            Тип: {typeLabels[field.type]}
                          </p>
                          {field.options && (
                            <p className="text-xs text-slate-500 mt-1">
                              Варианты: {field.options.join(", ")}
                            </p>
                          )}
                        </div>
                        {selectedSystemFields.includes(field.id) && (
                          <Check className="text-blue-600 flex-shrink-0" size={20} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold">Кастомные параметры</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Добавьте дополнительные параметры для задач
                    </p>
                  </div>
                  {!showAddFieldForm && (
                    <button
                      onClick={() => setShowAddFieldForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Добавить параметр
                    </button>
                  )}
                </div>

                {showAddFieldForm && (
                  <div className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50 mb-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Название параметра *</label>
                          <input
                            type="text"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Например: Отдел"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Тип параметра *</label>
                          <select
                            value={newFieldType}
                            onChange={(e) => setNewFieldType(e.target.value as TaskField["type"])}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="text">Текст</option>
                            <option value="number">Число</option>
                            <option value="date">Дата</option>
                            <option value="select">Выпадающий список</option>
                            <option value="multiselect">Множественный выбор</option>
                            <option value="checkbox">Флажок</option>
                            <option value="user">Пользователь</option>
                          </select>
                        </div>
                      </div>

                      {["select", "multiselect"].includes(newFieldType) && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Варианты для выбора</label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={optionInput}
                              onChange={(e) => setOptionInput(e.target.value)}
                              onKeyPress={(e) => e.key === "Enter" && handleAddOption()}
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Введите вариант..."
                            />
                            <button
                              onClick={handleAddOption}
                              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                          {newFieldOptions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {newFieldOptions.map((option) => (
                                <span
                                  key={option}
                                  className="px-2 py-1 bg-white border border-slate-200 rounded text-sm flex items-center gap-2"
                                >
                                  {option}
                                  <button
                                    onClick={() => handleRemoveOption(option)}
                                    className="hover:text-red-600"
                                  >
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
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <label htmlFor="field-required" className="text-sm">
                          Обязательное поле
                        </label>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            setShowAddFieldForm(false);
                            setNewFieldName("");
                            setNewFieldType("text");
                            setNewFieldRequired(false);
                            setNewFieldOptions([]);
                          }}
                          className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={handleAddCustomField}
                          disabled={!newFieldName.trim()}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Добавить
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {customFields.length > 0 ? (
                  <div className="space-y-2">
                    {customFields.map((field) => (
                      <div
                        key={field.id}
                        className="p-4 border border-slate-200 rounded-lg bg-white flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical size={18} className="text-slate-400 cursor-move" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{field.name}</p>
                              {field.isRequired && (
                                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                                  обязательное
                                </span>
                              )}
                              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                кастомное
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">
                              Тип: {typeLabels[field.type]}
                            </p>
                            {field.options && (
                              <p className="text-xs text-slate-500 mt-1">
                                Варианты: {field.options.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCustomField(field.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : !showAddFieldForm ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                    <p className="text-slate-600 mb-3">Нет кастомных параметров</p>
                    <button
                      onClick={() => setShowAddFieldForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Добавить первый параметр
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Preview */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-bold mb-3">Предпросмотр шаблона</h3>
                <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    Активные параметры задачи ({selectedSystemFields.length + customFields.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SYSTEM_FIELDS.filter((f) => selectedSystemFields.includes(f.id)).map((field) => (
                      <span
                        key={field.id}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-sm"
                      >
                        {field.name}
                        {field.isRequired && <span className="text-red-600 ml-1">*</span>}
                      </span>
                    ))}
                    {customFields.map((field) => (
                      <span
                        key={field.id}
                        className="px-2 py-1 bg-blue-100 border border-blue-200 rounded text-sm"
                      >
                        {field.name}
                        {field.isRequired && <span className="text-red-600 ml-1">*</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md font-medium"
          >
            Сохранить изменения
          </button>
        </div>
      </div>
    </div>
  );
}