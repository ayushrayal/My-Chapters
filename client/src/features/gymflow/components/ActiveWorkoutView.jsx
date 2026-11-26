import { useState, useEffect, useRef, useCallback } from 'react';
import { SectionCard } from './common/SectionCard.jsx';
import { Chip } from './common/Chip.jsx';
import { StatusSelect } from './common/StatusSelect.jsx';
import { NumberStepperInput } from './common/NumberStepperInput.jsx';
import {
  PlusIcon,
  TrashIcon,
  CloseIcon,
  MoreHorizontalIcon,
  DumbbellIcon
} from '../../../components/common/Icons.jsx';

export function ActiveWorkoutView({ session, comparisons = {}, onSave, onFinish, onDiscard, isFinished }) {
  const [bodyParts, setBodyParts] = useState(session.bodyParts || []);
  const [treadmill, setTreadmill] = useState(
    session.treadmill || {
      targetMinutes: 10,
      actualMinutes: 0,
      caloriesBurned: 0,
      status: 'PARTIAL',
      skippedReason: ''
    }
  );
  const [newBodyPartName, setNewBodyPartName] = useState('');
  const [newExerciseInputs, setNewExerciseInputs] = useState({});
  const [openBpMenu, setOpenBpMenu] = useState(null);

  const debounceTimerRef = useRef(null);
  const pendingPayloadRef = useRef(null);

  // Flush any pending debounced save immediately
  const flushDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingPayloadRef.current) {
      const { bPs, tMill } = pendingPayloadRef.current;
      pendingPayloadRef.current = null;
      onSave(bPs, tMill);
    }
  }, [onSave]);

  // Clean up timer and flush on unmount
  useEffect(() => {
    return () => {
      flushDebounce();
    };
  }, [flushDebounce]);

  // Sync state whenever session changes
  useEffect(() => {
    setBodyParts(session?.bodyParts || []);
    setTreadmill(
      session?.treadmill || {
        targetMinutes: 10,
        actualMinutes: 0,
        caloriesBurned: 0,
        status: 'PARTIAL',
        skippedReason: ''
      }
    );
    setNewBodyPartName('');
    setNewExerciseInputs({});
    setOpenBpMenu(null);
  }, [session?._id, session?.date]);

  // Auto-save changes helper (immediate for status/structural changes, debounced 350ms for typing)
  const handleUpdate = (newBPs, newTreadmill, immediate = true) => {
    setBodyParts(newBPs);
    const effectiveTreadmill = newTreadmill || treadmill;
    if (newTreadmill) setTreadmill(newTreadmill);

    if (immediate) {
      flushDebounce();
      onSave(newBPs, effectiveTreadmill);
    } else {
      pendingPayloadRef.current = { bPs: newBPs, tMill: effectiveTreadmill };
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        if (pendingPayloadRef.current) {
          const { bPs, tMill } = pendingPayloadRef.current;
          pendingPayloadRef.current = null;
          onSave(bPs, tMill);
        }
      }, 350);
    }
  };

  // Add Body Part to today's session
  const handleAddBodyPart = () => {
    if (!newBodyPartName.trim()) return;
    const updated = [
      ...bodyParts,
      {
        name: newBodyPartName.trim(),
        order: bodyParts.length,
        exercises: []
      }
    ];
    setNewBodyPartName('');
    handleUpdate(updated);
  };

  // Remove Body Part
  const handleRemoveBodyPart = (bpIdx) => {
    const updated = bodyParts.filter((_, i) => i !== bpIdx);
    setOpenBpMenu(null);
    handleUpdate(updated);
  };

  // Add Exercise to today's session
  const handleAddExercise = (bpIdx) => {
    const exName = newExerciseInputs[bpIdx] || '';
    if (!exName.trim()) return;
    const updated = [...bodyParts];
    const bp = updated[bpIdx];
    const plannedSets = 3;
    const sets = [];
    for (let i = 1; i <= plannedSets; i++) {
      sets.push({
        setNumber: i,
        weightKg: 0,
        reps: 0,
        status: 'INCOMPLETE',
        notes: ''
      });
    }

    bp.exercises = bp.exercises || [];
    bp.exercises.push({
      name: exName.trim(),
      targetBodyPart: bp.name,
      plannedSets,
      sets,
      order: bp.exercises.length
    });

    setNewExerciseInputs((prev) => ({ ...prev, [bpIdx]: '' }));
    handleUpdate(updated);
  };

  // Remove Exercise from today's session
  const handleRemoveExercise = (bpIdx, exIdx) => {
    const updated = [...bodyParts];
    updated[bpIdx].exercises = updated[bpIdx].exercises.filter((_, i) => i !== exIdx);
    handleUpdate(updated);
  };

  // Add extra set during workout
  const handleAddSet = (bpIdx, exIdx) => {
    const updated = [...bodyParts];
    const ex = updated[bpIdx].exercises[exIdx];
    const nextSetNum = (ex.sets?.length || 0) + 1;
    ex.sets = ex.sets || [];
    const prevSet = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1] : null;
    const mType = ex.measurementType || 'WEIGHT_REPS';

    ex.sets.push({
      setNumber: nextSetNum,
      weightKg: mType === 'WEIGHT_REPS' ? (prevSet?.weightKg || 0) : 0,
      reps: mType === 'DURATION' ? 0 : (prevSet?.reps || 10),
      extraWeightKg: mType === 'BODYWEIGHT_REPS' ? (prevSet?.extraWeightKg || 0) : 0,
      durationMinutes: mType === 'DURATION' ? (prevSet?.durationMinutes || 1) : 0,
      status: 'INCOMPLETE',
      notes: ''
    });
    handleUpdate(updated);
  };

  // Remove set from exercise
  const handleRemoveSet = (bpIdx, exIdx, setIdx) => {
    const updated = [...bodyParts];
    const ex = updated[bpIdx].exercises[exIdx];
    ex.sets = ex.sets.filter((_, i) => i !== setIdx).map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    handleUpdate(updated);
  };

  // Update set weight, reps, or status (immediate save for status, debounced for typing weight/reps)
  const handleSetChange = (bpIdx, exIdx, setIdx, field, val) => {
    const updated = [...bodyParts];
    const targetSet = updated[bpIdx].exercises[exIdx].sets[setIdx];
    targetSet[field] = val;
    const isImmediate = field === 'status';
    handleUpdate(updated, null, isImmediate);
  };

  // Treadmill change (immediate for status toggle, debounced for duration/calories typing)
  const handleTreadmillChange = (field, val) => {
    const updated = { ...treadmill, [field]: val };
    const isImmediate = field === 'status';
    handleUpdate(bodyParts, updated, isImmediate);
  };

  // Compute total progress
  let totalSets = 0;
  let completedSets = 0;
  let completedReps = 0;
  let totalVolume = 0;
  let totalDuration = 0;
  for (const bp of bodyParts) {
    for (const ex of bp.exercises || []) {
      const mType = ex.measurementType || 'WEIGHT_REPS';
      for (const s of ex.sets || []) {
        totalSets += 1;
        if (s.status === 'COMPLETED') {
          completedSets += 1;
          if (mType === 'WEIGHT_REPS') {
            const w = Number(s.weightKg || s.actualWeight || s.targetWeight || 0);
            const r = Number(s.reps || s.actualReps || s.targetReps || 0);
            completedReps += r;
            totalVolume += w * r;
          } else if (mType === 'BODYWEIGHT_REPS') {
            const r = Number(s.reps || s.actualReps || s.targetReps || 0);
            completedReps += r;
          } else if (mType === 'DURATION') {
            totalDuration += Number(s.durationMinutes || 0);
          }
        }
      }
    }
  }
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const routineName = session.templateId?.name || session.templateName || 'Active Workout';

  return (
    <div className="gymflow-active-workout" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Workout Progress / Finished Unified Status Card */}
      {isFinished ? (
        <div className="gymflow-finished-status-card">
          <div className="gymflow-finished-status-card__top">
            <div className="gymflow-finished-status-card__routine-group">
              <Chip variant="lime">✓ Finished</Chip>
              <h3 className="gymflow-finished-status-card__routine-title">{routineName}</h3>
            </div>
            <div className="gymflow-finished-status-card__score-box">
              <span className="gymflow-finished-status-card__score-val">
                {session?.scoreBreakdown?.totalScore ?? 100}%
              </span>
              <span className="gymflow-finished-status-card__score-label">Workout Score</span>
            </div>
          </div>

          <div className="gymflow-finished-status-card__progress-row">
            <span className="gymflow-finished-status-card__stats-label">
              {completedSets} of {totalSets} sets done ({completedReps} reps · {totalVolume.toLocaleString()} kg)
            </span>
            <div className="gymflow-sticky-progress__bar-box">
              <div
                className="gymflow-sticky-progress__bar-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {onFinish && (
            <div className="gymflow-finished-status-card__reopen-row">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => onFinish(false)}
              >
                Re-open Workout
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="gymflow-sticky-progress">
          <div className="gymflow-sticky-progress__left">
            <span className="gymflow-sticky-progress__routine">{routineName}</span>
            <span className="gymflow-sticky-progress__stats">
              {completedSets} of {totalSets} sets done
            </span>
          </div>

          <div className="gymflow-sticky-progress__bar-box">
            <div
              className="gymflow-sticky-progress__bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <span className="gymflow-sticky-progress__pct">{progressPct}%</span>
        </div>
      )}

      {/* 2. Cardio & Treadmill Card */}
      <SectionCard
        title="Cardio & Warmup"
        subtitle="Independent duration & calorie tracking"
        badge={<Chip variant="gradient-tint">Treadmill</Chip>}
      >
        {/* Status segmented control on its own row on mobile */}
        <div className="gymflow-status-chips-row" role="group" aria-label="Cardio Status">
          {[
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'PARTIAL', label: 'Partial' },
            { id: 'SKIPPED', label: 'Skipped' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`gymflow-status-chip-btn ${treadmill.status === item.id ? 'gymflow-status-chip-btn--active' : ''}`}
              onClick={() => handleTreadmillChange('status', item.id)}
              disabled={isFinished}
            >
              {item.label}
            </button>
          ))}
        </div>

        {treadmill.status === 'SKIPPED' ? (
          <div style={{ marginTop: '8px' }}>
            <input
              type="text"
              className="gymflow-stepper__input"
              style={{
                border: '1px solid #DEE0ED',
                borderRadius: '12px',
                padding: '12px 14px',
                width: '100%',
                backgroundColor: '#ffffff',
                textAlign: 'left'
              }}
              placeholder="Reason for skipping treadmill..."
              value={treadmill.skippedReason || ''}
              onChange={(e) => handleTreadmillChange('skippedReason', e.target.value)}
              disabled={isFinished}
              required
            />
          </div>
        ) : (
          <div className="gymflow-cardio-grid" style={{ marginTop: '4px' }}>
            <div className="gymflow-cardio-grid__field">
              <label htmlFor="treadmill-target">Target (Mins)</label>
              <NumberStepperInput
                id="treadmill-target"
                value={treadmill.targetMinutes || 10}
                onChange={(val) => handleTreadmillChange('targetMinutes', Math.max(10, val))}
                min={10}
                max={120}
                step={5}
                suffix="mins"
                disabled={isFinished}
                ariaLabel="Target Minutes"
              />
            </div>

            <div className="gymflow-cardio-grid__field">
              <label htmlFor="treadmill-actual">Actual (Mins)</label>
              <NumberStepperInput
                id="treadmill-actual"
                value={treadmill.actualMinutes || 0}
                onChange={(val) => handleTreadmillChange('actualMinutes', Math.max(0, val))}
                min={0}
                max={240}
                step={1}
                suffix="mins"
                disabled={isFinished}
                ariaLabel="Actual Minutes"
              />
            </div>

            <div className="gymflow-cardio-grid__field">
              <label htmlFor="treadmill-calories">Calories Burned</label>
              <NumberStepperInput
                id="treadmill-calories"
                value={treadmill.caloriesBurned || 0}
                onChange={(val) => handleTreadmillChange('caloriesBurned', Math.max(0, val))}
                min={0}
                max={2000}
                step={10}
                suffix="kcal"
                disabled={isFinished}
                ariaLabel="Calories Burned"
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* 3. Body Part Sections */}
      {bodyParts.map((bp, bpIdx) => {
        let bpTotalSets = 0;
        let bpDoneSets = 0;
        for (const ex of bp.exercises || []) {
          for (const s of ex.sets || []) {
            bpTotalSets++;
            if (s.status === 'COMPLETED') bpDoneSets++;
          }
        }

        return (
          <SectionCard
            key={bpIdx}
            title={bp.name}
            badge={<Chip variant="muted">{bpDoneSets} of {bpTotalSets} sets done</Chip>}
            action={
              !isFinished && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="btn-icon btn-icon--sm"
                    onClick={() => setOpenBpMenu(openBpMenu === bpIdx ? null : bpIdx)}
                    aria-label={`Options for ${bp.name}`}
                  >
                    <MoreHorizontalIcon size={16} />
                  </button>

                  {openBpMenu === bpIdx && (
                    <div className="gymflow-dropdown-menu">
                      <button
                        type="button"
                        className="gymflow-dropdown-item"
                        style={{ color: '#DC2626' }}
                        onClick={() => handleRemoveBodyPart(bpIdx)}
                      >
                        <TrashIcon size={14} />
                        <span>Delete Body Part</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            }
          >
            {/* Exercise Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(bp.exercises || []).map((ex, exIdx) => {
                const compKey = ex._id?.toString() || ex.name;
                const prev = comparisons[compKey];
                const mType = ex.measurementType || 'WEIGHT_REPS';

                return (
                  <div key={exIdx} className="gymflow-exercise-card">
                    <div className="gymflow-exercise-card__header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 className="gymflow-exercise-card__title" style={{ margin: 0 }}>{ex.name}</h4>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              backgroundColor:
                                mType === 'DURATION'
                                  ? 'rgba(79, 70, 229, 0.1)'
                                  : mType === 'BODYWEIGHT_REPS'
                                  ? 'rgba(16, 185, 129, 0.1)'
                                  : 'rgba(37, 41, 67, 0.08)',
                              color:
                                mType === 'DURATION'
                                  ? '#4F46E5'
                                  : mType === 'BODYWEIGHT_REPS'
                                  ? '#059669'
                                  : '#252943'
                            }}
                          >
                            {mType === 'DURATION' ? 'Duration' : mType === 'BODYWEIGHT_REPS' ? 'Bodyweight' : 'Weight + Reps'}
                          </span>
                        </div>
                        {prev && (
                          <span
                            className="gymflow-exercise-card__prev-pill"
                            title={`Recorded on ${prev.previousDate}`}
                          >
                            Prev: {prev.previousMaxWeight} kg max · {prev.previousTotalReps} reps
                          </span>
                        )}
                      </div>

                      {!isFinished && (
                        <button
                          type="button"
                          className="btn-icon btn-icon--sm btn-icon--danger"
                          onClick={() => handleRemoveExercise(bpIdx, exIdx)}
                          aria-label={`Remove ${ex.name}`}
                          title="Remove Exercise"
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>

                    {/* Set Column Headers: depends on measurement type */}
                    {mType === 'WEIGHT_REPS' && (
                      <div className="gymflow-sets-header" aria-hidden="true">
                        <span className="gymflow-sets-header__item">SET</span>
                        <span className="gymflow-sets-header__item gymflow-sets-header__item--left">WEIGHT</span>
                        <span className="gymflow-sets-header__item gymflow-sets-header__item--left">REPS</span>
                        <span className="gymflow-sets-header__item">DONE</span>
                        <span className="gymflow-sets-header__item" style={{ display: 'none' }} />
                      </div>
                    )}

                    {mType === 'BODYWEIGHT_REPS' && (
                      <div className="gymflow-sets-header gymflow-sets-header--bodyweight" aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: '32px 60px 1fr 1fr 44px 28px', gap: '8px' }}>
                        <span className="gymflow-sets-header__item">SET</span>
                        <span className="gymflow-sets-header__item">TYPE</span>
                        <span className="gymflow-sets-header__item gymflow-sets-header__item--left">REPS</span>
                        <span className="gymflow-sets-header__item gymflow-sets-header__item--left">EXTRA WT</span>
                        <span className="gymflow-sets-header__item">DONE</span>
                        <span className="gymflow-sets-header__item" style={{ display: 'none' }} />
                      </div>
                    )}

                    {mType === 'DURATION' && (
                      <div className="gymflow-sets-header gymflow-sets-header--duration" aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: '32px 1fr 44px 28px', gap: '8px' }}>
                        <span className="gymflow-sets-header__item">SET</span>
                        <span className="gymflow-sets-header__item gymflow-sets-header__item--left">DURATION (MINS)</span>
                        <span className="gymflow-sets-header__item">DONE</span>
                        <span className="gymflow-sets-header__item" style={{ display: 'none' }} />
                      </div>
                    )}

                    {/* Set Rows Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(ex.sets || []).map((s, sIdx) => (
                        <div
                          key={sIdx}
                          className={`gymflow-set-row ${
                            s.status === 'COMPLETED'
                              ? 'gymflow-set-row--completed'
                              : s.status === 'SKIPPED'
                              ? 'gymflow-set-row--skipped'
                              : ''
                          }`}
                          style={
                            mType === 'BODYWEIGHT_REPS'
                              ? { display: 'grid', gridTemplateColumns: '32px 60px 1fr 1fr 44px 28px', gap: '8px', alignItems: 'center' }
                              : mType === 'DURATION'
                              ? { display: 'grid', gridTemplateColumns: '32px 1fr 44px 28px', gap: '8px', alignItems: 'center' }
                              : undefined
                          }
                        >
                          <span className="gymflow-set-row__num">{s.setNumber}</span>

                          {/* WEIGHT_REPS Inputs */}
                          {mType === 'WEIGHT_REPS' && (
                            <>
                              <div className="gymflow-set-row__input-cell">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="999"
                                  inputMode="decimal"
                                  className="gymflow-set-row__input"
                                  value={s.weightKg === 0 ? '' : s.weightKg}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleSetChange(
                                      bpIdx,
                                      exIdx,
                                      sIdx,
                                      'weightKg',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  onFocus={(e) => e.target.select()}
                                  disabled={isFinished}
                                  aria-label={`Set ${s.setNumber} Weight in kg`}
                                />
                                <span className="gymflow-set-row__suffix">kg</span>
                              </div>

                              <div className="gymflow-set-row__input-cell">
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  inputMode="numeric"
                                  className="gymflow-set-row__input"
                                  value={s.reps === 0 ? '' : s.reps}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleSetChange(
                                      bpIdx,
                                      exIdx,
                                      sIdx,
                                      'reps',
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  onFocus={(e) => e.target.select()}
                                  disabled={isFinished}
                                  aria-label={`Set ${s.setNumber} Reps`}
                                />
                                <span className="gymflow-set-row__suffix">reps</span>
                              </div>
                            </>
                          )}

                          {/* BODYWEIGHT_REPS Inputs */}
                          {mType === 'BODYWEIGHT_REPS' && (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                    color: '#059669',
                                    padding: '4px 8px',
                                    borderRadius: '6px'
                                  }}
                                >
                                  BW
                                </span>
                              </div>

                              <div className="gymflow-set-row__input-cell">
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  inputMode="numeric"
                                  className="gymflow-set-row__input"
                                  value={s.reps === 0 ? '' : s.reps}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleSetChange(
                                      bpIdx,
                                      exIdx,
                                      sIdx,
                                      'reps',
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  onFocus={(e) => e.target.select()}
                                  disabled={isFinished}
                                  aria-label={`Set ${s.setNumber} Reps`}
                                />
                                <span className="gymflow-set-row__suffix">reps</span>
                              </div>

                              <div className="gymflow-set-row__input-cell">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="500"
                                  inputMode="decimal"
                                  className="gymflow-set-row__input"
                                  value={s.extraWeightKg === 0 ? '' : s.extraWeightKg}
                                  placeholder="+0"
                                  onChange={(e) =>
                                    handleSetChange(
                                      bpIdx,
                                      exIdx,
                                      sIdx,
                                      'extraWeightKg',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  onFocus={(e) => e.target.select()}
                                  disabled={isFinished}
                                  aria-label={`Set ${s.setNumber} Extra Weight in kg`}
                                />
                                <span className="gymflow-set-row__suffix">+kg</span>
                              </div>
                            </>
                          )}

                          {/* DURATION Inputs */}
                          {mType === 'DURATION' && (
                            <div className="gymflow-set-row__input-cell" style={{ width: '100%' }}>
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max="1440"
                                inputMode="decimal"
                                className="gymflow-set-row__input"
                                value={s.durationMinutes === 0 ? '' : s.durationMinutes}
                                placeholder="1.0"
                                onChange={(e) =>
                                  handleSetChange(
                                    bpIdx,
                                    exIdx,
                                    sIdx,
                                    'durationMinutes',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                onFocus={(e) => e.target.select()}
                                disabled={isFinished}
                                aria-label={`Set ${s.setNumber} Duration in minutes`}
                              />
                              <span className="gymflow-set-row__suffix">mins</span>
                            </div>
                          )}

                          {/* 44px Circular Check Toggle */}
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <StatusSelect
                              status={s.status}
                              onChange={(newStatus) =>
                                handleSetChange(bpIdx, exIdx, sIdx, 'status', newStatus)
                              }
                              disabled={isFinished}
                            />
                          </div>

                          {/* Desktop Delete Set Button */}
                          {!isFinished && (
                            <button
                              type="button"
                              className="gymflow-set-row__delete-btn"
                              onClick={() => handleRemoveSet(bpIdx, exIdx, sIdx)}
                              aria-label={`Remove set ${s.setNumber}`}
                              title="Remove set"
                            >
                              <CloseIcon size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* + Add Set full-width button */}
                    {!isFinished && (
                      <button
                        type="button"
                        className="gymflow-add-set-btn"
                        onClick={() => handleAddSet(bpIdx, exIdx)}
                      >
                        <PlusIcon size={15} />
                        <span>Add Set</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* + Add exercise to {Body part} */}
            {!isFinished && (
              <div className="gymflow-inline-add-row">
                <input
                  type="text"
                  placeholder={`+ Add exercise to ${bp.name}...`}
                  value={newExerciseInputs[bpIdx] || ''}
                  onChange={(e) =>
                    setNewExerciseInputs({ ...newExerciseInputs, [bpIdx]: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddExercise(bpIdx);
                    }
                  }}
                  aria-label={`Add exercise to ${bp.name}`}
                />
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => handleAddExercise(bpIdx)}
                >
                  Add
                </button>
              </div>
            )}
          </SectionCard>
        );
      })}

      {/* 4. Add Body Part Card (wraps to 2 rows on mobile) */}
      {!isFinished && (
        <div className="gymflow-add-bp-card">
          <input
            type="text"
            placeholder="Add another body part (e.g. Abs, Forearms)..."
            value={newBodyPartName}
            onChange={(e) => setNewBodyPartName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddBodyPart()}
            aria-label="New body part name"
          />
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleAddBodyPart}
          >
            Add Body Part
          </button>
        </div>
      )}

      {/* 5. Active Workout Actions (Finish & Discard) */}
      {!isFinished && (
        <div className="gymflow-active-workout-bottom-actions">
          {onDiscard && (
            <button
              type="button"
              className="btn btn--danger gymflow-btn-discard"
              onClick={onDiscard}
              aria-label="Discard workout"
            >
              <TrashIcon size={15} />
              <span>Discard Workout</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn--primary gymflow-btn-finish"
            onClick={onFinish}
            aria-label="Finish workout"
          >
            Finish Workout
          </button>
        </div>
      )}
    </div>
  );
}
