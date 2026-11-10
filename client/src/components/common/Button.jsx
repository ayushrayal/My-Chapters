export function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isFullWidth = false,
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    isFullWidth ? 'btn--full' : '',
    isLoading ? 'btn--loading' : '',
    disabled ? 'btn--disabled' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="btn__spinner" aria-hidden="true" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

