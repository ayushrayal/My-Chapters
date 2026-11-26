import mongoose from 'mongoose';
import { GymWorkoutSession } from '../models/gym-workout-session.model.js';
import { GymTemplate } from '../models/gym-template.model.js';
import { GYM_SET_STATUS } from '../constants/gymflow.js';

export class GymAnalyticsService {
  /**
   * Generates comprehensive gym analytics with multi-dimensional filtering
   * (Date Range, Routine/Template, Body Part, Exercise) applied with AND logic.
   */
  static async getAnalytics(spaceId, { startDate, endDate, templateId, templateName, routine, bodyPart, exerciseName }) {
    // 1. Fetch user's defined templates and all space workout sessions to populate routines & filter options
    const [userTemplates, allSpaceSessions] = await Promise.all([
      GymTemplate.find({ spaceId }).select('name bodyParts.name bodyParts.exercises.name').lean(),
      GymWorkoutSession.find({ spaceId, isRestDay: false })
        .select('templateName templateId bodyParts.name bodyParts.exercises.name')
        .lean()
    ]);

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
    if (rawRoutine && rawRoutine !== 'ALL' && rawRoutine !== 'All Templates' && rawRoutine !== 'All Routines') {
      if (mongoose.Types.ObjectId.isValid(rawRoutine)) {
        query.$or = [
          { templateId: new mongoose.Types.ObjectId(rawRoutine) },
          { templateName: new RegExp(`^${rawRoutine}$`, 'i') }
        ];
      } else if (rawRoutine.toLowerCase() === 'custom routine') {
        query.$or = [
          { templateName: new RegExp(`^${rawRoutine}$`, 'i') },
          { templateName: '' },
          { templateName: null, templateId: null }
        ];
      } else {
        const matchedTpl = userTemplates.find(
          (t) => t.name.toLowerCase() === rawRoutine.toLowerCase()
        );
        if (matchedTpl) {
          query.$or = [
            { templateId: matchedTpl._id },
            { templateName: new RegExp(`^${rawRoutine}$`, 'i') }
          ];
        } else {
          query.templateName = new RegExp(`^${rawRoutine}$`, 'i');
        }
      }
    }

    // Fetch matching workout sessions with targeted projections (avoids loading set notes, subdocument IDs)
    const sessions = await GymWorkoutSession.find(query)
      .select('date templateName templateId isFinished scoreBreakdown.totalScore treadmill bodyParts.name bodyParts.exercises.name bodyParts.exercises.measurementType bodyParts.exercises.sets.status bodyParts.exercises.sets.weightKg bodyParts.exercises.sets.reps bodyParts.exercises.sets.extraWeightKg bodyParts.exercises.sets.durationMinutes')
      .sort({ date: 1 })
      .lean();

    // Fetch all sessions in the date window (including rest days) with minimal fields
    const allSessionsInWindow = await GymWorkoutSession.find({
      spaceId,
      ...(query.date ? { date: query.date } : {})
    })
      .select('isRestDay date templateName templateId bodyParts.name bodyParts.exercises.name')
      .sort({ date: 1 })
      .lean();

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

          const mType = ex.measurementType || 'WEIGHT_REPS';
          let exVol = 0;
          let exReps = 0;
          let exMaxWeight = 0;
          let exDuration = 0;
          let exExtraWeight = 0;
          let exCompletedSets = 0;

          // Only eligible COMPLETED sets contribute based on measurement type
          for (const s of ex.sets || []) {
            if (s.status === GYM_SET_STATUS.COMPLETED) {
              if (mType === 'WEIGHT_REPS') {
                const weight = Math.max(0, Number(s.weightKg) || 0);
                const reps = Math.max(0, Number(s.reps) || 0);
                const setVol = weight * reps;

                exVol += setVol;
                exReps += reps;
                if (weight > exMaxWeight) {
                  exMaxWeight = weight;
                }
              } else if (mType === 'BODYWEIGHT_REPS') {
                const reps = Math.max(0, Number(s.reps) || 0);
                const extraWeight = Math.max(0, Number(s.extraWeightKg) || 0);
                exReps += reps;
                if (extraWeight > exExtraWeight) {
                  exExtraWeight = extraWeight;
                }
              } else if (mType === 'DURATION') {
                const duration = Math.max(0, Number(s.durationMinutes) || 0);
                exDuration += duration;
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
              measurementType: mType,
              history: []
            });
          }
          exercisePerformanceMap.get(eKey).history.push({
            date: session.date,
            measurementType: mType,
            volume: exVol,
            maxWeight: exMaxWeight,
            reps: exReps,
            durationMinutes: exDuration,
            extraWeightKg: exExtraWeight,
            completedSets: exCompletedSets
          });
        }
      }

      // Aggregate into templatePerformanceMap (resolving template name if templateId exists)
      let tName = session.templateName ? session.templateName.trim() : '';
      if (!tName && session.templateId) {
        const matched = userTemplates.find(
          (t) => t._id.toString() === session.templateId.toString()
        );
        if (matched) tName = matched.name;
      }
      if (!tName) tName = 'Custom Routine';

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
        completedSets: sessionFilteredCompletedSets,
        setsCount: sessionFilteredCompletedSets,
        score: session.scoreBreakdown?.totalScore || 0
      });
    }

    // Rest Days count in selected window
    const restDaysCount = allSessionsInWindow.filter((s) => s.isRestDay).length;

    // Average Workout Score across matching finished workouts
    const averageScore = matchingFinishedWorkouts > 0 ? Math.round(matchingScoreSum / matchingFinishedWorkouts) : 0;
    const averageTreadmillDuration =
      treadmillSessionsCount > 0 ? Math.round(treadmillTotalMinutes / treadmillSessionsCount) : 0;

    // --- Build Cascading Filter Options Tree from templates, historical sessions & current window ---
    const routinesSet = new Set();
    const bodyPartsByRoutine = {};
    const exercisesByBodyPart = {};
    const allBodyPartsSet = new Set();
    const allExercisesSet = new Set();

    const addFilterMapping = (rName, bpName, exName) => {
      const routineClean = rName?.trim();
      const bpClean = bpName?.trim();
      const exClean = exName?.trim();

      if (routineClean) {
        routinesSet.add(routineClean);
        if (!bodyPartsByRoutine[routineClean]) {
          bodyPartsByRoutine[routineClean] = new Set();
        }
        if (bpClean) {
          bodyPartsByRoutine[routineClean].add(bpClean);
        }
      }

      if (bpClean) {
        allBodyPartsSet.add(bpClean);
        if (!exercisesByBodyPart[bpClean]) {
          exercisesByBodyPart[bpClean] = new Set();
        }
        if (exClean) {
          exercisesByBodyPart[bpClean].add(exClean);
        }
      }

      if (exClean) {
        allExercisesSet.add(exClean);
      }
    };

    // 1. Populate from User Templates (always present in dropdowns)
    for (const tpl of userTemplates) {
      const tName = tpl.name?.trim();
      if (!tName) continue;
      routinesSet.add(tName);

      for (const bp of tpl.bodyParts || []) {
        const bpName = bp.name?.trim();
        if (!bpName) continue;
        addFilterMapping(tName, bpName, null);

        for (const ex of bp.exercises || []) {
          const exName = ex.name?.trim();
          if (exName) addFilterMapping(tName, bpName, exName);
        }
      }
    }

    // 2. Populate from all Space Sessions (to capture custom routines or past exercises)
    for (const s of allSpaceSessions) {
      let rName = s.templateName ? s.templateName.trim() : '';
      if (!rName && s.templateId) {
        const matched = userTemplates.find(
          (t) => t._id.toString() === s.templateId.toString()
        );
        if (matched) rName = matched.name;
      }
      if (!rName) rName = 'Custom Routine';

      for (const bp of s.bodyParts || []) {
        const bpName = bp.name?.trim();
        if (!bpName) continue;
        addFilterMapping(rName, bpName, null);

        for (const ex of bp.exercises || []) {
          const exName = ex.name?.trim();
          if (exName) addFilterMapping(rName, bpName, exName);
        }
      }
    }

    // 3. Populate from all Sessions in the current window (including rest days if any body parts logged)
    for (const s of allSessionsInWindow) {
      if (s.isRestDay) continue;
      let rName = s.templateName ? s.templateName.trim() : '';
      if (!rName && s.templateId) {
        const matched = userTemplates.find(
          (t) => t._id.toString() === s.templateId.toString()
        );
        if (matched) rName = matched.name;
      }
      if (!rName) rName = 'Custom Routine';

      for (const bp of s.bodyParts || []) {
        const bpName = bp.name?.trim();
        if (!bpName) continue;
        addFilterMapping(rName, bpName, null);

        for (const ex of bp.exercises || []) {
          const exName = ex.name?.trim();
          if (exName) addFilterMapping(rName, bpName, exName);
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

    const overall = {
      totalWorkouts: matchingFinishedWorkouts,
      totalCompletedExercises,
      totalCompletedSets,
      totalReps,
      totalVolume,
      averageScore,
      restDaysCount
    };

    return {
      overall,
      summary: overall,
      treadmill: {
        totalSessions: treadmillSessionsCount,
        totalMinutes: Number(treadmillTotalMinutes.toFixed(1)),
        averageDuration: Number(averageTreadmillDuration.toFixed(1)),
        caloriesBurned: Number(treadmillCaloriesBurned.toFixed(1)),
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
      exercisesBreakdown: Array.from(exercisePerformanceMap.values())
        .filter((ex) => ex.history.some((h) => h.completedSets > 0 || h.volume > 0 || h.durationMinutes > 0 || h.reps > 0))
        .map((ex) => {
          let totalVol = 0;
          let maxWt = 0;
          let maxRps = 0;
          let maxExWt = 0;
          let totalDur = 0;
          let maxDur = 0;
          let totalRps = 0;
          let totalSets = 0;

          ex.history.forEach((h) => {
            totalVol += h.volume || 0;
            if ((h.maxWeight || 0) > maxWt) maxWt = h.maxWeight;
            if ((h.reps || 0) > maxRps) maxRps = h.reps;
            if ((h.extraWeightKg || 0) > maxExWt) maxExWt = h.extraWeightKg;
            totalDur += h.durationMinutes || 0;
            if ((h.durationMinutes || 0) > maxDur) maxDur = h.durationMinutes;
            totalRps += h.reps || 0;
            totalSets += h.completedSets || 0;
          });

          return {
            ...ex,
            totalVolume: totalVol,
            maxWeight: maxWt,
            maxReps: maxRps,
            maxExtraWeight: maxExWt,
            totalDurationMinutes: Number(totalDur.toFixed(1)),
            maxDurationMinutes: Number(maxDur.toFixed(1)),
            totalReps: totalRps,
            totalSets: totalSets,
            sessionsCount: ex.history.filter((h) => h.completedSets > 0).length
          };
        }),
      filterOptions
    };
  }
}
