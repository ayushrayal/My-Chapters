import mongoose from 'mongoose';
import { DayflowSchedule } from '../models/dayflow-schedule.model.js';
import { GymWorkoutSession } from '../models/gym-workout-session.model.js';
import { SomedayItem } from '../models/someday-item.model.js';
import { DAYFLOW_TASK_STATUS } from '../constants/dayflow.js';
import { GYM_SET_STATUS } from '../constants/gymflow.js';

function padZero(n) {
  return String(n).padStart(2, '0');
}

function formatDateString(d) {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

export class DashboardService {
  /**
   * Resolves date boundaries based on predefined range or explicit dates.
   */
  static resolveDateRange({ range = '30d', startDate, endDate }) {
    const today = new Date();
    const todayStr = formatDateString(today);

    if (startDate && endDate) {
      return { start: startDate, end: endDate, range: 'custom' };
    }

    if (range === '7d') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { start: formatDateString(start), end: todayStr, range: '7d' };
    }

    if (range === '90d') {
      const start = new Date(today);
      start.setDate(today.getDate() - 89);
      return { start: formatDateString(start), end: todayStr, range: '90d' };
    }

    if (range === 'month') {
      const start = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-01`;
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const end = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(lastDay)}`;
      return { start, end, range: 'month' };
    }

    // Default: '30d'
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    return { start: formatDateString(start), end: todayStr, range: '30d' };
  }

  /**
   * Computes comprehensive personal performance analytics for the authenticated Space.
   * Pulls real, non-hardcoded data across Dayflow, GymFlow, and Someday.
   */
  static async getOverview(spaceId, queryParams = {}) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const { start, end, range } = this.resolveDateRange(queryParams);

    // Parallel execution for Dayflow, GymFlow, and Someday datasets
    const [dayflowSchedules, gymSessions, somedayItems] = await Promise.all([
      // 1. Dayflow schedules in range
      DayflowSchedule.find({
        spaceId: spaceObjectId,
        date: { $gte: start, $lte: end }
      })
        .select('date isRestDay isFinished finishedAt templateName tasks.status tasks.title tasks.completedAt')
        .sort({ date: 1 })
        .lean(),

      // 2. GymFlow sessions in range
      GymWorkoutSession.find({
        spaceId: spaceObjectId,
        date: { $gte: start, $lte: end }
      })
        .select('date isRestDay restDayReason isFinished templateName scoreBreakdown.totalScore treadmill bodyParts.name bodyParts.exercises.name bodyParts.exercises.measurementType bodyParts.exercises.sets.status bodyParts.exercises.sets.weightKg bodyParts.exercises.sets.reps bodyParts.exercises.sets.extraWeightKg bodyParts.exercises.sets.durationMinutes')
        .sort({ date: 1 })
        .lean(),

      // 3. Someday items (all items for Space with category populate)
      SomedayItem.find({ spaceId: spaceObjectId })
        .select('name title status targetPrice actualPrice priority categoryId createdAt updatedAt')
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // -------------------------------------------------------------------------
    // A. Dayflow Performance Processing
    // -------------------------------------------------------------------------
    let totalScheduledDays = 0;
    let completedDays = 0;
    let restDays = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let skippedTasks = 0;
    let pendingTasks = 0;

    const dayflowWeeklyMap = new Map();

    for (const schedule of dayflowSchedules) {
      if (schedule.isRestDay) {
        restDays += 1;
        continue; // Rest days are excluded from task and working day calculations
      }

      totalScheduledDays += 1;
      if (schedule.isFinished) {
        completedDays += 1;
      }

      for (const t of schedule.tasks || []) {
        totalTasks += 1;
        if (t.status === DAYFLOW_TASK_STATUS.COMPLETED) {
          completedTasks += 1;
        } else if (t.status === DAYFLOW_TASK_STATUS.SKIPPED) {
          skippedTasks += 1;
        } else {
          pendingTasks += 1;
        }
      }

      // Group into weekly trend by week key (YYYY-WW)
      const scheduleDate = new Date(`${schedule.date}T00:00:00`);
      const weekNumber = Math.ceil(
        ((scheduleDate - new Date(scheduleDate.getFullYear(), 0, 1)) / 86400000 + 1) / 7
      );
      const weekKey = `W${weekNumber}`;
      if (!dayflowWeeklyMap.has(weekKey)) {
        dayflowWeeklyMap.set(weekKey, { week: weekKey, totalTasks: 0, completedTasks: 0 });
      }
      const weekData = dayflowWeeklyMap.get(weekKey);
      for (const t of schedule.tasks || []) {
        weekData.totalTasks += 1;
        if (t.status === DAYFLOW_TASK_STATUS.COMPLETED) {
          weekData.completedTasks += 1;
        }
      }
    }

    const dayflowTaskCompletionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const dayflowDayCompletionRate =
      totalScheduledDays > 0 ? Math.round((completedDays / totalScheduledDays) * 100) : 0;

    const dayflowWeeklyTrend = Array.from(dayflowWeeklyMap.values());

    // -------------------------------------------------------------------------
    // B. GymFlow Performance Processing
    // -------------------------------------------------------------------------
    let totalWorkoutSessions = 0;
    let completedWorkouts = 0;
    let gymRestDays = 0;
    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;
    let totalDurationMinutes = 0;
    const activeWorkoutDateSet = new Set();
    const gymRecentActivity = [];
    const gymPerformanceTrend = [];

    for (const session of gymSessions) {
      if (session.isRestDay) {
        gymRestDays += 1;
        continue;
      }

      totalWorkoutSessions += 1;
      if (session.isFinished) {
        completedWorkouts += 1;
        activeWorkoutDateSet.add(session.date);
      }

      const score = session.scoreBreakdown?.totalScore ?? (session.isFinished ? 100 : 0);
      gymPerformanceTrend.push({
        date: session.date,
        routine: session.templateName || 'Custom Workout',
        score
      });

      gymRecentActivity.push({
        date: session.date,
        templateName: session.templateName || 'Custom Workout',
        isFinished: Boolean(session.isFinished),
        score
      });

      for (const bp of session.bodyParts || []) {
        for (const ex of bp.exercises || []) {
          const mType = ex.measurementType || 'WEIGHT_REPS';
          for (const s of ex.sets || []) {
            if (s.status === GYM_SET_STATUS.COMPLETED) {
              totalSets += 1;
              if (mType === 'WEIGHT_REPS') {
                const w = Math.max(0, Number(s.weightKg) || 0);
                const r = Math.max(0, Number(s.reps) || 0);
                totalVolume += w * r;
                totalReps += r;
              } else if (mType === 'BODYWEIGHT_REPS') {
                const r = Math.max(0, Number(s.reps) || 0);
                totalReps += r;
              } else if (mType === 'DURATION') {
                const d = Math.max(0, Number(s.durationMinutes) || 0);
                totalDurationMinutes += d;
              }
            }
          }
        }
      }
    }

    // Days in range for frequency calculations
    const startDateObj = new Date(`${start}T00:00:00`);
    const endDateObj = new Date(`${end}T00:00:00`);
    const daysDiff = Math.max(1, Math.round((endDateObj - startDateObj) / 86400000) + 1);
    const weeksDiff = Math.max(1, daysDiff / 7);

    const weeklyWorkoutFrequency = Number((completedWorkouts / weeksDiff).toFixed(1));
    const workoutConsistency =
      totalWorkoutSessions > 0
        ? Math.round((completedWorkouts / totalWorkoutSessions) * 100)
        : 0;

    // -------------------------------------------------------------------------
    // C. Someday Performance Processing
    // -------------------------------------------------------------------------
    let somedayTotal = 0;
    let somedayPlanned = 0;
    let somedayPurchased = 0;
    let somedayArchived = 0;

    for (const item of somedayItems) {
      somedayTotal += 1;
      if (item.status === 'PLANNED') somedayPlanned += 1;
      else if (item.status === 'PURCHASED') somedayPurchased += 1;
      else if (item.status === 'ARCHIVED') somedayArchived += 1;
    }

    const somedayRecentAdditions = somedayItems.slice(0, 5).map((item) => ({
      id: item._id.toString(),
      title: item.title || item.name || '',
      name: item.name || item.title || '',
      status: item.status,
      targetPrice: item.targetPrice || null,
      categoryName: item.categoryId?.name || 'Uncategorized',
      createdAt: item.createdAt
    }));

    // -------------------------------------------------------------------------
    // D. Combined Activity Timeline
    // -------------------------------------------------------------------------
    const combinedActivity = [
      ...gymRecentActivity.slice(-5).map((g) => ({
        type: 'GYMFLOW',
        date: g.date,
        title: `Workout: ${g.templateName}`,
        detail: g.isFinished ? `Finished with score ${g.score}%` : 'In progress'
      })),
      ...dayflowSchedules
        .filter((d) => d.isFinished)
        .slice(-5)
        .map((d) => ({
          type: 'DAYFLOW',
          date: d.date,
          title: `Day Completed: ${d.templateName || 'Daily Schedule'}`,
          detail: `${(d.tasks || []).filter((t) => t.status === 'COMPLETED').length} tasks completed`
        }))
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

    return {
      dateRange: {
        start,
        end,
        range
      },
      overall: {
        dayflowCompletionRate: dayflowTaskCompletionRate,
        gymWorkoutCount: completedWorkouts,
        gymConsistency: workoutConsistency,
        somedayTotal,
        somedayPlanned,
        somedayPurchased
      },
      dayflow: {
        totalScheduledDays,
        completedDays,
        restDays,
        dayCompletionRate: dayflowDayCompletionRate,
        taskCompletionRate: dayflowTaskCompletionRate,
        totalTasks,
        completedTasks,
        skippedTasks,
        pendingTasks,
        weeklyTrend: dayflowWeeklyTrend
      },
      gymflow: {
        totalWorkoutSessions,
        completedWorkouts,
        restDays: gymRestDays,
        totalVolume,
        totalSets,
        totalReps,
        totalDurationMinutes,
        activeWorkoutDays: activeWorkoutDateSet.size,
        weeklyWorkoutFrequency,
        workoutConsistency,
        recentActivity: gymRecentActivity.slice(-6).reverse(),
        performanceTrend: gymPerformanceTrend.slice(-10)
      },
      someday: {
        totalItems: somedayTotal,
        plannedItems: somedayPlanned,
        purchasedItems: somedayPurchased,
        archivedItems: somedayArchived,
        statusDistribution: {
          planned: somedayPlanned,
          purchased: somedayPurchased,
          archived: somedayArchived
        },
        recentAdditions: somedayRecentAdditions
      },
      combinedActivity
    };
  }
}
