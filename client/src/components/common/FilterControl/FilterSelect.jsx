import React, { useState, useEffect, useRef, useId } from 'react';
import { ChevronDownIcon, CheckIcon, CloseIcon, SearchIcon } from '../Icons.jsx';

/**
 * FilterSelect - Custom filter trigger button that opens accessible popover (desktop)
 * or full bottom sheet (mobile). Never renders native <select>.
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  disabled = false,
  allowClear = true,
  ariaLabel,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listboxId = useId();

  // Detect mobile vs desktop view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle click outside to close desktop popover
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  // Focus search input when sheet opens with 8+ options
  useEffect(() => {
    if (isOpen && options.length >= 8 && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, options.length]);

  // Keyboard navigation & accessibility
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
  };

  // Find selected option
  const selectedOption = options.find((opt) => (opt.value ?? opt.id) === value);

  // Filter options if search query is present
  const filteredOptions = searchQuery.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : options;

  const handleSelect = (optVal) => {
    onChange?.(optVal);
    setIsOpen(false);
    setSearchQuery('');
    triggerRef.current?.focus();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('');
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div
      ref={containerRef}
      className={`filter-select ${isOpen ? 'filter-select--open' : ''} ${
        disabled ? 'filter-select--disabled' : ''
      } ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* 48px Tall Custom Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        className="filter-select__trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel || label || placeholder}
      >
        <div className="filter-select__trigger-content">
          {label && <span className="filter-select__label-prefix">{label}:</span>}
          {selectedOption ? (
            <span className="filter-select__value-chip">{selectedOption.label}</span>
          ) : (
            <span className="filter-select__placeholder">{placeholder}</span>
          )}
        </div>

        <div className="filter-select__trigger-actions">
          {allowClear && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className="filter-select__clear-btn"
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
              title="Clear selection"
              aria-label="Clear selection"
            >
              <CloseIcon size={14} />
            </span>
          )}
          <span className={`filter-select__chevron ${isOpen ? 'filter-select__chevron--open' : ''}`}>
            <ChevronDownIcon size={16} />
          </span>
        </div>
      </button>

      {/* DESKTOP POPOVER PANEL */}
      {isOpen && !isMobile && (
        <div
          id={listboxId}
          className="filter-select__popover"
          role="listbox"
          tabIndex={-1}
        >
          {options.length >= 8 && (
            <div className="filter-select__search-box">
              <SearchIcon size={15} className="filter-select__search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="filter-select__search-input"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          <div className="filter-select__options-list">
            {allowClear && (
              <button
                type="button"
                className={`filter-select__option ${!value ? 'filter-select__option--selected' : ''}`}
                onClick={() => handleSelect('')}
                role="option"
                aria-selected={!value}
              >
                <span>{placeholder || 'All'}</span>
                {!value && <CheckIcon size={16} className="filter-select__option-check" />}
              </button>
            )}

            {filteredOptions.map((opt) => {
              const optVal = opt.value ?? opt.id;
              const isSelected = optVal === value;
              return (
                <button
                  key={optVal}
                  type="button"
                  className={`filter-select__option ${isSelected ? 'filter-select__option--selected' : ''}`}
                  onClick={() => handleSelect(optVal)}
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                >
                  <span className="filter-select__option-label">{opt.label}</span>
                  {isSelected && <CheckIcon size={16} className="filter-select__option-check" />}
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="filter-select__empty-msg">No options found</div>
            )}
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM SHEET MODAL */}
      {isOpen && isMobile && (
        <div className="filter-select-sheet-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="filter-select-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={label || 'Select Filter'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Drag Handle */}
            <div className="filter-select-sheet__handle-bar">
              <div className="filter-select-sheet__handle" />
            </div>

            {/* Sheet Header */}
            <div className="filter-select-sheet__header">
              <h3 className="filter-select-sheet__title">{label || placeholder}</h3>
              <button
                type="button"
                className="btn-icon btn-icon--sm"
                onClick={() => setIsOpen(false)}
                aria-label="Close picker"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            {/* Search Box when 8+ options */}
            {options.length >= 8 && (
              <div className="filter-select-sheet__search">
                <SearchIcon size={16} className="filter-select__search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="filter-select__search-input"
                  placeholder="Search options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}

            {/* 48px Tall Option Rows */}
            <div className="filter-select-sheet__list" role="listbox">
              {allowClear && (
                <button
                  type="button"
                  className={`filter-select-sheet__row ${!value ? 'filter-select-sheet__row--selected' : ''}`}
                  onClick={() => handleSelect('')}
                  role="option"
                  aria-selected={!value}
                >
                  <span>{placeholder || 'All'}</span>
                  {!value && <CheckIcon size={18} className="filter-select__option-check" />}
                </button>
              )}

              {filteredOptions.map((opt) => {
                const optVal = opt.value ?? opt.id;
                const isSelected = optVal === value;
                return (
                  <button
                    key={optVal}
                    type="button"
                    className={`filter-select-sheet__row ${isSelected ? 'filter-select-sheet__row--selected' : ''}`}
                    onClick={() => handleSelect(optVal)}
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                  >
                    <span className="filter-select-sheet__row-label">{opt.label}</span>
                    {isSelected && <CheckIcon size={18} className="filter-select__option-check" />}
                  </button>
                );
              })}

              {filteredOptions.length === 0 && (
                <div className="filter-select__empty-msg">No options match your search</div>
              )}
            </div>

            {/* Sticky Sheet Footer */}
            <div className="filter-select-sheet__footer">
              <button
                type="button"
                className="btn btn--secondary"
                style={{ flex: 1, minHeight: '44px' }}
                onClick={() => {
                  onChange?.('');
                  setIsOpen(false);
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 2, minHeight: '44px' }}
                onClick={() => setIsOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
