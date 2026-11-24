import React from 'react';
import { MinusIcon, PlusIcon } from '../../../../components/common/Icons.jsx';

/**
 * NumberStepperInput - Proper number stepper
 * [− button 40px] [value centered, 44px wide, tabular numerals] [+ button 40px]
 * Optional label placed to the left or above, NEVER inside the control.
 */
export function NumberStepperInput({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  suffix = '',
  placeholder = '0',
  disabled = false,
  inputMode = 'numeric',
  ariaLabel,
  className = ''
}) {
  const numValue = Number(value) || 0;

  const handleDecrement = () => {
    if (disabled) return;
    const next = Math.max(min, Math.round((numValue - step) * 100) / 100);
    onChange(next);
  };

  const handleIncrement = () => {
    if (disabled) return;
    const next = Math.min(max, Math.round((numValue + step) * 100) / 100);
    onChange(next);
  };

  const handleInputChange = (e) => {
    const valStr = e.target.value;
    if (valStr === '') {
      onChange(0);
      return;
    }
    const parsed = parseFloat(valStr);
    if (!Number.isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
  };

  const handleFocus = (e) => {
    e.target.select();
  };

  return (
    <div className={`number-stepper-control ${className}`}>
      {label && <span className="number-stepper-control__label">{label}</span>}
      <div className={`gymflow-stepper ${disabled ? 'gymflow-stepper--disabled' : ''}`}>
        <button
          type="button"
          className="gymflow-stepper__btn gymflow-stepper__btn--minus"
          onClick={handleDecrement}
          disabled={disabled || numValue <= min}
          aria-label={`Decrease ${ariaLabel || label || ''}`}
        >
          <MinusIcon size={16} />
        </button>

        <div className="gymflow-stepper__input-wrapper">
          <input
            type="number"
            step={step}
            min={min}
            max={max}
            className="gymflow-stepper__input"
            value={value === 0 ? '' : value}
            placeholder={placeholder}
            onChange={handleInputChange}
            onFocus={handleFocus}
            disabled={disabled}
            inputMode={inputMode}
            aria-label={ariaLabel || label}
          />
        </div>

        <button
          type="button"
          className="gymflow-stepper__btn gymflow-stepper__btn--plus"
          onClick={handleIncrement}
          disabled={disabled || numValue >= max}
          aria-label={`Increase ${ariaLabel || label || ''}`}
        >
          <PlusIcon size={16} />
        </button>
      </div>
    </div>
  );
}
