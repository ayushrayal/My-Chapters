import mongoose from 'mongoose';
import { SomedayCategory } from '../models/someday-category.model.js';
import { SomedayItem } from '../models/someday-item.model.js';
import { Space } from '../models/space.model.js';
import { SOMEDAY_SYSTEM_CATEGORY } from '../constants/someday.js';
import { AppError } from '../utils/app-error.js';

export class SomedayCategoryService {
  /**
   * Ensures the predefined 'Other' system category exists for a given Space.
   * Idempotent: safe to run multiple times without creating duplicates.
   *
   * @param {string|mongoose.Types.ObjectId} spaceId
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<import('mongoose').Document>}
   */
  static async ensureOtherCategory(spaceId, session = null) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    // Look for existing Other category in this Space
    let otherCategory = await SomedayCategory.findOne({
      spaceId: spaceObjectId,
      nameNormalized: SOMEDAY_SYSTEM_CATEGORY.NAME_NORMALIZED
    }).session(session);

    if (otherCategory) {
      if (!otherCategory.isSystem) {
        otherCategory.isSystem = true;
        await otherCategory.save({ session });
      }
      return otherCategory;
    }

    // Create system Other category
    const newCategory = new SomedayCategory({
      spaceId: spaceObjectId,
      name: SOMEDAY_SYSTEM_CATEGORY.NAME,
      nameNormalized: SOMEDAY_SYSTEM_CATEGORY.NAME_NORMALIZED,
      isSystem: true
    });

