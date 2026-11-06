import api from './api';

export const listAccounts = (params = {}) => {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  ).toString();
  return api.get(`/api/accounts${search ? `?${search}` : ''}`).then((r) => r.data);
};
export const createAccount = (payload) => api.post('/api/accounts', payload).then((r) => r.data);
export const updateAccount = (id, payload) => api.put(`/api/accounts/${id}`, payload).then((r) => r.data);
export const deleteAccount = (id) => api.delete(`/api/accounts/${id}`).then((r) => r.data);
export const netWorthHistory = (months = 12) =>
  api.get(`/api/accounts/net-worth?months=${months}`).then((r) => r.data);
