import { useState, useEffect } from 'react';

export function StatCard({
  label,
  value,
  subtext,
  icon,
  isHero = false,
  progressPct = 0,
  unit = '',
  tooltip = '',
  className = ''
}) {
  // Support animated count-up when value is numeric and reduced-motion is not requested
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  const isNumeric = !Number.isNaN(numericValue);
  const [displayNum, setDisplayNum] = useState(isNumeric ? numericValue : value);

  useEffect(() => {
    if (!isNumeric) {
      setDisplayNum(value);
      return;
    }
    const mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    if (mediaQuery && mediaQuery.matches) {
      setDisplayNum(numericValue);
      return;
    }

    let start = 0;
    const duration = 600;
    const startTime = performance.now();

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (numericValue - start) * ease);
      setDisplayNum(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayNum(numericValue);
      }
    };

    requestAnimationFrame(step);
  }, [value, numericValue, isNumeric]);

  if (isHero) {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progressPct)) / 100) * circumference;

    return (
      <div className={`gymflow-stat-card gymflow-stat-card--hero ${className}`} title={tooltip || undefined}>
        <div className="gymflow-stat-card__hero-content">
          <div className="gymflow-stat-card__hero-info">
            <span className="gymflow-stat-card__hero-label">{label}</span>
            <div className="gymflow-stat-card__hero-val">
              {displayNum}
              {unit || '%'}
            </div>
          </div>

          <div className="gymflow-stat-card__ring-box">
            <svg className="gymflow-stat-card__ring" width="68" height="68" viewBox="0 0 68 68">
              <circle
                className="gymflow-stat-card__ring-track"
                cx="34"
                cy="34"
                r={radius}
                strokeWidth="6"
                fill="none"
              />
              <circle
                className="gymflow-stat-card__ring-fill"
                cx="34"
                cy="34"
                r={radius}
                strokeWidth="6"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {subtext && <p className="gymflow-stat-card__hero-subtext">{subtext}</p>}
      </div>
    );
  }

  return (
    <div className={`gymflow-stat-card ${className}`} title={tooltip || undefined}>
      {icon && (
        <div className="gymflow-stat-card__icon-circle" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="gymflow-stat-card__val">
        {typeof displayNum === 'number' ? displayNum.toLocaleString() : displayNum}
        {unit ? ` ${unit}` : ''}
      </div>
      <div className="gymflow-stat-card__label">{label}</div>
      {subtext && <div className="gymflow-stat-card__subtext">{subtext}</div>}
    </div>
  );
}
