import mongoose from 'mongoose';
import {
  GYM_SET_STATUS,
  GYM_SET_STATUS_VALUES,
  GYM_TREADMILL_STATUS,
  GYM_TREADMILL_STATUS_VALUES,
  GYM_DEFAULT_TREADMILL_MINUTES,
  GYM_MINIMUM_TREADMILL_MINUTES,
  GYM_MEASUREMENT_TYPE,
  GYM_MEASUREMENT_TYPE_VALUES
} from '../constants/gymflow.js';

const workoutSetSchema = new mongoose.Schema(
  {
    setNumber: {
      type: Number,
      required: true
    },
    weightKg: {
      type: Number,
      required: false,
      min: [0, 'Weight must be at least 0'],
      max: [1000, 'Weight cannot exceed 1000 kg'],
      default: 0
    },
    reps: {
      type: Number,
      required: false,
      min: [0, 'Reps must be at least 0'],
      max: [500, 'Reps cannot exceed 500'],
      default: 0
    },
    extraWeightKg: {
      type: Number,
      required: false,
      min: [0, 'Extra weight must be at least 0'],
      max: [500, 'Extra weight cannot exceed 500 kg'],
      default: 0
    },
    durationMinutes: {
      type: Number,
      required: false,
      min: [0, 'Duration cannot be negative'],
      max: [1440, 'Duration cannot exceed 1440 minutes'],
      default: 0
    },
    status: {
      type: String,
      required: true,
      enum: GYM_SET_STATUS_VALUES,
      default: GYM_SET_STATUS.INCOMPLETE
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [200, 'Set notes cannot exceed 200 characters'],
      default: ''
    }
  },
  { _id: true }
);

const sessionExerciseSchema = new mongoose.Schema(
  {
    originalExerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    name: {
      type: String,
      required: [true, 'Exercise name is required'],
      trim: true,
      maxlength: [100, 'Exercise name cannot exceed 100 characters']
    },
    targetBodyPart: {
      type: String,
      required: false,
      trim: true,
      maxlength: [60, 'Body part name cannot exceed 60 characters'],
      default: ''
    },
    measurementType: {
      type: String,
      enum: GYM_MEASUREMENT_TYPE_VALUES,
      default: GYM_MEASUREMENT_TYPE.WEIGHT_REPS
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
      default: 3,
      min: [1, 'Planned sets must be at least 1']
    },
    sets: {
      type: [workoutSetSchema],
      default: []
    }
  },
  { _id: true }
);

const sessionBodyPartSchema = new mongoose.Schema(
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
      type: [sessionExerciseSchema],
      default: []
    }
  },
  { _id: true }
);

const treadmillRecordSchema = new mongoose.Schema(
  {
    targetMinutes: {
      type: Number,
      required: true,
      default: GYM_DEFAULT_TREADMILL_MINUTES,
      min: [GYM_MINIMUM_TREADMILL_MINUTES, `Target duration must be at least ${GYM_MINIMUM_TREADMILL_MINUTES} minutes`]
    },
    actualMinutes: {
      type: Number,
      default: 0,
      min: [0, 'Actual duration cannot be negative']
    },
    caloriesBurned: {
      type: Number,
      default: 0,
      min: [0, 'Calories burned cannot be negative']
    },
    status: {
      type: String,
      required: true,
      enum: GYM_TREADMILL_STATUS_VALUES,
      default: GYM_TREADMILL_STATUS.PARTIAL
    },
    skippedReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
      default: ''
    }
  },
  { _id: false }
);

const scoreBreakdownSchema = new mongoose.Schema(
  {
    completionPoints: { type: Number, default: 0 },
    plannedSetsPoints: { type: Number, default: 0 },
    repsPoints: { type: Number, default: 0 },
    progressionPoints: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    explanation: { type: String, default: '' }
  },
  { _id: false }
);

const gymWorkoutSessionSchema = new mongoose.Schema(
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
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD']
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GymTemplate',
      default: null
    },
    templateName: {
      type: String,
      trim: true,
      default: ''
    },
    isRestDay: {
      type: Boolean,
      default: false
    },
    restDayReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rest day reason cannot exceed 500 characters'],
      default: ''
    },
    isFinished: {
      type: Boolean,
      default: false
    },
    finishedAt: {
      type: Date,
      default: null
    },
    bodyParts: {
      type: [sessionBodyPartSchema],
      default: []
    },
    treadmill: {
      type: treadmillRecordSchema,
      default: () => ({
        targetMinutes: GYM_DEFAULT_TREADMILL_MINUTES,
        actualMinutes: 0,
        caloriesBurned: 0,
        status: GYM_TREADMILL_STATUS.PARTIAL,
        skippedReason: ''
      })
    },
    scoreBreakdown: {
      type: scoreBreakdownSchema,
      default: () => ({
        completionPoints: 0,
        plannedSetsPoints: 0,
        repsPoints: 0,
        progressionPoints: 0,
        totalScore: 0,
        explanation: 'Workout in progress'
      })
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

// Enforce one workout session per Space per date
gymWorkoutSessionSchema.index({ spaceId: 1, date: 1 }, { unique: true });
gymWorkoutSessionSchema.index({ spaceId: 1, isRestDay: 1, date: 1 });
gymWorkoutSessionSchema.index({ spaceId: 1, isRestDay: 1, templateId: 1 });
gymWorkoutSessionSchema.index({ spaceId: 1, isRestDay: 1, templateName: 1 });

export const GymWorkoutSession = mongoose.model('GymWorkoutSession', gymWorkoutSessionSchema);
