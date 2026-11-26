import { GYM_SET_STATUS } from '../constants/gymflow.js';

/**
 * Calculate exercise and workout volume and repetitions.
 * Excludes skipped or incomplete sets.
 */
export function calculateWorkoutMetrics(session) {
  let totalVolume = 0;
  let totalReps = 0;
  let totalDurationMinutes = 0;
  let totalExtraWeightLoad = 0;
  let completedSetsCount = 0;
  let plannedSetsCount = 0;
  let skippedSetsCount = 0;
  let incompleteSetsCount = 0;
  const exerciseMetricsMap = new Map();

  const bodyParts = session.bodyParts || [];

  for (const bp of bodyParts) {
    for (const ex of bp.exercises || []) {
      const exId = ex.originalExerciseId?.toString() || ex._id?.toString() || ex.name;
      const mType = ex.measurementType || 'WEIGHT_REPS';
      let exVol = 0;
      let exReps = 0;
      let exDuration = 0;
      let exExtraWeight = 0;
      let maxWeight = 0;
      let exCompletedSets = 0;

      plannedSetsCount += ex.plannedSets || (ex.sets?.length || 0);

      for (const s of ex.sets || []) {
        if (s.status === GYM_SET_STATUS.COMPLETED) {
          if (mType === 'WEIGHT_REPS') {
            const w = Math.max(0, Number(s.weightKg) || 0);
            const r = Math.max(0, Number(s.reps) || 0);
            const setVol = w * r;
            exVol += setVol;
            exReps += r;
            if (w > maxWeight) maxWeight = w;
          } else if (mType === 'BODYWEIGHT_REPS') {
            const r = Math.max(0, Number(s.reps) || 0);
            const extraW = Math.max(0, Number(s.extraWeightKg) || 0);
            exReps += r;
            if (extraW > exExtraWeight) exExtraWeight = extraW;
            totalExtraWeightLoad += (extraW * r);
          } else if (mType === 'DURATION') {
            const d = Math.max(0, Number(s.durationMinutes) || 0);
            exDuration += d;
          }

          exCompletedSets += 1;
          completedSetsCount += 1;
        } else if (s.status === GYM_SET_STATUS.SKIPPED) {
          skippedSetsCount += 1;
        } else {
          incompleteSetsCount += 1;
        }
      }

      totalVolume += exVol;
      totalReps += exReps;
      totalDurationMinutes += exDuration;

      exerciseMetricsMap.set(exId, {
        name: ex.name,
        targetBodyPart: ex.targetBodyPart,
        measurementType: mType,
        volume: exVol,
        totalReps: exReps,
        durationMinutes: exDuration,
        extraWeightKg: exExtraWeight,
        maxWeight,
        completedSets: exCompletedSets,
        plannedSets: ex.plannedSets || (ex.sets?.length || 0)
      });
    }
  }

  const completedSetPercentage =
    plannedSetsCount > 0 ? Math.min(100, Math.round((completedSetsCount / plannedSetsCount) * 100)) : 0;

  return {
    totalVolume,
    totalReps,
    totalDurationMinutes,
    totalExtraWeightLoad,
    completedSetsCount,
    plannedSetsCount,
    skippedSetsCount,
    incompleteSetsCount,
    completedSetPercentage,
    exerciseMetricsMap
  };
}

/**
 * Transparent 100-point Gym Workout Scoring System
 * 1. Workout completion: 20 points (finished session)
 * 2. Planned set completion: up to 40 points (completed sets / planned sets)
 * 3. Repetition effort: up to 20 points (scaled against 100 reps target)
 * 4. Progression vs previous session: up to 20 points
 *    - If no previous session: award full baseline progression points (up to 20 pts)
 *      proportional to set completion so that completing 100% of planned sets on a first
 *      session achieves a 100% score (20 + 40 + 20 + 20 = 100%).
 *    - If previous session exists: evaluate volume change.
 */
export function calculateWorkoutScore(session, previousSession = null) {
  if (session.isRestDay) {
    return {
      completionPoints: 0,
      plannedSetsPoints: 0,
      repsPoints: 0,
      progressionPoints: 0,
      totalScore: 0,
      explanation: 'Rest Day (excluded from workout scoring)'
    };
  }

  const currentMetrics = calculateWorkoutMetrics(session);

  // 1. Completion: 20 points if finished
  const completionPoints = session.isFinished ? 20 : 0;

  // 2. Planned set completion: up to 40 points
  const plannedRatio = currentMetrics.plannedSetsCount > 0
    ? currentMetrics.completedSetsCount / currentMetrics.plannedSetsCount
    : 0;
  const plannedSetsPoints = Math.round(Math.min(1, plannedRatio) * 40);

  // 3. Repetition / duration effort: up to 20 points (scaled against 100 reps target)
  const repThreshold = 100;
  const effortUnits = currentMetrics.totalReps + (currentMetrics.totalDurationMinutes * 20);
  const repRatio = Math.min(1, effortUnits / repThreshold);
  const repsPoints = Math.round(repRatio * 20);

  // 4. Progression vs previous session: up to 20 points
  let progressionPoints = 0;
  let progressionNote = 'No previous session comparison available';

  if (previousSession && previousSession.isFinished) {
    const prevMetrics = calculateWorkoutMetrics(previousSession);
    if (prevMetrics.totalVolume > 0 && currentMetrics.totalVolume > 0) {
      const volChange = (currentMetrics.totalVolume - prevMetrics.totalVolume) / prevMetrics.totalVolume;
      if (volChange >= -0.02) {
        // >= -2% volume (maintained or improved)
        progressionPoints = 20;
        progressionNote = volChange >= 0.05
          ? `Volume improved by ${Math.round(volChange * 100)}% (+20 pts)`
          : `Volume maintained (+20 pts)`;
      } else if (volChange >= -0.1) {
        progressionPoints = 15;
        progressionNote = `Minor volume decrease (+15 pts)`;
      } else if (volChange >= -0.25) {
        progressionPoints = 10;
        progressionNote = `Moderate volume decrease (+10 pts)`;
      } else {
        progressionPoints = 5;
        progressionNote = `Volume significantly below previous session (+5 pts)`;
      }
    } else {
      // Previous session had 0 volume, award based on set ratio
      progressionPoints = Math.round(Math.min(1, plannedRatio) * 20);
      progressionNote = 'Structured volume established (+20 pts)';
    }
  } else {
    // Baseline workout session: award progression points proportional to planned set completion
    // This ensures a 100% completed workout without a past session achieves 100% (20 + 40 + 20 + 20 = 100%)
    progressionPoints = Math.round(Math.min(1, plannedRatio) * 20);
    progressionNote = plannedRatio >= 1
      ? 'All planned sets completed (+20 pts)'
      : `Baseline workout (${Math.round(plannedRatio * 100)}% sets completed: +${progressionPoints} pts)`;
  }

  const totalScore = Math.min(100, completionPoints + plannedSetsPoints + repsPoints + progressionPoints);

  return {
    completionPoints,
    plannedSetsPoints,
    repsPoints,
    progressionPoints,
    totalScore,
    explanation: `Finish: ${completionPoints}/20, Sets: ${plannedSetsPoints}/40, Reps: ${repsPoints}/20, Progression: ${progressionPoints}/20 (${progressionNote})`
  };
}
