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
    <div className="auth-layout auth-split-layout">
      {/* Left Brand Showcase Panel */}
      <aside className="auth-brand-panel" aria-label="Brand Overview">
        <div className="auth-brand-shapes" aria-hidden="true">
          <div className="auth-shape auth-shape--one" />
          <div className="auth-shape auth-shape--two" />
          <div className="auth-shape auth-shape--three" />
        </div>

        <div className="auth-brand-content">
          <header className="auth-brand-header">
            <div className="auth-brand-pill">
              <span className="auth-brand-pill__dot" aria-hidden="true" />
              <span>Personal Life OS</span>
            </div>
            <h1 className="auth-brand-wordmark">MY CHAPTERS</h1>
            <p className="auth-brand-tagline">Your life. Your choices. Your space.</p>
          </header>

          <div className="auth-brand-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Private Space</span>
                <p className="auth-feature-desc">Dedicated, isolated multi-tenant environment where your data remains exclusively yours.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Intentional Living</span>
                <p className="auth-feature-desc">Document life chapters, critical decisions, and meaningful reflections over time.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 14 14" />
                </svg>
              </div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Someday Milestones</span>
                <p className="auth-feature-desc">Track aspirations, organize planned purchases, and celebrate acquired goals.</p>
              </div>
            </div>
          </div>

          <footer className="auth-brand-footer">
            <span>&copy; {new Date().getFullYear()} My Chapters &bull; Single-tenant space isolation</span>
          </footer>
        </div>
      </aside>

      {/* Right Form Panel */}
      <section className="auth-form-panel">
        <div className="auth-form-container">
          <main className="auth-card">
            <Outlet />
          </main>
        </div>
      </section>
    </div>
  );
}

