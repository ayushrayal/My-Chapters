import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth.js';
import { Loader } from '../components/common/Loader.jsx';

export function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show clean loader while determining session status
  if (isLoading) {
    return <Loader fullScreen text="Loading..." />;
  }

  // Authenticated users visiting /signin or /signup are redirected to /dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-layout">
      <header className="auth-header">
        <h1 className="auth-header__brand">My Chapters</h1>
        <p className="auth-header__tagline">Your life. Your choices. Your space.</p>
      </header>

      <main className="auth-card">
        <Outlet />
      </main>
    </div>
  );
}

