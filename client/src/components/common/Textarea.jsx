import { useId } from 'react';

export function Textarea({
  label,
  id,
  name,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  hint,
  rows = 4,
  maxLength,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  const generatedId = useId();
  const inputId = id || name || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          <span>
            {label}
            {required && <span className="form-label__required" aria-hidden="true">*</span>}
          </span>
          {maxLength && (
            <span className="form-label__counter">
              {(value || '').length}/{maxLength}
            </span>
          )}
        </label>
      )}

      <textarea
        id={inputId}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        rows={rows}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
        }
        className={`form-input form-textarea ${error ? 'form-input--error' : ''}`}
        {...props}
      />

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

