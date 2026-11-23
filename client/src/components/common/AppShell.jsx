import { DesktopNavigation } from '../navigation/DesktopNavigation.jsx';
import { MobileBottomNavigation } from '../navigation/MobileBottomNavigation.jsx';

export function AppShell({
  user,
  space,
  isLoggingOut,
  onLogout,
  notice,
  children
}) {
  return (
    <div className="dashboard-layout app-shell">
      <DesktopNavigation
        user={user}
        space={space}
        isLoggingOut={isLoggingOut}
        onLogout={onLogout}
      />

      {notice && (
        <div className="app-shell__notice-container" style={{ padding: '12px 16px', maxWidth: '1040px', margin: '0 auto', width: '100%' }}>
          <div className="alert alert--warning" role="alert">
            <p>{notice}</p>
          </div>
        </div>
      )}

      <main className="dashboard-main app-shell__main">
        {children}
      </main>

      <MobileBottomNavigation />
    </div>
  );
}

