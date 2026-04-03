import { createBrowserRouter } from "react-router";
import Root from "./layouts/Root";
import AdminGuard from "./layouts/AdminGuard";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Board from "./pages/Board";
import Tasks from "./pages/Tasks";
import TaskDetail from "./pages/TaskDetail";
import Calendar from "./pages/Calendar";
import Team from "./pages/Team";
import AdminUsers from "./pages/admin/Users";
import AdminRoles from "./pages/admin/Roles";
import AdminPasswordPolicy from "./pages/admin/PasswordPolicy";
import ProjectTemplates from "./pages/admin/ProjectTemplates";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  { path: "/register", Component: Register },
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
      { path: "team", Component: Team },
      {
        path: "admin",
        Component: AdminGuard,
        children: [
          { path: "users", Component: AdminUsers },
          { path: "roles", Component: AdminRoles },
          { path: "password-policy", Component: AdminPasswordPolicy },
          { path: "project-templates", Component: ProjectTemplates },
        ],
      },
      { path: "profile", Component: Profile },
      { path: "settings", Component: Settings },
      { path: "*", Component: NotFound },
    ],
  },
]);
