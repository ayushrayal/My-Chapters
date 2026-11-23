import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth.js';
import { AppShell } from '../components/common/AppShell.jsx';

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
    <AppShell
      user={user}
      space={space}
      isLoggingOut={isLoggingOut}
      onLogout={handleLogout}
      notice={logoutNotice}
    >
      <Outlet />
    </AppShell>
  );
}
