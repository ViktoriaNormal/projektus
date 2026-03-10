import { useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Settings,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { projectTemplates, currentUser } from "../../data/mockData";

export default function ProjectTemplates() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "scrum",
    description: "",
    columns: [] as any[],
    customFields: [] as any[],
  });

  // Проверка прав администратора
  if (currentUser.role !== "Администратор") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Доступ запрещён</h2>
          <p className="text-slate-500">
            Управление шаблонами доступно только администраторам
          </p>
        </div>
      </div>
    );
  }

  const openEditModal = (template: any) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      description: template.description,
      columns: template.columns,
      customFields: template.customFields,
    });
    setShowEditModal(true);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Создание шаблона:", formData);
    setShowCreateModal(false);
    resetForm();
  };

  const handleEditTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Редактирование шаблона:", formData);
    setShowEditModal(false);
    setSelectedTemplate(null);
    resetForm();
  };

  const handleDeleteTemplate = (templateId: number) => {
    if (confirm("Вы уверены, что хотите удалить этот шаблон?")) {
      console.log("Удаление шаблона:", templateId);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "scrum",
      description: "",
      columns: [],
      customFields: [],
    });
  };

  const addColumn = () => {
    const newColumn = {
      id: `col-${Date.now()}`,
      name: "",
      type: "initial",
      wipLimit: null,
      order: formData.columns.length + 1,
    };
    setFormData({ ...formData, columns: [...formData.columns, newColumn] });
  };

  const updateColumn = (index: number, field: string, value: any) => {
    const updated = [...formData.columns];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, columns: updated });
  };

  const removeColumn = (index: number) => {
    const updated = formData.columns.filter((_, i) => i !== index);
    setFormData({ ...formData, columns: updated });
  };

  const moveColumn = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.columns.length) return;

    const updated = [...formData.columns];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((col, i) => (col.order = i + 1));
    setFormData({ ...formData, columns: updated });
  };

  const addCustomField = () => {
    const newField = {
      id: `field-${Date.now()}`,
      name: "",
      type: "text",
      options: [],
    };
    setFormData({ ...formData, customFields: [...formData.customFields, newField] });
  };

  const updateCustomField = (index: number, field: string, value: any) => {
    const updated = [...formData.customFields];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, customFields: updated });
  };

  const removeCustomField = (index: number) => {
    const updated = formData.customFields.filter((_, i) => i !== index);
    setFormData({ ...formData, customFields: updated });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Шаблоны проектов</h1>
          <p className="text-slate-600 mt-1">
            Управление шаблонами для создания новых проектов
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Создать шаблон
        </button>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {projectTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-xl p-6 shadow-md border border-slate-100 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold">{template.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      template.type === "scrum"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {template.type === "scrum" ? "Scrum" : "Kanban"}
                  </span>
                  {template.isSystem && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-700">
                      Системный
                    </span>
                  )}
                </div>
                <p className="text-slate-600">{template.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(template)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                </button>
                {!template.isSystem && (
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Колонки ({template.columns.length}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {template.columns.map((col: any) => (
                    <span
                      key={col.id}
                      className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
                    >
                      {col.name}
                      {col.wipLimit && ` (WIP: ${col.wipLimit})`}
                    </span>
                  ))}
                </div>
              </div>

              {template.customFields.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    Кастомные поля ({template.customFields.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.customFields.map((field: any) => (
                      <span
                        key={field.id}
                        className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded"
                      >
                        {field.name} ({field.type})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-500">
              Создан: {new Date(template.createdAt).toLocaleDateString("ru-RU")}
            </div>
          </div>
        ))}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Создать шаблон проекта</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Название шаблона *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Тип проекта *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="scrum">Scrum</option>
                    <option value="kanban">Kanban</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Columns Configuration */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Колонки доски</h3>
                  <button
                    type="button"
                    onClick={addColumn}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Добавить колонку
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.columns.map((column, index) => (
                    <div
                      key={column.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium mb-1">
                            Название колонки *
                          </label>
                          <input
                            type="text"
                            value={column.name}
                            onChange={(e) =>
                              updateColumn(index, "name", e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1">Тип *</label>
                          <select
                            value={column.type}
                            onChange={(e) =>
                              updateColumn(index, "type", e.target.value)
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
                          <label className="block text-xs font-medium mb-1">
                            WIP лимит
                          </label>
                          <input
                            type="number"
                            value={column.wipLimit || ""}
                            onChange={(e) =>
                              updateColumn(
                                index,
                                "wipLimit",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Не указан"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => moveColumn(index, "up")}
                          disabled={index === 0}
                          className="p-1.5 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveColumn(index, "down")}
                          disabled={index === formData.columns.length - 1}
                          className="p-1.5 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeColumn(index)}
                          className="ml-auto p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {formData.columns.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      Нет добавленных колонок
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Fields Configuration */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Кастомные поля</h3>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Добавить поле
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.customFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 border border-slate-200 rounded-lg bg-indigo-50"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            Название поля *
                          </label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) =>
                              updateCustomField(index, "name", e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1">Тип *</label>
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateCustomField(index, "type", e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="text">Текст</option>
                            <option value="number">Число</option>
                            <option value="date">Дата</option>
                            <option value="select">Выбор</option>
                            <option value="multiselect">Множественный выбор</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => removeCustomField(index)}
                          className="ml-auto p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {formData.customFields.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-sm">
                      Нет кастомных полей
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md font-medium"
                >
                  Создать шаблон
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
