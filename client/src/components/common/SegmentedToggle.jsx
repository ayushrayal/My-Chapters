export function SegmentedToggle({
  options = [],
  value,
  onChange,
  size = 'md',
  className = '',
  ariaLabel = 'Segmented options',
  ...props
}) {
  return (
    <div
      className={`segmented-toggle segmented-toggle--${size} ${className}`}
      role="radiogroup"
      aria-label={ariaLabel}
      {...props}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={opt.disabled}
            className={`segmented-toggle__item ${isSelected ? 'segmented-toggle__item--active' : ''}`}
            onClick={() => onChange?.(opt.value)}
          >
            {opt.icon && <span className="segmented-toggle__icon">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span className="segmented-toggle__badge">{opt.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
