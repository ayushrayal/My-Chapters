import mongoose from 'mongoose';
import { SOMEDAY_STATUS, SOMEDAY_STATUS_VALUES } from '../constants/someday.js';

const linkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: [100, 'Link label cannot exceed 100 characters'],
      default: ''
    },
    url: {
      type: String,
      required: [true, 'Link URL is required'],
      trim: true,
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+/i.test(v);
        },
        message: 'URL must begin with http:// or https://'
      }
    }
  },
  { _id: false }
);

const somedayItemSchema = new mongoose.Schema(
  {
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: [true, 'Space ID is required']
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SomedayCategory',
      required: [true, 'Category ID is required']
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      minlength: [1, 'Item name cannot be empty'],
      maxlength: [120, 'Item name cannot exceed 120 characters']
    },
    links: {
      type: [linkSchema],
      default: [],
      validate: {
        validator: function (v) {
          return !v || v.length <= 3;
        },
        message: 'An item cannot have more than 3 links'
      }
    },
    note: {
      type: String,
      trim: true,
      maxlength: [2000, 'Note cannot exceed 2000 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: SOMEDAY_STATUS_VALUES,
        message: 'Status must be either PLANNED or PURCHASED'
      },
      default: SOMEDAY_STATUS.PLANNED
    },
    purchaseDate: {
      type: Date,
      default: null
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
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for tenant isolation and query performance
somedayItemSchema.index({ spaceId: 1, categoryId: 1 });
somedayItemSchema.index({ spaceId: 1, status: 1 });
somedayItemSchema.index({ spaceId: 1, createdAt: -1 });

export const SomedayItem = mongoose.model('SomedayItem', somedayItemSchema);

