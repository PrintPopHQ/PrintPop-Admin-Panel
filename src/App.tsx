import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import BlogsPage from './pages/BlogsPage.tsx';
import BlogFormPage from './pages/BlogFormPage.tsx';
import AdminsPage from './pages/AdminsPage.tsx';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import BannerManagementPage from './pages/BannerManagementPage';
import CouponsPage from './pages/CouponsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { token } = useAuth();
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/blogs" replace />} />
          <Route path="blogs" element={<BlogsPage />} />
          <Route path="blogs/new" element={<BlogFormPage />} />
          <Route path="blogs/:id/edit" element={<BlogFormPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailsPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="banners" element={<BannerManagementPage />} />
          <Route path="coupons" element={<CouponsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
