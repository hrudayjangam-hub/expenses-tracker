import api from './api';

const qs = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const search = new URLSearchParams(clean).toString();
  return search ? `?${search}` : '';
};

export const listCategories = (params) => api.get(`/api/categories${qs(params)}`).then((r) => r.data);
export const createCategory = (payload) => api.post('/api/categories', payload).then((r) => r.data);
export const updateCategory = (id, payload) => api.put(`/api/categories/${id}`, payload).then((r) => r.data);
export const deleteCategory = (id) => api.delete(`/api/categories/${id}`).then((r) => r.data);
