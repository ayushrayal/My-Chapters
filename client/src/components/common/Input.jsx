import { useState, useId } from 'react';

export function Input({
  label,
  id,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  hint,
  required = false,
  disabled = false,
  visibilityToggle = false,
  autoComplete,
  className = '',
  ...props
}) {
  const generatedId = useId();
  const inputId = id || name || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const [showPassword, setShowPassword] = useState(false);

  const isPasswordField = type === 'password' || visibilityToggle;
  const inputType = isPasswordField && showPassword ? 'text' : type;

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          <span>
            {label}
            {required && <span className="form-label__required" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      <div className="input-wrapper">
        <input
          id={inputId}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
          }
          className={`form-input ${error ? 'form-input--error' : ''} ${
            isPasswordField && visibilityToggle ? 'form-input--with-toggle' : ''
          }`}
          {...props}
        />

        {isPasswordField && visibilityToggle && (
          <button
            type="button"
            className="input-toggle-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
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
