import {
  Calendar,
  User,
  Tag,
  Clock,
  FileText,
  CheckSquare,
  Link as LinkIcon,
  AlertTriangle,
  X,
  Plus,
  Send,
  AtSign,
  Paperclip,
  MessageSquare,
  BarChart3,
  Trash2,
  MoreVertical,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  tasks,
  users,
  projects,
  taskChecklists,
  taskFiles,
  taskComments,
  taskDependencies,
  taskHierarchy,
} from "../data/mockData";
import { UserAvatar } from "../components/UserAvatar";

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const task = tasks.find((t) => t.id === Number(id));
  const [comment, setComment] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "comments">("details");
  const [copied, setCopied] = useState(false);
  
  // Modal states
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  
  // Form states
  const [checklistTitle, setChecklistTitle] = useState("");
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [linkType, setLinkType] = useState<"blocks" | "blocked_by" | "related">("related");
  const [newTag, setNewTag] = useState("");
  
  // Editable task fields
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [taskTags, setTaskTags] = useState<string[]>(task?.tags || []);
  const [assigneeId, setAssigneeId] = useState<number | null>(task?.assigneeId || null);
  const [priority, setPriority] = useState(task?.priority || "Средний");
  const [status, setStatus] = useState(task?.status || "Бэклог");
  const [dueDate, setDueDate] = useState(task?.dueDate || "");
  const [storyPoints, setStoryPoints] = useState(task?.storyPoints || 0);

  // Auto-resize textarea
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  if (!task) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Задача не найдена</h2>
          <p className="text-slate-500">Задача с ID {id} не существует</p>
          <Link
            to="/tasks"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Вернуться к списку задач
          </Link>
        </div>
      </div>
    );
  }

  const project = projects.find((p) => p.id === task.projectId);
  const assignee = assigneeId ? users.find((u) => u.id === assigneeId) : null;
  const author = users.find((u) => u.id === task.authorId);

  // Получаем чек-листы для задачи
  const checklists = taskChecklists.filter((c) => c.taskId === task.id);

  // Получаем файлы задачи
  const files = taskFiles.filter((f) => f.taskId === task.id);

  // Получаем комментарии задачи
  const comments = taskComments.filter((c) => c.taskId === task.id);

  // Получаем зависимости
  const blockingTasks = taskDependencies
    .filter((d) => d.taskId === task.id && d.type === "blocks")
    .map((d) => tasks.find((t) => t.id === d.dependsOnTaskId));

  const blockedByTasks = taskDependencies
    .filter((d) => d.taskId === task.id && d.type === "blocked_by")
    .map((d) => tasks.find((t) => t.id === d.dependsOnTaskId));

  const relatedTasks = taskDependencies
    .filter((d) => (d.taskId === task.id || (d as any).relatedTaskId === task.id) && d.type === "related")
    .map((d) => {
      const relatedId = (d as any).relatedTaskId || d.dependsOnTaskId;
      return tasks.find((t) => t.id === relatedId);
    });

  // Родительские и дочерние задачи
  const parentTask = taskHierarchy
    .filter((h) => h.childTaskId === task.id)
    .map((h) => tasks.find((t) => t.id === h.parentTaskId))[0];

  const childTasks = taskHierarchy
    .filter((h) => h.parentTaskId === task.id)
    .map((h) => tasks.find((t) => t.id === h.childTaskId))
    .filter((t) => t !== undefined);

  const priorityColors = {
    Критический: "bg-red-100 text-red-700 border-red-200",
    Высокий: "bg-orange-100 text-orange-700 border-orange-200",
    Средний: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Низкий: "bg-green-100 text-green-700 border-green-200",
  };

  const handleDeleteTask = () => {
    console.log("Удаление задачи:", { taskId: task.id, reason: deleteReason });
    setShowDeleteModal(false);
    navigate("/tasks");
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    console.log("Добавление комментария:", comment);
    setComment("");
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(task.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !taskTags.includes(newTag.trim())) {
      setTaskTags([...taskTags, newTag.trim()]);
      setNewTag("");
      setShowTagModal(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTaskTags(taskTags.filter((tag) => tag !== tagToRemove));
  };

  const handleAddLink = () => {
    console.log("Создание связи:", { taskId: selectedTask, type: linkType });
    setShowLinkModal(false);
    setSelectedTask(null);
  };

  // Расчёт прогресса
  let progressValue = task.progress;
  let progressSource = "manual";

  if (checklists.length > 0) {
    const totalItems = checklists.reduce((sum, c) => sum + c.items.length, 0);
    const completedItems = checklists.reduce(
      (sum, c) => sum + c.items.filter((i) => i.completed).length,
      0
    );
    if (totalItems > 0) {
      progressValue = Math.round((completedItems / totalItems) * 100);
      progressSource = "checklist";
    }
  }

  if (childTasks.length > 0) {
    const completedChildren = childTasks.filter((t) => t?.status === "Выполнено").length;
    progressValue = Math.round((completedChildren / childTasks.length) * 100);
    progressSource = "subtasks";
  }

  const availableTasks = tasks.filter(
    (t) => t.id !== task.id && t.projectId === task.projectId
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/projects" className="text-slate-600 hover:text-blue-600 transition-colors">
          Проекты
        </Link>
        <ChevronRight size={16} className="text-slate-400" />
        {project && (
          <>
            <Link to={`/board?project=${project.id}`} className="text-slate-600 hover:text-blue-600 transition-colors">
              {project.name}
            </Link>
            <ChevronRight size={16} className="text-slate-400" />
          </>
        )}
        <span className="text-slate-900 font-medium">{task.key}</span>
      </nav>

      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-slate-600 font-mono text-sm flex items-center gap-2">
                {task.key}
                <button
                  onClick={handleCopyKey}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                  title="Копировать ключ"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded">
                {status}
              </span>
              <span className="text-xs text-slate-500">
                {task.updatedAt ? (
                  <>
                    Обновлена: {new Date(task.updatedAt).toLocaleString("ru-RU", {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </>
                ) : (
                  <>
                    Создана: {new Date(task.createdAt).toLocaleString("ru-RU", {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </>
                )}
              </span>
            </div>
            
            {/* Editable Title */}
            <textarea
              value={title}
              onChange={handleTitleChange}
              className="text-3xl font-bold mb-3 w-full px-3 py-2 border-2 border-transparent rounded-lg hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors resize-none overflow-hidden"
              rows={1}
              placeholder="Название задачи"
            />
            
            {/* Editable Description */}
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              className="text-slate-600 w-full px-3 py-2 border-2 border-transparent rounded-lg hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors resize-none overflow-hidden"
              rows={2}
              placeholder="Описание задачи"
            />
          </div>
          <div className="relative group/menu">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreVertical size={20} />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-10 hidden group-hover/menu:block">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <Trash2 size={16} />
                Удалить
              </button>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">
              Прогресс выполнения
              {progressSource === "checklist" && " (по чек-листам)"}
              {progressSource === "subtasks" && " (по подзадачам)"}
            </span>
            <span className="font-semibold text-blue-600">{progressValue}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {taskTags.map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded inline-flex items-center gap-2 group"
            >
              <Tag size={14} />
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </span>
          ))}
          <button
            onClick={() => setShowTagModal(true)}
            className="px-3 py-1 border-2 border-dashed border-slate-300 text-slate-600 text-sm rounded hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            <Plus size={14} />
            Добавить тег
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md border border-slate-100">
        <div className="border-b border-slate-200">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === "details"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FileText size={18} />
              Детали по задаче
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === "comments"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <MessageSquare size={18} />
              Комментарии ({comments.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "details" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Editable Details */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-4">Детали</h2>
                  
                  {/* Assignee */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-slate-600 text-sm mb-2">
                      <User size={16} />
                      <span>Исполнитель</span>
                    </label>
                    <select
                      value={assigneeId || ""}
                      onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Не назначен</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Author */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-slate-600 text-sm mb-2">
                      <User size={16} />
                      <span>Автор</span>
                    </label>
                    {author && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                        <UserAvatar user={author} size="sm" />
                        <span className="text-sm font-medium">{author.fullName}</span>
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-slate-600 text-sm mb-2">
                      <AlertTriangle size={16} />
                      <span>Приоритет</span>
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Низкий">Низкий</option>
                      <option value="Средний">Средний</option>
                      <option value="Высокий">Высокий</option>
                      <option value="Критический">Критический</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-slate-600 text-sm mb-2">
                      <BarChart3 size={16} />
                      <span>Статус</span>
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Бэклог">Бэклог</option>
                      <option value="Планирование">Планирование</option>
                      <option value="В работе">В работе</option>
                      <option value="На проверке">На проверке</option>
                      <option value="Выполнено">Выполнено</option>
                    </select>
                  </div>

                  {/* Due Date */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-slate-600 text-sm mb-2">
                      <Calendar size={16} />
                      <span>Крайний срок</span>
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Story Points */}
                  {project?.type === "scrum" && (
                    <div className="mb-4">
                      <label className="flex items-center gap-2 text-slate-600 text-sm mb-2">
                        <BarChart3 size={16} />
                        <span>Story Points</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={storyPoints}
                        onChange={(e) => setStoryPoints(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Features & Lists */}
              <div className="space-y-6">
                {/* Checklists */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <CheckSquare size={18} />
                      Чек-листы ({checklists.length})
                    </h2>
                    <button 
                      onClick={() => setShowChecklistModal(true)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Добавить
                    </button>
                  </div>
                  {checklists.length > 0 ? (
                    <div className="space-y-4">
                      {checklists.map((checklist) => (
                        <div key={checklist.id} className="border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{checklist.title}</h3>
                            <button
                              onClick={() => console.log("Удаление чек-листа:", checklist.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Удалить чек-лист"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {checklist.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  readOnly
                                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                />
                                <span className={`text-sm flex-1 ${item.completed ? "line-through text-slate-400" : ""}`}>
                                  {item.text}
                                </span>
                                <button
                                  onClick={() => console.log("Удаление пункта чек-листа:", checklist.id, item.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                                  title="Удалить пункт"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-xs text-slate-600">
                            Завершено: {checklist.items.filter((i) => i.completed).length} из{" "}
                            {checklist.items.length}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 py-3">Нет чек-листов</p>
                  )}
                </div>

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Paperclip size={18} />
                      Вложения ({files.length})
                    </h2>
                    <button 
                      onClick={() => setShowAttachmentModal(true)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Добавить
                    </button>
                  </div>
                  {files.length > 0 ? (
                    <div className="space-y-2">
                      {files.map((file) => {
                        const uploader = users.find((u) => u.id === file.uploadedBy);
                        const fileSize = (file.size / 1024 / 1024).toFixed(2);
                        return (
                          <div
                            key={file.id}
                            className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Paperclip size={14} className="text-slate-400" />
                                  <span className="text-sm font-medium">{file.name}</span>
                                </div>
                                <div className="text-xs text-slate-500 ml-5">
                                  {fileSize} MB • {uploader?.fullName}
                                </div>
                              </div>
                              <button
                                onClick={() => console.log("Удаление файла:", file.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                                title="Удалить файл"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 py-3">Нет вложений</p>
                  )}
                </div>

                {/* Links */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <LinkIcon size={18} />
                      Связи
                    </h2>
                    <button 
                      onClick={() => setShowLinkModal(true)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Добавить
                    </button>
                  </div>
                  <div className="space-y-2">
                    {blockingTasks.map((linkedTask) => {
                      if (!linkedTask) return null;
                      const dependency = taskDependencies.find(d => d.taskId === task.id && d.dependsOnTaskId === linkedTask.id && d.type === "blocks");
                      return (
                        <div key={linkedTask.id} className="p-3 border border-slate-200 rounded-lg group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-xs text-red-600 font-medium mb-1">Блокирует</div>
                              <Link
                                to={`/tasks/${linkedTask.id}`}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {linkedTask.key}: {linkedTask.title}
                              </Link>
                            </div>
                            <button
                              onClick={() => console.log("Удаление связи:", dependency?.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                              title="Удалить связь"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {blockedByTasks.map((linkedTask) => {
                      if (!linkedTask) return null;
                      const dependency = taskDependencies.find(d => d.taskId === task.id && d.dependsOnTaskId === linkedTask.id && d.type === "blocked_by");
                      return (
                        <div key={linkedTask.id} className="p-3 border border-slate-200 rounded-lg group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-xs text-orange-600 font-medium mb-1">
                                Заблокирована
                              </div>
                              <Link
                                to={`/tasks/${linkedTask.id}`}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {linkedTask.key}: {linkedTask.title}
                              </Link>
                            </div>
                            <button
                              onClick={() => console.log("Удаление связи:", dependency?.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                              title="Удалить связь"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {relatedTasks.map((linkedTask) => {
                      if (!linkedTask) return null;
                      const dependency = taskDependencies.find(d => 
                        (d.taskId === task.id || (d as any).relatedTaskId === task.id) && 
                        d.type === "related" &&
                        ((d as any).relatedTaskId === linkedTask.id || d.dependsOnTaskId === linkedTask.id)
                      );
                      return (
                        <div key={linkedTask.id} className="p-3 border border-slate-200 rounded-lg group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-xs text-blue-600 font-medium mb-1">Связана с</div>
                              <Link
                                to={`/tasks/${linkedTask.id}`}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {linkedTask.key}: {linkedTask.title}
                              </Link>
                            </div>
                            <button
                              onClick={() => console.log("Удаление связи:", dependency?.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                              title="Удалить связь"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {blockingTasks.length === 0 &&
                      blockedByTasks.length === 0 &&
                      relatedTasks.length === 0 && (
                        <p className="text-sm text-slate-400 py-3">Нет связей</p>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "comments" && (
            <div>
              <div className="space-y-4 mb-6">
                {comments.map((c) => {
                  const commentAuthor = users.find((u) => u.id === c.userId);
                  if (!commentAuthor) return null;

                  return (
                    <div key={c.id} className="flex gap-3">
                      <UserAvatar user={commentAuthor} size="sm" />
                      <div className="flex-1">
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm">
                              {commentAuthor.fullName}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(c.createdAt).toLocaleString("ru-RU")}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                          {c.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {c.attachments.map((att, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs text-blue-600"
                                >
                                  <Paperclip size={12} />
                                  <span>{att.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <UserAvatar user={users[0]} size="sm" />
                <div className="flex-1">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Добавить комментарий... Используйте @ для упоминания"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={handleAddComment}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2"
                    >
                      <Send size={16} />
                      Отправить
                    </button>
                    <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <Paperclip size={18} />
                    </button>
                    <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <AtSign size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Task Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Удалить задачу?</h2>
                <p className="text-sm text-slate-600">Необходимо указать причину</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm mb-1">
                <span className="font-semibold">{task.key}:</span> {task.title}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Причина удаления *
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Укажите причину удаления задачи..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteReason("");
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteTask}
                disabled={!deleteReason.trim()}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Удалить задачу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Checklist Modal */}
      {showChecklistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Создать чек-лист</h2>
              <button
                onClick={() => {
                  setShowChecklistModal(false);
                  setChecklistTitle("");
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Название чек-листа *
              </label>
              <input
                type="text"
                value={checklistTitle}
                onChange={(e) => setChecklistTitle(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Например: Чек-лист по тестированию"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowChecklistModal(false);
                  setChecklistTitle("");
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  console.log("Создание чек-листа:", checklistTitle);
                  setShowChecklistModal(false);
                  setChecklistTitle("");
                }}
                disabled={!checklistTitle.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Attachment Modal */}
      {showAttachmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Добавить вложение</h2>
              <button
                onClick={() => setShowAttachmentModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Выберите файл
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                <Paperclip size={32} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600">
                  Нажмите или перетащите файл сюда
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Максимальный размер: 10 МБ
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAttachmentModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  console.log("Загрузка файла");
                  setShowAttachmentModal(false);
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium"
              >
                Загрузить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Добавить связь</h2>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setSelectedTask(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Тип связи
              </label>
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value as any)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="blocks">Блокирует</option>
                <option value="blocked_by">Заблокирована</option>
                <option value="related">Связана с</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Задача *
              </label>
              <select
                value={selectedTask || ""}
                onChange={(e) => setSelectedTask(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выберите задачу</option>
                {availableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.key}: {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setSelectedTask(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleAddLink}
                disabled={!selectedTask}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Добавить тег</h2>
              <button
                onClick={() => {
                  setShowTagModal(false);
                  setNewTag("");
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Название тега *
              </label>
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Например: Frontend"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddTag();
                  }
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTagModal(false);
                  setNewTag("");
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}