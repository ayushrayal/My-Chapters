import { useState, useEffect, useRef } from 'react';
import { BottomSheetModal } from './common/BottomSheetModal.jsx';
import { TrashIcon, AlertCircleIcon } from '../../../components/common/Icons.jsx';

export function DeleteGymTemplateModal({
  isOpen,
  template,
  onClose,
  onConfirmDelete
}) {
  const [typedName, setTypedName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const templateName = template?.name || '';
  const templateId = template?._id || template?.id;

  useEffect(() => {
    if (isOpen) {
      setTypedName('');
      setError('');
      setIsDeleting(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, template]);

  if (!isOpen || !template) return null;

  // Exact string matching: no partial match, no empty match, no silent trimming
  const isMatch = typedName.length > 0 && typedName === templateName;

  const handleDelete = async (e) => {
    e?.preventDefault();
    if (!isMatch || isDeleting) return;

    // Validate again before invoking delete handler
    if (typedName !== templateName) {
      setError('Entered name does not match the template name.');
      return;
    }

    setIsDeleting(true);
    setError('');
    try {
      await onConfirmDelete(templateId, templateName);
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete template. Please try again.';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={isDeleting ? () => {} : onClose}
      title="Delete Template"
      subtitle="Permanent template removal"
      footer={
        <>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            aria-disabled={!isMatch || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Template'}
          </button>
        </>
      }
    >
      <form onSubmit={handleDelete} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div className="dayflow-banner dayflow-banner--error" role="alert">
            <AlertCircleIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <div
          style={{
            backgroundColor: '#FFF5F5',
            border: '1px solid #FFE3E3',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D32F2F', fontWeight: 800 }}>
            <TrashIcon size={18} />
            <span>This action is permanent and cannot be undone.</span>
          </div>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#252943', lineHeight: 1.5 }}>
            Deleting this template will not alter your past workout history or finished sessions, but it will be permanently removed from your reusable templates.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            htmlFor="type-to-confirm-gym-input"
            style={{ fontSize: '13.5px', fontWeight: 700, color: '#252943', lineHeight: 1.4 }}
          >
            To confirm, type <strong style={{ color: '#D32F2F' }}>{templateName}</strong> in the box below:
          </label>
          <input
            ref={inputRef}
            id="type-to-confirm-gym-input"
            type="text"
            className="dayflow-input"
            style={{ height: '48px', fontSize: '16px' }}
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={`Type "${templateName}" to confirm`}
            disabled={isDeleting}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </form>
    </BottomSheetModal>
  );
}
