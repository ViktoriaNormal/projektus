import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { searchTasks, type TaskResponse } from "../api/tasks";
import { getProjects, type ProjectResponse } from "../api/projects";
import { getUser, type UserProfileResponse } from "../api/users";
import { getBoardColumns, type ColumnResponse } from "../api/boards";
import { getTaskTags, type TagResponse } from "../api/tags";
import { UserAvatar } from "../components/UserAvatar";

function toAvatarUser(u: UserProfileResponse) {
  return { fullName: u.fullName, avatarUrl: u.avatarUrl ?? undefined };
}

function getTaskStatus(task: TaskResponse, columnCache: Map<string, ColumnResponse>): string {
  // Prefer backend-provided column info
  if (task.columnSystemType) {
    switch (task.columnSystemType) {
      case "in_progress": return "В работе";
      case "completed": return "Выполнено";
      default: return "Бэклог";
    }
  }
  if (!task.columnId) return "Бэклог";
  const column = columnCache.get(task.columnId);
  if (!column) return "Бэклог";
  switch (column.systemType) {
    case "in_progress": return "В работе";
    case "completed": return "Выполнено";
    default: return "Бэклог";
  }
}

const PRIORITY_COLORS: Record<string, string> = {
  "Критический": "bg-red-100 text-red-700 border-red-200",
  "Критичный": "bg-red-100 text-red-700 border-red-200",
  "Высокий": "bg-orange-100 text-orange-700 border-orange-200",
  "Средний": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Низкий": "bg-green-100 text-green-700 border-green-200",
};

export default function Tasks() {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [userCache, setUserCache] = useState<Map<string, UserProfileResponse>>(new Map());
  const [columnCache, setColumnCache] = useState<Map<string, ColumnResponse>>(new Map());
  const [tagCache, setTagCache] = useState<Map<string, TagResponse[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTasks, allProjects] = await Promise.all([
        searchTasks({}),
        getProjects(),
      ]);
      setTasks(allTasks);
      setProjects(allProjects);

      // Resolve executor profiles
      const userIds = new Set<string>();
      allTasks.forEach(t => { if (t.executorUserId) userIds.add(t.executorUserId); });
      const newUserCache = new Map<string, UserProfileResponse>();
      await Promise.allSettled(
        [...userIds].map(async (id) => {
          try { newUserCache.set(id, await getUser(id)); } catch { /**/ }
        })
      );
      setUserCache(newUserCache);

      // Resolve columns for status (skip if backend provides columnSystemType)
      const needsColumnResolve = allTasks.some(t => t.columnId && !t.columnSystemType);
      if (needsColumnResolve) {
        const boardIds = new Set<string>();
        allTasks.forEach(t => { if (t.boardId) boardIds.add(t.boardId); });
        const newColumnCache = new Map<string, ColumnResponse>();
        await Promise.allSettled(
          [...boardIds].map(async (boardId) => {
            try {
              const cols = await getBoardColumns(boardId);
              cols.forEach(c => newColumnCache.set(c.id, c));
            } catch { /**/ }
          })
        );
        setColumnCache(newColumnCache);
      }

      // Resolve tags (skip if backend provides tags in response)
      const needsTagResolve = allTasks.some(t => !t.tags);
      if (needsTagResolve) {
        const newTagCache = new Map<string, TagResponse[]>();
        await Promise.allSettled(
          allTasks.map(async (task) => {
            try { newTagCache.set(task.id, await getTaskTags(task.id)); } catch { /**/ }
          })
        );
        setTagCache(newTagCache);
      }
    } catch {
      toast.error("Ошибка загрузки задач");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Client-side filters
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      filterPriority === "all" || task.priority === filterPriority;
    const taskStatus = getTaskStatus(task, columnCache);
    const matchesStatus = filterStatus === "all" || taskStatus === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Все задачи</h1>
          <p className="text-slate-600 mt-1">Управление задачами по всем проектам</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
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
            <option value="Критичный">Критичный</option>
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
          const executor = task.executorUserId ? userCache.get(task.executorUserId) : null;
          const taskTags = task.tags ?? tagCache.get(task.id) ?? [];

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
                    {project && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-mono rounded">
                        {project.key}
                      </span>
                    )}
                    {task.priority && (
                      <span className={`px-3 py-1 text-xs font-semibold rounded border ${
                        PRIORITY_COLORS[task.priority] ?? "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{task.name}</h3>
                  {task.description && (
                    <p className="text-slate-600 text-sm line-clamp-2">{task.description}</p>
                  )}
                </div>
                {task.progress != null && task.progress > 0 && (
                  <div className="ml-4">
                    <div className="text-right mb-2">
                      <span className="text-sm font-semibold text-blue-600">{task.progress}%</span>
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

              {taskTags.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  {taskTags.map((tag) => (
                    <span key={typeof tag === "string" ? tag : tag.id}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {typeof tag === "string" ? tag : tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  {executor ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar user={toAvatarUser(executor)} size="sm" />
                      <span className="text-slate-600">Исполнитель: {executor.fullName}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400">Не назначен</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {task.deadline && (
                    <span className="text-slate-500">
                      Срок: {new Date(task.deadline).toLocaleDateString("ru-RU")}
                    </span>
                  )}
                  {task.estimation && (
                    <span className="text-slate-600 font-semibold">
                      {task.estimation}
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
