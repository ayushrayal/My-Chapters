import { DashboardService } from '../services/dashboard.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class DashboardController {
  static async getOverview(req, res) {
    const spaceId = req.user.spaceId || req.user.activeSpaceId;
    const overview = await DashboardService.getOverview(spaceId, req.query);
    return ApiResponse.success(res, 'Dashboard overview retrieved successfully', overview);
  }
}
