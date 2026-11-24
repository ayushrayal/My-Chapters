import { ChevronDownIcon } from '../../../../components/common/Icons.jsx';

export function StyledSelect({
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  className = '',
  id,
  name,
  'aria-label': ariaLabel,
  ...props
}) {
  return (
    <div className={`gymflow-select-wrapper ${disabled ? 'gymflow-select-wrapper--disabled' : ''} ${className}`}>
      <select
        id={id}
        name={name}
        className="gymflow-select"
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="gymflow-select__chevron" aria-hidden="true">
        <ChevronDownIcon size={16} />
      </span>
    </div>
  );
}
