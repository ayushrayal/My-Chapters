import { GoodBit } from '../models/good-bit.model.js';
import { AppError } from '../utils/app-error.js';

function padZero(n) {
  return String(n).padStart(2, '0');
}

/**
 * Checks if a day, month, year form a valid calendar date
 */
function isValidCalendarDate(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

export class GoodBitService {
  /**
   * Create a new GoodBit entry in the user's space.
   */
  static async createEntry({ spaceId, userId, date, title = '', description }) {
    if (!description || !description.trim()) {
      throw AppError.badRequest('Description cannot be empty');
    }

    const entry = await GoodBit.create({
      spaceId,
      userId,
      date,
      title: title?.trim() || '',
      description: description.trim()
    });

    return entry.toObject();
  }

  /**
   * Retrieve all entries for a given month (YYYY-MM).
   * Also computes day summaries ({ [date]: count }) for calendar dots and badges.
   */
  static async getEntriesByMonth({ spaceId, monthKey, year, month }) {
    let targetMonthKey = monthKey;

    if (!targetMonthKey && year && month) {
      targetMonthKey = `${year}-${padZero(month)}`;
    }

    if (!targetMonthKey) {
      const now = new Date();
      targetMonthKey = `${now.getFullYear()}-${padZero(now.getMonth() + 1)}`;
    }

    const [y, m] = targetMonthKey.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const startDate = `${targetMonthKey}-01`;
    const endDate = `${targetMonthKey}-${padZero(daysInMonth)}`;

    const entries = await GoodBit.find({
      spaceId,
      date: { $gte: startDate, $lte: endDate }
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // Compute day counts
    const dayCounts = {};
    for (const entry of entries) {
      dayCounts[entry.date] = (dayCounts[entry.date] || 0) + 1;
    }

    return {
      monthKey: targetMonthKey,
      entries,
      dayCounts,
      totalCount: entries.length
    };
  }

  /**
   * Retrieve all entries for a specific calendar date (YYYY-MM-DD).
   */
  static async getEntriesByDate({ spaceId, date }) {
    const entries = await GoodBit.find({
      spaceId,
      date
    })
      .sort({ createdAt: 1 })
      .lean();

    return {
      date,
      entries,
      totalCount: entries.length
    };
  }

  /**
   * Retrieve historical memories matching the day-of-month across past months and years.
   * Target date: YYYY-MM-DD
   * Looks up memories matching the same day in previous months and years (strictly before targetDate).
   * Safely handles leap years and variable month lengths (e.g. Feb 29 or 31st).
   */
  static async getHistoricalMemories({ spaceId, targetDate, lookbackYears = 10 }) {
    const [targetYear, targetMonth, targetDay] = targetDate.split('-').map(Number);

    const validHistoricalDates = [];

    // 1. Check previous months in the same year
    for (let m = 1; m < targetMonth; m++) {
      if (isValidCalendarDate(targetYear, m, targetDay)) {
        validHistoricalDates.push(`${targetYear}-${padZero(m)}-${padZero(targetDay)}`);
      }
    }

    // 2. Check all 12 months for previous years
    for (let y = targetYear - 1; y >= targetYear - lookbackYears; y--) {
      for (let m = 1; m <= 12; m++) {
        if (isValidCalendarDate(y, m, targetDay)) {
          const dateStr = `${y}-${padZero(m)}-${padZero(targetDay)}`;
          if (dateStr < targetDate) {
            validHistoricalDates.push(dateStr);
          }
        }
      }
    }

    if (validHistoricalDates.length === 0) {
      return {
        targetDate,
        memories: [],
        totalCount: 0
      };
    }

    // Query entries matching these exact valid historical dates
    const memories = await GoodBit.find({
      spaceId,
      date: { $in: validHistoricalDates }
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return {
      targetDate,
      memories,
      totalCount: memories.length
    };
  }

  /**
   * Update an existing GoodBit entry.
   */
  static async updateEntry({ spaceId, goodBitId, title, description }) {
    if (!description || !description.trim()) {
      throw AppError.badRequest('Description cannot be empty');
    }

    const entry = await GoodBit.findOne({
      _id: goodBitId,
      spaceId
    });

    if (!entry) {
      throw AppError.notFound('Good Bit entry not found');
    }

    if (typeof title !== 'undefined') {
      entry.title = title?.trim() || '';
    }

    entry.description = description.trim();
    await entry.save();

    return entry.toObject();
  }

  /**
   * Delete a GoodBit entry.
   */
  static async deleteEntry({ spaceId, goodBitId }) {
    const entry = await GoodBit.findOneAndDelete({
      _id: goodBitId,
      spaceId
    });

    if (!entry) {
      throw AppError.notFound('Good Bit entry not found');
    }

    return {
      id: entry._id,
      date: entry.date,
      deleted: true
    };
  }
}
