import { Link } from "react-router";
import {
  FolderKanban,
  CheckSquare,
  Calendar,
  TrendingUp,
  AlertCircle,
  Clock,
  Users,
  Activity,
} from "lucide-react";
import { projects, tasks, meetings, currentUser, users, sprints } from "../data/mockData";

export default function Dashboard() {
  const activeProjects = projects.filter((p) => p.status === "Активный");
  const myTasks = tasks.filter((t) => t.assigneeId === currentUser.id);
  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.startTime) > new Date()
  ).slice(0, 3);
  const activeSprints = sprints.filter((s) => s.status === "active");

  const stats = [
    {
      label: "Активные проекты",
      value: activeProjects.length,
      icon: FolderKanban,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      label: "Мои задачи",
      value: myTasks.length,
      icon: CheckSquare,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      label: "Встречи сегодня",
      value: meetings.filter(
        (m) =>
          new Date(m.startTime).toDateString() === new Date().toDateString()
      ).length,
      icon: Calendar,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
    },
    {
      label: "Всего пользователей",
      value: users.length,
      icon: Users,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">
          Добро пожаловать, {currentUser.fullName}!
        </h1>
        <p className="text-blue-100">
          У вас {myTasks.length} активных задач и {upcomingMeetings.length} предстоящих встреч
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-slate-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={stat.textColor} size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Sprints */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="text-green-600" size={24} />
              Активные спринты
            </h2>
          </div>
          <div className="space-y-4">
            {activeSprints.map((sprint) => {
              const project = projects.find((p) => p.id === sprint.projectId);
              const progress = (sprint.completedPoints / sprint.totalPoints) * 100;
              return (
                <div
                  key={sprint.id}
                  className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{sprint.name}</h3>
                      <p className="text-sm text-slate-600">{project?.name}</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      Активен
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{sprint.goal}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Прогресс</span>
                      <span className="font-semibold">
                        {sprint.completedPoints} / {sprint.totalPoints} SP
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{new Date(sprint.startDate).toLocaleDateString("ru-RU")}</span>
                      <span>{new Date(sprint.endDate).toLocaleDateString("ru-RU")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
          <div className="space-y-3">
            {myTasks.slice(0, 5).map((task) => {
              const priorityColors = {
                Критический: "bg-red-100 text-red-700 border-red-200",
                Высокий: "bg-orange-100 text-orange-700 border-orange-200",
                Средний: "bg-yellow-100 text-yellow-700 border-yellow-200",
                Низкий: "bg-green-100 text-green-700 border-green-200",
              };
              return (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="block p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">{task.key}</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                            priorityColors[task.priority as keyof typeof priorityColors]
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Срок: {new Date(task.dueDate).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    {task.progress > 0 && (
                      <div className="ml-3 text-right">
                        <div className="text-xs font-semibold text-blue-600">
                          {task.progress}%
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects */}
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
          <div className="space-y-3">
            {activeProjects.slice(0, 4).map((project) => {
              const owner = users.find((u) => u.id === project.ownerId);
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block p-4 border border-slate-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-mono font-semibold rounded">
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
                      <h3 className="font-semibold mt-2">{project.name}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {project.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      <span>{project.memberCount} участников</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckSquare size={14} />
                      <span>{project.taskCount} задач</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="text-indigo-600" size={24} />
              Предстоящие встречи
            </h2>
            <Link
              to="/calendar"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Календарь →
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingMeetings.map((meeting) => {
              const meetingTypes: Record<string, string> = {
                scrum_planning: "Планирование спринта",
                daily_scrum: "Ежедневный Scrum",
                sprint_retrospective: "Ретроспектива",
                kanban_risk_review: "Обзор рисков",
              };
              const startTime = new Date(meeting.startTime);
              return (
                <div
                  key={meeting.id}
                  className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg text-center shrink-0">
                      <div className="text-lg font-bold">
                        {startTime.getDate()}
                      </div>
                      <div className="text-xs">
                        {startTime.toLocaleString("ru-RU", { month: "short" })}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{meeting.title}</h3>
                      <p className="text-xs text-slate-600 mb-2">
                        {meetingTypes[meeting.type]}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>
                            {startTime.toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={12} />
                          <span>{meeting.participants.length} участников</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
