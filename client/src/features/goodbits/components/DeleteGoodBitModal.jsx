import { CloseIcon, TrashIcon } from '../../../components/common/Icons.jsx';

export function DeleteGoodBitModal({
  isOpen,
  entry = null,
  onClose,
  onConfirm,
  isDeleting = false
}) {
  if (!isOpen || !entry) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-container modal-container--sm">
        <div className="modal-header">
          <h3 className="modal-title">Delete Good Bit</h3>
          <button
            type="button"
            className="icon-btn modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: '#252943', lineHeight: '1.5', margin: 0 }}>
            Are you sure you want to delete this memory?
            {entry.title && (
              <span style={{ display: 'block', fontWeight: 700, marginTop: '8px' }}>
                "{entry.title}"
              </span>
            )}
          </p>
          <p style={{ color: '#64748B', fontSize: '13px', marginTop: '8px', marginBottom: 0 }}>
            This action cannot be undone.
          </p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn--outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => onConfirm(entry._id || entry.id)}
            disabled={isDeleting}
          >
            <TrashIcon size={16} />
            <span>{isDeleting ? 'Deleting...' : 'Delete Memory'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
