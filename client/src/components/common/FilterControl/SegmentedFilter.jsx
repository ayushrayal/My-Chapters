import React, { useId } from 'react';

/**
 * SegmentedFilter - Segmented control for 2 to 4 options with animated sliding gradient pill
 * @param {Array<{ id: string|number, label: string, icon?: React.ReactNode, badge?: number|string }>} options
 * @param {string|number} value - selected id
 * @param {(id: string|number) => void} onChange - change callback
 * @param {string} ariaLabel - accessible label
 */
export function SegmentedFilter({
  options = [],
  value,
  onChange,
  ariaLabel = 'Segmented options',
  className = ''
}) {
  const activeIndex = options.findIndex((opt) => (opt.id ?? opt.value) === value);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const count = options.length || 1;

  return (
    <div
      className={`segmented-filter ${className}`}
      role="group"
      aria-label={ariaLabel}
      style={{
        '--segment-count': count,
        '--active-index': safeIndex
      }}
    >
      <div className="segmented-filter__pill-indicator" aria-hidden="true" />
      {options.map((opt, idx) => {
        const optId = opt.id ?? opt.value;
        const isActive = idx === safeIndex;
        return (
          <button
            key={optId}
            type="button"
            className={`segmented-filter__btn ${isActive ? 'segmented-filter__btn--active' : ''}`}
            onClick={() => onChange?.(optId)}
            role="radio"
            aria-checked={isActive}
          >
            {opt.icon && <span className="segmented-filter__icon">{opt.icon}</span>}
            <span className="segmented-filter__label">{opt.label}</span>
            {opt.badge !== undefined && (
              <span className={`segmented-filter__badge ${isActive ? 'segmented-filter__badge--active' : ''}`}>
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
