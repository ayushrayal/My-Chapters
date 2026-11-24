import { useState, useEffect } from 'react';
import { CloseIcon } from '../../../components/common/Icons.jsx';

export function SkipTaskModal({
  isOpen,
  task,
  onClose,
  onConfirmSkip
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setReason('');
    setError('');
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory reason is required to skip a scheduled task.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmSkip(task._id || task.id, reason.trim());
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to skip task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dayflow-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="skip-task-title">
      <div className="dayflow-modal-card">
        <div className="dayflow-modal-card__header">
          <h2 id="skip-task-title" className="dayflow-modal-card__title">
            Skip Task
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
          To maintain accountability and accurate performance metrics, every skipped task requires a recorded reason.
        </p>

        <div className="skip-task-preview">
          <span className="skip-task-preview__label">Task:</span>
          <span className="skip-task-preview__title">{task.title}</span>
        </div>

        {error && (
          <div className="dayflow-banner dayflow-banner--error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="dayflow-modal-form">
          <div className="dayflow-form-group">
            <label className="dayflow-form-label" htmlFor="skip-reason">
              Reason for Skipping *
            </label>
            <textarea
              id="skip-reason"
              className="dayflow-textarea"
              rows={3}
              placeholder="e.g. Urgent client meeting ran over time; rescheduled deliverable to tomorrow morning."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              autoFocus
            />
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
              className="btn btn--danger"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Skipping...' : 'Confirm Skip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
