import { useMemo } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon
} from '../../../components/common/Icons.jsx';

function padZero(n) {
  return String(n).padStart(2, '0');
}

export function GoodBitsCalendar({
  currentYearMonth,
  selectedDate,
  todayStr,
  dayCounts = {},
  onPrevMonth,
  onNextMonth,
  onJumpToday,
  onSelectDate
}) {
  const { year, month } = currentYearMonth;
  const monthKey = `${year}-${padZero(month + 1)}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Calendar cells matrix with Monday start
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Sunday (0) -> 6, Monday (1) -> 0
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const cells = [];
    // Padding cells before day 1
    for (let i = 0; i < startOffset; i++) {
      cells.push({ isPadding: true, key: `pad-start-${i}` });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthKey}-${padZero(d)}`;
      const count = dayCounts[dateStr] || 0;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;
      const isFuture = dateStr > todayStr;

      cells.push({
        isPadding: false,
        key: dateStr,
        dayNumber: d,
        date: dateStr,
        count,
        isToday,
        isSelected,
        isFuture
      });
    }

    return cells;
  }, [year, month, monthKey, daysInMonth, dayCounts, todayStr, selectedDate]);

  const monthTitle = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="goodbits-cal-card">
      {/* Month Navigation Header */}
      <div className="goodbits-cal-header">
        <div className="goodbits-cal-header__title-wrap">
          <h2 className="goodbits-cal-header__title">{monthTitle}</h2>
          <button
            type="button"
            className="btn btn--outline btn--sm goodbits-cal-header__today-btn"
            onClick={onJumpToday}
          >
            Today
          </button>
        </div>

        <div className="goodbits-cal-header__nav-btns">
          <button
            type="button"
            className="icon-btn goodbits-cal-nav-btn"
            onClick={onPrevMonth}
            aria-label="Previous month"
            title="Previous Month"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            type="button"
            className="icon-btn goodbits-cal-nav-btn"
            onClick={onNextMonth}
            aria-label="Next month"
            title="Next Month"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>
      </div>

      {/* Day of Week Header Row */}
      <div className="goodbits-cal-weekdays" aria-hidden="true">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="goodbits-cal-weekday">
            {day}
          </div>
        ))}
      </div>

      {/* Grid of Calendar Days */}
      <div className="goodbits-cal-grid" role="grid" aria-label={`Calendar for ${monthTitle}`}>
        {calendarCells.map((cell) => {
          if (cell.isPadding) {
            return (
              <div
                key={cell.key}
                className="goodbits-cal-day goodbits-cal-day--padding"
                aria-hidden="true"
              />
            );
          }

          let dayClasses = 'goodbits-cal-day';
          if (cell.isSelected) dayClasses += ' goodbits-cal-day--selected';
          if (cell.isToday) dayClasses += ' goodbits-cal-day--today';
          if (cell.isFuture) dayClasses += ' goodbits-cal-day--future';
          if (cell.count > 0) dayClasses += ' goodbits-cal-day--has-entries';

          return (
            <button
              key={cell.key}
              type="button"
              className={dayClasses}
              onClick={() => !cell.isFuture && onSelectDate(cell.date)}
              disabled={cell.isFuture}
              aria-label={`${cell.date}${cell.count > 0 ? `, ${cell.count} good bits` : ''}`}
              aria-selected={cell.isSelected}
            >
              <span className="goodbits-cal-day__number">{cell.dayNumber}</span>

              {/* Indicator: Dot if 1, Badge with count if > 1 */}
              {cell.count === 1 && (
                <span className="goodbits-cal-day__dot" title="1 Good Bit" />
              )}
              {cell.count > 1 && (
                <span className="goodbits-cal-day__badge" title={`${cell.count} Good Bits`}>
                  {cell.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
