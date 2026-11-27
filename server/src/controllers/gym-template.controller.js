import { GymTemplateService } from '../services/gym-template.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class GymTemplateController {
  static getSpaceId(req) {
    return req.user.spaceId || req.user.activeSpaceId;
  }

  static async getTemplates(req, res) {
    const templates = await GymTemplateService.getTemplates(GymTemplateController.getSpaceId(req));
    return ApiResponse.success(res, 'Workout templates retrieved successfully', { templates });
  }

  static async getParentWorkouts(req, res) {
    const parents = await GymTemplateService.getParentWorkouts(GymTemplateController.getSpaceId(req));
    return ApiResponse.success(res, 'Parent workouts retrieved successfully', { parents });
  }

  static async getTemplateById(req, res) {
    const template = await GymTemplateService.getTemplateById(GymTemplateController.getSpaceId(req), req.params.id);
    return ApiResponse.success(res, 'Workout template retrieved successfully', { template });
  }

  static async createTemplate(req, res) {
    const template = await GymTemplateService.createTemplate(GymTemplateController.getSpaceId(req), req.body);
    return ApiResponse.created(res, 'Workout template created successfully', { template });
  }

  static async updateTemplate(req, res) {
    const template = await GymTemplateService.updateTemplate(GymTemplateController.getSpaceId(req), req.params.id, req.body);
    return ApiResponse.success(res, 'Workout template updated successfully', { template });
  }

  static async pauseExercise(req, res) {
    const { id, exerciseId } = req.params;
    const { reason, notes, date } = req.body;
    const template = await GymTemplateService.pauseExercise(
      GymTemplateController.getSpaceId(req),
      id,
      exerciseId,
      { reason, notes, date }
    );
    return ApiResponse.success(res, 'Exercise paused successfully', { template });
  }

  static async resumeExercise(req, res) {
    const { id, exerciseId } = req.params;
    const { date } = req.body;
    const template = await GymTemplateService.resumeExercise(
      GymTemplateController.getSpaceId(req),
      id,
      exerciseId,
      { date }
    );
    return ApiResponse.success(res, 'Exercise resumed successfully', { template });
  }

  static async deleteTemplate(req, res) {
    const template = await GymTemplateService.deleteTemplate(GymTemplateController.getSpaceId(req), req.params.id);
    return ApiResponse.success(res, 'Workout template deleted successfully', { template });
  }
}
