import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth.js';
import { Loader } from './Loader.jsx';

/**
 * Route guard component that restricts access to authenticated users.
 * While session initialization is pending, displays a clean full-screen loader.
 * Unauthenticated users are redirected to /signin, remembering attempted path.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader fullScreen text="Verifying session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}

