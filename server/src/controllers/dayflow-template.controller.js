import { DayflowTemplateService } from '../services/dayflow-template.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class DayflowTemplateController {
  /**
   * GET /api/dayflow/templates
   * Retrieves all templates for the authenticated user's Space.
   */
  static async getTemplates(req, res) {
    const templates = await DayflowTemplateService.getTemplates(req.user.spaceId);
    return ApiResponse.success(res, 'Templates retrieved successfully', templates);
  }

  /**
   * GET /api/dayflow/templates/:id
   * Retrieves a single template by ID.
   */
  static async getTemplateById(req, res) {
    const template = await DayflowTemplateService.getTemplateById(req.user.spaceId, req.params.id);
    return ApiResponse.success(res, 'Template retrieved successfully', template);
  }

  /**
   * POST /api/dayflow/templates
   * Creates a new user template.
   */
  static async createTemplate(req, res) {
    const template = await DayflowTemplateService.createTemplate(req.user.spaceId, {
      name: req.body.name,
      description: req.body.description,
      blocks: req.body.blocks
    });
    return ApiResponse.created(res, 'Template created successfully', template);
  }

  /**
   * PUT /api/dayflow/templates/:id
   * Updates an existing template.
   */
  static async updateTemplate(req, res) {
    const template = await DayflowTemplateService.updateTemplate(
      req.user.spaceId,
      req.params.id,
      {
        name: req.body.name,
        description: req.body.description,
        blocks: req.body.blocks
      }
    );
    return ApiResponse.success(res, 'Template updated successfully', template);
  }

  /**
   * DELETE /api/dayflow/templates/:id
   * Deletes a template.
   */
  static async deleteTemplate(req, res) {
    const result = await DayflowTemplateService.deleteTemplate(req.user.spaceId, req.params.id);
    return ApiResponse.success(res, result.message, { id: result.id });
  }
}
