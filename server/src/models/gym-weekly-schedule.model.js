import mongoose from 'mongoose';
import { WEEKDAY_VALUES } from '../constants/gymflow.js';

const weeklyDayScheduleSchema = new mongoose.Schema(
  {
    weekday: {
      type: String,
      required: true,
      enum: WEEKDAY_VALUES
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GymTemplate',
      default: null
    },
    isRestDay: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const gymWeeklyScheduleSchema = new mongoose.Schema(
  {
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: [true, 'Space ID is required'],
      unique: true,
      index: true
    },
    days: {
      type: [weeklyDayScheduleSchema],
      default: () =>
        WEEKDAY_VALUES.map((weekday) => ({
          weekday,
          templateId: null,
          isRestDay: weekday === 'Sunday'
        }))
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        if (ret.spaceId && ret.spaceId.toString) {
          ret.spaceId = ret.spaceId.toString();
        }
        return ret;
      }
    }
  }
);

export const GymWeeklySchedule = mongoose.model('GymWeeklySchedule', gymWeeklyScheduleSchema);
