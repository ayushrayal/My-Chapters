import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../common/Avatar.jsx';

export function ProfileDropdown({
  user,
  space,
  isLoggingOut,
  onLogout,
  className = '',
  align = 'right'
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

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  return (
    <div className={`profile-dropdown-wrapper ${className}`} ref={menuRef}>
      <button
        type="button"
        className="profile-dropdown-trigger"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label="User account menu"
      >
        <Avatar name={user?.username} size="sm" />
        {user?.username && (
          <span className="profile-dropdown-trigger__username">{user.username}</span>
        )}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`profile-dropdown-trigger__chevron ${isMenuOpen ? 'profile-dropdown-trigger__chevron--open' : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown Menu Box */}
      {isMenuOpen && (
        <div
          className={`profile-dropdown-menu profile-dropdown-menu--${align}`}
          role="menu"
          aria-label="Profile and application menu"
        >
          {/* HEADER */}
          <div className="profile-dropdown-menu__header">
            <div className="profile-dropdown-menu__avatar-row">
              <Avatar name={user?.username} size="md" />
              <div className="profile-dropdown-menu__user-info">
                <p className="profile-dropdown-menu__username">{user?.username || 'User'}</p>
                <p className="profile-dropdown-menu__email">{user?.email || ''}</p>
              </div>
            </div>

            <div className="profile-dropdown-menu__badges">
              {isAdmin && (
                <span className="profile-dropdown-menu__role-badge">ADMIN</span>
              )}
              <span className="profile-dropdown-menu__space-badge" title="Active Space">
                {space?.name || 'Personal Space'}
              </span>
            </div>
          </div>

          <div className="profile-dropdown-menu__divider" role="separator" />

          {/* MENU ITEMS (44px target) */}
          <div className="profile-dropdown-menu__links">
            <button
              type="button"
              role="menuitem"
              className="profile-dropdown-menu__item"
              onClick={() => handleNavigate('/profile')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Profile & Account</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="profile-dropdown-menu__item"
              onClick={() => handleNavigate('/dayflow')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <span>Dayflow</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="profile-dropdown-menu__item"
              onClick={() => handleNavigate('/gymflow')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6.5 6.5 11 11" />
                <path d="m21 21-1-1a2 2 0 0 0-2.83 0l-.88.88a2 2 0 0 1-2.83 0l-4.24-4.24a2 2 0 0 1 0-2.83l.88-.88a2 2 0 0 0 0-2.83l-1-1" />
                <path d="m3 3 1 1a2 2 0 0 0 2.83 0l.88-.88a2 2 0 0 1 2.83 0l4.24 4.24a2 2 0 0 1 0 2.83l-.88.88a2 2 0 0 0 0 2.83l1 1" />
              </svg>
              <span>GymFlow</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="profile-dropdown-menu__item"
              onClick={() => handleNavigate('/someday')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
              <span>Someday</span>
            </button>
          </div>

          <div className="profile-dropdown-menu__divider" role="separator" />

          {/* FOOTER */}
          <div className="profile-dropdown-menu__footer">
            <button
              type="button"
              role="menuitem"
              className="profile-dropdown-menu__item profile-dropdown-menu__item--logout"
              onClick={() => {
                setIsMenuOpen(false);
                onLogout();
              }}
              disabled={isLoggingOut}
              aria-label="Sign out of your account"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  );
}
