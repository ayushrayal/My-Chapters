export function Toast({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
  ...props
}) {
  return (
    <div
      className={`toast toast--${type} ${className}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      {...props}
    >
      <div className="toast__content">
        {title && <span className="toast__title">{title}</span>}
        {message && <p className="toast__message">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          className="toast__close-btn"
          onClick={onClose}
          aria-label="Dismiss notification"
        >
          &times;
        </button>
      )}
    </div>
  );
}

