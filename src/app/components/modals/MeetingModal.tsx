import { X, Calendar as CalendarIcon, Clock, MapPin, Users, Save, Search, Plus, UserPlus, Loader2, Crown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { toast } from "sonner";
import { UserAvatar } from "../UserAvatar";
import { searchUsers, getUser, type UserProfileResponse } from "../../api/users";
import { useAuth } from "../../contexts/AuthContext";
import type { MeetingDetailsResponse, CreateMeetingData, UpdateMeetingData } from "../../api/meetings";
import { getProjects, getProjectMembers, type ProjectResponse } from "../../api/projects";

interface MeetingModalProps {
  meeting?: MeetingDetailsResponse;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: CreateMeetingData) => Promise<void>;
  onUpdate?: (meetingId: string, data: UpdateMeetingData, newParticipantIds?: string[]) => Promise<void>;
  onCancel?: (id: string) => Promise<void>;
  mode: "create" | "edit";
  defaultStartDate?: string;
}

function formatLocalDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

function getRoundedNow(): string {
  const now = new Date();
  const minutes = now.getMinutes();
  const remainder = minutes % 10;
  if (remainder > 0) {
    now.setMinutes(minutes + (10 - remainder));
  }
  now.setSeconds(0, 0);
  return formatLocalDateTime(now);
}

function plusOneHour(dateTimeLocal: string): string {
  const date = new Date(dateTimeLocal);
  date.setHours(date.getHours() + 1);
  return formatLocalDateTime(date);
}

