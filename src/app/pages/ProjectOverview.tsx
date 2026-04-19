import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  Play,
  CheckSquare,
  Activity,
  Ban,
  Video,
  MapPin,
  ListTodo,
  Copy,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "../components/UserAvatar";
import { searchTasks, type TaskResponse } from "../api/tasks";
import { getProjectSprints, getSprintTasks, type SprintResponse } from "../api/sprints";
import { getMeetings, type MeetingResponse } from "../api/meetings";
import { apiRequest } from "../api/client";
import type { ProjectMemberResponse } from "../api/projects";
import type { UserProfileResponse } from "../api/users";
import { formatDate } from "../lib/format";

const meetingTypeLabels: Record<string, string> = {
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

// ── Types ───────────────────────────────────────────────────

interface TaskDependencyResponse {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: "blocks" | "is_blocked_by" | "relates_to";
}

interface ProjectOverviewProps {
  projectId: string;
  projectType: string;
  projectOwnerId: string;
  members: ProjectMemberResponse[];
  memberUsers: Map<string, UserProfileResponse>;
}

function toAvatarUser(u: UserProfileResponse) {
  return { fullName: u.fullName, avatarUrl: u.avatarUrl ?? undefined };
}

// ── Component ───────────────────────────────────────────────

export default function ProjectOverview({
  projectId,
  projectType,
  projectOwnerId,
  members,
  memberUsers,
}: ProjectOverviewProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [sprints, setSprints] = useState<SprintResponse[]>([]);
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [blockedTaskIds, setBlockedTaskIds] = useState<Set<string>>(new Set());
  const [activeSprintTasks, setActiveSprintTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [tasksResult, sprintsResult, meetingsResult] = await Promise.allSettled([
          searchTasks({ projectId }),
          projectType === "scrum" ? getProjectSprints(projectId) : Promise.resolve([]),
          getMeetings(
            new Date().toISOString(),
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          ),
        ]);

        const allTasks = tasksResult.status === "fulfilled" ? tasksResult.value : [];
        const loadedSprints = sprintsResult.status === "fulfilled" ? sprintsResult.value : [];
        setSprints(loadedSprints);

        // For Scrum: load active sprint tasks for stats
        const activeSpr = loadedSprints.find(s => s.status === "active");
        let sprintTaskList: TaskResponse[] = [];
        if (activeSpr) {
          try { sprintTaskList = await getSprintTasks(activeSpr.id); } catch { /**/ }
        }

        setTasks(allTasks);
        setActiveSprintTasks(sprintTaskList);

        // Filter meetings by projectId
        if (meetingsResult.status === "fulfilled") {
          const raw = meetingsResult.value;
          const meetingsArray = Array.isArray(raw) ? raw : (raw as any)?.meetings ?? [];
          setMeetings(
            meetingsArray
              .filter((m: MeetingResponse) => m.projectId === projectId && m.status === "active")
              .sort((a: MeetingResponse, b: MeetingResponse) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .slice(0, 5)
          );
        }

        // Load dependencies to find blocked tasks
        const blocked = new Set<string>();
        await Promise.allSettled(
          allTasks.slice(0, 50).map(async (task) => {
            try {
              const deps = await apiRequest<TaskDependencyResponse[]>(
                `/tasks/${task.id}/dependencies`
              );
              if (deps.some((d) => d.type === "is_blocked_by")) {
                blocked.add(task.id);
              }
            } catch {
              /* skip */
            }
          })
        );
        setBlockedTaskIds(blocked);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, projectType]);

  // ── Derived data ────────────────────────────────────────────

  const now = new Date();

  // Task summary — based on active sprint tasks across all boards
  const statTasks = projectType === "scrum" ? activeSprintTasks : tasks;
  const totalTasks = statTasks.length;
  const overdueTasks = statTasks.filter(
    (t) => t.deadline && new Date(t.deadline) < now
  );
  const completedTasks = statTasks.filter(t => t.columnSystemType === "completed").length;
  const inProgressTasks = statTasks.filter(t => t.columnSystemType === "in_progress").length;

  // Deadlines (≤3 days including today)
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  threeDaysLater.setHours(23, 59, 59, 999);
  const upcomingDeadlines = tasks
    .filter((t) => {
      if (!t.deadline) return false;
      if (t.columnSystemType === "completed") return false;
      const d = new Date(t.deadline);
      return d >= now && d <= threeDaysLater;
    })
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 8);

  // Active sprint
  const activeSprint = sprints.find((s) => s.status === "active");

  // Blocked tasks
  const blockedTasks = tasks.filter((t) => blockedTaskIds.has(t.id));

  // Tasks per member (distribution)
  const tasksByMember = new Map<string, number>();
  tasks.forEach((t) => {
    if (t.executorUserId) {
      tasksByMember.set(t.executorUserId, (tasksByMember.get(t.executorUserId) || 0) + 1);
    }
  });
  const maxTasksPerMember = Math.max(1, ...tasksByMember.values());

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Активный спринт (только Scrum) */}
      {projectType === "scrum" && activeSprint && (
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Play size={20} className="text-green-600" />
            <h3 className="text-lg font-bold">Активный спринт</h3>
          </div>
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-blue-900">{activeSprint.name}</h4>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                Активный
              </span>
            </div>
            {activeSprint.goal && (
              <p className="text-sm text-blue-700 mb-3">{activeSprint.goal}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-blue-600">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>
                  {formatDate(activeSprint.startDate, "dmy")} – {formatDate(activeSprint.endDate, "dmy")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>
                  {Math.max(
                    0,
                    Math.ceil(
                      (new Date(activeSprint.endDate).getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )}{" "}
                  дн. осталось
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {projectType === "scrum" && !activeSprint && !loading && (
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Play size={20} className="text-slate-400" />
            <h3 className="text-lg font-bold">Активный спринт</h3>
          </div>
          <p className="text-slate-500 text-sm">Нет активного спринта</p>
        </div>
      )}

      {/* Сводка по задачам */}
      {projectType === "scrum" && (
        <p className="text-xs text-slate-500">
          {activeSprint
            ? `Данные по задачам активного спринта «${activeSprint.name}» со всех досок проекта`
            : "Нет активного спринта — данные недоступны"}
        </p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2.5 rounded-lg">
              <ListTodo size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-slate-500 text-xs">Всего задач</p>
              <p className="text-2xl font-bold">{totalTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2.5 rounded-lg">
              <Activity size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-slate-500 text-xs">В работе</p>
              <p className="text-2xl font-bold">{inProgressTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2.5 rounded-lg">
              <CheckSquare size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-slate-500 text-xs">Выполнено</p>
              <p className="text-2xl font-bold">{completedTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2.5 rounded-lg">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-slate-500 text-xs">Просрочено</p>
              <p className="text-2xl font-bold text-red-600">{overdueTasks.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Заблокированные задачи */}
      <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-slate-100">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Ban size={20} className="text-red-500" />
          <h3 className="text-lg font-bold">Заблокированные задачи</h3>
          {blockedTasks.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">
              {blockedTasks.length}
            </span>
          )}
        </div>

        {blockedTasks.length > 0 ? (
          <div className="space-y-2">
            {blockedTasks.slice(0, 8).map((task) => {
              const executor = task.executorUserId
                ? memberUsers.get(task.executorUserId)
                : null;
              return (
                <div
                  key={task.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Ban size={16} className="text-red-400 shrink-0" />
                    <p className="text-sm font-medium truncate min-w-0">
                      <span className="text-red-600 font-mono mr-1 hover:underline cursor-pointer" onClick={() => navigate(`/tasks/${task.id}?returnUrl=${encodeURIComponent(`/projects/${projectId}?tab=overview`)}`)}>{task.key}</span>
                      {task.name}
                    </p>
                  </div>
                  {executor && (
                    <div className="flex items-center gap-2 min-w-0 sm:shrink-0 sm:max-w-[45%]">
                      <UserAvatar user={toAvatarUser(executor)} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{executor.fullName}</p>
                        {executor.email && (
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-xs text-slate-500 truncate">{executor.email}</span>
                            <button onClick={() => { navigator.clipboard.writeText(executor.email); toast.success("Email скопирован"); }}
                              className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0"><Copy size={10} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          !loading && (
            <p className="text-slate-500 text-sm">Нет заблокированных задач</p>
          )
        )}
      </div>

      {/* Ближайшие дедлайны */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-orange-500" />
          <h3 className="text-lg font-bold">Ближайшие дедлайны</h3>
          {overdueTasks.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">
              {overdueTasks.length} просрочено
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-3">Незавершённые задачи, до крайнего срока которых осталось не более 3 дней (включая сегодня)</p>

        {/* Просроченные */}
        {overdueTasks.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-red-600 uppercase mb-2">Просрочено</p>
            <div className="space-y-2">
              {overdueTasks.slice(0, 5).map((task) => {
                const executor = task.executorUserId
                  ? memberUsers.get(task.executorUserId)
                  : null;
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        <span className="text-red-600 font-mono mr-1 hover:underline cursor-pointer" onClick={() => navigate(`/tasks/${task.id}?returnUrl=${encodeURIComponent(`/projects/${projectId}?tab=overview`)}`)}>{task.key}</span>
                        {task.name}
                      </p>
                    </div>
                    {executor && (
                      <UserAvatar user={toAvatarUser(executor)} size="sm" />
                    )}
                    <span className="text-xs text-red-600 font-semibold whitespace-nowrap">
                      {formatDate(task.deadline, "dmy")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ближайшие */}
        {upcomingDeadlines.length > 0 ? (
          <div className="space-y-2">
            {upcomingDeadlines.map((task) => {
              const executor = task.executorUserId
                ? memberUsers.get(task.executorUserId)
                : null;
              const daysLeft = Math.ceil(
                (new Date(task.deadline!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    daysLeft <= 2
                      ? "bg-orange-50 border-orange-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      <span className="text-blue-600 font-mono mr-1 hover:underline cursor-pointer" onClick={() => navigate(`/tasks/${task.id}?returnUrl=${encodeURIComponent(`/projects/${projectId}?tab=overview`)}`)}>{task.key}</span>
                      {task.name}
                    </p>
                  </div>
                  {executor && (
                    <UserAvatar user={toAvatarUser(executor)} size="sm" />
                  )}
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${
                      daysLeft <= 2 ? "text-orange-600" : "text-slate-600"
                    }`}
                  >
                    {daysLeft === 0
                      ? "сегодня"
                      : daysLeft === 1
                      ? "завтра"
                      : `через ${daysLeft} дн.`}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          !loading && (
            <p className="text-slate-500 text-sm">Нет задач с ближайшими дедлайнами</p>
          )
        )}
      </div>

      {/* Ближайшие встречи проекта */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Video size={20} className="text-purple-600" />
          <h3 className="text-lg font-bold">Ближайшие встречи</h3>
        </div>

        {meetings.length > 0 ? (
          <div className="space-y-3">
            {meetings.map((meeting) => {
              const start = new Date(meeting.startTime);
              const end = new Date(meeting.endTime);
              const isToday = start.toDateString() === now.toDateString();
              const isTomorrow =
                start.toDateString() ===
                new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

              const dateLabel = isToday
                ? "Сегодня"
                : isTomorrow
                ? "Завтра"
                : start.toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                  });

              return (
                <div
                  key={meeting.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    isToday
                      ? "bg-purple-50 border-purple-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${
                      isToday ? "bg-purple-100" : "bg-slate-200"
                    }`}
                  >
                    <Calendar
                      size={16}
                      className={isToday ? "text-purple-600" : "text-slate-600"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{meeting.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                      <span className="font-semibold">{dateLabel}</span>
                      <span>
                        {start.toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {end.toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {meeting.meetingType && (
                        <span className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-700">
                          {meetingTypeLabels[meeting.meetingType] || meeting.meetingType}
                        </span>
                      )}
                    </div>
                    {meeting.location && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <MapPin size={12} />
                        <span>{meeting.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !loading && (
            <p className="text-slate-500 text-sm">Нет запланированных встреч</p>
          )
        )}
      </div>

      {/* Команда проекта */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} className="text-blue-600" />
          <h3 className="text-lg font-bold">Команда проекта</h3>
          <span className="text-sm text-slate-500 ml-auto">{members.length} участников</span>
        </div>
        {members.length === 0 ? (
          <p className="text-slate-500 text-sm">Участники не добавлены</p>
        ) : (
          <div className="space-y-3">
            {[...members].sort((a, b) => {
              const aOwner = a.userId === projectOwnerId ? 0 : 1;
              const bOwner = b.userId === projectOwnerId ? 0 : 1;
              return aOwner - bOwner;
            }).map((member) => {
              const user = memberUsers.get(member.userId);
              if (!user) return null;
              const isOwner = member.userId === projectOwnerId;
              const inProgressCount = tasks.filter(t =>
                t.executorUserId === member.userId && t.columnSystemType !== "completed"
              ).length;

              return (
                <div key={member.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <UserAvatar user={toAvatarUser(user)} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm truncate">{user.fullName}</p>
                      {isOwner && (
                        <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded shrink-0">
                          <Star size={10} /> Ответственный
                        </span>
                      )}
                    </div>
                    {user.position && (
                      <p className="text-xs text-slate-500 mb-0.5">{user.position}</p>
                    )}
                    {user.email && (
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs text-slate-500 truncate">{user.email}</span>
                        <button onClick={() => { navigator.clipboard.writeText(user.email); toast.success("Email скопирован"); }}
                          className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0"><Copy size={11} /></button>
                      </div>
                    )}
                    <span className="text-xs text-slate-600">Задач в работе: <strong>{inProgressCount}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
