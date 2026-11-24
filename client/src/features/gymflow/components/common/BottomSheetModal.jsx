import { useEffect, useRef } from 'react';
import { CloseIcon } from '../../../../components/common/Icons.jsx';

export function BottomSheetModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '640px',
  ariaLabel,
  className = ''
}) {
  const modalRef = useRef(null);

  // Handle ESC key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="gymflow-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`gymflow-modal-card ${className}`}
        style={{ maxWidth }}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="gymflow-modal-card__drag-handle" aria-hidden="true" />

        {/* Sticky Header */}
        <div className="gymflow-modal-card__header">
          <div className="gymflow-modal-card__titles">
            <h2 className="gymflow-modal-card__title">{title}</h2>
            {subtitle && <p className="gymflow-modal-card__subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="gymflow-modal-card__close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="gymflow-modal-card__body">{children}</div>

        {/* Sticky Footer */}
        {footer && <div className="gymflow-modal-card__footer">{footer}</div>}
      </div>
    </div>
  );
}
