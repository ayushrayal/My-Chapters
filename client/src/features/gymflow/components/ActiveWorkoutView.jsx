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
    const prevWeight = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1].weightKg : 0;
    const prevReps = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1].reps : 0;

    ex.sets.push({
      setNumber: nextSetNum,
      weightKg: prevWeight,
      reps: prevReps,
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
  for (const bp of bodyParts) {
    for (const ex of bp.exercises || []) {
      for (const s of ex.sets || []) {
        totalSets += 1;
        if (s.status === 'COMPLETED') {
          completedSets += 1;
          completedReps += Number(s.actualReps || s.targetReps || 0);
          totalVolume += Number(s.actualWeight || s.targetWeight || 0) * Number(s.actualReps || s.targetReps || 0);
        }
      }
    }
  }
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const routineName = session.templateId?.name || 'Active Workout';

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

                return (
                  <div key={exIdx} className="gymflow-exercise-card">
                    <div className="gymflow-exercise-card__header">
                      <div>
                        <h4 className="gymflow-exercise-card__title">{ex.name}</h4>
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

                    {/* Set Column Headers: SET | WEIGHT | REPS | DONE */}
                    <div className="gymflow-sets-header" aria-hidden="true">
                      <span className="gymflow-sets-header__item">SET</span>
                      <span className="gymflow-sets-header__item gymflow-sets-header__item--left">WEIGHT</span>
                      <span className="gymflow-sets-header__item gymflow-sets-header__item--left">REPS</span>
                      <span className="gymflow-sets-header__item">DONE</span>
                      <span className="gymflow-sets-header__item" style={{ display: 'none' }} />
                    </div>

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
                        >
                          <span className="gymflow-set-row__num">{s.setNumber}</span>

                          {/* Weight Input with "kg" Suffix */}
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

                          {/* Reps Input with "reps" Suffix */}
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '16px 0 24px',
            flexWrap: 'wrap'
          }}
        >
          {onDiscard && (
            <button
              type="button"
              className="btn btn--danger"
              style={{
                backgroundColor: 'transparent',
                color: '#D32F2F',
                borderColor: '#FFCDD2',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onClick={onDiscard}
            >
              <TrashIcon size={15} />
              <span>Discard Workout</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn--primary"
            style={{ marginLeft: 'auto' }}
            onClick={onFinish}
          >
            Finish Workout
          </button>
        </div>
      )}
    </div>
  );
}
