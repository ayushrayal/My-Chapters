import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { ProtectedRoute } from '../components/common/ProtectedRoute.jsx';
import { Signup } from '../features/auth/pages/Signup.jsx';
import { Signin } from '../features/auth/pages/Signin.jsx';
import { Dashboard } from '../features/dashboard/pages/Dashboard.jsx';

function NotFound() {
  return (
    <div className="auth-layout">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h2 className="auth-card__title">404 — Page Not Found</h2>
        <p className="auth-card__subtitle">
          The page you are looking for does not exist.
        </p>
        <Link to="/dashboard" className="btn btn--primary btn--full" style={{ marginTop: '16px' }}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect to /dashboard (which redirects to /signin if unauthenticated) */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public Auth Routes wrapped in AuthLayout (redirects to /dashboard if already signed in) */}
      <Route element={<AuthLayout />}>
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
      </Route>

      {/* Protected Dashboard Route wrapped in ProtectedRoute & DashboardLayout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      {/* Catch-all 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

