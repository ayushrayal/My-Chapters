import { GymWeeklySchedule } from '../models/gym-weekly-schedule.model.js';
import { GymTemplate } from '../models/gym-template.model.js';
import { WEEKDAY_VALUES } from '../constants/gymflow.js';
import { AppError } from '../utils/app-error.js';

export class GymWeeklyScheduleService {
  static async getSchedule(spaceId) {
    let schedule = await GymWeeklySchedule.findOne({ spaceId }).populate('days.templateId');
    if (!schedule) {
      schedule = await GymWeeklySchedule.create({
        spaceId,
        days: WEEKDAY_VALUES.map((weekday) => ({
          weekday,
          templateId: null,
          isRestDay: weekday === 'Sunday'
        }))
      });
    }
    return schedule;
  }

  static async updateSchedule(spaceId, daysData) {
    if (!Array.isArray(daysData)) {
      throw AppError.badRequest('Days data must be an array');
    }

    // Verify any referenced templates belong to the space
    for (const d of daysData) {
      if (d.templateId) {
        const tpl = await GymTemplate.findOne({ _id: d.templateId, spaceId });
        if (!tpl) {
          throw AppError.badRequest(`Template ${d.templateId} not found in user space`);
        }
      }
    }

    let schedule = await GymWeeklySchedule.findOne({ spaceId });
    if (!schedule) {
      schedule = new GymWeeklySchedule({ spaceId, days: [] });
    }

    // Merge or set day configuration
    const map = new Map((schedule.days || []).map((d) => [d.weekday, d]));

    for (const d of daysData) {
      if (WEEKDAY_VALUES.includes(d.weekday)) {
        map.set(d.weekday, {
          weekday: d.weekday,
          templateId: d.isRestDay ? null : d.templateId || null,
          isRestDay: Boolean(d.isRestDay)
        });
      }
    }

    schedule.days = WEEKDAY_VALUES.map((w) => map.get(w) || { weekday: w, templateId: null, isRestDay: w === 'Sunday' });
    await schedule.save();

    return GymWeeklySchedule.findOne({ spaceId }).populate('days.templateId');
  }
}
