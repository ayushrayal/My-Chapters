export function StatusBadge({
  status,
  size = 'md',
  className = '',
  ...props
}) {
  const normalized = (status || '').toUpperCase();
  const isPurchased = normalized === 'PURCHASED';
  const label = isPurchased ? 'Purchased' : 'Planned';

  return (
    <span
      className={`status-badge status-badge--${size} status-badge--${isPurchased ? 'purchased' : 'planned'} ${className}`}
      {...props}
    >
      <span className="status-badge__dot" aria-hidden="true" />
      <span className="status-badge__label">{label}</span>
    </span>
  );
}

