import { useState, useEffect, useRef } from 'react';
import { StatCard } from './common/StatCard.jsx';
import { Chip } from './common/Chip.jsx';
import { EmptyState } from './common/EmptyState.jsx';
import { WindowCard, FolderCard } from '../../../components/common/WindowCard.jsx';
import { FilterChips } from '../../../components/common/FilterControl/FilterChips.jsx';
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
  const [sessionCountFilter, setSessionCountFilter] = useState('ALL');
  const [selectedParent, setSelectedParent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const activeDetailRef = useRef(null);

  useEffect(() => {
    if (selectedPoint && activeDetailRef.current) {
      activeDetailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedPoint]);

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
      parentWorkoutName: selectedParent || undefined,
      templateId: selectedTemplate || undefined,
      bodyPart: selectedBodyPart || undefined,
      exerciseName: selectedExercise || undefined,
      sessionCount: sessionCountFilter !== 'ALL' ? Number(sessionCountFilter) : undefined
    });
  }, [range, sessionCountFilter, selectedParent, selectedTemplate, selectedBodyPart, selectedExercise, onRefresh]);

  const overall = analytics?.overall || {};
  const treadmill = analytics?.treadmill || {};
  const dailyVolumeTrend = analytics?.dailyVolumeTrend || [];
  const templatesBreakdown = analytics?.templatesBreakdown || [];
  const bodyPartsBreakdown = analytics?.bodyPartsBreakdown || [];
  const exercisesBreakdown = analytics?.exercisesBreakdown || [];

  const maxVolume = dailyVolumeTrend.reduce((max, d) => Math.max(max, d.volume || 0), 0) || 1;
  const bestDay = dailyVolumeTrend.reduce((best, cur) => (cur.volume > (best?.volume || 0) ? cur : best), null);

  const activeFiltersCount = [selectedParent, selectedTemplate, selectedBodyPart, selectedExercise].filter(Boolean).length;

  const handleClearFilters = () => {
    setSelectedParent('');
    setSelectedTemplate('');
    setSelectedBodyPart('');
    setSelectedExercise('');
    setSessionCountFilter('ALL');
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

  // Build Parent Options safely with stable IDs and variations
  const parentMap = new Map();

  (filterOptions.parents || []).forEach((p, idx) => {
    if (typeof p === 'string') {
      const trimmed = p.trim();
      if (trimmed && !parentMap.has(trimmed)) {
        parentMap.set(trimmed, {
          id: trimmed,
          value: trimmed,
          label: trimmed,
          variations: []
        });
      }
    } else if (p && typeof p === 'object') {
      const name = (p.name || p.label || p.title || '').trim();
      if (name && !parentMap.has(name)) {
        const id = p.id || p._id || p.value || name;
        parentMap.set(name, {
          id: String(id),
          value: name,
          label: name,
          variations: Array.isArray(p.variations) ? p.variations : []
        });
      }
    }
  });

  // Also harvest from user templateList if any templates have parentWorkoutName
  templateList.forEach((t) => {
    const pName = (t.parentWorkoutName || '').trim();
    if (pName) {
      if (!parentMap.has(pName)) {
        parentMap.set(pName, {
          id: pName,
          value: pName,
          label: pName,
          variations: []
        });
      }
      const existing = parentMap.get(pName);
      const tName = (t.name || t.title || '').trim();
      if (tName && !existing.variations.some((v) => (v.name || v.label) === tName)) {
        existing.variations.push({
          id: String(t._id || t.id || tName),
          name: tName
        });
      }
    }
  });

  const parentOptions = Array.from(parentMap.values());

  // 1. Gather all routine options from backend filterOptions, templates prop, and breakdown
  const activeParentObj = selectedParent
    ? parentOptions.find(
        (p) => p.value === selectedParent || p.label === selectedParent || p.id === selectedParent
      )
    : null;

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

  // If a parent is selected and has variations, restrict routine options to those variations
  const routineOptions = (activeParentObj && activeParentObj.variations?.length > 0)
    ? activeParentObj.variations.map((v) => {
        const name = typeof v === 'string' ? v : v.name || v.label || v.title || v.id;
        const id = (typeof v === 'object' && (v.id || v._id || v.value)) || name;
        return {
          id: String(id),
          value: String(name),
          label: String(name)
        };
      })
    : Array.from(routineNamesSet).sort().map((name) => ({
        id: name,
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
    .map((name) => ({ id: name, value: name, label: name }));

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
    .map((name) => ({ id: name, value: name, label: name }));

  const handleParentChange = (val) => {
    const norm = typeof val === 'object' && val !== null ? val.value || val.name || val.id || '' : (val || '');
    setSelectedParent(norm);
    if (norm) {
      const pObj = parentOptions.find((p) => p.value === norm || p.label === norm || p.id === norm);
      if (pObj && pObj.variations?.length > 0) {
        const hasCurrentTpl = pObj.variations.some(
          (v) => (v.name || v.label || v.id) === selectedTemplate
        );
        if (!hasCurrentTpl) {
          setSelectedTemplate('');
        }
      }
    }
  };

  const handleTemplateChange = (val) => {
    const norm = typeof val === 'object' && val !== null ? val.value || val.name || val.id || '' : (val || '');
    setSelectedTemplate(norm);
    if (norm && filterOptions.bodyPartsByRoutine?.[norm]) {
      const allowed = filterOptions.bodyPartsByRoutine[norm];
      if (selectedBodyPart && !allowed.includes(selectedBodyPart)) {
        setSelectedBodyPart('');
        setSelectedExercise('');
      }
    }
  };

  const handleBodyPartChange = (val) => {
    const norm = typeof val === 'object' && val !== null ? val.value || val.name || val.id || '' : (val || '');
    setSelectedBodyPart(norm);
    if (norm && filterOptions.exercisesByBodyPart?.[norm]) {
      const allowed = filterOptions.exercisesByBodyPart[norm];
      if (selectedExercise && !allowed.includes(selectedExercise)) {
        setSelectedExercise('');
      }
    }
  };

  const handleExerciseChange = (val) => {
    const norm = typeof val === 'object' && val !== null ? val.value || val.name || val.id || '' : (val || '');
    setSelectedExercise(norm);
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

  const visibleExercises = showAllExercises
    ? displayedExercises
    : displayedExercises.slice(0, 6);

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
            selectedParent ? { id: 'parent', label: `Parent: ${selectedParent}`, onRemove: () => handleParentChange('') } : null,
            selectedTemplate ? { id: 'template', label: `Routine: ${selectedTemplate}`, onRemove: () => handleTemplateChange('') } : null,
            selectedBodyPart ? { id: 'bodyPart', label: `Body Part: ${selectedBodyPart}`, onRemove: () => handleBodyPartChange('') } : null,
            selectedExercise ? { id: 'exercise', label: `Exercise: ${selectedExercise}`, onRemove: () => handleExerciseChange('') } : null
          ].filter(Boolean)}
          onClearAll={handleClearFilters}
        >
          {parentOptions.length > 0 && (
            <FilterSelect
              label="Parent"
              value={selectedParent}
              onChange={handleParentChange}
              placeholder="All Parents"
              options={parentOptions}
              allowClear
            />
          )}
          <FilterSelect
            label="Routine"
            value={selectedTemplate}
            onChange={handleTemplateChange}
            placeholder="All Routines"
            options={routineOptions}
            allowClear
          />
          <FilterSelect
            label="Body Part"
            value={selectedBodyPart}
            onChange={handleBodyPartChange}
            placeholder="All Body Parts"
            options={bodyPartOptions}
            allowClear
          />
          <FilterSelect
            label="Exercise"
            value={selectedExercise}
            onChange={handleExerciseChange}
            placeholder="All Exercises"
            options={exerciseOptions}
            allowClear
          />
        </FilterBar>
      </div>

      {/* Completed Session History Filter Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#252943', letterSpacing: '0.04em' }}>
          Completed Sessions:
        </span>
        {['ALL', '2', '3', '5', '7', '14', '30'].map((sc) => (
          <button
            key={sc}
            type="button"
            className={`neo-tag ${sessionCountFilter === sc ? 'neo-tag--lime' : 'neo-tag--subtle'}`}
            style={{ cursor: 'pointer', border: '1.5px solid #252943' }}
            onClick={() => setSessionCountFilter(sc)}
          >
            {sc === 'ALL' ? 'All Sessions' : `Last ${sc}`}
          </button>
        ))}
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
      {(() => {
        const activePoint = selectedPoint || hoveredPoint || (dailyVolumeTrend.length > 0 ? (bestDay || dailyVolumeTrend[dailyVolumeTrend.length - 1]) : null);

        return (
          <WindowCard
            title="Volume Progression Trend"
            action={
              bestDay && bestDay.volume > 0 ? (
                <span className="neo-tag neo-tag--lime">
                  Best: {bestDay.volume.toLocaleString()} kg ({bestDay.date.slice(5)})
                </span>
              ) : null
            }
          >
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'rgba(37, 41, 67, 0.65)', fontWeight: 600 }}>
              Actual weight × reps completed per session
            </p>
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
                      inset: '24px 0 28px 0',
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
                            fontWeight: 700,
                            color: 'rgba(37, 41, 67, 0.45)',
                            minWidth: '44px',
                            textAlign: 'right'
                          }}
                        >
                          {Math.round(maxVolume * step)}kg
                        </span>
                        <div style={{ flex: 1, height: '1.5px', backgroundColor: '#EDF0F7' }} />
                      </div>
                    ))}
                  </div>

                  {/* Chart Bars Scroll Area */}
                  <div
                    className="gymflow-chart-scroll"
                    style={{
                      paddingLeft: '52px',
                      justifyContent: dailyVolumeTrend.length <= 2 ? 'center' : 'flex-start'
                    }}
                  >
                    {dailyVolumeTrend.map((d, idx) => {
                      const heightPct = Math.max(8, Math.round(((d.volume || 0) / maxVolume) * 100));
                      const isBest = bestDay && d.date === bestDay.date && d.volume > 0;
                      const isSelected = activePoint?.date === d.date;
                      const isHovered = hoveredPoint?.date === d.date;

                      return (
                        <div
                          key={idx}
                          role="button"
                          tabIndex={0}
                          aria-label={`Workout on ${d.date}: ${d.volume.toLocaleString()} kg`}
                          className={`gymflow-chart-col ${dailyVolumeTrend.length <= 2 ? 'gymflow-chart-col--sparse' : ''}`}
                          onMouseEnter={() => setHoveredPoint(d)}
                          onMouseLeave={() => setHoveredPoint(null)}
                          onClick={() => setSelectedPoint((prev) => (prev?.date === d.date ? null : d))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedPoint((prev) => (prev?.date === d.date ? null : d));
                            }
                          }}
                        >
                          {/* Safe Non-Clipping In-Chart Floating Tooltip on Hover */}
                          {isHovered && !isSelected && (
                            <div
                              className="gymflow-chart-tooltip"
                              style={{
                                bottom: heightPct > 55 ? `calc(${heightPct}% - 48px)` : `calc(${heightPct}% + 10px)`
                              }}
                            >
                              <span className="gymflow-chart-tooltip__val">{d.volume.toLocaleString()} kg</span>
                              <span className="gymflow-chart-tooltip__tag">
                                {d.setsCount || d.completedSets ? `${d.setsCount || d.completedSets} sets` : `${d.reps || 0} reps`}
                              </span>
                            </div>
                          )}

                          <div className="gymflow-chart-bar-slot">
                            <div
                              className={`gymflow-chart-bar ${isBest ? 'gymflow-chart-bar--best' : ''} ${
                                isSelected ? 'gymflow-chart-bar--selected' : ''
                              }`}
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className={`gymflow-chart-date ${isSelected ? 'gymflow-chart-date--active' : ''}`}>
                            {d.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dedicated Session Details Inspector Card */}
                {activePoint && (
                  <div ref={activeDetailRef} className="gymflow-chart-active-detail">
                    <div className="gymflow-chart-active-detail__header">
                      <div className="gymflow-chart-active-detail__date-row">
                        <span className="gymflow-chart-active-detail__date">
                          {new Date(`${activePoint.date}T00:00:00`).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        {bestDay && activePoint.date === bestDay.date && activePoint.volume > 0 && (
                          <span className="gymflow-chart-active-detail__badge">BEST IN RANGE</span>
                        )}
                      </div>
                      <span className="gymflow-chart-active-detail__hint">
                        {selectedPoint?.date === activePoint.date ? 'Selected session' : 'Hovered session'}
                      </span>
                    </div>

                    <div className="gymflow-chart-active-detail__grid">
                      <div className="gymflow-chart-active-detail__item gymflow-chart-active-detail__item--volume">
                        <span className="gymflow-chart-active-detail__label">TRAINING VOLUME</span>
                        <div className="gymflow-chart-active-detail__val-row">
                          <span className="gymflow-chart-active-detail__value">
                            {(activePoint.volume || 0).toLocaleString()}
                          </span>
                          <span className="gymflow-chart-active-detail__unit">kg</span>
                        </div>
                      </div>

                      <div className="gymflow-chart-active-detail__item">
                        <span className="gymflow-chart-active-detail__label">SETS COMPLETED</span>
                        <div className="gymflow-chart-active-detail__val-row">
                          <span className="gymflow-chart-active-detail__value">
                            {activePoint.setsCount || activePoint.completedSets || '—'}
                          </span>
                          <span className="gymflow-chart-active-detail__unit">sets</span>
                        </div>
                      </div>

                      <div className="gymflow-chart-active-detail__item">
                        <span className="gymflow-chart-active-detail__label">TOTAL REPETITIONS</span>
                        <div className="gymflow-chart-active-detail__val-row">
                          <span className="gymflow-chart-active-detail__value">
                            {(activePoint.reps || 0).toLocaleString()}
                          </span>
                          <span className="gymflow-chart-active-detail__unit">reps</span>
                        </div>
                      </div>

                      <div className="gymflow-chart-active-detail__item">
                        <span className="gymflow-chart-active-detail__label">SESSION SCORE</span>
                        <div className="gymflow-chart-active-detail__val-row">
                          <span className="gymflow-chart-active-detail__value">
                            {activePoint.score ? `${activePoint.score}%` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="gymflow-chart-note-box">
                  Tap any candle above to inspect detailed session breakdown.
                </div>
              </div>
            )}
          </WindowCard>
        );
      })()}

      {/* 4. Routine Breakdown & Body Part Volume (Side by Side Desktop, Stacked Mobile) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          alignItems: 'stretch'
        }}
      >
        {/* Routine Breakdown */}
        <WindowCard title="Routine Breakdown">
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'rgba(37, 41, 67, 0.65)', fontWeight: 600 }}>
            Volume share per workout routine
          </p>
          {templatesBreakdown.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.5)', margin: 0 }}>
              No routine breakdown data available for this range.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {templatesBreakdown.map((t) => {
                const pct = Math.round(((t.totalVolume || 0) / maxRoutineVol) * 100);
                return (
                  <div key={t.name} className="gymflow-breakdown-row">
                    <div className="gymflow-breakdown-row__top">
                      <div>
                        <span className="gymflow-breakdown-row__title">{t.name}</span>
                        <span className="gymflow-breakdown-row__subtext">
                          {t.sessionsCount} sessions · {t.totalSets} sets
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span className="gymflow-breakdown-row__val">
                          {(t.totalVolume || 0).toLocaleString()} kg
                        </span>
                        <div>
                          <span className="gymflow-breakdown-row__score-chip">
                            Score: {t.averageScore || 0}%
                          </span>
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
        </WindowCard>

        {/* Body Part Volume */}
        <WindowCard title="Body Part Volume">
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'rgba(37, 41, 67, 0.65)', fontWeight: 600 }}>
            Volume lifted per muscle group
          </p>
          {bodyPartsBreakdown.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.5)', margin: 0 }}>
              No body part breakdown data available for this range.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bodyPartsBreakdown.map((bp) => {
                const pct = Math.round(((bp.totalVolume || 0) / maxBpVol) * 100);
                return (
                  <div key={bp.name} className="gymflow-breakdown-row">
                    <div className="gymflow-breakdown-row__top">
                      <div>
                        <span className="gymflow-breakdown-row__title">{bp.name}</span>
                        <span className="gymflow-breakdown-row__subtext">
                          {bp.exercisesCount} exercises · {bp.totalReps} reps
                        </span>
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
        </WindowCard>
      </div>

      {/* 5. Exercise-Wise Progression (Dedicated Modality Tabs & Unit Separation) */}
      <WindowCard title="Exercise Progression & Performance">
        {/* Modality Selector Chips */}
        <div style={{ marginBottom: '16px' }}>
          <FilterChips
            options={[
              { id: 'ALL', label: `All Exercises (${exercisesBreakdown.length})` },
              { id: 'WEIGHT_REPS', label: `Weight (${weightExercises.length})` },
              { id: 'BODYWEIGHT_REPS', label: `Bodyweight (${bodyweightExercises.length})` },
              { id: 'DURATION', label: `Duration (${durationExercises.length})` }
            ]}
            value={exerciseModalityFilter}
            onChange={(val) => setExerciseModalityFilter(val || 'ALL')}
            ariaLabel="Filter exercise modality"
            className="gymflow-exercise-filter-chips"
          />
        </div>

        {displayedExercises.length === 0 ? (
          <EmptyState
            icon={<DumbbellIcon size={32} />}
            title="No Exercise Data Recorded"
            description="Complete workout sets matching this modality to see progression trends and personal records."
          />
        ) : (
          <>
            <div className="gymflow-exercise-grid">
              {visibleExercises.map((ex) => {
                const mType = ex.measurementType || 'WEIGHT_REPS';

                return (
                  <FolderCard
                    key={ex.name}
                    tabLabel={ex.targetBodyPart || 'General'}
                    tabColor="blue"
                    className="gymflow-exercise-folder-card"
                  >
                    <div className="gymflow-exercise-card__inner">
                      <div className="gymflow-exercise-card__top">
                        <div className="gymflow-exercise-card__title-col">
                          <h4 className="gymflow-exercise-card__name">{ex.name}</h4>
                          <span className="gymflow-exercise-card__sessions">
                            {ex.sessionsCount || ex.history?.length || 0} sessions
                          </span>
                        </div>
                        <span className="gymflow-exercise-card__modality-chip">
                          {mType === 'BODYWEIGHT_REPS'
                            ? 'Bodyweight'
                            : mType === 'DURATION'
                            ? 'Duration'
                            : 'Weight & Reps'}
                        </span>
                      </div>

                      {/* Modality-specific metrics */}
                      <div className="gymflow-exercise-card__metrics">
                        {mType === 'WEIGHT_REPS' && (
                          <>
                            <div className="gymflow-exercise-card__stat-tile gymflow-exercise-card__stat-tile--white">
                              <span className="gymflow-exercise-card__stat-label">Max Weight</span>
                              <span className="gymflow-exercise-card__stat-val">
                                {formatDecimal(ex.maxWeight, 1)} kg
                              </span>
                            </div>
                            <div className="gymflow-exercise-card__stat-tile gymflow-exercise-card__stat-tile--lime">
                              <span className="gymflow-exercise-card__stat-label">Total Volume</span>
                              <span className="gymflow-exercise-card__stat-val">
                                {formatDecimal(ex.totalVolume, 0)} kg
                              </span>
                            </div>
                          </>
                        )}

                        {mType === 'BODYWEIGHT_REPS' && (
                          <>
                            <div className="gymflow-exercise-card__stat-tile gymflow-exercise-card__stat-tile--white">
                              <span className="gymflow-exercise-card__stat-label">Max Reps / Set</span>
                              <span className="gymflow-exercise-card__stat-val">
                                {ex.maxReps || 0} reps
                              </span>
                            </div>
                            <div className="gymflow-exercise-card__stat-tile gymflow-exercise-card__stat-tile--lime">
                              <span className="gymflow-exercise-card__stat-label">Max Added Load</span>
                              <span className="gymflow-exercise-card__stat-val">
                                +{formatDecimal(ex.maxExtraWeight, 1)} kg
                              </span>
                            </div>
                          </>
                        )}

                        {mType === 'DURATION' && (
                          <>
                            <div className="gymflow-exercise-card__stat-tile gymflow-exercise-card__stat-tile--white">
                              <span className="gymflow-exercise-card__stat-label">Best Duration</span>
                              <span className="gymflow-exercise-card__stat-val">
                                {formatDecimal(ex.maxDurationMinutes, 2)} mins
                              </span>
                            </div>
                            <div className="gymflow-exercise-card__stat-tile gymflow-exercise-card__stat-tile--lime">
                              <span className="gymflow-exercise-card__stat-label">Total Duration</span>
                              <span className="gymflow-exercise-card__stat-val">
                                {formatDecimal(ex.totalDurationMinutes, 1)} mins
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </FolderCard>
                );
              })}
            </div>

            {displayedExercises.length > 6 && (
              <button
                type="button"
                className="btn btn--secondary gymflow-exercise-toggle-btn"
                style={{
                  width: '100%',
                  height: '44px',
                  minHeight: '44px',
                  fontWeight: 800,
                  marginTop: '32px',
                  border: '2px solid #252943',
                  boxShadow: '2px 2px 0 #252943'
                }}
                onClick={() => setShowAllExercises((prev) => !prev)}
              >
                {showAllExercises ? 'Show less' : `Show all ${displayedExercises.length} exercises`}
              </button>
            )}
          </>
        )}
      </WindowCard>

      {/* 6. Treadmill & Cardio History (Clean 4-stat grid, properly formatted decimals) */}
      <WindowCard title="Treadmill & Cardio History">
        <div className="gymflow-treadmill-grid">
          <div className="gymflow-treadmill-grid__tile gymflow-treadmill-grid__tile--sessions">
            <span className="gymflow-treadmill-grid__label">Total Sessions</span>
            <span className="gymflow-treadmill-grid__val">{treadmill.totalSessions || 0}</span>
          </div>

          <div className="gymflow-treadmill-grid__tile gymflow-treadmill-grid__tile--time">
            <span className="gymflow-treadmill-grid__label">Total Time</span>
            <span className="gymflow-treadmill-grid__val">{formatDecimal(treadmill.totalMinutes, 1)} mins</span>
          </div>

          <div className="gymflow-treadmill-grid__tile gymflow-treadmill-grid__tile--calories">
            <span className="gymflow-treadmill-grid__label">Calories Burned</span>
            <span className="gymflow-treadmill-grid__val">{formatDecimal(treadmill.caloriesBurned, 1)} kcal</span>
          </div>

          <div className="gymflow-treadmill-grid__tile gymflow-treadmill-grid__tile--status">
            <span className="gymflow-treadmill-grid__label">Completed / Part / Skip</span>
            <span className="gymflow-treadmill-grid__val">
              {treadmill.completedCount || 0} / {treadmill.partialCount || 0} / {treadmill.skippedCount || 0}
            </span>
          </div>
        </div>
      </WindowCard>

      {/* 7. Detailed Historical Session Progression Table */}
      {Array.isArray(analytics?.detailedSessionTable) && analytics.detailedSessionTable.length > 0 && (
        <WindowCard title="Session History & Set Log">
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'rgba(37, 41, 67, 0.65)', fontWeight: 600 }}>
            Set-by-set breakdown across completed workouts
          </p>
          <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                textAlign: 'left',
                border: '2px solid #252943',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px'
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#252943', color: '#FFFFFF', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 12px', letterSpacing: '0.04em' }}>Date</th>
                  <th style={{ padding: '8px 12px', letterSpacing: '0.04em' }}>Variation / Routine</th>
                  <th style={{ padding: '8px 12px', letterSpacing: '0.04em' }}>Exercise</th>
                  <th style={{ padding: '8px 12px', letterSpacing: '0.04em', textAlign: 'center' }}>Set</th>
                  <th style={{ padding: '8px 12px', letterSpacing: '0.04em' }}>Performance</th>
                  <th style={{ padding: '8px 12px', letterSpacing: '0.04em', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {analytics.detailedSessionTable.slice(0, 50).map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      borderBottom: '1.5px solid #DEE0ED',
                      backgroundColor: rIdx % 2 === 0 ? '#FFFFFF' : '#F5F7FB'
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{row.date}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.templateName || '—'}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#252943' }}>{row.exerciseName}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>S{row.setNumber}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                      {row.weightKg ? `${row.weightKg} kg × ${row.reps} reps` : row.reps ? `${row.reps} reps` : row.durationMinutes ? `${row.durationMinutes} mins` : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span
                        className={`neo-tag ${row.status === 'COMPLETED' ? 'neo-tag--lime' : 'neo-tag--subtle'}`}
                        style={{ fontSize: '10px', padding: '1px 6px' }}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WindowCard>
      )}
    </div>
  );
}
