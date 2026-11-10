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
              width="14"
              height="14"
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
            {item.note.length > 120 ? `${item.note.slice(0, 120)}...` : item.note}
          </p>
        )}

        {isPurchased && formattedPurchaseDate && (
          <div className="someday-card__purchase-meta">
            <span>Purchased on {formattedPurchaseDate}</span>
          </div>
        )}
      </div>

      <div className="someday-card__actions">
        <button
          type="button"
          className="someday-card__action-btn"
          onClick={() => onViewDetails(item)}
          title="View full item details"
          aria-label={`View details for ${item.name}`}
        >
          Details
        </button>

        <button
          type="button"
          className="someday-card__action-btn"
          onClick={() => onEdit(item)}
          title="Edit item information"
          aria-label={`Edit ${item.name}`}
        >
          Edit
        </button>

        <button
          type="button"
          className={`someday-card__action-btn someday-card__action-btn--status ${
            isPurchased ? 'someday-card__action-btn--to-planned' : 'someday-card__action-btn--to-purchased'
          }`}
          onClick={() => onChangeStatus(item)}
          title={isPurchased ? 'Revert status to Planned' : 'Mark item as Purchased'}
          aria-label={isPurchased ? `Mark ${item.name} as Planned` : `Mark ${item.name} as Purchased`}
        >
          {isPurchased ? 'Mark Planned' : 'Mark Purchased'}
        </button>

        <button
          type="button"
          className="someday-card__action-btn someday-card__action-btn--delete"
          onClick={() => onDelete(item)}
          title="Delete item"
          aria-label={`Delete ${item.name}`}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
