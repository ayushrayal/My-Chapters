import React from 'react';

/**
 * WindowCard: Neo-Brutalist card with retro window header bar
 * Left: 3 small square dots (Deep Navy)
 * Center/Left: Uppercase bold title
 * Right: Optional action / badge
 */
export function WindowCard({
  title,
  action,
  children,
  className = '',
  headerBg = 'canvas', // 'canvas' | 'lime' | 'blue' | 'white'
  isHero = false,
  ...props
}) {
  return (
    <div
      className={`neo-window-card ${isHero ? 'neo-window-card--hero' : ''} ${className}`}
      {...props}
    >
      <div className={`neo-window-card__header neo-window-card__header--${headerBg}`}>
        <div className="neo-window-card__dots" aria-hidden="true">
          <span className="neo-window-card__dot" />
          <span className="neo-window-card__dot" />
          <span className="neo-window-card__dot" />
        </div>
        {title && <span className="neo-window-card__title">{title}</span>}
        {action && <div className="neo-window-card__action">{action}</div>}
      </div>
      <div className="neo-window-card__body">{children}</div>
    </div>
  );
}

/**
 * FolderCard: Neo-Brutalist card with folder tab on top
 */
export function FolderCard({
  tabLabel,
  tabColor = 'lime', // 'lime' | 'blue' | 'navy' | 'white'
  children,
  className = '',
  ...props
}) {
  return (
    <div className={`neo-folder-card ${className}`} {...props}>
      {tabLabel && (
        <div className={`neo-folder-card__tab neo-folder-card__tab--${tabColor}`}>
          {tabLabel}
        </div>
      )}
      <div className="neo-folder-card__body">{children}</div>
    </div>
  );
}
