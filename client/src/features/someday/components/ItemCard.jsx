import { FolderCard } from '../../../components/common/WindowCard.jsx';

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
    <FolderCard
      tabLabel={categoryName}
      tabColor={isPurchased ? 'lime' : 'blue'}
      className={`someday-card ${isPurchased ? 'someday-card--purchased' : ''}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Top meta row: Status chip & Link count chip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span className={`neo-tag ${isPurchased ? 'neo-tag--success' : 'neo-tag--secondary'}`}>
            {isPurchased ? 'Purchased' : 'Planned'}
          </span>

          {linkCount > 0 && (
            <span
              className="neo-tag neo-tag--canvas"
              title={`${linkCount} link${linkCount === 1 ? '' : 's'} attached`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
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

        {/* Title in weight 800 */}
        <h3
          className="someday-card__title"
          title={item.name}
          style={{
            fontSize: '16px',
            fontWeight: 800,
            margin: 0,
            color: '#252943',
            lineHeight: 1.3
          }}
        >
          {item.name}
        </h3>

        {/* Optional note (2-line clamp) */}
        {item.note && (
          <p
            className="someday-card__note-preview"
            style={{
              fontSize: '13px',
              color: 'rgba(37,41,67,0.7)',
              margin: 0,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {item.note}
          </p>
        )}

        {/* Purchase Date meta */}
        {isPurchased && formattedPurchaseDate && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#168B68' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Purchased on {formattedPurchaseDate}</span>
          </div>
        )}

        {/* Actions: Row of equal 44px icon buttons */}
        <div
          className="someday-card__actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '8px',
            marginTop: '8px',
            paddingTop: '10px',
            borderTop: '2px solid #252943'
          }}
        >
          {/* 1. View Details Icon Button (44px) */}
          <button
            type="button"
            className="btn btn--secondary"
            style={{ width: '44px', height: '44px', minHeight: '44px', padding: 0 }}
            onClick={() => onViewDetails(item)}
            title="View full details"
            aria-label={`View details for ${item.name}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>

          {/* 2. Edit Item Icon Button (44px) */}
          <button
            type="button"
            className="btn btn--secondary"
            style={{ width: '44px', height: '44px', minHeight: '44px', padding: 0 }}
            onClick={() => onEdit(item)}
            title="Edit item"
            aria-label={`Edit ${item.name}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          {/* 3. Mark Purchased / Planned Status (44px, Fresh Green if mark purchased) */}
          <button
            type="button"
            className={`btn ${isPurchased ? 'btn--secondary' : 'btn--success'}`}
            style={{ width: '44px', height: '44px', minHeight: '44px', padding: 0 }}
            onClick={() => onChangeStatus(item)}
            title={isPurchased ? 'Mark as planned' : 'Mark as purchased'}
            aria-label={isPurchased ? `Mark ${item.name} as planned` : `Mark ${item.name} as purchased`}
          >
            {isPurchased ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          {/* 4. Delete Item Icon Button (44px, Error Red) */}
          <button
            type="button"
            className="btn btn--danger"
            style={{ width: '44px', height: '44px', minHeight: '44px', padding: 0 }}
            onClick={() => onDelete(item)}
            title="Delete item"
            aria-label={`Delete ${item.name}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </FolderCard>
  );
}
