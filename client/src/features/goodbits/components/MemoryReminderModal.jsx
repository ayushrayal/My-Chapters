import { CloseIcon, SparklesIcon } from '../../../components/common/Icons.jsx';

export function MemoryReminderModal({
  isOpen,
  memories = [],
  targetDate,
  onClose
}) {
  if (!isOpen || !memories || memories.length === 0) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-container goodbits-reminder-modal">
        {/* Header with Sparkles Accent */}
        <div className="modal-header goodbits-reminder-header">
          <div className="goodbits-reminder-header__title-wrap">
            <div className="goodbits-reminder-header__icon">
              <SparklesIcon size={22} />
            </div>
            <div>
              <h3 className="modal-title">Past Memories on this Day</h3>
              <p className="modal-subtitle">
                Rediscover good things that happened on this day in past months and years!
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn modal-close-btn"
            onClick={onClose}
            aria-label="Dismiss memory reminders"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Scrollable List of Historical Memories */}
        <div className="modal-body goodbits-reminder-body">
          <div className="goodbits-reminder-list">
            {memories.map((memory) => {
              const formattedDate = new Date(`${memory.date}T00:00:00`).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <article key={memory._id || memory.id} className="goodbits-reminder-card">
                  <div className="goodbits-reminder-card__badge-row">
                    <span className="neo-tag neo-tag--lime">{formattedDate}</span>
                  </div>

                  {memory.title && (
                    <h4 className="goodbits-reminder-card__title">{memory.title}</h4>
                  )}

                  <p className="goodbits-reminder-card__text">{memory.description}</p>
                </article>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer goodbits-reminder-footer">
          <button
            type="button"
            className="btn btn--primary btn--full"
            onClick={onClose}
          >
            Keep Smiling
          </button>
        </div>
      </div>
    </div>
  );
}
