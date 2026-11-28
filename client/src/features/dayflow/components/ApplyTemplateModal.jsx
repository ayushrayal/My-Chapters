import { useState, useEffect } from 'react';
import {
  CloseIcon,
  PlusIcon
} from '../../../components/common/Icons.jsx';
import {
  getLocalDateString,
  getDateRangeArray
} from '../../../utils/date-utils.js';

export function ApplyTemplateModal({
  isOpen,
  template,
  currentDate,
  onClose,
  onApply
}) {
  const [targetDate, setTargetDate] = useState('');
  const [applyRange, setApplyRange] = useState(false);
  const [endDate, setEndDate] = useState('');
  // Map of blockId -> Array of task items: [{ id: string, title: string }]
  const [blockTasks, setBlockTasks] = useState({});
  const [error, setError] = useState('');
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Default to the user's currently selected date (or local today)
    const initialDate = currentDate || getLocalDateString();
    setTargetDate(initialDate);
    setEndDate(initialDate);
    setApplyRange(false);
    setShowOverwriteConfirm(false);
    setError('');

    if (template && template.blocks) {
      const initialMap = {};
      template.blocks.forEach((b) => {
        const bId = (b._id || b.id)?.toString();
        initialMap[bId] = b.tasksRequired
          ? [{ id: Math.random().toString(), title: '' }]
          : [];
      });
      setBlockTasks(initialMap);
    }
  }, [template, currentDate, isOpen]);

  if (!isOpen || !template) return null;

  const blocks = template.blocks || [];
  const mandatoryBlocks = blocks.filter((b) => b.tasksRequired);

  const handleAddTaskInput = (blockId) => {
    setBlockTasks((prev) => ({
      ...prev,
      [blockId]: [...(prev[blockId] || []), { id: Math.random().toString(), title: '' }]
    }));
  };

  const handleTaskTitleChange = (blockId, taskItemId, newTitle) => {
    setBlockTasks((prev) => ({
      ...prev,
      [blockId]: (prev[blockId] || []).map((item) =>
        item.id === taskItemId ? { ...item, title: newTitle } : item
      )
    }));
  };

  const handleRemoveTaskInput = (blockId, taskItemId) => {
    setBlockTasks((prev) => ({
      ...prev,
      [blockId]: (prev[blockId] || []).filter((item) => item.id !== taskItemId)
    }));
  };

  const handleTargetDateChange = (newDate) => {
    setTargetDate(newDate);
    setShowOverwriteConfirm(false);
    setError('');
    if (!endDate || endDate < newDate) {
      setEndDate(newDate);
    }
  };

  const handleSubmit = async (e, forceOverwrite = false) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setError('');

    if (!targetDate) {
      setError('Please select a target date.');
      return;
    }

    if (applyRange && (!endDate || endDate < targetDate)) {
      setError('End date must be on or after start date.');
      return;
    }

    // Verify all mandatory blocks have at least one non-empty task
    for (const b of mandatoryBlocks) {
      const bId = (b._id || b.id)?.toString();
      const tasksForBlock = (blockTasks[bId] || []).filter((t) => t.title && t.title.trim().length > 0);
      if (tasksForBlock.length === 0) {
        setError(`Block "${b.name}" requires at least one task before the template can be applied.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const tasksToSeed = [];
      Object.entries(blockTasks).forEach(([bId, taskItems]) => {
        taskItems.forEach((item) => {
          if (item.title && item.title.trim()) {
            tasksToSeed.push({
              blockId: bId,
              title: item.title.trim(),
              description: '',
              notes: ''
            });
          }
        });
      });

      if (typeof onApply !== 'function') {
        throw new Error('Apply action handler is not available.');
      }

      const targetDates = applyRange && endDate && endDate >= targetDate
        ? getDateRangeArray(targetDate, endDate)
        : [targetDate];

      await onApply({
        templateId: template._id || template.id,
        targetDate,
        targetDates,
        applyRange,
        endDate: applyRange ? endDate : undefined,
        overwrite: forceOverwrite,
        tasks: tasksToSeed
      });

      setShowOverwriteConfirm(false);
      onClose();
    } catch (err) {
      const status = err.response?.status || err.status || err.statusCode;
      const msg = err.response?.data?.message || err.message || 'Failed to apply template.';
      if (status === 409 || /already exists/i.test(msg) || /confirm overwrite/i.test(msg)) {
        setShowOverwriteConfirm(true);
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dayflow-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="apply-template-title">
      <div className="dayflow-modal-card dayflow-modal-card--lg">
        <div className="dayflow-modal-card__header">
          <h2 id="apply-template-title" className="dayflow-modal-card__title">
            Apply Template: {template.name}
          </h2>
          <button
            type="button"
            className="dayflow-modal-card__close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {error && !showOverwriteConfirm && (
          <div className="dayflow-banner dayflow-banner--error" role="alert">
            {error}
          </div>
        )}

        {showOverwriteConfirm && (
          <div
            className="dayflow-banner dayflow-banner--warning"
            role="alert"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: '#FEF3C7',
              borderColor: '#252943'
            }}
          >
            <p style={{ margin: 0, fontWeight: 800, color: '#252943' }}>
              ⚠️ A schedule already exists for {targetDate}.
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#252943' }}>
              Confirming overwrite will replace this day's routine and tasks with the template.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => handleSubmit(null, true)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Replacing...' : 'Confirm Overwrite & Apply'}
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setShowOverwriteConfirm(false)}
                disabled={isSubmitting}
              >
                Keep Existing (Cancel)
              </button>
            </div>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="dayflow-modal-form">
          <div className="dayflow-form-group">
            <label className="dayflow-form-label" htmlFor="apply-target-date">
              Select Target Date *
            </label>
            <input
              id="apply-target-date"
              type="date"
              className="dayflow-input"
              value={targetDate}
              onChange={(e) => handleTargetDateChange(e.target.value)}
              required
            />
          </div>

          <div className="dayflow-form-group">
            <label className="template-block-editor-row__checkbox-label">
              <input
                type="checkbox"
                checked={applyRange}
                onChange={(e) => setApplyRange(e.target.checked)}
              />
              <span>Apply to a date range (multiple days)</span>
            </label>
          </div>

          {applyRange && (
            <div className="dayflow-form-group">
              <label className="dayflow-form-label" htmlFor="apply-end-date">
                Range End Date *
              </label>
              <input
                id="apply-end-date"
                type="date"
                className="dayflow-input"
                min={targetDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          )}

          {/* Time blocks task configuration */}
          <div className="apply-template-mandatory-section">
            <h3 className="apply-template-mandatory-section__title">
              Block Tasks Configuration
            </h3>
            <p className="apply-template-mandatory-section__hint">
              Assign initial tasks to each time block. Blocks marked with <strong>*</strong> must contain at least one task.
            </p>

            <div className="apply-template-blocks-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {blocks.map((b) => {
                const bId = (b._id || b.id)?.toString();
                const items = blockTasks[bId] || [];
                const isMandatory = b.tasksRequired;

                return (
                  <div
                    key={bId}
                    className="apply-template-block-box"
                    style={{
                      padding: '14px',
                      backgroundColor: '#F8FAFD',
                      borderRadius: '10px',
                      border: '1px solid #E6E9F2'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <label className="dayflow-form-label" style={{ margin: 0 }}>
                        {b.name} ({b.startTime} - {b.endTime}) {isMandatory ? <span style={{ color: '#3A4EFB' }}>*</span> : null}
                      </label>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => handleAddTaskInput(bId)}
                        aria-label="+ Add Task"
                      >
                        <PlusIcon size={14} /> Add Task
                      </button>
                    </div>

                    {items.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'rgba(37, 41, 67, 0.6)', margin: '4px 0' }}>
                        {isMandatory ? 'ℹ️ At least one task is required for this block.' : 'No tasks assigned yet (optional).'}
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map((taskItem, idx) => (
                          <div key={taskItem.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="dayflow-input dayflow-input--sm"
                              placeholder={`Task #${idx + 1} for ${b.name}`}
                              value={taskItem.title}
                              onChange={(e) => handleTaskTitleChange(bId, taskItem.id, e.target.value)}
                              required={isMandatory && items.length === 1}
                            />
                            <button
                              type="button"
                              className="btn-icon btn-icon--sm btn-icon--danger"
                              onClick={() => handleRemoveTaskInput(bId, taskItem.id)}
                              title="Remove Task"
                              aria-label={`Remove Task ${idx + 1}`}
                            >
                              <CloseIcon size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
              {isSubmitting ? 'Applying...' : 'Apply Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
