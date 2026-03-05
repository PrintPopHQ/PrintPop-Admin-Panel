import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../assets/plogo.jfif';
import './Layout.css';

export default function Layout() {
    const { admin, logout, isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            {/* Mobile Header */}
            <header className="mobile-header">
                <div className="sidebar-logo" style={{ marginBottom: 0, padding: 0, border: 'none' }}>
                    <img src={logoUrl} alt="PrintPop" style={{ height: 32, objectFit: 'contain', borderRadius: 4 }} />
                </div>
                <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                </button>
            </header>

            {/* Backdrop for mobile */}
            {isMobileMenuOpen && (
                <div className="sidebar-backdrop" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <img src={logoUrl} alt="PrintPop" style={{ height: 32, objectFit: 'contain', borderRadius: 4 }} />
                    <span className="logo-badge">Admin</span>
                    <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <p className="nav-section-label">Content</p>
                    <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/blogs">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        Blogs
                    </NavLink>

                    <p className="nav-section-label" style={{ marginTop: 16 }}>Management</p>
                    <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/users">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        Users
                    </NavLink>
                    <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/orders">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                        Orders
                    </NavLink>
                    {isSuperAdmin && (
                        <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/admins">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>
                            Admins
                        </NavLink>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="admin-info">
                        <div className="admin-avatar">{admin?.name?.[0]?.toUpperCase() ?? 'A'}</div>
                        <div>
                            <p className="admin-name">{admin?.name}</p>
                            <p className="admin-role">{admin?.role === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout} title="Logout">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
