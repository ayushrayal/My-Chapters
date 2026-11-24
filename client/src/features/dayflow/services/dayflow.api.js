import api from '../../../lib/axios.js';

/**
 * Returns formatted HH:MM and YYYY-MM-DD for client-side timezone accuracy.
 */
function getClientTimeParams() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const clientTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const clientDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return { clientTime, clientDate };
}

export const dayflowApi = {
  // --- Template APIs ---

  async getTemplates() {
    const response = await api.get('/dayflow/templates');
    return response.data?.data || [];
  },

  async getTemplateById(templateId) {
    const response = await api.get(`/dayflow/templates/${templateId}`);
    return response.data?.data;
  },

  async createTemplate(payload) {
    const response = await api.post('/dayflow/templates', payload);
    return response.data?.data;
  },

  async updateTemplate(templateId, payload) {
    const response = await api.put(`/dayflow/templates/${templateId}`, payload);
    return response.data?.data;
  },

  async deleteTemplate(templateId) {
    const response = await api.delete(`/dayflow/templates/${templateId}`);
    return response.data?.data;
  },

  // --- Schedule APIs ---

  async getSchedule(date) {
    const { clientTime, clientDate } = getClientTimeParams();
    const response = await api.get('/dayflow/schedule', {
      params: { date, clientTime, clientDate }
    });
    return response.data?.data;
  },

  async saveSchedule(payload) {
    const { clientTime, clientDate } = getClientTimeParams();
    const response = await api.post('/dayflow/schedule', payload, {
      params: { clientTime, clientDate }
    });
    return response.data?.data;
  },

  async applyTemplate(payload) {
    const { clientTime, clientDate } = getClientTimeParams();
    const response = await api.post('/dayflow/schedule/apply-template', payload, {
      params: { clientTime, clientDate }
    });
    return response.data?.data;
  },

  async moveSchedule(payload) {
    const { clientTime, clientDate } = getClientTimeParams();
    const response = await api.post('/dayflow/schedule/move', payload, {
      params: { clientTime, clientDate }
    });
    return response.data?.data;
  },

  async setRestDay(payload) {
    const { clientTime, clientDate } = getClientTimeParams();
    const response = await api.post('/dayflow/schedule/rest-day', payload, {
      params: { clientTime, clientDate }
    });
    return response.data?.data;
  },

  async updateTask(taskId, payload) {
    const { clientTime, clientDate } = getClientTimeParams();
    const response = await api.patch(`/dayflow/schedule/tasks/${taskId}`, payload, {
      params: { clientTime, clientDate }
    });
    return response.data?.data;
  },

  async deleteTask(taskId, date) {
    const { clientTime, clientDate } = getClientTimeParams();
    const response = await api.delete(`/dayflow/schedule/tasks/${taskId}`, {
      params: { date, clientTime, clientDate }
    });
    return response.data?.data;
  },

  async finishDay(date) {
    const { clientTime, clientDate } = getClientTimeParams();
    const response = await api.post('/dayflow/schedule/finish', { date }, {
      params: { clientTime, clientDate }
    });
    return response.data?.data;
  },

  // --- Calendar & Analytics APIs ---

  async getCalendarOverview(startDate, endDate) {
    const response = await api.get('/dayflow/schedule/calendar', {
      params: { startDate, endDate }
    });
    return response.data?.data || [];
  },

  async getAnalytics({ startDate, endDate, date }) {
    const response = await api.get('/dayflow/schedule/analytics', {
      params: { startDate, endDate, date }
    });
    return response.data?.data;
  }
};
