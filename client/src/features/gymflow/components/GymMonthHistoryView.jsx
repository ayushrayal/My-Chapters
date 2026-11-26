import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gymflowApi } from '../services/gymflow.api.js';
import { queryClient } from '../../../lib/queryClient.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { WindowCard } from '../../../components/common/WindowCard.jsx';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  CheckIcon,
  DumbbellIcon,
  MoonIcon
} from '../../../components/common/Icons.jsx';

function padZero(n) {
  return String(n).padStart(2, '0');
}

export function GymMonthHistoryView({ spaceId, currentDate, onSelectDateAndTab }) {
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth() // 0-indexed
    };
  });

  const [selectedDate, setSelectedDate] = useState(currentDate || new Date().toISOString().split('T')[0]);

  const monthKey = `${currentYearMonth.year}-${padZero(currentYearMonth.month + 1)}`;
  const startDate = `${monthKey}-01`;
  const daysInMonth = new Date(currentYearMonth.year, currentYearMonth.month + 1, 0).getDate();
  const endDate = `${monthKey}-${padZero(daysInMonth)}`;

  // 1. Fetch month summary overview
  const { data: monthDays = [], isLoading: isLoadingMonth } = useQuery(
    {
      queryKey: queryKeys.gymflow.overview(spaceId, monthKey),
      queryFn: () => gymflowApi.getCalendarOverview(startDate, endDate),
      staleTime: 5 * 60 * 1000,
      enabled: Boolean(spaceId)
    },
    queryClient
  );

  // Map by date string
  const daysMap = useMemo(() => {
    const map = new Map();
    (monthDays || []).forEach((d) => {
      map.set(d.date, d);
    });
    return map;
  }, [monthDays]);

  // 2. Fetch detailed session for currently selected date
  const { data: sessionData, isLoading: isLoadingSession } = useQuery(
    {
      queryKey: queryKeys.gymflow.session(spaceId, selectedDate),
      queryFn: () => gymflowApi.getSession(selectedDate),
      staleTime: 30 * 1000,
      enabled: Boolean(spaceId && selectedDate)
    },
    queryClient
  );

  const selectedSession = sessionData?.session || null;

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleJumpToday = () => {
    const now = new Date();
    setCurrentYearMonth({
      year: now.getFullYear(),
      month: now.getMonth()
    });
    setSelectedDate(now.toISOString().split('T')[0]);
  };

  // Calendar matrix generator (Monday start)
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYearMonth.year, currentYearMonth.month, 1).getDay();
    // Convert Sunday-indexed (0=Sun) to Monday-indexed (0=Mon, 6=Sun)
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const cells = [];
    // Padding cells before day 1
    for (let i = 0; i < startOffset; i++) {
      cells.push({ isPadding: true, key: `pad-start-${i}` });
    }

    // Actual month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthKey}-${padZero(d)}`;
      const daySummary = daysMap.get(dateStr) || null;
      cells.push({
        isPadding: false,
        key: dateStr,
        dayNumber: d,
        date: dateStr,
        daySummary
      });
    }

    return cells;
  }, [currentYearMonth, daysInMonth, daysMap, monthKey]);

  const monthTitle = new Date(currentYearMonth.year, currentYearMonth.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const selectedDisplayDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="gym-history-view">
      {/* Month Header & Controls */}
      <div className="gym-history-header-card">
        <div className="gym-history-header-card__nav">
          <button
            type="button"
            className="icon-btn"
            onClick={handlePrevMonth}
            aria-label="Previous Month"
            title="Previous Month"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <h2 className="gym-history-header-card__title">
            {monthTitle}
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={handleNextMonth}
            aria-label="Next Month"
            title="Next Month"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>

        <button
          type="button"
          className="btn btn--secondary btn--sm gym-history-header-card__today-btn"
          onClick={handleJumpToday}
        >
          Jump to Today
        </button>
      </div>

      {/* Main Grid: Calendar on Left, Selected Day Details on Right (or stacked on mobile) */}
      <div className="gym-history-content-grid">
        {/* Left Side: Calendar Grid inside WindowCard */}
        <WindowCard title="Monthly Calendar" headerBg="canvas">
          <div className="gym-history-calendar">
            {/* Weekday headers: Desktop 3-letter, Mobile 1-letter */}
            <div className="gym-history-weekdays">
              <div><span className="weekday-desktop">Mon</span><span className="weekday-mobile">M</span></div>
              <div><span className="weekday-desktop">Tue</span><span className="weekday-mobile">T</span></div>
              <div><span className="weekday-desktop">Wed</span><span className="weekday-mobile">W</span></div>
              <div><span className="weekday-desktop">Thu</span><span className="weekday-mobile">T</span></div>
              <div><span className="weekday-desktop">Fri</span><span className="weekday-mobile">F</span></div>
              <div><span className="weekday-desktop">Sat</span><span className="weekday-mobile">S</span></div>
              <div><span className="weekday-desktop">Sun</span><span className="weekday-mobile">S</span></div>
            </div>

            {/* Day Cells Grid */}
            <div className="gym-history-days-grid">
              {calendarCells.map((cell) => {
                if (cell.isPadding) {
                  return (
                    <div
                      key={cell.key}
                      className="gym-history-day-pad"
                      aria-hidden="true"
                    />
                  );
                }

                const isSelected = cell.date === selectedDate;
                const isToday = cell.date === currentDate;
                const summary = cell.daySummary;
                const hasWorkout = summary && !summary.isRestDay && summary.totalSets > 0;
                const isRestDay = summary && summary.isRestDay;

                const cellClasses = [
                  'gym-history-day-cell',
                  isSelected ? 'gym-history-day-cell--selected' : '',
                  isToday ? 'gym-history-day-cell--today' : '',
                  hasWorkout ? 'gym-history-day-cell--workout' : '',
                  isRestDay ? 'gym-history-day-cell--rest' : ''
                ].filter(Boolean).join(' ');

                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={cellClasses}
                    onClick={() => setSelectedDate(cell.date)}
                    aria-label={`View workout for ${cell.date}`}
                  >
                    <span className="gym-history-day-cell__num">
                      {cell.dayNumber}
                    </span>

                    {/* Mobile Dot Indicator */}
                    {hasWorkout ? (
                      <span className="gym-history-day-cell__dot gym-history-day-cell__dot--workout" title="Workout" />
                    ) : isRestDay ? (
                      <span className="gym-history-day-cell__dot gym-history-day-cell__dot--rest" title="Rest Day" />
                    ) : null}

                    {/* Desktop Activity Info */}
                    <div className="gym-history-day-cell__info-desktop">
                      {hasWorkout ? (
                        <>
                          <span className="info-title">
                            {summary.templateName || 'Workout'}
                          </span>
                          <span className="info-sets">
                            {summary.completedSets}/{summary.totalSets} sets
                          </span>
                        </>
                      ) : isRestDay ? (
                        <span className="info-rest">Rest</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </WindowCard>

        {/* Right Side: Selected Date Detail Inspector inside WindowCard */}
        <WindowCard title="Day Details" headerBg="canvas">
          <div className="gym-history-detail-panel">
            {/* Header: Date Title */}
            <div>
              <span className="neo-tag neo-tag--secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                Selected Date
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '8px 0 0', color: '#252943', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {selectedDisplayDate}
              </h3>
            </div>

            {isLoadingSession ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#252943' }}>
                Loading workout details...
              </div>
            ) : selectedSession && !selectedSession.isRestDay ? (
              /* WORKOUT PERFORMED DETAILS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Routine & Score Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#F5F7FB',
                    border: '2px solid #252943',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    boxShadow: '2px 2px 0 #252943'
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#252943' }}>
                      {selectedSession.templateName || 'Custom Workout'}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#252943', fontWeight: 600 }}>
                      {selectedSession.isFinished ? '✓ Completed Workout' : 'In Progress'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      className="neo-tag neo-tag--lime"
                      style={{ fontSize: '16px', fontWeight: 800 }}
                    >
                      {selectedSession.scoreBreakdown?.totalScore ?? 100}%
                    </span>
                  </div>
                </div>

                {/* Body Parts & Exercises */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                  {(selectedSession.bodyParts || []).map((bp, bpIdx) => (
                    <div
                      key={bpIdx}
                      style={{
                        border: '2px solid #252943',
                        borderRadius: '8px',
                        padding: '12px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '1px 1px 0 #252943',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#252943', textTransform: 'uppercase' }}>
                        {bp.name}
                      </span>
                      {(bp.exercises || []).map((ex, exIdx) => {
                        const mType = ex.measurementType || 'WEIGHT_REPS';
                        return (
                          <div
                            key={exIdx}
                            style={{
                              backgroundColor: '#F5F7FB',
                              border: '1px solid #252943',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#252943' }}>
                                {ex.name}
                              </span>
                              <span
                                className="neo-tag neo-tag--secondary"
                                style={{ fontSize: '10px' }}
                              >
                                {mType === 'DURATION' ? 'Duration' : mType === 'BODYWEIGHT_REPS' ? 'Bodyweight' : 'Weight'}
                              </span>
                            </div>

                            {/* Sets summary chips */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                              {(ex.sets || []).map((s, sIdx) => {
                                const isDone = s.status === 'COMPLETED';
                                let text = '';
                                if (mType === 'WEIGHT_REPS') {
                                  text = `${s.weightKg || 0}kg × ${s.reps || 0}`;
                                } else if (mType === 'BODYWEIGHT_REPS') {
                                  text = s.extraWeightKg > 0 ? `BW +${s.extraWeightKg}kg × ${s.reps}` : `BW × ${s.reps}`;
                                } else if (mType === 'DURATION') {
                                  text = `${s.durationMinutes || 0} mins`;
                                }

                                return (
                                  <span
                                    key={sIdx}
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid #252943',
                                      backgroundColor: isDone ? '#E3FF3B' : '#FFFFFF',
                                      color: '#252943'
                                    }}
                                  >
                                    S{s.setNumber}: {text}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Action: Open in Workout Tab */}
                {onSelectDateAndTab && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => onSelectDateAndTab(selectedDate, 'workout')}
                    style={{ width: '100%', marginTop: '4px' }}
                  >
                    <DumbbellIcon size={16} />
                    <span>Open in Workout View</span>
                  </button>
                )}
              </div>
            ) : selectedSession && selectedSession.isRestDay ? (
              /* REST DAY CARD */
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px dashed #252943',
                  borderRadius: '10px',
                  boxShadow: '2px 2px 0 #252943',
                  padding: '24px 16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#E3FF3B',
                    border: '2px solid #252943',
                    borderRadius: '8px',
                    boxShadow: '2px 2px 0 #252943',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#252943'
                  }}
                >
                  <MoonIcon size={24} />
                </div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#252943', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Rest Day
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#252943' }}>
                  {selectedSession.restDayReason || 'Scheduled recovery day.'}
                </p>
                {onSelectDateAndTab && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => onSelectDateAndTab(selectedDate, 'workout')}
                    style={{ width: '100%', marginTop: '6px' }}
                  >
                    Manage in Workout View
                  </button>
                )}
              </div>
            ) : (
              /* NO WORKOUT RECORDED */
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px dashed #252943',
                  borderRadius: '10px',
                  boxShadow: '2px 2px 0 #252943',
                  padding: '28px 16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#E3FF3B',
                    border: '2px solid #252943',
                    borderRadius: '8px',
                    boxShadow: '2px 2px 0 #252943',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#252943'
                  }}
                >
                  <CalendarIcon size={24} />
                </div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#252943' }}>
                  No workout recorded on this date.
                </p>
                {onSelectDateAndTab && (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => onSelectDateAndTab(selectedDate, 'workout')}
                    style={{ width: '100%', marginTop: '6px' }}
                  >
                    <DumbbellIcon size={14} />
                    <span>Start Workout on this Date</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </WindowCard>
      </div>
    </div>
  );
}
