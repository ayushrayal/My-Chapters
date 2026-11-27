import { GymWorkoutSession } from '../models/gym-workout-session.model.js';
import { GymTemplate } from '../models/gym-template.model.js';
import { GymWeeklySchedule } from '../models/gym-weekly-schedule.model.js';
import { calculateWorkoutMetrics, calculateWorkoutScore } from './gym-scoring.service.js';
import {
  GYM_SET_STATUS,
  GYM_TREADMILL_STATUS,
  GYM_DEFAULT_TREADMILL_MINUTES,
  WEEKDAY_VALUES
} from '../constants/gymflow.js';
import { AppError } from '../utils/app-error.js';

export class GymWorkoutSessionService {
  /**
   * Get workout session by date. If none exists, also returns assigned template information if configured.
   */
  static async getSessionByDate(spaceId, date) {
    let session = await GymWorkoutSession.findOne({ spaceId, date }).lean();
    
    // Find assigned template for this weekday
    const dayName = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
    const weeklySchedule = await GymWeeklySchedule.findOne({ spaceId }).populate('days.templateId').lean();
    const dayAssignment = weeklySchedule?.days?.find((d) => d.weekday === dayName);

    return {
      session: session ? { ...session, id: session._id.toString() } : null,
      dayAssignment: dayAssignment || null
    };
  }

  /**
   * Start or open workout session for a date.
   * If session already exists, returns existing session to prevent duplicate creation.
   */
  static async startSession(spaceId, { date, templateId }) {
    let session = await GymWorkoutSession.findOne({ spaceId, date });
    if (session) {
      return session;
    }

    let templateName = '';
    let parentWorkoutName = '';
    let bodyParts = [];

    if (templateId) {
      const template = await GymTemplate.findOne({ _id: templateId, spaceId });
      if (template) {
        templateName = template.name;
        parentWorkoutName = template.parentWorkoutName || template.name;
        // Deep copy body parts and exercises into independent workout structure
        bodyParts = (template.bodyParts || []).map((bp, bpIdx) => ({
          name: bp.name,
          order: bp.order ?? bpIdx,
          exercises: (bp.exercises || []).map((ex, exIdx) => {
            const measurementType = ex.measurementType || 'WEIGHT_REPS';
            const plannedSets = ex.plannedSets || 3;
            // Generate initial set records
            const sets = [];
            for (let i = 1; i <= plannedSets; i++) {
              sets.push({
                setNumber: i,
                weightKg: 0,
                reps: 0,
                extraWeightKg: 0,
                durationMinutes: measurementType === 'DURATION' ? 1 : 0,
                status: GYM_SET_STATUS.INCOMPLETE,
                notes: ''
              });
            }

            return {
              exerciseIdentityId: ex.exerciseIdentityId || ex._id,
              originalExerciseId: ex._id,
              name: ex.name,
              targetBodyPart: ex.targetBodyPart || bp.name,
              measurementType,
              notes: ex.notes || '',
              order: ex.order ?? exIdx,
              plannedSets,
              sets
            };
          })
        }));
      }
    }

    session = new GymWorkoutSession({
      spaceId,
      date,
      templateId: templateId || null,
      templateName,
      parentWorkoutName,
      isRestDay: false,
      isFinished: false,
      bodyParts,
      treadmill: {
        targetMinutes: GYM_DEFAULT_TREADMILL_MINUTES,
        actualMinutes: 0,
        caloriesBurned: 0,
        status: GYM_TREADMILL_STATUS.PARTIAL,
        skippedReason: ''
      }
    });

    return session.save();
  }

  /**
   * Mark a date as Rest Day with required reason
   */
  static async setRestDay(spaceId, date, reason = '') {
    if (!reason || !reason.trim()) {
      throw AppError.badRequest('A reason is required when marking a workout date as Rest Day');
    }

    let session = await GymWorkoutSession.findOne({ spaceId, date });
    if (!session) {
      session = new GymWorkoutSession({
        spaceId,
        date,
        isRestDay: true,
        restDayReason: reason.trim(),
        isFinished: true,
        finishedAt: new Date(),
        bodyParts: []
      });
    } else {
      session.isRestDay = true;
      session.restDayReason = reason.trim();
      session.isFinished = true;
      session.finishedAt = new Date();
      session.bodyParts = [];
    }

    session.scoreBreakdown = {
      completionPoints: 0,
      plannedSetsPoints: 0,
      repsPoints: 0,
      progressionPoints: 0,
      totalScore: 0,
      explanation: `Rest Day taken: ${reason.trim()}`
    };

    return session.save();
  }

