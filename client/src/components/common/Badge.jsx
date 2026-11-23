export function Badge({
  children,
  variant = 'default', // 'default' | 'subtle' | 'lime' | 'primary' | 'success' | 'error'
  size = 'md',        // 'sm' | 'md'
  dot = false,
  className = '',
  ...props
}) {
  return (
    <span
      className={`badge badge--${variant} badge--${size} ${className}`}
      {...props}
    >
      {dot && <span className="badge__dot" aria-hidden="true" />}
      <span className="badge__label">{children}</span>
    </span>
  );
}

export { Badge as Chip };
