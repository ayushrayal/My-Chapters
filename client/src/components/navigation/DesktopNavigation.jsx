import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../common/Avatar.jsx';

export function DesktopNavigation({
  user,
  space,
  isLoggingOut,
  onLogout,
  className = ''
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleNavigate = (path) => {
    setIsMenuOpen(false);
    navigate(path);
  };

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
        <div className="dashboard-nav__actions" ref={menuRef}>
          <div className="dashboard-nav__user-menu">
            <button
              type="button"
              className="dashboard-nav__avatar-btn"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              aria-label="User account menu"
            >
              <Avatar name={user?.username} size="sm" />
              <span className="dashboard-nav__username">{user?.username}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`dashboard-nav__chevron ${isMenuOpen ? 'dashboard-nav__chevron--open' : ''}`}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="dashboard-nav__dropdown" role="menu">
                <div className="dashboard-nav__dropdown-header">
                  <p className="dashboard-nav__dropdown-name">{user?.username}</p>
                  <p className="dashboard-nav__dropdown-email">{user?.email}</p>
                  <div className="dashboard-nav__dropdown-space">
                    <span className="dashboard-nav__dropdown-role">{user?.role || 'ADMIN'}</span>
                    <span className="dashboard-nav__dropdown-spacename">{space?.name || 'Personal Space'}</span>
                  </div>
                </div>

                <div className="dashboard-nav__dropdown-divider" role="separator" />

                <div className="dashboard-nav__dropdown-links">
                  <button
                    type="button"
                    role="menuitem"
                    className="dashboard-nav__dropdown-item"
                    onClick={() => handleNavigate('/profile')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>Profile & Account</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    className="dashboard-nav__dropdown-item"
                    onClick={() => handleNavigate('/someday')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                    </svg>
                    <span>Someday Collection</span>
                  </button>
                </div>

                <div className="dashboard-nav__dropdown-divider" role="separator" />

                <div className="dashboard-nav__dropdown-footer">
                  <button
                    type="button"
                    role="menuitem"
                    className="dashboard-nav__dropdown-item dashboard-nav__dropdown-item--logout"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    disabled={isLoggingOut}
                    aria-label="Sign out of your account"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

