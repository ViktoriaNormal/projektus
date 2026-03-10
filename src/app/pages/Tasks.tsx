import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Filter } from "lucide-react";
import { tasks, users, projects } from "../data/mockData";

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      filterPriority === "all" || task.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const priorityColors = {
    Критический: "bg-red-100 text-red-700 border-red-200",
    Высокий: "bg-orange-100 text-orange-700 border-orange-200",
    Средний: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Низкий: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Все задачи</h1>
          <p className="text-slate-600 mt-1">Управление задачами по всем проектам</p>
        </div>
        <button className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2">
          <Plus size={20} />
          Создать задачу
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Поиск задач..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все приоритеты</option>
            <option value="Критический">Критический</option>
            <option value="Высокий">Высокий</option>
            <option value="Средний">Средний</option>
            <option value="Низкий">Низкий</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все статусы</option>
            <option value="Бэклог">Бэклог</option>
            <option value="В работе">В работе</option>
            <option value="Выполнено">Выполнено</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => {
          const project = projects.find((p) => p.id === task.projectId);
          const assignee = users.find((u) => u.id === task.assigneeId);
          const author = users.find((u) => u.id === task.authorId);

          return (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="block bg-white rounded-xl p-6 shadow-md border border-slate-100 hover:shadow-lg hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-slate-500 font-semibold">
                      {task.key}
                    </span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-mono rounded">
                      {project?.key}
                    </span>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded border ${
                        priorityColors[task.priority as keyof typeof priorityColors]
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{task.title}</h3>
                  <p className="text-slate-600 text-sm line-clamp-2">{task.description}</p>
                </div>
                {task.progress > 0 && (
                  <div className="ml-4">
                    <div className="text-right mb-2">
                      <span className="text-sm font-semibold text-blue-600">
                        {task.progress}%
                      </span>
                    </div>
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3">
                {task.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  {assignee && (
                    <div className="flex items-center gap-2">
                      <img
                        src={assignee.avatarUrl}
                        alt={assignee.fullName}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-slate-600">Исполнитель: {assignee.fullName}</span>
                    </div>
                  )}
                  {!assignee && (
                    <span className="text-slate-400">Не назначен</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-500">
                    Срок: {new Date(task.dueDate).toLocaleDateString("ru-RU")}
                  </span>
                  {task.storyPoints && (
                    <span className="text-slate-600 font-semibold">
                      {task.storyPoints} SP
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">Задачи не найдены</p>
        </div>
      )}
    </div>
  );
}
