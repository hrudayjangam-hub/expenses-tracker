import api from './api';

export const getHousehold = () => api.get('/api/households').then((r) => r.data);
export const createHousehold = (name) => api.post('/api/households', { name }).then((r) => r.data);
export const joinHousehold = (joinCode) => api.post('/api/households/join', { joinCode }).then((r) => r.data);
export const inviteMember = (email) => api.post('/api/households/invite', { email }).then((r) => r.data);
export const removeMember = (userId) => api.delete(`/api/households/members/${userId}`).then((r) => r.data);
export const deleteHousehold = () => api.delete('/api/households').then((r) => r.data);
