import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { getUsers, updateUserBlock, updateUserVerify } from '../api';
import ActionMenu from '../components/ActionMenu';

interface UserRow {
    id: string;
    full_name: string;
    email: string;
    is_verified: boolean;
    is_blocked: boolean;
    created_at: string;
}

const col = createColumnHelper<UserRow>();

export default function UsersPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const limit = 10;

    const { data, isLoading } = useQuery({
        queryKey: ['users', page, search],
        queryFn: () => getUsers(page, limit, search).then(res => res.data.data),
    });

    const blockMut = useMutation({
        mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) => updateUserBlock(id, blocked),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    });

    const verifyMut = useMutation({
        mutationFn: ({ id, verified }: { id: string; verified: boolean }) => updateUserVerify(id, verified),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    });

    const columns = useMemo(() => [
        col.accessor('full_name', {
            header: 'Name',
            cell: info => {
                const user = info.row.original;
                const displayName = info.getValue() || user.email.split('@')[0];
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 30, height: 30, borderRadius: '50%', background: 'var(--primary-light)',
                            color: 'var(--primary)', fontSize: 12, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            {displayName[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span style={{ fontWeight: 500 }}>{displayName}</span>
                    </div>
                );
            },
        }),
        col.accessor('email', {
            header: 'Email',
            cell: info => <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{info.getValue()}</span>,
        }),
        col.display({
            id: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <div style={{ display: 'flex', gap: 8 }}>
                        {user.is_blocked ? (
                            <span className="badge badge-error" style={{ fontSize: '10px', padding: '2px 8px' }}>Blocked</span>
                        ) : (
                            <span className={`badge ${user.is_verified ? 'badge-primary' : 'badge-muted'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                                {user.is_verified ? 'Verified' : 'Unverified'}
                            </span>
                        )}
                    </div>
                );
            }
        }),
        col.accessor('created_at', {
            header: 'Joined',
            cell: info => <span style={{ fontSize: 13 }}>{new Date(info.getValue()).toLocaleDateString()}</span>,
        }),
        col.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 4 }}>
                        <ActionMenu
                            items={[
                                {
                                    label: 'View Details',
                                    icon: '👁️',
                                    onClick: () => navigate(`/users/${user.id}`),
                                },
                                {
                                    label: user.is_verified ? 'Unverify User' : 'Verify User',
                                    icon: user.is_verified ? '❌' : '✅',
                                    onClick: () => verifyMut.mutate({ id: user.id, verified: !user.is_verified }),
                                },
                                {
                                    label: user.is_blocked ? 'Unblock User' : 'Block User',
                                    icon: '🚫',
                                    variant: user.is_blocked ? 'success' : 'danger',
                                    onClick: () => {
                                        if (user.is_blocked || confirm(`Are you sure you want to block ${user.email}?`)) {
                                            blockMut.mutate({ id: user.id, blocked: !user.is_blocked });
                                        }
                                    },
                                },
                            ]}
                        />
                    </div>
                );
            }
        }),
    ], [navigate, blockMut, verifyMut]);

    const users = useMemo(() => data?.users || [], [data]);
    const table = useReactTable({
        data: users,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="users-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Users</h1>
                    <p className="page-subtitle">Manage customer accounts and their permissions</p>
                </div>

                <div className="search-wrapper" style={{ maxWidth: 280 }}>
                    <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="search-input"
                        style={{ padding: '8px 12px 8px 34px', fontSize: '13px' }}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            {table.getHeaderGroups().map(hg => (
                                <tr key={hg.id}>
                                    {hg.headers.map(h => (
                                        <th key={h.id}>
                                            {flexRender(h.column.columnDef.header, h.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length} style={{ textAlign: 'center', padding: '60px 0' }}>
                                        <div className="spinner" style={{ margin: '0 auto' }} />
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-dim)', fontSize: 13 }}>
                                        No users found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id}>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {data && data.lastPage > 1 && (
                    <div className="pagination" style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', marginTop: 0, background: 'rgba(255,255,255,0.01)' }}>
                        <button
                            className="btn btn-ghost btn-sm"
                            style={{ height: 28, fontSize: 12 }}
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            Previous
                        </button>
                        <span className="pagination-info" style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 16px' }}>
                            Page {page} of {data.lastPage}
                        </span>
                        <button
                            className="btn btn-ghost btn-sm"
                            style={{ height: 28, fontSize: 12 }}
                            disabled={page === data.lastPage}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
