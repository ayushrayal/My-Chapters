export function IconButton({
  children,
  type = 'button',
  variant = 'ghost',
  size = 'md',
  disabled = false,
  isLoading = false,
  ariaLabel,
  className = '',
  onClick,
  ...props
}) {
  const classes = [
    'icon-btn',
    `icon-btn--${variant}`,
    `icon-btn--${size}`,
    isLoading ? 'icon-btn--loading' : '',
    disabled ? 'icon-btn--disabled' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      onClick={onClick}
      {...props}
    >
      {isLoading ? <span className="icon-btn__spinner" aria-hidden="true" /> : children}
    </button>
  );
}

