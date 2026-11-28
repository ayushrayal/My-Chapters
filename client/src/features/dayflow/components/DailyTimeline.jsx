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
import { FolderCard } from '../../../components/common/WindowCard.jsx';
import { FilterChips } from '../../../components/common/FilterControl/FilterChips.jsx';

export function DailyTimeline({
  schedule,
  onOpenTaskModal,
  onOpenSkipModal,
  onCompleteTask,
  onRevertTaskToPending,
  onDeleteTask,
  onCreateTaskQuick
}) {
  const [filterBlockId, setFilterBlockId] = useState('ALL');
  const [inlineBlockId, setInlineBlockId] = useState(null);
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');
  const [activeMenuTaskId, setActiveMenuTaskId] = useState(null);

  if (!schedule || (!schedule.blocks?.length && !schedule.tasks?.length)) {
    return (
      <div className="empty-state" style={{ padding: '36px 20px' }}>
        <div className="empty-state__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M12 14v4" />
            <path d="M10 16h4" />
          </svg>
        </div>
        <h3 className="empty-state__title">Plan Your Day with Dayflow</h3>
        <p className="empty-state__subtitle">
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
    <div className="daily-timeline-redesign" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. BLOCK FILTER BAR: FilterChips in single-line scroll */}
      {blocks.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', padding: '2px 0 6px' }}>
          <FilterChips
            options={[
              { value: 'ALL', label: 'All Blocks', badge: tasks.length },
              ...blocks.map((block) => {
                const bId = block._id || block.id;
                const count = tasks.filter((t) => t.blockId === bId).length;
                return {
                  value: bId,
                  label: block.name,
                  badge: count
                };
              })
            ]}
            value={filterBlockId}
            onChange={setFilterBlockId}
          />
        </div>
      )}

      {/* 2. TIMELINE BLOCKS AS FOLDER CARDS */}
      <div className="timeline-stream" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredBlocks.map((block) => {
          const bId = block._id || block.id;
          const bIdStr = (block.id || block._id)?.toString();
          const blockTasks = tasks.filter((t) => {
            const tBlockId = (t.blockId?._id || t.blockId?.id || t.blockId)?.toString();
            return tBlockId === bIdStr;
          });
          const hasMandatoryRequirement = block.tasksRequired;
          const isEmpty = blockTasks.length === 0;
          const isCurrent = block.status === 'CURRENT';

          return (
            <FolderCard
              key={bId}
              tabLabel={`${block.startTime} – ${block.endTime}`}
              tabColor={isCurrent ? 'lime' : 'blue'}
              style={{
                borderLeft: isCurrent ? '6px solid #3A4EFB' : '2px solid #252943',
                backgroundColor: isEmpty ? '#F5F7FB' : '#FFFFFF'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Block Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#252943' }}>
                      {block.name}
                    </h3>

                    {hasMandatoryRequirement && (
                      <span className="neo-tag neo-tag--canvas" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <LockIcon size={12} />
                        <span>Mandatory</span>
                      </span>
                    )}

                    {isCurrent && (
                      <span className="neo-sticker" style={{ fontSize: '10px', padding: '2px 6px' }}>
                        NOW
                      </span>
                    )}
                  </div>

                  {/* Header Right: "+" Add Task Icon button */}
                  {!isFinished && inlineBlockId !== bId && (
                    <button
                      type="button"
                      className="btn btn--sm btn--secondary"
                      onClick={() => handleStartInline(bId)}
                      aria-label={`+ Add task to ${block.name}`}
                      style={{ height: '32px', minHeight: '32px', padding: '0 10px', fontSize: '12px' }}
                    >
                      <PlusIcon size={14} />
                      <span>Add task</span>
                    </button>
                  )}
                </div>

                {block.description && (
                  <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.7)', margin: 0, lineHeight: 1.4 }}>
                    {block.description}
                  </p>
                )}

                {/* Inline task input form */}
                {!isFinished && inlineBlockId === bId && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      border: '2px solid #252943',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '2px 2px 0 #252943'
                    }}
                  >
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Task name... (Enter to save, Esc to cancel)"
                      value={inlineTaskTitle}
                      onChange={(e) => setInlineTaskTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyDownInline(e, bId)}
                      autoFocus
                      style={{ height: '36px', minHeight: '36px', padding: '0 8px', fontSize: '13px', border: '1px solid #252943', borderRadius: '4px' }}
                    />
                    <button
                      type="button"
                      className="btn btn--sm btn--primary"
                      onClick={() => handleSaveInline(bId)}
                      style={{ height: '36px', minHeight: '36px' }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--secondary"
                      onClick={handleCancelInline}
                      style={{ height: '36px', minHeight: '36px' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* EMPTY BLOCK: Slim row with dashed border */}
                {isEmpty ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      border: '2px dashed #252943',
                      borderRadius: '6px',
                      backgroundColor: '#F5F7FB',
                      color: 'rgba(37,41,67,0.6)',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    <span>{hasMandatoryRequirement ? '⚠️ Requires task' : 'No tasks scheduled'}</span>
                    {!isFinished && inlineBlockId !== bId && (
                      <button
                        type="button"
                        className="btn btn--sm btn--secondary"
                        onClick={() => handleStartInline(bId)}
                        aria-label={`Add task to ${block.name}`}
                        style={{ width: '32px', height: '32px', minHeight: '32px', padding: 0 }}
                      >
                        <PlusIcon size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  /* TASK ROWS */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {blockTasks.map((task, taskIndex) => {
                      const taskId = task._id || task.id;
                      const isCompleted = task.status === 'COMPLETED';
                      const isSkipped = task.status === 'SKIPPED';
                      const isMenuOpen = activeMenuTaskId === taskId;
                      const isMandatory = task.isMandatory || task.mandatory || (hasMandatoryRequirement && taskIndex === 0);

                      return (
                        <div
                          key={taskId}
                          className="task-row"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            padding: '12px 14px',
                            border: '2px solid #252943',
                            borderLeft: isCompleted ? '6px solid #168B68' : isSkipped ? '6px solid #DC2626' : '2px solid #252943',
                            borderRadius: '8px',
                            backgroundColor: isCompleted ? '#F5F7FB' : '#FFFFFF',
                            boxShadow: '2px 2px 0 #252943',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          {/* A. Task Header: Checkbox + Title + Mandatory Badge + "..." Menu */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                              {/* Square 28px Checkbox */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isFinished) {
                                    if (isCompleted && onRevertTaskToPending) {
                                      onRevertTaskToPending(taskId);
                                    } else {
                                      onCompleteTask(taskId);
                                    }
                                  }
                                }}
                                disabled={isFinished}
                                aria-label={isCompleted ? `Uncheck "${task.title}"` : `Toggle "${task.title}" complete`}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  minWidth: '28px',
                                  border: '2px solid #252943',
                                  borderRadius: '5px',
                                  backgroundColor: isCompleted ? '#168B68' : '#FFFFFF',
                                  color: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: isFinished ? 'not-allowed' : 'pointer',
                                  boxShadow: '1px 1px 0 #252943',
                                  padding: 0,
                                  marginTop: '1px',
                                  flexShrink: 0
                                }}
                              >
                                {isCompleted && <CheckIcon size={16} />}
                              </button>

                              {/* Title, Mandatory Badge, and Description */}
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
                                  <span
                                    style={{
                                      fontSize: '14px',
                                      fontWeight: 800,
                                      color: isCompleted ? 'rgba(37,41,67,0.6)' : '#252943',
                                      textDecoration: isCompleted ? 'line-through' : 'none',
                                      wordBreak: 'break-word',
                                      lineHeight: 1.35
                                    }}
                                  >
                                    {task.title}
                                  </span>

                                  {isMandatory && (
                                    <span
                                      className="neo-tag neo-tag--lime"
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        padding: '2px 6px',
                                        border: '1.5px solid #252943',
                                        borderRadius: '4px',
                                        letterSpacing: '0.04em',
                                        flexShrink: 0
                                      }}
                                    >
                                      MANDATORY
                                    </span>
                                  )}
                                </div>

                                {task.description && (
                                  <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.7)', margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>
                                    {task.description}
                                  </p>
                                )}

                                {/* Treadmill details if present */}
                                {(task.treadmill || task.treadmillDetails) && (
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '3px 8px',
                                      backgroundColor: '#F5F7FB',
                                      border: '1.5px solid #252943',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      color: '#252943',
                                      width: 'fit-content',
                                      marginTop: '2px'
                                    }}
                                  >
                                    <span>🏃 Cardio:</span>
                                    <span>
                                      {task.treadmill?.actualMinutes || task.treadmillDetails?.actualMinutes || 0} mins ·{' '}
                                      {task.treadmill?.caloriesBurned || task.treadmillDetails?.caloriesBurned || 0} kcal
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* "..." menu button */}
                            {!isFinished && (
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  className="btn btn--sm btn--secondary"
                                  onClick={() => setActiveMenuTaskId(isMenuOpen ? null : taskId)}
                                  aria-label="More task actions"
                                  style={{ width: '32px', height: '32px', minHeight: '32px', padding: 0 }}
                                >
                                  <MoreHorizontalIcon size={16} />
                                </button>

                                {isMenuOpen && (
                                  <div
                                    className="dayflow-task-card__dropdown-menu"
                                    style={{
                                      position: 'absolute',
                                      right: 0,
                                      top: '38px',
                                      backgroundColor: '#FFFFFF',
                                      border: '2px solid #252943',
                                      borderRadius: '6px',
                                      boxShadow: '3px 3px 0 #252943',
                                      zIndex: 100,
                                      minWidth: '150px',
                                      padding: '4px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px',
                                      boxSizing: 'border-box'
                                    }}
                                  >
                                    {(isCompleted || isSkipped) && (
                                      <button
                                        type="button"
                                        className="dayflow-task-menu-item"
                                        onClick={() => {
                                          setActiveMenuTaskId(null);
                                          onRevertTaskToPending && onRevertTaskToPending(taskId);
                                        }}
                                      >
                                        Revert to Pending
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="dayflow-task-menu-item"
                                      onClick={() => {
                                        setActiveMenuTaskId(null);
                                        onOpenTaskModal(task, bId);
                                      }}
                                    >
                                      Edit Task
                                    </button>
                                    <button
                                      type="button"
                                      className="dayflow-task-menu-item dayflow-task-menu-item--danger"
                                      onClick={() => {
                                        setActiveMenuTaskId(null);
                                        onDeleteTask(taskId);
                                      }}
                                    >
                                      Delete Task
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* B & C. Task Status & Completion Timestamp */}
                          {isCompleted && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                              <span
                                className="neo-tag neo-tag--success"
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  border: '1.5px solid #252943'
                                }}
                              >
                                COMPLETED
                              </span>
                              {task.completedAt && (
                                <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.7)', fontWeight: 600 }}>
                                  Completed at {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          )}

                          {/* D. Skip Reason in a dedicated callout block */}
                          {isSkipped && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span
                                  className="neo-tag"
                                  style={{
                                    backgroundColor: '#DC2626',
                                    color: '#FFFFFF',
                                    border: '1.5px solid #252943',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    padding: '3px 8px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  SKIPPED
                                </span>
                              </div>
                              <div
                                style={{
                                  padding: '8px 10px',
                                  backgroundColor: '#FEF2F2',
                                  border: '1.5px solid #DC2626',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: '#DC2626',
                                  fontWeight: 600,
                                  lineHeight: 1.4,
                                  wordBreak: 'break-word'
                                }}
                              >
                                <span style={{ fontWeight: 800 }}>Reason: </span>
                                {task.skippedReason || 'No reason provided'}
                              </div>
                            </div>
                          )}

                          {/* Pending Task Status (if not completed and not skipped) */}
                          {!isCompleted && !isSkipped && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                className="neo-tag neo-tag--secondary"
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  border: '1.5px solid #252943'
                                }}
                              >
                                PENDING
                              </span>
                            </div>
                          )}

                          {/* Row 3: Action Buttons (side-by-side, 44px min-height) */}
                          {!isFinished && !isCompleted && !isSkipped && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                              <button
                                type="button"
                                className="btn btn--primary"
                                onClick={() => onCompleteTask(taskId)}
                                aria-label={`Mark "${task.title}" complete`}
                                style={{ height: '44px', minHeight: '44px' }}
                              >
                                <CheckIcon size={16} />
                                <span>Complete</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={() => onOpenSkipModal(task)}
                                aria-label={`Skip "${task.title}" with reason`}
                                style={{ height: '44px', minHeight: '44px' }}
                              >
                                <span>Skip</span>
                              </button>
                            </div>
                          )}

                          {!isFinished && isCompleted && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                              <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={() => onRevertTaskToPending && onRevertTaskToPending(taskId)}
                                aria-label={`Undo complete and revert "${task.title}" to pending`}
                                style={{ height: '44px', minHeight: '44px' }}
                              >
                                <span>Revert</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={() => onOpenSkipModal(task)}
                                aria-label={`Change "${task.title}" to skipped`}
                                style={{ height: '44px', minHeight: '44px' }}
                              >
                                <span>Skip</span>
                              </button>
                            </div>
                          )}

                          {!isFinished && isSkipped && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                              <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={() => onRevertTaskToPending && onRevertTaskToPending(taskId)}
                                aria-label={`Revert skipped "${task.title}" to pending`}
                                style={{ height: '44px', minHeight: '44px' }}
                              >
                                <span>Revert</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn--primary"
                                onClick={() => onCompleteTask(taskId)}
                                aria-label={`Mark "${task.title}" complete`}
                                style={{ height: '44px', minHeight: '44px' }}
                              >
                                <CheckIcon size={16} />
                                <span>Complete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </FolderCard>
          );
        })}
      </div>
    </div>
  );
}
