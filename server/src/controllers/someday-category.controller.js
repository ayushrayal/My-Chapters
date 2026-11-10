import { SomedayCategoryService } from '../services/someday-category.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class SomedayCategoryController {
  /**
   * POST /api/someday/categories
   * Create a new category for the authenticated user's Space.
   */
  static async createCategory(req, res) {
    const category = await SomedayCategoryService.createCategory({
      spaceId: req.user.spaceId,
      name: req.body.name
    });

    return ApiResponse.created(res, 'Category created successfully', category);
  }

  /**
   * GET /api/someday/categories
   * Retrieve all categories with item counts for the authenticated user's Space.
   */
  static async getCategories(req, res) {
    const categories = await SomedayCategoryService.getCategories(req.user.spaceId);

    return ApiResponse.success(res, 'Categories retrieved successfully', categories);
  }

  /**
   * PATCH /api/someday/categories/:categoryId
   * Update category name.
   */
  static async updateCategory(req, res) {
    const updatedCategory = await SomedayCategoryService.updateCategory({
      spaceId: req.user.spaceId,
      categoryId: req.params.categoryId,
      name: req.body.name
    });

    return ApiResponse.success(res, 'Category updated successfully', updatedCategory);
  }

  /**
   * DELETE /api/someday/categories/:categoryId
   * Delete normal category and atomically move items to Other.
   */
  static async deleteCategory(req, res) {
    const result = await SomedayCategoryService.deleteCategory({
      spaceId: req.user.spaceId,
      categoryId: req.params.categoryId
    });

    return ApiResponse.success(res, 'Category deleted successfully', result);
  }
}

