import { useState, useEffect, useRef, useCallback } from 'react';
import { WindowCard, FolderCard } from '../../../components/common/WindowCard.jsx';
import { SegmentedFilter } from '../../../components/common/FilterControl/SegmentedFilter.jsx';
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
      <WindowCard
        title={routineName}
        headerBg={isFinished ? 'lime' : 'canvas'}
        action={
          isFinished ? (
            <span className="neo-tag neo-tag--success">
              Finished · {session?.scoreBreakdown?.totalScore ?? 100}% Score
            </span>
          ) : (
            <span className="neo-tag neo-tag--lime">
              {progressPct}% Done
            </span>
          )
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#252943' }}>
              {completedSets} of {totalSets} sets done
              {totalVolume > 0 && ` (${completedReps} reps · ${totalVolume.toLocaleString()} kg)`}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#168B68' }}>
              {progressPct}%
            </span>
          </div>

          {/* Progress bar in Fresh Green with 2px border */}
          <div
            style={{
              width: '100%',
              height: '14px',
              backgroundColor: '#DEE0ED',
              border: '2px solid #252943',
              borderRadius: '6px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                backgroundColor: '#168B68',
                transition: 'width 0.3s ease'
              }}
            />
          </div>

          {isFinished && onFinish && (
            <div style={{ marginTop: '4px' }}>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ width: '100%', height: '40px' }}
                onClick={() => onFinish(false)}
              >
                Re-open Workout
              </button>
            </div>
          )}
        </div>
      </WindowCard>

      {/* 2. Cardio & Treadmill Card */}
      <WindowCard
        title="Cardio & Warmup"
        headerBg="canvas"
        action={<span className="neo-tag neo-tag--primary">Treadmill</span>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Status 3-option SegmentedFilter */}
          <SegmentedFilter
            options={[
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'PARTIAL', label: 'Partial' },
              { id: 'SKIPPED', label: 'Skipped' }
            ]}
            value={treadmill.status}
            onChange={(val) => handleTreadmillChange('status', val)}
            ariaLabel="Cardio Status"
          />

          {treadmill.status === 'SKIPPED' ? (
            <div style={{ marginTop: '4px' }}>
              <input
                type="text"
                className="form-input"
                style={{
                  border: '2px solid #252943',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  color: '#252943',
                  fontSize: '14px'
                }}
                placeholder="Reason for skipping treadmill..."
                value={treadmill.skippedReason || ''}
                onChange={(e) => handleTreadmillChange('skippedReason', e.target.value)}
                disabled={isFinished}
                required
              />
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                marginTop: '4px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label htmlFor="treadmill-target" className="form-label" style={{ fontSize: '11px' }}>
                  Target (Mins)
                </label>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label htmlFor="treadmill-actual" className="form-label" style={{ fontSize: '11px' }}>
                  Actual (Mins)
                </label>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label htmlFor="treadmill-calories" className="form-label" style={{ fontSize: '11px' }}>
                  Calories Burned
                </label>
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
        </div>
      </WindowCard>

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
          <WindowCard
            key={bpIdx}
            title={bp.name}
            headerBg="canvas"
            action={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="neo-tag neo-tag--lime">
                  {bpDoneSets} of {bpTotalSets} sets done
                </span>
                {!isFinished && (
                  <button
                    type="button"
                    className="btn-icon btn-icon--sm btn-icon--danger"
                    style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                    onClick={() => handleRemoveBodyPart(bpIdx)}
                    aria-label={`Delete ${bp.name}`}
                    title="Delete Body Part"
                  >
                    <TrashIcon size={14} />
                  </button>
                )}
              </div>
            }
          >
            {/* Exercise Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(bp.exercises || []).map((ex, exIdx) => {
                const compKey = ex._id?.toString() || ex.name;
                const prev = comparisons[compKey];
                const mType = ex.measurementType || 'WEIGHT_REPS';

                return (
                  <FolderCard
                    key={exIdx}
                    tabLabel={ex.name}
                    tabColor={mType === 'DURATION' ? 'blue' : mType === 'BODYWEIGHT_REPS' ? 'lime' : 'navy'}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="neo-tag neo-tag--subtle" style={{ fontSize: '10px' }}>
                            {mType === 'DURATION' ? 'Duration' : mType === 'BODYWEIGHT_REPS' ? 'Bodyweight' : 'Weight + Reps'}
                          </span>
                          {prev && (
                            <span style={{ fontSize: '11px', color: '#252943', fontWeight: 700 }}>
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

                      {/* Set Column Headers: exactly matching set row CSS grid */}
                      {mType === 'WEIGHT_REPS' && (
                        <div className="gymflow-sets-header" aria-hidden="true">
                          <span className="gymflow-sets-header__item">SET</span>
                          <span className="gymflow-sets-header__item gymflow-sets-header__item--left">WEIGHT</span>
                          <span className="gymflow-sets-header__item gymflow-sets-header__item--left">REPS</span>
                          <span className="gymflow-sets-header__item">DONE</span>
                        </div>
                      )}

                      {mType === 'BODYWEIGHT_REPS' && (
                        <div className="gymflow-sets-header gymflow-sets-header--bodyweight" aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: '32px 50px 1fr 1fr 44px', gap: '8px' }}>
                          <span className="gymflow-sets-header__item">SET</span>
                          <span className="gymflow-sets-header__item">TYPE</span>
                          <span className="gymflow-sets-header__item gymflow-sets-header__item--left">REPS</span>
                          <span className="gymflow-sets-header__item gymflow-sets-header__item--left">EXTRA WT</span>
                          <span className="gymflow-sets-header__item">DONE</span>
                        </div>
                      )}

                      {mType === 'DURATION' && (
                        <div className="gymflow-sets-header gymflow-sets-header--duration" aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: '32px 1fr 44px', gap: '8px' }}>
                          <span className="gymflow-sets-header__item">SET</span>
                          <span className="gymflow-sets-header__item gymflow-sets-header__item--left">DURATION (MINS)</span>
                          <span className="gymflow-sets-header__item">DONE</span>
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
                                ? { display: 'grid', gridTemplateColumns: '32px 50px 1fr 1fr 44px', gap: '8px', alignItems: 'center' }
                                : mType === 'DURATION'
                                ? { display: 'grid', gridTemplateColumns: '32px 1fr 44px', gap: '8px', alignItems: 'center' }
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
                                  <span className="neo-tag neo-tag--lime" style={{ fontSize: '11px', padding: '3px 6px' }}>
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

                            {/* 44px Square Done Toggle Button */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <StatusSelect
                                status={s.status}
                                onChange={(newStatus) =>
                                  handleSetChange(bpIdx, exIdx, sIdx, 'status', newStatus)
                                }
                                disabled={isFinished}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* + Add Set full-width dashed ghost button */}
                      {!isFinished && (
                        <button
                          type="button"
                          className="gymflow-add-set-btn"
                          onClick={() => handleAddSet(bpIdx, exIdx)}
                          style={{
                            border: '2px dashed #252943',
                            borderRadius: '6px',
                            backgroundColor: 'transparent',
                            color: '#252943',
                            height: '42px',
                            minHeight: '42px',
                            fontWeight: 800,
                            fontSize: '12px',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            marginTop: '4px'
                          }}
                        >
                          <PlusIcon size={15} />
                          <span>Add Set</span>
                        </button>
                      )}
                    </div>
                  </FolderCard>
                );
              })}
            </div>

            {/* + Add exercise to {Body part} row: stacks input over button on mobile */}
            {!isFinished && (
              <div
                className="gymflow-inline-add-row"
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '14px',
                  flexWrap: 'wrap'
                }}
              >
                <input
                  type="text"
                  className="form-input"
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    height: '48px',
                    border: '2px solid #252943',
                    borderRadius: '6px',
                    padding: '0 12px',
                    backgroundColor: '#FFFFFF',
                    fontSize: '14px'
                  }}
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
                  style={{ height: '48px', padding: '0 20px', minWidth: '80px' }}
                  onClick={() => handleAddExercise(bpIdx)}
                >
                  Add
                </button>
              </div>
            )}
          </WindowCard>
        );
      })}

      {/* 4. Add Body Part Card: stacks input over button on mobile */}
      {!isFinished && (
        <div
          className="gymflow-add-bp-card"
          style={{
            display: 'flex',
            gap: '8px',
            backgroundColor: '#FFFFFF',
            border: '2px solid #252943',
            borderRadius: '10px',
            padding: '12px',
            boxShadow: '3px 3px 0 #252943',
            flexWrap: 'wrap'
          }}
        >
          <input
            type="text"
            className="form-input"
            style={{
              flex: 1,
              minWidth: '220px',
              height: '48px',
              border: '2px solid #252943',
              borderRadius: '6px',
              padding: '0 12px',
              backgroundColor: '#FFFFFF',
              fontSize: '14px'
            }}
            placeholder="Add another body part (e.g. Abs, Forearms)..."
            value={newBodyPartName}
            onChange={(e) => setNewBodyPartName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddBodyPart()}
            aria-label="New body part name"
          />
          <button
            type="button"
            className="btn btn--secondary"
            style={{ height: '48px', padding: '0 20px' }}
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
