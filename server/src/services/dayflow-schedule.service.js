import mongoose from 'mongoose';
import { DayflowSchedule } from '../models/dayflow-schedule.model.js';
import { DayflowTemplate } from '../models/dayflow-template.model.js';
import { DAYFLOW_TASK_STATUS, DAYFLOW_SCHEDULE_STATUS } from '../constants/dayflow.js';
import { AppError } from '../utils/app-error.js';
import { timeToMinutes, validateBlockTimeRanges } from '../validators/dayflow.validator.js';

/**
 * Returns formatted daily block.
 */
function formatBlock(b, idx) {
  return {
    id: b._id ? b._id.toString() : b.id || `block-${idx}`,
    name: b.name,
    startTime: b.startTime,
    endTime: b.endTime,
    description: b.description || '',
    notes: b.notes || '',
    order: typeof b.order === 'number' ? b.order : idx,
    tasksRequired: Boolean(b.tasksRequired)
  };
}

/**
 * Resolves dynamic task status based on schedule date and current client time.
 * If task is already manually COMPLETED or SKIPPED, that persisted state is preserved.
 * An unfinished task whose scheduled time has passed becomes PENDING (never automatically skipped).
 */
function resolveTaskStatus(task, block, scheduleDate, clientDateStr, clientTimeMinutes) {
  if (task.status === DAYFLOW_TASK_STATUS.COMPLETED || task.status === DAYFLOW_TASK_STATUS.SKIPPED) {
    return task.status;
  }

  // If schedule is for a past calendar date
  if (scheduleDate < clientDateStr) {
    return DAYFLOW_TASK_STATUS.PENDING;
  }

  // If schedule is for a future calendar date
  if (scheduleDate > clientDateStr) {
    return DAYFLOW_TASK_STATUS.UPCOMING;
  }

  // Schedule is for today: evaluate against block start/end time
  if (!block) {
    return task.status || DAYFLOW_TASK_STATUS.UPCOMING;
  }

  const blockStartM = timeToMinutes(block.startTime);
  const blockEndM = timeToMinutes(block.endTime);

  if (clientTimeMinutes < blockStartM) {
    return DAYFLOW_TASK_STATUS.UPCOMING;
  }

  if (clientTimeMinutes >= blockStartM && clientTimeMinutes <= blockEndM) {
    return DAYFLOW_TASK_STATUS.CURRENT;
  }

  // clientTimeMinutes > blockEndM: Block period has passed without completion
  return DAYFLOW_TASK_STATUS.PENDING;
}

/**
 * Formats a task object with resolved status.
 */
function formatTask(t, block, scheduleDate, clientDateStr, clientTimeMinutes) {
  const dynamicStatus = resolveTaskStatus(t, block, scheduleDate, clientDateStr, clientTimeMinutes);

  return {
    id: t._id ? t._id.toString() : t.id,
    blockId: t.blockId ? t.blockId.toString() : undefined,
    title: t.title,
    description: t.description || '',
    notes: t.notes || '',
    status: dynamicStatus,
    persistedStatus: t.status,
    skippedReason: t.skippedReason || null,
    completedAt: t.completedAt || null,
    skippedAt: t.skippedAt || null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  };
}

/**
 * Formats a full DayflowSchedule document.
 */
