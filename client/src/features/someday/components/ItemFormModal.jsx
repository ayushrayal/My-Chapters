import { useState, useEffect } from 'react';
import { Button } from '../../../components/common/Button.jsx';
import { Input } from '../../../components/common/Input.jsx';
import { FilterSelect } from '../../../components/common/FilterControl/FilterSelect.jsx';
import { SegmentedFilter } from '../../../components/common/FilterControl/SegmentedFilter.jsx';

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

    const errors = {};
    if (!name.trim()) {
      errors.name = 'Item name is required';
    }
    if (!categoryId) {
      errors.categoryId = 'Category is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        categoryId,
        links: links.filter((l) => l.url.trim() !== ''),
        note: note.trim(),
        status,
        purchaseDate: status === 'PURCHASED' ? (purchaseDate ? new Date(purchaseDate).toISOString() : null) : null
      });
      onClose();
    } catch (err) {
      setFormError(err?.message || 'Failed to save item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="modal-container modal-container--md"
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Window Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#252943', display: 'inline-block' }} />
            <span style={{ width: '8px', height: '8px', backgroundColor: '#252943', display: 'inline-block' }} />
            <span style={{ width: '8px', height: '8px', backgroundColor: '#252943', display: 'inline-block' }} />
            <h2 className="modal-title" style={{ marginLeft: '4px' }}>
              {isEditing ? 'Edit Item' : 'Add Item to Someday'}
            </h2>
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

        {/* Modal Form Body */}
        <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            {formError && (
              <div className="alert alert--error" role="alert">
                <div className="alert__content">
                  <p className="alert__title">Error</p>
                  <p>{formError}</p>
                </div>
              </div>
            )}

            {/* Name Input */}
            <Input
              label="Item Name"
              placeholder="What would you like to own? (e.g. Mechanical Keyboard)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors.name}
            />

            {/* Category Select + Add Category Button */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label htmlFor="item-category" className="form-label">
                  CATEGORY <span className="form-label__required">*</span>
                </label>
                {onOpenAddCategory && (
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={onOpenAddCategory}
                    style={{ height: '28px', minHeight: '28px', fontSize: '11px', padding: '0 8px' }}
                  >
                    + New Category
                  </button>
                )}
              </div>
              <div className="select-wrapper">
                <select
                  id="item-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="form-select"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Collection Status: SegmentedFilter */}
            <div className="form-group">
              <label className="form-label">COLLECTION STATUS</label>
              <SegmentedFilter
                options={[
                  { value: 'PLANNED', label: 'Planned' },
                  { value: 'PURCHASED', label: 'Purchased' }
                ]}
                value={status}
                onChange={setStatus}
              />
            </div>

            {/* Purchase Date (if purchased) */}
            {status === 'PURCHASED' && (
              <div className="form-group">
                <label className="form-label">PURCHASE DATE</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="form-input"
                  style={{
                    border: '2px solid #252943',
                    borderRadius: '6px',
                    height: '48px',
                    padding: '0 12px',
                    backgroundColor: '#FFFFFF',
                    color: '#252943'
                  }}
                />
              </div>
            )}

            {/* Dynamic Links: Max 3 */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label">
                  LINKS ({links.length}/3 max)
                </label>
                {links.length < 3 && (
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={handleAddLink}
                    style={{ height: '28px', minHeight: '28px', fontSize: '11px', padding: '0 8px' }}
                  >
                    + Add Link
                  </button>
                )}
              </div>

              {links.map((link, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    padding: '8px',
                    border: '2px solid #252943',
                    borderRadius: '6px',
                    backgroundColor: '#F5F7FB'
                  }}
                >
                  <input
                    type="text"
                    placeholder="Label (optional)"
                    value={link.label}
                    onChange={(e) => handleLinkChange(idx, 'label', e.target.value)}
                    className="form-input"
                    style={{ height: '36px', minHeight: '36px', width: '120px', border: '1.5px solid #252943', borderRadius: '4px', backgroundColor: '#FFFFFF', padding: '0 8px', fontSize: '12px' }}
                  />
                  <input
                    type="url"
                    placeholder="https://example.com/item"
                    value={link.url}
                    onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                    className="form-input"
                    style={{ height: '36px', minHeight: '36px', flex: 1, border: '1.5px solid #252943', borderRadius: '4px', backgroundColor: '#FFFFFF', padding: '0 8px', fontSize: '12px' }}
                  />
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => handleRemoveLink(idx)}
                    style={{ width: '36px', height: '36px', minHeight: '36px', padding: 0 }}
                    aria-label={`Remove link ${idx + 1}`}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            {/* Note Textarea with character counter */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label">NOTE / DETAILS</label>
                <span className="form-label__counter">{note.length}/500</span>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="Specifications, size, color, or reason to purchase..."
                rows={3}
                className="form-input form-textarea"
                style={{
                  border: '2px solid #252943',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#252943'
                }}
              />
            </div>
          </div>

          {/* Sticky Modal Footer */}
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEditing ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
