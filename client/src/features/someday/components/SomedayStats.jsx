export function SomedayStats({ stats }) {
  return (
    <div className="someday-stats" aria-label="Someday summary statistics">
      <div className="someday-stats__card">
        <span className="someday-stats__label">Total Items</span>
        <span className="someday-stats__value">{stats.total}</span>
      </div>

      <div className="someday-stats__card">
        <span className="someday-stats__label">Planned</span>
        <span className="someday-stats__value someday-stats__value--planned">
          {stats.planned}
        </span>
      </div>

      <div className="someday-stats__card">
        <span className="someday-stats__label">Purchased</span>
        <span className="someday-stats__value someday-stats__value--purchased">
          {stats.purchased}
        </span>
      </div>
    </div>
  );
}

