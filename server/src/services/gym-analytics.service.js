import mongoose from 'mongoose';
import { GymWorkoutSession } from '../models/gym-workout-session.model.js';
import { GYM_SET_STATUS } from '../constants/gymflow.js';

export class GymAnalyticsService {
  /**
   * Generates comprehensive gym analytics with multi-dimensional filtering
   * (Date Range, Routine/Template, Body Part, Exercise) applied with AND logic.
   */
  static async getAnalytics(spaceId, { startDate, endDate, templateId, templateName, routine, bodyPart, exerciseName }) {
    const query = { spaceId, isRestDay: false };

    // Date range filter
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    // Routine / Template filter (supports ID or name)
    const rawRoutine = (routine || templateName || templateId)?.trim();
    if (rawRoutine && rawRoutine !== 'ALL' && rawRoutine !== 'All Templates') {
      if (mongoose.Types.ObjectId.isValid(rawRoutine)) {
        query.$or = [
          { templateId: new mongoose.Types.ObjectId(rawRoutine) },
          { templateName: new RegExp(`^${rawRoutine}$`, 'i') }
        ];
      } else {
        query.templateName = new RegExp(`^${rawRoutine}$`, 'i');
      }
    }

    // Fetch matching workout sessions
    const sessions = await GymWorkoutSession.find(query).sort({ date: 1 });

    // Fetch all sessions in the date window (including rest days) to calculate rest days and build cascading filter options
    const allSessionsInWindow = await GymWorkoutSession.find({
      spaceId,
      ...(query.date ? { date: query.date } : {})
    }).sort({ date: 1 });

    // Normalize target filters
    const filterBp = bodyPart?.trim() && bodyPart !== 'All Body Parts' ? bodyPart.trim().toLowerCase() : null;
    const filterEx = exerciseName?.trim() && exerciseName !== 'All Exercises' ? exerciseName.trim().toLowerCase() : null;

    // Filtered KPI Aggregates
    let totalVolume = 0;
    let totalReps = 0;
    let totalCompletedSets = 0;
    let totalCompletedExercises = 0;
    let matchingFinishedWorkouts = 0;
    let matchingScoreSum = 0;

    // Treadmill Aggregates (filtered if routine filter matches, unaffected by exercise filters)
    let treadmillSessionsCount = 0;
    let treadmillTotalMinutes = 0;
    let treadmillCaloriesBurned = 0;
    let treadmillCompletedCount = 0;
    let treadmillPartialCount = 0;
    let treadmillSkippedCount = 0;
    const treadmillTrend = [];

    // Trend & Breakdown Maps
    const dailyVolumeTrend = [];
    const templatePerformanceMap = new Map();
    const bodyPartPerformanceMap = new Map();
    const exercisePerformanceMap = new Map();

    for (const session of sessions) {
      let sessionFilteredVolume = 0;
      let sessionFilteredReps = 0;
      let sessionFilteredCompletedSets = 0;
      let sessionHadMatchingExercise = false;

      // Treadmill metrics (only if no specific body part or exercise filter is active)
      if (!filterBp && !filterEx && session.treadmill) {
        treadmillSessionsCount += 1;
        treadmillTotalMinutes += session.treadmill.actualMinutes || 0;
        treadmillCaloriesBurned += session.treadmill.caloriesBurned || 0;
        if (session.treadmill.status === 'COMPLETED') treadmillCompletedCount += 1;
        else if (session.treadmill.status === 'PARTIAL') treadmillPartialCount += 1;
        else if (session.treadmill.status === 'SKIPPED') treadmillSkippedCount += 1;

        treadmillTrend.push({
          date: session.date,
          minutes: session.treadmill.actualMinutes || 0,
          calories: session.treadmill.caloriesBurned || 0,
          status: session.treadmill.status
        });
      }

      // Iterate through body parts and exercises
      for (const bp of session.bodyParts || []) {
        const bpName = bp.name ? bp.name.trim() : '';
        const bpMatches = !filterBp || bpName.toLowerCase() === filterBp;
        if (!bpMatches) continue;

        for (const ex of bp.exercises || []) {
          const exName = ex.name ? ex.name.trim() : '';
          const exMatches = !filterEx || exName.toLowerCase() === filterEx;
          if (!exMatches) continue;

          let exVol = 0;
          let exReps = 0;
          let exMaxWeight = 0;
          let exCompletedSets = 0;

          // Only eligible COMPLETED sets contribute to volume and reps
          for (const s of ex.sets || []) {
            if (s.status === GYM_SET_STATUS.COMPLETED) {
              const weight = Math.max(0, Number(s.weightKg) || 0);
              const reps = Math.max(0, Number(s.reps) || 0);
              const setVol = weight * reps;

              exVol += setVol;
              exReps += reps;
              if (weight > exMaxWeight) {
                exMaxWeight = weight;
              }
              exCompletedSets += 1;
            }
          }

          if (exCompletedSets > 0) {
            sessionHadMatchingExercise = true;
            totalCompletedExercises += 1;
          }

          sessionFilteredVolume += exVol;
          sessionFilteredReps += exReps;
          sessionFilteredCompletedSets += exCompletedSets;

          // Aggregate into bodyPartPerformanceMap
          if (!bodyPartPerformanceMap.has(bpName)) {
            bodyPartPerformanceMap.set(bpName, {
              name: bpName,
              exercisesCount: 0,
              setsCount: 0,
              totalReps: 0,
              totalVolume: 0
            });
          }
          const bpData = bodyPartPerformanceMap.get(bpName);
          if (exCompletedSets > 0) bpData.exercisesCount += 1;
          bpData.setsCount += exCompletedSets;
          bpData.totalReps += exReps;
          bpData.totalVolume += exVol;

          // Aggregate into exercisePerformanceMap
          const eKey = exName;
          if (!exercisePerformanceMap.has(eKey)) {
            exercisePerformanceMap.set(eKey, {
              name: eKey,
              targetBodyPart: bpName,
              history: []
            });
          }
          exercisePerformanceMap.get(eKey).history.push({
            date: session.date,
            volume: exVol,
            maxWeight: exMaxWeight,
            reps: exReps,
            completedSets: exCompletedSets
          });
        }
      }

      // Aggregate into templatePerformanceMap (if this session had matching filtered content)
      const tName = session.templateName || 'Custom Routine';
      if (!templatePerformanceMap.has(tName)) {
        templatePerformanceMap.set(tName, {
          name: tName,
          sessionsCount: 0,
          totalVolume: 0,
          totalReps: 0,
          totalSets: 0,
          scoreSum: 0
        });
      }
      const tData = templatePerformanceMap.get(tName);
      if (sessionHadMatchingExercise || (!filterBp && !filterEx)) {
        tData.sessionsCount += 1;
        tData.totalVolume += sessionFilteredVolume;
        tData.totalReps += sessionFilteredReps;
        tData.totalSets += sessionFilteredCompletedSets;
        tData.scoreSum += session.scoreBreakdown?.totalScore || 0;
      }

      // Roll up to overall totals
      totalVolume += sessionFilteredVolume;
      totalReps += sessionFilteredReps;
      totalCompletedSets += sessionFilteredCompletedSets;

      // Score calculation: only finished workouts that contain matching exercise records contribute
      if (session.isFinished && (sessionHadMatchingExercise || (!filterBp && !filterEx))) {
        matchingFinishedWorkouts += 1;
        matchingScoreSum += session.scoreBreakdown?.totalScore || 0;
      }

      // Daily Volume Trend (strictly represents filtered volume and reps for each day)
      dailyVolumeTrend.push({
        date: session.date,
        volume: sessionFilteredVolume,
        reps: sessionFilteredReps,
        score: session.scoreBreakdown?.totalScore || 0
      });
    }

    // Rest Days count in selected window
    const restDaysCount = allSessionsInWindow.filter((s) => s.isRestDay).length;

    // Average Workout Score across matching finished workouts
    const averageScore = matchingFinishedWorkouts > 0 ? Math.round(matchingScoreSum / matchingFinishedWorkouts) : 0;
    const averageTreadmillDuration =
      treadmillSessionsCount > 0 ? Math.round(treadmillTotalMinutes / treadmillSessionsCount) : 0;

    // --- Build Cascading Filter Options Tree from window data ---
    const routinesSet = new Set();
    const bodyPartsByRoutine = {};
    const exercisesByBodyPart = {};
    const allBodyPartsSet = new Set();
    const allExercisesSet = new Set();

    for (const s of allSessionsInWindow) {
      if (s.isRestDay) continue;
      const rName = s.templateName || 'Custom Routine';
      routinesSet.add(rName);

      if (!bodyPartsByRoutine[rName]) {
        bodyPartsByRoutine[rName] = new Set();
      }

      for (const bp of s.bodyParts || []) {
        const bpName = bp.name ? bp.name.trim() : '';
        if (!bpName) continue;
        bodyPartsByRoutine[rName].add(bpName);
        allBodyPartsSet.add(bpName);

        if (!exercisesByBodyPart[bpName]) {
          exercisesByBodyPart[bpName] = new Set();
        }

        for (const ex of bp.exercises || []) {
          const exName = ex.name ? ex.name.trim() : '';
          if (!exName) continue;
          exercisesByBodyPart[bpName].add(exName);
          allExercisesSet.add(exName);
        }
      }
    }

    // Convert Sets to sorted Arrays
    const filterOptions = {
      routines: Array.from(routinesSet).sort(),
      bodyPartsByRoutine: Object.fromEntries(
        Object.entries(bodyPartsByRoutine).map(([r, set]) => [r, Array.from(set).sort()])
      ),
      exercisesByBodyPart: Object.fromEntries(
        Object.entries(exercisesByBodyPart).map(([bp, set]) => [bp, Array.from(set).sort()])
      ),
      allBodyParts: Array.from(allBodyPartsSet).sort(),
      allExercises: Array.from(allExercisesSet).sort()
    };

    return {
      overall: {
        totalWorkouts: matchingFinishedWorkouts,
        totalCompletedExercises,
        totalCompletedSets,
        totalReps,
        totalVolume,
        averageScore,
        restDaysCount
      },
      treadmill: {
        totalSessions: treadmillSessionsCount,
        totalMinutes: treadmillTotalMinutes,
        averageDuration: averageTreadmillDuration,
        caloriesBurned: treadmillCaloriesBurned,
        completedCount: treadmillCompletedCount,
        partialCount: treadmillPartialCount,
        skippedCount: treadmillSkippedCount,
        trend: treadmillTrend
      },
      dailyVolumeTrend,
      templatesBreakdown: Array.from(templatePerformanceMap.values())
        .filter((t) => t.sessionsCount > 0)
        .map((t) => ({
          ...t,
          averageScore: t.sessionsCount > 0 ? Math.round(t.scoreSum / t.sessionsCount) : 0
        })),
      bodyPartsBreakdown: Array.from(bodyPartPerformanceMap.values()).filter((bp) => bp.setsCount > 0 || bp.totalVolume > 0),
      exercisesBreakdown: Array.from(exercisePerformanceMap.values()).filter((ex) => ex.history.some((h) => h.completedSets > 0 || h.volume > 0)),
      filterOptions
    };
  }
}
