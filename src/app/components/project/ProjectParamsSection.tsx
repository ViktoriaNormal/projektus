import { useState } from "react";
import { Settings, Lock, Plus, Trash2, GripVertical, X, Info } from "lucide-react";
import { toast } from "sonner";
import {
  createProjectParam,
  deleteProjectParam,
  type ProjectParam,
} from "../../api/project-params";
import type { ProjectReferences } from "../../api/boards";

interface ProjectParamsSectionProps {
  projectId: string;
  projectType: string;
  refs: ProjectReferences;
  params: ProjectParam[];
  onReload: () => Promise<void>;
}

function buildFieldTypeLabels(refs: ProjectReferences): Record<string, string> {
  const map: Record<string, string> = {};
  if (refs.fieldTypes) {
    refs.fieldTypes.forEach((ft) => { map[ft.key] = ft.name; });
  }
  return map;
}

const SYSTEM_FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Текст", number: "Число", datetime: "Дата и время", select: "Выпадающий список",
  multiselect: "Множественный выбор", checkbox: "Флажок", user: "Пользователь",
  user_list: "Список пользователей",
};

export default function ProjectParamsSection({
  projectId,
  projectType,
  refs,
  params,
  onReload,
}: ProjectParamsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState("");

  const FIELD_TYPE_LABELS = buildFieldTypeLabels(refs);
  const isScrum = projectType === "scrum";

  // System params always come from refs (they exist in every project)
  const systemProjectParams = refs.systemProjectParams || [];
  // Custom params come from project-level API
  const customParams = params.filter((p) => !p.isSystem);

  async function addCustomParam() {
    if (!newName.trim()) return;
    try {
      await createProjectParam(projectId, {
        name: newName.trim(),
        fieldType: newType,
        isRequired: newRequired,
        order: params.length + 1,
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

  async function removeParam(paramId: string) {
    try {
      await deleteProjectParam(projectId, paramId);
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
          Системные параметры задаются при создании проекта на основе шаблона и не могут быть убраны. Дополнительно можно добавить кастомные параметры.
        </p>

        {/* System params (from refs — always displayed) */}
        <div className="space-y-2 mb-4">
          {systemProjectParams.map((param) => (
            <div key={param.key} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center gap-3">
              <Lock size={14} className="text-slate-400 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{param.name}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                    {SYSTEM_FIELD_TYPE_LABELS[param.fieldType] || FIELD_TYPE_LABELS[param.fieldType] || param.fieldType}
                  </span>
                </div>
                {param.options && param.options.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {param.options.map((opt) => (
                      <span key={opt} className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded">{opt}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {param.isRequired ? "Обязательный" : "Опциональный"}
              </span>
            </div>
          ))}
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              Тип проекта ({isScrum ? "Scrum" : "Kanban"}) фиксируется при создании и определяет доступные функции:
              {isScrum
                ? " спринты, бэклог продукта, Story Points, Burndown-диаграмма."
                : " WIP-лимиты, классы обслуживания, Kanban-аналитика, прогнозирование методом Монте-Карло."
              }
            </p>
          </div>
        </div>

        {/* Custom params */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold">Кастомные параметры проекта</h3>
              <p className="text-sm text-slate-500 mt-0.5">Дополнительные параметры, специфичные для этого проекта.</p>
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
                      <button onClick={addOption} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors" title="Добавить">
                        <Plus size={18} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">
                      Введите вариант и нажмите <strong>+</strong> (или Enter), чтобы добавить.
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
                    id="pp-required"
                    checked={newRequired}
                    onChange={(e) => setNewRequired(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <label htmlFor="pp-required" className="text-sm">Обязательное поле</label>
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
              {customParams.map((param) => (
                <div key={param.id} className="p-4 border border-slate-200 rounded-lg bg-white flex items-center justify-between">
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
                      <p className="text-sm text-slate-600 mt-0.5">Тип: {FIELD_TYPE_LABELS[param.fieldType] || param.fieldType}</p>
                      {param.options && param.options.length > 0 && (
                        <p className="text-xs text-slate-500 mt-0.5">Варианты: {param.options.join(", ")}</p>
                      )}
                    </div>
                  </div>
                  {!param.isSystem && (
                    <button
                      onClick={() => removeParam(param.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
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
