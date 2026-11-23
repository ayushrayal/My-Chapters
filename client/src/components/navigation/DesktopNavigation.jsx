import { NavLink, Link } from 'react-router-dom';
import { Button } from '../common/Button.jsx';
import { Avatar } from '../common/Avatar.jsx';

export function DesktopNavigation({
  user,
  space,
  isLoggingOut,
  onLogout,
  className = ''
}) {
  return (
    <header className={`dashboard-nav ${className}`}>
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
        </div>

        {/* Center: Desktop Navigation Links */}
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
            to="/someday"
            className={({ isActive }) =>
              `desktop-nav-links__link ${isActive ? 'desktop-nav-links__link--active' : ''}`
            }
          >
            Someday
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

        {/* Right: User Avatar & Actions */}
        <div className="dashboard-nav__actions">
          <div className="dashboard-nav__user-pill" title={`Signed in as ${user?.username}`}>
            <Avatar name={user?.username} size="sm" />
            <span className="dashboard-nav__username">{user?.username}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            isLoading={isLoggingOut}
            onClick={onLogout}
            aria-label="Sign out of your account"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}

