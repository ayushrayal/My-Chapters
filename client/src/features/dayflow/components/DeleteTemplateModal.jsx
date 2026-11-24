import { useState, useEffect, useRef } from 'react';
import { CloseIcon, AlertCircleIcon, TrashIcon } from '../../../components/common/Icons.jsx';

export function DeleteTemplateModal({
  isOpen,
  template,
  onClose,
  onConfirmDelete
}) {
  const [typedName, setTypedName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const templateName = template?.name || '';
  const templateId = template?._id || template?.id;

  useEffect(() => {
    if (isOpen) {
      setTypedName('');
      setError('');
      setIsDeleting(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, template]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !template) return null;

  // Exact string matching: no partial match, no empty match, no silent trimming
  const isMatch = typedName.length > 0 && typedName === templateName;

  const handleDelete = async (e) => {
    e?.preventDefault();
    if (!isMatch || isDeleting) return;

    // Validate again before invoking delete handler
    if (typedName !== templateName) {
      setError('Entered name does not match the template name.');
      return;
    }

    setIsDeleting(true);
    setError('');
    try {
      await onConfirmDelete(templateId, templateName);
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete template. Please try again.';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return (
    <div
      className="dayflow-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-template-title"
      onClick={handleOverlayClick}
    >
      <div className="dayflow-modal-card delete-template-modal">
        {/* Header */}
        <div className="dayflow-modal-card__header">
          <div className="delete-template-modal__header-title">
            <div className="delete-template-modal__icon-wrap" aria-hidden="true">
              <TrashIcon size={18} />
            </div>
            <h2 id="delete-template-title" className="dayflow-modal-card__title">
              Delete Template
            </h2>
          </div>
          <button
            type="button"
            className="dayflow-modal-card__close-btn"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close delete modal"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="dayflow-banner dayflow-banner--error" role="alert">
            <AlertCircleIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleDelete} className="dayflow-modal-form delete-template-modal__body">
          <div className="delete-template-modal__warning">
            <p className="delete-template-modal__warning-title">
              This action is permanent and cannot be undone.
            </p>
            <p className="delete-template-modal__warning-text">
              Deleting this template will not alter your past schedule history or finished days, but the template will no longer be available for future days.
            </p>
          </div>

          <div className="dayflow-form-group">
            <label className="dayflow-form-label" htmlFor="type-to-confirm-input">
              To confirm, type <strong className="delete-template-modal__target-name">{templateName}</strong> in the box below:
            </label>
            <input
              ref={inputRef}
              id="type-to-confirm-input"
              type="text"
              className="dayflow-input"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={`Type "${templateName}" to confirm`}
              disabled={isDeleting}
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          <div className="dayflow-modal-card__actions delete-template-modal__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--danger"
              disabled={!isMatch || isDeleting}
              aria-disabled={!isMatch || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