function formatSchedule(doc, clientTimeStr, clientDateStr) {
  if (!doc) return null;
  const json = doc.toJSON ? doc.toJSON() : doc;

  // Resolve current reference client time
  const now = new Date();
  const effectiveClientDate = clientDateStr || now.toISOString().split('T')[0];
  const effectiveClientTimeMinutes = clientTimeStr
    ? timeToMinutes(clientTimeStr)
    : now.getHours() * 60 + now.getMinutes();

  if (json.isRestDay) {
    return {
      id: json.id || (json._id ? json._id.toString() : undefined),
      date: json.date,
      status: DAYFLOW_SCHEDULE_STATUS.REST_DAY,
      isRestDay: true,
      isFinished: false,
      templateId: null,
      templateName: null,
      blocks: [],
      tasks: [],
      currentBlockId: null,
      stats: { total: 0, completed: 0, skipped: 0, pending: 0, upcoming: 0, completionRate: 0 }
    };
  }

  const blocks = (json.blocks || []).map(formatBlock);
  const blockMap = new Map(blocks.map((b) => [b.id, b]));

  // Find active current block if today
  let currentBlockId = null;
  if (json.date === effectiveClientDate) {
    const activeBlock = blocks.find((b) => {
      const s = timeToMinutes(b.startTime);
      const e = timeToMinutes(b.endTime);
      return effectiveClientTimeMinutes >= s && effectiveClientTimeMinutes <= e;
    });
    if (activeBlock) {
      currentBlockId = activeBlock.id;
    }
  }

  const tasks = (json.tasks || []).map((t) => {
    const block = blockMap.get(t.blockId ? t.blockId.toString() : '');
    return formatTask(t, block, json.date, effectiveClientDate, effectiveClientTimeMinutes);
  });

  // Calculate task counts
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === DAYFLOW_TASK_STATUS.COMPLETED).length;
  const skipped = tasks.filter((t) => t.status === DAYFLOW_TASK_STATUS.SKIPPED).length;
  const pending = tasks.filter((t) => t.status === DAYFLOW_TASK_STATUS.PENDING).length;
  const upcoming = tasks.filter(
    (t) => t.status === DAYFLOW_TASK_STATUS.UPCOMING || t.status === DAYFLOW_TASK_STATUS.CURRENT
  ).length;
  const completionRate = total > 0 ? Number(((completed / total) * 100).toFixed(2)) : 0;

  const status = json.isFinished
    ? DAYFLOW_SCHEDULE_STATUS.FINISHED
    : DAYFLOW_SCHEDULE_STATUS.SCHEDULED;

  return {
    id: json.id || (json._id ? json._id.toString() : undefined),
    date: json.date,
    status,
    isRestDay: false,
    isFinished: Boolean(json.isFinished),
    finishedAt: json.finishedAt || null,
    templateId: json.templateId ? json.templateId.toString() : null,
    templateName: json.templateName || null,
    blocks,
    tasks,
    currentBlockId,
    stats: {
      total,
      completed,
      skipped,
      pending,
      upcoming,
      completionRate
    },
    createdAt: json.createdAt,
    updatedAt: json.updatedAt
  };
}

export class DayflowScheduleService {
  /**
   * Retrieves a schedule for a specific date in the user's Space.
   * If not found, returns a safe NOT_SCHEDULED payload without throwing.
   */
  static async getScheduleByDate(spaceId, date, clientTime = null, clientDate = null) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    const doc = await DayflowSchedule.findOne({
      spaceId: spaceObjectId,
      date
    });

    if (!doc) {
      return {
        id: null,
        date,
        status: DAYFLOW_SCHEDULE_STATUS.NOT_SCHEDULED,
        isRestDay: false,
        isFinished: false,
        finishedAt: null,
        templateId: null,
        templateName: null,
        blocks: [],
        tasks: [],
        currentBlockId: null,
        stats: { total: 0, completed: 0, skipped: 0, pending: 0, upcoming: 0, completionRate: 0 }
      };
    }

