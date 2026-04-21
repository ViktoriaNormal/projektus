import { Clock, MapPin } from "lucide-react";
import type { MeetingResponse } from "../../api/meetings";
import type { ProjectResponse } from "../../api/projects";
import { meetingTypeColor, meetingTypeLabel } from "../../lib/status-colors";
import { formatDate } from "../../lib/format";
import { CopyInviteButton } from "./CopyInviteButton";

const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

interface MeetingCardProps {
  meeting: MeetingResponse;
  projects?: ProjectResponse[];
  organizerName?: string;
  onClick: () => void;
  /** If true, renders as cancelled (strikethrough, muted). */
  cancelled?: boolean;
  /** Optional status badge text, e.g. "Идёт" / "Прошла". */
  badge?: string;
  badgeClass?: string;
}

export function MeetingCard({
  meeting,
  projects,
  organizerName,
  onClick,
  cancelled,
  badge,
  badgeClass,
}: MeetingCardProps) {
  const project = meeting.projectId
    ? projects?.find((p) => String(p.id) === meeting.projectId)
    : null;
  const start = new Date(meeting.startTime);
  const end = new Date(meeting.endTime);

  return (
    <div
      onClick={onClick}
      className={`p-3 border rounded-lg transition-colors cursor-pointer ${
        cancelled ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200 hover:border-blue-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-1 self-stretch rounded-full shrink-0 ${
            cancelled ? "bg-slate-300" : meetingTypeColor(meeting.meetingType)
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`font-semibold text-sm truncate ${cancelled ? "line-through text-slate-400" : ""}`}>
              {meeting.name}
            </h3>
            {!cancelled && <CopyInviteButton meeting={meeting} organizerName={organizerName} size="md" />}
          </div>
          <p className="text-xs text-slate-600 mb-2">{meetingTypeLabel(meeting.meetingType)}</p>
          {cancelled && (
            <span className="inline-block text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full mb-2">
              Отменена
            </span>
          )}
          {!cancelled && badge && (
            <span className={`inline-block text-xs font-medium border px-2 py-0.5 rounded-full mb-2 ${badgeClass || ""}`}>
              {badge}
            </span>
          )}
          {project && (
            <p className="text-xs text-slate-500 mb-1 truncate">📁 {project.name}</p>
          )}
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Clock size={12} className="shrink-0" />
              <span>
                {DAY_NAMES[start.getDay()]}, {formatDate(start, "monthDay")}{" "}
                {start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                {" — "}
                {end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {meeting.location && (
              <div className="flex items-center gap-1">
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">{meeting.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
