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

    const { data, isLoading, isError } = useQuery({
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
                if (user.is_blocked) return <span className="badge badge-error">Blocked</span>;
                return user.is_verified
                    ? <span className="badge badge-primary">Verified</span>
                    : <span className="badge badge-muted">Unverified</span>;
            }
        }),
        col.accessor('created_at', {
            header: 'Joined',
            cell: info => new Date(info.getValue()).toLocaleDateString(),
        }),
        col.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <ActionMenu
                        items={[
                            { label: 'View Details', icon: '👁️', onClick: () => navigate(`/users/${user.id}`) },
                            {
                                label: user.is_verified ? 'Unverify' : 'Verify',
                                icon: user.is_verified ? '❌' : '✅',
                                onClick: () => verifyMut.mutate({ id: user.id, verified: !user.is_verified }),
                            },
                            {
                                label: user.is_blocked ? 'Unblock' : 'Block',
                                icon: '🚫',
                                variant: user.is_blocked ? 'success' : 'danger',
                                onClick: () => {
                                    if (user.is_blocked || confirm(`Block ${user.email}?`)) {
                                        blockMut.mutate({ id: user.id, blocked: !user.is_blocked });
                                    }
                                },
                            },
                        ]}
                    />
                );
            }
        }),
    ], [navigate, blockMut, verifyMut]);

    const users = data?.users || [];
    const table = useReactTable({ data: users, columns, getCoreRowModel: getCoreRowModel() });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Users</h1>
                    <p className="page-subtitle">Manage customer accounts</p>
                </div>

                <div className="search-wrapper" style={{ maxWidth: 300 }}>
                    <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="search-input"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
            </div>

            {isLoading && <div className="center"><div className="spinner" /></div>}
            {isError && <div className="alert alert-error">Failed to load users.</div>}

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
                            {users.length === 0 ? (
                                <tr><td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No users found.</td></tr>
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
