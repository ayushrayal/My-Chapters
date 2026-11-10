import { useState } from 'react';
import { Outlet, useNavigate, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth.js';
import { Button } from '../components/common/Button.jsx';
import { BottomNavigation } from '../components/navigation/BottomNavigation.jsx';

export function DashboardLayout() {
  const { user, space, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutNotice(null);
    try {
      const res = await logout();
      if (res?.warning) {
        setLogoutNotice(res.warning);
        setTimeout(() => {
          navigate('/signin', { replace: true });
        }, 1500);
      } else {
        navigate('/signin', { replace: true });
      }
    } catch {
      navigate('/signin', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Top Navigation Bar */}
      <header className="dashboard-nav">
        <div className="dashboard-nav__inner">
          <div className="dashboard-nav__left">
            <Link to="/dashboard" className="dashboard-nav__brand">
              <span className="dashboard-nav__brand-title">MY CHAPTERS</span>
              {space?.name && (
                <span className="dashboard-nav__brand-badge" title="Active Personal Space">
                  {space.name}
                </span>
              )}
            </Link>

            {/* Desktop Navigation Links (Home, Profile) */}
            <nav className="desktop-nav-links" aria-label="Desktop Navigation">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `desktop-nav-links__link ${isActive ? 'desktop-nav-links__link--active' : ''}`
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `desktop-nav-links__link ${isActive ? 'desktop-nav-links__link--active' : ''}`
                }
              >
                Profile
              </NavLink>
            </nav>
          </div>

          <div className="dashboard-nav__actions">
            <span className="dashboard-nav__username">
              {user?.username}
            </span>
            <Button
              variant="secondary"
              size="sm"
              isLoading={isLoggingOut}
              onClick={handleLogout}
              aria-label="Sign out of your account"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Logout Warning Notice if backend session revocation could not be confirmed */}
      {logoutNotice && (
        <div style={{ padding: '12px 16px', maxWidth: '1040px', margin: '0 auto', width: '100%' }}>
          <div className="alert alert--warning" role="alert">
            <p>{logoutNotice}</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="dashboard-main">
        <Outlet />
      </main>

      {/* Mobile-First Bottom Navigation (iPhone-style, Home & Profile) */}
      <BottomNavigation />
    </div>
  );
}
