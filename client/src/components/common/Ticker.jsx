import React from 'react';

/**
 * Ticker: Neo-Brutalist marquee strip
 * High-contrast Lime background with thick Deep Navy top/bottom borders.
 */
export function Ticker({
  items = [],
  speed = 25,
  direction = 'left',
  className = ''
}) {
  const content = items.length > 0 ? items : [
    'DAILY PROGRESS',
    'DISCIPLINE OVER MOTIVATION',
    'TRACK EVERY REP',
    'EXECUTE THE PLAN',
    'BUILD THE FUTURE'
  ];

  const duplicated = [...content, ...content, ...content, ...content];

  return (
    <div className={`neo-ticker ${className}`} role="marquee" aria-label="Ticker">
      <div
        className="neo-ticker__inner"
        style={{
          animationDuration: `${speed}s`,
          animationDirection: direction === 'right' ? 'reverse' : 'normal'
        }}
      >
        {duplicated.map((item, idx) => (
          <span key={idx} className="neo-ticker__item">
            <span className="neo-ticker__bullet" aria-hidden="true">■</span>
            <span>{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
