import { useEffect } from 'react';
import { CloseIcon } from './Icons.jsx';

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
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
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
            <div className="window-dots" aria-hidden="true">
              <span className="window-dots__dot" />
              <span className="window-dots__dot" />
              <span className="window-dots__dot" />
            </div>
            <h2 className="modal-title">{title}</h2>
            <button
              type="button"
              className="icon-btn icon-btn--sm modal-close-btn"
              onClick={onClose}
              aria-label="Close bottom sheet"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

