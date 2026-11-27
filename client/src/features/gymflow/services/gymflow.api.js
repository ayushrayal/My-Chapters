import api from '../../../lib/axios.js';

export const gymflowApi = {
  // --- Templates ---
  async getTemplates() {
    const res = await api.get('/gymflow/templates');
    return res.data?.data?.templates || [];
  },

  async getParentWorkouts() {
    const res = await api.get('/gymflow/templates/parents');
    return res.data?.data?.parents || [];
  },

  async getTemplateById(id) {
    const res = await api.get(`/gymflow/templates/${id}`);
    return res.data?.data?.template;
  },

  async createTemplate(payload) {
    const res = await api.post('/gymflow/templates', payload);
    return res.data?.data?.template;
  },

  async updateTemplate(id, payload) {
    const res = await api.put(`/gymflow/templates/${id}`, payload);
    return res.data?.data?.template;
  },

  async deleteTemplate(id) {
    const res = await api.delete(`/gymflow/templates/${id}`);
    return res.data?.data?.template;
  },

  async pauseExercise(templateId, exerciseId, payload) {
    const res = await api.post(`/gymflow/templates/${templateId}/exercises/${exerciseId}/pause`, payload);
    return res.data?.data?.template;
  },

  async resumeExercise(templateId, exerciseId, payload) {
    const res = await api.post(`/gymflow/templates/${templateId}/exercises/${exerciseId}/resume`, payload);
    return res.data?.data?.template;
  },

  // --- Weekly Schedule ---
  async getWeeklySchedule() {
    const res = await api.get('/gymflow/schedule');
    return res.data?.data?.schedule;
  },

  async updateWeeklySchedule(days) {
    const res = await api.put('/gymflow/schedule', { days });
    return res.data?.data?.schedule;
  },

  // --- Daily Workout Session ---
  async getCalendarOverview(startDate, endDate) {
    const res = await api.get('/gymflow/workout/calendar/overview', {
      params: { startDate, endDate }
    });
    return res.data?.data?.days || [];
  },

  async getSession(date) {
    const res = await api.get(`/gymflow/workout/${date}`);
    return res.data?.data;
  },

  async startSession(payload) {
    const res = await api.post('/gymflow/workout/start', payload);
    return res.data?.data?.session;
  },

  async updateSession(date, payload) {
    const res = await api.put(`/gymflow/workout/${date}`, payload);
    return res.data?.data?.session;
  },

  async discardSession(date) {
    const res = await api.delete(`/gymflow/workout/${date}/discard`);
    return res.data?.data;
  },

  async finishSession(date, isFinished = true) {
    const res = await api.post(`/gymflow/workout/${date}/finish`, { isFinished });
    return res.data?.data?.session;
  },

  async setRestDay(date, reason) {
    const res = await api.post(`/gymflow/workout/${date}/rest-day`, { reason });
    return res.data?.data?.session;
  },

  async removeRestDay(date) {
    const res = await api.delete(`/gymflow/workout/${date}/rest-day`);
    return res.data?.data?.session;
  },

  async getComparisons(date, exercises, templateId) {
    const res = await api.post(`/gymflow/workout/${date}/comparisons`, { exercises, templateId });
    return res.data?.data?.comparisons || {};
  },

  // --- Analytics ---
  async getAnalytics(params = {}) {
    const res = await api.get('/gymflow/analytics', { params });
    return res.data?.data?.analytics;
  }
};