  /**
   * Resume/remove Rest Day
   */
  static async removeRestDay(spaceId, date) {
    const session = await GymWorkoutSession.findOne({ spaceId, date });
    if (!session) {
      throw AppError.notFound('Workout session not found');
    }

    session.isRestDay = false;
    session.restDayReason = '';
    session.isFinished = false;
    session.finishedAt = null;

    return session.save();
  }

  /**
   * Update entire workout session (independent body parts, exercises, sets, treadmill)
   * Uses atomic findOneAndUpdate to prevent Mongoose VersionError under concurrent autosaves.
   */
  static async updateSession(spaceId, date, data) {
    const existing = await GymWorkoutSession.findOne({ spaceId, date });
    if (!existing) {
      throw AppError.notFound('Workout session not found for this date');
    }

    const updateFields = {};

    if (data.templateName !== undefined) {
      updateFields.templateName = data.templateName ? data.templateName.trim() : '';
    }

    if (data.parentWorkoutName !== undefined) {
      updateFields.parentWorkoutName = data.parentWorkoutName ? data.parentWorkoutName.trim() : '';
    }

    if (Array.isArray(data.bodyParts)) {
      updateFields.bodyParts = data.bodyParts.map((bp, bpIdx) => ({
        ...bp,
        name: bp.name || 'General',
        order: bp.order ?? bpIdx,
        exercises: Array.isArray(bp.exercises)
          ? bp.exercises.map((ex, exIdx) => ({
              ...ex,
              exerciseIdentityId: ex.exerciseIdentityId || ex.originalExerciseId || null,
              originalExerciseId: ex.originalExerciseId || null,
              name: ex.name,
              targetBodyPart: ex.targetBodyPart || bp.name || 'General',
              plannedSets: ex.plannedSets || (Array.isArray(ex.sets) && ex.sets.length > 0 ? ex.sets.length : 3),
              measurementType: ex.measurementType || 'WEIGHT_REPS',
              order: ex.order ?? exIdx,
              sets: Array.isArray(ex.sets) ? ex.sets : []
            }))
          : []
      }));
    }

    if (data.treadmill) {
      const treadmillData = {
        targetMinutes: Number(data.treadmill.targetMinutes) || GYM_DEFAULT_TREADMILL_MINUTES,
        actualMinutes: Number(data.treadmill.actualMinutes) || 0,
        caloriesBurned: Number(data.treadmill.caloriesBurned) || 0,
        status: data.treadmill.status || GYM_TREADMILL_STATUS.PARTIAL,
        skippedReason: data.treadmill.skippedReason ? data.treadmill.skippedReason.trim() : ''
      };

      if (treadmillData.status === GYM_TREADMILL_STATUS.SKIPPED && !treadmillData.skippedReason) {
        throw AppError.badRequest('Reason is required when treadmill is skipped');
      }

      updateFields.treadmill = treadmillData;
    }

    // Find previous session for comparison / scoring
    const prevSession = await GymWorkoutSession.findOne({
      spaceId,
      date: { $lt: date },
      isRestDay: false,
      isFinished: true
    }).sort({ date: -1 });

    const tempSession = {
      ...existing.toObject(),
      ...updateFields
    };
    updateFields.scoreBreakdown = calculateWorkoutScore(tempSession, prevSession);

    const updated = await GymWorkoutSession.findOneAndUpdate(
      { spaceId, date },
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true }
    );

