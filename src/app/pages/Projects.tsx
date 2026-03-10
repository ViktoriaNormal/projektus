import { useState } from "react";
import { Link } from "react-router";
import {
  Plus,
  Search,
  Filter,
  Users,
  CheckSquare,
  Calendar,
  MoreVertical,
  Archive,
  Edit,
  Trash2,
  AlertTriangle,
  X,
  Settings,
} from "lucide-react";
import { projects, users, projectTemplates, currentUser } from "../data/mockData";
import { UserAvatar } from "../components/UserAvatar";

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    key: "",
    type: "scrum",
    description: "",
    ownerId: currentUser.id,
    templateId: "",
    status: "Активный",
  });

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || project.type === filterType;
    const matchesStatus = filterStatus === "all" || project.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Создание проекта:", formData);
    setShowCreateModal(false);
    resetForm();
  };

  const handleEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Редактирование проекта:", formData);
    setShowEditModal(false);
    setSelectedProject(null);
    resetForm();
  };

  const handleDeleteProject = () => {
    console.log("Удаление проекта:", selectedProject);
    setShowDeleteModal(false);
    setSelectedProject(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      key: "",
      type: "scrum",
      description: "",
      ownerId: currentUser.id,
      templateId: "",
      status: "Активный",
    });
  };

  const openEditModal = (project: any) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      key: project.key,
      type: project.type,
      description: project.description,
      ownerId: project.ownerId,
      templateId: "",
      status: project.status,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (project: any) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  // Генерация ключа проекта из названия
  const generateKey = (name: string) => {
    const words = name.trim().split(" ");
    if (words.length === 1) {
      return words[0].substring(0, 4).toUpperCase();
    }
    return words
      .slice(0, 3)
      .map(w => w[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Проекты</h1>
          <p className="text-slate-600 mt-1">Управление всеми проектами системы</p>
        </div>
        <div className="flex gap-2">
          {currentUser.role === "Администратор" && (
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Settings size={20} />
              Шаблоны проектов
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Plus size={20} />
            Создать проект
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Поиск по названию или ключу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все типы</option>
            <option value="scrum">Scrum</option>
            <option value="kanban">Kanban</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все статусы</option>
            <option value="Активный">Активный</option>
            <option value="Приостановлен">Приостановлен</option>
            <option value="Архивирован">Архивирован</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.map((project) => {
          const owner = users.find((u) => u.id === project.ownerId);
          const statusColors = {
            Активный: "bg-green-100 text-green-700 border-green-200",
            Приостановлен: "bg-yellow-100 text-yellow-700 border-yellow-200",
            Архивирован: "bg-slate-100 text-slate-700 border-slate-200",
          };

          return (
            <div
              key={project.id}
              className="bg-white rounded-xl p-6 shadow-md border border-slate-100 hover:shadow-lg transition-all group cursor-pointer"
              onClick={() => window.location.href = `/projects/${project.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-mono font-bold rounded">
                      {project.key}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        project.type === "scrum"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {project.type === "scrum" ? "Scrum" : "Kanban"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{project.name}</h3>
                </div>
                <div className="relative group/menu">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical size={20} />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-10 hidden group-hover/menu:block">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(project);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Edit size={16} />
                      Редактировать
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Archive size={16} />
                      Архивировать
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(project);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Удалить
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                {project.description}
              </p>

              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded border ${
                    statusColors[project.status as keyof typeof statusColors]
                  }`}
                >
                  {project.status}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {owner && <UserAvatar user={owner} size="sm" />}
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Ответственный</p>
                  <p className="text-sm font-medium">{owner?.fullName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-1">
                  <Users size={16} />
                  <span>{project.memberCount} участников</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckSquare size={16} />
                  <span>{project.taskCount} задач</span>
                </div>
              </div>

              <Link
                to={`/projects/${project.id}`}
                onClick={(e) => e.stopPropagation()}
                className="block w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-center rounded-lg transition-all shadow-sm font-medium"
              >
                Перейти к проекту
              </Link>
            </div>
          );
        })}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Создать новый проект</h2>
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
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название проекта *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (!formData.key) {
                      setFormData({ ...formData, name: e.target.value, key: generateKey(e.target.value) });
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите название..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ключ проекта</label>
                <input
                  type="text"
                  value={formData.key || generateKey(formData.name)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                  placeholder="Будет сгенерирован автоматически"
                  disabled
                />
                <p className="text-xs text-slate-500 mt-1">Ключ генерируется автоматически и не может быть изменён</p>
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
                <p className="text-xs text-slate-500 mt-1">Тип проекта нельзя будет изменить после создания</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Опишите цели и задачи проекта..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ответственный *</label>
                <select 
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {users.filter(u => u.isActive).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Шаблон проекта</label>
                <select 
                  value={formData.templateId}
                  onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Без шаблона</option>
                  {projectTemplates
                    .filter(t => t.type === formData.type)
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Шаблон определяет начальные настройки проекта</p>
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
                  Создать проект
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Редактировать проект</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedProject(null);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название проекта *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ключ проекта</label>
                <input
                  type="text"
                  value={formData.key}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                  disabled
                />
                <p className="text-xs text-slate-500 mt-1">Ключ проекта нельзя изменить</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Тип проекта</label>
                <input
                  type="text"
                  value={formData.type === "scrum" ? "Scrum" : "Kanban"}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                  disabled
                />
                <p className="text-xs text-slate-500 mt-1">Тип проекта нельзя изменить</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ответственный *</label>
                <select 
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {users.filter(u => u.isActive).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Статус проекта *</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Активный">Активный</option>
                  <option value="Приостановлен">Приостановлен</option>
                  <option value="Архивирован">Архивирован</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedProject(null);
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
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Удалить проект?</h2>
                <p className="text-sm text-slate-600">Это действие нельзя отменить</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm mb-2">
                <span className="font-semibold">Проект:</span> {selectedProject.name}
              </p>
              <p className="text-sm mb-2">
                <span className="font-semibold">Ключ:</span> {selectedProject.key}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Задач:</span> {selectedProject.taskCount}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Внимание!</strong> При удалении проекта будут безвозвратно удалены все связанные данные: задачи, спринты, доски, история и комментарии.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedProject(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteProject}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Удалить проект
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Management Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Шаблоны проектов</h2>
                <p className="text-sm text-slate-600 mt-1">Управление шаблонами для создания проектов</p>
              </div>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {projectTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold">{template.name}</h3>
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
                      <p className="text-sm text-slate-600">{template.description}</p>
                    </div>
                    {!template.isSystem && (
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <Edit size={16} />
                        </button>
                        <button className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600 font-medium mb-1">Колонки:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.columns.map((col: any) => (
                          <span
                            key={col.id}
                            className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
                          >
                            {col.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    {template.customFields.length > 0 && (
                      <div>
                        <p className="text-slate-600 font-medium mb-1">Кастомные поля:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.customFields.map((field: any) => (
                            <span
                              key={field.id}
                              className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded"
                            >
                              {field.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button className="w-full px-4 py-2.5 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2">
                <Plus size={20} />
                Создать новый шаблон
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">Проекты не найдены</p>
        </div>
      )}
    </div>
  );
}