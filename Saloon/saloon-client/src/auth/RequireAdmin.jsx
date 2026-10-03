import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export default function RequireAdmin() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading) return <main className="admin-page"><p>Checking your session...</p></main>;
  if (auth.error) return <main className="admin-page"><p role="alert">{auth.error}</p><button className="btn-outline" onClick={auth.refresh}>Try Again</button></main>;
  return auth.user?.role === 'Admin' ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
