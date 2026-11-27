import mongoose from 'mongoose';
import {
  GYM_DEFAULT_SETS_PER_EXERCISE,
  GYM_MEASUREMENT_TYPE,
  GYM_MEASUREMENT_TYPE_VALUES,
  GYM_EXERCISE_STATUS,
  GYM_EXERCISE_STATUS_VALUES
} from '../constants/gymflow.js';

const exercisePauseEventSchema = new mongoose.Schema(
  {
    pausedAt: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD']
    },
    resumedAt: {
      type: String,
      default: null,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD']
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Pause reason cannot exceed 500 characters'],
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Pause notes cannot exceed 500 characters'],
      default: ''
    }
  },
  { _id: true }
);

const templateExerciseSchema = new mongoose.Schema(
  {
    exerciseIdentityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
      index: true
    },
    name: {
      type: String,
      required: [true, 'Exercise name is required'],
      trim: true,
      maxlength: [100, 'Exercise name cannot exceed 100 characters']
    },
    targetBodyPart: {
      type: String,
      required: [true, 'Target body part is required'],
      trim: true,
      maxlength: [60, 'Body part name cannot exceed 60 characters']
    },
    measurementType: {
      type: String,
      enum: GYM_MEASUREMENT_TYPE_VALUES,
      default: GYM_MEASUREMENT_TYPE.WEIGHT_REPS
    },
    status: {
      type: String,
      enum: GYM_EXERCISE_STATUS_VALUES,
      default: GYM_EXERCISE_STATUS.ACTIVE
    },
    pauseHistory: {
      type: [exercisePauseEventSchema],
      default: []
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: ''
    },
    order: {
      type: Number,
      required: true,
      default: 0
    },
    plannedSets: {
      type: Number,
      required: true,
      default: GYM_DEFAULT_SETS_PER_EXERCISE,
      min: [1, 'Planned sets must be at least 1'],
      max: [20, 'Planned sets cannot exceed 20']
    }
  },
  { _id: true }
);

const templateBodyPartSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Body part name is required'],
      trim: true,
      maxlength: [60, 'Body part name cannot exceed 60 characters']
    },
    order: {
      type: Number,
      required: true,
      default: 0
    },
    exercises: {
      type: [templateExerciseSchema],
      default: []
    }
  },
  { _id: true }
);

const gymTemplateSchema = new mongoose.Schema(
  {
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: [true, 'Space ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      minlength: [1, 'Template name cannot be empty'],
      maxlength: [100, 'Template name cannot exceed 100 characters']
    },
    parentWorkoutName: {
      type: String,
      trim: true,
      maxlength: [100, 'Parent workout name cannot exceed 100 characters'],
      default: ''
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    bodyParts: {
      type: [templateBodyPartSchema],
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
        return ret;
      }
    }
  }
);

// Compound index for unique template name within a user space
gymTemplateSchema.index({ spaceId: 1, name: 1 }, { unique: true });
gymTemplateSchema.index({ spaceId: 1, parentWorkoutName: 1 });
gymTemplateSchema.index({ spaceId: 1, createdAt: -1 });

export const GymTemplate = mongoose.model('GymTemplate', gymTemplateSchema);
