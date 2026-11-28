import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { ProtectedRoute } from '../components/common/ProtectedRoute.jsx';
import { Loader } from '../components/common/Loader.jsx';

// Route-based code splitting for production bundle optimization
const Signup = lazy(() => import('../features/auth/pages/Signup.jsx').then((m) => ({ default: m.Signup })));
const Signin = lazy(() => import('../features/auth/pages/Signin.jsx').then((m) => ({ default: m.Signin })));
const Dashboard = lazy(() => import('../features/dashboard/pages/Dashboard.jsx').then((m) => ({ default: m.Dashboard })));
const Someday = lazy(() => import('../features/someday/pages/Someday.jsx').then((m) => ({ default: m.Someday })));
const Dayflow = lazy(() => import('../features/dayflow/pages/Dayflow.jsx').then((m) => ({ default: m.Dayflow })));
const GymFlow = lazy(() => import('../features/gymflow/pages/GymFlow.jsx').then((m) => ({ default: m.GymFlow })));
const GoodBits = lazy(() => import('../features/goodbits/pages/GoodBits.jsx').then((m) => ({ default: m.GoodBits })));
const Profile = lazy(() => import('../features/profile/pages/Profile.jsx').then((m) => ({ default: m.Profile })));

function PageFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Loader size="lg" text="Loading..." />
    </div>
  );
}

function NotFound() {
  return (
    <div className="auth-layout">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h2 className="auth-card__title">404 — Page Not Found</h2>
        <p className="auth-card__subtitle">
          The page you are looking for does not exist in My Chapters.
        </p>
        <Link to="/dashboard" className="btn btn--primary btn--full" style={{ marginTop: '16px' }}>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Root redirect to /dashboard (which redirects to /signin if unauthenticated) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Public Auth Routes wrapped in AuthLayout (redirects to /dashboard if already signed in) */}
        <Route element={<AuthLayout />}>
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
        </Route>

        {/* Protected Routes wrapped in ProtectedRoute & DashboardLayout */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dayflow" element={<Dayflow />} />
          <Route path="/gymflow" element={<GymFlow />} />
          <Route path="/someday" element={<Someday />} />
          <Route path="/goodbits" element={<GoodBits />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Catch-all 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
