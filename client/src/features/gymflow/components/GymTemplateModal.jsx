import { useState, useEffect } from 'react';
import { BottomSheetModal } from './common/BottomSheetModal.jsx';
import { NumberStepperInput } from './common/NumberStepperInput.jsx';
import { FilterSelect } from '../../../components/common/FilterControl/FilterSelect.jsx';
import {
  TrashIcon,
  PlusIcon,
  CloseIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '../../../components/common/Icons.jsx';

function generateClientId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialState(tpl) {
  if (!tpl) {
    return {
      name: '',
      description: '',
      bodyParts: []
    };
  }
  return {
    name: tpl.name || '',
    description: tpl.description || '',
    bodyParts: (tpl.bodyParts || []).map((bp, bpIdx) => ({
      _id: bp._id,
      _cid: bp._id ? String(bp._id) : generateClientId('bp'),
      name: bp.name || '',
      order: bp.order ?? bpIdx,
      exercises: (bp.exercises || []).map((ex, exIdx) => ({
        _id: ex._id,
        _cid: ex._id ? String(ex._id) : generateClientId('ex'),
        name: ex.name || '',
        targetBodyPart: ex.targetBodyPart || bp.name || '',
        measurementType: ex.measurementType || 'WEIGHT_REPS',
        plannedSets: Math.max(1, Math.min(20, Number(ex.plannedSets) || 3)),
        notes: ex.notes || '',
        order: ex.order ?? exIdx
      }))
    }))
  };
}

export function GymTemplateModal({ isOpen, template, onClose, onSave }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bodyParts, setBodyParts] = useState([]);
  const [newBodyPartName, setNewBodyPartName] = useState('');
  const [newExerciseNames, setNewExerciseNames] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync state cleanly whenever opening or template changes
  useEffect(() => {
    if (isOpen) {
      const initial = createInitialState(template);
      setName(initial.name);
      setDescription(initial.description);
      setBodyParts(initial.bodyParts);
      setNewBodyPartName('');
      setNewExerciseNames({});
      setExpandedNotes({});
      setError('');
    } else {
      // Clear all state when closed
      setName('');
      setDescription('');
      setBodyParts([]);
      setNewBodyPartName('');
      setNewExerciseNames({});
      setExpandedNotes({});
      setError('');
    }
  }, [isOpen, template]);

  if (!isOpen) return null;

  // Add a new body part
  const handleAddBodyPart = (e) => {
    e?.preventDefault();
    const trimmed = newBodyPartName.trim();
    if (!trimmed) return;

    if (bodyParts.some((bp) => bp.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`A body part named "${trimmed}" already exists in this template.`);
      return;
    }

    const newBp = {
      _cid: generateClientId('bp'),
      name: trimmed,
      order: bodyParts.length,
      exercises: []
    };

    setBodyParts([...bodyParts, newBp]);
    setNewBodyPartName('');
    setError('');
  };

  // Rename a body part
  const handleRenameBodyPart = (bpIdx, newName) => {
    const updated = bodyParts.map((bp, i) => {
      if (i !== bpIdx) return bp;
      return {
        ...bp,
        name: newName,
        // Also update targetBodyPart on all child exercises
        exercises: bp.exercises.map((ex) => ({
          ...ex,
          targetBodyPart: newName
        }))
      };
    });
    setBodyParts(updated);
  };

  // Reorder body parts (move up / down)
  const handleMoveBodyPart = (bpIdx, direction) => {
    const targetIdx = bpIdx + direction;
    if (targetIdx < 0 || targetIdx >= bodyParts.length) return;

    const updated = [...bodyParts];
    const [moved] = updated.splice(bpIdx, 1);
    updated.splice(targetIdx, 0, moved);

    // Re-index order
    const reordered = updated.map((bp, i) => ({ ...bp, order: i }));
    setBodyParts(reordered);
  };

  // Delete a body part
  const handleRemoveBodyPart = (bpIdx) => {
    const updated = bodyParts
      .filter((_, i) => i !== bpIdx)
      .map((bp, i) => ({ ...bp, order: i }));
    setBodyParts(updated);
  };

  // Add exercise to a specific body part (keyed by bp._cid)
  const handleAddExercise = (bpIdx) => {
    const targetBP = bodyParts[bpIdx];
    if (!targetBP) return;
    const cid = targetBP._cid;
    const exName = newExerciseNames[cid] || '';
    const trimmed = exName.trim();
    if (!trimmed) return;

    const newEx = {
      _cid: generateClientId('ex'),
      name: trimmed,
      targetBodyPart: targetBP.name,
      measurementType: 'WEIGHT_REPS',
      plannedSets: 3,
      notes: '',
      order: targetBP.exercises.length
    };

    const updated = bodyParts.map((bp, i) => {
      if (i !== bpIdx) return bp;
      return {
        ...bp,
        exercises: [...bp.exercises, newEx]
      };
    });

    setBodyParts(updated);
    setNewExerciseNames((prev) => ({ ...prev, [cid]: '' }));
  };

  // Rename an exercise
  const handleRenameExercise = (bpIdx, exIdx, newName) => {
    const updated = bodyParts.map((bp, i) => {
      if (i !== bpIdx) return bp;
      const updatedExercises = bp.exercises.map((ex, j) => {
        if (j !== exIdx) return ex;
        return { ...ex, name: newName };
      });
      return { ...bp, exercises: updatedExercises };
    });
    setBodyParts(updated);
  };

  // Change exercise measurement type
  const handleChangeMeasurementType = (bpIdx, exIdx, measurementType) => {
    const updated = bodyParts.map((bp, i) => {
      if (i !== bpIdx) return bp;
      const updatedExercises = bp.exercises.map((ex, j) => {
        if (j !== exIdx) return ex;
        return { ...ex, measurementType };
      });
      return { ...bp, exercises: updatedExercises };
    });
    setBodyParts(updated);
  };

  // Edit exercise notes
  const handleEditExerciseNotes = (bpIdx, exIdx, notes) => {
    const updated = bodyParts.map((bp, i) => {
      if (i !== bpIdx) return bp;
      const updatedExercises = bp.exercises.map((ex, j) => {
        if (j !== exIdx) return ex;
        return { ...ex, notes };
      });
      return { ...bp, exercises: updatedExercises };
    });
    setBodyParts(updated);
  };

  // Change target body part (move exercise to another body part)
  const handleChangeTargetBodyPart = (sourceBpIdx, exIdx, newTargetName) => {
    const targetBpIdx = bodyParts.findIndex((bp) => bp.name === newTargetName);
    if (targetBpIdx === -1 || targetBpIdx === sourceBpIdx) return;

    const sourceBP = bodyParts[sourceBpIdx];
    const exerciseToMove = sourceBP.exercises[exIdx];
    if (!exerciseToMove) return;

    const updatedExercise = {
      ...exerciseToMove,
      targetBodyPart: newTargetName
    };

    const updated = bodyParts.map((bp, i) => {
      if (i === sourceBpIdx) {
        return {
          ...bp,
          exercises: bp.exercises
            .filter((_, j) => j !== exIdx)
            .map((ex, j) => ({ ...ex, order: j }))
        };
      }
      if (i === targetBpIdx) {
        return {
          ...bp,
          exercises: [
            ...bp.exercises,
            { ...updatedExercise, order: bp.exercises.length }
          ]
        };
      }
      return bp;
    });

    setBodyParts(updated);
  };

  // Reorder exercises within body part
  const handleMoveExercise = (bpIdx, exIdx, direction) => {
    const targetBP = bodyParts[bpIdx];
    if (!targetBP) return;
    const targetIdx = exIdx + direction;
    if (targetIdx < 0 || targetIdx >= targetBP.exercises.length) return;

    const updatedExercises = [...targetBP.exercises];
    const [moved] = updatedExercises.splice(exIdx, 1);
    updatedExercises.splice(targetIdx, 0, moved);

    const reordered = updatedExercises.map((ex, i) => ({ ...ex, order: i }));

    const updated = bodyParts.map((bp, i) => {
      if (i !== bpIdx) return bp;
      return { ...bp, exercises: reordered };
    });

    setBodyParts(updated);
  };

  // Remove exercise
  const handleRemoveExercise = (bpIdx, exIdx) => {
    const updated = bodyParts.map((bp, i) => {
      if (i !== bpIdx) return bp;
      return {
        ...bp,
        exercises: bp.exercises
          .filter((_, j) => j !== exIdx)
          .map((ex, j) => ({ ...ex, order: j }))
      };
    });
    setBodyParts(updated);
  };

  // Set planned sets
  const handleSetPlannedSets = (bpIdx, exIdx, count) => {
    const sets = Math.max(1, Math.min(20, Number(count) || 1));
    const updated = bodyParts.map((bp, i) => {
      if (i !== bpIdx) return bp;
      const updatedExercises = bp.exercises.map((ex, j) => {
        if (j !== exIdx) return ex;
        return { ...ex, plannedSets: sets };
      });
      return { ...bp, exercises: updatedExercises };
    });
    setBodyParts(updated);
  };

  // Submit template
  const handleSubmit = async (e) => {
    e?.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Template name is required');
      return;
    }

    // Validate body parts and exercise names
    for (const bp of bodyParts) {
      if (!bp.name.trim()) {
        setError('All body parts must have a valid name.');
        return;
      }
      for (const ex of bp.exercises || []) {
        if (!ex.name.trim()) {
          setError(`An exercise in "${bp.name}" is missing a name.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setError('');

    // Clean payload: strip internal client IDs (_cid)
    const payload = {
      name: trimmedName,
      description: description.trim(),
      bodyParts: bodyParts.map((bp, bpIdx) => ({
        ...(bp._id ? { _id: bp._id } : {}),
        name: bp.name.trim(),
        order: bpIdx,
        exercises: (bp.exercises || []).map((ex, exIdx) => ({
          ...(ex._id ? { _id: ex._id } : {}),
          name: ex.name.trim(),
          targetBodyPart: bp.name.trim(),
          measurementType: ex.measurementType || 'WEIGHT_REPS',
          plannedSets: Math.max(1, Math.min(20, Number(ex.plannedSets) || 3)),
          notes: ex.notes ? ex.notes.trim() : '',
          order: exIdx
        }))
      }))
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save template';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={template ? 'Edit Workout Template' : 'Create Workout Template'}
      subtitle={
        template
          ? `Editing "${template.name}" — adjust muscle groups, exercises & set counts`
          : 'Define reusable routines with target muscle groups and exercises'
      }
      footer={
        <>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div className="dayflow-banner dayflow-banner--error" role="alert">
            <span>{error}</span>
          </div>
        )}

        {/* Template Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="gym-tpl-name" style={{ fontSize: '13px', fontWeight: 700, color: '#252943' }}>
            Template Name *
          </label>
          <input
            id="gym-tpl-name"
            type="text"
            className="dayflow-input"
            style={{ height: '48px', fontSize: '16px' }}
            placeholder="e.g. Push Day, Pull Day, Legs & Abs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            required
            autoComplete="off"
          />
        </div>

        {/* Template Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="gym-tpl-desc" style={{ fontSize: '13px', fontWeight: 700, color: '#252943' }}>
            Description (Optional)
          </label>
          <input
            id="gym-tpl-desc"
            type="text"
            className="dayflow-input"
            style={{ height: '48px', fontSize: '16px' }}
            placeholder="Focus areas, rotation cues, or routine notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            autoComplete="off"
          />
        </div>

        {/* Body Parts & Exercises Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 4px', color: '#252943' }}>
              Body Parts & Exercises
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.65)', margin: 0 }}>
              Add body parts, rename, reorder, and configure planned sets (1–20) for each exercise.
            </p>
          </div>

          {/* Add Body Part Input Row */}
          <div className="gymflow-add-bp-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="dayflow-input"
              style={{ flex: 1, minWidth: '200px', height: '48px', fontSize: '16px' }}
              placeholder="New Body Part (e.g. Chest, Back, Shoulders)..."
              value={newBodyPartName}
              onChange={(e) => setNewBodyPartName(e.target.value)}
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddBodyPart(e);
                }
              }}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn btn--secondary"
              style={{ height: '48px', padding: '0 18px', fontSize: '14px', fontWeight: 700 }}
              onClick={handleAddBodyPart}
              disabled={isSubmitting || !newBodyPartName.trim()}
            >
              <PlusIcon size={15} />
              <span>Add Body Part</span>
            </button>
          </div>

          {/* Body Parts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {bodyParts.map((bp, bpIdx) => {
              const cid = bp._cid;
              const isFirstBp = bpIdx === 0;
              const isLastBp = bpIdx === bodyParts.length - 1;

              return (
                <div
                  key={cid}
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
                  {/* Body Part Header with Rename Input & Controls */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          backgroundColor: '#DEE0ED',
                          color: '#252943',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        BP {bpIdx + 1}
                      </span>
                      <input
                        type="text"
                        className="dayflow-input"
                        style={{
                          height: '36px',
                          fontSize: '15px',
                          fontWeight: 800,
                          color: '#252943',
                          backgroundColor: '#ffffff',
                          flex: 1
                        }}
                        value={bp.name}
                        onChange={(e) => handleRenameBodyPart(bpIdx, e.target.value)}
                        placeholder="Body Part Name"
                        disabled={isSubmitting}
                        aria-label={`Body Part ${bpIdx + 1} name`}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {/* Move Up */}
                      <button
                        type="button"
                        className="btn-icon btn-icon--sm"
                        onClick={() => handleMoveBodyPart(bpIdx, -1)}
                        disabled={isFirstBp || isSubmitting}
                        title="Move body part up"
                        aria-label={`Move ${bp.name} up`}
                      >
                        <ChevronUpIcon size={15} />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        className="btn-icon btn-icon--sm"
                        onClick={() => handleMoveBodyPart(bpIdx, 1)}
                        disabled={isLastBp || isSubmitting}
                        title="Move body part down"
                        aria-label={`Move ${bp.name} down`}
                      >
                        <ChevronDownIcon size={15} />
                      </button>

                      {/* Delete Body Part */}
                      <button
                        type="button"
                        className="btn-icon btn-icon--sm btn-icon--danger"
                        onClick={() => handleRemoveBodyPart(bpIdx)}
                        disabled={isSubmitting}
                        title="Delete body part"
                        aria-label={`Remove ${bp.name}`}
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Exercises List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(bp.exercises || []).length === 0 ? (
                      <div
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                          fontSize: '13px',
                          color: 'rgba(37,41,67,0.5)',
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px dashed #DEE0ED'
                        }}
                      >
                        No exercises yet in {bp.name}. Add one below.
                      </div>
                    ) : (
                      bp.exercises.map((ex, exIdx) => {
                        const exCid = ex._cid;
                        const isFirstEx = exIdx === 0;
                        const isLastEx = exIdx === bp.exercises.length - 1;
                        const isNotesOpen = expandedNotes[exCid] || Boolean(ex.notes);

                        return (
                          <div
                            key={exCid}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #DEE0ED',
                              borderRadius: '8px',
                              padding: '8px 10px'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                flexWrap: 'wrap'
                              }}
                            >
                              {/* Reorder Buttons */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <button
                                  type="button"
                                  className="btn-icon btn-icon--sm"
                                  style={{ width: '26px', height: '26px' }}
                                  onClick={() => handleMoveExercise(bpIdx, exIdx, -1)}
                                  disabled={isFirstEx || isSubmitting}
                                  title="Move exercise up"
                                  aria-label={`Move ${ex.name} up`}
                                >
                                  <ChevronUpIcon size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon btn-icon--sm"
                                  style={{ width: '26px', height: '26px' }}
                                  onClick={() => handleMoveExercise(bpIdx, exIdx, 1)}
                                  disabled={isLastEx || isSubmitting}
                                  title="Move exercise down"
                                  aria-label={`Move ${ex.name} down`}
                                >
                                  <ChevronDownIcon size={13} />
                                </button>
                              </div>

                              {/* Exercise Name Input */}
                              <input
                                type="text"
                                className="dayflow-input"
                                style={{
                                  flex: 1,
                                  minWidth: '130px',
                                  height: '36px',
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  color: '#252943'
                                }}
                                value={ex.name}
                                onChange={(e) => handleRenameExercise(bpIdx, exIdx, e.target.value)}
                                placeholder="Exercise Name"
                                disabled={isSubmitting}
                                aria-label={`Exercise ${exIdx + 1} name in ${bp.name}`}
                              />

                              {/* Target Body Part Reassignment Dropdown (if multiple body parts exist) */}
                              {bodyParts.length > 1 && (
                                <div style={{ maxWidth: '140px', minWidth: '110px' }}>
                                  <FilterSelect
                                    value={bp.name}
                                    onChange={(val) =>
                                      handleChangeTargetBodyPart(bpIdx, exIdx, val)
                                    }
                                    options={bodyParts.map((b) => ({
                                      value: b.name,
                                      label: b.name
                                    }))}
                                    disabled={isSubmitting}
                                    allowClear={false}
                                    ariaLabel={`Target body part for ${ex.name}`}
                                  />
                                </div>
                              )}

                              {/* Measurement Type Dropdown */}
                              <div style={{ maxWidth: '145px', minWidth: '125px' }}>
                                <FilterSelect
                                  value={ex.measurementType || 'WEIGHT_REPS'}
                                  onChange={(val) =>
                                    handleChangeMeasurementType(bpIdx, exIdx, val)
                                  }
                                  options={[
                                    { value: 'WEIGHT_REPS', label: 'Weight + Reps' },
                                    { value: 'BODYWEIGHT_REPS', label: 'Bodyweight' },
                                    { value: 'DURATION', label: 'Duration' }
                                  ]}
                                  disabled={isSubmitting}
                                  allowClear={false}
                                  ariaLabel={`Measurement type for ${ex.name}`}
                                />
                              </div>

                              {/* Sets Stepper with separate label */}
                              <NumberStepperInput
                                label="Sets"
                                value={ex.plannedSets || 3}
                                onChange={(val) => handleSetPlannedSets(bpIdx, exIdx, val)}
                                min={1}
                                max={20}
                                ariaLabel={`${ex.name} planned sets`}
                              />

                              {/* Ghost Chip Note toggle button with icon */}
                              <button
                                type="button"
                                className={`btn-ghost-chip ${ex.notes ? 'btn-ghost-chip--active' : ''}`}
                                onClick={() =>
                                  setExpandedNotes((prev) => ({
                                    ...prev,
                                    [exCid]: !isNotesOpen
                                  }))
                                }
                                title="Toggle exercise notes"
                                aria-label="Toggle exercise notes"
                              >
                                <PlusIcon size={12} />
                                <span>{ex.notes ? 'Notes' : 'Note'}</span>
                              </button>

                              {/* Remove Exercise */}
                              <button
                                type="button"
                                className="btn-icon btn-icon--sm btn-icon--danger"
                                onClick={() => handleRemoveExercise(bpIdx, exIdx)}
                                disabled={isSubmitting}
                                aria-label={`Remove ${ex.name}`}
                                title={`Remove ${ex.name}`}
                              >
                                <CloseIcon size={14} />
                              </button>
                            </div>

                            {/* Optional Notes Row */}
                            {isNotesOpen && (
                              <div style={{ paddingLeft: '32px', marginTop: '2px' }}>
                                <input
                                  type="text"
                                  className="dayflow-input"
                                  style={{
                                    height: '32px',
                                    fontSize: '12.5px',
                                    backgroundColor: '#FAFBFC'
                                  }}
                                  placeholder="Form cues, warmup instructions, grip or equipment notes..."
                                  value={ex.notes || ''}
                                  onChange={(e) =>
                                    handleEditExerciseNotes(bpIdx, exIdx, e.target.value)
                                  }
                                  disabled={isSubmitting}
                                  aria-label={`Notes for ${ex.name}`}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Exercise inline input (keyed by bp._cid) */}
                  <div className="gymflow-inline-add-row" style={{ marginTop: '4px' }}>
                    <input
                      type="text"
                      placeholder={`+ Add exercise to ${bp.name}...`}
                      value={newExerciseNames[cid] || ''}
                      onChange={(e) =>
                        setNewExerciseNames({ ...newExerciseNames, [cid]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExercise(bpIdx);
                        }
                      }}
                      disabled={isSubmitting}
                      aria-label={`Add exercise to ${bp.name}`}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => handleAddExercise(bpIdx)}
                      disabled={isSubmitting || !(newExerciseNames[cid] || '').trim()}
                    >
                      Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </BottomSheetModal>
  );
}
