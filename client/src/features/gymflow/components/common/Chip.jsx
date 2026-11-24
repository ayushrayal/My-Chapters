export function Chip({
  variant = 'muted', // 'lime', 'gradient', 'outline', 'muted', 'danger'
  icon,
  children,
  className = '',
  onClick,
  onRemove,
  ...props
}) {
  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      className={`gymflow-chip gymflow-chip--${variant} ${onClick ? 'gymflow-chip--interactive' : ''} ${className}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      {...props}
    >
      {icon && <span className="gymflow-chip__icon" aria-hidden="true">{icon}</span>}
      <span className="gymflow-chip__label">{children}</span>
      {onRemove && (
        <button
          type="button"
          className="gymflow-chip__remove-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove filter"
        >
          &times;
        </button>
      )}
    </Component>
  );
}
