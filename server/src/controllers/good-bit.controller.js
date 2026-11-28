import { GoodBitService } from '../services/good-bit.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class GoodBitController {
  /**
   * POST /api/goodbits
   * Create a new GoodBit entry in the authenticated user's Space.
   */
  static async createEntry(req, res) {
    const entry = await GoodBitService.createEntry({
      spaceId: req.user.spaceId,
      userId: req.user.id,
      date: req.body.date,
      title: req.body.title,
      description: req.body.description
    });

    return ApiResponse.created(res, 'Good Bit saved successfully', entry);
  }

  /**
   * GET /api/goodbits/month
   * Retrieve all entries and day counts for a given month.
   */
  static async getEntriesByMonth(req, res) {
    const result = await GoodBitService.getEntriesByMonth({
      spaceId: req.user.spaceId,
      monthKey: req.query.monthKey,
      year: req.query.year,
      month: req.query.month
    });

    return ApiResponse.success(res, 'Month entries retrieved successfully', result);
  }

  /**
   * GET /api/goodbits/date/:date
   * Retrieve all entries for a specific calendar date.
   */
  static async getEntriesByDate(req, res) {
    const result = await GoodBitService.getEntriesByDate({
      spaceId: req.user.spaceId,
      date: req.params.date
    });

    return ApiResponse.success(res, 'Date entries retrieved successfully', result);
  }

  /**
   * GET /api/goodbits/memories
   * Retrieve historical memories matching day-of-month for a target date.
   */
  static async getHistoricalMemories(req, res) {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    const result = await GoodBitService.getHistoricalMemories({
      spaceId: req.user.spaceId,
      targetDate
    });

    return ApiResponse.success(res, 'Historical memories retrieved successfully', result);
  }

  /**
   * PATCH /api/goodbits/:id
   * Update an existing entry.
   */
  static async updateEntry(req, res) {
    const entry = await GoodBitService.updateEntry({
      spaceId: req.user.spaceId,
      goodBitId: req.params.id,
      title: req.body.title,
      description: req.body.description
    });

    return ApiResponse.success(res, 'Good Bit updated successfully', entry);
  }

  /**
   * DELETE /api/goodbits/:id
   * Delete an existing entry.
   */
  static async deleteEntry(req, res) {
    const result = await GoodBitService.deleteEntry({
      spaceId: req.user.spaceId,
      goodBitId: req.params.id
    });

    return ApiResponse.success(res, 'Good Bit deleted successfully', result);
  }
}
