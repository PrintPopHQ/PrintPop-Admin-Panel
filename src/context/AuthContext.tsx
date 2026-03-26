import { createContext, useContext, useState, type ReactNode } from 'react';

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: 'super_admin' | 'admin';
    profile_picture?: string;
}

interface AuthContextType {
    admin: AdminUser | null;
    token: string | null;
    login: (token: string, admin: AdminUser) => void;
    logout: () => void;
    updateAdmin: (updatedAdmin: Partial<AdminUser>) => void;
    isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
    const [admin, setAdmin] = useState<AdminUser | null>(() => {
        const saved = localStorage.getItem('admin_user');
        return saved ? JSON.parse(saved) : null;
    });

    const login = (newToken: string, newAdmin: AdminUser) => {
        localStorage.setItem('admin_token', newToken);
        localStorage.setItem('admin_user', JSON.stringify(newAdmin));
        setToken(newToken);
        setAdmin(newAdmin);
    };

    const logout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        setToken(null);
        setAdmin(null);
    };

    const updateAdmin = (updatedAdmin: Partial<AdminUser>) => {
        setAdmin(prev => {
            if (!prev) return null;
            const nuevo = { ...prev, ...updatedAdmin };
            localStorage.setItem('admin_user', JSON.stringify(nuevo));
            return nuevo;
        });
    };

    return (
        <AuthContext.Provider value={{ admin, token, login, logout, updateAdmin, isSuperAdmin: admin?.role === 'super_admin' }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
