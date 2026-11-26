import { WindowCard } from '../../../components/common/WindowCard.jsx';

/**
 * DayProgressCard: Neo-Brutalist WindowCard
 * Circular progress ring on left, progress stats stack on right.
 */
export function DayProgressCard({ schedule }) {
  const tasks = schedule?.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const skippedTasks = tasks.filter((t) => t.status === 'SKIPPED').length;
  const remainingTasks = Math.max(0, totalTasks - completedTasks - skippedTasks);

  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // SVG circular ring properties (72x72 viewBox, radius 28, stroke 7)
  const radius = 28;
  const stroke = 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <WindowCard
      title="Day Progress"
      headerBg="canvas"
      className="dayflow-progress-window"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '4px 0'
        }}
      >
        {/* Progress Ring with Lime on Subtle Border track */}
        <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            aria-hidden="true"
            style={{ display: 'block' }}
          >
            {/* Background track: Subtle Border (#DEE0ED) */}
            <circle
              stroke="#DEE0ED"
              strokeWidth={stroke}
              fill="transparent"
              r={radius}
              cx="36"
              cy="36"
            />
            {/* Progress fill: Lime (#E3FF3B) */}
            <circle
              stroke="#E3FF3B"
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx="36"
              cy="36"
              transform="rotate(-90 36 36)"
            />
          </svg>
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              fontWeight: 800,
              color: '#252943',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            {percentage}%
          </span>
        </div>

        {/* Content Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: '#252943',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            {totalTasks === 0
              ? 'No tasks scheduled'
              : `${completedTasks} of ${totalTasks} tasks done`}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
            <span
              className="neo-tag neo-tag--secondary"
              style={{ fontSize: '11px', fontWeight: 700 }}
            >
              {remainingTasks} remaining
            </span>
            {skippedTasks > 0 && (
              <span
                className="neo-tag"
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                {skippedTasks} skipped
              </span>
            )}
          </div>
        </div>
      </div>
    </WindowCard>
  );
}
