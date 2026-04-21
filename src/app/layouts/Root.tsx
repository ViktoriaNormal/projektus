import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  Settings,
  Users,
  Shield,
  Key,
  Bell,
  Menu,
  X,
  UsersRound,
  LogOut,
  Check,
  XCircle,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { UserAvatar } from "../components/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import {
  getNotifications, markAsRead, markAllAsRead, deleteAllNotifications,
  type NotificationResponse,
} from "../api/notifications";
import { respondToMeeting } from "../api/meetings";

export default function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, isAdmin, hasPermission, clearAuth } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());
  const [respondedMap, setRespondedMap] = useState<Map<string, 'accepted' | 'declined'>>(new Map());
  useBodyScrollLock(sidebarOpen);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      // Show toast for new unread notifications (skip first load)
      if (!isFirstLoad.current) {
        for (const notif of data) {
          if (!notif.read && !knownIdsRef.current.has(notif.id)) {
            toast(notif.message, { duration: 5000 });
          }
        }
      }
      isFirstLoad.current = false;
      knownIdsRef.current = new Set(data.map(n => n.id));
      setNotifications(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications();
    pollRef.current = setInterval(loadNotifications, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAuthenticated, loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* silent */ }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* silent */ }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllNotifications();
      setNotifications([]);
    } catch { /* silent */ }
  };

  const handleMeetingResponse = async (notif: NotificationResponse, status: 'accepted' | 'declined') => {
    if (!notif.meetingId) return;
    setRespondingIds(prev => new Set(prev).add(notif.id));
    try {
      await respondToMeeting(notif.meetingId, status);
      setRespondedMap(prev => new Map(prev).set(notif.id, status));
      await handleMarkAsRead(notif.id);
      window.dispatchEvent(new Event("meeting-response-changed"));
    } catch { /* silent */ }
    setRespondingIds(prev => { const s = new Set(prev); s.delete(notif.id); return s; });
  };

  const handleNotificationClick = (notif: NotificationResponse) => {
    if (notif.type === 'meeting_invite') return; // has its own buttons
    handleMarkAsRead(notif.id);
    setNotificationsOpen(false);

    if (notif.taskId && notif.type.startsWith('task_')) {
      navigate(`/tasks/${notif.taskId}`);
    } else if (notif.meetingId && (notif.type === 'meeting_change' || notif.type === 'meeting_reminder')) {
      navigate(`/calendar?meeting=${notif.meetingId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isActive = (path: string) => {
    // Task detail / task create pages (/tasks/:id, /tasks/new) don't belong to any section
    // of the sidebar on their own — they're modal-like views opened from Dashboard, Projects,
    // Calendar etc. Use the ?returnUrl= param to resolve which section should stay highlighted;
    // if no returnUrl is present, nothing is highlighted.
    let pathname = location.pathname;
    if (/^\/tasks\/.+/.test(pathname)) {
      const ret = new URLSearchParams(location.search).get("returnUrl");
      if (!ret) return false;
      try {
        pathname = new URL(ret, window.location.origin).pathname;
      } catch {
        return false;
      }
    }
    if (path === "/") {
      return pathname === "/";
    }
    return pathname === path || pathname.startsWith(path + "/");
  };

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Дашборд" },
    { path: "/projects", icon: FolderKanban, label: "Проекты" },
    { path: "/tasks", icon: CheckSquare, label: "Мои задачи" },
    { path: "/calendar", icon: Calendar, label: "Календарь" },
    { path: "/team", icon: UsersRound, label: "Сотрудники" },
  ];

  const adminItems = [
    { path: "/admin/users", icon: Users, label: "Пользователи", permission: "system.users.manage" },
    { path: "/admin/roles", icon: Shield, label: "Системные роли", permission: "system.roles.manage" },
    { path: "/admin/password-policy", icon: Key, label: "Политика паролей", permission: "system.password_policy.manage" },
    { path: "/admin/project-templates", icon: Settings, label: "Шаблоны проектов", permission: "system.project_templates.manage" },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-x-clip">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-2 md:px-4 py-3 gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                Projektus
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1 md:gap-3 shrink-0">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="fixed md:absolute left-4 right-4 md:left-auto md:right-0 mt-2 md:w-96 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
                    <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                      <h3 className="font-semibold">Уведомления</h3>
                      {notifications.length > 0 && (
                        <div className="flex items-center gap-3">
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Прочитать все
                            </button>
                          )}
                          <button
                            onClick={handleDeleteAll}
                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                          >
                            Очистить
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                              !notif.read ? "bg-blue-50" : ""
                            } ${notif.type !== 'meeting_invite' && (notif.taskId || notif.meetingId) ? "cursor-pointer" : ""}`}
                            onClick={() => {
                              if (notif.type !== 'meeting_invite') handleNotificationClick(notif);
                            }}
                          >
                            <p className="text-sm">{notif.message}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(notif.createdAt).toLocaleString("ru-RU")}
                            </p>

                            {/* Meeting info link */}
                            {notif.meetingId && notif.meetingName && notif.type.startsWith('meeting_') && (
                              <Link
                                to={`/calendar?meeting=${notif.meetingId}`}
                                onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); setNotificationsOpen(false); }}
                                className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                {notif.meetingName}
                                {notif.meetingStartTime && (
                                  <span className="text-slate-400 font-normal">
                                    {" "}({new Date(notif.meetingStartTime).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })})
                                  </span>
                                )}
                                {" →"}
                              </Link>
                            )}

                            {/* Meeting invite — accept/decline buttons */}
                            {notif.type === 'meeting_invite' && notif.meetingId && (() => {
                              const status = respondedMap.get(notif.id) || notif.participantStatus || 'pending';
                              const isLoading = respondingIds.has(notif.id);
                              const isAccepted = status === 'accepted';
                              const isDeclined = status === 'declined';
                              return (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleMeetingResponse(notif, 'accepted'); }}
                                    disabled={isLoading || isAccepted}
                                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                                      isAccepted
                                        ? 'bg-green-100 text-green-800 border-green-300'
                                        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                    }`}
                                  >
                                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                    {isAccepted ? 'Принято' : 'Принять'}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleMeetingResponse(notif, 'declined'); }}
                                    disabled={isLoading || isDeclined}
                                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                                      isDeclined
                                        ? 'bg-red-100 text-red-800 border-red-300'
                                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                    }`}
                                  >
                                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                                    {isDeclined ? 'Отклонено' : 'Отклонить'}
                                  </button>
                                </div>
                              );
                            })()}


                            {/* Task notifications — link hint */}
                            {notif.taskId && notif.taskKey && notif.type.startsWith('task_') && (
                              <span className="inline-block mt-1 text-xs text-blue-600 font-medium">
                                {notif.taskKey} →
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-slate-400 text-sm">
                          Нет уведомлений
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link
              to="/settings"
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Settings size={20} />
            </Link>

            <Link
              to="/profile"
              className="flex items-center gap-2 p-1.5 md:pl-3 md:pr-4 md:py-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            >
              <UserAvatar user={{ fullName: user?.fullName || '', avatarUrl: user?.avatarUrl }} size="sm" />
              <span className="hidden md:block font-medium">{user?.fullName}</span>
            </Link>

            <button
              onClick={() => {
                clearAuth();
              }}
              className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors"
              title="Выйти"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-57px)] min-w-0">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out mt-[57px] lg:mt-0 shrink-0`}
        >
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive(item.path)
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            {isAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-200">
              <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Администрирование
              </div>
              {adminItems.filter((item) => hasPermission(item.permission)).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive(item.path)
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
            )}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden mt-[57px]"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 overflow-x-clip">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
