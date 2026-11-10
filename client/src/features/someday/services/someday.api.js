import api from '../../../lib/axios.js';

export const somedayApi = {
  // --- Category APIs ---

  /**
   * Retrieves all categories for the authenticated user's Space.
   * @returns {Promise<Array<object>>}
   */
  async getCategories() {
    const response = await api.get('/someday/categories');
    return response.data?.data || [];
  },

  /**
   * Creates a new custom category.
   * @param {string} name
   * @returns {Promise<object>}
   */
  async createCategory(name) {
    const response = await api.post('/someday/categories', { name });
    return response.data?.data;
  },

  /**
   * Updates a category name.
   * @param {string} categoryId
   * @param {string} name
   * @returns {Promise<object>}
   */
  async updateCategory(categoryId, name) {
    const response = await api.patch(`/someday/categories/${categoryId}`, { name });
    return response.data?.data;
  },

  /**
   * Deletes a custom category and atomically migrates its items to Other.
   * @param {string} categoryId
   * @returns {Promise<{ movedItems: number }>}
   */
  async deleteCategory(categoryId) {
    const response = await api.delete(`/someday/categories/${categoryId}`);
    return response.data?.data || { movedItems: 0 };
  },

  // --- Item APIs ---

  /**
   * Retrieves items with optional categoryId and status filters.
   * @param {object} [filters={}]
   * @param {string} [filters.categoryId]
   * @param {string} [filters.status]
   * @returns {Promise<Array<object>>}
   */
  async getItems(filters = {}) {
    const params = {};
    if (filters.categoryId && filters.categoryId !== 'ALL') {
      params.categoryId = filters.categoryId;
    }
    if (filters.status && filters.status !== 'ALL') {
      params.status = filters.status;
    }

    const response = await api.get('/someday/items', { params });
    return response.data?.data || [];
  },

  /**
   * Retrieves single item details.
   * @param {string} itemId
   * @returns {Promise<object>}
   */
  async getItemById(itemId) {
    const response = await api.get(`/someday/items/${itemId}`);
    return response.data?.data;
  },

  /**
   * Creates a new Someday item.
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async createItem(payload) {
    const response = await api.post('/someday/items', payload);
    return response.data?.data;
  },

  /**
   * Updates an existing item.
   * @param {string} itemId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async updateItem(itemId, payload) {
    const response = await api.patch(`/someday/items/${itemId}`, payload);
    return response.data?.data;
  },

  /**
   * Deletes an item.
   * @param {string} itemId
   * @returns {Promise<boolean>}
   */
  async deleteItem(itemId) {
    const response = await api.delete(`/someday/items/${itemId}`);
    return response.data?.success || true;
  }
};
