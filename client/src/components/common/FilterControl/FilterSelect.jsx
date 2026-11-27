import { useState, useEffect, useRef, useId, useMemo } from 'react';
import { ChevronDownIcon, CheckIcon, SearchIcon } from '../Icons.jsx';

/**
 * Normalizes any option (primitive string/number, or object with various keys)
 * into a safe, canonical shape with guaranteed string label and stable unique key.
 */
function normalizeOption(opt, index, seenKeys) {
  if (opt === null || opt === undefined) {
    const key = `opt-empty-${index}`;
    return {
      key,
      value: '',
      label: '',
      id: key,
      disabled: false,
      raw: opt
    };
  }

  // Primitive string, number, or boolean
  if (typeof opt === 'string' || typeof opt === 'number' || typeof opt === 'boolean') {
    const str = String(opt);
    let key = `prim-${str}`;
    if (seenKeys.has(key)) {
      const count = seenKeys.get(key) + 1;
      seenKeys.set(key, count);
      key = `${key}__dup${count}`;
    } else {
      seenKeys.set(key, 0);
    }

    return {
      key,
      value: opt,
      label: str,
      id: str,
      disabled: false,
      raw: opt
    };
  }

  // Object options
  if (typeof opt === 'object') {
    // 1. Determine label: must NEVER be an object
    let label = opt.label;
    if (label === undefined || label === null) {
      label = opt.name ?? opt.title ?? opt.text;
    }
    if (typeof label === 'object' && label !== null) {
      label = label.label ?? label.name ?? label.title ?? '';
    }
    if (label === null || label === undefined) {
      const candidate = opt.value ?? opt.id ?? opt._id;
      if (typeof candidate === 'object' && candidate !== null) {
        label = candidate.name ?? candidate.label ?? candidate.title ?? '';
      } else {
        label = candidate !== undefined && candidate !== null ? String(candidate) : '';
      }
    }
    label = String(label);

    // 2. Determine value safely (extract string/number if nested)
    let value = opt.value;
    if (value === undefined) {
      value = opt.id ?? opt._id ?? opt.name ?? label;
    }
    if (typeof value === 'object' && value !== null) {
      value = value.id ?? value._id ?? value.value ?? value.name ?? label;
    }

    // 3. Determine stable unique ID for React key
    const idVal = opt.id ?? opt._id ?? opt.key ?? (typeof opt.value === 'string' || typeof opt.value === 'number' ? opt.value : null) ?? opt.name ?? (label || `idx-${index}`);
    const baseKey = `opt-${String(idVal)}`;

    let key = baseKey;
    if (seenKeys.has(key)) {
      const count = seenKeys.get(key) + 1;
      seenKeys.set(key, count);
      key = `${key}__dup${count}`;
    } else {
      seenKeys.set(key, 0);
    }

    return {
      key,
      value,
      label,
      id: String(idVal),
      disabled: Boolean(opt.disabled),
      raw: opt
    };
  }

  const fallbackKey = `opt-fallback-${index}`;
  return {
    key: fallbackKey,
    value: String(opt),
    label: String(opt),
    id: fallbackKey,
    disabled: false,
    raw: opt
  };
}

/**
 * Extracts a normalized primitive value from a prop that might be an object or primitive
 */
function normalizeSelectedValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return val;
  }
  if (typeof val === 'object') {
    return val.id ?? val._id ?? val.value ?? val.name ?? val.label ?? '';
  }
  return String(val);
}

/**
 * FilterSelect - Neo-Brutalist option picker.
 * Single-select: 48px trigger, options panel directly below (in-flow on mobile, popover on desktop).
 * Tapping an option selects and closes immediately.
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

  // Normalize options array into a canonical, safe shape
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    const seenKeys = new Map();
    return options.map((opt, idx) => normalizeOption(opt, idx, seenKeys));
  }, [options]);

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
    if (isOpen && normalizedOptions.length >= 8 && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 80);
    }
  }, [isOpen, normalizedOptions.length]);

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
  const isSelected = (optVal, opt) => {
    const targetVal = normalizeSelectedValue(optVal);
    const targetId = opt?.id;

    if (isMulti) {
      const arr = Array.isArray(value) ? value : [];
      return arr.some((item) => {
        const itemVal = normalizeSelectedValue(item);
        return itemVal === targetVal || (targetId && itemVal === targetId);
      });
    }

    const currentVal = normalizeSelectedValue(value);
    return (
      currentVal === targetVal ||
      (targetId && currentVal === targetId) ||
      (opt?.label && currentVal === opt.label)
    );
  };

  const selectedOption = isMulti
    ? null
    : normalizedOptions.find((opt) => isSelected(opt.value, opt));

  // Filter options if search query is present
  const filteredOptions = searchQuery.trim()
    ? normalizedOptions.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : normalizedOptions;

  const handleOptionClick = (opt) => {
    const optVal = opt.value;
    if (isMulti) {
      const current = Array.isArray(value) ? [...value] : [];
      const currentNorm = current.map(normalizeSelectedValue);
      const targetNorm = normalizeSelectedValue(optVal);
      const idx = currentNorm.indexOf(targetNorm);
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
      const arr = Array.isArray(value) ? value : [];
      if (arr.length === 0) {
        return placeholder;
      }
      return `${arr.length} selected`;
    }
    if (selectedOption) {
      return selectedOption.label;
    }
    const currentVal = normalizeSelectedValue(value);
    if (currentVal !== '' && currentVal !== undefined && currentVal !== null) {
      return String(currentVal);
    }
    return placeholder;
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
          {label && <span className="filter-select__label-prefix">{String(label)}:</span>}
          <span
            className={`filter-select__value-text ${
              !selectedOption && !isMulti && !value ? 'filter-select__value-text--placeholder' : ''
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
          {normalizedOptions.length >= 8 && (
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
                onClick={() => handleOptionClick({ value: '', label: placeholder || 'All' })}
                role="option"
                aria-selected={!value}
              >
                <span className="filter-select__option-label">{placeholder || 'All'}</span>
                {!value && <CheckIcon size={16} className="filter-select__option-check" />}
              </button>
            )}

            {filteredOptions.map((opt) => {
              const active = isSelected(opt.value, opt);

              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`filter-select__option ${active ? 'filter-select__option--selected' : ''}`}
                  onClick={() => handleOptionClick(opt)}
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
