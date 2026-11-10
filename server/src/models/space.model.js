import mongoose from 'mongoose';

const spaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Space name is required'],
      trim: true,
      minlength: [2, 'Space name must be at least 2 characters long'],
      maxlength: [50, 'Space name cannot exceed 50 characters']
    },
    nameNormalized: {
      type: String,
      required: [true, 'Normalized Space name is required'],
      unique: true,
      trim: true,
      lowercase: true
    },
    slug: {
      type: String,
      required: [true, 'Space slug is required'],
      unique: true,
      trim: true,
      lowercase: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Space owner is required']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Owner index for fast lookups
spaceSchema.index({ owner: 1 });

export const Space = mongoose.model('Space', spaceSchema);
