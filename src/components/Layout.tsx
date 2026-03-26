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
                    <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/banners">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4zm0 2h16v14H4V5zm2 2v2h4V7H6zm6 0v2h4V7h-4z" /></svg>
                        Banners
                    </NavLink>
                    {/* <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/cover-designs">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                        Cover Designs
                    </NavLink> */}

                    <p className="nav-section-label" style={{ marginTop: 16 }}>Management</p>
                    <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/users">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        Users
                    </NavLink>
                    <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/orders">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                        Orders
                    </NavLink>
                    <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/coupons">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM3 7h12v10H3V7zm1 2v2h4V9H4zm6 0v2h4V9h-4zm-6 4v2h4v-2H4zm6 0v2h4v-2h-4z" /></svg>
                        Coupons
                    </NavLink>
                    {isSuperAdmin && (
                        <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/admins">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>
                            Admins
                        </NavLink>
                    )}
                    {/* <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/profile">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                        Profile & Settings
                    </NavLink> */}
                </nav>

                <div className="sidebar-footer">
                    <div className="admin-info" style={{ cursor: 'pointer' }} onClick={() => navigate('/profile')}>
                        <div className="admin-avatar">
                            {admin?.profile_picture ? (
                                <img src={admin.profile_picture} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                admin?.name?.[0]?.toUpperCase() ?? 'A'
                            )}
                        </div>
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
