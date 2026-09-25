import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './use-auth';

export function RequireAdmin() {
  const { isAdmin } = useAuth();

  return isAdmin ? <Outlet /> : <Navigate to="/bills" replace />;
}
