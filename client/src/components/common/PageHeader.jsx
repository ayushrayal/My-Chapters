export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
  className = '',
  ...props
}) {
  return (
    <header className={`page-header ${className}`} {...props}>
      <div className="page-header__content">
        {badge && <div className="page-header__badge-wrapper">{badge}</div>}
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

