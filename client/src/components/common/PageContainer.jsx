export function PageContainer({
  children,
  className = '',
  maxWidth = '1040px',
  ...props
}) {
  return (
    <div
      className={`page-container ${className}`}
      style={{ maxWidth, margin: '0 auto', width: '100%' }}
      {...props}
    >
      {children}
    </div>
  );
}

