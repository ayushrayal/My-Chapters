import { useState } from 'react';
import { Button } from '../../../components/common/Button.jsx';

export function DeleteConfirmModal({
  isOpen,
  title = 'Delete Item?',
  message = 'Are you sure you want to permanently delete this item?',
  itemName,
  onClose,
  onConfirm
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      onClick={onClose}
    >
      <div
        className="modal-container modal-container--sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="delete-confirm-title" className="modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p className="delete-modal__message">{message}</p>
          {itemName && (
            <div className="delete-modal__item-preview">
              <span>"{itemName}"</span>
            </div>
          )}
          {error && (
            <div className="alert alert--error" role="alert" style={{ marginTop: '12px' }}>
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleConfirm}
            isLoading={isDeleting}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
