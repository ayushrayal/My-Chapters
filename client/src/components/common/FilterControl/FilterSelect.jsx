import { useState, useEffect, useRef, useId } from 'react';
import { ChevronDownIcon, CheckIcon, SearchIcon } from '../Icons.jsx';

/**
 * FilterSelect - Neo-Brutalist option picker.
 * Single-select: 48px trigger, options panel directly below (in-flow on mobile, popover on desktop).
 * Tapping an option selects and closes immediately. No title, no X, no Clear/Done buttons.
 * Multi-select: Checkboxes on left and sticky Done button.
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  disabled = false,
  isMulti = false,
  allowClear = false,
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
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close on click outside (works on desktop and mobile)
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  // Focus search input when panel opens with 8+ options
  useEffect(() => {
    if (isOpen && options.length >= 8 && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 80);
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

  // Find selected option(s)
  const isSelected = (optVal) => {
    if (isMulti) {
      return Array.isArray(value) && value.includes(optVal);
    }
    return value === optVal;
  };

  const selectedOption = isMulti
    ? null
    : options.find((opt) => (opt.value ?? opt.id) === value);

  // Filter options if search query is present
  const filteredOptions = searchQuery.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : options;

  const handleOptionClick = (optVal) => {
    if (isMulti) {
      const current = Array.isArray(value) ? [...value] : [];
      const idx = current.indexOf(optVal);
      if (idx > -1) {
        current.splice(idx, 1);
      } else {
        current.push(optVal);
      }
      onChange?.(current);
    } else {
      onChange?.(optVal);
      setIsOpen(false);
      setSearchQuery('');
      triggerRef.current?.focus();
    }
  };

  const getDisplayValue = () => {
    if (isMulti) {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return placeholder;
      }
      return `${value.length} selected`;
    }
    return selectedOption?.label || placeholder;
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
          <span
            className={`filter-select__value-text ${
              !selectedOption && !isMulti ? 'filter-select__value-text--placeholder' : ''
            }`}
          >
            {getDisplayValue()}
          </span>
        </div>

        <div className="filter-select__trigger-actions">
          <span className={`filter-select__chevron ${isOpen ? 'filter-select__chevron--open' : ''}`}>
            <ChevronDownIcon size={16} />
          </span>
        </div>
      </button>

      {/* OPTIONS PANEL: In-flow on mobile, absolute popover on desktop */}
      {isOpen && (
        <div
          id={listboxId}
          className={`filter-select__panel ${isMobile ? 'filter-select__panel--mobile' : 'filter-select__panel--desktop'}`}
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
            {allowClear && !isMulti && (
              <button
                type="button"
                className={`filter-select__option ${!value ? 'filter-select__option--selected' : ''}`}
                onClick={() => handleOptionClick('')}
                role="option"
                aria-selected={!value}
              >
                <span className="filter-select__option-label">{placeholder || 'All'}</span>
                {!value && <CheckIcon size={16} className="filter-select__option-check" />}
              </button>
            )}

            {filteredOptions.map((opt) => {
              const optVal = opt.value ?? opt.id;
              const active = isSelected(optVal);

              return (
                <button
                  key={optVal}
                  type="button"
                  className={`filter-select__option ${active ? 'filter-select__option--selected' : ''}`}
                  onClick={() => handleOptionClick(optVal)}
                  role="option"
                  aria-selected={active}
                  disabled={opt.disabled}
                >
                  {isMulti && (
                    <span className={`filter-select__checkbox ${active ? 'filter-select__checkbox--checked' : ''}`}>
                      {active && <CheckIcon size={12} />}
                    </span>
                  )}
                  <span className="filter-select__option-label">{opt.label}</span>
                  {!isMulti && active && (
                    <CheckIcon size={16} className="filter-select__option-check" />
                  )}
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="filter-select__empty-msg">No options found</div>
            )}
          </div>

          {/* Sticky Done Button for Multi-select */}
          {isMulti && (
            <div className="filter-select__multi-footer">
              <button
                type="button"
                className="btn btn--primary"
                style={{ width: '100%', height: '40px', minHeight: '40px' }}
                onClick={() => setIsOpen(false)}
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
