import { GymTemplate } from '../models/gym-template.model.js';
import { AppError } from '../utils/app-error.js';
import { GYM_DEFAULT_SETS_PER_EXERCISE } from '../constants/gymflow.js';

export class GymTemplateService {
  static async getTemplates(spaceId) {
    return GymTemplate.find({ spaceId }).sort({ createdAt: -1 });
  }

  static async getTemplateById(spaceId, templateId) {
    const template = await GymTemplate.findOne({ _id: templateId, spaceId });
    if (!template) {
      throw AppError.notFound('Workout template not found');
    }
    return template;
  }

  static async createTemplate(spaceId, data) {
    const existing = await GymTemplate.findOne({ spaceId, name: data.name.trim() });
    if (existing) {
      throw AppError.badRequest('A workout template with this name already exists');
    }

    // Process body parts and default 3 sets if not specified
    const formattedBodyParts = (data.bodyParts || []).map((bp, bpIdx) => ({
      name: bp.name.trim(),
      order: bp.order ?? bpIdx,
      exercises: (bp.exercises || []).map((ex, exIdx) => ({
        name: ex.name.trim(),
        targetBodyPart: bp.name.trim(),
        notes: ex.notes ? ex.notes.trim() : '',
        order: ex.order ?? exIdx,
        plannedSets: Number(ex.plannedSets) || GYM_DEFAULT_SETS_PER_EXERCISE
      }))
    }));

    const template = new GymTemplate({
      spaceId,
      name: data.name.trim(),
      description: data.description ? data.description.trim() : '',
      bodyParts: formattedBodyParts
    });

    return template.save();
  }

  static async updateTemplate(spaceId, templateId, data) {
    const template = await GymTemplate.findOne({ _id: templateId, spaceId });
    if (!template) {
      throw AppError.notFound('Workout template not found');
    }

    if (data.name && data.name.trim() !== template.name) {
      const existing = await GymTemplate.findOne({
        spaceId,
        name: data.name.trim(),
        _id: { $ne: templateId }
      });
      if (existing) {
        throw AppError.badRequest('A workout template with this name already exists');
      }
      template.name = data.name.trim();
    }

    if (data.description !== undefined) {
      template.description = data.description ? data.description.trim() : '';
    }

    if (Array.isArray(data.bodyParts)) {
      template.bodyParts = data.bodyParts.map((bp, bpIdx) => ({
        ...(bp._id ? { _id: bp._id } : {}),
        name: bp.name.trim(),
        order: bp.order ?? bpIdx,
        exercises: (bp.exercises || []).map((ex, exIdx) => ({
          ...(ex._id ? { _id: ex._id } : {}),
          name: ex.name.trim(),
          targetBodyPart: bp.name.trim(),
          notes: ex.notes ? ex.notes.trim() : '',
          order: ex.order ?? exIdx,
          plannedSets: Number(ex.plannedSets) || GYM_DEFAULT_SETS_PER_EXERCISE
        }))
      }));
    }

    return template.save();
  }

  static async deleteTemplate(spaceId, templateId) {
    const template = await GymTemplate.findOneAndDelete({ _id: templateId, spaceId });
    if (!template) {
      throw AppError.notFound('Workout template not found');
    }
    return template;
  }
}
