import { useMemo } from 'react';
import { CalendarIcon } from '../../../components/common/Icons.jsx';

/**
 * MobileWeekStrip
 * Swipeable 7-day horizontal strip shown on mobile (<768px),
 * plus a "Month" button to open the full calendar bottom sheet.
 */
export function MobileWeekStrip({
  selectedDate,
  onSelectDate,
  overviewMap = {},
  onOpenMonthSheet
}) {
  // Generate 7 days centered around selectedDate (or current week)
  const days = useMemo(() => {
    const ref = new Date(`${selectedDate}T00:00:00`);
    const dayOfWeek = ref.getDay(); // 0 is Sun
    const startOfWeek = new Date(ref);
    startOfWeek.setDate(ref.getDate() - dayOfWeek);

    const pad = (n) => String(n).padStart(2, '0');
    const result = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' });
      const dayNum = d.getDate();
      const info = overviewMap[dateStr] || { status: 'NOT_SCHEDULED' };

      result.push({
        dateStr,
        dayName,
        dayNum,
        status: info.status
      });
    }
    return result;
  }, [selectedDate, overviewMap]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'FINISHED':
        return 'week-strip-item__dot--finished';
      case 'REST_DAY':
        return 'week-strip-item__dot--rest';
      case 'SCHEDULED':
        return 'week-strip-item__dot--scheduled';
      default:
        return 'week-strip-item__dot--empty';
    }
  };

  return (
    <div className="mobile-week-strip-wrapper">
      <div className="mobile-week-strip" role="tablist" aria-label="Select date in week">
        {days.map((item) => {
          const isSelected = item.dateStr === selectedDate;
          return (
            <button
              key={item.dateStr}
              type="button"
              className={`week-strip-item ${isSelected ? 'week-strip-item--selected' : ''}`}
              onClick={() => onSelectDate(item.dateStr)}
              role="tab"
              aria-selected={isSelected}
            >
              <span className="week-strip-item__weekday">{item.dayName}</span>
              <span className="week-strip-item__daynum">{item.dayNum}</span>
              <span className={`week-strip-item__dot ${getStatusColor(item.status)}`} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="mobile-week-strip__month-btn"
        onClick={onOpenMonthSheet}
        aria-label="Open full month calendar sheet"
      >
        <CalendarIcon size={16} />
        <span>Month</span>
      </button>
    </div>
  );
}
