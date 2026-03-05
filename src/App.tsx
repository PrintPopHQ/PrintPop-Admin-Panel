import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import BlogsPage from './pages/BlogsPage';
import BlogFormPage from './pages/BlogFormPage';
import AdminsPage from './pages/AdminsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/blogs" replace />} />
        <Route path="blogs" element={<BlogsPage />} />
        <Route path="blogs/new" element={<BlogFormPage />} />
        <Route path="blogs/:id/edit" element={<BlogFormPage />} />
        <Route path="admins" element={<AdminsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
