import { useState, useRef, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, MoreHorizontalIcon } from '../../../../components/common/Icons.jsx';

export function DateNavigator({
  displayDate,
  isToday,
  onPreviousDay,
  onNextDay,
  onJumpToday,
  actions,
  secondaryActions
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <div className="gymflow-date-navigator">
      <div className="gymflow-date-navigator__left">
        {/* Date Row: Left Chevron | Date on single line | Right Chevron */}
        <div className="gymflow-date-navigator__row">
          <button
            type="button"
            className="gymflow-date-nav-btn"
            onClick={onPreviousDay}
            aria-label="Previous Day"
            title="Previous Day"
          >
            <ChevronLeftIcon size={18} />
          </button>

          <div className="gymflow-date-navigator__center">
            <h2 className="gymflow-date-navigator__text">{displayDate}</h2>
            {isToday ? (
              <span className="gymflow-today-chip">Today</span>
            ) : (
              <button
                type="button"
                className="gymflow-jump-today-btn"
                onClick={onJumpToday}
                aria-label="Jump to today"
              >
                <CalendarIcon size={13} />
                <span>Jump to today</span>
              </button>
            )}
          </div>

          <button
            type="button"
            className="gymflow-date-nav-btn"
            onClick={onNextDay}
            aria-label="Next Day"
            title="Next Day"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>
      </div>

      {/* Actions (Desktop right-aligned, Mobile integrated) */}
      {(actions || secondaryActions) && (
        <div className="gymflow-date-navigator__actions">
          {actions}

          {secondaryActions && (
            <div className="gymflow-date-navigator__menu-wrapper" ref={menuRef}>
              <button
                type="button"
                className="gymflow-date-nav-btn gymflow-date-nav-btn--more"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="More actions"
                aria-expanded={isMenuOpen}
              >
                <MoreHorizontalIcon size={18} />
              </button>

              {isMenuOpen && (
                <div className="gymflow-dropdown-menu" role="menu">
                  {secondaryActions.map((action, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="gymflow-dropdown-item"
                      onClick={() => {
                        setIsMenuOpen(false);
                        action.onClick?.();
                      }}
                      role="menuitem"
                    >
                      {action.icon && <span className="gymflow-dropdown-item__icon">{action.icon}</span>}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
