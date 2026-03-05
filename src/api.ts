import axios from 'axios';

const API_BASE = 'http://localhost:8080';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ─── Admin Auth ───────────────────────────────────────────────────────────────
export const adminLogin = (email: string, password: string) =>
    api.post('/api/admin/login', { email, password });

// ─── Admin Management ─────────────────────────────────────────────────────────
export const getAdmins = () => api.get('/api/admin/admins');
export const addAdmin = (data: { name: string; email: string; password: string }) =>
    api.post('/api/admin/admins', data);
export const updateAdmin = (id: string, data: { name?: string; password?: string }) =>
    api.patch(`/api/admin/admins/${id}`, data);
export const deleteAdmin = (id: string) => api.delete(`/api/admin/admins/${id}`);

// ─── File Upload (R2) ─────────────────────────────────────────────────────────
export const uploadImage = (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/r2/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// ─── Blogs ────────────────────────────────────────────────────────────────────
export const getBlogs = (page = 1, limit = 10, published?: boolean) => {
    const params: Record<string, unknown> = { page, limit };
    if (published !== undefined) params.published = published;
    return api.get('/api/blogs', { params });
};
export const getBlog = (id: string) => api.get(`/api/blogs/${id}`);
export const createBlog = (data: object) => api.post('/api/blogs', data);
export const updateBlog = (id: string, data: object) => api.patch(`/api/blogs/${id}`, data);
export const publishBlog = (id: string) => api.patch(`/api/blogs/${id}/publish`);
export const unpublishBlog = (id: string) => api.patch(`/api/blogs/${id}/unpublish`);
export const deleteBlog = (id: string) => api.delete(`/api/blogs/${id}`);
