import mongoose from 'mongoose';

const somedayCategorySchema = new mongoose.Schema(
  {
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: [true, 'Space ID is required']
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [1, 'Category name cannot be empty'],
      maxlength: [60, 'Category name cannot exceed 60 characters']
    },
    nameNormalized: {
      type: String,
      required: [true, 'Normalized category name is required'],
      trim: true,
      lowercase: true
    },
    isSystem: {
      type: Boolean,
      default: false
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

// Keep nameNormalized in sync with name
somedayCategorySchema.pre('validate', function () {
  if (this.name) {
    this.nameNormalized = this.name.trim().toLowerCase();
  }
});

// Compound unique index ensuring category names are unique per Space
somedayCategorySchema.index({ spaceId: 1, nameNormalized: 1 }, { unique: true });

export const SomedayCategory = mongoose.model('SomedayCategory', somedayCategorySchema);

