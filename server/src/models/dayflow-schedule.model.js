import mongoose from 'mongoose';
import { DAYFLOW_TASK_STATUS, DAYFLOW_TASK_STATUS_VALUES } from '../constants/dayflow.js';

const dailyBlockSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Block name is required'],
      trim: true,
      maxlength: [100, 'Block name cannot exceed 100 characters']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be in HH:MM 24-hour format']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be in HH:MM 24-hour format']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Block description cannot exceed 500 characters'],
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Block notes cannot exceed 1000 characters'],
      default: ''
    },
    order: {
      type: Number,
      required: true,
      default: 0
    },
    tasksRequired: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const dailyTaskSchema = new mongoose.Schema(
  {
    blockId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Block ID is required']
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [1, 'Task title cannot be empty'],
      maxlength: [200, 'Task title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Task description cannot exceed 500 characters'],
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Task notes cannot exceed 1000 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: DAYFLOW_TASK_STATUS_VALUES,
        message: `Status must be one of: ${DAYFLOW_TASK_STATUS_VALUES.join(', ')}`
      },
      default: DAYFLOW_TASK_STATUS.UPCOMING
    },
    skippedReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Skipped reason cannot exceed 500 characters'],
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    skippedAt: {
      type: Date,
      default: null
    }
  },
  {
    _id: true,
    timestamps: true
  }
);

const dayflowScheduleSchema = new mongoose.Schema(
  {
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: [true, 'Space ID is required'],
      index: true
    },
    date: {
      type: String,
      required: [true, 'Date is required (YYYY-MM-DD)'],
      trim: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD']
    },
    isRestDay: {
      type: Boolean,
      default: false
    },
    isFinished: {
      type: Boolean,
      default: false
    },
    finishedAt: {
      type: Date,
      default: null
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DayflowTemplate',
      default: null
    },
    templateName: {
      type: String,
      trim: true,
      default: null
    },
    blocks: {
      type: [dailyBlockSchema],
      default: []
    },
    tasks: {
      type: [dailyTaskSchema],
      default: []
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
        if (ret.templateId && ret.templateId.toString) {
          ret.templateId = ret.templateId.toString();
        }
        if (Array.isArray(ret.blocks)) {
          ret.blocks = ret.blocks.map((b) => ({
            ...b,
            id: b._id ? b._id.toString() : b.id
          }));
        }
        if (Array.isArray(ret.tasks)) {
          ret.tasks = ret.tasks.map((t) => ({
            ...t,
            id: t._id ? t._id.toString() : t.id,
            blockId: t.blockId ? t.blockId.toString() : undefined
          }));
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Unique compound index: One schedule per date per Space
dayflowScheduleSchema.index({ spaceId: 1, date: 1 }, { unique: true });
dayflowScheduleSchema.index({ spaceId: 1, isFinished: 1 });
dayflowScheduleSchema.index({ spaceId: 1, templateName: 1 });

export const DayflowSchedule = mongoose.model('DayflowSchedule', dayflowScheduleSchema);
