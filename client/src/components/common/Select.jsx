import { useId } from 'react';

export function Select({
  label,
  id,
  name,
  value,
  onChange,
  onBlur,
  options = [],
  placeholder,
  error,
  hint,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  const generatedId = useId();
  const selectId = id || name || generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          <span>
            {label}
            {required && <span className="form-label__required" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      <div className="select-wrapper">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
          }
          className={`form-input form-select ${error ? 'form-input--error' : ''}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <span id={errorId} className="form-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="form-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