export function MeetingModal({ meeting, isOpen, onClose, onSave, onUpdate, onCancel, mode, defaultStartDate }: MeetingModalProps) {
  useBodyScrollLock(isOpen);
  const { user: authUser } = useAuth();
  const organizerId = meeting?.organizerId || authUser?.id || null;
  const isOrganizer = mode === "create" || meeting?.organizerId === authUser?.id;
  const readOnly = !isOrganizer;

  const [name, setName] = useState(meeting?.name || "");
  const [description, setDescription] = useState(meeting?.description || "");
  const [selectedProject, setSelectedProject] = useState<string | null>(meeting?.projectId || null);
  const [selectedType, setSelectedType] = useState(meeting?.meetingType || "");
  const initStart = meeting?.startTime ? meeting.startTime.slice(0, 16)
    : defaultStartDate && !defaultStartDate.includes("T")
      ? `${defaultStartDate}T${getRoundedNow().slice(11)}`
      : defaultStartDate || getRoundedNow();
  const [startTime, setStartTime] = useState(initStart);
  const [endTime, setEndTime] = useState(meeting?.endTime ? meeting.endTime.slice(0, 16) : plusOneHour(initStart));
  const [location, setLocation] = useState(meeting?.location || "");
  const [selectedParticipants, setSelectedParticipants] = useState<UserProfileResponse[]>([]);
  const [organizerProfile, setOrganizerProfile] = useState<UserProfileResponse | null>(null);
  const [existingParticipantIds, setExistingParticipantIds] = useState<string[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfileResponse[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [realProjects, setRealProjects] = useState<ProjectResponse[]>([]);
  const loadingProjectMembersRef = useRef(false);

  // Load real projects
  useEffect(() => {
    if (!isOpen) return;
    getProjects().then(setRealProjects).catch(() => setRealProjects([]));
  }, [isOpen]);

  // Load organizer profile
  useEffect(() => {
    if (!organizerId) return;
    getUser(organizerId)
      .then(setOrganizerProfile)
      .catch(() => setOrganizerProfile(null));
  }, [organizerId]);

  // Auto-add organizer to participants on create
  useEffect(() => {
    if (mode === "create" && organizerProfile && !selectedParticipants.find((p) => p.id === organizerProfile.id)) {
      setSelectedParticipants((prev) => {
        if (prev.find((p) => p.id === organizerProfile.id)) return prev;
        return [organizerProfile, ...prev];
      });
    }
  }, [organizerProfile, mode]);

  useEffect(() => {
    if (!isOpen) return;
    if (meeting) {
      setName(meeting.name);
      setDescription(meeting.description || "");
      setSelectedProject(meeting.projectId || null);
      setSelectedType(meeting.meetingType);
      setStartTime(meeting.startTime ? meeting.startTime.slice(0, 16) : "");
      setEndTime(meeting.endTime ? meeting.endTime.slice(0, 16) : "");
      setLocation(meeting.location || "");
      const ids = meeting.participants.map((p) => p.userId);
      setExistingParticipantIds(ids);
      loadParticipantProfiles(ids);
    } else {
      const start = defaultStartDate && !defaultStartDate.includes("T")
        ? `${defaultStartDate}T${getRoundedNow().slice(11)}`
        : defaultStartDate || getRoundedNow();
      setName("");
      setDescription("");
      setSelectedProject(null);
      setSelectedType("");
      setStartTime(start);
      setEndTime(plusOneHour(start));
      setLocation("");

      // Keep organizer, clear the rest
      setSelectedParticipants(organizerProfile ? [organizerProfile] : []);
      setExistingParticipantIds([]);
    }
  }, [isOpen, meeting, defaultStartDate]);

  const loadParticipantProfiles = async (userIds: string[]) => {
    if (userIds.length === 0) {
      setSelectedParticipants(organizerProfile ? [organizerProfile] : []);
      return;
    }
    try {
      const profiles = await Promise.all(
        userIds.map(async (id) => {
          try {
            return await getUser(id);
          } catch {
            return null;
          }
        })
      );
      const loaded = profiles.filter((p): p is UserProfileResponse => p !== null);
      // Ensure organizer is first
      if (organizerId && !loaded.find((p) => p.id === organizerId) && organizerProfile) {
        loaded.unshift(organizerProfile);
      }
      setSelectedParticipants(loaded);
    } catch {
      setSelectedParticipants(organizerProfile ? [organizerProfile] : []);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery, 10, 0);
        const selectedIds = selectedParticipants.map((p) => p.id);
        setSearchResults(results.filter((u) => !selectedIds.includes(u.id)));
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, selectedParticipants]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate times are in the future
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const now = new Date();

    if (startDate <= now) {
      toast.error("Время начала должно быть позже текущего времени");
      return;
    }
    if (endDate <= now) {
      toast.error("Время окончания должно быть позже текущего времени");
      return;
    }
    if (endDate <= startDate) {
      toast.error("Время окончания должно быть позже времени начала");
      return;
    }

    setSaving(true);
    try {
      if (mode === "create" && onSave) {
        const data: CreateMeetingData = {
          name,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          projectId: selectedProject || undefined,
          description: description || undefined,
          meetingType: selectedType || undefined,
          location: location || undefined,
          participantIds: selectedParticipants.map((p) => p.id),
        };
        await onSave(data);
        toast.success("Встреча создана");
      } else if (mode === "edit" && meeting && onUpdate) {
        const data: UpdateMeetingData = {
          name,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          description: description || null,
          meetingType: selectedType || null,
          location: location || null,
          projectId: selectedProject || null,
        };
        const newIds = selectedParticipants
          .map((p) => p.id)
          .filter((id) => !existingParticipantIds.includes(id));
        await onUpdate(meeting.id, data, newIds.length > 0 ? newIds : undefined);
        toast.success("Изменения сохранены");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось сохранить встречу");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (meeting?.id && onCancel) {
      setSaving(true);
      try {
        await onCancel(meeting.id);
        toast.success("Встреча отменена");
        setShowDeleteConfirm(false);
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не удалось отменить встречу");
        setShowDeleteConfirm(false);
      } finally {
        setSaving(false);
      }
    }
  };

  const addParticipant = (user: UserProfileResponse) => {
    if (!selectedParticipants.find((p) => p.id === user.id)) {
      setSelectedParticipants([...selectedParticipants, user]);
    }
    setShowUserSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeParticipant = (userId: string) => {
    if (userId === organizerId) return; // Can't remove organizer
    setSelectedParticipants(selectedParticipants.filter((p) => p.id !== userId));
  };

  const selectedProjectData = realProjects.find((p) => String(p.id) === selectedProject);
  const projectType = selectedProjectData?.projectType;

  const getMeetingTypes = () => {
    if (!selectedProject) {
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
              Название встречи <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={readOnly}
              className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
              placeholder="Введите название встречи..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
              className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${readOnly ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
              placeholder="Описание встречи..."
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Проект</label>
            <select
              value={selectedProject || ""}
              onChange={(e) => {
                const newProjectId = e.target.value || null;
                const prevType = selectedProjectData?.projectType ?? null;
                const newType = (newProjectId ? realProjects.find((p) => String(p.id) === newProjectId)?.projectType : null) ?? null;
                setSelectedProject(newProjectId);
                if (selectedType !== "custom" && prevType !== newType) {
                  setSelectedType("");
                }
              }}
              disabled={readOnly}
              className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
            >
              <option value="">Без привязки к проекту</option>
              {realProjects.filter((p) => p.status === "active").map((project) => (
                <option key={project.id} value={project.id}>
                  {project.key} — {project.name} ({project.projectType === "scrum" ? "Scrum" : "Kanban"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Тип встречи <span className="text-red-500">*</span></label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              disabled={readOnly}
              className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
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
                Дата и время начала <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  if (e.target.value) setEndTime(plusOneHour(e.target.value));
                }}
                disabled={readOnly}
                className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Clock size={16} />
                Дата и время окончания <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={readOnly}
                className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Место проведения <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={readOnly}
              className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
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
              {selectedProject && isOrganizer && (
                <button
                  type="button"
                  disabled={loadingProjectMembersRef.current}
                  onClick={async () => {
                    if (loadingProjectMembersRef.current || !selectedProject) return;
                    loadingProjectMembersRef.current = true;
                    try {
                      const members = await getProjectMembers(selectedProject);
                      const memberProfiles = await Promise.all(
                        members.map(async (m) => {
                          try { return await getUser(m.userId); } catch { return null; }
                        })
                      );
                      const loaded = memberProfiles.filter((p): p is UserProfileResponse => p !== null);
                      setSelectedParticipants((prev) => {
                        const ids = new Set(prev.map((p) => p.id));
                        const newMembers = loaded.filter((m) => !ids.has(m.id));
                        if (newMembers.length === 0) {
                          toast.info("Все участники проекта уже добавлены");
                          return prev;
                        }
                        toast.success(`Добавлено участников: ${newMembers.length}`);
                        return [...prev, ...newMembers];
                      });
                    } catch {
                      toast.error("Не удалось загрузить участников проекта");
                    }
                    loadingProjectMembersRef.current = false;
                  }}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <UserPlus size={14} />
                  Добавить всю команду проекта
                </button>
              )}
            </div>

            {/* Selected Participants */}
            {selectedParticipants.length > 0 && (
              <div className="mb-3 p-3 bg-slate-50 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                {selectedParticipants.map((user) => {
                  const isOrganizerUser = user.id === organizerId;
                  return (
                    <div key={user.id} className={`flex items-center justify-between p-2 rounded-lg border ${isOrganizerUser ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
                      <div className="flex items-center gap-2">
                        <UserAvatar user={{ fullName: user.fullName, avatarUrl: user.avatarUrl }} size="sm" />
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            {user.fullName}
                            {isOrganizerUser && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full font-medium">
                                <Crown size={10} />
                                Организатор
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                      {!isOrganizerUser && isOrganizer && (
                        <button
                          type="button"
                          onClick={() => removeParticipant(user.id)}
                          className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Participant Button */}
            {isOrganizer && (
              <button
                type="button"
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="w-full px-4 py-2 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-slate-600 hover:text-blue-600"
              >
                <Plus size={18} />
                Добавить участника
              </button>
            )}

            {/* User Search Popup */}
            {isOrganizer && showUserSearch && (
              <div className="mt-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Поиск коллег..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => addParticipant(user)}
                        className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-blue-300"
                      >
                        <UserAvatar user={{ fullName: user.fullName, avatarUrl: user.avatarUrl }} size="sm" />
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            {mode === "edit" && meeting?.id && meeting.status !== "cancelled" && meeting.organizerId === authUser?.id && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
                className="mr-auto px-4 h-11 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-60 text-sm"
              >
                <X size={16} />
                Отменить встречу
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-8 h-11 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              Отмена
            </button>
            {isOrganizer && (
              <button
                type="submit"
                disabled={saving}
                className="px-5 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md font-medium flex items-center gap-2 disabled:opacity-60 whitespace-nowrap"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {mode === "create" ? "Создать встречу" : "Сохранить изменения"}
              </button>
            )}
          </div>

          {mode === "create" && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              Все участники автоматически получат уведомление о новой встрече
            </div>
          )}
          {mode === "edit" && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900">
              При изменении параметров встречи все участники получат уведомление
            </div>
          )}
        </form>
      </div>

      {/* Cancel Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-2">Отменить встречу</h2>
            <p className="text-slate-600 mb-6">
              Вы уверены, что хотите отменить встречу <strong>"{name}"</strong>? Все участники получат уведомление об отмене.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Назад
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                {saving ? "Отмена..." : "Отменить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
