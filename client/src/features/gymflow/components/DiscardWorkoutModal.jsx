import { useState } from 'react';
import { BottomSheetModal } from './common/BottomSheetModal.jsx';
import { TrashIcon, AlertCircleIcon } from '../../../components/common/Icons.jsx';

export function DiscardWorkoutModal({
  isOpen,
  date,
  onClose,
  onConfirm
}) {
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDiscard = async () => {
    setIsDiscarding(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to discard workout session';
      setError(msg);
    } finally {
      setIsDiscarding(false);
    }
  };

  const formattedDate = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'this workout';

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={isDiscarding ? () => {} : onClose}
      title="Discard Workout"
      subtitle={`Permanently remove unfinished workout session for ${formattedDate}`}
      footer={
        <>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isDiscarding}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={handleDiscard}
            disabled={isDiscarding}
          >
            {isDiscarding ? 'Discarding...' : 'Discard Workout'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div className="dayflow-banner dayflow-banner--error" role="alert">
            <AlertCircleIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <div
          style={{
            backgroundColor: '#FFF5F5',
            border: '1px solid #FFE3E3',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D32F2F', fontWeight: 800 }}>
            <TrashIcon size={18} />
            <span>Are you sure you want to discard this workout?</span>
          </div>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#252943', lineHeight: 1.5 }}>
            This unfinished workout session, including all logged sets, exercise progress, and treadmill records for{' '}
            <strong>{formattedDate}</strong>, will be permanently removed.
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(37,41,67,0.7)', lineHeight: 1.4 }}>
            Once discarded, the date will become free so you can start a fresh routine or pick a different template.
          </p>
        </div>
      </div>
    </BottomSheetModal>
  );
}
