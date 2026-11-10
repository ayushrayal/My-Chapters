import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  timeout: 10000
});

// Interceptor to handle responses or log in development if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standardized rejection for catch blocks to consume with parseApiError
    return Promise.reject(error);
  }
);

export default api;
