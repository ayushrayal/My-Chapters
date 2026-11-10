import { useState, useEffect } from 'react';
import { Button } from '../../../components/common/Button.jsx';

export function StatusChangeModal({
  isOpen,
  item,
  onClose,
  onConfirm
}) {
  const [purchaseDate, setPurchaseDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Default to today's local date YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      setPurchaseDate(today);
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const resolvedDate = purchaseDate
        ? new Date(`${purchaseDate}T00:00:00.000Z`).toISOString()
        : null;

      await onConfirm(item.id, 'PURCHASED', resolvedDate);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
      onClick={onClose}
    >
      <div
        className="modal-container modal-container--sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="status-modal-title" className="modal-title">
            Mark as Purchased
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

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="status-modal__desc">
              Record <strong>"{item.name}"</strong> as purchased. You can specify when you acquired it.
            </p>

            {error && (
              <div className="alert alert--error" role="alert" style={{ marginBottom: '12px' }}>
                <p>{error}</p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="modal-purchase-date" className="form-label">
                <span>Purchase Date <span className="form-label__optional">(Optional)</span></span>
              </label>
              <input
                id="modal-purchase-date"
                type="date"
                className="form-input"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
              <span className="form-hint">
                Defaults to today. Clear the field if you prefer not to store a date.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Confirm Purchased
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
