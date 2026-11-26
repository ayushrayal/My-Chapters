import React, { useState } from 'react';
import { FilterIcon, CloseIcon } from '../Icons.jsx';
import { BottomSheet } from '../BottomSheet.jsx';

/**
 * FilterBar - Unified filter container for desktop & mobile
 * Desktop: Aligned row of filters
 * Mobile: Single "Filters" trigger button with count badge that opens bottom sheet
 * Below: Applied filter chips with individual remove buttons + Clear all
 */
export function FilterBar({
  filters = [],
  appliedChips = [],
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
        {/* Desktop Aligned Row (Hidden on mobile) */}
        <div className="filter-bar__desktop-row">
          {children}
        </div>

        {/* Mobile Single Filters Trigger Button (Hidden on desktop) */}
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
          <span className="filter-bar__applied-label">Active:</span>
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
      <BottomSheet
        isOpen={isMobileSheetOpen}
        onClose={() => setIsMobileSheetOpen(false)}
        title="Filters"
      >
        <div className="filter-bar__sheet-body">
          {children}
        </div>

        <div className="filter-sheet__footer" style={{ marginTop: '16px' }}>
          {onClearAll && (
            <button
              type="button"
              className="btn btn--secondary"
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
            onClick={() => setIsMobileSheetOpen(false)}
          >
            Apply Filters
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
