import { useState, useEffect, useRef } from 'react';
import {
  CloseIcon,
  PlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon,
  GripVerticalIcon,
  InfoIcon,
  AlertCircleIcon
} from '../../../components/common/Icons.jsx';

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function calculateBlockDuration(startTime, endTime) {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  return Math.max(0, end - start);
}

function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getBlockDurationText(startTime, endTime) {
  if (!startTime || !endTime) return '';
  const dur = calculateBlockDuration(startTime, endTime);
  if (dur <= 0) return 'Invalid';
  return formatMinutes(dur);
}

function findScheduleGaps(blocks) {
  const valid = [...blocks]
    .filter((b) => b.startTime && b.endTime && b.startTime < b.endTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const gaps = [];
  for (let i = 0; i < valid.length - 1; i++) {
    const cur = valid[i];
    const nxt = valid[i + 1];
    if (cur.endTime < nxt.startTime) {
      const gapMins = parseTimeToMinutes(nxt.startTime) - parseTimeToMinutes(cur.endTime);
      if (gapMins > 0) {
        gaps.push({
          fromName: cur.name || `Block #${i + 1}`,
          toName: nxt.name || `Block #${i + 2}`,
          text: formatMinutes(gapMins)
        });
      }
    }
  }
  return gaps;
}

export function TemplateEditorModal({
  isOpen,
  template,
  onClose,
  onSave
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setDescription(template.description || '');
      setBlocks(
        template.blocks && template.blocks.length > 0
          ? template.blocks.map((b) => ({
              id: b._id || b.id || Math.random().toString(),
              name: b.name || '',
              startTime: b.startTime || '09:00',
              endTime: b.endTime || '10:00',
              description: b.description || '',
              notes: b.notes || '',
              tasksRequired: Boolean(b.tasksRequired)
            }))
          : []
      );
    } else {
      setName('');
      setDescription('');
      setBlocks([
        {
          id: Math.random().toString(),
          name: 'Morning Focus',
          startTime: '09:00',
          endTime: '11:00',
          description: '',
          notes: '',
          tasksRequired: false
        }
      ]);
    }
    setError('');
  }, [template, isOpen]);

  // Focus trap / auto-focus & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddBlock = () => {
    const lastBlock = blocks[blocks.length - 1];
    let nextStart = '10:00';
    let nextEnd = '11:00';
    if (lastBlock && lastBlock.endTime) {
      nextStart = lastBlock.endTime;
      const [h, m] = nextStart.split(':').map(Number);
      const nextH = (h + 1) % 24;
      nextEnd = `${String(nextH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
    }

    setBlocks([
      ...blocks,
      {
        id: Math.random().toString(),
        name: '',
        startTime: nextStart,
        endTime: nextEnd,
        description: '',
        notes: '',
        tasksRequired: false
      }
    ]);
  };

  const handleUpdateBlock = (idx, field, value) => {
    const updated = [...blocks];
    updated[idx] = { ...updated[idx], [field]: value };
    setBlocks(updated);
  };

  const handleRemoveBlock = (idx) => {
    setBlocks(blocks.filter((_, i) => i !== idx));
  };

  const handleMoveBlock = (idx, direction) => {
    if (
      (direction === -1 && idx === 0) ||
      (direction === 1 && idx === blocks.length - 1)
    ) {
      return;
    }
    const updated = [...blocks];
    const targetIdx = idx + direction;
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setBlocks(updated);
  };

  // Compute live validation info
  const gaps = findScheduleGaps(blocks);

  // Compute summary stats for footer
  const totalBlocks = blocks.length;
  const mandatoryCount = blocks.filter((b) => b.tasksRequired).length;
  const totalMinutes = blocks.reduce(
    (acc, b) => acc + calculateBlockDuration(b.startTime, b.endTime),
    0
  );
  const totalHoursFormatted = formatMinutes(totalMinutes);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }

    if (blocks.length === 0) {
      setError('A template must have at least one time block.');
      return;
    }

    // Client-side non-overlapping & valid time check
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b.name.trim()) {
        setError(`Block #${i + 1} requires a name.`);
        return;
      }
      if (b.startTime >= b.endTime) {
        setError(
          `Block "${b.name || i + 1}": start time (${b.startTime}) must be earlier than end time (${b.endTime}).`
        );
        return;
      }
      // Check overlap
      for (let j = i + 1; j < blocks.length; j++) {
        const other = blocks[j];
        if (b.startTime < other.endTime && b.endTime > other.startTime) {
          setError(
            `Time overlap detected between "${b.name}" (${b.startTime}-${b.endTime}) and "${other.name}" (${other.startTime}-${other.endTime}).`
          );
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        blocks: blocks.map((b, idx) => ({
          name: b.name.trim(),
          startTime: b.startTime,
          endTime: b.endTime,
          description: b.description?.trim() || '',
          notes: b.notes?.trim() || '',
          tasksRequired: Boolean(b.tasksRequired),
          order: idx
        }))
      };

      await onSave(payload, template?._id || template?.id);
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save template.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="dayflow-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-editor-title"
    >
      <div className="template-editor-modal">
        {/* Sticky Modal Header */}
        <div className="template-editor-modal__header">
          <div className="template-editor-modal__title-group">
            <h2 id="template-editor-title" className="template-editor-modal__title">
              {template ? 'Edit Template' : 'Create Template'}
            </h2>
            <p className="template-editor-modal__subtitle">
              Configure time blocks and requirements for this reusable day routine.
            </p>
          </div>
          <button
            type="button"
            className="template-editor-modal__close-btn"
            onClick={onClose}
            aria-label="Close template modal"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <form id="template-editor-form" onSubmit={handleSubmit} className="template-editor-modal__body">
          {/* Error Banner */}
          {error && (
            <div className="dayflow-banner dayflow-banner--error" role="alert">
              <AlertCircleIcon size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Soft Info Gap Warning */}
          {gaps.length > 0 && (
            <div className="template-editor-modal__gap-banner">
              <InfoIcon size={16} />
              <div>
                {gaps.map((g, idx) => (
                  <p key={idx} className="template-editor-modal__gap-text">
                    Notice: <strong>{g.text}</strong> gap between &ldquo;{g.fromName}&rdquo; and &ldquo;{g.toName}&rdquo;.
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Basic Fields */}
          <div className="template-editor-modal__fields-row">
            <div className="dayflow-form-group">
              <label className="dayflow-form-label" htmlFor="template-name">
                Template Name *
              </label>
              <input
                ref={nameInputRef}
                id="template-name"
                type="text"
                className="dayflow-input"
                placeholder="e.g. Deep Work Day, Study Sprint, Creative Saturday"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="dayflow-form-group">
              <label className="dayflow-form-label" htmlFor="template-desc">
                Description (Optional)
              </label>
              <input
                id="template-desc"
                type="text"
                className="dayflow-input"
                placeholder="When to use this routine (e.g. 4-hour morning sprint + afternoon review)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Time Blocks List */}
          <div className="template-editor-modal__blocks-section">
            <div className="template-editor-modal__blocks-header">
              <h3 className="template-editor-modal__blocks-title">Time Blocks</h3>
              <span className="template-editor-modal__blocks-counter">
                {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'} configured
              </span>
            </div>

            <div className="template-editor-modal__blocks-list">
              {blocks.map((b, idx) => {
                const durationText = getBlockDurationText(b.startTime, b.endTime);
                const isInvalidTimes = b.startTime && b.endTime && b.startTime >= b.endTime;

                return (
                  <div key={b.id || idx} className="template-block-card">
                    {/* Top Row: Drag Handle, Ordering Chevrons, Duration Badge, Remove Button */}
                    <div className="template-block-card__top">
                      <div className="template-block-card__drag-group">
                        <span className="template-block-card__drag-handle" title="Block position" aria-hidden="true">
                          <GripVerticalIcon size={16} />
                        </span>
                        <div className="template-block-card__reorder-btns">
                          <button
                            type="button"
                            className="template-block-card__btn-reorder"
                            onClick={() => handleMoveBlock(idx, -1)}
                            disabled={idx === 0}
                            title="Move Block Up"
                            aria-label="Move Block Up"
                          >
                            <ChevronUpIcon size={12} />
                          </button>
                          <button
                            type="button"
                            className="template-block-card__btn-reorder"
                            onClick={() => handleMoveBlock(idx, 1)}
                            disabled={idx === blocks.length - 1}
                            title="Move Block Down"
                            aria-label="Move Block Down"
                          >
                            <ChevronDownIcon size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="template-block-card__top-right">
                        {durationText && (
                          <span
                            className={`template-block-card__duration-badge ${
                              isInvalidTimes ? 'template-block-card__duration-badge--invalid' : ''
                            }`}
                          >
                            {durationText}
                          </span>
                        )}

                        <button
                          type="button"
                          className="template-block-card__btn-remove"
                          onClick={() => handleRemoveBlock(idx)}
                          title="Remove block"
                          aria-label={`Remove block ${b.name || idx + 1}`}
                        >
                          <TrashIcon size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Main Row: Block Name and Start/End Times */}
                    <div className="template-block-card__main-inputs">
                      <div className="template-block-card__name-col">
                        <input
                          type="text"
                          className="dayflow-input dayflow-input--sm"
                          placeholder="Block Name (e.g. Deep Work Sprint)"
                          value={b.name}
                          onChange={(e) => handleUpdateBlock(idx, 'name', e.target.value)}
                          required
                        />
                      </div>

                      <div className="template-block-card__times-col">
                        <input
                          type="time"
                          className="dayflow-input dayflow-input--sm"
                          value={b.startTime}
                          onChange={(e) => handleUpdateBlock(idx, 'startTime', e.target.value)}
                          required
                        />
                        <span className="template-block-card__time-separator">to</span>
                        <input
                          type="time"
                          className="dayflow-input dayflow-input--sm"
                          value={b.endTime}
                          onChange={(e) => handleUpdateBlock(idx, 'endTime', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Inline Invalid Time Warning */}
                    {isInvalidTimes && (
                      <p className="template-block-card__time-error">
                        End time ({b.endTime}) must be later than start time ({b.startTime}).
                      </p>
                    )}

                    {/* Description field */}
                    <div className="template-block-card__desc-row">
                      <input
                        type="text"
                        className="dayflow-input dayflow-input--sm"
                        placeholder="Focus notes or block purpose (optional)"
                        value={b.description}
                        onChange={(e) => handleUpdateBlock(idx, 'description', e.target.value)}
                      />
                    </div>

                    {/* Switch Toggle for Tasks Required */}
                    <div className="template-block-card__toggle-row">
                      <label className="switch-toggle" htmlFor={`task-req-${idx}`}>
                        <input
                          id={`task-req-${idx}`}
                          type="checkbox"
                          className="switch-toggle__input"
                          checked={b.tasksRequired}
                          onChange={(e) => handleUpdateBlock(idx, 'tasksRequired', e.target.checked)}
                        />
                        <span className="switch-toggle__slider" />
                        <div className="switch-toggle__text">
                          <span className="switch-toggle__title">Tasks required</span>
                          <span className="switch-toggle__hint">
                            Mandatory block: tasks must be completed before finishing the day
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })}

              {/* + Add Block full-width dashed button */}
              <button
                type="button"
                className="template-editor-modal__add-block-btn"
                onClick={handleAddBlock}
                aria-label="+ Add Block"
              >
                <PlusIcon size={16} /> Add Block
              </button>
            </div>
          </div>
        </form>

        {/* Sticky Modal Footer */}
        <div className="template-editor-modal__footer">
          <div className="template-editor-modal__footer-summary">
            <span>{totalBlocks} {totalBlocks === 1 ? 'block' : 'blocks'}</span>
            <span className="template-editor-modal__summary-dot">•</span>
            <span>{mandatoryCount} mandatory</span>
            <span className="template-editor-modal__summary-dot">•</span>
            <span>{totalHoursFormatted} total</span>
          </div>

          <div className="template-editor-modal__footer-actions">
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
              form="template-editor-form"
              className="btn btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
