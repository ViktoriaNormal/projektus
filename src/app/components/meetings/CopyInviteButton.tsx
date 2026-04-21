import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { MeetingResponse } from "../../api/meetings";
import { meetingTypeLabel } from "../../lib/status-colors";
import { formatDate } from "../../lib/format";

export function formatInvitation(meeting: MeetingResponse, organizerName?: string): string {
  const start = new Date(meeting.startTime);
  const end = new Date(meeting.endTime);
  const typeName = meetingTypeLabel(meeting.meetingType);
  const date = formatDate(start, "weekday");
  const timeStart = start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const timeEnd = end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  let text = "";
  if (organizerName) {
    text += `${organizerName} приглашает вас на встречу:\n\n`;
  }
  text += `📅 ${meeting.name}\n`;
  text += `🏷 ${typeName}\n`;
  text += `🕐 ${date}, ${timeStart} — ${timeEnd}\n`;
  if (meeting.location) text += `📍 ${meeting.location}\n`;
  if (meeting.description) text += `\n${meeting.description}`;
  return text.trim();
}

export function CopyInviteButton({
  meeting,
  organizerName,
  size = "sm",
}: {
  meeting: MeetingResponse;
  organizerName?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(formatInvitation(meeting, organizerName)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (size === "sm") {
    return (
      <button
        onClick={handleCopy}
        className="p-0.5 rounded hover:bg-white/30 text-white/70 hover:text-white transition-colors"
        title="Скопировать приглашение"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={`shrink-0 p-1.5 rounded-lg transition-colors ${
        copied ? "bg-green-100 text-green-600" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
      }`}
      title="Скопировать приглашение"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}
