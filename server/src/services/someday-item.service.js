import mongoose from 'mongoose';
import { SomedayItem } from '../models/someday-item.model.js';
import { SomedayCategory } from '../models/someday-category.model.js';
import { SOMEDAY_STATUS } from '../constants/someday.js';
import { AppError } from '../utils/app-error.js';

function formatItem(doc) {
  if (!doc) return null;
  const id = doc._id ? doc._id.toString() : doc.id;
  const categoryDoc =
    doc.categoryId && typeof doc.categoryId === 'object' && (doc.categoryId._id || doc.categoryId.id)
      ? doc.categoryId
      : null;

  return {
    id,
    spaceId: doc.spaceId ? doc.spaceId.toString() : undefined,
    name: doc.name,
    category: categoryDoc
      ? {
          id: (categoryDoc._id || categoryDoc.id).toString(),
          name: categoryDoc.name,
          isSystem: Boolean(categoryDoc.isSystem)
        }
      : undefined,
    categoryId: categoryDoc
      ? (categoryDoc._id || categoryDoc.id).toString()
      : doc.categoryId
        ? doc.categoryId.toString()
        : undefined,
    links: (doc.links || []).map((l) => ({
      label: l.label || '',
      url: l.url
    })),
    note: doc.note || '',
    status: doc.status,
    purchaseDate: doc.purchaseDate || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

export class SomedayItemService {
  /**
   * Creates a new SomedayItem scoped strictly to the authenticated user's Space.
   *
   * @param {object} params
   * @param {string|mongoose.Types.ObjectId} params.spaceId
   * @param {string} params.name
   * @param {string} params.categoryId
   * @param {Array<{label?: string, url: string}>} [params.links]
   * @param {string} [params.note]
   * @param {string} [params.status]
   * @param {Date|string|null} [params.purchaseDate]
   * @returns {Promise<object>} Formatted item record with category details
   */
  static async createItem({
    spaceId,
    name,
    categoryId,
    links = [],
    note = '',
    status = SOMEDAY_STATUS.PLANNED,
    purchaseDate = null
  }) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const categoryObjectId = new mongoose.Types.ObjectId(categoryId);

    // Verify category exists and belongs to the user's Space
    const category = await SomedayCategory.findOne({
      _id: categoryObjectId,
      spaceId: spaceObjectId
    });

    if (!category) {
      throw AppError.badRequest('Category not found in your Space');
    }

    // Status and purchaseDate business logic
    let resolvedPurchaseDate = null;
    if (status === SOMEDAY_STATUS.PURCHASED) {
      resolvedPurchaseDate = purchaseDate ? new Date(purchaseDate) : new Date();
    }

    const item = await SomedayItem.create({
      spaceId: spaceObjectId,
      categoryId: category._id,
      name: name.trim(),
      links: links || [],
      note: note ? note.trim() : '',
      status,
      purchaseDate: resolvedPurchaseDate
    });

    const populated = await SomedayItem.findOne({
      _id: item._id,
      spaceId: spaceObjectId
    })
      .populate('categoryId', 'name isSystem')
      .lean();

    return formatItem(populated);
  }

  /**
   * Retrieves items belonging to the authenticated user's Space with optional category, status, and pagination filtering.
   *
   * @param {object} params
   * @param {string|mongoose.Types.ObjectId} params.spaceId
   * @param {string} [params.categoryId]
   * @param {string} [params.status]
   * @param {number} [params.page]
   * @param {number} [params.limit]
   * @returns {Promise<Array<object>>}
   */
  static async getItems({ spaceId, categoryId, status, page, limit }) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    const query = { spaceId: spaceObjectId };

    if (categoryId) {
      query.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    if (status) {
      query.status = status;
    }

    let cursor = SomedayItem.find(query)
      .populate('categoryId', 'name isSystem')
      .sort({ createdAt: -1 })
      .lean();

    if (limit && Number(limit) > 0) {
      const parsedLimit = Math.min(Number(limit), 200);
      const parsedPage = Math.max(Number(page) || 1, 1);
      cursor = cursor.skip((parsedPage - 1) * parsedLimit).limit(parsedLimit);
    }

    const items = await cursor;
    return items.map(formatItem);
  }

  /**
   * Retrieves high-performance aggregated item statistics scoped to user's Space.
   * Computes counts for total, planned, and purchased items in a single aggregation pipeline.
   *
   * @param {string|mongoose.Types.ObjectId} spaceId
   * @returns {Promise<{ total: number, planned: number, purchased: number }>}
   */
  static async getStats(spaceId) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);

    const results = await SomedayItem.aggregate([
      { $match: { spaceId: spaceObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    let planned = 0;
    let purchased = 0;

    for (const r of results) {
      if (r._id === SOMEDAY_STATUS.PLANNED) planned = r.count;
      if (r._id === SOMEDAY_STATUS.PURCHASED) purchased = r.count;
    }

    return {
      total: planned + purchased,
      planned,
      purchased
    };
  }

  /**
   * Retrieves a single item details scoped strictly to the authenticated user's Space.
   *
   * @param {object} params
   * @param {string|mongoose.Types.ObjectId} params.spaceId
   * @param {string} params.itemId
   * @returns {Promise<object>}
   */
  static async getItemById({ spaceId, itemId }) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const itemObjectId = new mongoose.Types.ObjectId(itemId);

    const item = await SomedayItem.findOne({
      _id: itemObjectId,
      spaceId: spaceObjectId
    })
      .populate('categoryId', 'name isSystem')
      .lean();

    if (!item) {
      throw AppError.notFound('Item not found');
    }

    return formatItem(item);
  }

  /**
   * Updates an item belonging to the authenticated user's Space.
   *
   * @param {object} params
   * @param {string|mongoose.Types.ObjectId} params.spaceId
   * @param {string} params.itemId
   * @param {object} params.payload
   * @returns {Promise<object>}
   */
  static async updateItem({ spaceId, itemId, payload }) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const itemObjectId = new mongoose.Types.ObjectId(itemId);

    const item = await SomedayItem.findOne({
      _id: itemObjectId,
      spaceId: spaceObjectId
    });

    if (!item) {
      throw AppError.notFound('Item not found');
    }

    // Category update validation
    if (payload.categoryId !== undefined) {
      const targetCategoryObjectId = new mongoose.Types.ObjectId(payload.categoryId);
      const targetCategory = await SomedayCategory.findOne({
        _id: targetCategoryObjectId,
        spaceId: spaceObjectId
      });

      if (!targetCategory) {
        throw AppError.badRequest('Target category not found in your Space');
      }

      item.categoryId = targetCategory._id;
    }

    // Name update
    if (payload.name !== undefined) {
      item.name = payload.name.trim();
    }

    // Links update
    if (payload.links !== undefined) {
      item.links = payload.links;
    }

    // Note update
    if (payload.note !== undefined) {
      item.note = payload.note ? payload.note.trim() : '';
    }

    // Status and purchaseDate updates
    const targetStatus = payload.status !== undefined ? payload.status : item.status;

    if (targetStatus === SOMEDAY_STATUS.PURCHASED) {
      if (payload.purchaseDate !== undefined) {
        // User explicitly set or cleared purchase date
        item.purchaseDate = payload.purchaseDate ? new Date(payload.purchaseDate) : null;
      } else if (!item.purchaseDate) {
        // Item transitioned to PURCHASED without explicit date; default to now
        item.purchaseDate = new Date();
      }
      // If item already had a purchaseDate and payload omitted purchaseDate, preserve it
    } else if (targetStatus === SOMEDAY_STATUS.PLANNED) {
      // Reverted to PLANNED; clear purchase date
      item.purchaseDate = null;
    }

    item.status = targetStatus;

    await item.save();

    const populated = await SomedayItem.findOne({
      _id: item._id,
      spaceId: spaceObjectId
    })
      .populate('categoryId', 'name isSystem')
      .lean();

    return formatItem(populated);
  }

  /**
   * Deletes an item belonging to the authenticated user's Space.
   *
   * @param {object} params
   * @param {string|mongoose.Types.ObjectId} params.spaceId
   * @param {string} params.itemId
   * @returns {Promise<boolean>}
   */
  static async deleteItem({ spaceId, itemId }) {
    const spaceObjectId = new mongoose.Types.ObjectId(spaceId);
    const itemObjectId = new mongoose.Types.ObjectId(itemId);

    const deleted = await SomedayItem.findOneAndDelete({
      _id: itemObjectId,
      spaceId: spaceObjectId
    });

    if (!deleted) {
      throw AppError.notFound('Item not found');
    }

    return true;
  }
}

