import React from 'react';

/**
 * StatCard: Neo-Brutalist KPI / Metric Card
 */
export function StatCard({
  label,
  value,
  subvalue,
  badge,
  icon,
  accentColor = 'primary', // 'primary' | 'lime' | 'green' | 'navy'
  className = '',
  onClick,
  ...props
}) {
  return (
    <div
      className={`neo-stat-card neo-stat-card--${accentColor} ${onClick ? 'neo-stat-card--clickable' : ''} ${className}`}
      onClick={onClick}
      {...props}
    >
      <div className="neo-stat-card__top">
        <span className="neo-stat-card__label">{label}</span>
        {icon && <span className="neo-stat-card__icon">{icon}</span>}
      </div>
      <div className="neo-stat-card__value-wrap">
        <span className="neo-stat-card__value">{value}</span>
        {badge && <span className="neo-stat-card__badge">{badge}</span>}
      </div>
      {subvalue && <div className="neo-stat-card__subvalue">{subvalue}</div>}
    </div>
  );
}
