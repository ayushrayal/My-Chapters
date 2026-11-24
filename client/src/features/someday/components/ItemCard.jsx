export function ItemCard({
  item,
  onViewDetails,
  onEdit,
  onChangeStatus,
  onDelete
}) {
  const isPurchased = item.status === 'PURCHASED';
  const categoryName = item.category?.name || 'Other';
  const linkCount = Array.isArray(item.links) ? item.links.length : 0;

  // Format purchase date if present
  const formattedPurchaseDate = item.purchaseDate
    ? new Date(item.purchaseDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  return (
    <article className={`someday-card ${isPurchased ? 'someday-card--purchased' : ''}`}>
      <div className="someday-card__header">
        <div className="someday-card__badges">
          <span className="someday-card__category" title={`Category: ${categoryName}`}>
            {categoryName}
          </span>
          <span
            className={`someday-card__status someday-card__status--${item.status.toLowerCase()}`}
          >
            {isPurchased ? 'Purchased' : 'Planned'}
          </span>
        </div>

        {linkCount > 0 && (
          <span
            className="someday-card__link-pill"
            title={`${linkCount} link${linkCount === 1 ? '' : 's'} attached`}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>{linkCount}</span>
          </span>
        )}
      </div>

      <div className="someday-card__body">
        <h3 className="someday-card__title" title={item.name}>
          {item.name}
        </h3>

        {item.note && (
          <p className="someday-card__note-preview">
            {item.note}
          </p>
        )}

        {isPurchased && formattedPurchaseDate && (
          <div className="someday-card__purchase-meta">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Purchased on {formattedPurchaseDate}</span>
          </div>
        )}
      </div>

      <div className="someday-card__actions">
        {/* 1. View Details Icon Button */}
        <button
          type="button"
          className="someday-card__icon-btn"
          onClick={() => onViewDetails(item)}
          title="View full details"
          aria-label={`View details for ${item.name}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="someday-card__tooltip">Details</span>
        </button>

        {/* 2. Edit Item Icon Button */}
        <button
          type="button"
          className="someday-card__icon-btn"
          onClick={() => onEdit(item)}
          title="Edit item"
          aria-label={`Edit ${item.name}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span className="someday-card__tooltip">Edit</span>
        </button>

        {/* 3. Toggle Status Icon Button */}
        <button
          type="button"
          className={`someday-card__icon-btn ${
            isPurchased ? 'someday-card__icon-btn--to-planned' : 'someday-card__icon-btn--to-purchased'
          }`}
          onClick={() => onChangeStatus(item)}
          title={isPurchased ? 'Mark as Planned' : 'Mark as Purchased'}
          aria-label={isPurchased ? `Mark ${item.name} as Planned` : `Mark ${item.name} as Purchased`}
        >
          {isPurchased ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
          <span className="someday-card__tooltip">
            {isPurchased ? 'Mark Planned' : 'Mark Purchased'}
          </span>
        </button>

        {/* 4. Delete Item Icon Button */}
        <button
          type="button"
          className="someday-card__icon-btn someday-card__icon-btn--delete"
          onClick={() => onDelete(item)}
          title="Delete item"
          aria-label={`Delete ${item.name}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span className="someday-card__tooltip">Delete</span>
        </button>
      </div>
    </article>
  );
}

