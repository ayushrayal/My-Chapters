import { useState } from 'react';
import { CloseIcon } from '../../../components/common/Icons.jsx';

export function MoveScheduleModal({
  isOpen,
  currentDate,
  onClose,
  onConfirmMove
}) {
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!targetDate) {
      setError('Please select a target date.');
      return;
    }

    if (targetDate === currentDate) {
      setError('Target date must be different from the current date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmMove(targetDate);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to move schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dayflow-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="move-schedule-title">
      <div className="dayflow-modal-card">
        <div className="dayflow-modal-card__header">
          <h2 id="move-schedule-title" className="dayflow-modal-card__title">
            Move Schedule to Another Date
          </h2>
          <button
            type="button"
            className="dayflow-modal-card__close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <p className="dayflow-modal-card__subtitle">
          Shift all unfinished tasks and time blocks from {currentDate} to a future date.
        </p>

        {error && (
          <div className="dayflow-banner dayflow-banner--error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="dayflow-modal-form">
          <div className="dayflow-form-group">
            <label className="dayflow-form-label" htmlFor="move-target-date">
              New Target Date *
            </label>
            <input
              id="move-target-date"
              type="date"
              className="dayflow-input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </div>

          <div className="dayflow-modal-card__warning-note">
            ⚠️ Warning: If the target date already has an active schedule, it will be replaced by this moved schedule.
          </div>

          <div className="dayflow-modal-card__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Moving...' : 'Move Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
