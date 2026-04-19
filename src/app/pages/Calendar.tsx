import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Loader2, Copy, Check, Info } from "lucide-react";
import { getProjects, type ProjectResponse } from "../api/projects";
import { MeetingModal } from "../components/modals/MeetingModal";
import { useAuth } from "../contexts/AuthContext";
import {
  getMeetings,
  getMeeting,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  addParticipants,
  type MeetingResponse,
  type MeetingDetailsResponse,
  type CreateMeetingData,
  type UpdateMeetingData,
} from "../api/meetings";
import { formatDate } from "../lib/format";
import { EmptyState } from "../components/ui/EmptyState";

function getTodayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getTodayEnd(): Date {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

function unwrapMeetings(result: unknown): MeetingResponse[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && "meetings" in result) {
    const arr = (result as { meetings: unknown }).meetings;
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

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

function formatInvitation(meeting: MeetingResponse, organizerName?: string): string {
  const start = new Date(meeting.startTime);
  const end = new Date(meeting.endTime);
  const typeName = meetingTypeLabelMap[meeting.meetingType] || meeting.meetingType;
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

function CopyInviteButton({ meeting, organizerName, size = "sm" }: { meeting: MeetingResponse; organizerName?: string; size?: "sm" | "md" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        copied
          ? "bg-green-100 text-green-600"
          : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
      }`}
      title="Скопировать приглашение"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

function WeekMeetingCard({
  meeting, meetingTypeColors, meetingTypeLabels, dayNames, organizerName, onClick, cancelled, badge, badgeClass, projects,
}: {
  meeting: MeetingResponse;
  meetingTypeColors: Record<string, string>;
  meetingTypeLabels: Record<string, string>;
  dayNames: string[];
  organizerName?: string;
  onClick: () => void;
  cancelled?: boolean;
  badge?: string;
  badgeClass?: string;
  projects: ProjectResponse[];
}) {
  const project = meeting.projectId
    ? projects.find((p) => String(p.id) === meeting.projectId)
    : null;
  const start = new Date(meeting.startTime);
  const end = new Date(meeting.endTime);

  return (
    <div
      onClick={onClick}
      className={`p-3 border rounded-lg transition-colors cursor-pointer ${
        cancelled
          ? "border-slate-200 bg-slate-50 opacity-60"
          : "border-slate-200 hover:border-blue-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-1 self-stretch rounded-full shrink-0 ${
            cancelled ? "bg-slate-300" : meetingTypeColors[meeting.meetingType] || "bg-slate-500"
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`font-semibold text-sm truncate ${cancelled ? "line-through text-slate-400" : ""}`}>
              {meeting.name}
            </h3>
            {!cancelled && <CopyInviteButton meeting={meeting} organizerName={organizerName} size="md" />}
          </div>
          <p className="text-xs text-slate-600 mb-2">
            {meetingTypeLabels[meeting.meetingType] || meeting.meetingType}
          </p>
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
            <p className="text-xs text-slate-500 mb-1 truncate">
              📁 {project.name}
            </p>
          )}
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Clock size={12} className="shrink-0" />
              <span>
                {dayNames[start.getDay()]},{" "}
                {formatDate(start, "monthDay")}{" "}
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

function LegendItem({ color, label, tooltip }: { color: string; label: string; tooltip: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className={`w-4 h-4 ${color} rounded shrink-0 mt-0.5`}></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">{label}</span>
          {/* Hover tooltip for desktop only */}
          <div className="relative group hidden md:inline-flex">
            <Info size={14} className="text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>
        </div>
        {/* Inline description on mobile where hover doesn't work */}
        <p className="md:hidden text-xs text-slate-500 mt-0.5 leading-snug">{tooltip}</p>
      </div>
    </div>
  );
}

export default function Calendar() {
  const { user: authUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingDetailsResponse | undefined>(undefined);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [monthMeetings, setMonthMeetings] = useState<MeetingResponse[]>([]);
  const [weekMeetings, setWeekMeetings] = useState<MeetingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(true);
  const [defaultDate, setDefaultDate] = useState<string>("");
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const meetingParamHandled = useRef(false);

  useEffect(() => {
    getProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  // Open meeting modal from notification link (?meeting=id)
  useEffect(() => {
    const meetingId = searchParams.get("meeting");
    if (meetingId && !meetingParamHandled.current) {
      meetingParamHandled.current = true;
      getMeeting(meetingId).then(details => {
        setSelectedMeeting(details);
        setShowMeetingModal(true);
      }).catch(() => { /* meeting not found */ });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadMonthMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const from = new Date(year, month, 1).toISOString();
      const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const result = await getMeetings(from, to);
      setMonthMeetings(unwrapMeetings(result));
    } catch {
      setMonthMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const loadWeekMeetings = useCallback(async () => {
    setWeekLoading(true);
    try {
      const from = getTodayStart().toISOString();
      const to = getTodayEnd().toISOString();
      const result = await getMeetings(from, to);
      const list = unwrapMeetings(result);
      setWeekMeetings(list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    } catch {
      setWeekMeetings([]);
    } finally {
      setWeekLoading(false);
    }
  }, []);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadMonthMeetings(), loadWeekMeetings()]);
  }, [loadMonthMeetings, loadWeekMeetings]);

  useEffect(() => {
    loadMonthMeetings();
  }, [loadMonthMeetings]);

  useEffect(() => {
    loadWeekMeetings();
  }, [loadWeekMeetings]);

  // Reload when meeting is accepted/declined from notifications
  useEffect(() => {
    const handler = () => reloadAll();
    window.addEventListener("meeting-response-changed", handler);
    return () => window.removeEventListener("meeting-response-changed", handler);
  }, [reloadAll]);

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  // Mobile week view helpers
  const weekStart = (() => {
    const d = new Date(currentDate);
    const dow = d.getDay(); // 0 = Sun
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const weekDays: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const previousWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const getMeetingsForDay = (date: Date) => {
    const now = new Date();
    return monthMeetings
      .filter((meeting) => {
        if (meeting.status === "cancelled") return false;
        const md = new Date(meeting.startTime);
        return md.getDate() === date.getDate() && md.getMonth() === date.getMonth() && md.getFullYear() === date.getFullYear();
      })
      .sort((a, b) => Math.abs(new Date(a.startTime).getTime() - now.getTime()) - Math.abs(new Date(b.startTime).getTime() - now.getTime()));
  };

  const weekHeaderLabel = (() => {
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
    const fmt = (d: Date) => d.toLocaleDateString("ru-RU", sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" });
    const endDate = sameMonth
      ? `${weekEnd.getDate()} ${monthNames[weekEnd.getMonth()].toLowerCase().slice(0, 3)}.`
      : fmt(weekEnd);
    return `${fmt(weekStart)} — ${endDate} ${weekEnd.getFullYear()}`;
  })();

  const getMeetingsForDate = (day: number) => {
    const now = new Date();
    return monthMeetings
      .filter((meeting) => {
        if (meeting.status === "cancelled") return false;
        const meetingDate = new Date(meeting.startTime);
        return (
          meetingDate.getDate() === day &&
          meetingDate.getMonth() === currentDate.getMonth() &&
          meetingDate.getFullYear() === currentDate.getFullYear()
        );
      })
      .sort((a, b) =>
        Math.abs(new Date(a.startTime).getTime() - now.getTime()) -
        Math.abs(new Date(b.startTime).getTime() - now.getTime())
      );
  };

  const handleMeetingClick = async (meeting: MeetingResponse) => {
    try {
      const details = await getMeeting(meeting.id);
      setSelectedMeeting(details);
      setShowMeetingModal(true);
    } catch {
      setSelectedMeeting({ ...meeting, participants: [] });
      setShowMeetingModal(true);
    }
  };

  const handleCreateFromCell = (day?: number) => {
    if (day) {
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      setDefaultDate(`${y}-${m}-${d}`);
    } else {
      setDefaultDate("");
    }
    setSelectedMeeting(undefined);
    setShowCreateModal(true);
  };

  const handleCreate = async (data: CreateMeetingData) => {
    await createMeeting(data);
    await reloadAll();
  };

  const handleUpdate = async (meetingId: string, data: UpdateMeetingData, newParticipantIds?: string[]) => {
    await updateMeeting(meetingId, data);
    if (newParticipantIds && newParticipantIds.length > 0) {
      await addParticipants(meetingId, newParticipantIds);
    }
    await reloadAll();
  };

  const handleCancel = async (meetingId: string) => {
    await cancelMeeting(meetingId);
    await reloadAll();
  };

  const meetingTypeColors: Record<string, string> = {
    scrum_planning: "bg-blue-500",
    daily_scrum: "bg-green-500",
    sprint_review: "bg-indigo-500",
    sprint_retrospective: "bg-purple-500",
    kanban_daily: "bg-emerald-500",
    kanban_risk_review: "bg-orange-500",
    kanban_strategy_review: "bg-yellow-500",
    kanban_service_delivery_review: "bg-cyan-500",
    kanban_operations_review: "bg-teal-500",
    kanban_replenishment: "bg-lime-500",
    kanban_delivery_planning: "bg-amber-500",
    custom: "bg-slate-500",
  };

  const meetingTypeLabels = meetingTypeLabelMap;

  const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Календарь встреч</h1>
          <p className="text-slate-600 mt-1">
            Расписание Scrum-событий и Kanban-каденций
          </p>
        </div>
        <button
          onClick={() => {
            setDefaultDate("");
            setSelectedMeeting(undefined);
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Создать встречу
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 md:p-6 shadow-md border border-slate-100">
          {/* Desktop header: month */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          {/* Mobile header: week */}
          <div className="md:hidden flex items-center justify-between mb-4 gap-2">
            <h2 className="text-base font-bold min-w-0 truncate">{weekHeaderLabel}</h2>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={previousWeek}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                aria-label="Предыдущая неделя"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextWeek}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                aria-label="Следующая неделя"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Mobile week view */}
          <div className="md:hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={28} className="animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-2">
                {weekDays.map((date) => {
                  const dayMeetings = getMeetingsForDay(date);
                  const now = new Date();
                  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const dowLabel = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][date.getDay()];
                  return (
                    <div
                      key={date.toISOString()}
                      className={`border rounded-lg p-3 ${isToday ? "bg-blue-50 border-blue-300" : "border-slate-200"} ${isPast && !isToday ? "opacity-70" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-baseline gap-2">
                          <span className={`text-lg font-bold ${isToday ? "text-blue-600" : "text-slate-900"}`}>{date.getDate()}</span>
                          <span className="text-xs uppercase text-slate-500 tracking-wider">{dowLabel}, {monthNames[date.getMonth()].toLowerCase()}</span>
                        </div>
                        {!isPast && (
                          <button
                            onClick={() => handleCreateFromCell(date.getDate())}
                            className="p-1.5 hover:bg-blue-100 rounded text-blue-600 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                            title="Создать встречу"
                            aria-label="Создать встречу"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                      {dayMeetings.length > 0 ? (
                        <div className="space-y-1">
                          {dayMeetings.map((meeting) => (
                            <div
                              key={meeting.id}
                              onClick={() => handleMeetingClick(meeting)}
                              className={`text-xs px-2 py-1.5 rounded text-white cursor-pointer flex items-center justify-between gap-2 ${meetingTypeColors[meeting.meetingType] || "bg-slate-500"}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{meeting.name}</p>
                                <p className="opacity-80">
                                  {new Date(meeting.startTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                                  {" — "}
                                  {new Date(meeting.endTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                              <CopyInviteButton meeting={meeting} organizerName={authUser?.fullName} size="sm" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">Нет встреч</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop month view */}
          <div className="hidden md:block">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-slate-600 text-xs sm:text-sm py-2"
                >
                  {day}
                </div>
              ))}

              {Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }).map(
                (_, i) => (
                  <div key={`empty-${i}`} className="min-h-[72px] md:aspect-square md:min-h-0" />
                )
              )}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayMeetings = getMeetingsForDate(day);
                const hasMeetings = dayMeetings.length > 0;
                const now = new Date();
                const isToday =
                  day === now.getDate() &&
                  currentDate.getMonth() === now.getMonth() &&
                  currentDate.getFullYear() === now.getFullYear();
                const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 23, 59, 59);
                const isPast = cellDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());

                return (
                  <div
                    key={day}
                    className={`group relative min-h-[72px] md:aspect-square md:min-h-0 border border-slate-200 rounded-lg p-1 sm:p-1.5 flex flex-col ${
                      isToday ? "bg-blue-50 border-blue-300" : isPast ? "opacity-50" : ""
                    }`}
                  >
                    {/* Day number + plus for cells with meetings */}
                    <div className="flex items-center justify-between shrink-0">
                      <span className={`text-sm font-semibold ${isToday ? "text-blue-600" : isPast ? "text-slate-400" : ""}`}>
                        {day}
                      </span>
                      {hasMeetings && !isPast && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateFromCell(day);
                          }}
                          className="opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity p-0.5 hover:bg-blue-100 rounded text-blue-600"
                          title="Создать встречу"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>

                    {/* Meetings or centered plus */}
                    {hasMeetings ? (
                      <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 mt-0.5 scrollbar-thin">
                        {dayMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            onClick={() => handleMeetingClick(meeting)}
                            className={`text-xs px-1 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-between gap-0.5 ${
                              meetingTypeColors[meeting.meetingType] || "bg-slate-500"
                            }`}
                            title={`${meeting.name} — ${new Date(meeting.startTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`}
                          >
                            <span className="truncate">
                              {new Date(meeting.startTime).toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <CopyInviteButton meeting={meeting} organizerName={authUser?.fullName} size="sm" />
                          </div>
                        ))}
                      </div>
                    ) : !isPast ? (
                      <div className="flex-1 flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateFromCell(day);
                          }}
                          className="opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity p-1.5 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-blue-600"
                          title="Создать встречу"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>

        {/* Current Week Meetings */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <h2 className="text-xl font-bold mb-4">Встречи на сегодня</h2>

          {weekLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-600" />
            </div>
          ) : weekMeetings.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                const now = new Date();
                const byFreshness = (a: MeetingResponse, b: MeetingResponse) =>
                  Math.abs(new Date(a.startTime).getTime() - now.getTime()) - Math.abs(new Date(b.startTime).getTime() - now.getTime());

                const notCancelled = weekMeetings.filter((m) => m.status !== "cancelled");
                const cancelled = weekMeetings.filter((m) => m.status === "cancelled").sort(byFreshness);

                const ongoing = notCancelled.filter((m) => new Date(m.startTime) <= now && new Date(m.endTime) > now).sort(byFreshness);
                const upcoming = notCancelled.filter((m) => new Date(m.startTime) > now).sort(byFreshness);
                const past = notCancelled.filter((m) => new Date(m.endTime) <= now).sort(byFreshness);

                const sections: { label: string; meetings: MeetingResponse[]; badge?: string; badgeClass?: string; cancelled?: boolean }[] = [];
                if (ongoing.length > 0) sections.push({ label: "Сейчас идут", meetings: ongoing, badge: "Идёт", badgeClass: "bg-green-50 text-green-700 border-green-200" });
                if (upcoming.length > 0) sections.push({ label: "Предстоящие", meetings: upcoming });
                if (past.length > 0) sections.push({ label: "Прошедшие", meetings: past, badge: "Прошла", badgeClass: "bg-slate-100 text-slate-500 border-slate-200" });
                if (cancelled.length > 0) sections.push({ label: "Отменённые", meetings: cancelled, cancelled: true });

                return sections.map((section, sIdx) => (
                  <div key={section.label}>
                    {sIdx > 0 && <hr className="border-slate-200 mb-3" />}
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{section.label}</p>
                    <div className="space-y-2">
                      {section.meetings.map((meeting) => (
                        <WeekMeetingCard
                          key={meeting.id}
                          meeting={meeting}
                          meetingTypeColors={meetingTypeColors}
                          meetingTypeLabels={meetingTypeLabels}
                          dayNames={dayNames}
                          organizerName={authUser?.fullName}
                          onClick={() => handleMeetingClick(meeting)}
                          cancelled={section.cancelled}
                          badge={section.badge}
                          badgeClass={section.badgeClass}
                          projects={projects}
                        />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <EmptyState icon={<Clock size={48} className="opacity-50" />} title="Нет встреч на сегодня" compact />
          )}
        </div>
      </div>

      {/* Meeting Types Legend */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <h3 className="font-semibold mb-4">Типы встреч</h3>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Scrum-события</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <LegendItem color="bg-blue-500" label="Планирование спринта" tooltip="Встреча в начале спринта, на которой команда определяет цель и отбирает задачи из бэклога продукта в бэклог спринта." />
              <LegendItem color="bg-green-500" label="Daily Scrum" tooltip="Короткая ежедневная синхронизация команды (до 15 минут): что сделано, что планируется, есть ли препятствия." />
              <LegendItem color="bg-indigo-500" label="Обзор спринта" tooltip="Встреча в конце спринта для демонстрации заинтересованным лицам выполненной работы и сбора обратной связи." />
              <LegendItem color="bg-purple-500" label="Ретроспектива" tooltip="Внутренняя встреча команды для анализа рабочих процессов в завершённом спринте и их улучшения в следующем." />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Kanban-каденции</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <LegendItem color="bg-emerald-500" label="Ежедневная встреча" tooltip="Обсуждение внутри команды: кто над чем работает, есть ли проблемы и нужна ли помощь." />
              <LegendItem color="bg-orange-500" label="Обзор рисков" tooltip="Ежемесячное обсуждение допущенных ошибок и способов их предотвращения в будущем." />
              <LegendItem color="bg-yellow-500" label="Обзор стратегии" tooltip="Ежеквартальное обсуждение глобальных вопросов развития продукта и команды." />
              <LegendItem color="bg-cyan-500" label="Обзор предоставления услуг" tooltip="Совещание с заказчиками раз в две недели для оценки результатов работы и удовлетворённости." />
              <LegendItem color="bg-teal-500" label="Обзор операций" tooltip="Ежемесячное совещание менеджеров по улучшению системы управления задачами в целом." />
              <LegendItem color="bg-lime-500" label="Пополнение запасов" tooltip="Еженедельная оценка незавершённой работы и перенос новых задач, если WIP-лимиты позволяют." />
              <LegendItem color="bg-amber-500" label="Планирование поставок" tooltip="Совещание для контроля и планирования поставок заказчикам, проводится с частотой поставки." />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Другое</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <LegendItem color="bg-slate-500" label="Пользовательское событие" tooltip="Встреча, не привязанная к конкретной методологии. Подходит для любых совещаний и обсуждений." />
            </div>
          </div>
        </div>
      </div>

      {/* Create Meeting Modal */}
      <MeetingModal
        isOpen={showCreateModal}
        mode="create"
        defaultStartDate={defaultDate}
        onClose={() => {
          setShowCreateModal(false);
          setDefaultDate("");
        }}
        onSave={handleCreate}
      />

      {/* View/Edit Meeting Modal */}
      {selectedMeeting && (
        <MeetingModal
          meeting={selectedMeeting}
          isOpen={showMeetingModal}
          mode="edit"
          onClose={() => {
            setShowMeetingModal(false);
            setSelectedMeeting(undefined);
          }}
          onSave={handleCreate}
          onUpdate={handleUpdate}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
