import { useState } from 'react';
import { BottomSheetModal } from './common/BottomSheetModal.jsx';

export function FinishWorkoutModal({ isOpen, session, onClose, onConfirm }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !session) return null;

  // Compute summary values
  let completedSets = 0;
  let incompleteSets = 0;
  let skippedSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  let exercisesCount = 0;
  const bodyParts = session.bodyParts || [];

  for (const bp of bodyParts) {
    for (const ex of bp.exercises || []) {
      exercisesCount += 1;
      for (const s of ex.sets || []) {
        if (s.status === 'COMPLETED') {
          completedSets += 1;
          const v = (Number(s.weightKg) || 0) * (Number(s.reps) || 0);
          totalVolume += v;
          totalReps += Number(s.reps) || 0;
        } else if (s.status === 'SKIPPED') {
          skippedSets += 1;
        } else {
          incompleteSets += 1;
        }
      }
    }
  }

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(true);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="Finish & Log Workout"
      subtitle="Review your session summary before locking your workout record"
      footer={
        <>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Keep Editing
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleFinish}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Finish & Lock Workout'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ fontSize: '13.5px', color: 'rgba(37,41,67,0.7)', margin: 0, lineHeight: 1.45 }}>
          Your performance metrics, total volume, and set achievements will be calculated and attributed to your weekly progress. (You can still reopen historical sessions whenever needed).
        </p>

        {/* 2x2 summary grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            backgroundColor: '#F8FAFD',
            border: '1px solid #E6E9F2',
            borderRadius: '14px',
            padding: '14px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(37,41,67,0.6)', textTransform: 'uppercase' }}>
              Completed Sets
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#252943' }}>
              {completedSets}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(37,41,67,0.6)', textTransform: 'uppercase' }}>
              Total Volume Lifted
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#252943' }}>
              {totalVolume.toLocaleString()} kg
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(37,41,67,0.6)', textTransform: 'uppercase' }}>
              Total Repetitions
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#252943' }}>
              {totalReps}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(37,41,67,0.6)', textTransform: 'uppercase' }}>
              Exercises Covered
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#252943' }}>
              {exercisesCount}
            </span>
          </div>
        </div>

        {/* Treadmill Summary Tile */}
        {session.treadmill && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #DEE0ED',
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px'
            }}
          >
            <span style={{ fontWeight: 700, color: '#252943' }}>Cardio & Treadmill</span>
            <span style={{ fontWeight: 800, color: '#3A4EFB' }}>
              {session.treadmill.status === 'SKIPPED'
                ? 'Skipped'
                : `${session.treadmill.actualMinutes || 0} mins · ${session.treadmill.caloriesBurned || 0} kcal`}
            </span>
          </div>
        )}
      </div>
    </BottomSheetModal>
  );
}
