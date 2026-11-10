import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth.js';
import { Button } from '../components/common/Button.jsx';

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
        // If server session revocation failed but local state cleared
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
      <header className="dashboard-nav">
        <div className="dashboard-nav__inner">
          <div className="dashboard-nav__brand">
            <span className="dashboard-nav__brand-title">My Chapters</span>
            {space?.name && (
              <span className="dashboard-nav__brand-badge" title="Active Personal Space">
                {space.name}
              </span>
            )}
          </div>

          <div className="dashboard-nav__actions">
            <span className="text-sm text-muted font-medium d-none-mobile">
              {user?.username}
            </span>
            <Button
              variant="secondary"
              size="sm"
              isLoading={isLoggingOut}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {logoutNotice && (
        <div style={{ padding: '8px 16px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          <div className="alert alert--warning" role="alert">
            <p>{logoutNotice}</p>
          </div>
        </div>
      )}

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}

