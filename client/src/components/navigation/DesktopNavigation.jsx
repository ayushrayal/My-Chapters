import { NavLink, Link } from 'react-router-dom';
import { ProfileDropdown } from './ProfileDropdown.jsx';

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
        {/* Left: Wordmark & Space Badge */}
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

        {/* Center: Segmented Navigation (Desktop) */}
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
            to="/dayflow"
            className={({ isActive }) =>
              `desktop-nav-links__link ${isActive ? 'desktop-nav-links__link--active' : ''}`
            }
          >
            Dayflow
          </NavLink>
          <NavLink
            to="/gymflow"
            className={({ isActive }) =>
              `desktop-nav-links__link ${isActive ? 'desktop-nav-links__link--active' : ''}`
            }
          >
            GymFlow
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

        {/* Right: Avatar Dropdown Menu */}
        <div className="dashboard-nav__actions">
          <ProfileDropdown
            user={user}
            space={space}
            isLoggingOut={isLoggingOut}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
}

