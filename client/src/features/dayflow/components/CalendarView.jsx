import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoonIcon
} from '../../../components/common/Icons.jsx';
import {
  getLocalDateString,
  parseLocalDate
} from '../../../utils/date-utils.js';

/**
 * CalendarView
 * - Larger square cells with a minimum 40px tap size.
 * - Today filled with gradient.
 * - Selected day with ink ring (#252943).
 * - Status dots: scheduled = blue (#3A4EFB), finished = lime (#E3FF3B with ink border), rest day = soft surface with moon icon.
 * - Tidy row of 3 chips directly under the calendar.
 */
export function CalendarView({
  selectedDate,
  onSelectDate,
  fetchOverview
}) {
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const d = selectedDate ? parseLocalDate(selectedDate) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [overviewMap, setOverviewMap] = useState({});
  const [, setIsLoading] = useState(false);

  const { year, month } = currentYearMonth;

  // Format today's date string YYYY-MM-DD
  const todayStr = getLocalDateString();

  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      setIsLoading(true);
      try {
        const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        if (fetchOverview) {
          const res = await fetchOverview(startStr, endStr);
          if (!isCancelled && res?.data?.days) {
            const map = {};
            res.data.days.forEach((d) => {
              map[d.date] = d;
            });
            setOverviewMap(map);
          }
        }
      } catch (err) {
        console.error('Failed to load calendar overview', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isCancelled = true;
    };
  }, [year, month, fetchOverview]);

  const handlePrevMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const daysGrid = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push(null);
  }
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    daysGrid.push({
      dateStr,
      dayNum,
      info: overviewMap[dateStr] || { status: 'NOT_SCHEDULED' }
    });
  }

  return (
    <div className="dayflow-calendar-card">
      <div className="dayflow-calendar-card__header">
        <h3 className="dayflow-calendar-card__title">{monthName}</h3>
        <div className="dayflow-calendar-card__nav">
          <button
            type="button"
            className="btn-icon btn-icon--sm"
            onClick={handlePrevMonth}
            aria-label="Previous Month"
            title="Previous Month"
          >
            <ChevronLeftIcon size={14} />
          </button>
          <button
            type="button"
            className="btn-icon btn-icon--sm"
            onClick={handleNextMonth}
            aria-label="Next Month"
            title="Next Month"
          >
            <ChevronRightIcon size={14} />
          </button>
        </div>
      </div>

      <div className="dayflow-calendar-grid">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => (
          <div key={w} className="dayflow-calendar-grid__weekday">
            {w}
          </div>
        ))}

        {daysGrid.map((item, idx) => {
          if (!item) {
            return <div key={`empty-${idx}`} className="dayflow-calendar-grid__blank" />;
          }

          const isSelected = item.dateStr === selectedDate;
          const isTodayDate = item.dateStr === todayStr;
          const status = item.info.status;
          const isRest = status === 'REST_DAY';

          let cellClass = 'calendar-cell-square';
          if (isTodayDate) cellClass += ' calendar-cell-square--today';
          if (isSelected) cellClass += ' calendar-cell-square--selected';

          return (
            <button
              key={item.dateStr}
              type="button"
              className={cellClass}
              onClick={() => onSelectDate(item.dateStr)}
              title={`${item.dateStr} (${status})`}
              aria-label={`${item.dateStr}, ${status}`}
            >
              <span className="calendar-cell-square__num">{item.dayNum}</span>

              {isRest ? (
                <span className="calendar-cell-square__rest-icon" title="Rest Day">
                  <MoonIcon size={10} />
                </span>
              ) : status === 'FINISHED' ? (
                <span className="calendar-cell-square__dot calendar-cell-square__dot--finished" />
              ) : status === 'SCHEDULED' ? (
                <span className="calendar-cell-square__dot calendar-cell-square__dot--scheduled" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tidy row of three chips directly under the calendar */}
      <div className="dayflow-calendar-legend-tidy">
        <span className="legend-chip">
          <span className="legend-chip__dot legend-chip__dot--scheduled" />
          <span>Scheduled</span>
        </span>
        <span className="legend-chip">
          <span className="legend-chip__dot legend-chip__dot--finished" />
          <span>Finished</span>
        </span>
        <span className="legend-chip">
          <MoonIcon size={12} className="legend-chip__moon" />
          <span>Rest Day</span>
        </span>
      </div>
    </div>
  );
}
