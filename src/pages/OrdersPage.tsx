import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { getAdminOrders } from '../api';
import ActionMenu from '../components/ActionMenu';

interface OrderRow {
    id: string;
    user_email: string;
    payment_status: string;
    total_price: number;
    created_at: string;
}

const col = createColumnHelper<OrderRow>();

export default function OrdersPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [type, setType] = useState('all');
    const limit = 10;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin-orders', page, search, type],
        queryFn: () => getAdminOrders(page, limit, search, type).then(res => res.data.data),
    });

    const handleTabChange = (newType: string) => {
        setType(newType);
        setPage(1);
    };

    const columns = useMemo(() => [
        col.accessor('id', {
            header: 'Order ID',
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
        col.accessor('user_email', {
            header: 'Customer',
            cell: info => <span style={{ fontWeight: 500 }}>{info.getValue()}</span>,
        }),
        col.accessor('payment_status', {
            header: 'Status',
            cell: info => {
                const status = info.getValue();
                return (
                    <span className={`badge ${status === 'PAID' ? 'badge-success' : status === 'PENDING' ? 'badge-warning' : 'badge-muted'}`}>
                        {status}
                    </span>
                );
            }
        }),
        col.accessor('total_price', {
            header: 'Total',
            cell: info => <span style={{ fontWeight: 600 }}>${Number(info.getValue()).toFixed(2)}</span>,
        }),
        col.accessor('created_at', {
            header: 'Date',
            cell: info => <span style={{ color: 'var(--text-muted)' }}>{new Date(info.getValue()).toLocaleDateString()}</span>,
        }),
        col.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const order = row.original;
                return (
                    <ActionMenu
                        items={[
                            { label: 'Order Items', icon: '📦', onClick: () => navigate(`/orders/${order.id}`) },
                        ]}
                    />
                );
            }
        }),
    ], [navigate]);

    const orders = data?.orders || [];
    const table = useReactTable({ data: orders, columns, getCoreRowModel: getCoreRowModel() });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Orders</h1>
                    <p className="page-subtitle">Track and manage customer orders</p>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="search-wrapper" style={{ minWidth: 260 }}>
                        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by Order ID or Email..."
                            className="search-input"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>
            </div>

            <div className="tabs" style={{ marginBottom: 24 }}>
                <button className={`tab-item ${type === 'all' ? 'active' : ''}`} onClick={() => handleTabChange('all')}>All Orders</button>
                <button className={`tab-item ${type === 'guest' ? 'active' : ''}`} onClick={() => handleTabChange('guest')}>Guest Orders</button>
                <button className={`tab-item ${type === 'user' ? 'active' : ''}`} onClick={() => handleTabChange('user')}>User Orders</button>
            </div>

            {isLoading && <div className="center"><div className="spinner" /></div>}
            {isError && <div className="alert alert-error">Failed to load orders.</div>}

            {!isLoading && !isError && (
                <div className="table-wrap">
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
                            {orders.length === 0 ? (
                                <tr><td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No orders found.</td></tr>
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

            {data && data.lastPage > 1 && (
                <div className="pagination">
                    <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                    {[...Array(data.lastPage)].map((_, i) => (
                        <button key={i} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>
                            {i + 1}
                        </button>
                    ))}
                    <button className="page-btn" disabled={page === data.lastPage} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
            )}
        </div>
    );
}
