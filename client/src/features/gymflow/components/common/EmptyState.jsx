export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default', // 'default', 'hero', 'rest'
  className = ''
}) {
  return (
    <div className={`gymflow-empty-state gymflow-empty-state--${variant} ${className}`}>
      {icon && (
        <div className="gymflow-empty-state__icon-box" aria-hidden="true">
          {icon}
        </div>
      )}
      {title && <h3 className="gymflow-empty-state__title">{title}</h3>}
      {description && <p className="gymflow-empty-state__desc">{description}</p>}

      {(actionLabel || secondaryActionLabel) && (
        <div className="gymflow-empty-state__actions">
          {actionLabel && (
            <button
              type="button"
              className="btn btn--primary gymflow-empty-state__btn"
              onClick={onAction}
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && (
            <button
              type="button"
              className="btn btn--secondary gymflow-empty-state__btn"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
