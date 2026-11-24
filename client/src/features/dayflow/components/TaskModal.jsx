import { useState, useEffect } from 'react';
import { CloseIcon } from '../../../components/common/Icons.jsx';

export function TaskModal({
  isOpen,
  task,
  initialBlockId,
  blocks = [],
  onClose,
  onSave
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [blockId, setBlockId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setNotes(task.notes || '');
      setBlockId(task.blockId || (blocks[0] ? (blocks[0]._id || blocks[0].id) : ''));
    } else {
      setTitle('');
      setDescription('');
      setNotes('');
      setBlockId(initialBlockId || (blocks[0] ? (blocks[0]._id || blocks[0].id) : ''));
    }
    setError('');
  }, [task, initialBlockId, blocks, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    if (!blockId) {
      setError('Please select a time block.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(
        {
          title: title.trim(),
          description: description.trim(),
          notes: notes.trim(),
          blockId
        },
        task?._id || task?.id
      );
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save task.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dayflow-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
      <div className="dayflow-modal-card">
        <div className="dayflow-modal-card__header">
          <h2 id="task-modal-title" className="dayflow-modal-card__title">
            {task ? 'Edit Task' : 'Add Task'}
          </h2>
          <button
            type="button"
            className="dayflow-modal-card__close-btn"
            onClick={onClose}
            aria-label="Close task modal"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {error && (
          <div className="dayflow-banner dayflow-banner--error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="dayflow-modal-form">
          <div className="dayflow-form-group">
            <label className="dayflow-form-label" htmlFor="task-block">
              Time Block *
            </label>
            <select
              id="task-block"
              className="dayflow-select"
              value={blockId}
              onChange={(e) => setBlockId(e.target.value)}
              required
            >
              {blocks.map((b) => {
                const bId = b._id || b.id;
                return (
                  <option key={bId} value={bId}>
                    {b.name} ({b.startTime} - {b.endTime})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="dayflow-form-group">
            <label className="dayflow-form-label" htmlFor="task-title">
              Task Title *
            </label>
            <input
              id="task-title"
              type="text"
              className="dayflow-input"
              placeholder="e.g. Complete quarterly financial review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="dayflow-form-group">
            <label className="dayflow-form-label" htmlFor="task-desc">
              Description (Optional)
            </label>
            <input
              id="task-desc"
              type="text"
              className="dayflow-input"
              placeholder="Context, subtasks or deliverable link"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="dayflow-form-group">
            <label className="dayflow-form-label" htmlFor="task-notes">
              Personal Notes (Optional)
            </label>
            <textarea
              id="task-notes"
              className="dayflow-textarea"
              rows={2}
              placeholder="Quick notes or reminders"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="dayflow-modal-card__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : task ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
