import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

export default function AdminGuard() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
