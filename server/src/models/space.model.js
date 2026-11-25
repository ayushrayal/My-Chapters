import mongoose from 'mongoose';
import { authCache } from '../utils/auth-cache.js';

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

// Auto-invalidate space cache whenever a Space record is modified or deleted
spaceSchema.post('findOneAndUpdate', function (doc) {
  if (doc && doc._id) {
    authCache.invalidateSpace(doc._id.toString());
  } else {
    const filter = this.getQuery ? this.getQuery() : null;
    if (filter && (filter._id || filter.id)) {
      authCache.invalidateSpace(filter._id || filter.id);
    }
  }
});

spaceSchema.post('findOneAndDelete', function (doc) {
  if (doc && doc._id) {
    authCache.invalidateSpace(doc._id.toString());
  } else {
    const filter = this.getQuery ? this.getQuery() : null;
    if (filter && (filter._id || filter.id)) {
      authCache.invalidateSpace(filter._id || filter.id);
    }
  }
});

spaceSchema.post('save', function (doc) {
  if (doc && doc._id) {
    authCache.invalidateSpace(doc._id.toString());
  }
});

export const Space = mongoose.model('Space', spaceSchema);
