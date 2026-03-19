import { Outlet, Link, useLocation, Navigate } from "react-router";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  BarChart3,
  Settings,
  Users,
  Shield,
  Key,
  FileText,
  User,
  Bell,
  Search,
  Menu,
  X,
  UsersRound,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { notifications } from "../data/mockData";
import { UserAvatar } from "../components/UserAvatar";
import { useAuth } from "../contexts/AuthContext";

export default function Root() {
  const location = useLocation();
  const { user, isAuthenticated, isLoading, isAdmin, hasPermission, clearAuth } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Дашборд" },
    { path: "/projects", icon: FolderKanban, label: "Проекты" },
    { path: "/tasks", icon: CheckSquare, label: "Задачи" },
    { path: "/calendar", icon: Calendar, label: "Календарь" },
    { path: "/team", icon: UsersRound, label: "Коллеги" },
    { path: "/analytics", icon: BarChart3, label: "Аналитика" },
  ];

  const adminItems = [
    { path: "/admin/users", icon: Users, label: "Пользователи", permission: "system.users.manage" },
    { path: "/admin/roles", icon: Shield, label: "Системные роли", permission: "system.roles.manage" },
    { path: "/admin/password-policy", icon: Key, label: "Политика паролей", permission: "system.password_policy.manage" },
    { path: "/admin/project-templates", icon: Settings, label: "Шаблоны проектов", permission: "system.project_templates.manage" },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Projektus
              </span>
            </Link>
          </div>

          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Поиск задач, проектов..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="p-3 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-semibold">Уведомления</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                          !notif.read ? "bg-blue-50" : ""
                        }`}
                      >
                        <p className="text-sm">{notif.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(notif.timestamp).toLocaleString("ru-RU")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
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
              className="flex items-center gap-2 pl-3 pr-4 py-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <UserAvatar user={{ fullName: user?.full_name || '', avatarUrl: user?.avatar_url }} size="sm" />
              <span className="hidden md:block font-medium">{user?.full_name}</span>
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

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out mt-[57px] lg:mt-0`}
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
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}