    return updated;
  }

  /**
   * Discard an unfinished workout session for a date.
   * Completely removes the session from the database so the date is available again.
   * Rejects if the session is finished or marked as rest day.
   */
  static async discardSession(spaceId, date) {
    const session = await GymWorkoutSession.findOne({ spaceId, date });
    if (!session) {
      throw AppError.notFound('Workout session not found for this date');
    }

    if (session.isFinished) {
      throw AppError.badRequest('Cannot discard a finished workout session');
    }

    if (session.isRestDay) {
      throw AppError.badRequest('Cannot discard a rest day. Use Remove Rest Day instead.');
    }

    await GymWorkoutSession.deleteOne({ _id: session._id, spaceId });

    return { discardedDate: date, success: true };
  }

  /**
   * Finish or re-open/edit a finished workout session
   */
  static async finishSession(spaceId, date, isFinished = true) {
    const existing = await GymWorkoutSession.findOne({ spaceId, date });
    if (!existing) {
      throw AppError.notFound('Workout session not found for this date');
    }

    // Recalculate score
    const prevSession = await GymWorkoutSession.findOne({
      spaceId,
      date: { $lt: date },
      isRestDay: false,
      isFinished: true
    }).sort({ date: -1 });

    const tempSession = {
      ...existing.toObject(),
      isFinished: Boolean(isFinished),
      finishedAt: isFinished ? new Date() : null
    };
    const scoreBreakdown = calculateWorkoutScore(tempSession, prevSession);

    const updated = await GymWorkoutSession.findOneAndUpdate(
      { spaceId, date },
      {
        $set: {
          isFinished: Boolean(isFinished),
          finishedAt: isFinished ? new Date() : null,
          scoreBreakdown
        }
      },
      { returnDocument: 'after', runValidators: true }
    );

    return updated;
  }

  /**
   * Comparison helper: compares each exercise in the given session with the immediately preceding
   * session from the SAME template variation that contains that same exercise identity.
   */
  static async getPreviousExerciseComparisons(spaceId, date, currentExercises = [], explicitTemplateId = null) {
    const comparisons = {};

    // 1. Determine the effective template variation ID
    let targetTemplateId = explicitTemplateId;
    if (!targetTemplateId) {
      const currentSession = await GymWorkoutSession.findOne({ spaceId, date }).select('templateId').lean();
      targetTemplateId = currentSession?.templateId || null;
    }

    for (const ex of currentExercises) {
      const exKey = ex._id?.toString() || ex.exerciseIdentityId?.toString() || ex.name;

      // Build query strictly restricted to the SAME template variation if templateId is known
      const query = {
        spaceId,
        date: { $lt: date },
        isRestDay: false,
        isFinished: true
      };

      if (targetTemplateId) {
        query.templateId = targetTemplateId;
      }

      // Match exercise by exerciseIdentityId, originalExerciseId, or name within the variation
      const exConditions = [];
      if (ex.exerciseIdentityId) {
        exConditions.push({ 'bodyParts.exercises.exerciseIdentityId': ex.exerciseIdentityId });
      }
      if (ex.originalExerciseId) {
        exConditions.push({ 'bodyParts.exercises.originalExerciseId': ex.originalExerciseId });
      }
      if (ex.name) {
        exConditions.push({ 'bodyParts.exercises.name': ex.name.trim() });
      }

      if (exConditions.length > 0) {
        query.$or = exConditions;
      }

      const pastSession = await GymWorkoutSession.findOne(query).sort({ date: -1 }).lean();

      if (pastSession) {
        let prevEx = null;
        for (const bp of pastSession.bodyParts || []) {
          for (const pe of bp.exercises || []) {
            const matchesIdentity =
              ex.exerciseIdentityId &&
              pe.exerciseIdentityId &&
              pe.exerciseIdentityId.toString() === ex.exerciseIdentityId.toString();

            const matchesOriginal =
              ex.originalExerciseId &&
              pe.originalExerciseId &&
              pe.originalExerciseId.toString() === ex.originalExerciseId.toString();

            const matchesName =
              pe.name && ex.name && pe.name.trim().toLowerCase() === ex.name.trim().toLowerCase();

            if (matchesIdentity || matchesOriginal || matchesName) {
              prevEx = pe;
              break;
            }
          }
          if (prevEx) break;
        }

        if (prevEx) {
          const mType = prevEx.measurementType || ex.measurementType || 'WEIGHT_REPS';
          let prevVolume = 0;
          let prevReps = 0;
          let prevMaxWeight = 0;
          let prevTotalDuration = 0;
          let bestSet = null;

          // Incomplete, skipped, or unfinished sets must NOT count as completed historical performance
          const completedSets = [];

          for (const s of prevEx.sets || []) {
            if (s.status === GYM_SET_STATUS.COMPLETED) {
              const weight = Number(s.weightKg) || 0;
              const reps = Number(s.reps) || 0;
              const extraWeight = Number(s.extraWeightKg) || 0;
              const duration = Number(s.durationMinutes) || 0;

              completedSets.push({
                setNumber: s.setNumber,
                weightKg: weight,
                reps,
                extraWeightKg: extraWeight,
                durationMinutes: duration,
                status: s.status,
                notes: s.notes || ''
              });

              if (mType === 'WEIGHT_REPS') {
                prevVolume += weight * reps;
                prevReps += reps;
                if (weight > prevMaxWeight) prevMaxWeight = weight;
                if (!bestSet || weight > bestSet.weightKg || (weight === bestSet.weightKg && reps > bestSet.reps)) {
                  bestSet = { weightKg: weight, reps, desc: `${weight} kg × ${reps} reps` };
                }
              } else if (mType === 'BODYWEIGHT' || mType === 'BODYWEIGHT_REPS' || mType === 'BODYWEIGHT_LOAD') {
                prevReps += reps;
                if (extraWeight > prevMaxWeight) prevMaxWeight = extraWeight;
                if (!bestSet || extraWeight > (bestSet.extraWeightKg || 0) || (extraWeight === (bestSet.extraWeightKg || 0) && reps > bestSet.reps)) {
                  bestSet = {
                    reps,
                    extraWeightKg: extraWeight,
                    desc: extraWeight > 0 ? `${reps} reps (+${extraWeight} kg)` : `${reps} reps`
                  };
                }
              } else if (mType === 'DURATION') {
                prevTotalDuration += duration;
                if (!bestSet || duration > bestSet.durationMinutes) {
                  bestSet = { durationMinutes: duration, desc: `${duration} mins` };
                }
              }
            }
          }

          if (completedSets.length > 0) {
            comparisons[exKey] = {
              hasRecord: true,
              previousDate: pastSession.date,
              previousTemplateName: pastSession.templateName || 'Workout',
              previousTemplateId: pastSession.templateId?.toString() || null,
              measurementType: mType,
              previousMaxWeight: prevMaxWeight,
              previousTotalReps: prevReps,
              previousVolume: prevVolume,
              previousTotalDuration: prevTotalDuration,
              previousBestSet: bestSet?.desc || 'N/A',
              sets: completedSets
            };
            continue;
          }
        }
      }

      // If no valid completed performance found in same variation
      comparisons[exKey] = {
        hasRecord: false,
        message: 'First time performing this exercise in this variation',
        sets: []
      };
    }

    return comparisons;
  }

  /**
   * Returns a monthly overview of workout sessions for calendar visualization.
   * Uses lean selective projection to avoid loading heavy workout details unnecessarily.
   */
  static async getCalendarOverview(spaceId, { startDate, endDate }) {
    const query = { spaceId };
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    const sessions = await GymWorkoutSession.find(query)
      .select('date isRestDay restDayReason isFinished templateName templateId scoreBreakdown.totalScore treadmill.status bodyParts.name bodyParts.exercises.name bodyParts.exercises.measurementType bodyParts.exercises.sets.status')
      .sort({ date: 1 })
      .lean();

    return sessions.map((s) => {
      let totalSets = 0;
      let completedSets = 0;
      (s.bodyParts || []).forEach((bp) => {
        (bp.exercises || []).forEach((ex) => {
          (ex.sets || []).forEach((set) => {
            totalSets += 1;
            if (set.status === 'COMPLETED') completedSets += 1;
          });
        });
      });

      return {
        id: s._id.toString(),
        date: s.date,
        isRestDay: Boolean(s.isRestDay),
        restDayReason: s.restDayReason || '',
        isFinished: Boolean(s.isFinished),
        templateName: s.templateName || (s.isRestDay ? 'Rest Day' : 'Custom Workout'),
        totalScore: s.scoreBreakdown?.totalScore ?? (s.isFinished ? 100 : 0),
        bodyPartsCount: s.bodyParts?.length || 0,
        bodyPartNames: (s.bodyParts || []).map((bp) => bp.name),
        totalSets,
        completedSets,
        treadmillStatus: s.treadmill?.status || null
      };
    });
  }
}
