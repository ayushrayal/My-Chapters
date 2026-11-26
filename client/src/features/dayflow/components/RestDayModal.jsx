import { useState, useEffect } from 'react';
import { CloseIcon, MoonIcon } from '../../../components/common/Icons.jsx';

/**
 * Custom accessible confirmation modal for marking a day as a Rest Day.
 * Replaces window.confirm with an on-brand modal dialog.
 */
export function RestDayModal({
  isOpen,
  date,
  schedule,
  onClose,
  onConfirmRestDay
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state whenever modal opens or date changes
  useEffect(() => {
    if (isOpen) {
      setAcknowledged(false);
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, date]);

  if (!isOpen) return null;

  const tasksCount = schedule?.tasks?.length || 0;
  const blocksCount = schedule?.blocks?.length || 0;

  const formattedDisplayDate = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  const handleConfirm = async () => {
    if (!acknowledged || isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    try {
      await onConfirmRestDay(date);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to mark day as Rest Day.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="dayflow-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rest-day-modal-title"
    >
      <div className="dayflow-modal-card">
        <div className="dayflow-modal-card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#EEF0F8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3A4EFB'
              }}
            >
              <MoonIcon size={18} />
            </div>
            <h2 id="rest-day-modal-title" className="dayflow-modal-card__title">
              Mark this day as Rest Day?
            </h2>
          </div>
          <button
            type="button"
            className="dayflow-modal-card__close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {formattedDisplayDate && (
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#3A4EFB',
              backgroundColor: 'rgba(58, 78, 251, 0.08)',
              padding: '4px 10px',
              borderRadius: '6px',
              alignSelf: 'flex-start'
            }}
          >
            {formattedDisplayDate}
          </div>
        )}

        <p className="dayflow-modal-card__subtitle">
          Marking this date as a Rest Day will clear all existing blocks and tasks for this date.
        </p>

        {error && (
          <div className="dayflow-banner dayflow-banner--error" role="alert">
            {error}
          </div>
        )}

        {(tasksCount > 0 || blocksCount > 0) && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FDE68A',
              color: '#92400E',
              fontSize: '13px',
              lineHeight: 1.45
            }}
          >
            <strong>Note:</strong> You currently have{' '}
            <strong>{tasksCount} {tasksCount === 1 ? 'task' : 'tasks'}</strong> across{' '}
            <strong>{blocksCount} {blocksCount === 1 ? 'block' : 'blocks'}</strong> scheduled for this day. They will be permanently cleared.
          </div>
        )}

        {/* Checkbox acknowledgment required to enable confirm */}
        <label
          htmlFor="acknowledge-rest-day-clear"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontSize: '13.5px',
            color: '#252943',
            fontWeight: 600,
            lineHeight: 1.4,
            padding: '8px 10px',
            borderRadius: '8px',
            backgroundColor: acknowledged ? 'rgba(58, 78, 251, 0.04)' : 'transparent',
            border: acknowledged ? '1px solid rgba(58, 78, 251, 0.2)' : '1px solid transparent',
            transition: 'all 0.15s ease'
          }}
        >
          <input
            type="checkbox"
            id="acknowledge-rest-day-clear"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            disabled={isSubmitting}
            style={{
              marginTop: '2px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              width: '16px',
              height: '16px',
              accentColor: '#3A4EFB'
            }}
          />
          <span>I understand that existing blocks and tasks will be cleared.</span>
        </label>

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
            onClick={handleConfirm}
            disabled={!acknowledged || isSubmitting}
          >
            <MoonIcon size={14} />{' '}
            {isSubmitting ? 'Marking Rest Day...' : 'Confirm Rest Day'}
          </button>
        </div>
      </div>
    </div>
  );
}
