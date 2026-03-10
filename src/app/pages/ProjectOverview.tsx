import { CheckSquare, Users, Activity, TrendingUp, Target, Calendar, User } from "lucide-react";
import { tasks, sprints, projectMembers, users } from "../data/mockData";
import { UserAvatar } from "../components/UserAvatar";

interface ProjectOverviewProps {
  projectId: number;
  projectType: string;
}

export default function ProjectOverview({ projectId, projectType }: ProjectOverviewProps) {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const projectSprints = sprints.filter((s) => s.projectId === projectId);
  const members = projectMembers.filter((pm) => pm.projectId === projectId);

  const completedTasks = projectTasks.filter((t) => t.status === "Выполнено").length;
  const inProgressTasks = projectTasks.filter((t) => t.status === "В работе").length;
  const todoTasks = projectTasks.filter((t) => t.status === "К выполнению").length;
  const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <CheckSquare className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Всего задач</p>
              <p className="text-2xl font-bold">{projectTasks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Участников</p>
              <p className="text-2xl font-bold">{members.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Activity className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Активных задач</p>
              <p className="text-2xl font-bold">{inProgressTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingUp className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Прогресс</p>
              <p className="text-2xl font-bold">{progress}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <h3 className="text-lg font-bold mb-4">Общий прогресс проекта</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Выполнено</span>
            <span className="font-semibold">{completedTasks} из {projectTasks.length}</span>
          </div>
          <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Task Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Target size={20} className="text-yellow-700" />
            </div>
            <h4 className="font-semibold text-yellow-900">К выполнению</h4>
          </div>
          <p className="text-3xl font-bold text-yellow-700 mb-1">{todoTasks}</p>
          <p className="text-sm text-yellow-600">
            {projectTasks.length > 0 ? Math.round((todoTasks / projectTasks.length) * 100) : 0}% от общего количества
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Activity size={20} className="text-blue-700" />
            </div>
            <h4 className="font-semibold text-blue-900">В работе</h4>
          </div>
          <p className="text-3xl font-bold text-blue-700 mb-1">{inProgressTasks}</p>
          <p className="text-sm text-blue-600">
            {projectTasks.length > 0 ? Math.round((inProgressTasks / projectTasks.length) * 100) : 0}% от общего количества
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckSquare size={20} className="text-green-700" />
            </div>
            <h4 className="font-semibold text-green-900">Выполнено</h4>
          </div>
          <p className="text-3xl font-bold text-green-700 mb-1">{completedTasks}</p>
          <p className="text-sm text-green-600">
            {projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0}% от общего количества
          </p>
        </div>
      </div>

      {/* Scrum Specific */}
      {projectType === "scrum" && (
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <h3 className="text-lg font-bold mb-4">Спринты</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium mb-1">Активных</p>
              <p className="text-2xl font-bold text-green-700">
                {projectSprints.filter((s) => s.status === "Активный").length}
              </p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 font-medium mb-1">Запланированных</p>
              <p className="text-2xl font-bold text-blue-700">
                {projectSprints.filter((s) => s.status === "Запланирован").length}
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-sm text-slate-700 font-medium mb-1">Завершенных</p>
              <p className="text-2xl font-bold text-slate-700">
                {projectSprints.filter((s) => s.status === "Завершен").length}
              </p>
            </div>
          </div>

          {projectSprints.filter((s) => s.status === "Активный").length > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-blue-700" />
                <h4 className="font-semibold text-blue-900">Текущий спринт</h4>
              </div>
              {projectSprints
                .filter((s) => s.status === "Активный")
                .map((sprint) => {
                  const sprintTasks = projectTasks.filter((t) => t.sprintId === sprint.id);
                  const sprintCompleted = sprintTasks.filter((t) => t.status === "Выполнено").length;
                  const sprintProgress =
                    sprintTasks.length > 0 ? Math.round((sprintCompleted / sprintTasks.length) * 100) : 0;

                  return (
                    <div key={sprint.id}>
                      <p className="text-blue-900 font-medium mb-1">{sprint.name}</p>
                      <p className="text-sm text-blue-700 mb-2">{sprint.goal}</p>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-blue-600">
                          {new Date(sprint.startDate).toLocaleDateString("ru-RU")} -{" "}
                          {new Date(sprint.endDate).toLocaleDateString("ru-RU")}
                        </span>
                        <span className="font-semibold text-blue-700">
                          {sprintCompleted} / {sprintTasks.length} задач
                        </span>
                      </div>
                      <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${sprintProgress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <h3 className="text-lg font-bold mb-4">Команда проекта</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.slice(0, 6).map((member) => {
            const user = users.find((u) => u.id === member.userId);
            if (!user) return null;

            const userTasks = projectTasks.filter((t) => t.assigneeId === user.id);
            const userCompletedTasks = userTasks.filter((t) => t.status === "Выполнено").length;

            return (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <UserAvatar user={user} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.fullName}</p>
                  <p className="text-xs text-slate-600">
                    {userTasks.length} задач · {userCompletedTasks} выполнено
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {members.length > 6 && (
          <p className="text-sm text-slate-600 text-center mt-4">
            и ещё {members.length - 6} участник(ов)
          </p>
        )}
      </div>
    </div>
  );
}