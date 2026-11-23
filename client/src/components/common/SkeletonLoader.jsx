export function SkeletonLoader({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
  ...props
}) {
  const items = Array.from({ length: count });

  return (
    <div className={`skeleton-group ${className}`} aria-hidden="true" {...props}>
      {items.map((_, idx) => (
        <span
          key={idx}
          className={`skeleton skeleton--${variant}`}
          style={{
            width: width || (variant === 'circle' ? height : undefined),
            height
          }}
        />
      ))}
    </div>
  );
}

