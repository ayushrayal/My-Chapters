export { ToastProvider, useToast } from '../../context/ToastContext.jsx';

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
      className={`toast-notification toast-notification--${type} ${className}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      {...props}
    >
      <div className="toast-notification__content">
        {title && <h5 className="toast-notification__title">{title}</h5>}
        {message && <p className="toast-notification__message">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          className="toast-notification__close-btn"
          onClick={onClose}
          aria-label="Dismiss notification"
        >
          &times;
        </button>
      )}
    </div>
  );
}
