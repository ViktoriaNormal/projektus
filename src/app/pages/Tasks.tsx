import { useState, useEffect, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { searchTasks, type TaskResponse } from "../api/tasks";
import { getProjects, getProjectMembers, type ProjectResponse } from "../api/projects";
import { getUser, type UserProfileResponse } from "../api/users";
import { getBoard, getBoardColumns, getProjectReferences, type BoardResponse, type ColumnResponse, type ProjectReferences } from "../api/boards";
import { getTaskTags, type TagResponse } from "../api/tags";
import { getTaskWatchers } from "../api/watchers";
import { useAuth } from "../contexts/AuthContext";
import { Select, SelectOption } from "../components/ui/Select";
import { EmptyState } from "../components/ui/EmptyState";
import { PageSpinner } from "../components/ui/Spinner";
import { TaskListItem } from "../components/tasks/TaskListItem";

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

export default function Tasks() {
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [userCache, setUserCache] = useState<Map<string, UserProfileResponse>>(new Map());
  const [columnCache, setColumnCache] = useState<Map<string, ColumnResponse>>(new Map());
  const [tagCache, setTagCache] = useState<Map<string, TagResponse[]>>(new Map());
  const [watcherTaskIds, setWatcherTaskIds] = useState<Set<string>>(new Set());
  const [boardCache, setBoardCache] = useState<Map<string, BoardResponse>>(new Map());
  const [refs, setRefs] = useState<ProjectReferences | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");

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
      const boardIds = new Set<string>();
      allTasks.forEach(t => { if (t.boardId) boardIds.add(t.boardId); });

      const needsColumnResolve = allTasks.some(t => t.columnId && !t.columnSystemType);
      if (needsColumnResolve) {
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

      // Resolve boards to get priorityType / estimationUnit for each task
      const newBoardCache = new Map<string, BoardResponse>();
      await Promise.allSettled(
        [...boardIds].map(async (boardId) => {
          try {
            const b = await getBoard(boardId);
            newBoardCache.set(b.id, b);
          } catch { /**/ }
        })
      );
      setBoardCache(newBoardCache);

      // Refs (priority type labels, estimation unit labels) — one request
      try {
        const r = await getProjectReferences();
        setRefs(r);
      } catch { /**/ }

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

      // Resolve watchers to detect "Я наблюдатель" role
      if (currentUser) {
        // Build memberId → userId map for all projects
        const projectIds = new Set(allTasks.map(t => t.projectId));
        const memberToUser = new Map<string, string>();
        await Promise.allSettled(
          [...projectIds].map(async (pid) => {
            try {
              const members = await getProjectMembers(pid);
              members.forEach(m => memberToUser.set(m.id, m.userId));
            } catch { /**/ }
          })
        );
        const watcherIds = new Set<string>();
        await Promise.allSettled(
          allTasks.map(async (t) => {
            try {
              const watchers = await getTaskWatchers(t.id);
              const isWatcher = watchers.some(w => memberToUser.get(w.memberId) === currentUser.id);
              if (isWatcher) watcherIds.add(t.id);
            } catch { /**/ }
          })
        );
        setWatcherTaskIds(watcherIds);
      }
    } catch {
      toast.error("Ошибка загрузки задач");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadData(); }, [loadData]);

  // Показываем задачи только из активных проектов — архивные считаются неактуальными
  const activeProjectIds = new Set(
    projects.filter(p => p.status === "active").map(p => p.id),
  );

  // Client-side filters — "Мои задачи" always scoped to tasks where current user is author, executor or watcher
  const filteredTasks = tasks.filter((task) => {
    if (!activeProjectIds.has(task.projectId)) return false;
    const matchesSearch =
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = filterProject === "all" || task.projectId === filterProject;
    const isAuthor = task.ownerUserId === currentUser?.id;
    const isExecutor = task.executorUserId === currentUser?.id;
    const isWatcher = watcherTaskIds.has(task.id);
    let matchesRole: boolean;
    if (filterRole === "owner") matchesRole = isAuthor;
    else if (filterRole === "executor") matchesRole = isExecutor;
    else if (filterRole === "watcher") matchesRole = isWatcher;
    else matchesRole = isAuthor || isExecutor || isWatcher;
    return matchesSearch && matchesProject && matchesRole;
  });

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Мои задачи</h1>
          <p className="text-slate-600 mt-1">Управление моими задачами по всем проектам (где я автор/исполнитель/наблюдатель)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Поиск по названию или ключу задачи"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <Select value={filterProject} onValueChange={setFilterProject} ariaLabel="Фильтр по проекту">
            <SelectOption value="all">Все проекты</SelectOption>
            {projects.filter(p => p.status === "active" && tasks.some(t => t.projectId === p.id)).map(p => (
              <SelectOption key={p.id} value={p.id}>{p.key} — {p.name}</SelectOption>
            ))}
          </Select>

          <Select value={filterRole} onValueChange={setFilterRole} ariaLabel="Фильтр по роли">
            <SelectOption value="all">Все роли</SelectOption>
            <SelectOption value="owner">Я автор</SelectOption>
            <SelectOption value="executor">Я исполнитель</SelectOption>
            <SelectOption value="watcher">Я наблюдатель</SelectOption>
          </Select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            project={projects.find((p) => p.id === task.projectId)}
            executor={task.executorUserId ? userCache.get(task.executorUserId) : null}
            taskTags={task.tags ?? tagCache.get(task.id) ?? []}
            board={boardCache.get(task.boardId)}
            refs={refs}
            returnUrl="/tasks"
          />
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={<Search size={48} />}
            title="Задачи не найдены"
            description="Попробуйте изменить критерии поиска"
          />
        </div>
      )}
    </div>
  );
}
