export function SectionHeader({
  title,
  subtitle,
  actions,
  badge,
  className = '',
  ...props
}) {
  return (
    <div className={`section-header ${className}`} {...props}>
      <div className="section-header__text">
        <div className="section-header__title-row">
          <h2 className="section-header__title">{title}</h2>
          {badge && <span className="section-header__badge">{badge}</span>}
        </div>
        {subtitle && <p className="section-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="section-header__actions">{actions}</div>}
    </div>
  );
}

