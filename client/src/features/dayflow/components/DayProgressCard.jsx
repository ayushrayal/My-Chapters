/**
 * DayProgressCard
 * Hero card in primary gradient (#3A4EFB to #33A4FA)
 * Layout: SVG circular progress ring on the left with percentage centered inside,
 * Text on the right ("Day Progress", "X of Y tasks done", "X remaining · Y skipped").
 */
export function DayProgressCard({ schedule }) {
  const tasks = schedule?.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const skippedTasks = tasks.filter((t) => t.status === 'SKIPPED').length;
  const remainingTasks = Math.max(0, totalTasks - completedTasks - skippedTasks);

  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // SVG circular ring properties (72x72 viewBox, radius 28, stroke 6)
  const radius = 28;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="day-progress-card">
      <div className="day-progress-card__ring-wrap">
        <svg
          className="day-progress-card__ring-svg"
          width="72"
          height="72"
          viewBox="0 0 72 72"
          aria-hidden="true"
        >
          {/* Background track: white at 25% opacity */}
          <circle
            className="day-progress-card__ring-bg"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth={stroke}
            fill="transparent"
            r={radius}
            cx="36"
            cy="36"
          />
          {/* Progress fill: accent lime (#E3FF3B) */}
          <circle
            className="day-progress-card__ring-fill"
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
        <span className="day-progress-card__ring-percent">{percentage}%</span>
      </div>

      <div className="day-progress-card__content">
        <h4 className="day-progress-card__headline">Day Progress</h4>
        <p className="day-progress-card__ratio">
          {totalTasks === 0
            ? 'No tasks scheduled'
            : `${completedTasks} of ${totalTasks} tasks done`}
        </p>
        <div className="day-progress-card__stats">
          <span>{remainingTasks} remaining</span>
          <span className="day-progress-card__stat-sep">·</span>
          <span>{skippedTasks} skipped</span>
        </div>
      </div>
    </div>
  );
}
