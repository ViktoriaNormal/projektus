import { createBrowserRouter } from "react-router";
import Root from "./layouts/Root";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Board from "./pages/Board";
import Tasks from "./pages/Tasks";
import TaskDetail from "./pages/TaskDetail";
import Calendar from "./pages/Calendar";
import Analytics from "./pages/Analytics";
import Team from "./pages/Team";
import AdminUsers from "./pages/admin/Users";
import AdminRoles from "./pages/admin/Roles";
import AdminPasswordPolicy from "./pages/admin/PasswordPolicy";
import ProjectTemplates from "./pages/admin/ProjectTemplates";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "projects", Component: Projects },
      { path: "projects/:id", Component: ProjectDetail },
      { path: "projects/:id/board", Component: Board },
      { path: "tasks", Component: Tasks },
      { path: "tasks/:id", Component: TaskDetail },
      { path: "calendar", Component: Calendar },
      { path: "analytics", Component: Analytics },
      { path: "team", Component: Team },
      { path: "admin/users", Component: AdminUsers },
      { path: "admin/roles", Component: AdminRoles },
      { path: "admin/password-policy", Component: AdminPasswordPolicy },
      { path: "admin/project-templates", Component: ProjectTemplates },
      { path: "profile", Component: Profile },
      { path: "settings", Component: Settings },
      { path: "*", Component: NotFound },
    ],
  },
]);