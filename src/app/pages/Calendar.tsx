import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin } from "lucide-react";
import { meetings, users, projects } from "../data/mockData";
import { MeetingModal } from "../components/modals/MeetingModal";

interface Meeting {
  id: number;
  title: string;
  type: string;
  projectId?: number | null;
  startTime: string;
  endTime: string;
  participants: number[];
  location: string;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | undefined>(undefined);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

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
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
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

  const getMeetingsForDate = (day: number) => {
    return meetings.filter((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      return (
        meetingDate.getDate() === day &&
        meetingDate.getMonth() === currentDate.getMonth() &&
        meetingDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  // Получить встречи текущей рабочей недели
  const getCurrentWeekMeetings = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Понедельник текущей недели
    const monday = new Date(today);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    
    // Воскресенье текущей недели
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return meetings.filter((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      return meetingDate >= monday && meetingDate <= sunday;
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowMeetingModal(true);
  };

  const handleDeleteMeeting = (id: number) => {
    // В реальном приложении здесь будет удаление через API
    console.log("Delete meeting", id);
  };

  const meetingTypeColors: Record<string, string> = {
    // Scrum события
    scrum_planning: "bg-blue-500",
    daily_scrum: "bg-green-500",
    sprint_review: "bg-indigo-500",
    sprint_retrospective: "bg-purple-500",
    // Kanban каденции
    kanban_daily: "bg-emerald-500",
    kanban_risk_review: "bg-orange-500",
    kanban_strategy_review: "bg-yellow-500",
    kanban_service_delivery_review: "bg-cyan-500",
    kanban_operations_review: "bg-teal-500",
    kanban_replenishment: "bg-lime-500",
    kanban_delivery_planning: "bg-amber-500",
    // Пользовательские
    custom: "bg-slate-500",
  };

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

  const currentWeekMeetings = getCurrentWeekMeetings();

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
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center justify-between mb-6">
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

          <div className="grid grid-cols-7 gap-2">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-slate-600 text-sm py-2"
              >
                {day}
              </div>
            ))}

            {Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }).map(
              (_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              )
            )}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayMeetings = getMeetingsForDate(day);
              const isToday =
                day === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={day}
                  className={`aspect-square border border-slate-200 rounded-lg p-2 ${
                    isToday ? "bg-blue-50 border-blue-300" : ""
                  }`}
                >
                  <div className={`text-sm font-semibold mb-1 ${isToday ? "text-blue-600" : ""}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayMeetings.slice(0, 3).map((meeting) => (
                      <div
                        key={meeting.id}
                        onClick={() => handleMeetingClick(meeting)}
                        className={`text-xs px-1 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-80 transition-opacity ${
                          meetingTypeColors[meeting.type] || "bg-slate-500"
                        }`}
                        title={meeting.title}
                      >
                        {new Date(meeting.startTime).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    ))}
                    {dayMeetings.length > 3 && (
                      <div className="text-xs text-slate-500">
                        +{dayMeetings.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Week Meetings */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <h2 className="text-xl font-bold mb-4">Встречи текущей недели</h2>
          
          {currentWeekMeetings.length > 0 ? (
            <div className="space-y-3">
              {currentWeekMeetings.map((meeting) => {
                const project = projects.find((p) => p.id === meeting.projectId);
                const startTime = new Date(meeting.startTime);
                const endTime = new Date(meeting.endTime);

                return (
                  <div
                    key={meeting.id}
                    onClick={() => handleMeetingClick(meeting)}
                    className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-1 h-full rounded-full ${
                          meetingTypeColors[meeting.type]
                        }`}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">{meeting.title}</h3>
                        <p className="text-xs text-slate-600 mb-2">
                          {meetingTypeLabels[meeting.type]}
                        </p>
                        {project && (
                          <p className="text-xs text-slate-500 mb-1">
                            📁 {project.name}
                          </p>
                        )}
                        <div className="space-y-1 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>
                              {startTime.toLocaleDateString("ru-RU", { 
                                day: "2-digit", 
                                month: "2-digit" 
                              })} в{" "}
                              {startTime.toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {" - "}
                              {endTime.toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin size={12} />
                            <span>{meeting.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Clock size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Нет встреч на этой неделе</p>
            </div>
          )}
        </div>
      </div>

      {/* Meeting Types Legend */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <h3 className="font-semibold mb-4">Типы встреч</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Scrum-события</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Планирование спринта</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Daily Scrum</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-indigo-500 rounded"></div>
                <span className="text-sm">Обзор спринта</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span className="text-sm">Ретроспектива</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Kanban-каденции</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                <span className="text-sm">Ежедневная встреча</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm">Обзор рисков</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Обзор стратегии</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-cyan-500 rounded"></div>
                <span className="text-sm">Обзор предоставления услуг</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-teal-500 rounded"></div>
                <span className="text-sm">Обзор операций</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-lime-500 rounded"></div>
                <span className="text-sm">Пополнение запасов</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                <span className="text-sm">Планирование поставок</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Другое</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-slate-500 rounded"></div>
                <span className="text-sm">Пользовательское событие</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Meeting Modal */}
      <MeetingModal
        isOpen={showCreateModal}
        mode="create"
        onClose={() => setShowCreateModal(false)}
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
          onDelete={handleDeleteMeeting}
        />
      )}
    </div>
  );
}
