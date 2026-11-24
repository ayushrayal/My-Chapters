import { DayflowScheduleService } from '../services/dayflow-schedule.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class DayflowScheduleController {
  /**
   * GET /api/dayflow/schedule?date=YYYY-MM-DD
   * Retrieves schedule for a specific date with dynamically calculated task statuses.
   */
  static async getSchedule(req, res) {
    const todayStr = new Date().toISOString().split('T')[0];
    const date = req.query.date || todayStr;
    const clientTime = req.query.clientTime || null;
    const clientDate = req.query.clientDate || null;

    const schedule = await DayflowScheduleService.getScheduleByDate(
      req.user.spaceId,
      date,
      clientTime,
      clientDate
    );

    return ApiResponse.success(res, 'Schedule retrieved successfully', schedule);
  }

  /**
   * POST /api/dayflow/schedule
   * Creates or updates a daily schedule.
   */
  static async saveSchedule(req, res) {
    const clientTime = req.query.clientTime || req.body.clientTime || null;
    const clientDate = req.query.clientDate || req.body.clientDate || null;

    const schedule = await DayflowScheduleService.saveSchedule(
      req.user.spaceId,
      {
        date: req.body.date,
        blocks: req.body.blocks,
        tasks: req.body.tasks
      },
      clientTime,
      clientDate
    );

    return ApiResponse.success(res, 'Schedule saved successfully', schedule);
  }

  /**
   * POST /api/dayflow/schedule/apply-template
   * Creates daily schedule from a reusable template blueprint.
   */
  static async applyTemplate(req, res) {
    const clientTime = req.query.clientTime || req.body.clientTime || null;
    const clientDate = req.query.clientDate || req.body.clientDate || null;

    const result = await DayflowScheduleService.applyTemplate(
      req.user.spaceId,
      {
        templateId: req.body.templateId,
        targetDate: req.body.targetDate,
        targetDates: req.body.targetDates,
        overwrite: req.body.overwrite,
        tasks: req.body.tasks
      },
      clientTime,
      clientDate
    );

    return ApiResponse.created(res, 'Template applied successfully', result);
  }

  /**
   * POST /api/dayflow/schedule/move
   * Shifts an unfinished schedule to another future date.
   */
  static async moveSchedule(req, res) {
    const clientTime = req.query.clientTime || req.body.clientTime || null;
    const clientDate = req.query.clientDate || req.body.clientDate || null;

    const result = await DayflowScheduleService.moveSchedule(
      req.user.spaceId,
      {
        sourceDate: req.body.sourceDate,
        targetDate: req.body.targetDate,
        overwrite: req.body.overwrite
      },
      clientTime,
      clientDate
    );

    return ApiResponse.success(res, 'Schedule moved successfully', result);
  }

  /**
   * POST /api/dayflow/schedule/rest-day
   * Marks or clears a date as a Rest Day.
   */
  static async setRestDay(req, res) {
    const clientTime = req.query.clientTime || req.body.clientTime || null;
    const clientDate = req.query.clientDate || req.body.clientDate || null;

    const result = await DayflowScheduleService.setRestDay(
      req.user.spaceId,
      {
        date: req.body.date,
        isRestDay: typeof req.body.isRestDay === 'boolean' ? req.body.isRestDay : true,
        overwrite: Boolean(req.body.overwrite)
      },
      clientTime,
      clientDate
    );

    return ApiResponse.success(res, 'Rest day setting updated', result);
  }

  /**
   * PATCH /api/dayflow/schedule/tasks/:taskId
   * Updates an individual task (status, notes, description).
   */
  static async updateTask(req, res) {
    const clientTime = req.query.clientTime || req.body.clientTime || null;
    const clientDate = req.query.clientDate || req.body.clientDate || null;

    const result = await DayflowScheduleService.updateTask(
      req.user.spaceId,
      {
        date: req.body.date,
        taskId: req.params.taskId,
        title: req.body.title,
        description: req.body.description,
        notes: req.body.notes,
        blockId: req.body.blockId,
        status: req.body.status,
        skippedReason: req.body.skippedReason
      },
      clientTime,
      clientDate
    );

    return ApiResponse.success(res, 'Task updated successfully', result);
  }

  /**
   * DELETE /api/dayflow/schedule/tasks/:taskId
   * Deletes a task from a daily schedule.
   */
  static async deleteTask(req, res) {
    const date = req.query.date || req.body.date;
    const clientTime = req.query.clientTime || null;
    const clientDate = req.query.clientDate || null;

    const result = await DayflowScheduleService.deleteTask(
      req.user.spaceId,
      {
        date,
        taskId: req.params.taskId
      },
      clientTime,
      clientDate
    );

    return ApiResponse.success(res, 'Task deleted successfully', result);
  }

  /**
   * POST /api/dayflow/schedule/finish
   * Finishes and permanently locks a day's schedule.
   */
  static async finishDay(req, res) {
    const clientTime = req.query.clientTime || req.body.clientTime || null;
    const clientDate = req.query.clientDate || req.body.clientDate || null;

    const result = await DayflowScheduleService.finishDay(
      req.user.spaceId,
      {
        date: req.body.date
      },
      clientTime,
      clientDate
    );

    return ApiResponse.success(res, 'Day finished and locked successfully', result);
  }

  /**
   * GET /api/dayflow/calendar
   * Retrieves high-level status for calendar range.
   */
  static async getCalendarOverview(req, res) {
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const startDate = req.query.startDate || defaultStart;
    const endDate = req.query.endDate || defaultEnd;

    const overview = await DayflowScheduleService.getCalendarOverview(req.user.spaceId, {
      startDate,
      endDate
    });

    return ApiResponse.success(res, 'Calendar overview retrieved successfully', overview);
  }

  /**
   * GET /api/dayflow/analytics
   * Computes accurate performance analytics based on actual database records.
   */
  static async getAnalytics(req, res) {
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const date = req.query.date || null;

    const analytics = await DayflowScheduleService.getAnalytics(req.user.spaceId, {
      startDate,
      endDate,
      date
    });

    return ApiResponse.success(res, 'Analytics retrieved successfully', analytics);
  }
}
