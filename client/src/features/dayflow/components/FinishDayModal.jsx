import { useState } from 'react';
import { CloseIcon, LockIcon } from '../../../components/common/Icons.jsx';

export function FinishDayModal({
  isOpen,
  schedule,
  onClose,
  onConfirmFinish
}) {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !schedule) return null;

  const tasks = schedule.tasks || [];
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const skippedCount = tasks.filter((t) => t.status === 'SKIPPED').length;
  const unresolvedTasks = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'SKIPPED'
  );

  const canFinish = tasks.length > 0 && unresolvedTasks.length === 0;

  const handleFinish = async () => {
    if (!canFinish) return;
    setIsSubmitting(true);
    try {
      await onConfirmFinish();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to finish day.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dayflow-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="finish-day-title">
      <div className="dayflow-modal-card">
        <div className="dayflow-modal-card__header">
          <h2 id="finish-day-title" className="dayflow-modal-card__title">
            Finish & Lock Day
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
          Finishing a day permanently locks the schedule. No tasks or blocks can be added, modified, or deleted afterwards.
        </p>

        {error && (
          <div className="dayflow-banner dayflow-banner--error" role="alert">
            {error}
          </div>
        )}

        <div className="finish-day-summary">
          <div className="finish-day-summary__stat">
            <span className="finish-day-summary__number finish-day-summary__number--completed">
              {completedCount}
            </span>
            <span className="finish-day-summary__label">Completed</span>
          </div>
          <div className="finish-day-summary__stat">
            <span className="finish-day-summary__number finish-day-summary__number--skipped">
              {skippedCount}
            </span>
            <span className="finish-day-summary__label">Skipped</span>
          </div>
          <div className="finish-day-summary__stat">
            <span className="finish-day-summary__number finish-day-summary__number--unresolved">
              {unresolvedTasks.length}
            </span>
            <span className="finish-day-summary__label">Unresolved</span>
          </div>
        </div>

        {unresolvedTasks.length > 0 && (
          <div className="dayflow-banner dayflow-banner--warning">
            <strong>Action required:</strong> You have {unresolvedTasks.length} unfinished task(s). All tasks must either be marked <strong>Completed</strong> or <strong>Skipped</strong> with a reason before the day can be finished.
            <ul className="finish-day-unresolved-list">
              {unresolvedTasks.map((t) => (
                <li key={t._id || t.id}>• {t.title} ({t.status})</li>
              ))}
            </ul>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="dayflow-banner dayflow-banner--warning">
            Cannot finish an empty schedule with no tasks.
          </div>
        )}

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
            type="button"
            className="btn btn--primary"
            onClick={handleFinish}
            disabled={!canFinish || isSubmitting}
          >
            <LockIcon size={14} /> {isSubmitting ? 'Locking Day...' : 'Confirm & Lock Day'}
          </button>
        </div>
      </div>
    </div>
  );
}
