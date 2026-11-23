import { useState, useEffect } from 'react';
import { Button } from '../../../components/common/Button.jsx';
import { Input } from '../../../components/common/Input.jsx';

export function ItemFormModal({
  isOpen,
  onClose,
  onSubmit,
  categories = [],
  itemToEdit = null,
  onOpenAddCategory
}) {
  const isEditing = Boolean(itemToEdit);

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

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-form-title"
      onClick={onClose}
    >
      <div
        className="modal-container modal-container--lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="item-form-title" className="modal-title">
            {isEditing ? 'Edit Someday Item' : 'Add Item to Someday'}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
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

            {/* Category Select */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="item-category" className="form-label">
                  <span>Category <span className="form-label__required" aria-hidden="true">*</span></span>
                </label>
                {onOpenAddCategory && (
                  <button
                    type="button"
                    className="form-link-action"
                    onClick={onOpenAddCategory}
                  >
                    + New Category
                  </button>
                )}
              </div>
              <select
                id="item-category"
                name="categoryId"
                className={`form-input form-select ${fieldErrors.categoryId ? 'form-input--error' : ''}`}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {cat.isSystem ? '(System Default)' : ''}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && (
                <span className="form-error">{fieldErrors.categoryId}</span>
              )}
            </div>

            {/* Status Selection */}
            <div className="form-group">
              <label className="form-label">Collection Status</label>
              <div className="status-toggle-group">
                <button
                  type="button"
                  className={`status-toggle-btn ${status === 'PLANNED' ? 'status-toggle-btn--active' : ''}`}
                  onClick={() => setStatus('PLANNED')}
                >
                  Planned
                </button>
                <button
                  type="button"
                  className={`status-toggle-btn ${status === 'PURCHASED' ? 'status-toggle-btn--active' : ''}`}
                  onClick={() => setStatus('PURCHASED')}
                >
                  Purchased
                </button>
              </div>
            </div>

            {/* Purchase Date (only visible when Purchased) */}
            {status === 'PURCHASED' && (
              <div className="form-group">
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

            {/* Dynamic Links (0 to 3) */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label">
                  <span>External Links <span className="form-label__optional">({links.length}/3 max)</span></span>
                </label>
                {links.length < 3 && (
                  <button
                    type="button"
                    className="form-link-action"
                    onClick={handleAddLink}
                  >
                    + Add Link
                  </button>
                )}
              </div>

              {links.length === 0 ? (
                <p className="form-hint" style={{ marginTop: '4px' }}>
                  No links added. You can attach store links, articles, or reviews (up to 3).
                </p>
              ) : (
                <div className="links-builder">
                  {links.map((link, idx) => (
                    <div key={idx} className="link-row">
                      <div className="link-row__inputs">
                        <input
                          type="text"
                          placeholder="Label (e.g. Official Store, Amazon)"
                          value={link.label}
                          onChange={(e) => handleLinkChange(idx, 'label', e.target.value)}
                          className="form-input link-row__label-input"
                          maxLength={100}
                        />
                        <input
                          type="url"
                          placeholder="https://example.com/item"
                          value={link.url}
                          onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                          className={`form-input link-row__url-input ${
                            fieldErrors[`link_${idx}`] ? 'form-input--error' : ''
                          }`}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        className="link-row__remove-btn"
                        onClick={() => handleRemoveLink(idx)}
                        title="Remove link"
                        aria-label={`Remove link ${idx + 1}`}
                      >
                        &times;
                      </button>
                      {fieldErrors[`link_${idx}`] && (
                        <span className="form-error link-row__error">
                          {fieldErrors[`link_${idx}`]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Note Textarea */}
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
              <span className="form-hint">{note.length} / 2000 characters</span>
            </div>
          </div>

          <div className="modal-footer">
            <Button
              type="button"
              variant="ghost"
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

