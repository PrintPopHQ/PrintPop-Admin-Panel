import axios from 'axios';

const API_BASE = 'https://printpop-be.onrender.com';
// const API_BASE = 'http://localhost:8080';

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
export const getAdmins = (page = 1, limit = 10, search = '') =>
    api.get(`/api/admin/admins?page=${page}&limit=${limit}&search=${search}`);
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

// ─── User Management ──────────────────────────────────────────────────────────
export const getUsers = (page = 1, limit = 10, search = '') =>
    api.get(`/api/admin/users?page=${page}&limit=${limit}&search=${search}`);
export const getUserById = (id: string) => api.get(`/api/admin/users/${id}`);
export const addUser = (data: any) => api.post('/api/admin/users', data);
export const updateUserBlock = (id: string, is_blocked: boolean) => api.patch(`/api/admin/users/${id}/block`, { is_blocked });
export const updateUserVerify = (id: string, is_verified: boolean) => api.patch(`/api/admin/users/${id}/verify`, { is_verified });
export const deleteUser = (id: string) => api.delete(`/api/admin/users/${id}`);
export const changeUserPassword = (id: string, new_password: string) => api.patch(`/api/admin/users/${id}/change-password`, { new_password });
export const getUserOrders = (id: string) => api.get(`/api/admin/users/${id}/orders`);
export const getUserCart = (id: string) => api.get(`/api/admin/users/${id}/cart`);

// ─── Order Management ─────────────────────────────────────────────────────────
export const getAdminOrders = (page = 1, limit = 10, search = '', type = 'all') =>
    api.get(`/api/admin/orders?page=${page}&limit=${limit}&search=${search}&type=${type}`);
export const getAdminOrderById = (id: string) => api.get(`/api/admin/orders/${id}`);
