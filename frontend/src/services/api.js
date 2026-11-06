import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('et_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && localStorage.getItem('et_token')) {
      const msg = error.response?.data?.message || '';
      const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthRoute) onUnauthorized();
      if (isAuthRoute && msg) {
        return Promise.reject(new Error(msg));
      }
    }
    return Promise.reject(error);
  }
);

/** Normalizes any axios error into a user-facing message. */
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error instanceof Error && error.isAxiosError === false && error.message && !error.response) {
    return error.message;
  }
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

export default api;
