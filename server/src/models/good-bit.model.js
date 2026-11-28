import mongoose from 'mongoose';

const goodBitSchema = new mongoose.Schema(
  {
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: [true, 'Space ID is required'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
      index: true
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: ''
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [1, 'Description cannot be empty'],
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimal query efficiency
goodBitSchema.index({ spaceId: 1, date: 1 });
goodBitSchema.index({ spaceId: 1, createdAt: -1 });

export const GoodBit = mongoose.model('GoodBit', goodBitSchema);
