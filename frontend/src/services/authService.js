import api from './api';

export const register = (payload) => api.post('/api/auth/register', payload).then((r) => r.data);
export const login = (payload) => api.post('/api/auth/login', payload).then((r) => r.data);
export const getMe = () => api.get('/api/auth/me').then((r) => r.data);
export const updateProfile = (payload) => api.put('/api/auth/profile', payload).then((r) => r.data);
export const changePassword = (payload) => api.put('/api/auth/password', payload).then((r) => r.data);
