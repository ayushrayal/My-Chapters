import React from 'react';
import { CloseIcon } from '../Icons.jsx';

/**
 * FilterBar - Unified Neo-Brutalist filter container for desktop & mobile
 * Renders filter controls directly in a clean, responsive layout.
 * Desktop: Aligned row of filters
 * Mobile: Clean stacked filters
 * Below: Applied filter chips with individual remove buttons + Clear all
 */
export function FilterBar({
  appliedChips = [],
  onClearAll,
  children,
  className = ''
}) {
  const activeCount = Array.isArray(appliedChips) ? appliedChips.filter(Boolean).length : 0;

  return (
    <div className={`filter-bar-container ${className}`}>
      {/* 1. Filter Controls Row */}
      <div className="filter-bar">
        <div className="filter-bar__controls">
          {children}
        </div>
      </div>

      {/* 2. Applied Filter Chips Row */}
      {activeCount > 0 && (
        <div className="filter-bar__applied-chips">
          <span className="filter-bar__applied-label">Active:</span>
          {appliedChips.map((chip, idx) => {
            if (!chip) return null;
            const rawLabel = chip.label;
            let displayLabel = '';
            if (typeof rawLabel === 'object' && rawLabel !== null) {
              displayLabel = rawLabel.label || rawLabel.name || rawLabel.title || String(rawLabel);
            } else {
              displayLabel = rawLabel !== undefined && rawLabel !== null ? String(rawLabel) : '';
            }
            const chipId = chip.id ?? `chip-${displayLabel || idx}`;

            return (
              <span key={chipId} className="filter-applied-chip">
                <span className="filter-applied-chip__text">{displayLabel}</span>
                <button
                  type="button"
                  className="filter-applied-chip__remove"
                  onClick={chip.onRemove}
                  aria-label={`Remove filter ${displayLabel}`}
                >
                  <CloseIcon size={12} />
                </button>
              </span>
            );
          })}
          {onClearAll && (
            <button
              type="button"
              className="filter-bar__clear-all-btn"
              onClick={onClearAll}
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
