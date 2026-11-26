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

export function GymAnalyticsView({ analytics, templates = [], onRefresh }) {
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

  // Cascading Filter Options derived from analytics.filterOptions and user templates
  const filterOptions = analytics?.filterOptions || {};

  // Normalize template list whether passed as array or object
  const templateList = Array.isArray(templates)
    ? templates
    : Array.isArray(templates?.templates)
    ? templates.templates
    : [];

  // 1. Gather all routine options from backend filterOptions, templates prop, and breakdown
  const routineNamesSet = new Set();

  const addValidRoutine = (item) => {
    if (!item) return;
    const name = typeof item === 'string' ? item : item.name || item.title || item.templateName || item.id;
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (trimmed && !['ALL', 'All Routines', 'All Templates'].includes(trimmed)) {
      routineNamesSet.add(trimmed);
    }
  };

  if (Array.isArray(filterOptions.routines)) {
    filterOptions.routines.forEach(addValidRoutine);
  }
  templateList.forEach(addValidRoutine);
  if (Array.isArray(templatesBreakdown)) {
    templatesBreakdown.forEach(addValidRoutine);
  }

  const routineOptions = Array.from(routineNamesSet).sort().map((name) => ({
    value: name,
    label: name
  }));

  // 2. Cascading Body Parts
  let availableBodyParts = [];
  if (selectedTemplate && filterOptions.bodyPartsByRoutine?.[selectedTemplate]?.length) {
    availableBodyParts = filterOptions.bodyPartsByRoutine[selectedTemplate];
  } else if (selectedTemplate && templateList.length > 0) {
    const matchedTpl = templateList.find(
      (t) => (t.name || t.title) === selectedTemplate || t.id === selectedTemplate || t._id === selectedTemplate
    );
    if (matchedTpl?.bodyParts?.length) {
      availableBodyParts = matchedTpl.bodyParts.map((bp) => bp.name);
    }
  }

  if (!availableBodyParts.length) {
    if (filterOptions.allBodyParts?.length) {
      availableBodyParts = filterOptions.allBodyParts;
    } else if (templateList.length > 0) {
      const bpSet = new Set();
      templateList.forEach((t) => t.bodyParts?.forEach((bp) => bp.name && bpSet.add(bp.name)));
      availableBodyParts = Array.from(bpSet);
    } else {
      availableBodyParts = bodyPartsBreakdown.map((bp) => bp.name);
    }
  }

  const bodyPartOptions = availableBodyParts
    .map((bp) => (typeof bp === 'string' ? bp : bp.name || bp.id))
    .filter(Boolean)
    .map((name) => ({ value: name, label: name }));

  // 3. Cascading Exercises
  let availableExercises = [];
  if (selectedBodyPart && filterOptions.exercisesByBodyPart?.[selectedBodyPart]?.length) {
    availableExercises = filterOptions.exercisesByBodyPart[selectedBodyPart];
  } else if (selectedBodyPart && templateList.length > 0) {
    const exSet = new Set();
    templateList.forEach((t) => {
      t.bodyParts?.forEach((bp) => {
        if (bp.name === selectedBodyPart) {
          bp.exercises?.forEach((ex) => ex.name && exSet.add(ex.name));
        }
      });
    });
    availableExercises = Array.from(exSet);
  }

  if (!availableExercises.length) {
    if (filterOptions.allExercises?.length) {
      availableExercises = filterOptions.allExercises;
    } else if (templateList.length > 0) {
      const exSet = new Set();
      templateList.forEach((t) => {
        t.bodyParts?.forEach((bp) => {
          bp.exercises?.forEach((ex) => ex.name && exSet.add(ex.name));
        });
      });
      availableExercises = Array.from(exSet);
    } else {
      availableExercises = exercisesBreakdown.map((ex) => ex.name);
    }
  }

  const exerciseOptions = availableExercises
    .map((ex) => (typeof ex === 'string' ? ex : ex.name || ex.id))
    .filter(Boolean)
    .map((name) => ({ value: name, label: name }));

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

  const [exerciseModalityFilter, setExerciseModalityFilter] = useState('ALL');

  // Segregate exercises by modality
  const weightExercises = exercisesBreakdown.filter(
    (ex) => !ex.measurementType || ex.measurementType === 'WEIGHT_REPS'
  );
  const bodyweightExercises = exercisesBreakdown.filter(
    (ex) => ex.measurementType === 'BODYWEIGHT_REPS'
  );
  const durationExercises = exercisesBreakdown.filter(
    (ex) => ex.measurementType === 'DURATION'
  );

  const displayedExercises =
    exerciseModalityFilter === 'WEIGHT_REPS'
      ? weightExercises
      : exerciseModalityFilter === 'BODYWEIGHT_REPS'
      ? bodyweightExercises
      : exerciseModalityFilter === 'DURATION'
      ? durationExercises
      : exercisesBreakdown;

  // Format decimal values sensibly (e.g., 115.6 instead of 115.60000000000001)
  const formatDecimal = (val, maxDecimals = 1) => {
    const num = Number(val) || 0;
    return num.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
  };

  return (
    <div className="gymflow-analytics-page" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Controls Row: Range Selector + FilterBar */}
      <div className="gymflow-analytics-controls">
        <div className="gymflow-analytics-controls__range">
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

        {/* FilterBar with FilterSelects */}
        <FilterBar
          className="gymflow-analytics-controls__filters"
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

      {/* 5. Exercise-Wise Progression (Dedicated Modality Tabs & Unit Separation) */}
      <SectionCard
        title="Exercise Progression & Performance"
        subtitle="Individual progression separated by weight, bodyweight, and duration"
      >
        {/* Modality Selector Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[
            { id: 'ALL', label: `All Exercises (${exercisesBreakdown.length})` },
            { id: 'WEIGHT_REPS', label: `Weight (${weightExercises.length})` },
            { id: 'BODYWEIGHT_REPS', label: `Bodyweight (${bodyweightExercises.length})` },
            { id: 'DURATION', label: `Duration (${durationExercises.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setExerciseModalityFilter(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: exerciseModalityFilter === tab.id ? '#3A4EFB' : '#EAEBF2',
                color: exerciseModalityFilter === tab.id ? '#FFFFFF' : '#252943'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {displayedExercises.length === 0 ? (
          <EmptyState
            icon={<DumbbellIcon size={32} />}
            title="No Exercise Data Recorded"
            description="Complete workout sets matching this modality to see progression trends and personal records."
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px'
            }}
          >
            {displayedExercises.map((ex) => {
              const mType = ex.measurementType || 'WEIGHT_REPS';

              return (
                <div
                  key={ex.name}
                  style={{
                    backgroundColor: '#F8FAFD',
                    border: '1px solid #E6E9F2',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#252943' }}>
                        {ex.name}
                      </h4>
                      <span style={{ fontSize: '12px', color: 'rgba(37, 41, 67, 0.6)' }}>
                        {ex.targetBodyPart || 'General'} · {ex.sessionsCount || ex.history?.length || 0} sessions
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 7px',
                        borderRadius: '6px',
                        backgroundColor:
                          mType === 'BODYWEIGHT_REPS'
                            ? 'rgba(16, 185, 129, 0.12)'
                            : mType === 'DURATION'
                            ? 'rgba(245, 158, 11, 0.12)'
                            : 'rgba(58, 78, 251, 0.1)',
                        color:
                          mType === 'BODYWEIGHT_REPS'
                            ? '#059669'
                            : mType === 'DURATION'
                            ? '#D97706'
                            : '#3A4EFB'
                      }}
                    >
                      {mType === 'BODYWEIGHT_REPS' ? 'Bodyweight' : mType === 'DURATION' ? 'Duration' : 'Weight & Reps'}
                    </span>
                  </div>

                  {/* Modality-specific metrics */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      backgroundColor: '#FFFFFF',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #EEF0F6'
                    }}
                  >
                    {mType === 'WEIGHT_REPS' && (
                      <>
                        <div>
                          <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.5)', display: 'block' }}>Max Weight</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943' }}>
                            {formatDecimal(ex.maxWeight, 1)} kg
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.5)', display: 'block' }}>Total Volume</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#3A4EFB' }}>
                            {formatDecimal(ex.totalVolume, 0)} kg
                          </span>
                        </div>
                      </>
                    )}

                    {mType === 'BODYWEIGHT_REPS' && (
                      <>
                        <div>
                          <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.5)', display: 'block' }}>Max Reps / Set</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943' }}>
                            {ex.maxReps || 0} reps
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.5)', display: 'block' }}>Max Added Load</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                            +{formatDecimal(ex.maxExtraWeight, 1)} kg
                          </span>
                        </div>
                      </>
                    )}

                    {mType === 'DURATION' && (
                      <>
                        <div>
                          <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.5)', display: 'block' }}>Best Duration</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943' }}>
                            {formatDecimal(ex.maxDurationMinutes, 2)} mins
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.5)', display: 'block' }}>Total Duration</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#D97706' }}>
                            {formatDecimal(ex.totalDurationMinutes, 1)} mins
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* 6. Treadmill & Cardio History (Clean 4-stat grid, properly formatted decimals) */}
      <SectionCard title="Treadmill & Cardio History" subtitle="Independent duration & calorie tracking">
        <div className="gymflow-treadmill-grid">
          <div className="gymflow-treadmill-grid__tile">
            <span className="gymflow-treadmill-grid__label">Total Sessions</span>
            <span className="gymflow-treadmill-grid__val">{treadmill.totalSessions || 0}</span>
          </div>

          <div className="gymflow-treadmill-grid__tile">
            <span className="gymflow-treadmill-grid__label">Total Time</span>
            <span className="gymflow-treadmill-grid__val">{formatDecimal(treadmill.totalMinutes, 1)} mins</span>
          </div>

          <div className="gymflow-treadmill-grid__tile">
            <span className="gymflow-treadmill-grid__label">Calories Burned</span>
            <span className="gymflow-treadmill-grid__val">{formatDecimal(treadmill.caloriesBurned, 1)} kcal</span>
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
