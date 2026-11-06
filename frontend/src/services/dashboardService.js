import api from './api';

const qs = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const search = new URLSearchParams(clean).toString();
  return search ? `?${search}` : '';
};

export const getSummary = (params) => api.get(`/api/dashboard/summary${qs(params)}`).then((r) => r.data);
export const getAnalytics = (params) => api.get(`/api/dashboard/analytics${qs(params)}`).then((r) => r.data);
export const getReportSummary = (params) => api.get(`/api/reports/summary${qs(params)}`).then((r) => r.data);
