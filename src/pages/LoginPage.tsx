import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminLogin } from '../api';
import './LoginPage.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await adminLogin(email, password);
            const { access_token, admin } = res.data.data;
            login(access_token, admin);
            navigate('/blogs');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <span className="login-logo-icon">🖨️</span>
                    <div>
                        <h1 className="login-title">PrintPop</h1>
                        <p className="login-subtitle">Admin Panel</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            className="form-input"
                            type="email"
                            placeholder="admin@printpop.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button className="btn btn-primary w-full login-submit" type="submit" disabled={loading}>
                        {loading ? <><span className="spinner spinner-sm" /> Signing in…</> : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
