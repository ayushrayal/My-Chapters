import { useState } from 'react';
import {
  LayoutTemplateIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  LockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon
} from '../../../components/common/Icons.jsx';
import { DeleteTemplateModal } from './DeleteTemplateModal.jsx';

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

export function TemplateList({
  templates = [],
  isLoading,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenApplyModal,
  onDeleteTemplate
}) {
  const [expandedTpls, setExpandedTpls] = useState({});
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const toggleExpand = (id) => {
    setExpandedTpls((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (isLoading) {
    return (
      <div className="dayflow-skeleton-list">
        <div className="dayflow-skeleton-card">
          <div className="skeleton-bone skeleton-bone--title" />
          <div className="skeleton-bone skeleton-bone--text" />
          <div className="skeleton-bone skeleton-bone--btn" />
        </div>
        <div className="dayflow-skeleton-card">
          <div className="skeleton-bone skeleton-bone--title" />
          <div className="skeleton-bone skeleton-bone--text" />
          <div className="skeleton-bone skeleton-bone--btn" />
        </div>
      </div>
    );
  }

  return (
    <div className="template-list-page">
      {/* Header Row */}
      <div className="template-list-header">
        <div className="template-list-header__titles">
          <h2 className="template-list-header__title">Day Templates</h2>
          <p className="template-list-header__subtitle">
            Create reusable templates for workdays, study routines, deep-focus sessions, and rest days.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary template-list-header__create-btn"
          onClick={onOpenCreateModal}
          aria-label="+ Create Template"
        >
          <PlusIcon size={16} /> Create Template
        </button>
      </div>

      {/* Empty State */}
      {templates.length === 0 ? (
        <div className="dayflow-empty-state">
          <div className="dayflow-empty-state__icon">
            <LayoutTemplateIcon size={44} />
          </div>
          <h3 className="dayflow-empty-state__title">No templates yet</h3>
          <p className="dayflow-empty-state__description">
            Create your first day template with custom time blocks to organize your upcoming days easily.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onOpenCreateModal}
            aria-label="+ Create Template"
          >
            <PlusIcon size={16} /> Create your first template
          </button>
        </div>
      ) : (
        /* 1 col mobile, 2 col desktop grid */
        <div className="template-grid">
          {templates.map((tpl) => {
            const tplId = tpl._id || tpl.id;
            const blocks = tpl.blocks || [];
            const blockCount = blocks.length;
            const mandatoryCount = blocks.filter((b) => b.tasksRequired).length;
            const isExpanded = Boolean(expandedTpls[tplId]);

            // Compute total minutes for the mini day timeline
            const totalMinutes = blocks.reduce(
              (acc, b) => acc + calculateBlockDuration(b.startTime, b.endTime),
              0
            );
            const totalHoursFormatted = formatMinutes(totalMinutes);

            const visibleBlocks = isExpanded ? blocks : blocks.slice(0, 4);
            const remainingCount = blocks.length - 4;

            return (
              <div key={tplId} className="template-card">
                {/* Top Section: Title & Description */}
                <div className="template-card__header">
                  <div className="template-card__header-info">
                    <h3 className="template-card__title">{tpl.name}</h3>
                    {tpl.description && (
                      <p className="template-card__desc" title={tpl.description}>
                        {tpl.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Chips: block count & mandatory count (ink-outline style, no amber) */}
                <div className="template-card__chips">
                  <span className="template-chip">
                    {blockCount} {blockCount === 1 ? 'block' : 'blocks'}
                  </span>
                  {mandatoryCount > 0 && (
                    <span className="template-chip template-chip--mandatory" title={`${mandatoryCount} mandatory blocks`}>
                      <LockIcon size={12} />
                      {mandatoryCount} mandatory
                    </span>
                  )}
                </div>

                {/* Mini Day-Timeline Preview */}
                {blocks.length > 0 && totalMinutes > 0 && (
                  <div className="template-mini-timeline">
                    <div className="template-mini-timeline__header">
                      <span className="template-mini-timeline__label">
                        <ClockIcon size={12} /> Schedule Preview
                      </span>
                      <span className="template-mini-timeline__total">
                        {totalHoursFormatted} total
                      </span>
                    </div>

                    <div className="template-mini-timeline__bar">
                      {blocks.map((b, idx) => {
                        const dur = calculateBlockDuration(b.startTime, b.endTime);
                        if (dur <= 0) return null;
                        const widthPct = Math.max(3, (dur / totalMinutes) * 100);
                        const durText = formatMinutes(dur);

                        return (
                          <div
                            key={idx}
                            className={`template-mini-timeline__segment ${
                              b.tasksRequired
                                ? 'template-mini-timeline__segment--mandatory'
                                : 'template-mini-timeline__segment--regular'
                            }`}
                            style={{ width: `${widthPct}%` }}
                            title={`${b.name} (${b.startTime} - ${b.endTime}, ${durText})${
                              b.tasksRequired ? ' [Mandatory]' : ''
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Block List (First 4 blocks + expander) */}
                <div className="template-card__blocks">
                  {visibleBlocks.map((block, idx) => (
                    <div key={idx} className="template-card__block-item">
                      <span className="template-card__block-time">
                        {block.startTime} — {block.endTime}
                      </span>
                      <span className="template-card__block-name">
                        {block.name}
                      </span>
                      {block.tasksRequired && (
                        <span
                          className="template-card__lime-dot"
                          title="Mandatory (tasks required)"
                          aria-label="Mandatory"
                        />
                      )}
                    </div>
                  ))}

                  {/* +X more expander */}
                  {remainingCount > 0 && (
                    <button
                      type="button"
                      className="template-card__expander-btn"
                      onClick={() => toggleExpand(tplId)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUpIcon size={14} /> Show less
                        </>
                      ) : (
                        <>
                          <ChevronDownIcon size={14} /> +{remainingCount} more
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Bottom Actions Row */}
                <div className="template-card__actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm template-card__apply-btn"
                    onClick={() => onOpenApplyModal(tpl)}
                  >
                    Apply to Day
                  </button>

                  <div className="template-card__tools">
                    <button
                      type="button"
                      className="btn-icon btn-icon--sm"
                      onClick={() => onOpenEditModal(tpl)}
                      title="Edit template"
                      aria-label="Edit template"
                    >
                      <EditIcon size={16} />
                    </button>

                    <button
                      type="button"
                      className="btn-icon btn-icon--sm btn-icon--danger"
                      onClick={() => setTemplateToDelete(tpl)}
                      title="Delete template"
                      aria-label="Delete template"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Type-to-Confirm Deletion Modal */}
      <DeleteTemplateModal
        isOpen={Boolean(templateToDelete)}
        template={templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirmDelete={onDeleteTemplate}
      />
    </div>
  );
}
