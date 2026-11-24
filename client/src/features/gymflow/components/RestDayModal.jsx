import { useState, useEffect } from 'react';
import { BottomSheetModal } from './common/BottomSheetModal.jsx';
import { AlertCircleIcon, MoonIcon } from '../../../components/common/Icons.jsx';

export function RestDayModal({ isOpen, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for taking a rest day.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark rest day');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark Rest Day"
      subtitle="Designate today as a planned or recovery rest day"
      footer={
        <>
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
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Confirm Rest Day'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ fontSize: '13.5px', color: 'rgba(37,41,67,0.7)', margin: 0, lineHeight: 1.45 }}>
          Taking an unexpected or recovery rest day? Enter a brief reason below. This date will be protected from completion score dilution.
        </p>

        {error && (
          <div className="dayflow-banner dayflow-banner--error" role="alert">
            <AlertCircleIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="gym-rest-reason" style={{ fontSize: '13px', fontWeight: 700 }}>
            Rest Day Reason *
          </label>
          <input
            id="gym-rest-reason"
            type="text"
            className="dayflow-input"
            style={{ height: '48px', fontSize: '16px' }}
            placeholder="e.g. Muscle soreness, Active recovery, Travel..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
            required
          />
        </div>
      </form>
    </BottomSheetModal>
  );
}
