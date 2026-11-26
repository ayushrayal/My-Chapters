import { useState } from 'react';
import {
  LayoutTemplateIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  LockIcon,
  ClockIcon
} from '../../../components/common/Icons.jsx';
import { DeleteTemplateModal } from './DeleteTemplateModal.jsx';
import { WindowCard } from '../../../components/common/WindowCard.jsx';

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {[1, 2].map((k) => (
          <div key={k} className="card" style={{ height: '200px' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="template-list-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#252943', letterSpacing: '-0.02em' }}>
            Day Templates
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(37,41,67,0.7)', margin: '4px 0 0' }}>
            Create reusable templates for workdays, study routines, deep-focus sessions, and rest days.
          </p>
        </div>

        {/* Full-width Create Template button on mobile */}
        <button
          type="button"
          className="btn btn--accent btn--full"
          onClick={onOpenCreateModal}
          aria-label="+ Create Template"
          style={{ height: '48px', fontSize: '15px' }}
        >
          <PlusIcon size={16} /> Create Template
        </button>
      </div>

      {/* Empty State */}
      {templates.length === 0 ? (
        <div className="empty-state" style={{ padding: '36px 20px' }}>
          <div className="empty-state__icon">
            <LayoutTemplateIcon size={28} />
          </div>
          <h3 className="empty-state__title">No templates yet</h3>
          <p className="empty-state__subtitle">
            Create your first day template with custom time blocks to organize your upcoming days easily.
          </p>
          <button
            type="button"
            className="btn btn--accent"
            onClick={onOpenCreateModal}
          >
            <PlusIcon size={16} /> Create First Template
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {templates.map((tpl) => {
            const tplId = tpl._id || tpl.id;
            const isExpanded = Boolean(expandedTpls[tplId]);
            const blocks = tpl.blocks || [];
            const displayedBlocks = isExpanded ? blocks : blocks.slice(0, 4);
            const hiddenCount = blocks.length - 4;

            const totalMinutes = blocks.reduce(
              (acc, b) => acc + calculateBlockDuration(b.startTime, b.endTime),
              0
            );

            return (
              <WindowCard
                key={tplId}
                title={tpl.name}
                headerBg="canvas"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Description (2 lines clamp) */}
                  {tpl.description && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'rgba(37,41,67,0.7)',
                        margin: 0,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {tpl.description}
                    </p>
                  )}

                  {/* Chips: blocks count, mandatory status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="neo-tag neo-tag--canvas">
                      {blocks.length} {blocks.length === 1 ? 'Block' : 'Blocks'}
                    </span>
                    {blocks.some((b) => b.tasksRequired) && (
                      <span className="neo-tag neo-tag--lime" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <LockIcon size={12} />
                        <span>Mandatory</span>
                      </span>
                    )}
                  </div>

                  {/* Schedule preview bar of flat segments with Navy separators & total hours */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                      style={{
                        height: '14px',
                        border: '2px solid #252943',
                        borderRadius: '4px',
                        display: 'flex',
                        overflow: 'hidden',
                        backgroundColor: '#DEE0ED'
                      }}
                    >
                      {blocks.map((b, idx) => (
                        <div
                          key={idx}
                          style={{
                            flex: calculateBlockDuration(b.startTime, b.endTime) || 1,
                            backgroundColor: idx % 2 === 0 ? '#3A4EFB' : '#33A4FA',
                            borderRight: idx < blocks.length - 1 ? '1px solid #252943' : 'none'
                          }}
                          title={`${b.name} (${b.startTime} - ${b.endTime})`}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textAlign: 'right' }}>
                      {formatMinutes(totalMinutes)} total
                    </span>
                  </div>

                  {/* Blocks List: Time pill that never truncates + block name */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {displayedBlocks.map((b, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          border: '1.5px solid #252943',
                          borderRadius: '4px',
                          backgroundColor: '#F5F7FB'
                        }}
                      >
                        <span
                          className="neo-tag neo-tag--canvas"
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                        >
                          {b.startTime} – {b.endTime}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#252943', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* "+N more" toggle */}
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => toggleExpand(tplId)}
                      style={{ alignSelf: 'flex-start', height: '28px', minHeight: '28px', fontSize: '11px' }}
                    >
                      {isExpanded ? 'Show less' : `+${hiddenCount} more blocks`}
                    </button>
                  )}

                  {/* Actions: Apply to Day (primary), Edit (44px), Delete (44px Error Red) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '2px solid #252943' }}>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => onOpenApplyModal(tpl)}
                      style={{ flex: 1, height: '44px', minHeight: '44px' }}
                    >
                      Apply to Day
                    </button>

                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => onOpenEditModal(tpl)}
                      aria-label={`Edit ${tpl.name}`}
                      style={{ width: '44px', height: '44px', minHeight: '44px', padding: 0 }}
                    >
                      <EditIcon size={16} />
                    </button>

                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => setTemplateToDelete(tpl)}
                      aria-label={`Delete ${tpl.name}`}
                      style={{ width: '44px', height: '44px', minHeight: '44px', padding: 0 }}
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </div>
              </WindowCard>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {templateToDelete && (
        <DeleteTemplateModal
          isOpen={Boolean(templateToDelete)}
          templateName={templateToDelete.name}
          onClose={() => setTemplateToDelete(null)}
          onConfirm={() => {
            onDeleteTemplate(templateToDelete._id || templateToDelete.id);
            setTemplateToDelete(null);
          }}
        />
      )}
    </div>
  );
}
