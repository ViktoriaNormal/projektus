import { Link } from "react-router";
import { Calendar, AlarmClock, User } from "lucide-react";
import type { TaskResponse } from "../../api/tasks";
import type { UserProfileResponse } from "../../api/users";
import { UserAvatar } from "../UserAvatar";
import { formatDate } from "../../lib/format";

function toAvatarUser(u: UserProfileResponse) {
  return { fullName: u.fullName, avatarUrl: u.avatarUrl ?? undefined };
}

interface BacklogTaskCardProps {
  task: TaskResponse;
  source: "backlog" | string;
  draggable: boolean;
  returnUrl: string;
  userCache: Map<string, UserProfileResponse>;
  onDragStart: (e: React.DragEvent, task: TaskResponse, source: "backlog" | string) => void;
  onDragEnd: () => void;
}

export function BacklogTaskCard({
  task,
  source,
  draggable,
  returnUrl,
  userCache,
  onDragStart,
  onDragEnd,
}: BacklogTaskCardProps) {
  const executor = task.executorUserId ? userCache.get(task.executorUserId) : null;
  return (
    <Link
      to={`/tasks/${task.id}?returnUrl=${returnUrl}`}
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart(e, task, source) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      className={`block bg-white p-3 rounded-lg shadow-md border border-slate-200 hover:shadow-xl hover:border-blue-400 transition-all ${
        draggable ? "cursor-grab" : "cursor-pointer"
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="flex flex-col items-start gap-1 min-w-0">
          <span className="text-xs font-mono text-slate-500 font-semibold">{task.key}</span>
          {task.priority && (
            <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{task.priority}</span>
          )}
        </div>
        <div className="ml-auto shrink-0">
          {executor ? (
            <UserAvatar user={toAvatarUser(executor)} size="sm" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
              <User size={14} className="text-slate-400" />
            </div>
          )}
        </div>
      </div>
      <p className="text-sm font-medium hover:text-blue-600 break-words">{task.name}</p>
      {(task.createdAt || task.deadline) && (
        <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-slate-100 text-xs">
          {task.createdAt && (
            <div className="flex items-center gap-1 text-slate-400" title="Дата создания">
              <Calendar size={12} />
              <span>{formatDate(task.createdAt, "short")}</span>
            </div>
          )}
          {task.deadline && (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dl = new Date(task.deadline);
            dl.setHours(0, 0, 0, 0);
            const daysUntil = Math.round((dl.getTime() - today.getTime()) / 86400000);
            const color = daysUntil < 0 ? "text-red-600" : daysUntil <= 2 ? "text-amber-600" : "text-slate-500";
            return (
              <div className={`flex items-center gap-1 ml-auto ${color}`} title={daysUntil < 0 ? "Дедлайн просрочен" : "Дедлайн"}>
                <AlarmClock size={12} />
                <span>{formatDate(dl, "short")}</span>
              </div>
            );
          })()}
        </div>
      )}
    </Link>
  );
}
