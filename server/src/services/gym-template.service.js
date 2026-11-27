import mongoose from 'mongoose';
import { GymTemplate } from '../models/gym-template.model.js';
import { AppError } from '../utils/app-error.js';
import { GYM_DEFAULT_SETS_PER_EXERCISE, GYM_EXERCISE_STATUS } from '../constants/gymflow.js';

export class GymTemplateService {
  static async getTemplates(spaceId) {
    const templates = await GymTemplate.find({ spaceId }).sort({ createdAt: -1 }).lean();
    return templates.map((t) => ({
      ...t,
      id: t._id.toString(),
      parentWorkoutName: t.parentWorkoutName || t.name
    }));
  }

  static async getParentWorkouts(spaceId) {
    const templates = await GymTemplate.find({ spaceId }).sort({ createdAt: -1 }).lean();
    const parentMap = new Map();

    for (const t of templates) {
      const parentName = (t.parentWorkoutName && t.parentWorkoutName.trim()) || t.name;
      if (!parentMap.has(parentName)) {
        parentMap.set(parentName, {
          parentWorkoutName: parentName,
          variations: []
        });
      }

      let exerciseCount = 0;
      (t.bodyParts || []).forEach((bp) => {
        exerciseCount += bp.exercises?.length || 0;
      });

      parentMap.get(parentName).variations.push({
        id: t._id.toString(),
        name: t.name,
        description: t.description || '',
        bodyPartsCount: t.bodyParts?.length || 0,
        exercisesCount: exerciseCount
      });
    }

    return Array.from(parentMap.values());
  }

  static async getTemplateById(spaceId, templateId) {
    const template = await GymTemplate.findOne({ _id: templateId, spaceId }).lean();
    if (!template) {
      throw AppError.notFound('Workout template not found');
    }
    return {
      ...template,
      id: template._id.toString(),
      parentWorkoutName: template.parentWorkoutName || template.name
    };
  }

