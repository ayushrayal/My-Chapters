import { useState } from 'react';
import {
  PlusIcon,
  CloseIcon,
  CheckIcon,
  EditIcon,
  TrashIcon,
  LockIcon,
  CircleIcon,
  MoreHorizontalIcon
} from '../../../components/common/Icons.jsx';

export function DailyTimeline({
  schedule,
  onOpenTaskModal,
  onOpenSkipModal,
  onCompleteTask,
  onDeleteTask,
  onCreateTaskQuick
}) {
  const [filterBlockId, setFilterBlockId] = useState('ALL');
  // Tracks inline task creation per block: blockId -> boolean
  const [inlineBlockId, setInlineBlockId] = useState(null);
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');
  // Mobile dropdown state for task actions: taskId -> boolean
  const [activeMenuTaskId, setActiveMenuTaskId] = useState(null);

  if (!schedule || (!schedule.blocks?.length && !schedule.tasks?.length)) {
    return (
      <div className="dayflow-empty-state dayflow-empty-state--hero">
        <div className="dayflow-empty-state__icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M12 14v4" />
            <path d="M10 16h4" />
          </svg>
        </div>
        <h3 className="dayflow-empty-state__title">Plan Your Day with Dayflow</h3>
        <p className="dayflow-empty-state__description">
          Apply a template to get started, or add your first routine block to begin tracking your day.
        </p>
      </div>
    );
  }

  const blocks = schedule.blocks || [];
  const tasks = schedule.tasks || [];
  const isFinished = schedule.isFinished;

  const filteredBlocks =
    filterBlockId === 'ALL'
      ? blocks
      : blocks.filter((b) => (b._id || b.id) === filterBlockId);

  const handleStartInline = (bId) => {
    setInlineBlockId(bId);
    setInlineTaskTitle('');
  };

  const handleCancelInline = () => {
    setInlineBlockId(null);
    setInlineTaskTitle('');
  };

  const handleSaveInline = async (bId) => {
    if (!inlineTaskTitle.trim()) {
      handleCancelInline();
      return;
    }
    if (onCreateTaskQuick) {
      await onCreateTaskQuick({
        blockId: bId,
        title: inlineTaskTitle.trim()
      });
    } else {
      onOpenTaskModal(null, bId);
    }
    handleCancelInline();
  };

  const handleKeyDownInline = (e, bId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveInline(bId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelInline();
    }
  };

  return (
    <div className="daily-timeline-redesign">
      {/* 1. BLOCK FILTER BAR: single-line horizontally scrollable chip row with edge fade & badge counts */}
      {blocks.length > 1 && (
        <div className="block-filter-scroll-wrapper">
          <div className="block-filter-bar" role="tablist" aria-label="Filter timeline by time block">
            <button
              type="button"
              className={`block-filter-chip ${filterBlockId === 'ALL' ? 'block-filter-chip--active' : ''}`}
              onClick={() => setFilterBlockId('ALL')}
              role="tab"
              aria-selected={filterBlockId === 'ALL'}
            >
              <span>All Blocks</span>
              <span className="block-filter-chip__count">{tasks.length}</span>
            </button>

            {blocks.map((block) => {
              const bId = block._id || block.id;
              const count = tasks.filter((t) => t.blockId === bId).length;
              return (
                <button
                  key={bId}
                  type="button"
                  className={`block-filter-chip ${filterBlockId === bId ? 'block-filter-chip--active' : ''}`}
                  onClick={() => setFilterBlockId(bId)}
                  role="tab"
                  aria-selected={filterBlockId === bId}
                >
                  <span className="block-filter-chip__label">{block.name}</span>
                  <span className="block-filter-chip__count">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="block-filter-scroll-fade" aria-hidden="true" />
        </div>
      )}

      {/* 2. VERTICAL TIMELINE OF BLOCKS */}
      <div className="timeline-stream">
        {filteredBlocks.map((block, index) => {
          const bId = block._id || block.id;
          const blockTasks = tasks.filter((t) => t.blockId === bId);
          const hasMandatoryRequirement = block.tasksRequired;
          const isEmpty = blockTasks.length === 0;

          // Block states: past, current, upcoming
          const isCurrent = block.status === 'CURRENT';
          const isPast = block.status === 'PAST' || (block.status === 'PENDING' && !isCurrent);

          const blockStateClass = isCurrent
            ? 'timeline-node--current'
            : isPast
            ? 'timeline-node--past'
            : 'timeline-node--upcoming';

          const isLastBlock = index === filteredBlocks.length - 1;

          return (
            <div
              key={bId}
              className={`timeline-node ${blockStateClass}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Left Column: 56px wide time column + thin vertical continuous line & dot */}
              <div className="timeline-node__time-col">
                <span className="timeline-node__start-time">{block.startTime}</span>
                <span className="timeline-node__end-time">{block.endTime}</span>
                <div className="timeline-node__track">
                  <span className="timeline-node__dot" />
                  {!isLastBlock && <span className="timeline-node__line" />}
                </div>
              </div>

              {/* Right Column: Block Card */}
              <div className="timeline-node__card">
                {/* Block Card Header: Clean Flex Row */}
                <div className="timeline-node__header">
                  <div className="timeline-node__header-left">
                    <h3 className="timeline-node__title">{block.name}</h3>

                    {/* Time Pill for Mobile (e.g. 08:30 – 09:00) */}
                    <span className="block-time-pill-mobile">
                      {block.startTime} – {block.endTime}
                    </span>

                    {/* Chips: Mandatory (ink-outline) and NOW (lime pill) */}
                    {hasMandatoryRequirement && (
                      <span className="badge-mandatory-outline" title="At least one task required in this block">
                        <LockIcon size={12} />
                        <span>Mandatory</span>
                      </span>
                    )}
                    {isCurrent && (
                      <span className="badge-now">NOW</span>
                    )}
                  </div>

                  {/* Header right: Compact "+" icon button on mobile, with ghost text on desktop */}
                  {!isFinished && inlineBlockId !== bId && (
                    <button
                      type="button"
                      className="btn-ghost-sm block-add-task-btn"
                      onClick={() => handleStartInline(bId)}
                      aria-label={`+ Add task to ${block.name}`}
                    >
                      <PlusIcon size={16} />
                      <span className="block-add-task-btn__text">+ Add task</span>
                    </button>
                  )}
                </div>

                {block.description && (
                  <p className="timeline-node__desc">{block.description}</p>
                )}

                {/* Inline task input form (when active) */}
                {!isFinished && inlineBlockId === bId && (
                  <div className="inline-task-input-box">
                    <input
                      type="text"
                      className="inline-task-input"
                      placeholder="Task name... (Enter to save, Esc to cancel)"
                      value={inlineTaskTitle}
                      onChange={(e) => setInlineTaskTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyDownInline(e, bId)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="inline-task-btn inline-task-btn--save"
                      onClick={() => handleSaveInline(bId)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="inline-task-btn inline-task-btn--cancel"
                      onClick={handleCancelInline}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* EMPTY BLOCK: Slim row with "No tasks scheduled" in muted text */}
                {isEmpty ? (
                  <div className="timeline-node__empty-slim">
                    <span className="timeline-node__empty-text">
                      {hasMandatoryRequirement ? '⚠️ Requires task' : 'No tasks scheduled'}
                    </span>
                    {!isFinished && inlineBlockId !== bId && (
                      <button
                        type="button"
                        className="btn-icon btn-icon--sm block-empty-plus-btn"
                        onClick={() => handleStartInline(bId)}
                        aria-label={`Add task to ${block.name}`}
                      >
                        <PlusIcon size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  /* TASK ROWS */
                  <div className="timeline-node__tasks-list">
                    {blockTasks.map((task) => {
                      const taskId = task._id || task.id;
                      const isCompleted = task.status === 'COMPLETED';
                      const isSkipped = task.status === 'SKIPPED';
                      const isMenuOpen = activeMenuTaskId === taskId;

                      return (
                        <div
                          key={taskId}
                          className={`task-row task-row--${task.status.toLowerCase()} ${
                            isCompleted ? 'task-row--completed' : ''
                          }`}
                        >
                          {/* Row 1: Circular complete toggle (24px) */}
                          <div className="task-row__col-toggle">
                            {isCompleted ? (
                              <span className="task-row__check-circle" title="Completed">
                                <CheckIcon size={13} />
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="task-row__toggle-btn"
                                onClick={() => {
                                  if (!isFinished && !isCompleted && !isSkipped) {
                                    onCompleteTask(taskId);
                                  }
                                }}
                                disabled={isFinished || isCompleted || isSkipped}
                                aria-label="Toggle complete"
                                title="Toggle complete"
                              >
                                <CircleIcon size={20} className="task-row__toggle-icon" />
                              </button>
                            )}
                          </div>

                          {/* Row 1: Task title (min-width: 0, wraps normally, 15px) */}
                          <div className="task-row__col-title">
                            <span className={`task-row__title ${isCompleted ? 'task-row__title--done' : ''}`}>
                              {task.title}
                            </span>
                            {task.description && (
                              <p className="task-row__desc">{task.description}</p>
                            )}
                          </div>

                          {/* Row 1: Desktop tools vs Mobile "..." menu icon button (40px) */}
                          <div className="task-row__col-menu">
                            {/* Desktop ONLY tools */}
                            {!isFinished && (
                              <div className="task-row__desktop-tools">
                                <button
                                  type="button"
                                  className="btn-icon btn-icon--sm"
                                  onClick={() => onOpenTaskModal(task, bId)}
                                  title="Edit Task"
                                  aria-label={`Edit task ${task.title}`}
                                >
                                  <EditIcon size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon btn-icon--sm btn-icon--danger"
                                  onClick={() => onDeleteTask(taskId)}
                                  title="Delete Task"
                                  aria-label={`Delete task ${task.title}`}
                                >
                                  <TrashIcon size={14} />
                                </button>
                              </div>
                            )}

                            {/* Mobile ONLY: "..." menu */}
                            {!isFinished && (
                              <div className="task-row__mobile-tools">
                                <button
                                  type="button"
                                  className="btn-icon btn-icon--touch"
                                  onClick={() => setActiveMenuTaskId(isMenuOpen ? null : taskId)}
                                  aria-label="More task actions"
                                  aria-expanded={isMenuOpen}
                                >
                                  <MoreHorizontalIcon size={18} />
                                </button>

                                {isMenuOpen && (
                                  <div className="task-row__dropdown-menu">
                                    <button
                                      type="button"
                                      className="task-row__dropdown-item"
                                      onClick={() => {
                                        setActiveMenuTaskId(null);
                                        onOpenTaskModal(task, bId);
                                      }}
                                    >
                                      <EditIcon size={14} /> <span>Edit Task</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="task-row__dropdown-item task-row__dropdown-item--danger"
                                      onClick={() => {
                                        setActiveMenuTaskId(null);
                                        onDeleteTask(taskId);
                                      }}
                                    >
                                      <TrashIcon size={14} /> <span>Delete Task</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Row 2 (Column 2): Status chip + completed-at time as small muted text, on one line */}
                          <div className="task-row__col-meta">
                            <span className={`task-status-chip task-status-chip--${task.status.toLowerCase()}`}>
                              {task.status}
                            </span>

                            {isCompleted && task.completedAt && (
                              <span className="task-row__completed-time">
                                Completed at {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}

                            {isSkipped && (
                              <span className="task-row__skip-reason">
                                Reason: {task.skippedReason || 'No reason provided'}
                              </span>
                            )}
                          </div>

                          {/* Row 3 (Column 2 to 3, for current/upcoming tasks only): Complete & Skip equal buttons */}
                          {!isFinished && !isCompleted && !isSkipped && (
                            <div className="task-row__col-buttons">
                              <button
                                type="button"
                                className="btn btn--primary task-row__complete-btn"
                                onClick={() => onCompleteTask(taskId)}
                                aria-label={`Mark "${task.title}" complete`}
                              >
                                <CheckIcon size={16} />
                                <span>Complete</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn--outline task-row__skip-btn"
                                onClick={() => onOpenSkipModal(task)}
                                aria-label={`Skip "${task.title}" with reason`}
                              >
                                <span>Skip</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
