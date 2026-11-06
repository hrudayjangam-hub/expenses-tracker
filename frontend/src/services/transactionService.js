import api from './api';

const qs = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const search = new URLSearchParams(clean).toString();
  return search ? `?${search}` : '';
};

export const listTransactions = (params) => api.get(`/api/transactions${qs(params)}`).then((r) => r.data);
export const getTransaction = (id) => api.get(`/api/transactions/${id}`).then((r) => r.data);
export const createTransaction = (payload) => api.post('/api/transactions', payload).then((r) => r.data);
export const updateTransaction = (id, payload) => api.put(`/api/transactions/${id}`, payload).then((r) => r.data);
export const deleteTransaction = (id) => api.delete(`/api/transactions/${id}`).then((r) => r.data);
export const transactionStats = (params) => api.get(`/api/transactions/stats${qs(params)}`).then((r) => r.data);
