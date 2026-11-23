export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  className = '',
  ...props
}) {
  return (
    <div className={`empty-state ${className}`} role="status" {...props}>
      {icon && <div className="empty-state__icon">{icon}</div>}
      {title && <h3 className="empty-state__title">{title}</h3>}
      {subtitle && <p className="empty-state__subtitle">{subtitle}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

