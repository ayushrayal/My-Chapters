import { Link } from 'react-router-dom';
import { DesktopNavigation } from '../navigation/DesktopNavigation.jsx';
import { MobileBottomNavigation } from '../navigation/MobileBottomNavigation.jsx';
import { ProfileDropdown } from '../navigation/ProfileDropdown.jsx';

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
      {/* Mobile Top Bar (Slim Header with Wordmark and Profile Dropdown) */}
      <header className="mobile-top-bar" aria-label="Mobile Header">
        <Link to="/dashboard" className="mobile-top-bar__brand">
          <span className="mobile-top-bar__wordmark">MY CHAPTERS</span>
          {space?.name && (
            <span className="mobile-top-bar__badge">{space.name}</span>
          )}
        </Link>
        <ProfileDropdown
          user={user}
          space={space}
          isLoggingOut={isLoggingOut}
          onLogout={onLogout}
          className="mobile-top-bar__profile"
          align="right"
        />
      </header>

      {/* Desktop Sticky Glass Navigation */}
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

      {/* Mobile Fixed Bottom Tab Bar */}
      <MobileBottomNavigation />
    </div>
  );
}

