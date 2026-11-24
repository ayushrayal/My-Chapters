import { useState, useEffect, useRef } from 'react';
import { Button } from '../../../components/common/Button.jsx';
import { Input } from '../../../components/common/Input.jsx';
import { FilterSelect } from '../../../components/common/FilterControl/FilterSelect.jsx';

export function ItemFormModal({
  isOpen,
  onClose,
  onSubmit,
  categories = [],
  itemToEdit = null,
  onOpenAddCategory
}) {
  const isEditing = Boolean(itemToEdit);
  const modalRef = useRef(null);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [links, setLinks] = useState([]);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('PLANNED');
  const [purchaseDate, setPurchaseDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Reset or pre-fill form when modal opens or itemToEdit changes
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setFieldErrors({});

      if (itemToEdit) {
        setName(itemToEdit.name || '');
        setCategoryId(
          itemToEdit.categoryId ||
          itemToEdit.category?.id ||
          (categories[0]?.id || '')
        );
        setLinks(
          Array.isArray(itemToEdit.links)
            ? itemToEdit.links.map((l) => ({ label: l.label || '', url: l.url || '' }))
            : []
        );
        setNote(itemToEdit.note || '');
        setStatus(itemToEdit.status || 'PLANNED');
        setPurchaseDate(
          itemToEdit.purchaseDate
            ? new Date(itemToEdit.purchaseDate).toISOString().split('T')[0]
            : ''
        );
      } else {
        setName('');
        setCategoryId(categories[0]?.id || '');
        setLinks([]);
        setNote('');
        setStatus('PLANNED');
        setPurchaseDate('');
      }
    }
  }, [isOpen, itemToEdit, categories]);

  // Escape key handler to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle dynamic link addition
  const handleAddLink = () => {
    if (links.length >= 3) return;
    setLinks([...links, { label: '', url: '' }]);
  };

  const handleRemoveLink = (index) => {
    setLinks(links.filter((_, idx) => idx !== index));
  };

  const handleLinkChange = (index, field, value) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    setLinks(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Client-side validations
    const errors = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      errors.name = 'Item name is required';
    } else if (trimmedName.length > 120) {
      errors.name = 'Item name cannot exceed 120 characters';
    }

    if (!categoryId) {
      errors.categoryId = 'Please select a category';
    }

    // Validate links
    if (links.length > 3) {
      errors.links = 'Maximum 3 links are allowed';
    } else {
      links.forEach((link, idx) => {
        const trimmedUrl = link.url.trim();
        if (!trimmedUrl) {
          errors[`link_${idx}`] = 'URL is required';
        } else if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
          errors[`link_${idx}`] = 'URL must start with http:// or https://';
        }
      });
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const sanitizedLinks = links
        .filter((l) => l.url.trim().length > 0)
        .map((l) => ({
          label: l.label ? l.label.trim() : '',
          url: l.url.trim()
        }));

      const payload = {
        name: trimmedName,
        categoryId,
        links: sanitizedLinks,
        note: note.trim(),
        status
      };

      if (status === 'PURCHASED') {
        payload.purchaseDate = purchaseDate ? new Date(purchaseDate).toISOString() : null;
      } else {
        payload.purchaseDate = null;
      }

      await onSubmit(payload);
      onClose();
    } catch (err) {
      if (err?.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      }
      setFormError(err?.message || 'Failed to save item. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNearNoteLimit = note.length > 1800;
  const isAtNoteLimit = note.length >= 2000;

  return (
    <div
      className="modal-overlay modal-overlay--glass"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-form-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="modal-container modal-container--lg item-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header__title-group">
            <h2 id="item-form-title" className="modal-title">
              {isEditing ? 'Edit Someday Item' : 'Add Item to Someday'}
            </h2>
            <p className="modal-header__subtitle">
              {isEditing
                ? 'Update details, category, or links for this item.'
                : 'Save an aspiration you want to acquire or document a purchase.'}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="item-form-modal__form">
          {/* Scrollable Modal Body */}
          <div className="modal-body item-form-modal__body">
            {formError && (
              <div className="alert alert--error" role="alert" style={{ marginBottom: '16px' }}>
                <p>{formError}</p>
              </div>
            )}

            {/* Item Name */}
            <Input
              label="Item Name"
              name="itemName"
              required
              placeholder="What would you like to own?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors.name}
              autoFocus
            />

            {/* Category Select + Small Ghost Action */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="item-category" className="form-label">
                  <span>Category <span className="form-label__required" aria-hidden="true">*</span></span>
                </label>
                {onOpenAddCategory && (
                  <button
                    type="button"
                    className="ghost-action-btn"
                    onClick={onOpenAddCategory}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>New Category</span>
                  </button>
                )}
              </div>
              <div className="select-picker-wrap">
                <FilterSelect
                  value={categoryId}
                  onChange={(val) => {
                    setCategoryId(val);
                    if (fieldErrors.categoryId) {
                      setFieldErrors((prev) => ({ ...prev, categoryId: null }));
                    }
                  }}
                  options={categories.map((cat) => ({
                    value: cat.id,
                    label: `${cat.name} ${cat.isSystem ? '(System Default)' : ''}`
                  }))}
                  placeholder="Select a category"
                  allowClear={false}
                  ariaLabel="Item category"
                />
              </div>
              {fieldErrors.categoryId && (
                <span className="form-error">{fieldErrors.categoryId}</span>
              )}
            </div>

            {/* Collection Status: Segmented Toggle with Two Clearly Separated Options */}
            <div className="form-group">
              <label className="form-label">Collection Status</label>
              <div className="segmented-status-toggle" role="group" aria-label="Item Status">
                <button
                  type="button"
                  className={`segmented-status-btn ${status === 'PLANNED' ? 'segmented-status-btn--active' : ''}`}
                  onClick={() => setStatus('PLANNED')}
                  aria-pressed={status === 'PLANNED'}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 14 14" />
                  </svg>
                  <span>Planned</span>
                </button>
                <button
                  type="button"
                  className={`segmented-status-btn ${status === 'PURCHASED' ? 'segmented-status-btn--active' : ''}`}
                  onClick={() => setStatus('PURCHASED')}
                  aria-pressed={status === 'PURCHASED'}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Purchased</span>
                </button>
              </div>
            </div>

            {/* Purchase Date (only visible when Purchased) */}
            {status === 'PURCHASED' && (
              <div className="form-group purchase-date-group">
                <label htmlFor="purchase-date" className="form-label">
                  <span>Purchase Date <span className="form-label__optional">(Optional)</span></span>
                </label>
                <input
                  id="purchase-date"
                  type="date"
                  className="form-input"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
                <span className="form-hint">
                  Leave empty to automatically record today as the purchase date.
                </span>
              </div>
            )}

            {/* Dynamic Links (0 to 3) with Icon & Counter Badge */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label">
                  <span>External Links <span className="counter-badge">({links.length}/3 max)</span></span>
                </label>
                {links.length < 3 && (
                  <button
                    type="button"
                    className="ghost-action-btn"
                    onClick={handleAddLink}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>+ Add Link</span>
                  </button>
                )}
              </div>

              {links.length === 0 ? (
                <div className="links-empty-hint">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <span>No links added yet. Attach store links, reviews, or spec sheets (up to 3).</span>
                </div>
              ) : (
                <div className="links-builder">
                  {links.map((link, idx) => (
                    <div key={idx} className="link-card-row">
                      <div className="link-card-row__icon-box" aria-hidden="true">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      </div>

                      <div className="link-card-row__fields">
                        <input
                          type="text"
                          placeholder="Label (e.g. Official Store, Amazon)"
                          value={link.label}
                          onChange={(e) => handleLinkChange(idx, 'label', e.target.value)}
                          className="form-input link-card-row__label-input"
                          maxLength={100}
                        />
                        <input
                          type="url"
                          placeholder="https://example.com/item"
                          value={link.url}
                          onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                          className={`form-input link-card-row__url-input ${
                            fieldErrors[`link_${idx}`] ? 'form-input--error' : ''
                          }`}
                          required
                        />
                      </div>

                      <button
                        type="button"
                        className="link-card-row__remove-btn"
                        onClick={() => handleRemoveLink(idx)}
                        title="Remove link"
                        aria-label={`Remove link ${idx + 1}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>

                      {fieldErrors[`link_${idx}`] && (
                        <span className="form-error link-card-row__error">
                          {fieldErrors[`link_${idx}`]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Note Textarea with Colored Limit Counter */}
            <div className="form-group">
              <label htmlFor="item-note" className="form-label">
                <span>Personal Note <span className="form-label__optional">(Optional)</span></span>
              </label>
              <textarea
                id="item-note"
                name="note"
                rows={3}
                placeholder="Details, specs, reasons for purchase, or ideas..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="form-input form-textarea"
                maxLength={2000}
              />
              <div className="textarea-footer">
                <span className={`char-counter ${isAtNoteLimit ? 'char-counter--limit' : isNearNoteLimit ? 'char-counter--warn' : ''}`}>
                  {note.length} / 2000 characters
                </span>
              </div>
            </div>
          </div>

          {/* Sticky Modal Footer with Clean Buttons */}
          <div className="modal-footer item-form-modal__footer">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              {isEditing ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

