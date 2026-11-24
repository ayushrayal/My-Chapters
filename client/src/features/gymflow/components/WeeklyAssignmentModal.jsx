import { useState, useEffect } from 'react';
import { BottomSheetModal } from './common/BottomSheetModal.jsx';
import { FilterSelect } from '../../../components/common/FilterControl/FilterSelect.jsx';
import { Chip } from './common/Chip.jsx';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WeeklyAssignmentModal({ isOpen, weeklySchedule, templates, onClose, onSave }) {
  const [days, setDays] = useState(() => {
    return WEEKDAYS.map((weekday) => {
      const existing = weeklySchedule?.days?.find((d) => d.weekday === weekday);
      return {
        weekday,
        templateId: existing?.templateId?._id || existing?.templateId || '',
        isRestDay: Boolean(existing?.isRestDay)
      };
    });
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDays(
        WEEKDAYS.map((weekday) => {
          const existing = weeklySchedule?.days?.find((d) => d.weekday === weekday);
          return {
            weekday,
            templateId: existing?.templateId?._id || existing?.templateId || '',
            isRestDay: Boolean(existing?.isRestDay)
          };
        })
      );
    }
  }, [isOpen, weeklySchedule]);

  if (!isOpen) return null;

  const currentDayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const handleTemplateChange = (weekday, val) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.weekday !== weekday) return d;
        if (val === 'REST') {
          return { ...d, isRestDay: true, templateId: '' };
        }
        return { ...d, isRestDay: false, templateId: val };
      })
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(
        days.map((d) => ({
          weekday: d.weekday,
          templateId: d.isRestDay || !d.templateId ? null : d.templateId,
          isRestDay: d.isRestDay
        }))
      );
      onClose();
    } catch {
      // Toast notification is managed by useGymflow
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectOptions = [
    { value: '', label: 'No template assigned' },
    { value: 'REST', label: 'Rest Day (Recovery)' },
    ...templates.map((tpl) => ({
      value: tpl._id || tpl.id,
      label: `${tpl.name} (${tpl.bodyParts?.length || 0} body parts)`
    }))
  ];

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="Weekly Workout Schedule"
      subtitle="Configure your default routine assignment and scheduled rest days"
      footer={
        <>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Weekly Schedule'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {days.map((d) => {
          const isToday = d.weekday === currentDayOfWeek;
          const currentValue = d.isRestDay ? 'REST' : d.templateId;

          return (
            <div
              key={d.weekday}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px 14px',
                backgroundColor: isToday ? 'rgba(58, 78, 251, 0.03)' : '#F8FAFD',
                border: isToday ? '1.5px solid #3A4EFB' : '1px solid #E6E9F2',
                borderRadius: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#252943' }}>
                    {d.weekday}
                  </span>
                  {isToday && <Chip variant="lime">Today</Chip>}
                </div>

                {d.isRestDay ? (
                  <Chip variant="outline">Rest Day</Chip>
                ) : d.templateId ? (
                  <Chip variant="gradient-tint">Assigned</Chip>
                ) : null}
              </div>

              <FilterSelect
                value={currentValue}
                onChange={(val) => handleTemplateChange(d.weekday, val)}
                options={selectOptions}
                ariaLabel={`Routine for ${d.weekday}`}
                allowClear={false}
              />
            </div>
          );
        })}
      </form>
    </BottomSheetModal>
  );
}
