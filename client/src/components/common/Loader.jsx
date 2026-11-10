export function Loader({ size = 'md', fullScreen = false, text = '' }) {
  const containerClass = `loader-container ${fullScreen ? 'loader-container--fullscreen' : ''}`;

  return (
    <div className={containerClass} role="status" aria-live="polite">
      <div className={`spinner spinner--${size}`} aria-hidden="true" />
      {text && <p className="loader-text">{text}</p>}
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
        Loading...
      </span>
    </div>
  );
}

