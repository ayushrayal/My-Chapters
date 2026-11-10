import { SomedayItemService } from '../services/someday-item.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class SomedayItemController {
  /**
   * POST /api/someday/items
   * Create a new Someday item in the authenticated user's Space.
   */
  static async createItem(req, res) {
    const item = await SomedayItemService.createItem({
      spaceId: req.user.spaceId,
      name: req.body.name,
      categoryId: req.body.categoryId,
      links: req.body.links,
      note: req.body.note,
      status: req.body.status,
      purchaseDate: req.body.purchaseDate
    });

    return ApiResponse.created(res, 'Item created successfully', item);
  }

  /**
   * GET /api/someday/items
   * Retrieve items with optional categoryId and status filters.
   */
  static async getItems(req, res) {
    const items = await SomedayItemService.getItems({
      spaceId: req.user.spaceId,
      categoryId: req.query.categoryId,
      status: req.query.status
    });

    return ApiResponse.success(res, 'Items retrieved successfully', items);
  }

  /**
   * GET /api/someday/items/:itemId
   * Retrieve single item details.
   */
  static async getItemById(req, res) {
    const item = await SomedayItemService.getItemById({
      spaceId: req.user.spaceId,
      itemId: req.params.itemId
    });

    return ApiResponse.success(res, 'Item retrieved successfully', item);
  }

  /**
   * PATCH /api/someday/items/:itemId
   * Update item fields.
   */
  static async updateItem(req, res) {
    const updatedItem = await SomedayItemService.updateItem({
      spaceId: req.user.spaceId,
      itemId: req.params.itemId,
      payload: req.body
    });

    return ApiResponse.success(res, 'Item updated successfully', updatedItem);
  }

  /**
   * DELETE /api/someday/items/:itemId
   * Delete item.
   */
  static async deleteItem(req, res) {
    await SomedayItemService.deleteItem({
      spaceId: req.user.spaceId,
      itemId: req.params.itemId
    });

    return ApiResponse.success(res, 'Item deleted successfully');
  }
}