  static async createTemplate(spaceId, data) {
    const existing = await GymTemplate.findOne({ spaceId, name: data.name.trim() });
    if (existing) {
      throw AppError.badRequest('A workout template with this name already exists');
    }

    const parentWorkoutName = data.parentWorkoutName ? data.parentWorkoutName.trim() : data.name.trim();

    // Process body parts and default 3 sets if not specified
    const formattedBodyParts = (data.bodyParts || []).map((bp, bpIdx) => ({
      name: bp.name.trim(),
      order: bp.order ?? bpIdx,
      exercises: (bp.exercises || []).map((ex, exIdx) => ({
        exerciseIdentityId: ex.exerciseIdentityId || new mongoose.Types.ObjectId(),
        name: ex.name.trim(),
        targetBodyPart: bp.name.trim(),
        measurementType: ex.measurementType || 'WEIGHT_REPS',
        status: ex.status || GYM_EXERCISE_STATUS.ACTIVE,
        pauseHistory: Array.isArray(ex.pauseHistory) ? ex.pauseHistory : [],
        notes: ex.notes ? ex.notes.trim() : '',
        order: ex.order ?? exIdx,
        plannedSets: Number(ex.plannedSets) || GYM_DEFAULT_SETS_PER_EXERCISE
      }))
    }));

    const template = new GymTemplate({
      spaceId,
      name: data.name.trim(),
      parentWorkoutName,
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

    if (data.parentWorkoutName !== undefined) {
      template.parentWorkoutName = data.parentWorkoutName.trim() || template.name;
    }

    if (data.description !== undefined) {
      template.description = data.description ? data.description.trim() : '';
    }

    if (Array.isArray(data.bodyParts)) {
      // Build a lookup map of existing exercises to preserve exerciseIdentityId and pauseHistory across renames
      const existingExMap = new Map();
      (template.bodyParts || []).forEach((bp) => {
        (bp.exercises || []).forEach((ex) => {
          if (ex._id) existingExMap.set(ex._id.toString(), ex);
          if (ex.exerciseIdentityId) existingExMap.set(ex.exerciseIdentityId.toString(), ex);
        });
      });

      template.bodyParts = data.bodyParts.map((bp, bpIdx) => ({
        ...(bp._id ? { _id: bp._id } : {}),
        name: bp.name.trim(),
        order: bp.order ?? bpIdx,
        exercises: (bp.exercises || []).map((ex, exIdx) => {
          const exKey = ex._id?.toString() || ex.exerciseIdentityId?.toString();
          const existingEx = exKey ? existingExMap.get(exKey) : null;

          return {
            ...(ex._id ? { _id: ex._id } : {}),
            exerciseIdentityId:
              existingEx?.exerciseIdentityId || ex.exerciseIdentityId || new mongoose.Types.ObjectId(),
            name: ex.name.trim(),
            targetBodyPart: bp.name.trim(),
            measurementType: ex.measurementType || existingEx?.measurementType || 'WEIGHT_REPS',
            status: ex.status || existingEx?.status || GYM_EXERCISE_STATUS.ACTIVE,
            pauseHistory: Array.isArray(ex.pauseHistory)
              ? ex.pauseHistory
              : existingEx?.pauseHistory || [],
            notes: ex.notes !== undefined ? ex.notes.trim() : existingEx?.notes || '',
            order: ex.order ?? exIdx,
            plannedSets: Number(ex.plannedSets) || existingEx?.plannedSets || GYM_DEFAULT_SETS_PER_EXERCISE
          };
        })
      }));
    }

    return template.save();
  }

  static async pauseExercise(spaceId, templateId, exerciseId, { reason, notes = '', date }) {
    if (!reason || !reason.trim()) {
      throw AppError.badRequest('A reason is required when pausing an exercise');
    }

    const template = await GymTemplate.findOne({ _id: templateId, spaceId });
    if (!template) {
      throw AppError.notFound('Workout template not found');
    }

    let targetExercise = null;
    for (const bp of template.bodyParts || []) {
      for (const ex of bp.exercises || []) {
        if (
          ex._id?.toString() === exerciseId?.toString() ||
          ex.exerciseIdentityId?.toString() === exerciseId?.toString()
        ) {
          targetExercise = ex;
          break;
        }
      }
      if (targetExercise) break;
    }

    if (!targetExercise) {
      throw AppError.notFound('Exercise not found in template');
    }

    if (targetExercise.status === GYM_EXERCISE_STATUS.PAUSED) {
      throw AppError.badRequest('Exercise is already paused');
    }

    const pauseDate = date || new Date().toISOString().split('T')[0];
    targetExercise.status = GYM_EXERCISE_STATUS.PAUSED;
    targetExercise.pauseHistory = targetExercise.pauseHistory || [];
    targetExercise.pauseHistory.push({
      pausedAt: pauseDate,
      resumedAt: null,
      reason: reason.trim(),
      notes: notes.trim()
    });

    return template.save();
  }

  static async resumeExercise(spaceId, templateId, exerciseId, { date }) {
    const template = await GymTemplate.findOne({ _id: templateId, spaceId });
    if (!template) {
      throw AppError.notFound('Workout template not found');
    }

    let targetExercise = null;
    for (const bp of template.bodyParts || []) {
      for (const ex of bp.exercises || []) {
        if (
          ex._id?.toString() === exerciseId?.toString() ||
          ex.exerciseIdentityId?.toString() === exerciseId?.toString()
        ) {
          targetExercise = ex;
          break;
        }
      }
      if (targetExercise) break;
    }

    if (!targetExercise) {
      throw AppError.notFound('Exercise not found in template');
    }

    if (targetExercise.status === GYM_EXERCISE_STATUS.ACTIVE) {
      throw AppError.badRequest('Exercise is not paused');
    }

    const resumeDate = date || new Date().toISOString().split('T')[0];
    targetExercise.status = GYM_EXERCISE_STATUS.ACTIVE;

    // Close the latest open pause record
    if (Array.isArray(targetExercise.pauseHistory) && targetExercise.pauseHistory.length > 0) {
      const lastPause = targetExercise.pauseHistory[targetExercise.pauseHistory.length - 1];
      if (!lastPause.resumedAt) {
        lastPause.resumedAt = resumeDate;
      }
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
