import React, { useState } from 'react';
import { FilterIcon, CloseIcon } from '../Icons.jsx';
import { Chip } from '../Badge.jsx';

/**
 * FilterBar - Unified filter container for desktop & mobile
 * Desktop: Aligned row of filters
 * Mobile: Single "Filters" trigger button with count badge that opens bottom sheet
 * Below: Applied filter chips with individual remove buttons + Clear all
 */
export function FilterBar({
  filters = [], // Array of { id, label, value, renderFilter, onRemove }
  appliedChips = [], // Array of { id, label, onRemove }
  onClearAll,
  children,
  className = ''
}) {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const activeCount = appliedChips.length;

  return (
    <div className={`filter-bar-container ${className}`}>
      {/* 1. Main Controls Row */}
      <div className="filter-bar">
        {/* Desktop Aligned Row */}
        <div className="filter-bar__desktop-row">
          {children}
        </div>

        {/* Mobile Single Filters Trigger Button */}
        <div className="filter-bar__mobile-trigger">
          <button
            type="button"
            className="btn btn--secondary filter-bar__mobile-btn"
            onClick={() => setIsMobileSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isMobileSheetOpen}
          >
            <FilterIcon size={16} />
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="filter-bar__active-badge">{activeCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Applied Filter Chips Row */}
      {activeCount > 0 && (
        <div className="filter-bar__applied-chips">
          <span className="filter-bar__applied-label">Active Filters:</span>
          {appliedChips.map((chip) => (
            <span key={chip.id} className="filter-applied-chip">
              <span className="filter-applied-chip__text">{chip.label}</span>
              <button
                type="button"
                className="filter-applied-chip__remove"
                onClick={chip.onRemove}
                aria-label={`Remove filter ${chip.label}`}
              >
                <CloseIcon size={12} />
              </button>
            </span>
          ))}
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

      {/* 3. Mobile Combined Filter Bottom Sheet */}
      {isMobileSheetOpen && (
        <div className="filter-select-sheet-backdrop" onClick={() => setIsMobileSheetOpen(false)}>
          <div
            className="filter-select-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="All Filters"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="filter-select-sheet__handle-bar">
              <div className="filter-select-sheet__handle" />
            </div>

            <div className="filter-select-sheet__header">
              <h3 className="filter-select-sheet__title">All Filters</h3>
              <button
                type="button"
                className="btn-icon btn-icon--sm"
                onClick={() => setIsMobileSheetOpen(false)}
                aria-label="Close filters"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="filter-bar__sheet-body">
              {children}
            </div>

            <div className="filter-select-sheet__footer">
              {onClearAll && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ flex: 1, minHeight: '44px' }}
                  onClick={() => {
                    onClearAll();
                    setIsMobileSheetOpen(false);
                  }}
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 2, minHeight: '44px' }}
                onClick={() => setIsMobileSheetOpen(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
