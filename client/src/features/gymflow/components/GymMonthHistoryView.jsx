import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gymflowApi } from '../services/gymflow.api.js';
import { queryClient } from '../../../lib/queryClient.js';
import { queryKeys } from '../../../lib/queryKeys.js';
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
    <div className="gym-history-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Month Header & Controls */}
      <div
        className="gym-history-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 20px',
          border: '1px solid #E6E9F2',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn-icon btn-icon--touch"
            onClick={handlePrevMonth}
            aria-label="Previous Month"
            title="Previous Month"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#252943', minWidth: '170px' }}>
            {monthTitle}
          </h2>
          <button
            type="button"
            className="btn-icon btn-icon--touch"
            onClick={handleNextMonth}
            aria-label="Next Month"
            title="Next Month"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>

        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={handleJumpToday}
          style={{ fontWeight: 700 }}
        >
          Jump to Today
        </button>
      </div>

      {/* Main Grid + Selected Day Inspector */}
      <div
        className="gym-history-content-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
          gap: '20px'
        }}
      >
        {/* Left Side: Calendar Grid */}
        <div
          className="gym-history-calendar-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #E6E9F2',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Weekday headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '12px',
              color: 'rgba(37, 41, 67, 0.6)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              paddingBottom: '8px',
              borderBottom: '1px solid #F0F2F7'
            }}
          >
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          {/* Day Cells Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px'
            }}
          >
            {calendarCells.map((cell) => {
              if (cell.isPadding) {
                return (
                  <div
                    key={cell.key}
                    style={{
                      minHeight: '74px',
                      backgroundColor: 'transparent'
                    }}
                  />
                );
              }

              const isSelected = cell.date === selectedDate;
              const isToday = cell.date === currentDate;
              const summary = cell.daySummary;
              const hasWorkout = summary && !summary.isRestDay && summary.totalSets > 0;
              const isRestDay = summary && summary.isRestDay;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedDate(cell.date)}
                  style={{
                    minHeight: '74px',
                    padding: '8px 6px',
                    borderRadius: '10px',
                    backgroundColor: isSelected
                      ? 'rgba(79, 70, 229, 0.08)'
                      : hasWorkout
                      ? '#F8FAFD'
                      : isRestDay
                      ? 'rgba(59, 130, 246, 0.04)'
                      : '#FFFFFF',
                    border: isSelected
                      ? '2px solid #4F46E5'
                      : isToday
                      ? '1px solid #E3FF3B'
                      : '1px solid #E6E9F2',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                  aria-label={`View workout for ${cell.date}`}
                >
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: isSelected || isToday ? 800 : 600,
                        color: isSelected ? '#4F46E5' : '#252943'
                      }}
                    >
                      {cell.dayNumber}
                    </span>
                    {isToday && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#252943'
                        }}
                        title="Today"
                      />
                    )}
                  </div>

                  {/* Activity Badge */}
                  {hasWorkout ? (
                    <div style={{ width: '100%', marginTop: '4px' }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#4F46E5',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {summary.templateName || 'Workout'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(37,41,67,0.65)' }}>
                        {summary.completedSets}/{summary.totalSets} sets
                      </span>
                    </div>
                  ) : isRestDay ? (
                    <div style={{ width: '100%', marginTop: '4px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: 'rgba(59, 130, 246, 0.12)',
                          color: '#2563EB',
                          padding: '1px 5px',
                          borderRadius: '4px'
                        }}
                      >
                        Rest Day
                      </span>
                    </div>
                  ) : (
                    <div style={{ minHeight: '14px' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Date Detail Inspector */}
        <div
          className="gym-history-detail-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #E6E9F2',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '1px solid #F0F2F7', paddingBottom: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(37,41,67,0.6)', textTransform: 'uppercase' }}>
              Selected Date
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0', color: '#252943' }}>
              {selectedDisplayDate}
            </h3>
          </div>

          {isLoadingSession ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(37,41,67,0.6)' }}>
              Loading workout details...
            </div>
          ) : selectedSession && !selectedSession.isRestDay ? (
            /* WORKOUT PERFORMED DETAILS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Routine & Score Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F8FAFD',
                  borderRadius: '12px',
                  padding: '12px 14px'
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#252943' }}>
                    {selectedSession.templateName || 'Custom Workout'}
                  </h4>
                  <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.7)' }}>
                    {selectedSession.isFinished ? '✓ Completed Workout' : 'In Progress'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#4F46E5' }}>
                    {selectedSession.scoreBreakdown?.totalScore ?? 100}%
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'rgba(37,41,67,0.6)' }}>Score</span>
                </div>
              </div>

              {/* Body Parts & Exercises */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                {(selectedSession.bodyParts || []).map((bp, bpIdx) => (
                  <div
                    key={bpIdx}
                    style={{
                      border: '1px solid #E6E9F2',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#252943' }}>
                      {bp.name}
                    </span>
                    {(bp.exercises || []).map((ex, exIdx) => {
                      const mType = ex.measurementType || 'WEIGHT_REPS';
                      return (
                        <div
                          key={exIdx}
                          style={{
                            backgroundColor: '#F8FAFD',
                            borderRadius: '8px',
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
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: mType === 'DURATION' ? '#4F46E5' : mType === 'BODYWEIGHT_REPS' ? '#059669' : 'rgba(37,41,67,0.6)'
                              }}
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
                                    fontWeight: 600,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: isDone ? 'rgba(79, 70, 229, 0.08)' : '#DEE0ED',
                                    color: isDone ? '#4F46E5' : 'rgba(37,41,67,0.6)'
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
                  style={{ width: '100%', marginTop: '6px' }}
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
                backgroundColor: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ margin: '0 auto', color: '#2563EB' }}>
                <MoonIcon size={28} />
              </div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1E40AF' }}>
                Rest Day
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(30, 64, 175, 0.85)' }}>
                {selectedSession.restDayReason || 'Scheduled recovery day.'}
              </p>
              {onSelectDateAndTab && (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => onSelectDateAndTab(selectedDate, 'workout')}
                  style={{ alignSelf: 'center', marginTop: '8px' }}
                >
                  Manage in Workout View
                </button>
              )}
            </div>
          ) : (
            /* NO WORKOUT RECORDED */
            <div
              style={{
                border: '1px dashed #DEE0ED',
                borderRadius: '12px',
                padding: '28px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <div style={{ color: 'rgba(37,41,67,0.35)' }}>
                <CalendarIcon size={32} />
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'rgba(37,41,67,0.65)' }}>
                No workout recorded on this date.
              </p>
              {onSelectDateAndTab && (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => onSelectDateAndTab(selectedDate, 'workout')}
                >
                  <DumbbellIcon size={14} />
                  <span>Start Workout on this Date</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
