import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta as any).env.VITE_API_BASE_URL  || 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updatePreferences: (data: { language?: string; theme?: string }) =>
    api.patch('/auth/preferences', data),
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const profileApi = {
  get: (userId: string) => api.get(`/profile/${userId}`),
  update: (data: object) => api.patch('/profile', data),
  updateAs: (userId: string, data: object) => api.patch(`/profile/${userId}`, data),
  upsertAttribute: (attributeId: string, data: { value: string | null; version: number }) =>
    api.put(`/profile/attributes/${attributeId}`, data),
  removeAttribute: (attributeId: string) => api.delete(`/profile/attributes/${attributeId}`),
  createProject: (data: object) => api.post('/profile/projects', data),
  updateProject: (projectId: string, data: object) => api.patch(`/profile/projects/${projectId}`, data),
  deleteProject: (projectId: string) => api.delete(`/profile/projects/${projectId}`),
  autocompleteTags: (q: string) => api.get('/tags/autocomplete', { params: { q } }),
};

// ─── Attributes ───────────────────────────────────────────────────────────────
export const attributeApi = {
  list: (params?: { q?: string; category?: string; page?: number; limit?: number }) =>
    api.get('/attributes', { params }),
  recent: () => api.get('/attributes/recent'),
  get: (id: string) => api.get(`/attributes/${id}`),
  create: (data: object) => api.post('/attributes', data),
  update: (id: string, data: object) => api.patch(`/attributes/${id}`, data),
  delete: (id: string) => api.delete(`/attributes/${id}`),
};

// ─── Positions ────────────────────────────────────────────────────────────────
export const positionApi = {
  list: (params?: { q?: string; page?: number; limit?: number }) =>
    api.get('/positions', { params }),
  get: (id: string) => api.get(`/positions/${id}`),
  create: (data: object) => api.post('/positions', data),
  update: (id: string, data: object) => api.patch(`/positions/${id}`, data),
  duplicate: (id: string) => api.post(`/positions/${id}/duplicate`),
  delete: (id: string) => api.delete(`/positions/${id}`),
  checkAccess: (id: string) => api.get(`/positions/${id}/access-check`),
  getCVs: (id: string, params?: object) => api.get(`/positions/${id}/cvs`, { params }),
};

// ─── CVs ─────────────────────────────────────────────────────────────────────
export const cvApi = {
  my: () => api.get('/cvs/my'),
  search: (params?: object) => api.get('/cvs/search', { params }),
  get: (cvId: string) => api.get(`/cvs/${cvId}`),
  create: (positionId: string) => api.post('/cvs', { positionId }),
  delete: (cvId: string) => api.delete(`/cvs/${cvId}`),
  like: (cvId: string) => api.post(`/cvs/${cvId}/like`),
  unlike: (cvId: string) => api.delete(`/cvs/${cvId}/like`),
};

// ─── Discussion ───────────────────────────────────────────────────────────────
export const discussionApi = {
  list: (positionId: string, params?: object) =>
    api.get(`/positions/${positionId}/discussion`, { params }),
  post: (positionId: string, content: string) =>
    api.post(`/positions/${positionId}/discussion`, { content }),
};

// ─── Stats ────────────────────────────────────────────────────────────────────
export const statsApi = {
  get: () => api.get('/stats'),
  latestPositions: () => api.get('/stats/latest-positions'),
  popularPositions: () => api.get('/stats/popular-positions'),
  tagCloud: () => api.get('/stats/tag-cloud'),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  listUsers: (params?: object) => api.get('/admin/users', { params }),
  assignRole: (userId: string, role: string) =>
    api.patch(`/admin/users/${userId}/role`, { role }),
  block: (userId: string) => api.patch(`/admin/users/${userId}/block`),
  unblock: (userId: string) => api.patch(`/admin/users/${userId}/unblock`),
  delete: (userId: string) => api.delete(`/admin/users/${userId}`),
};

// ─── Upload ───────────────────────────────────────────────────────────────────
export const uploadApi = {
  image: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/upload/image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};