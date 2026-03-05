import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { getAdmins, addAdmin, updateAdmin, deleteAdmin } from '../api';
import { useAuth } from '../context/AuthContext';
import ActionMenu from '../components/ActionMenu';
import ConfirmModal from '../components/ConfirmModal';

interface AdminRow {
    id: string;
    name: string;
    email: string;
    role: 'super_admin' | 'admin';
    created_at: string;
}

const col = createColumnHelper<AdminRow>();
const ADD_INIT = { name: '', email: '', password: '' };
const EDIT_INIT = { name: '', password: '' };

export default function AdminsPage() {
    const { admin: me } = useAuth();
    const qc = useQueryClient();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const limit = 10;

    // Modal states
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState(ADD_INIT);
    const [addError, setAddError] = useState('');

    const [editTarget, setEditTarget] = useState<AdminRow | null>(null);
    const [editForm, setEditForm] = useState(EDIT_INIT);
    const [editError, setEditError] = useState('');

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

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admins', page, search],
        queryFn: () => getAdmins(page, limit, search).then(r => r.data.data),
    });

    const addMut = useMutation({
        mutationFn: () => addAdmin(addForm),
        onSuccess: (res) => {
            if (res.data.responseCode === 2000) {
                qc.invalidateQueries({ queryKey: ['admins'] });
                setAddForm(ADD_INIT);
                setShowAdd(false);
            } else {
                setAddError(res.data.message);
            }
        },
        onError: (err: any) => setAddError(err?.response?.data?.message || 'Failed to add admin'),
    });

    const editMut = useMutation({
        mutationFn: () => {
            const payload: { name?: string; password?: string } = {};
            if (editForm.name) payload.name = editForm.name;
            if (editForm.password) payload.password = editForm.password;
            return updateAdmin(editTarget!.id, payload);
        },
        onSuccess: (res) => {
            if (res.data.responseCode === 2000) {
                qc.invalidateQueries({ queryKey: ['admins'] });
                setEditTarget(null);
                setEditForm(EDIT_INIT);
            } else {
                setEditError(res.data.message);
            }
        },
        onError: (err: any) => setEditError(err?.response?.data?.message || 'Failed to update admin'),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteAdmin(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admins'] });
            setConfirm(prev => ({ ...prev, show: false }));
        },
    });

    const openEdit = (a: AdminRow) => {
        setEditTarget(a);
        setEditForm({ name: a.name, password: '' });
        setEditError('');
    };

    const columns = useMemo(() => [
        col.accessor('name', {
            header: 'Name',
            cell: info => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: '50%', background: 'var(--primary-light)',
                        color: 'var(--primary)', fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        {info.getValue()?.[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500 }}>{info.getValue()}</span>
                </div>
            ),
        }),
        col.accessor('email', {
            header: 'Email',
            cell: info => <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{info.getValue()}</span>,
        }),
        col.accessor('role', {
            header: 'Role',
            cell: info =>
                info.getValue() === 'super_admin'
                    ? <span className="badge badge-primary">Super Admin</span>
                    : <span className="badge badge-muted">Admin</span>,
        }),
        col.accessor('created_at', {
            header: 'Joined',
            cell: info => new Date(info.getValue()).toLocaleDateString(),
        }),
        col.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const a = row.original;
                // Super Admins cannot be edited or deleted
                if (a.role === 'super_admin') return null;

                // Don't allow deleting self
                const isSelf = a.id === me?.id;
                const items = [
                    { icon: '✏️', label: 'Edit', onClick: () => openEdit(a) },
                    ...(!isSelf ? [{
                        icon: '🗑️', label: 'Delete', variant: 'danger' as const,
                        onClick: () => {
                            setConfirm({
                                show: true,
                                title: 'Delete Admin',
                                message: `Are you sure you want to PERMANENTLY delete the admin "${a.name}"? This action cannot be undone.`,
                                confirmText: 'Delete Admin',
                                variant: 'danger',
                                onConfirm: () => deleteMut.mutate(a.id),
                            });
                        },
                        disabled: deleteMut.isPending,
                    }] : []),
                ];
                return (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <ActionMenu items={items} />
                    </div>
                );
            },
        }),
    ], [me, deleteMut]);

    const admins: AdminRow[] = data?.admins ?? [];
    const table = useReactTable({ data: admins, columns, getCoreRowModel: getCoreRowModel() });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Admins</h1>
                    <p className="page-subtitle">Manage admin accounts</p>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="search-wrapper" style={{ minWidth: 260 }}>
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
                    <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => { setShowAdd(true); setAddError(''); setAddForm(ADD_INIT); }}>
                        + Add Admin
                    </button>
                </div>
            </div>

            {isLoading && <div className="center"><div className="spinner" /></div>}
            {isError && <div className="alert alert-error">Failed to load admins.</div>}

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
                            {admins.length === 0 ? (
                                <tr><td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No admins found.</td></tr>
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

            {/* ── Add Admin Modal ── */}
            {showAdd && (
                <div className="modal-overlay" onClick={() => setShowAdd(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Add New Admin</h2>
                        {addError && <div className="alert alert-error">{addError}</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input className="form-input" placeholder="John Doe"
                                    value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" placeholder="john@printpop.com"
                                    value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input className="form-input" type="password" placeholder="Min 6 characters"
                                    value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => addMut.mutate()}
                                disabled={addMut.isPending || !addForm.name || !addForm.email || !addForm.password}>
                                {addMut.isPending ? 'Adding…' : 'Add Admin'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Admin Modal ── */}
            {editTarget && (
                <div className="modal-overlay" onClick={() => setEditTarget(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Edit Admin</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                            Editing <strong>{editTarget.email}</strong>
                        </p>
                        {editError && <div className="alert alert-error">{editError}</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input className="form-input" placeholder="New name"
                                    value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">New Password <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(leave blank to keep current)</span></label>
                                <input className="form-input" type="password" placeholder="Min 6 characters"
                                    value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => editMut.mutate()}
                                disabled={editMut.isPending || (!editForm.name && !editForm.password)}>
                                {editMut.isPending ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmModal
                {...confirm}
                onCancel={() => setConfirm(prev => ({ ...prev, show: false }))}
                isLoading={deleteMut.isPending}
            />
        </div>
    );
}
