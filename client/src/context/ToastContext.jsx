import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastContext = createContext({
  showToast: () => {},
  dismissToast: () => {},
  toast: {
    success: () => {},
    error: () => {},
    info: () => {}
  }
});

let toastCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((arg1, arg2, arg3) => {
    // Support both showToast('message', 'type', duration) and showToast({ type, title, message, duration })
    let type = 'info';
    let title = '';
    let message = '';
    let duration = 4000;

    if (typeof arg1 === 'string') {
      message = arg1;
      if (typeof arg2 === 'string') {
        type = arg2;
      }
      if (typeof arg3 === 'number') {
        duration = arg3;
      }
      title = type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notice';
    } else if (arg1 && typeof arg1 === 'object') {
      type = arg1.type || 'info';
      title = arg1.title || (type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notice');
      message = arg1.message || '';
      duration = arg1.duration ?? 4000;
    }

    // Do NOT display empty / blank toasts
    if (!message || (typeof message === 'string' && !message.trim())) {
      return null;
    }

    const id = `toast-${++toastCounter}-${Date.now()}`;
    const newToast = { id, type, title, message, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, [dismissToast]);

  const toast = useMemo(() => ({
    success: (message, title = 'Success') => showToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => showToast({ type: 'error', title, message, duration: 6000 }),
    info: (message, title = 'Notice') => showToast({ type: 'info', title, message })
  }), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  return context || {
    showToast: () => {},
    dismissToast: () => {},
    toast: {
      success: () => {},
      error: () => {},
      info: () => {}
    }
  };
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { id, type, title, message } = toast;

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'error':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`toast-notification toast-notification--${type}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <div className="toast-notification__icon-wrap">
        {renderIcon()}
      </div>

      <div className="toast-notification__content">
        {title && <h5 className="toast-notification__title">{title}</h5>}
        {message && <p className="toast-notification__message">{message}</p>}
      </div>

      <button
        type="button"
        className="toast-notification__close-btn"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
