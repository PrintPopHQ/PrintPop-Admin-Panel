import { useState } from 'react';
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

    // Add modal
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState(ADD_INIT);
    const [addError, setAddError] = useState('');

    // Edit modal
    const [editTarget, setEditTarget] = useState<AdminRow | null>(null);
    const [editForm, setEditForm] = useState(EDIT_INIT);
    const [editError, setEditError] = useState('');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admins'],
        queryFn: () => getAdmins().then(r => r.data.data),
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
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
    });

    const openEdit = (a: AdminRow) => {
        setEditTarget(a);
        setEditForm({ name: a.name, password: '' });
        setEditError('');
    };

    const columns = [
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
                if (a.role === 'super_admin') return null;
                const items = [
                    { icon: '✏️', label: 'Edit', onClick: () => openEdit(a) },
                    ...(a.id !== me?.id ? [{
                        icon: '🗑️', label: 'Delete', variant: 'danger' as const,
                        onClick: () => { if (window.confirm(`Delete admin "${a.name}"?`)) deleteMut.mutate(a.id); },
                        disabled: deleteMut.isPending,
                    }] : []),
                ];
                return <ActionMenu items={items} />;
            },
        }),
    ];

    const admins: AdminRow[] = data ?? [];
    const table = useReactTable({ data: admins, columns, getCoreRowModel: getCoreRowModel() });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Admins</h1>
                    <p className="page-subtitle">Manage admin accounts</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowAdd(true); setAddError(''); setAddForm(ADD_INIT); }}>
                    + Add Admin
                </button>
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
                            {table.getRowModel().rows.length === 0 ? (
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
        </div>
    );
}
