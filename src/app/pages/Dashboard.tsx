import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  FolderKanban,
  CheckSquare,
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { PageSpinner } from "../components/ui/Spinner";
import { useAuth } from "../contexts/AuthContext";
import { UserAvatar } from "../components/UserAvatar";
import { searchTasks, type TaskResponse } from "../api/tasks";
import { getProjects, getProjectMembers, type ProjectResponse } from "../api/projects";
import { getMeetings, type MeetingResponse } from "../api/meetings";
import { priorityColor } from "../lib/status-colors";
import { formatDate } from "../lib/format";
import { EmptyState } from "../components/ui/EmptyState";

const meetingTypeLabelMap: Record<string, string> = {
  scrum_planning: "Планирование спринта",
  daily_scrum: "Daily Scrum",
  sprint_review: "Обзор спринта",
  sprint_retrospective: "Ретроспектива",
  kanban_daily: "Ежедневная встреча",
  kanban_risk_review: "Обзор рисков",
  kanban_strategy_review: "Обзор стратегии",
  kanban_service_delivery_review: "Обзор предоставления услуг",
  kanban_operations_review: "Обзор операций",
  kanban_replenishment: "Пополнение запасов",
  kanban_delivery_planning: "Планирование поставок",
  custom: "Пользовательское событие",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const loadTasks = searchTasks({})
      .then(t => setTasks(t.filter(task => task.executorUserId === user.id)))
      .catch(() => setTasks([]));

    const loadProjects = getProjects()
      .then(async (allProjects) => {
        const active = allProjects.filter(p => p.status === "active");
        const memberChecks = await Promise.allSettled(
          active.map(async (p) => {
            const members = await getProjectMembers(p.id);
            const isMember = members.some(m => m.userId === user.id);
            return isMember ? p : null;
          })
        );
        const myProjects = memberChecks
          .filter((r): r is PromiseFulfilledResult<ProjectResponse | null> => r.status === "fulfilled")
          .map(r => r.value)
          .filter((p): p is ProjectResponse => p !== null);
        setProjects(myProjects);
      })
      .catch(() => setProjects([]));

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const loadMeetings = getMeetings(todayStart.toISOString(), todayEnd.toISOString())
      .then(m => {
        const active = m.filter(mt => mt.status !== "cancelled");
        setMeetings(active.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
      })
      .catch(() => setMeetings([]));

    Promise.allSettled([loadTasks, loadProjects, loadMeetings])
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-4 md:p-8 text-white shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 break-words">
          Добро пожаловать, {user?.fullName}!
        </h1>
        <p className="text-blue-100">
          У вас {tasks.length} {tasks.length === 1 ? "активная задача" : `активных ${tasks.length >= 2 && tasks.length <= 4 ? "задачи" : "задач"}`} (где вы исполнитель) и {meetings.length} {meetings.length === 1 ? "встреча" : meetings.length >= 2 && meetings.length <= 4 ? "встречи" : "встреч"} сегодня
        </p>
      </div>

      {/* Tasks & Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CheckSquare className="text-blue-600" size={24} />
              Мои задачи
            </h2>
            <Link
              to="/tasks"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Все задачи →
            </Link>
          </div>
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.slice(0, 4).map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="block p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">{task.key}</span>
                        {task.priority && (
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                              priorityColor(task.priority)
                            }`}
                          >
                            {task.priority}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm">{task.name}</p>
                      {task.deadline && (
                        <p className="text-xs text-slate-500 mt-1">
                          Срок: {formatDate(task.deadline, "dmy")}
                        </p>
                      )}
                    </div>
                    <div className="ml-3 flex flex-col items-end gap-1">
                      {user && <UserAvatar user={user} size="sm" />}
                      {task.progress != null && task.progress > 0 && (
                        <div className="text-xs font-semibold text-blue-600">
                          {task.progress}%
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={<CheckSquare size={48} className="opacity-50" />} title="Нет назначенных задач" compact />
          )}
        </div>

        {/* Today's Meetings */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="text-indigo-600" size={24} />
              Встречи на сегодня
            </h2>
            <Link
              to="/calendar"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Календарь →
            </Link>
          </div>
          {meetings.length > 0 ? (
            <div className="space-y-3">
              {meetings.map((meeting) => {
                const start = new Date(meeting.startTime);
                const end = new Date(meeting.endTime);
                const now = new Date();
                const isOngoing = start <= now && end > now;
                return (
                  <div
                    key={meeting.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      isOngoing
                        ? "border-green-300 bg-green-50"
                        : "border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-sm">{meeting.name}</h3>
                      {isOngoing && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-700 border border-green-200 shrink-0">
                          Идёт
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mb-2">
                      {meetingTypeLabelMap[meeting.meetingType] || meeting.meetingType}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>
                          {start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          {" — "}
                          {end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {meeting.location && (
                        <span className="text-slate-400">{meeting.location}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<Clock size={48} className="opacity-50" />} title="Нет встреч на сегодня" compact />
          )}
        </div>
      </div>

      {/* Active Projects */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderKanban className="text-purple-600" size={24} />
            Активные проекты
          </h2>
          <Link
            to="/projects"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Все проекты →
          </Link>
        </div>
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 4).map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block p-4 border border-slate-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-mono font-semibold rounded">
                    {project.key}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      project.projectType === "scrum"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {project.projectType === "scrum" ? "Scrum" : "Kanban"}
                  </span>
                </div>
                <h3 className="font-semibold mb-1">{project.name}</h3>
                <p className="text-sm text-slate-600 line-clamp-2">{project.description}</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={<FolderKanban size={48} className="opacity-50" />} title="Нет активных проектов" compact />
        )}
      </div>
    </div>
  );
}
