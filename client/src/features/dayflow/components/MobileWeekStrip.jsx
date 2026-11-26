import { useMemo } from 'react';
import { CalendarIcon } from '../../../components/common/Icons.jsx';

/**
 * MobileWeekStrip: Neo-Brutalist 7 bordered day tiles
 * Today = Primary Blue border with hard shadow
 * Selected = Lime fill with Navy text & 2px border
 * Square markers for scheduled / finished (Fresh Green) / rest (Subtle Border)
 */
export function MobileWeekStrip({
  selectedDate,
  onSelectDate,
  overviewMap = {},
  onOpenMonthSheet
}) {
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

  const getMarkerStyle = (status) => {
    switch (status) {
      case 'FINISHED':
        return { backgroundColor: '#168B68' }; // Fresh Green
      case 'REST_DAY':
        return { backgroundColor: '#33A4FA' }; // Secondary Blue
      case 'SCHEDULED':
        return { backgroundColor: '#3A4EFB' }; // Primary Blue
      default:
        return { backgroundColor: 'transparent', border: '1px dashed #252943' };
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="mobile-week-strip-container">
      {/* Top row: Label + Month Calendar button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          width: '100%'
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#252943'
          }}
        >
          Week Overview
        </span>

        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={onOpenMonthSheet}
          aria-label="Open full month calendar sheet"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 800,
            minHeight: '32px'
          }}
        >
          <CalendarIcon size={14} />
          <span>Month</span>
        </button>
      </div>

      {/* 7 Days Grid: Spans 100% width, 7 equal columns */}
      <div
        className="mobile-week-strip"
        role="tablist"
        aria-label="Select date in week"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '6px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {days.map((item) => {
          const isSelected = item.dateStr === selectedDate;
          const isToday = item.dateStr === todayStr;

          return (
            <button
              key={item.dateStr}
              type="button"
              onClick={() => onSelectDate(item.dateStr)}
              role="tab"
              aria-selected={isSelected}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                padding: '8px 2px',
                minHeight: '52px',
                borderRadius: '6px',
                border: isSelected
                  ? '2px solid #252943'
                  : isToday
                  ? '2px solid #3A4EFB'
                  : '2px solid #252943',
                backgroundColor: isSelected ? '#E3FF3B' : '#FFFFFF',
                color: '#252943',
                boxShadow: isSelected ? '2px 2px 0 #252943' : '1px 1px 0 #252943',
                cursor: 'pointer',
                transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}
              >
                {item.dayName}
              </span>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '15px',
                  fontWeight: 800,
                  lineHeight: 1.1
                }}
              >
                {item.dayNum}
              </span>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '1px',
                  marginTop: '2px',
                  ...getMarkerStyle(item.status)
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
