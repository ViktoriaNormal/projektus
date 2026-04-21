import { useState } from "react";
import { Link } from "react-router";
import { Copy, Check } from "lucide-react";
import type { TaskResponse } from "../../api/tasks";
import type { ProjectResponse } from "../../api/projects";
import type { UserProfileResponse } from "../../api/users";
import type { BoardResponse, ProjectReferences } from "../../api/boards";
import type { TagResponse } from "../../api/tags";
import { UserAvatar } from "../UserAvatar";
import { priorityColor } from "../../lib/status-colors";
import { formatDate } from "../../lib/format";

const ESTIMATION_UNIT_SHORT: Record<string, string> = {
  story_points: "SP",
  time: "ч",
};

function CopyKeyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
      title={`Скопировать ${label}`}
      aria-label={`Скопировать ${label}`}
    >
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
    </button>
  );
}

function toAvatarUser(u: UserProfileResponse) {
  return { fullName: u.fullName, avatarUrl: u.avatarUrl ?? undefined };
}

interface TaskListItemProps {
  task: TaskResponse;
  project?: ProjectResponse;
  executor?: UserProfileResponse | null;
  taskTags?: (string | TagResponse)[];
  board?: BoardResponse;
  refs?: ProjectReferences | null;
  /** Optional returnUrl appended to the link. */
  returnUrl?: string;
}

export function TaskListItem({
  task,
  project,
  executor,
  taskTags,
  board,
  refs,
  returnUrl,
}: TaskListItemProps) {
  const priorityTypeName = board?.priorityType
    ? refs?.priorityTypeOptions.find((o) => o.key === board.priorityType)?.name
    : null;
  const estimationUnitShort = board?.estimationUnit
    ? ESTIMATION_UNIT_SHORT[board.estimationUnit]
      ?? refs?.estimationUnits.find((o) => o.key === board.estimationUnit)?.name
    : null;

  const to = returnUrl
    ? `/tasks/${task.id}?returnUrl=${encodeURIComponent(returnUrl)}`
    : `/tasks/${task.id}`;

  const tags = taskTags ?? task.tags ?? [];

  return (
    <Link
      to={to}
      className="block bg-white rounded-xl p-6 shadow-md border border-slate-100 hover:shadow-lg hover:border-blue-300 transition-all"
    >
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-x-3 gap-y-2 mb-2">
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <span className="uppercase tracking-wider text-[10px]">Задача:</span>
              <span className="font-mono font-semibold text-slate-700 text-sm">{task.key}</span>
              <CopyKeyButton text={task.key} label="ключ задачи" />
            </span>
            {project && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <span className="uppercase tracking-wider text-[10px]">Проект:</span>
                <span className="font-mono font-semibold text-slate-700 text-sm">{project.key}</span>
                <CopyKeyButton text={project.key} label="ключ проекта" />
              </span>
            )}
            {task.priority && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                {priorityTypeName && <span className="text-slate-500">{priorityTypeName}:</span>}
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded border ${priorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold mb-2 break-words">{task.name}</h3>
          {task.description && (
            <p className="text-slate-600 text-sm line-clamp-2 whitespace-pre-wrap">{task.description}</p>
          )}
        </div>
        {task.progress != null && task.progress > 0 && (
          <div className="ml-4 shrink-0">
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

      {tags.length > 0 && (
        <div className="flex items-center flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <span
              key={typeof tag === "string" ? tag : tag.id}
              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
            >
              {typeof tag === "string" ? tag : tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          {executor ? (
            <>
              <UserAvatar user={toAvatarUser(executor)} size="sm" />
              <span className="text-slate-600 truncate">Исполнитель: {executor.fullName}</span>
            </>
          ) : (
            <span className="text-slate-400">Исполнитель не назначен</span>
          )}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {task.deadline && (
            <span className="text-slate-500">Крайний срок: {formatDate(task.deadline, "dmy")}</span>
          )}
          {task.estimation && (
            <span className="text-slate-600">
              Оценка трудозатрат: <span className="font-semibold">{task.estimation}</span>
              {estimationUnitShort && <span className="text-slate-500"> {estimationUnitShort}</span>}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
