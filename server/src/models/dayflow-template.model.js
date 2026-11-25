import mongoose from 'mongoose';

const templateBlockSchema = new mongoose.Schema(
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

const dayflowTemplateSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Template description cannot exceed 500 characters'],
      default: ''
    },
    blocks: {
      type: [templateBlockSchema],
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
        if (Array.isArray(ret.blocks)) {
          ret.blocks = ret.blocks.map((b) => ({
            ...b,
            id: b._id ? b._id.toString() : b.id
          }));
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index for space scoping and performance
dayflowTemplateSchema.index({ spaceId: 1, name: 1 });
dayflowTemplateSchema.index({ spaceId: 1, createdAt: -1 });

export const DayflowTemplate = mongoose.model('DayflowTemplate', dayflowTemplateSchema);
