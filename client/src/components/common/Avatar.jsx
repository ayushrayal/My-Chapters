export function Avatar({
  name = '',
  size = 'md',
  src,
  className = '',
  ...props
}) {
  const initial = name ? name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <div
      className={`avatar avatar--${size} ${className}`}
      aria-label={name ? `Avatar for ${name}` : 'User avatar'}
      {...props}
    >
      {src ? (
        <img src={src} alt={name || 'Avatar'} className="avatar__image" />
      ) : (
        <span className="avatar__initial" aria-hidden="true">
          {initial}
        </span>
      )}
    </div>
  );
}