    await newCategory.save({ session });
    return newCategory;
  }

  /**
   * Migrates all existing Spaces in the database, ensuring each has an Other category.
   * Idempotent and safe to run repeatedly.
   *
   * @returns {Promise<{ totalSpaces: number, provisioned: number, alreadyPresent: number }>}
   */
  static async ensureOtherCategoriesForAllSpaces() {
    const spaces = await Space.find({}).select('_id name').lean();
    let provisioned = 0;
    let alreadyPresent = 0;

    for (const space of spaces) {
      const existing = await SomedayCategory.findOne({
        spaceId: space._id,
        nameNormalized: SOMEDAY_SYSTEM_CATEGORY.NAME_NORMALIZED
      });

      if (existing) {
        if (!existing.isSystem) {
          existing.isSystem = true;
          await existing.save();
        }
        alreadyPresent++;
      } else {
        await SomedayCategory.create({
          spaceId: space._id,
          name: SOMEDAY_SYSTEM_CATEGORY.NAME,
          nameNormalized: SOMEDAY_SYSTEM_CATEGORY.NAME_NORMALIZED,
          isSystem: true
        });
        provisioned++;
      }
    }

    return {
      totalSpaces: spaces.length,
      provisioned,
      alreadyPresent
    };
  }

  /**
   * Creates a new custom category within the authenticated user's Space.
   *
   * @param {object} params
   * @param {string|mongoose.Types.ObjectId} params.spaceId
   * @param {string} params.name
   * @returns {Promise<object>}
   */
  static async createCategory({ spaceId, name }) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const trimmedName = name.trim();
    const nameNormalized = trimmedName.toLowerCase();

    // Prevent duplicate Other categories
    if (nameNormalized === SOMEDAY_SYSTEM_CATEGORY.NAME_NORMALIZED) {
      throw AppError.conflict('A category with this name already exists in your Space');
    }

    // Check for existing category in the same Space
    const existing = await SomedayCategory.findOne({
      spaceId: spaceObjectId,
      nameNormalized
    }).lean();

    if (existing) {
      throw AppError.conflict('A category with this name already exists in your Space');
    }

    const category = await SomedayCategory.create({
      spaceId: spaceObjectId,
      name: trimmedName,
      nameNormalized,
      isSystem: false
    });

    return {
      id: category._id.toString(),
      spaceId: category.spaceId.toString(),
      name: category.name,
      nameNormalized: category.nameNormalized,
      isSystem: category.isSystem,
      itemCount: 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
  }

  /**
   * Retrieves all categories for the authenticated user's Space, including item counts.
   * Sorted consistently: custom categories alphabetically, followed by system 'Other'.
   *
   * @param {string|mongoose.Types.ObjectId} spaceId
   * @returns {Promise<Array<object>>}
   */
  static async getCategories(spaceId) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    // Retrieve categories sorted: custom categories first (A-Z), system categories last
    const categories = await SomedayCategory.find({ spaceId: spaceObjectId })
      .sort({ isSystem: 1, name: 1 })
      .lean();

    // Compute item counts per category in this Space
    const itemCounts = await SomedayItem.aggregate([
      { $match: { spaceId: spaceObjectId } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } }
    ]);

    const countMap = new Map(itemCounts.map((c) => [c._id.toString(), c.count]));

    return categories.map((cat) => ({
      id: cat._id.toString(),
      spaceId: cat.spaceId.toString(),
      name: cat.name,
      nameNormalized: cat.nameNormalized,
      isSystem: cat.isSystem,
      itemCount: countMap.get(cat._id.toString()) || 0,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt
    }));
  }

  /**
   * Updates a category name within the authenticated user's Space.
   * System Other category cannot be renamed.
   *
   * @param {object} params
   * @param {string|mongoose.Types.ObjectId} params.spaceId
   * @param {string} params.categoryId
   * @param {string} params.name
   * @returns {Promise<object>}
   */
  static async updateCategory({ spaceId, categoryId, name }) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const categoryObjectId = new mongoose.Types.ObjectId(categoryId);

    const category = await SomedayCategory.findOne({
      _id: categoryObjectId,
      spaceId: spaceObjectId
    });

    if (!category) {
      throw AppError.notFound('Category not found');
    }

    if (category.isSystem) {
      throw AppError.badRequest('The system Other category cannot be renamed');
    }

    const trimmedName = name.trim();
    const nameNormalized = trimmedName.toLowerCase();

    if (nameNormalized === SOMEDAY_SYSTEM_CATEGORY.NAME_NORMALIZED) {
      throw AppError.badRequest('Cannot rename category to system category name');
    }

    // Check if new name collides with another category in the same Space
    if (nameNormalized !== category.nameNormalized) {
      const existing = await SomedayCategory.findOne({
        spaceId: spaceObjectId,
        nameNormalized,
        _id: { $ne: category._id }
      }).lean();

      if (existing) {
        throw AppError.conflict('A category with this name already exists in your Space');
      }

      category.name = trimmedName;
      category.nameNormalized = nameNormalized;
      await category.save();
    }

    // Compute current item count
    const itemCount = await SomedayItem.countDocuments({
      spaceId: spaceObjectId,
      categoryId: category._id
    });

    return {
      id: category._id.toString(),
      spaceId: category.spaceId.toString(),
      name: category.name,
      nameNormalized: category.nameNormalized,
      isSystem: category.isSystem,
      itemCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
  }

  /**
   * Deletes a normal category within the authenticated user's Space.
   * System Other category cannot be deleted.
   * All items belonging to the deleted category are atomically moved to the Space's Other category.
   *
   * @param {object} params
   * @param {string|mongoose.Types.ObjectId} params.spaceId
   * @param {string} params.categoryId
   * @returns {Promise<{ movedItems: number }>}
   */
  static async deleteCategory({ spaceId, categoryId }) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const categoryObjectId = new mongoose.Types.ObjectId(categoryId);

    // 1. Verify category ownership through spaceId
    const category = await SomedayCategory.findOne({
      _id: categoryObjectId,
      spaceId: spaceObjectId
    });

    if (!category) {
      throw AppError.notFound('Category not found');
    }

    // 2. Prevent deletion of system Other category
    if (category.isSystem) {
      throw AppError.badRequest('The system Other category cannot be deleted');
    }

    // 3. Find or ensure the predefined Other category in the same Space
    const otherCategory = await SomedayCategoryService.ensureOtherCategory(spaceObjectId);

    // 4. Move all items and delete the category atomically
    let movedItems = 0;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const updateResult = await SomedayItem.updateMany(
          {
            spaceId: spaceObjectId,
            categoryId: category._id
          },
          {
            $set: { categoryId: otherCategory._id }
          },
          { session }
        );

        movedItems = updateResult.modifiedCount;

        await SomedayCategory.deleteOne(
          {
            _id: category._id,
            spaceId: spaceObjectId
          },
          { session }
        );
      });
    } catch (txErr) {
      // Standalone MongoDB fallback for environments without replica set
      if (
        txErr.message &&
        txErr.message.includes('Transaction numbers are only allowed on a replica set member or mongos')
      ) {
        const updateResult = await SomedayItem.updateMany(
          {
            spaceId: spaceObjectId,
            categoryId: category._id
          },
          {
            $set: { categoryId: otherCategory._id }
          }
        );

        movedItems = updateResult.modifiedCount;

        await SomedayCategory.deleteOne({
          _id: category._id,
          spaceId: spaceObjectId
        });
      } else {
        throw txErr;
      }
    } finally {
      await session.endSession();
    }

    return { movedItems };
  }
}

