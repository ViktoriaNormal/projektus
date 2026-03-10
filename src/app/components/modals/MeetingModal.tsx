import { X, Calendar as CalendarIcon, Clock, MapPin, Users, Save, Trash2, Search, Plus, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { users, projects } from "../../data/mockData";
import { UserAvatar } from "../UserAvatar";

interface Meeting {
  id?: number;
  title: string;
  type: string;
  projectId?: number | null;
  startTime: string;
  endTime: string;
  participants: number[];
  location: string;
}

interface MeetingModalNewProps {
  meeting?: Meeting;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (meeting: Meeting) => void;
  onDelete?: (id: number) => void;
  mode: "create" | "edit";
}

export function MeetingModal({ meeting, isOpen, onClose, onSave, onDelete, mode }: MeetingModalNewProps) {
  const [selectedProject, setSelectedProject] = useState<number | null>(meeting?.projectId || null);
  const [selectedType, setSelectedType] = useState(meeting?.type || "");
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>(meeting?.participants || []);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (meeting) {
      setSelectedProject(meeting.projectId || null);
      setSelectedType(meeting.type);
      setSelectedParticipants(meeting.participants);
    }
  }, [meeting]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
  };

  const handleDelete = () => {
    if (meeting?.id && onDelete) {
      if (confirm("Вы уверены, что хотите удалить эту встречу? Все участники получат уведомление об отмене.")) {
        onDelete(meeting.id);
        onClose();
      }
    }
  };

  const handleInviteAllTeam = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && selectedProject) {
      const project = projects.find(p => p.id === selectedProject);
      if (project && project.members) {
        setSelectedParticipants(project.members);
      }
    } else {
      setSelectedParticipants([]);
    }
  };

  const addParticipant = (userId: number) => {
    if (!selectedParticipants.includes(userId)) {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
    setShowUserSearch(false);
    setSearchQuery("");
  };

  const removeParticipant = (userId: number) => {
    setSelectedParticipants(selectedParticipants.filter(id => id !== userId));
  };

  const filteredUsers = users.filter((user) =>
    (user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
    !selectedParticipants.includes(user.id)
  );

  const selectedProjectData = projects.find(p => p.id === selectedProject);
  const projectType = selectedProjectData?.type;

  // Фильтруем типы встреч в зависимости от типа проекта
  const getMeetingTypes = () => {
    if (!selectedProject) {
      // Если проект не выбран, показываем все типы
      return [
        { group: "Scrum-события", options: [
          { value: "scrum_planning", label: "Планирование спринта" },
          { value: "daily_scrum", label: "Ежедневный Scrum" },
          { value: "sprint_review", label: "Обзор спринта" },
          { value: "sprint_retrospective", label: "Ретроспектива спринта" },
        ]},
        { group: "Kanban-каденции", options: [
          { value: "kanban_daily", label: "Ежедневная встреча" },
          { value: "kanban_risk_review", label: "Обзор рисков" },
          { value: "kanban_strategy_review", label: "Обзор стратегии" },
          { value: "kanban_service_delivery_review", label: "Обзор предоставления услуг" },
          { value: "kanban_operations_review", label: "Обзор операций" },
          { value: "kanban_replenishment", label: "Пополнение запасов" },
          { value: "kanban_delivery_planning", label: "Планирование поставок" },
        ]},
        { group: "Другое", options: [
          { value: "custom", label: "Пользовательское событие" },
        ]},
      ];
    }

    if (projectType === "scrum") {
      return [
        { group: "Scrum-события", options: [
          { value: "scrum_planning", label: "Планирование спринта" },
          { value: "daily_scrum", label: "Ежедневный Scrum" },
          { value: "sprint_review", label: "Обзор спринта" },
          { value: "sprint_retrospective", label: "Ретроспектива спринта" },
        ]},
        { group: "Другое", options: [
          { value: "custom", label: "Пользовательское событие" },
        ]},
      ];
    }

    if (projectType === "kanban") {
      return [
        { group: "Kanban-каденции", options: [
          { value: "kanban_daily", label: "Ежедневная встреча" },
          { value: "kanban_risk_review", label: "Обзор рисков" },
          { value: "kanban_strategy_review", label: "Обзор стратегии" },
          { value: "kanban_service_delivery_review", label: "Обзор предоставления услуг" },
          { value: "kanban_operations_review", label: "Обзор операций" },
          { value: "kanban_replenishment", label: "Пополнение запасов" },
          { value: "kanban_delivery_planning", label: "Планирование поставок" },
        ]},
        { group: "Другое", options: [
          { value: "custom", label: "Пользовательское событие" },
        ]},
      ];
    }

    return [];
  };

  const meetingTypes = getMeetingTypes();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {mode === "create" ? "Создать встречу" : "Редактировать встречу"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <CalendarIcon size={16} />
              Название встречи
            </label>
            <input
              type="text"
              defaultValue={meeting?.title}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите название встречи..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Проект (опционально)</label>
            <select 
              value={selectedProject || ""}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : null;
                setSelectedProject(value);
                setSelectedType(""); // Сбрасываем тип при смене проекта
                setSelectedParticipants([]); // Сбрасываем участников
              }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Без привязки к проекту</option>
              {projects.filter(p => p.status === "Активный").map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.type === "scrum" ? "Scrum" : "Kanban"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Тип встречи</label>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Выберите тип встречи</option>
              {meetingTypes.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedProject && (
              <p className="text-xs text-slate-500 mt-1">
                Типы встреч отфильтрованы согласно методологии проекта
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Clock size={16} />
                Дата и время начала
              </label>
              <input
                type="datetime-local"
                defaultValue={meeting?.startTime ? meeting.startTime.slice(0, 16) : ""}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Clock size={16} />
                Дата и время окончания
              </label>
              <input
                type="datetime-local"
                defaultValue={meeting?.endTime ? meeting.endTime.slice(0, 16) : ""}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Место проведения
            </label>
            <input
              type="text"
              defaultValue={meeting?.location}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Конференц-зал, Online и т.д."
              required
            />
          </div>

          {/* Participants Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Users size={16} />
                Участники ({selectedParticipants.length})
              </label>
              {selectedProject && (
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedProjectData?.members && selectedParticipants.length === selectedProjectData.members.length}
                    onChange={handleInviteAllTeam}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <UserPlus size={14} />
                  <span>Пригласить всю команду</span>
                </label>
              )}
            </div>

            {/* Selected Participants */}
            {selectedParticipants.length > 0 && (
              <div className="mb-3 p-3 bg-slate-50 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                {selectedParticipants.map((userId) => {
                  const user = users.find(u => u.id === userId);
                  if (!user) return null;
                  return (
                    <div key={userId} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        <UserAvatar user={user} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{user.fullName}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeParticipant(userId)}
                        className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Participant Button */}
            <button
              type="button"
              onClick={() => setShowUserSearch(!showUserSearch)}
              className="w-full px-4 py-2 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-slate-600 hover:text-blue-600"
            >
              <Plus size={18} />
              Добавить участника
            </button>

            {/* User Search Popup */}
            {showUserSearch && (
              <div className="mt-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Поиск коллег..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => addParticipant(user.id)}
                        className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-blue-300"
                      >
                        <UserAvatar user={user} size="sm" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.fullName}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">
                      {searchQuery ? "Коллеги не найдены" : "Начните вводить для поиска"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            {mode === "edit" && meeting?.id && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Trash2 size={18} />
                Удалить встречу
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md font-medium flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {mode === "create" ? "Создать встречу" : "Сохранить изменения"}
            </button>
          </div>

          {mode === "create" && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              ℹ️ Все участники автоматически получат уведомление о новой встрече
            </div>
          )}
          {mode === "edit" && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900">
              ℹ️ При изменении параметров встречи все участники получат уведомление
            </div>
          )}
        </form>
      </div>
    </div>
  );
}