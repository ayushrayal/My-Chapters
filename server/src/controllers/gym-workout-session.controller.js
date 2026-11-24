import { GymWorkoutSessionService } from '../services/gym-workout-session.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class GymWorkoutSessionController {
  static getSpaceId(req) {
    return req.user.spaceId || req.user.activeSpaceId;
  }

  static async getSession(req, res) {
    const { date } = req.params;
    const result = await GymWorkoutSessionService.getSessionByDate(GymWorkoutSessionController.getSpaceId(req), date);
    return ApiResponse.success(res, 'Workout session retrieved successfully', result);
  }

  static async startSession(req, res) {
    const session = await GymWorkoutSessionService.startSession(GymWorkoutSessionController.getSpaceId(req), req.body);
    return ApiResponse.created(res, 'Workout session started successfully', { session });
  }

  static async updateSession(req, res) {
    const { date } = req.params;
    const session = await GymWorkoutSessionService.updateSession(GymWorkoutSessionController.getSpaceId(req), date, req.body);
    return ApiResponse.success(res, 'Workout session updated successfully', { session });
  }

  static async discardSession(req, res) {
    const { date } = req.params;
    const result = await GymWorkoutSessionService.discardSession(GymWorkoutSessionController.getSpaceId(req), date);
    return ApiResponse.success(res, 'Unfinished workout session discarded successfully', result);
  }

  static async finishSession(req, res) {
    const { date } = req.params;
    const { isFinished } = req.body;
    const session = await GymWorkoutSessionService.finishSession(GymWorkoutSessionController.getSpaceId(req), date, isFinished ?? true);
    return ApiResponse.success(res, isFinished ? 'Workout finished successfully' : 'Workout reopened for editing', { session });
  }

  static async setRestDay(req, res) {
    const { date } = req.params;
    const { reason } = req.body;
    const session = await GymWorkoutSessionService.setRestDay(GymWorkoutSessionController.getSpaceId(req), date, reason);
    return ApiResponse.success(res, 'Date marked as rest day', { session });
  }

  static async removeRestDay(req, res) {
    const { date } = req.params;
    const session = await GymWorkoutSessionService.removeRestDay(GymWorkoutSessionController.getSpaceId(req), date);
    return ApiResponse.success(res, 'Rest day removed', { session });
  }

  static async getComparisons(req, res) {
    const { date } = req.params;
    const exercises = req.body.exercises || [];
    const comparisons = await GymWorkoutSessionService.getPreviousExerciseComparisons(
      GymWorkoutSessionController.getSpaceId(req),
      date,
      exercises
    );
    return ApiResponse.success(res, 'Previous comparisons retrieved successfully', { comparisons });
  }
}
