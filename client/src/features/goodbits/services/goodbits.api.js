import api from '../../../lib/axios.js';

export const goodbitsApi = {
  /**
   * Retrieves all entries and day counts for a given month (YYYY-MM).
   * @param {string} monthKey - Format YYYY-MM
   * @returns {Promise<{ monthKey: string, entries: Array, dayCounts: Object, totalCount: number }>}
   */
  async getMonthEntries(monthKey) {
    const response = await api.get(`/goodbits/month?monthKey=${monthKey}`);
    return response.data?.data || { monthKey, entries: [], dayCounts: {}, totalCount: 0 };
  },

  /**
   * Retrieves all entries for a specific calendar date (YYYY-MM-DD).
   * @param {string} date - Format YYYY-MM-DD
   * @returns {Promise<{ date: string, entries: Array, totalCount: number }>}
   */
  async getDateEntries(date) {
    const response = await api.get(`/goodbits/date/${date}`);
    return response.data?.data || { date, entries: [], totalCount: 0 };
  },

  /**
   * Retrieves historical memories matching the day-of-month across past months and years.
   * @param {string} date - Target calendar date YYYY-MM-DD
   * @returns {Promise<{ targetDate: string, memories: Array, totalCount: number }>}
   */
  async getHistoricalMemories(date) {
    const response = await api.get(`/goodbits/memories?date=${date}`);
    return response.data?.data || { targetDate: date, memories: [], totalCount: 0 };
  },

  /**
   * Creates a new Good Bit entry.
   * @param {{ date: string, title?: string, description: string }} data
   * @returns {Promise<object>}
   */
  async createEntry(data) {
    const response = await api.post('/goodbits', data);
    return response.data?.data;
  },

  /**
   * Updates an existing Good Bit entry.
   * @param {string} id
   * @param {{ title?: string, description: string }} data
   * @returns {Promise<object>}
   */
  async updateEntry(id, data) {
    const response = await api.patch(`/goodbits/${id}`, data);
    return response.data?.data;
  },

  /**
   * Deletes a Good Bit entry.
   * @param {string} id
   * @returns {Promise<{ id: string, date: string, deleted: boolean }>}
   */
  async deleteEntry(id) {
    const response = await api.delete(`/goodbits/${id}`);
    return response.data?.data;
  }
};
