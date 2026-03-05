import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserById, getUserOrders, getUserCart, updateUserBlock, updateUserVerify, changeUserPassword } from '../api';

export default function UserDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'cart'>('overview');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    const { data: user, isLoading: loadingUser } = useQuery({
        queryKey: ['user', id],
        queryFn: () => getUserById(id!).then(res => res.data.data),
        enabled: !!id,
    });

    const { data: orders, isLoading: loadingOrders } = useQuery({
        queryKey: ['user-orders', id],
        queryFn: () => getUserOrders(id!).then(res => res.data.data),
        enabled: activeTab === 'orders' && !!id,
    });

    const { data: cart, isLoading: loadingCart } = useQuery({
        queryKey: ['user-cart', id],
        queryFn: () => getUserCart(id!).then(res => res.data.data),
        enabled: activeTab === 'cart' && !!id,
    });

    const blockMut = useMutation({
        mutationFn: (blocked: boolean) => updateUserBlock(id!, blocked),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['user', id] }),
    });

    const verifyMut = useMutation({
        mutationFn: (verified: boolean) => updateUserVerify(id!, verified),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['user', id] }),
    });

    const passwordMut = useMutation({
        mutationFn: () => changeUserPassword(id!, newPassword),
        onSuccess: () => {
            alert('Password changed successfully');
            setIsChangingPassword(false);
            setNewPassword('');
        },
        onError: (err: any) => alert(err.response?.data?.message || 'Failed to change password'),
    });

    if (loadingUser) return <div className="center"><div className="spinner" /></div>;
    if (!user) return <div className="center">User not found.</div>;

    return (
        <div className="user-detail-page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/users')}>
                        ← Back
                    </button>
                    <div>
                        <h1 className="page-title">{user.full_name || 'User Profile'}</h1>
                        <p className="page-subtitle">{user.email}</p>
                    </div>
                </div>
            </div>

            <div className="tabs" style={{ marginBottom: 20 }}>
                <button
                    className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`tab-item ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('orders')}
                >
                    Order History
                </button>
                <button
                    className={`tab-item ${activeTab === 'cart' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cart')}
                >
                    Shopping Cart
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="grid-2-col">
                    <div className="card">
                        <h3 className="card-title">Profile Information</h3>
                        <div className="info-list">
                            <div className="info-item">
                                <label>Full Name</label>
                                <span>{user.full_name || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <label>Email Address</label>
                                <span>{user.email}</span>
                            </div>
                            <div className="info-item">
                                <label>Phone</label>
                                <span>{user.phone || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <label>Account Status</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span className={`badge ${user.is_verified ? 'badge-success' : 'badge-warning'}`}>
                                        {user.is_verified ? 'Verified' : 'Unverified'}
                                    </span>
                                    {user.is_blocked && <span className="badge badge-error">Blocked</span>}
                                </div>
                            </div>
                            <div className="info-item">
                                <label>Joined On</label>
                                <span>{new Date(user.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="card-title">Administrative Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Block Action */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{user.is_blocked ? 'Access Revoked' : 'Restrict Access'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                                        {user.is_blocked ? 'User is currently blocked from all services.' : 'Prevent user from logging in or placing orders.'}
                                    </div>
                                </div>
                                <button
                                    className={`btn ${user.is_blocked ? 'btn-success' : 'btn-danger'} btn-sm`}
                                    style={{ minWidth: 100 }}
                                    onClick={() => blockMut.mutate(!user.is_blocked)}
                                    disabled={blockMut.isPending}
                                >
                                    {blockMut.isPending ? '...' : (user.is_blocked ? 'Unblock' : 'Block')}
                                </button>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border)' }}></div>

                            {/* Verify Action */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{user.is_verified ? 'Account Verified' : 'Verify Identity'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                                        {user.is_verified ? 'User has been verified and has full access.' : 'Manually mark this user as a verified customer.'}
                                    </div>
                                </div>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ minWidth: 100, border: '1px solid var(--border)' }}
                                    onClick={() => verifyMut.mutate(!user.is_verified)}
                                    disabled={verifyMut.isPending}
                                >
                                    {verifyMut.isPending ? '...' : (user.is_verified ? 'Unverify' : 'Verify')}
                                </button>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border)' }}></div>

                            {/* Password Action */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: isChangingPassword ? 12 : 0 }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>Security Override</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                                            Reset the user's password manually if they lost access.
                                        </div>
                                    </div>
                                    {!isChangingPassword && (
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            style={{ minWidth: 100, border: '1px solid var(--border)' }}
                                            onClick={() => setIsChangingPassword(true)}
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>

                                {isChangingPassword && (
                                    <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <input
                                                type="password"
                                                placeholder="Enter new password"
                                                className="form-input"
                                                style={{ height: 36, fontSize: 13 }}
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                            />
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => passwordMut.mutate()} disabled={passwordMut.isPending}>
                                                    {passwordMut.isPending ? 'Saving...' : 'Save Password'}
                                                </button>
                                                <button className="btn btn-ghost btn-sm" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={() => setIsChangingPassword(false)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(activeTab === 'orders' || activeTab === 'cart') && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(activeTab === 'orders' ? loadingOrders : loadingCart) ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0' }}>
                                            <div className="spinner" style={{ margin: '0 auto' }} />
                                        </td>
                                    </tr>
                                ) : (activeTab === 'orders' ? orders : cart)?.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                                            No {activeTab === 'orders' ? 'orders' : 'items'} found.
                                        </td>
                                    </tr>
                                ) : (
                                    (activeTab === 'orders' ? orders : cart).map((order: any) => (
                                        <tr key={order.id}>
                                            <td style={{ fontSize: 13, fontFamily: 'monospace' }}>
                                                {order.id.split('-')[0]}...
                                            </td>
                                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <span className={`badge ${order.payment_status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                                                    {order.payment_status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                    {order.items?.map((item: any) => (
                                                        <img
                                                            key={item.id}
                                                            src={item.custom_image_url || item.model?.model_pic}
                                                            alt=""
                                                            style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--border)' }}
                                                            title={item.model?.name || 'Item'}
                                                        />
                                                    ))}
                                                    {(!order.items || order.items.length === 0) && '0 items'}
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 600 }}>
                                                    {order.total_price ? `$${order.total_price}` : 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