    return formatSchedule(doc, clientTime, clientDate);
  }

  /**
   * Saves or updates a daily schedule.
   * Enforces that finished days cannot be modified and validates mandatory tasks rule.
   */
  static async saveSchedule(spaceId, { date, blocks = [], tasks = [] }, clientTime = null, clientDate = null) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    const existing = await DayflowSchedule.findOne({
      spaceId: spaceObjectId,
      date
    });

    if (existing && existing.isFinished) {
      throw AppError.badRequest('Finished days are permanently locked and cannot be modified');
    }

    if (blocks && blocks.length > 0) {
      if (!validateBlockTimeRanges(blocks)) {
        throw AppError.badRequest('Time blocks cannot overlap and start time must be before end time');
      }
    }

    // Normalize blocks with consistent ObjectIds
    const normalizedBlocks = blocks.map((b, idx) => ({
      _id: b.id || b._id ? new mongoose.Types.ObjectId(b.id || b._id) : new mongoose.Types.ObjectId(),
      name: b.name.trim(),
      startTime: b.startTime.trim(),
      endTime: b.endTime.trim(),
      description: (b.description || '').trim(),
      notes: (b.notes || '').trim(),
      order: typeof b.order === 'number' ? b.order : idx,
      tasksRequired: Boolean(b.tasksRequired)
    }));

    const blockIdSet = new Set(normalizedBlocks.map((b) => b._id.toString()));

    // Mandatory Task Rule: Every block with tasksRequired = true must have at least one task
    const tasksPerBlockCount = new Map();
    for (const t of tasks) {
      const bId = (t.blockId || '').toString();
      tasksPerBlockCount.set(bId, (tasksPerBlockCount.get(bId) || 0) + 1);
    }

    for (const b of normalizedBlocks) {
      if (b.tasksRequired) {
        const count = tasksPerBlockCount.get(b._id.toString()) || 0;
        if (count === 0) {
          throw AppError.badRequest(
            `Block "${b.name}" requires at least one task before schedule can be saved`,
            { blockId: b._id.toString(), blockName: b.name }
          );
        }
      }
    }

    // Normalize tasks
    const normalizedTasks = tasks.map((t) => {
      const bId = (t.blockId || '').toString();
      if (!blockIdSet.has(bId)) {
        throw AppError.badRequest(`Task "${t.title}" references a block that does not exist in this schedule`);
      }

      const status = t.status || DAYFLOW_TASK_STATUS.UPCOMING;
      if (status === DAYFLOW_TASK_STATUS.SKIPPED && (!t.skippedReason || !t.skippedReason.trim())) {
        throw AppError.badRequest('A mandatory reason is required when skipping a task');
      }

      return {
        _id: t.id || t._id ? new mongoose.Types.ObjectId(t.id || t._id) : new mongoose.Types.ObjectId(),
        blockId: new mongoose.Types.ObjectId(bId),
        title: t.title.trim(),
        description: (t.description || '').trim(),
        notes: (t.notes || '').trim(),
        status,
        skippedReason: status === DAYFLOW_TASK_STATUS.SKIPPED ? t.skippedReason.trim() : null,
        completedAt: status === DAYFLOW_TASK_STATUS.COMPLETED ? t.completedAt || new Date() : null,
        skippedAt: status === DAYFLOW_TASK_STATUS.SKIPPED ? t.skippedAt || new Date() : null
      };
    });

    let schedule = existing;
    if (schedule) {
      schedule.blocks = normalizedBlocks;
      schedule.tasks = normalizedTasks;
      schedule.isRestDay = false;
      await schedule.save();
    } else {
      schedule = await DayflowSchedule.create({
        spaceId: spaceObjectId,
        date,
        isRestDay: false,
        isFinished: false,
        blocks: normalizedBlocks,
        tasks: normalizedTasks
      });
    }

    return formatSchedule(schedule, clientTime, clientDate);
  }

  /**
   * Applies a reusable template to a specific date (or array of target dates).
   * Creates an independent daily schedule with a snapshot of blocks and templateName.
   */
  static async applyTemplate(
    spaceId,
    { templateId, targetDate, targetDates = [], overwrite = false, tasks = [] },
    clientTime = null,
    clientDate = null
  ) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const templateObjectId = new mongoose.Types.ObjectId(templateId);

    const template = await DayflowTemplate.findOne({
      _id: templateObjectId,
      spaceId: spaceObjectId
    });

    if (!template) {
      throw AppError.notFound('Template not found in your Space');
    }

    const datesToApply = targetDates.length > 0 ? targetDates : [targetDate];

    const results = [];
    for (const d of datesToApply) {
      const existing = await DayflowSchedule.findOne({
        spaceId: spaceObjectId,
        date: d
      });

      if (existing && existing.isFinished) {
        throw AppError.badRequest(`Cannot apply template to a finished day (${d})`);
      }

      if (existing && !overwrite) {
        throw AppError.conflict(
          `A schedule already exists for ${d}. Please confirm overwrite to replace it.`
        );
      }

      // Map snapshot blocks with fresh ObjectIds
      const blockIdMap = new Map(); // template block id -> new daily block id
      const dailyBlocks = (template.blocks || []).map((tb, idx) => {
        const newBlockId = new mongoose.Types.ObjectId();
        if (tb._id) blockIdMap.set(tb._id.toString(), newBlockId);
        if (tb.id) blockIdMap.set(tb.id.toString(), newBlockId);

        return {
          _id: newBlockId,
          name: tb.name,
          startTime: tb.startTime,
          endTime: tb.endTime,
          description: tb.description || '',
          notes: tb.notes || '',
          order: typeof tb.order === 'number' ? tb.order : idx,
          tasksRequired: Boolean(tb.tasksRequired)
        };
      });

      // Prepare initial tasks if provided, mapping blockIds
      const dailyTasks = [];
      const tasksPerBlock = new Map();

      for (const t of tasks) {
        const origBId = (t.blockId || '').toString();
        const mappedBId =
          blockIdMap.get(origBId) ||
          (mongoose.Types.ObjectId.isValid(origBId) ? origBId : dailyBlocks[0]?._id);
        const resolvedObjectId = mongoose.Types.ObjectId.isValid(mappedBId)
          ? new mongoose.Types.ObjectId(mappedBId)
          : dailyBlocks[0]?._id || new mongoose.Types.ObjectId();

        dailyTasks.push({
          _id: new mongoose.Types.ObjectId(),
          blockId: resolvedObjectId,
          title: t.title.trim(),
          description: (t.description || '').trim(),
          notes: (t.notes || '').trim(),
          status: DAYFLOW_TASK_STATUS.UPCOMING
        });
        tasksPerBlock.set(resolvedObjectId.toString(), (tasksPerBlock.get(resolvedObjectId.toString()) || 0) + 1);
      }

      // Validate mandatory tasks rule on template application
      for (const b of dailyBlocks) {
        if (b.tasksRequired) {
          const count = tasksPerBlock.get(b._id.toString()) || 0;
          if (count === 0) {
            throw AppError.badRequest(
              `Block "${b.name}" requires at least one task before template can be applied to ${d}`,
              { blockId: b._id.toString(), blockName: b.name, date: d }
            );
          }
        }
      }

      let scheduleDoc;
      if (existing) {
        existing.templateId = template._id;
        existing.templateName = template.name;
        existing.blocks = dailyBlocks;
        existing.tasks = dailyTasks;
        existing.isRestDay = false;
        existing.isFinished = false;
        await existing.save();
        scheduleDoc = existing;
      } else {
        scheduleDoc = await DayflowSchedule.create({
          spaceId: spaceObjectId,
          date: d,
          templateId: template._id,
          templateName: template.name,
          blocks: dailyBlocks,
          tasks: dailyTasks,
          isRestDay: false,
          isFinished: false
        });
      }

      results.push(formatSchedule(scheduleDoc, clientTime, clientDate));
    }

    return results.length === 1 ? results[0] : results;
  }

  /**
   * Moves an unfinished schedule to another date.
   * Protects finished days from being moved or overwritten.
   */
  static async moveSchedule(spaceId, { sourceDate, targetDate, overwrite = false }, clientTime = null, clientDate = null) {
    if (sourceDate === targetDate) {
      throw AppError.badRequest('Source and target dates must be different');
    }

    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    const source = await DayflowSchedule.findOne({ spaceId: spaceObjectId, date: sourceDate });
    if (!source) {
      throw AppError.notFound(`No schedule found for ${sourceDate}`);
    }

    if (source.isFinished) {
      throw AppError.badRequest('Finished days are permanently locked and cannot be moved');
    }

    const target = await DayflowSchedule.findOne({ spaceId: spaceObjectId, date: targetDate });
    if (target && target.isFinished) {
      throw AppError.badRequest(`Cannot move schedule to ${targetDate} because that day is already finished`);
    }

    if (target && !overwrite) {
      throw AppError.conflict(
        `A schedule already exists for ${targetDate}. Confirm overwrite to replace it.`
      );
    }

    if (target) {
      target.templateId = source.templateId;
      target.templateName = source.templateName;
      target.blocks = source.blocks;
      target.tasks = source.tasks;
      target.isRestDay = source.isRestDay;
      target.isFinished = false;
      await target.save();
      await DayflowSchedule.deleteOne({ _id: source._id });
      return formatSchedule(target, clientTime, clientDate);
    }

    source.date = targetDate;
    await source.save();
    return formatSchedule(source, clientTime, clientDate);
  }

  /**
   * Sets or clears Rest Day status on a date.
   * Prevents silent overwriting of days with tasks.
   */
  static async setRestDay(spaceId, { date, isRestDay = true, overwrite = false }, clientTime = null, clientDate = null) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    const existing = await DayflowSchedule.findOne({ spaceId: spaceObjectId, date });
    if (existing && existing.isFinished) {
      throw AppError.badRequest('Finished days are permanently locked and cannot be modified');
    }

    if (isRestDay) {
      if (existing && existing.tasks && existing.tasks.length > 0 && !overwrite) {
        throw AppError.conflict(
          `Schedule on ${date} contains tasks. Confirm to replace with a Rest Day.`
        );
      }

      if (existing) {
        existing.isRestDay = true;
        existing.blocks = [];
        existing.tasks = [];
        existing.templateId = null;
        existing.templateName = null;
        await existing.save();
        return formatSchedule(existing, clientTime, clientDate);
      }

      const created = await DayflowSchedule.create({
        spaceId: spaceObjectId,
        date,
        isRestDay: true,
        isFinished: false,
        blocks: [],
        tasks: []
      });
      return formatSchedule(created, clientTime, clientDate);
    }

    // If clearing rest day
    if (existing) {
      await DayflowSchedule.deleteOne({ _id: existing._id });
    }

    return {
      date,
      status: DAYFLOW_SCHEDULE_STATUS.NOT_SCHEDULED,
      isRestDay: false,
      isFinished: false,
      blocks: [],
      tasks: [],
      stats: { total: 0, completed: 0, skipped: 0, pending: 0, upcoming: 0, completionRate: 0 }
    };
  }

  /**
   * Updates an individual task in a day's schedule.
   * Enforces that skipping requires a mandatory reason and checks finished status.
   */
  static async updateTask(
    spaceId,
    { date, taskId, title, description, notes, blockId, status, skippedReason },
    clientTime = null,
    clientDate = null
  ) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    const schedule = await DayflowSchedule.findOne({ spaceId: spaceObjectId, date });
    if (!schedule) {
      throw AppError.notFound(`No schedule found for ${date}`);
    }

    if (schedule.isFinished) {
      throw AppError.badRequest('Finished days are permanently locked and cannot be modified');
    }

    const task = schedule.tasks.id(taskId);
    if (!task) {
      throw AppError.notFound('Task not found in this schedule');
    }

    if (typeof title === 'string') {
      task.title = title.trim();
    }
    if (typeof description === 'string') {
      task.description = description.trim();
    }
    if (typeof notes === 'string') {
      task.notes = notes.trim();
    }
    if (blockId) {
      const bExists = schedule.blocks.id(blockId);
      if (!bExists) {
        throw AppError.badRequest('Referenced block does not exist in this schedule');
      }
      task.blockId = new mongoose.Types.ObjectId(blockId);
    }

    if (status) {
      if (status === DAYFLOW_TASK_STATUS.SKIPPED) {
        const reason = (skippedReason || task.skippedReason || '').trim();
        if (!reason) {
          throw AppError.badRequest('A mandatory reason is required when marking a task as Skipped');
        }
        task.status = DAYFLOW_TASK_STATUS.SKIPPED;
        task.skippedReason = reason;
        task.skippedAt = new Date();
        task.completedAt = null;
      } else if (status === DAYFLOW_TASK_STATUS.COMPLETED) {
        task.status = DAYFLOW_TASK_STATUS.COMPLETED;
        task.completedAt = new Date();
        task.skippedAt = null;
        task.skippedReason = null;
      } else {
        // UPCOMING / CURRENT / PENDING
        task.status = status;
        task.completedAt = null;
        task.skippedAt = null;
        task.skippedReason = null;
      }
    }

    await schedule.save();
    return formatSchedule(schedule, clientTime, clientDate);
  }

  /**
   * Deletes a task from a daily schedule.
   * Enforces mandatory block task requirement and checks finished status.
   */
  static async deleteTask(spaceId, { date, taskId }, clientTime = null, clientDate = null) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    const schedule = await DayflowSchedule.findOne({ spaceId: spaceObjectId, date });
    if (!schedule) {
      throw AppError.notFound(`No schedule found for ${date}`);
    }

    if (schedule.isFinished) {
      throw AppError.badRequest('Finished days are permanently locked and cannot be modified');
    }

    const task = schedule.tasks.id(taskId);
    if (!task) {
      throw AppError.notFound('Task not found in this schedule');
    }

    // Check mandatory tasks requirement on block
    const block = schedule.blocks.id(task.blockId);
    if (block && block.tasksRequired) {
      const otherTasksForBlock = schedule.tasks.filter(
        (t) => t.blockId.toString() === block._id.toString() && t._id.toString() !== taskId
      );
      if (otherTasksForBlock.length === 0) {
        throw AppError.badRequest(
          `Cannot delete task. Block "${block.name}" requires at least one task.`
        );
      }
    }

    schedule.tasks.pull({ _id: taskId });
    await schedule.save();
    return formatSchedule(schedule, clientTime, clientDate);
  }

  /**
   * Finishes and locks a daily schedule.
   * All tasks MUST be either COMPLETED or SKIPPED. Unfinished/pending tasks block finishing.
   */
  static async finishDay(spaceId, { date }, clientTime = null, clientDate = null) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    const schedule = await DayflowSchedule.findOne({ spaceId: spaceObjectId, date });
    if (!schedule) {
      throw AppError.notFound(`No schedule found for ${date}`);
    }

    if (schedule.isRestDay) {
      throw AppError.badRequest('A Rest Day cannot be finished');
    }

    if (schedule.isFinished) {
      return formatSchedule(schedule, clientTime, clientDate);
    }

    // Check unresolved tasks: Any task that is NOT COMPLETED and NOT SKIPPED
    const unresolvedTasks = [];
    for (const t of schedule.tasks) {
      if (t.status !== DAYFLOW_TASK_STATUS.COMPLETED && t.status !== DAYFLOW_TASK_STATUS.SKIPPED) {
        unresolvedTasks.push({
          id: t._id.toString(),
          title: t.title,
          status: t.status
        });
      }
    }

    if (unresolvedTasks.length > 0) {
      throw AppError.badRequest(
        `Cannot finish day. All tasks must be completed or skipped first. (${unresolvedTasks.length} task${unresolvedTasks.length === 1 ? '' : 's'} remaining)`,
        { unresolvedCount: unresolvedTasks.length, unresolvedTasks }
      );
    }

    schedule.isFinished = true;
    schedule.finishedAt = new Date();
    await schedule.save();

    return formatSchedule(schedule, clientTime, clientDate);
  }

  /**
   * Retrieves calendar overview for a range of dates.
   */
  static async getCalendarOverview(spaceId, { startDate, endDate }) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    const schedules = await DayflowSchedule.find({
      spaceId: spaceObjectId,
      date: { $gte: startDate, $lte: endDate }
    });

    return schedules.map((s) => {
      let status = DAYFLOW_SCHEDULE_STATUS.SCHEDULED;
      if (s.isRestDay) status = DAYFLOW_SCHEDULE_STATUS.REST_DAY;
      else if (s.isFinished) status = DAYFLOW_SCHEDULE_STATUS.FINISHED;

      const totalTasks = s.tasks ? s.tasks.length : 0;
      const completedTasks = s.tasks
        ? s.tasks.filter((t) => t.status === DAYFLOW_TASK_STATUS.COMPLETED).length
        : 0;
      const skippedTasks = s.tasks
        ? s.tasks.filter((t) => t.status === DAYFLOW_TASK_STATUS.SKIPPED).length
        : 0;

      return {
        date: s.date,
        status,
        isRestDay: Boolean(s.isRestDay),
        isFinished: Boolean(s.isFinished),
        templateName: s.templateName || null,
        totalTasks,
        completedTasks,
        skippedTasks
      };
    });
  }

  /**
   * Retrieves performance analytics based strictly on real database records.
   * Excludes Rest Days and unscheduled days from completion rate calculations.
   */
  static async getAnalytics(spaceId, { startDate, endDate, date = null }) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    const query = { spaceId: spaceObjectId };
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const schedules = await DayflowSchedule.find(query).sort({ date: 1 });

    // 1. Overall & Weekly Stats (Excluding Rest Days)
    let totalTasks = 0;
    let completedTasks = 0;
    let skippedTasks = 0;
    let scheduledDaysCount = 0;
    let restDaysCount = 0;
    let finishedDaysCount = 0;

    const dailyTrend = [];
    const templatePerformanceMap = new Map();

    for (const s of schedules) {
      if (s.isRestDay) {
        restDaysCount++;
        dailyTrend.push({
          date: s.date,
          status: DAYFLOW_SCHEDULE_STATUS.REST_DAY,
          completionRate: null,
          totalTasks: 0,
          completedTasks: 0,
          skippedTasks: 0
        });
        continue;
      }

      scheduledDaysCount++;
      if (s.isFinished) finishedDaysCount++;

      const dayTotal = s.tasks ? s.tasks.length : 0;
      const dayCompleted = s.tasks
        ? s.tasks.filter((t) => t.status === DAYFLOW_TASK_STATUS.COMPLETED).length
        : 0;
      const daySkipped = s.tasks
        ? s.tasks.filter((t) => t.status === DAYFLOW_TASK_STATUS.SKIPPED).length
        : 0;

      totalTasks += dayTotal;
      completedTasks += dayCompleted;
      skippedTasks += daySkipped;

      const dayRate = dayTotal > 0 ? Number(((dayCompleted / dayTotal) * 100).toFixed(2)) : 0;

      dailyTrend.push({
        date: s.date,
        status: s.isFinished ? DAYFLOW_SCHEDULE_STATUS.FINISHED : DAYFLOW_SCHEDULE_STATUS.SCHEDULED,
        completionRate: dayRate,
        totalTasks: dayTotal,
        completedTasks: dayCompleted,
        skippedTasks: daySkipped
      });

      // Template attribution (snapshot name)
      if (s.templateName) {
        const tName = s.templateName;
        if (!templatePerformanceMap.has(tName)) {
          templatePerformanceMap.set(tName, {
            templateName: tName,
            daysCount: 0,
            totalTasks: 0,
            completedTasks: 0,
            skippedTasks: 0
          });
        }
        const record = templatePerformanceMap.get(tName);
        record.daysCount++;
        record.totalTasks += dayTotal;
        record.completedTasks += dayCompleted;
        record.skippedTasks += daySkipped;
      }
    }

    const overallCompletionRate =
      totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(2)) : 0;

    // Template Breakdown
    const templateBreakdown = Array.from(templatePerformanceMap.values()).map((t) => ({
      templateName: t.templateName,
      daysCount: t.daysCount,
      totalTasks: t.totalTasks,
      completedTasks: t.completedTasks,
      skippedTasks: t.skippedTasks,
      completionRate: t.totalTasks > 0 ? Number(((t.completedTasks / t.totalTasks) * 100).toFixed(2)) : 0
    }));

    // 2. Time-Based Performance Graph for selected day
    let timeBasedPerformance = null;
    if (date) {
      const daySchedule = schedules.find((s) => s.date === date);
      if (daySchedule && !daySchedule.isRestDay && daySchedule.tasks && daySchedule.tasks.length > 0) {
        const blockMap = new Map((daySchedule.blocks || []).map((b) => [b._id.toString(), b]));

        // Sort tasks by scheduled block start time
        const sortedTasks = [...daySchedule.tasks].sort((a, b) => {
          const blockA = blockMap.get(a.blockId.toString());
          const blockB = blockMap.get(b.blockId.toString());
          const timeA = blockA ? timeToMinutes(blockA.startTime) : 0;
          const timeB = blockB ? timeToMinutes(blockB.startTime) : 0;
          return timeA - timeB;
        });

        let runningCompleted = 0;
        let runningProcessed = 0;
        const total = sortedTasks.length;

        const points = sortedTasks.map((t) => {
          const block = blockMap.get(t.blockId.toString());
          const isDone = t.status === DAYFLOW_TASK_STATUS.COMPLETED;
          if (isDone) runningCompleted++;
          runningProcessed++;

          return {
            taskId: t._id.toString(),
            taskTitle: t.title,
            time: block ? block.startTime : '00:00',
            endTime: block ? block.endTime : '00:00',
            blockName: block ? block.name : 'Unassigned',
            status: t.status,
            completedSoFar: runningCompleted,
            percentageSoFar: Number(((runningCompleted / total) * 100).toFixed(2))
          };
        });

        timeBasedPerformance = {
          date,
          isFinished: Boolean(daySchedule.isFinished),
          totalTasks: total,
          completedTasks: daySchedule.tasks.filter((t) => t.status === DAYFLOW_TASK_STATUS.COMPLETED).length,
          skippedTasks: daySchedule.tasks.filter((t) => t.status === DAYFLOW_TASK_STATUS.SKIPPED).length,
          finalRate: Number(
            (
              (daySchedule.tasks.filter((t) => t.status === DAYFLOW_TASK_STATUS.COMPLETED).length / total) *
              100
            ).toFixed(2)
          ),
          points
        };
      }
    }

    return {
      summary: {
        totalTasks,
        completedTasks,
        skippedTasks,
        overallCompletionRate,
        scheduledDaysCount,
        restDaysCount,
        finishedDaysCount
      },
      dailyTrend,
      templateBreakdown,
      timeBasedPerformance
    };
  }
}
