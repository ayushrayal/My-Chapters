import { GymAnalyticsService } from '../services/gym-analytics.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class GymAnalyticsController {
  static async getAnalytics(req, res) {
    const spaceId = req.user.spaceId || req.user.activeSpaceId;
    const analytics = await GymAnalyticsService.getAnalytics(spaceId, req.query);
    return ApiResponse.success(res, 'Gym analytics retrieved successfully', { analytics });
  }
}
