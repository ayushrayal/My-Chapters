import { useEffect } from 'react';

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = ''
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="bottom-sheet-overlay modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`bottom-sheet-container modal-container modal-container--bottom-sheet ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-sheet-drag-handle" aria-hidden="true" />
        {title && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close bottom sheet"
            >
              &times;
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

