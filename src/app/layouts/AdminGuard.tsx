import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

const ROUTE_PERMISSIONS: Record<string, string> = {
  '/admin/users': 'system.users.manage',
  '/admin/roles': 'system.roles.manage',
  '/admin/password-policy': 'system.password_policy.manage',
  '/admin/project-templates': 'system.project_templates.manage',
};

export default function AdminGuard() {
  const { isAdmin, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const requiredPerm = ROUTE_PERMISSIONS[location.pathname];
  if (requiredPerm && !hasPermission(requiredPerm)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
