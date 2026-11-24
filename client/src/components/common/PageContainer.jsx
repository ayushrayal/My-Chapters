/**
 * Standard PageContainer component to enforce consistent max-width (~1200px)
 * and responsive horizontal padding across all views.
 */
export function PageContainer({ children, className = '', ...props }) {
  return (
    <div className={`page-container ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
