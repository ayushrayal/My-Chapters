import { useEffect } from 'react';
import { Button } from '../../../components/common/Button.jsx';

export function ItemDetailsModal({ item, isOpen, onClose, onEdit }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const isPurchased = item.status === 'PURCHASED';
  const categoryName = item.category?.name || 'Other';

  const formattedCreatedDate = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  const formattedPurchaseDate = item.purchaseDate
    ? new Date(item.purchaseDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-details-title"
      onClick={onClose}
    >
      <div
        className="modal-container modal-container--md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header__meta">
            <span className="badge badge--category">{categoryName}</span>
            <span
              className={`badge badge--status badge--${item.status.toLowerCase()}`}
            >
              {isPurchased ? 'Purchased' : 'Planned'}
            </span>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close item details modal"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <h2 id="item-details-title" className="item-details__title">
            {item.name}
          </h2>

          {/* Note section */}
          {item.note ? (
            <div className="item-details__section">
              <h4 className="item-details__section-title">Personal Note</h4>
              <p className="item-details__note">{item.note}</p>
            </div>
          ) : (
            <div className="item-details__section">
              <p className="item-details__empty-note">No personal note attached to this item.</p>
            </div>
          )}

          {/* Links section */}
          <div className="item-details__section">
            <h4 className="item-details__section-title">
              Saved Links ({item.links?.length || 0})
            </h4>
            {item.links && item.links.length > 0 ? (
              <ul className="item-details__links-list">
                {item.links.map((link, idx) => (
                  <li key={idx} className="item-details__link-item">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="item-details__external-link"
                    >
                      <span className="item-details__link-label">
                        {link.label || 'Visit Link'}
                      </span>
                      <span className="item-details__link-url">{link.url}</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="item-details__link-icon"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="item-details__empty-note">No external links attached.</p>
            )}
          </div>

          {/* Timeline & Metadata */}
          <div className="item-details__meta-grid">
            {formattedCreatedDate && (
              <div className="item-details__meta-cell">
                <span className="item-details__meta-label">Added to Space</span>
                <span className="item-details__meta-val">{formattedCreatedDate}</span>
              </div>
            )}
            {isPurchased && (
              <div className="item-details__meta-cell">
                <span className="item-details__meta-label">Purchased On</span>
                <span className="item-details__meta-val">
                  {formattedPurchaseDate || 'Date not recorded'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Close modal"
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              onEdit(item);
            }}
            aria-label="Edit this item"
          >
            Edit Item
          </Button>
        </div>
      </div>
    </div>
  );
}

