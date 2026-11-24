import React, { useRef } from 'react';
import { CheckIcon } from '../Icons.jsx';

/**
 * FilterChips - Single-line horizontally scrollable pill chips with edge fade & snap
 * @param {Array<{ id: string|number, label: string, count?: number, icon?: React.ReactNode }>} options
 * @param {string|number|Array<string|number>} value - current selected value(s)
 * @param {(val: any) => void} onChange - change callback
 * @param {boolean} isMulti - whether multi-select is enabled
 * @param {boolean} showAll - whether to include an "All" chip first
 * @param {string} allLabel - label for the "All" chip (default: "All")
 * @param {number} allCount - optional count badge for "All"
 * @param {string} ariaLabel - accessible label
 */
export function FilterChips({
  options = [],
  value,
  onChange,
  isMulti = false,
  showAll = false,
  allLabel = 'All',
  allCount,
  ariaLabel = 'Filter options',
  className = ''
}) {
  const containerRef = useRef(null);

  const isSelected = (id) => {
    if (isMulti) {
      return Array.isArray(value) && value.includes(id);
    }
    return value === id;
  };

  const isAllSelected = () => {
    if (isMulti) {
      return !value || value.length === 0;
    }
    return value === '' || value === null || value === undefined || value === 'ALL';
  };

  const handleChipClick = (id) => {
    if (isMulti) {
      const current = Array.isArray(value) ? [...value] : [];
      const idx = current.indexOf(id);
      if (idx > -1) {
        current.splice(idx, 1);
      } else {
        current.push(id);
      }
      onChange?.(current);
    } else {
      onChange?.(id);
    }
  };

  const handleAllClick = () => {
    if (isMulti) {
      onChange?.([]);
    } else {
      onChange?.('ALL');
    }
  };

  return (
    <div className={`filter-chips-wrapper ${className}`}>
      <div
        ref={containerRef}
        className="filter-chips"
        role="tablist"
        aria-label={ariaLabel}
      >
        {showAll && (
          <button
            type="button"
            className={`filter-chip ${isAllSelected() ? 'filter-chip--active' : ''}`}
            onClick={handleAllClick}
            role="tab"
            aria-selected={isAllSelected()}
          >
            {isMulti && isAllSelected() && (
              <CheckIcon size={14} className="filter-chip__check" />
            )}
            <span className="filter-chip__label">{allLabel}</span>
            {allCount !== undefined && (
              <span className="filter-chip__badge">{allCount}</span>
            )}
          </button>
        )}

        {options.map((opt) => {
          const optId = opt.id ?? opt.value;
          const active = isSelected(optId);
          return (
            <button
              key={optId}
              type="button"
              className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
              onClick={() => handleChipClick(optId)}
              role="tab"
              aria-selected={active}
            >
              {isMulti && active ? (
                <CheckIcon size={14} className="filter-chip__check" />
              ) : (
                opt.icon && <span className="filter-chip__icon">{opt.icon}</span>
              )}
              <span className="filter-chip__label">{opt.label || opt.name}</span>
              {opt.count !== undefined && (
                <span className="filter-chip__badge">{opt.count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="filter-chips__edge-fade" aria-hidden="true" />
    </div>
  );
}
