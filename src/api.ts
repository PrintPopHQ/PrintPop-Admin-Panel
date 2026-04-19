import axios from 'axios';

const API_BASE = 'https://printpop-be.onrender.com';
// const API_BASE = 'http://localhost:8080';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => {
        // Handle custom response codes from backend
        if (response.data && response.data.responseCode && response.data.responseCode !== 2000) {
            let message = response.data.message || 'API Error';
            if (message.startsWith('Stripe Error: ')) {
                message = message.replace('Stripe Error: ', '');
            }
            return Promise.reject({
                response: response,
                message: message
            });
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

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

// Admin Profile
export const getAdminProfile = () => api.get('/api/admin/profile');
export const updateAdminProfile = (data: { name?: string; profile_picture?: string }) => api.patch('/api/admin/profile', data);
export const changeAdminPassword = (data: { oldPassword?: string; newPassword: string }) => api.patch('/api/admin/profile/password', data);

// ─── File Upload (R2) ─────────────────────────────────────────────────────────
export const uploadImage = (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/r2/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
export const deleteFile = (url: string) => api.post('/api/r2/delete', { url });

// ─── Blogs ────────────────────────────────────────────────────────────────────
export const getBlogs = (page = 1, limit = 10, published?: boolean, search?: string) => {
    const params: Record<string, unknown> = { page, limit };
    if (published !== undefined) params.published = published;
    if (search) params.search = search;
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
export const getUserOrders = (id: string, page = 1, limit = 10, search = '') =>
    api.get(`/api/admin/users/${id}/orders?page=${page}&limit=${limit}&search=${search}`);
export const getUserCart = (id: string) => api.get(`/api/admin/users/${id}/cart`);

// ─── Order Management ─────────────────────────────────────────────────────────
export const getAdminOrders = (page = 1, limit = 10, search = '', type = 'all') =>
    api.get(`/api/admin/orders?page=${page}&limit=${limit}&search=${search}&type=${type}`);
export const getAdminOrderById = (id: string) => api.get(`/api/admin/orders/${id}`);
export const updateOrderTracking = (id: string, tracking_id: string) =>
    api.patch(`/api/admin/orders/${id}/tracking`, { tracking_id });

// ─── Banner Images ────────────────────────────────────────────────────────────
export const getBannerImages = () => api.get('/api/banner-images');
export const updateBannerImages = (urls: string[]) => api.post('/api/banner-images', { urls });

// ─── Coupons ──────────────────────────────────────────────────────────────────
export const listCoupons = (page = 1, limit = 20, search?: string) =>
    api.get('/api/admin/coupons', { params: { page, limit, search } });
export const createCoupon = (data: any) => api.post('/api/admin/coupons', data);
export const deleteCoupon = (id: string) => api.delete(`/api/admin/coupons/${id}`);

// ─── Cover Designs ────────────────────────────────────────────────────────────
export const getAdminCoverDesigns = (page = 1, limit = 10, search = '') =>
    api.get(`/api/admin/cover-designs?page=${page}&limit=${limit}&search=${search}`);
export const getAdminCoverDesignById = (id: string) => api.get(`/api/admin/cover-designs/${id}`);
export const createAdminCoverDesign = (data: any) => api.post('/api/admin/cover-designs', data);
export const updateAdminCoverDesign = (id: string, data: any) => api.patch(`/api/admin/cover-designs/${id}`, data);
export const deleteAdminCoverDesign = (id: string) => api.delete(`/api/admin/cover-designs/${id}`);

// ─── Inventory Management ─────────────────────────────────────────────────────
export const listInventory = (page = 1, limit = 10, search?: string, brandId?: string) =>
    api.get('/api/admin/inventory', { params: { page, limit, search, brandId } });
export const getInventoryBrands = () => api.get('/api/admin/inventory/brands');
export const updateInventory = (data: { model_id: string; case_type: string; stock_quantity: number }) =>
    api.post('/api/admin/inventory', data);
export const deleteInventory = (id: string) => api.delete(`/api/admin/inventory/${id}`);
export const addModel = (data: any) => api.post('/api/admin/inventory/model', data);
export const getModel = (id: string) => api.get(`/api/admin/inventory/model/${id}`);
export const updateModel = (id: string, data: any) => api.patch(`/api/admin/inventory/model/${id}`, data);
export const deleteModel = (id: string) => api.delete(`/api/admin/inventory/model/${id}`);

// ─── Pricing Management ──────────────────────────────────────────────────────────
export const getPricing = () => api.get('/api/admin/pricing');
export const getPricingMetadata = () => api.get('/api/admin/pricing/metadata');
export const updatePricing = (data: { case_type: string; plan_type: string; price: number }) =>
    api.post('/api/admin/pricing', data);
