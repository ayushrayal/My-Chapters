import { GymWeeklyScheduleService } from '../services/gym-weekly-schedule.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class GymWeeklyScheduleController {
  static getSpaceId(req) {
    return req.user.spaceId || req.user.activeSpaceId;
  }

  static async getSchedule(req, res) {
    const schedule = await GymWeeklyScheduleService.getSchedule(GymWeeklyScheduleController.getSpaceId(req));
    return ApiResponse.success(res, 'Weekly gym schedule retrieved successfully', { schedule });
  }

  static async updateSchedule(req, res) {
    const schedule = await GymWeeklyScheduleService.updateSchedule(GymWeeklyScheduleController.getSpaceId(req), req.body.days);
    return ApiResponse.success(res, 'Weekly gym schedule updated successfully', { schedule });
  }
}
