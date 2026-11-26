import api from '../../../lib/axios.js';

export const dashboardApi = {
  async getOverview(params = {}) {
    const res = await api.get('/dashboard/overview', { params });
    return res.data?.data;
  }
};
