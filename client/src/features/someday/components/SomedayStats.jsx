export function SomedayStats({ stats }) {
  return (
    <div className="someday-stats" aria-label="Someday summary statistics">
      {/* 1. Total Items Card */}
      <div className="someday-stats__card someday-stats__card--total">
        <div className="someday-stats__card-top">
          <span className="someday-stats__label">Total Items</span>
          <div className="someday-stats__icon-box someday-stats__icon-box--total" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
        </div>
        <span className="someday-stats__value">{stats.total}</span>
        <div className="someday-stats__bar someday-stats__bar--total" aria-hidden="true" />
      </div>

      {/* 2. Planned Card (Secondary Blue Accent) */}
      <div className="someday-stats__card someday-stats__card--planned">
        <div className="someday-stats__card-top">
          <span className="someday-stats__label">Planned</span>
          <div className="someday-stats__icon-box someday-stats__icon-box--planned" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
          </div>
        </div>
        <span className="someday-stats__value someday-stats__value--planned">
          {stats.planned}
        </span>
        <div className="someday-stats__bar someday-stats__bar--planned" aria-hidden="true" />
      </div>

      {/* 3. Purchased Card (Lime Accent with Ink Text) */}
      <div className="someday-stats__card someday-stats__card--purchased">
        <div className="someday-stats__card-top">
          <span className="someday-stats__label">Purchased</span>
          <div className="someday-stats__icon-box someday-stats__icon-box--purchased" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
        <span className="someday-stats__value someday-stats__value--purchased">
          {stats.purchased}
        </span>
        <div className="someday-stats__bar someday-stats__bar--purchased" aria-hidden="true" />
      </div>
    </div>
  );
}

