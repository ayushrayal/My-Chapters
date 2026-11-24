import { useState, useEffect } from 'react';
import { SectionCard } from './common/SectionCard.jsx';
import { StatCard } from './common/StatCard.jsx';
import { Chip } from './common/Chip.jsx';
import { EmptyState } from './common/EmptyState.jsx';
import {
  SegmentedFilter,
  FilterBar,
  FilterSelect
} from '../../../components/common/FilterControl/index.js';
import {
  BarChartIcon,
  FilterIcon,
  MoonIcon,
  DumbbellIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon
} from '../../../components/common/Icons.jsx';

export function GymAnalyticsView({ analytics, onRefresh }) {
  const [range, setRange] = useState('30d');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Sync refresh on filter changes
  useEffect(() => {
    let days = 30;
    if (range === '7d') days = 7;
    if (range === '90d') days = 90;

    const end = new Date().toISOString().split('T')[0];
    const d = new Date();
    d.setDate(d.getDate() - days);
    const start = d.toISOString().split('T')[0];

    onRefresh({
      startDate: start,
      endDate: end,
      templateId: selectedTemplate || undefined,
      bodyPart: selectedBodyPart || undefined,
      exerciseName: selectedExercise || undefined
    });
  }, [range, selectedTemplate, selectedBodyPart, selectedExercise, onRefresh]);

  const overall = analytics?.overall || {};
  const treadmill = analytics?.treadmill || {};
  const dailyVolumeTrend = analytics?.dailyVolumeTrend || [];
  const templatesBreakdown = analytics?.templatesBreakdown || [];
  const bodyPartsBreakdown = analytics?.bodyPartsBreakdown || [];
  const exercisesBreakdown = analytics?.exercisesBreakdown || [];

  const maxVolume = dailyVolumeTrend.reduce((max, d) => Math.max(max, d.volume || 0), 0) || 1;
  const bestDay = dailyVolumeTrend.reduce((best, cur) => (cur.volume > (best?.volume || 0) ? cur : best), null);

  const activeFiltersCount = [selectedTemplate, selectedBodyPart, selectedExercise].filter(Boolean).length;

  const handleClearFilters = () => {
    setSelectedTemplate('');
    setSelectedBodyPart('');
    setSelectedExercise('');
  };

  const maxRoutineVol = templatesBreakdown.reduce((max, t) => Math.max(max, t.totalVolume || 0), 0) || 1;
  const maxBpVol = bodyPartsBreakdown.reduce((max, bp) => Math.max(max, bp.totalVolume || 0), 0) || 1;

  // Cascading Filter Options derived from analytics.filterOptions
  const filterOptions = analytics?.filterOptions || {};

  const routineOptions = (filterOptions.routines?.length ? filterOptions.routines : templatesBreakdown).map((t) => ({
    value: t.name || t.id,
    label: t.name
  }));

  let availableBodyParts = [];
  if (selectedTemplate && filterOptions.bodyPartsByRoutine?.[selectedTemplate]) {
    availableBodyParts = filterOptions.bodyPartsByRoutine[selectedTemplate];
  } else if (filterOptions.allBodyParts?.length) {
    availableBodyParts = filterOptions.allBodyParts;
  } else {
    availableBodyParts = bodyPartsBreakdown.map((bp) => bp.name);
  }
  const bodyPartOptions = availableBodyParts.map((bp) => ({ value: bp, label: bp }));

  let availableExercises = [];
  if (selectedBodyPart && filterOptions.exercisesByBodyPart?.[selectedBodyPart]) {
    availableExercises = filterOptions.exercisesByBodyPart[selectedBodyPart];
  } else if (filterOptions.allExercises?.length) {
    availableExercises = filterOptions.allExercises;
  } else {
    availableExercises = exercisesBreakdown.map((ex) => ex.name);
  }
  const exerciseOptions = availableExercises.map((ex) => ({ value: ex, label: ex }));

  const handleTemplateChange = (val) => {
    setSelectedTemplate(val);
    if (val && filterOptions.bodyPartsByRoutine?.[val]) {
      const allowed = filterOptions.bodyPartsByRoutine[val];
      if (selectedBodyPart && !allowed.includes(selectedBodyPart)) {
        setSelectedBodyPart('');
        setSelectedExercise('');
      }
    }
  };

  const handleBodyPartChange = (val) => {
    setSelectedBodyPart(val);
    if (val && filterOptions.exercisesByBodyPart?.[val]) {
      const allowed = filterOptions.exercisesByBodyPart[val];
      if (selectedExercise && !allowed.includes(selectedExercise)) {
        setSelectedExercise('');
      }
    }
  };

  const handleExerciseChange = (val) => {
    setSelectedExercise(val);
  };

  return (
    <div className="gymflow-analytics-page" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Controls Row: Range Selector + FilterBar */}
      <div className="gymflow-analytics-controls" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Range Segmented Control */}
          <div style={{ minWidth: '280px', flex: '0 1 auto' }}>
            <SegmentedFilter
              options={[
                { id: '7d', label: 'Last 7 days' },
                { id: '30d', label: 'Last 30 days' },
                { id: '90d', label: 'Last 90 days' }
              ]}
              value={range}
              onChange={setRange}
              ariaLabel="Analytics date range"
            />
          </div>
        </div>

        {/* FilterBar with FilterSelects */}
        <FilterBar
          appliedChips={[
            selectedTemplate ? { id: 'template', label: `Routine: ${selectedTemplate}`, onRemove: () => handleTemplateChange('') } : null,
            selectedBodyPart ? { id: 'bodyPart', label: `Body Part: ${selectedBodyPart}`, onRemove: () => handleBodyPartChange('') } : null,
            selectedExercise ? { id: 'exercise', label: `Exercise: ${selectedExercise}`, onRemove: () => handleExerciseChange('') } : null
          ].filter(Boolean)}
          onClearAll={handleClearFilters}
        >
          <FilterSelect
            label="Routine"
            value={selectedTemplate}
            onChange={handleTemplateChange}
            placeholder="All Routines"
            options={routineOptions}
          />
          <FilterSelect
            label="Body Part"
            value={selectedBodyPart}
            onChange={handleBodyPartChange}
            placeholder="All Body Parts"
            options={bodyPartOptions}
          />
          <FilterSelect
            label="Exercise"
            value={selectedExercise}
            onChange={handleExerciseChange}
            placeholder="All Exercises"
            options={exerciseOptions}
          />
        </FilterBar>
      </div>

      {/* 2. KPI Grid (4 columns desktop, 2x2 mobile) */}
      <div className="gymflow-kpi-grid">
        <StatCard
          isHero
          label="Workout Score"
          value={overall.averageScore || 0}
          unit="%"
          progressPct={overall.averageScore || 0}
          subtext={`${overall.totalWorkouts || 0} finished · Based on sets, reps & progression`}
          tooltip="Quality score across finished workouts based on set completion, volume progression, and rep count."
        />

        <StatCard
          label="Total Volume Lifted"
          value={overall.totalVolume || 0}
          unit="kg"
          subtext={`Across ${overall.totalCompletedSets || 0} completed sets`}
          tooltip="Cumulative training volume: Sum of (Actual Weight × Completed Reps) across eligible completed sets."
          icon={<DumbbellIcon size={20} />}
        />

        <StatCard
          label="Total Repetitions"
          value={overall.totalReps || 0}
          subtext="From completed sets only"
          tooltip="Actual completed reps across all eligible sets. Incomplete or skipped sets are excluded."
          icon={<CheckCircleIcon size={20} />}
        />

        <StatCard
          label="Exercises Completed"
          value={overall.totalCompletedExercises || 0}
          subtext="With completed sets"
          tooltip="Distinct exercises matching the active filter with at least 1 completed set."
          icon={<SparklesIcon size={20} />}
        />
      </div>

      {/* 3. Volume Progression Chart */}
      <SectionCard
        title="Volume Progression Trend"
        subtitle="Actual weight × reps completed per session"
        badge={
          bestDay && bestDay.volume > 0 ? (
            <Chip variant="lime">
              Best: {bestDay.volume.toLocaleString()} kg ({bestDay.date.slice(5)})
            </Chip>
          ) : null
        }
      >
        {dailyVolumeTrend.length === 0 ? (
          <EmptyState
            icon={<BarChartIcon size={32} />}
            title="No Workout Records in Range"
            description="Log workout sessions to visualize your progressive overload and volume curve."
          />
        ) : (
          <div>
            <div className="gymflow-chart-container">
              {/* Y-Axis Grid Lines */}
              <div
                style={{
                  position: 'absolute',
                  inset: '0 0 24px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  pointerEvents: 'none',
                  zIndex: 0
                }}
              >
                {[1, 0.75, 0.5, 0.25, 0].map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'rgba(37, 41, 67, 0.4)',
                        minWidth: '40px',
                        textAlign: 'right'
                      }}
                    >
                      {Math.round(maxVolume * step)}kg
                    </span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#EDF0F7' }} />
                  </div>
                ))}
              </div>

              {/* Chart Bars Scroll Area */}
              <div
                className="gymflow-chart-scroll"
                style={{
                  paddingLeft: '48px',
                  justifyContent: dailyVolumeTrend.length <= 2 ? 'center' : 'flex-start'
                }}
              >
                {dailyVolumeTrend.map((d, idx) => {
                  const heightPct = Math.max(6, Math.round(((d.volume || 0) / maxVolume) * 100));
                  const isBest = bestDay && d.date === bestDay.date && d.volume > 0;
                  const isHovered = hoveredPoint?.date === d.date;

                  return (
                    <div
                      key={idx}
                      className={`gymflow-chart-col ${dailyVolumeTrend.length <= 2 ? 'gymflow-chart-col--sparse' : ''}`}
                      onMouseEnter={() => setHoveredPoint(d)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => setHoveredPoint(isHovered ? null : d)}
                    >
                      {/* Tooltip on tap/hover */}
                      {isHovered && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: `calc(${heightPct}% + 10px)`,
                            backgroundColor: '#252943',
                            color: '#ffffff',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            zIndex: 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            pointerEvents: 'none'
                          }}
                        >
                          <div>{d.date}</div>
                          <div style={{ color: '#E3FF3B' }}>{d.volume.toLocaleString()} kg</div>
                          {d.setsCount && <div>{d.setsCount} sets</div>}
                        </div>
                      )}

                      <div className="gymflow-chart-bar-slot">
                        <div
                          className={`gymflow-chart-bar ${isBest ? 'gymflow-chart-bar--best' : ''}`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="gymflow-chart-date">{d.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {dailyVolumeTrend.length <= 2 && (
              <p
                style={{
                  textAlign: 'center',
                  fontSize: '12.5px',
                  color: 'rgba(37, 41, 67, 0.6)',
                  margin: '8px 0 0'
                }}
              >
                Log more workouts to see your full performance trend curve.
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* 4. Routine Breakdown & Body Part Volume (Side by Side Desktop, Stacked Mobile) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Routine Breakdown */}
        <SectionCard title="Routine Breakdown" subtitle="Volume share per workout routine">
          {templatesBreakdown.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.5)', margin: 0 }}>
              No routine breakdown data available for this range.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {templatesBreakdown.map((t) => {
                const pct = Math.round(((t.totalVolume || 0) / maxRoutineVol) * 100);
                return (
                  <div key={t.name} className="gymflow-breakdown-row">
                    <div className="gymflow-breakdown-row__top">
                      <div>
                        <span className="gymflow-breakdown-row__title">{t.name}</span>
                        <div style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)' }}>
                          {t.sessionsCount} sessions · {t.totalSets} sets
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="gymflow-breakdown-row__val">
                          {(t.totalVolume || 0).toLocaleString()} kg
                        </span>
                        <div>
                          <Chip variant="gradient-tint" style={{ padding: '2px 6px', fontSize: '11px' }}>
                            Score: {t.averageScore || 0}%
                          </Chip>
                        </div>
                      </div>
                    </div>
                    <div className="gymflow-breakdown-row__bar-track">
                      <div className="gymflow-breakdown-row__bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Body Part Volume */}
        <SectionCard title="Body Part Volume" subtitle="Volume lifted per muscle group">
          {bodyPartsBreakdown.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.5)', margin: 0 }}>
              No body part breakdown data available for this range.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bodyPartsBreakdown.map((bp) => {
                const pct = Math.round(((bp.totalVolume || 0) / maxBpVol) * 100);
                return (
                  <div key={bp.name} className="gymflow-breakdown-row">
                    <div className="gymflow-breakdown-row__top">
                      <div>
                        <span className="gymflow-breakdown-row__title">{bp.name}</span>
                        <div style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)' }}>
                          {bp.exercisesCount} exercises · {bp.totalReps} reps
                        </div>
                      </div>
                      <span className="gymflow-breakdown-row__val">
                        {(bp.totalVolume || 0).toLocaleString()} kg
                      </span>
                    </div>
                    <div className="gymflow-breakdown-row__bar-track">
                      <div className="gymflow-breakdown-row__bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* 5. Treadmill & Cardio History (4-stat grid) */}
      <SectionCard title="Treadmill & Cardio History" subtitle="Independent duration & calorie tracking">
        <div className="gymflow-treadmill-grid">
          <div className="gymflow-treadmill-grid__tile">
            <span className="gymflow-treadmill-grid__label">Total Sessions</span>
            <span className="gymflow-treadmill-grid__val">{treadmill.totalSessions || 0}</span>
          </div>

          <div className="gymflow-treadmill-grid__tile">
            <span className="gymflow-treadmill-grid__label">Total Time</span>
            <span className="gymflow-treadmill-grid__val">{treadmill.totalMinutes || 0} mins</span>
          </div>

          <div className="gymflow-treadmill-grid__tile">
            <span className="gymflow-treadmill-grid__label">Calories Burned</span>
            <span className="gymflow-treadmill-grid__val">{treadmill.caloriesBurned || 0} kcal</span>
          </div>

          <div className="gymflow-treadmill-grid__tile">
            <span className="gymflow-treadmill-grid__label">Completed / Part / Skip</span>
            <span className="gymflow-treadmill-grid__val">
              {treadmill.completedCount || 0} / {treadmill.partialCount || 0} / {treadmill.skippedCount || 0}
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
