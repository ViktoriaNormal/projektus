import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  FolderKanban,
  CheckSquare,
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { PageSpinner } from "../components/ui/Spinner";
import { useAuth } from "../contexts/AuthContext";
import { searchTasks, type TaskResponse } from "../api/tasks";
import { getProjects, getProjectMembers, type ProjectResponse } from "../api/projects";
import { getMeeting, getMeetings, createMeeting, updateMeeting, cancelMeeting, addParticipants, type MeetingResponse, type MeetingDetailsResponse, type CreateMeetingData, type UpdateMeetingData } from "../api/meetings";
import { getBoard, getProjectReferences, type BoardResponse, type ProjectReferences } from "../api/boards";
import { getUser, type UserProfileResponse } from "../api/users";
import { EmptyState } from "../components/ui/EmptyState";
import { TaskListItem } from "../components/tasks/TaskListItem";
import { MeetingCard } from "../components/meetings/MeetingCard";
import { MeetingModal } from "../components/modals/MeetingModal";
import { ProjectCard } from "../components/projects/ProjectCard";

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [boardCache, setBoardCache] = useState<Map<string, BoardResponse>>(new Map());
  const [refs, setRefs] = useState<ProjectReferences | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfileResponse | null>(null);
  const [projectOwners, setProjectOwners] = useState<Record<string, UserProfileResponse>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingDetailsResponse | undefined>();
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  const handleMeetingClick = async (meeting: MeetingResponse) => {
    try {
      const details = await getMeeting(meeting.id);
      setSelectedMeeting(details);
    } catch {
      setSelectedMeeting({ ...meeting, participants: [] });
    }
    setShowMeetingModal(true);
  };

  const handleCreateMeeting = async (data: CreateMeetingData) => {
    await createMeeting(data);
  };

  const handleUpdateMeeting = async (meetingId: string, data: UpdateMeetingData, newParticipantIds?: string[]) => {
    await updateMeeting(meetingId, data);
    if (newParticipantIds && newParticipantIds.length > 0) {
      await addParticipants(meetingId, newParticipantIds);
    }
  };

  const handleCancelMeeting = async (meetingId: string) => {
    await cancelMeeting(meetingId);
  };

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const loadProjects = getProjects()
      .then(async (allProjects) => {
        const active = allProjects.filter(p => p.status === "active");
        const memberChecks = await Promise.allSettled(
          active.map(async (p) => {
            const members = await getProjectMembers(p.id);
            const isMember = members.some(m => m.userId === user.id);
            return isMember ? p : null;
          })
        );
        const myProjects = memberChecks
          .filter((r): r is PromiseFulfilledResult<ProjectResponse | null> => r.status === "fulfilled")
          .map(r => r.value)
          .filter((p): p is ProjectResponse => p !== null);
        setProjects(myProjects);

        // Load owner profiles for the first 4 (rendered on dashboard).
        const ownerIds = [...new Set(myProjects.slice(0, 4).map(p => p.ownerId).filter(Boolean))];
        const owners: Record<string, UserProfileResponse> = {};
        await Promise.allSettled(
          ownerIds.map(async (id) => {
            try { owners[id] = await getUser(id); } catch { /**/ }
          }),
        );
        setProjectOwners(owners);

        return new Set(myProjects.map(p => p.id));
      })
      .catch(() => {
        setProjects([]);
        return new Set<string>();
      });

    const loadTasks = Promise.all([searchTasks({}), loadProjects])
      .then(async ([allTasks, activeProjectIds]) => {
        const myTasks = allTasks.filter(task =>
          task.executorUserId === user.id && activeProjectIds.has(task.projectId),
        );
        setTasks(myTasks);
        // Pre-load boards for the first 4 tasks (rendered on the dashboard) to get priorityType/estimationUnit.
        const boardIds = new Set(myTasks.slice(0, 4).map(t => t.boardId).filter(Boolean));
        const cache = new Map<string, BoardResponse>();
        await Promise.allSettled(
          [...boardIds].map(async (id) => {
            try {
              const b = await getBoard(id);
              cache.set(b.id, b);
            } catch { /**/ }
          }),
        );
        setBoardCache(cache);
      })
      .catch(() => setTasks([]));

    const loadRefs = getProjectReferences()
      .then(setRefs)
      .catch(() => { /**/ });

    const loadCurrentUser = getUser(user.id)
      .then(setCurrentUserProfile)
      .catch(() => { /**/ });

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const loadMeetings = getMeetings(todayStart.toISOString(), todayEnd.toISOString())
      .then(m => {
        const active = m.filter(mt => mt.status !== "cancelled");
        setMeetings(active.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
      })
      .catch(() => setMeetings([]));

    Promise.allSettled([loadTasks, loadProjects, loadMeetings, loadRefs, loadCurrentUser])
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-4 md:p-8 text-white shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 break-words">
          Добро пожаловать, {user?.fullName}!
        </h1>
        <p className="text-blue-100">
          У вас {tasks.length} {tasks.length === 1 ? "активная задача" : `активных ${tasks.length >= 2 && tasks.length <= 4 ? "задачи" : "задач"}`} (где вы исполнитель) и {meetings.length} {meetings.length === 1 ? "встреча" : meetings.length >= 2 && meetings.length <= 4 ? "встречи" : "встреч"} сегодня
        </p>
      </div>

      {/* Tasks & Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              Мои задачи →
            </Link>
          </div>
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.slice(0, 4).map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  project={projects.find((p) => p.id === task.projectId)}
                  executor={currentUserProfile}
                  board={boardCache.get(task.boardId)}
                  refs={refs}
                  returnUrl="/"
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={<CheckSquare size={48} className="opacity-50" />} title="Нет назначенных задач" compact />
          )}
        </div>

        {/* Today's Meetings */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="text-indigo-600" size={24} />
              Встречи на сегодня
            </h2>
            <Link
              to="/calendar"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Календарь →
            </Link>
          </div>
          {meetings.length > 0 ? (
            <div className="space-y-3">
              {meetings.map((meeting) => {
                const start = new Date(meeting.startTime);
                const end = new Date(meeting.endTime);
                const now = new Date();
                const isOngoing = start <= now && end > now;
                const isPast = end <= now;
                const badge = isOngoing ? "Идёт" : isPast ? "Прошла" : undefined;
                const badgeClass = isOngoing
                  ? "bg-green-50 text-green-700 border-green-200"
                  : isPast
                  ? "bg-slate-100 text-slate-500 border-slate-200"
                  : undefined;
                return (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    projects={projects}
                    organizerName={user?.fullName}
                    onClick={() => handleMeetingClick(meeting)}
                    badge={badge}
                    badgeClass={badgeClass}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<Clock size={48} className="opacity-50" />} title="Нет встреч на сегодня" compact />
          )}
        </div>
      </div>

      {/* Active Projects */}
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
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 4).map((project) => (
              <ProjectCard key={project.id} project={project} owner={projectOwners[project.ownerId]} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<FolderKanban size={48} className="opacity-50" />} title="Нет активных проектов" compact />
        )}
      </div>

      {/* Meeting details modal — mirrors Calendar behaviour */}
      {selectedMeeting && (
        <MeetingModal
          meeting={selectedMeeting}
          isOpen={showMeetingModal}
          mode="edit"
          onClose={() => { setShowMeetingModal(false); setSelectedMeeting(undefined); }}
          onSave={handleCreateMeeting}
          onUpdate={handleUpdateMeeting}
          onCancel={handleCancelMeeting}
        />
      )}
    </div>
  );
}
