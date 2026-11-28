import { PlusIcon, EditIcon, TrashIcon, SparklesIcon } from '../../../components/common/Icons.jsx';

export function DateDetailsView({
  selectedDate,
  todayStr,
  entries = [],
  isLoading = false,
  onAddClick,
  onEditClick,
  onDeleteClick
}) {
  const isFuture = selectedDate > todayStr;

  const displayDate = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  const isToday = selectedDate === todayStr;

  return (
    <div className="goodbits-details-card">
      {/* Date Header */}
      <div className="goodbits-details-header">
        <div className="goodbits-details-header__left">
          <div className="goodbits-details-header__title-row">
            <h3 className="goodbits-details-header__title">{displayDate}</h3>
            {isToday && <span className="neo-tag neo-tag--lime">Today</span>}
          </div>
          <p className="goodbits-details-header__sub">
            {entries.length === 1
              ? '1 Good Bit recorded'
              : `${entries.length} Good Bits recorded`}
          </p>
        </div>

        {!isFuture && (
          <button
            type="button"
            className="btn btn--primary btn--sm goodbits-add-btn"
            onClick={onAddClick}
          >
            <PlusIcon size={16} />
            <span>Add Good Thing</span>
          </button>
        )}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="goodbits-details-loading">
          <div className="loader loader--sm" />
          <span>Loading memories...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="goodbits-empty-box">
          <div className="goodbits-empty-box__icon">
            <SparklesIcon size={32} />
          </div>
          <h4 className="goodbits-empty-box__title">No Good Bits recorded yet</h4>
          <p className="goodbits-empty-box__desc">
            {isFuture
              ? 'Future dates cannot have entries. Live in the moment and record good things as they happen!'
              : 'Write down something positive, an achievement, or a moment that brought you joy today.'}
          </p>
          {!isFuture && (
            <button
              type="button"
              className="btn btn--primary goodbits-empty-box__btn"
              onClick={onAddClick}
            >
              <PlusIcon size={16} />
              <span>Record Your First Memory</span>
            </button>
          )}
        </div>
      ) : (
        <div className="goodbits-entries-list">
          {entries.map((entry, idx) => (
            <article key={entry._id || entry.id || idx} className="goodbits-entry-card">
              <div className="goodbits-entry-card__header">
                <div className="goodbits-entry-card__title-wrap">
                  {entry.title ? (
                    <h4 className="goodbits-entry-card__title">{entry.title}</h4>
                  ) : (
                    <span className="goodbits-entry-card__untitled">Good Moment #{idx + 1}</span>
                  )}
                  {entry.createdAt && (
                    <time className="goodbits-entry-card__time">
                      {new Date(entry.createdAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </time>
                  )}
                </div>

                <div className="goodbits-entry-card__actions">
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm goodbits-entry-action-btn"
                    onClick={() => onEditClick(entry)}
                    aria-label="Edit this Good Bit"
                    title="Edit"
                  >
                    <EditIcon size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm icon-btn--danger goodbits-entry-action-btn"
                    onClick={() => onDeleteClick(entry)}
                    aria-label="Delete this Good Bit"
                    title="Delete"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              </div>

              <div className="goodbits-entry-card__body">
                <p className="goodbits-entry-card__text">{entry.description}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
