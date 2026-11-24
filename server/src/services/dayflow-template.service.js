import mongoose from 'mongoose';
import { DayflowTemplate } from '../models/dayflow-template.model.js';
import { AppError } from '../utils/app-error.js';
import { validateBlockTimeRanges } from '../validators/dayflow.validator.js';

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatTemplate(doc) {
  if (!doc) return null;
  const json = doc.toJSON ? doc.toJSON() : doc;
  return {
    id: json.id || (json._id ? json._id.toString() : undefined),
    spaceId: json.spaceId,
    name: json.name,
    description: json.description || '',
    blocks: (json.blocks || []).map((b, idx) => ({
      id: b.id || (b._id ? b._id.toString() : `block-${idx}`),
      name: b.name,
      startTime: b.startTime,
      endTime: b.endTime,
      description: b.description || '',
      notes: b.notes || '',
      order: typeof b.order === 'number' ? b.order : idx,
      tasksRequired: Boolean(b.tasksRequired)
    })),
    createdAt: json.createdAt,
    updatedAt: json.updatedAt
  };
}

export class DayflowTemplateService {
  /**
   * Retrieves all templates scoped to the authenticated user's Space.
   */
  static async getTemplates(spaceId) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const docs = await DayflowTemplate.find({ spaceId: spaceObjectId }).sort({ createdAt: -1 });
    return docs.map(formatTemplate);
  }

  /**
   * Retrieves a single template by ID scoped to the user's Space.
   */
  static async getTemplateById(spaceId, templateId) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const templateObjectId = new mongoose.Types.ObjectId(templateId);

    const doc = await DayflowTemplate.findOne({
      _id: templateObjectId,
      spaceId: spaceObjectId
    });

    if (!doc) {
      throw AppError.notFound('Template not found in your Space');
    }

    return formatTemplate(doc);
  }

  /**
   * Creates a new Dayflow template from scratch.
   * Enforces Space scoping and prevents duplicate template names.
   */
  static async createTemplate(spaceId, { name, description = '', blocks = [] }) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const trimmedName = name.trim();

    // Check duplicate name within the same Space
    const existing = await DayflowTemplate.findOne({
      spaceId: spaceObjectId,
      name: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i')
    });

    if (existing) {
      throw AppError.conflict(`A template named "${trimmedName}" already exists in your Space`);
    }

    // Validate block timings and overlaps
    if (blocks && blocks.length > 0) {
      if (!validateBlockTimeRanges(blocks)) {
        throw AppError.badRequest('Time blocks cannot overlap and start time must be before end time');
      }
    }

    // Ensure order sequence
    const normalizedBlocks = blocks.map((b, idx) => ({
      name: b.name.trim(),
      startTime: b.startTime.trim(),
      endTime: b.endTime.trim(),
      description: (b.description || '').trim(),
      notes: (b.notes || '').trim(),
      order: typeof b.order === 'number' ? b.order : idx,
      tasksRequired: Boolean(b.tasksRequired)
    }));

    const template = await DayflowTemplate.create({
      spaceId: spaceObjectId,
      name: trimmedName,
      description: description.trim(),
      blocks: normalizedBlocks
    });

    return formatTemplate(template);
  }

  /**
   * Updates an existing Dayflow template.
   * Does NOT alter any previously applied daily schedules.
   */
  static async updateTemplate(spaceId, templateId, { name, description, blocks }) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const templateObjectId = new mongoose.Types.ObjectId(templateId);

    const template = await DayflowTemplate.findOne({
      _id: templateObjectId,
      spaceId: spaceObjectId
    });

    if (!template) {
      throw AppError.notFound('Template not found in your Space');
    }

    if (typeof name === 'string') {
      const trimmedName = name.trim();
      if (trimmedName.toLowerCase() !== template.name.toLowerCase()) {
        const existing = await DayflowTemplate.findOne({
          spaceId: spaceObjectId,
          name: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i'),
          _id: { $ne: templateObjectId }
        });
        if (existing) {
          throw AppError.conflict(`A template named "${trimmedName}" already exists in your Space`);
        }
      }
      template.name = trimmedName;
    }

    if (typeof description === 'string') {
      template.description = description.trim();
    }

    if (Array.isArray(blocks)) {
      if (!validateBlockTimeRanges(blocks)) {
        throw AppError.badRequest('Time blocks cannot overlap and start time must be before end time');
      }

      template.blocks = blocks.map((b, idx) => ({
        _id: b.id || b._id || new mongoose.Types.ObjectId(),
        name: b.name.trim(),
        startTime: b.startTime.trim(),
        endTime: b.endTime.trim(),
        description: (b.description || '').trim(),
        notes: (b.notes || '').trim(),
        order: typeof b.order === 'number' ? b.order : idx,
        tasksRequired: Boolean(b.tasksRequired)
      }));
    }

    await template.save();
    return formatTemplate(template);
  }

  /**
   * Deletes a template from the user's Space.
   * Existing daily schedules created from this template remain preserved with snapshot data.
   */
  static async deleteTemplate(spaceId, templateId) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const templateObjectId = new mongoose.Types.ObjectId(templateId);

    const template = await DayflowTemplate.findOneAndDelete({
      _id: templateObjectId,
      spaceId: spaceObjectId
    });

    if (!template) {
      throw AppError.notFound('Template not found in your Space');
    }

    return { id: templateId, message: `Template "${template.name}" deleted successfully` };
  }
}
