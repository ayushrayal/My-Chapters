import { CheckIcon, SkipForwardIcon } from '../../../../components/common/Icons.jsx';

export function StatusSelect({ status, onChange, disabled = false }) {
  // Cycle states: INCOMPLETE -> COMPLETED -> SKIPPED -> INCOMPLETE
  const handleToggle = () => {
    if (disabled) return;
    if (status === 'INCOMPLETE') {
      onChange('COMPLETED');
    } else if (status === 'COMPLETED') {
      onChange('SKIPPED');
    } else {
      onChange('INCOMPLETE');
    }
  };

  const isCompleted = status === 'COMPLETED';
  const isSkipped = status === 'SKIPPED';

  return (
    <button
      type="button"
      className={`gymflow-set-status-toggle ${
        isCompleted
          ? 'gymflow-set-status-toggle--completed'
          : isSkipped
          ? 'gymflow-set-status-toggle--skipped'
          : 'gymflow-set-status-toggle--incomplete'
      }`}
      onClick={handleToggle}
      disabled={disabled}
      aria-label={`Set status: ${status}. Tap to cycle status.`}
      title={`Current: ${status}. Tap to cycle (Complete / Skipped / Incomplete)`}
    >
      {isCompleted ? (
        <CheckIcon size={18} className="gymflow-set-status-toggle__check" />
      ) : isSkipped ? (
        <SkipForwardIcon size={16} className="gymflow-set-status-toggle__skip" />
      ) : (
        <span className="gymflow-set-status-toggle__dot" />
      )}
    </button>
  );
}
