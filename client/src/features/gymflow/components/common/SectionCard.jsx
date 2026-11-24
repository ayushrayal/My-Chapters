export function SectionCard({
  title,
  subtitle,
  badge,
  action,
  children,
  className = '',
  headerClassName = '',
  ...props
}) {
  return (
    <section className={`gymflow-section-card ${className}`} {...props}>
      {(title || badge || action) && (
        <div className={`gymflow-section-card__header ${headerClassName}`}>
          <div className="gymflow-section-card__titles">
            <div className="gymflow-section-card__title-row">
              {title && <h3 className="gymflow-section-card__title">{title}</h3>}
              {badge && <div className="gymflow-section-card__badge-wrap">{badge}</div>}
            </div>
            {subtitle && <p className="gymflow-section-card__subtitle">{subtitle}</p>}
          </div>
          {action && <div className="gymflow-section-card__action">{action}</div>}
        </div>
      )}
      <div className="gymflow-section-card__body">{children}</div>
    </section>
  );
}
