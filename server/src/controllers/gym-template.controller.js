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

  static async deleteTemplate(req, res) {
    const template = await GymTemplateService.deleteTemplate(GymTemplateController.getSpaceId(req), req.params.id);
    return ApiResponse.success(res, 'Workout template deleted successfully', { template });
  }
}
