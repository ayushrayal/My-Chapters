import { useState, useEffect } from 'react';
import { CloseIcon } from '../../../components/common/Icons.jsx';

export function GoodBitModal({
  isOpen,
  entry = null,
  initialDate,
  todayStr,
  onClose,
  onSave,
  isSaving = false
}) {
  const [date, setDate] = useState(initialDate || todayStr);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setDate(entry.date || initialDate || todayStr);
        setTitle(entry.title || '');
        setDescription(entry.description || '');
      } else {
        setDate(initialDate || todayStr);
        setTitle('');
        setDescription('');
      }
      setError('');
    }
  }, [isOpen, entry, initialDate, todayStr]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please write about what happened. A description is required.');
      return;
    }
    if (date > todayStr) {
      setError('Future-dated entries are not allowed. Please choose today or a past date.');
      return;
    }

    setError('');
    try {
      await onSave({
        date,
        title: title.trim(),
        description: description.trim()
      });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save Good Bit');
    }
  };

  const isEdit = Boolean(entry);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-container goodbits-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 className="modal-title">
              {isEdit ? 'Edit Good Bit' : 'Record a Good Bit'}
            </h3>
            <p className="modal-subtitle">
              Capture a positive moment, achievement, or memory.
            </p>
          </div>
          <button
            type="button"
            className="icon-btn modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="modal-body goodbits-modal__form">
          {error && <div className="goodbits-form-error">{error}</div>}

          {/* Date Field */}
          <div className="form-group">
            <label htmlFor="goodbit-date" className="form-label">
              Date
            </label>
            <input
              id="goodbit-date"
              type="date"
              className="input"
              value={date}
              max={todayStr}
              onChange={(e) => setDate(e.target.value)}
              disabled={isEdit}
              required
            />
            {isEdit && (
              <span className="form-help-text">
                The date of an existing Good Bit cannot be changed.
              </span>
            )}
          </div>

          {/* Title Field (Optional) */}
          <div className="form-group">
            <label htmlFor="goodbit-title" className="form-label">
              Title <span className="form-label-optional">(Optional)</span>
            </label>
            <input
              id="goodbit-title"
              type="text"
              className="input"
              placeholder="e.g. Great moment at the office, morning run..."
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description Field (Required, Multiline) */}
          <div className="form-group">
            <label htmlFor="goodbit-desc" className="form-label">
              What happened? <span className="form-label-required">*</span>
            </label>
            <textarea
              id="goodbit-desc"
              className="textarea goodbits-modal__textarea"
              placeholder="Write about what happened today. What made this moment special? How did it make you feel?"
              value={description}
              maxLength={5000}
              rows={6}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <div className="goodbits-char-counter">
              <span>{description.length} / 5000</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn--outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSaving || !description.trim()}
            >
              {isSaving ? 'Saving...' : isEdit ? 'Update Memory' : 'Save Good Bit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
