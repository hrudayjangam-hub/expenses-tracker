import api from './api';

const qs = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const search = new URLSearchParams(clean).toString();
  return search ? `?${search}` : '';
};

export const listBudgets = (params) => api.get(`/api/budgets${qs(params)}`).then((r) => r.data);
export const budgetOverview = () => api.get('/api/budgets/overview').then((r) => r.data);
export const createBudget = (payload) => api.post('/api/budgets', payload).then((r) => r.data);
export const updateBudget = (id, payload) => api.put(`/api/budgets/${id}`, payload).then((r) => r.data);
export const deleteBudget = (id) => api.delete(`/api/budgets/${id}`).then((r) => r.data);
