import axios from 'axios';
import { API_URL } from '../constants/config';
import { useAuthStore } from '../store/auth';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

          return api(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().logout();
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
