import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { getUserById, getUserOrders, getUserCart, updateUserBlock, updateUserVerify, changeUserPassword } from '../api';
import ConfirmModal from '../components/ConfirmModal';

const col = createColumnHelper<any>();

export default function UserDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'cart'>('overview');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    const [confirm, setConfirm] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'primary' | 'success' | 'warning';
        confirmText?: string;
    }>({
        show: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

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
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['user', id] });
            setConfirm(prev => ({ ...prev, show: false }));
        },
    });

    const verifyMut = useMutation({
        mutationFn: (verified: boolean) => updateUserVerify(id!, verified),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['user', id] });
            setConfirm(prev => ({ ...prev, show: false }));
        },
    });

    const passwordMut = useMutation({
        mutationFn: () => changeUserPassword(id!, newPassword),
        onSuccess: () => {
            setIsChangingPassword(false);
            setNewPassword('');
            setConfirm(prev => ({ ...prev, show: false }));
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Failed to change password');
            setConfirm(prev => ({ ...prev, show: false }));
        },
    });

    const columns = useMemo(() => [
        col.accessor('id', {
            header: 'ID',
            cell: info => {
                const id = info.getValue() || '';
                const shortId = id.split('-')[0];
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 30, height: 30, borderRadius: '50%', background: 'var(--primary-light)',
                            color: 'var(--primary)', fontSize: 11, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            border: '1px solid var(--primary-light)'
                        }}>
                            #{shortId[0]?.toUpperCase() ?? 'O'}
                        </div>
                        <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 500 }}>{shortId}...</span>
                    </div>
                );
            },
        }),
        col.accessor('created_at', {
            header: 'Date',
            cell: info => <span style={{ color: 'var(--text-muted)' }}>{new Date(info.getValue()).toLocaleDateString()}</span>,
        }),
        col.accessor('payment_status', {
            header: 'Status',
            cell: info => {
                const status = info.getValue();
                return <span className={`badge ${status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{status}</span>;
            },
        }),
        col.accessor('items', {
            header: 'Items',
            cell: info => {
                const items = info.getValue();
                if (!items || items.length === 0) return <span style={{ color: 'var(--text-dim)' }}>0 items</span>;
                return (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {items.map((item: any) => (
                            <img
                                key={item.id}
                                src={item.custom_image_url || item.model?.model_pic}
                                alt=""
                                style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--border)' }}
                                title={item.model?.name || 'Item'}
                            />
                        ))}
                    </div>
                );
            },
        }),
        col.accessor('total_price', {
            header: 'Total',
            cell: info => <span style={{ fontWeight: 600, color: 'var(--text)' }}>{info.getValue() ? `$${info.getValue()}` : 'N/A'}</span>,
        }),
    ], []);

    const tableData = activeTab === 'orders' ? (orders || []) : (cart || []);
    const table = useReactTable({ data: tableData, columns, getCoreRowModel: getCoreRowModel() });

    if (loadingUser) return <div className="center"><div className="spinner" /></div>;
    if (!user) return <div className="center">User not found.</div>;

    const handleBlockToggle = () => {
        setConfirm({
            show: true,
            title: user.is_blocked ? 'Unblock User' : 'Block User',
            message: `Are you sure you want to ${user.is_blocked ? 'unblock' : 'block'} ${user.email}?`,
            confirmText: user.is_blocked ? 'Unblock' : 'Block',
            variant: user.is_blocked ? 'success' : 'danger',
            onConfirm: () => blockMut.mutate(!user.is_blocked),
        });
    };

    const handleVerifyToggle = () => {
        setConfirm({
            show: true,
            title: user.is_verified ? 'Unverify User' : 'Verify User',
            message: `Are you sure you want to ${user.is_verified ? 'unverify' : 'verify'} ${user.email}?`,
            confirmText: user.is_verified ? 'Unverify' : 'Verify',
            variant: 'primary',
            onConfirm: () => verifyMut.mutate(!user.is_verified),
        });
    };

    const handlePasswordChange = () => {
        if (!newPassword) return;
        setConfirm({
            show: true,
            title: 'Change Password',
            message: `Are you sure you want to change the password for ${user.email}?`,
            confirmText: 'Change Password',
            variant: 'primary',
            onConfirm: () => passwordMut.mutate(),
        });
    };

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
                {/* <button
                    className={`tab-item ${activeTab === 'cart' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cart')}
                >
                    Shopping Cart
                </button> */}
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

                    <div className="card" style={{ height: 'fit-content' }}>
                        <h3 className="card-title">Administrative Actions</h3>
                        <div className="info-list">
                            <div className="info-item">
                                <label>Access Control</label>
                                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                                    {user.is_blocked
                                        ? 'This user is currently suspended.'
                                        : 'Suspend this user to prevent them from accessing the platform.'}
                                </p>
                                <button
                                    className={`btn ${user.is_blocked ? 'btn-success' : 'btn-danger'} btn-sm`}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    onClick={handleBlockToggle}
                                    disabled={blockMut.isPending}
                                >
                                    {blockMut.isPending ? 'Processing...' : (user.is_blocked ? 'Unblock User Account' : 'Block User Account')}
                                </button>
                            </div>

                            <div className="info-item">
                                <label>Identity Verification</label>
                                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                                    {user.is_verified
                                        ? 'This user has been verified.'
                                        : 'Manually verify this user if they meet requirements.'}
                                </p>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ width: '100%', border: '1px solid var(--border)', justifyContent: 'center' }}
                                    onClick={handleVerifyToggle}
                                    disabled={verifyMut.isPending}
                                >
                                    {verifyMut.isPending ? 'Processing...' : (user.is_verified ? 'Unverify Account' : 'Verify Account')}
                                </button>
                            </div>

                            <div className="info-item">
                                <label>Security Management</label>
                                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                                    Update the user password if they have lost access.
                                </p>
                                {!isChangingPassword ? (
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ width: '100%', border: '1px solid var(--border)', justifyContent: 'center' }}
                                        onClick={() => setIsChangingPassword(true)}
                                    >
                                        Change Password
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                                        <input
                                            type="password"
                                            placeholder="Enter new password"
                                            className="form-input"
                                            style={{ height: 36, fontSize: 13 }}
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                        />
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handlePasswordChange} disabled={passwordMut.isPending || !newPassword}>
                                                Save
                                            </button>
                                            <button className="btn btn-ghost btn-sm" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={() => setIsChangingPassword(false)}>
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(activeTab === 'orders' || activeTab === 'cart') && (
                <div className="table-wrap" style={{ marginTop: 24 }}>
                    <table>
                        <thead>
                            {table.getHeaderGroups().map(hg => (
                                <tr key={hg.id}>
                                    {hg.headers.map(h => (
                                        <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {(activeTab === 'orders' ? loadingOrders : loadingCart) ? (
                                <tr>
                                    <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px 0' }}>
                                        <div className="spinner" style={{ margin: '0 auto' }} />
                                    </td>
                                </tr>
                            ) : tableData.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                                        No {activeTab === 'orders' ? 'orders' : 'items'} found.
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id}>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmModal
                {...confirm}
                onCancel={() => setConfirm(prev => ({ ...prev, show: false }))}
                isLoading={blockMut.isPending || verifyMut.isPending || passwordMut.isPending}
            />
        </div>
    );
}
