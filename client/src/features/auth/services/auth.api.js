import api from '../../../lib/axios.js';

export const authApi = {
  /**
   * Register a new Space and its Admin user.
   * @param {object} payload
   * @param {string} payload.username
   * @param {string} payload.email
   * @param {string} payload.password
   * @param {string} payload.spaceName
   * @param {string} payload.accessCode
   * @returns {Promise<{ success: boolean, message: string, data: { user: object, space: object } }>}
   */
  async signup(payload) {
    const response = await api.post('/auth/signup', payload);
    return response.data;
  },

  /**
   * Sign in an existing user with email/username and password.
   * Browser receives and stores HttpOnly cookie automatically.
   * @param {object} payload
   * @param {string} payload.identifier
   * @param {string} payload.password
   * @returns {Promise<{ success: boolean, message: string, data: { user: object, space: object } }>}
   */
  async signin(payload) {
    const response = await api.post('/auth/signin', payload);
    return response.data;
  },

  /**
   * Fetch currently authenticated user and their Space.
   * @returns {Promise<{ success: boolean, message: string, data: { user: object, space: object } }>}
   */
  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Revoke session on backend and clear authentication cookie.
   * @returns {Promise<{ success: boolean, message: string, data: object }>}
   */
  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};
