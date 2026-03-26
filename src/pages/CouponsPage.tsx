import { useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { listCoupons, deleteCoupon, createCoupon } from '../api';
import ActionMenu from '../components/ActionMenu';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'react-hot-toast';

interface Coupon {
    id: string;
    name: string | null;
    percent_off: number | null;
    amount_off: number | null;
    currency: string | null;
    duration: 'forever' | 'once' | 'repeating';
    duration_in_months: number | null;
    created: number;
    valid: boolean;
}

interface CouponForm {
    id: string;
    name: string;
    amount_off: string;
    percent_off: string;
    duration: 'forever' | 'once' | 'repeating';
    duration_in_months: string;
    currency: string;
}

const INIT_FORM: CouponForm = {
    id: '',
    name: '',
    amount_off: '',
    percent_off: '',
    duration: 'forever',
    duration_in_months: '',
    currency: 'aud',
};

const col = createColumnHelper<Coupon>();

export default function CouponsPage() {
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [limit] = useState(20);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [form, setForm] = useState<CouponForm>(INIT_FORM);
    const [confirm, setConfirm] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        show: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const debouncedSearch = useDebounce(search, 500);

    const { data, isLoading, isError, isFetching } = useQuery({
        queryKey: ['coupons', page, debouncedSearch],
        queryFn: () => listCoupons(page, limit, debouncedSearch).then(r => r.data.data),
        placeholderData: keepPreviousData,
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteCoupon(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['coupons'] });
            toast.success('Coupon deleted');
        },
        onError: (err: any) => toast.error(err?.message || err?.response?.data?.message || 'Failed to delete coupon'),
    });

    const createMut = useMutation({
        mutationFn: (data: any) => createCoupon(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['coupons'] });
            setShowCreateModal(false);
            setForm(INIT_FORM);
            toast.success('Coupon created');
        },
        onError: (err: any) => toast.error(err?.message || err?.response?.data?.message || 'Failed to create coupon'),
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (form.percent_off) {
            const percent = parseFloat(form.percent_off);
            if (isNaN(percent) || percent < 0 || percent > 100) {
                toast.error('Percentage must be between 0 and 100');
                return;
            }
        }

        const payload: any = {
            duration: form.duration,
            name: form.name || undefined,
            id: form.id || undefined,
            currency: form.currency,
        };

        if (form.amount_off) {
            payload.amount_off = Math.round(parseFloat(form.amount_off) * 100);
        } else if (form.percent_off) {
            payload.percent_off = parseFloat(form.percent_off);
        }

        if (form.duration === 'repeating') {
            payload.duration_in_months = parseInt(form.duration_in_months);
        }

        createMut.mutate(payload);
    };

    const setField = (k: keyof CouponForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = e.target.value;
        setForm(f => {
            const next = { ...f, [k]: val };
            if (k === 'amount_off' && val) next.percent_off = '';
            if (k === 'percent_off' && val) next.amount_off = '';
            return next;
        });
    };

    const isSubmittable = (form.amount_off || form.percent_off) &&
        (form.duration !== 'repeating' || (form.duration_in_months && parseInt(form.duration_in_months) > 0));

    const columns = [
        col.accessor('id', {
            header: 'ID',
            cell: info => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{info.getValue()}</span>,
        }),
        col.accessor('name', {
            header: 'Name',
            cell: info => info.getValue() || <span style={{ color: 'var(--text-dim)' }}>—</span>,
        }),
        col.display({
            id: 'discount',
            header: 'Discount',
            cell: ({ row }) => {
                const c = row.original;
                if (c.percent_off) return `${c.percent_off}% off`;
                if (c.amount_off) return `${(c.amount_off / 100).toFixed(2)} ${c.currency?.toUpperCase()} off`;
                return '—';
            },
        }),
        col.accessor('duration', {
            header: 'Duration',
            cell: info => {
                const d = info.getValue();
                const months = info.row.original.duration_in_months;
                if (d === 'repeating' && months) return `Repeating (${months}mo)`;
                return d.charAt(0).toUpperCase() + d.slice(1);
            },
        }),
        col.accessor('created', {
            header: 'Created',
            cell: info => new Date(info.getValue() * 1000).toLocaleDateString(),
        }),
        col.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const c = row.original;
                return (
                    <ActionMenu items={[
                        {
                            icon: '🗑️', label: 'Delete', variant: 'danger',
                            onClick: () => {
                                setConfirm({
                                    show: true,
                                    title: 'Delete Coupon',
                                    message: `Are you sure you want to delete coupon "${c.id}"? This action cannot be undone.`,
                                    onConfirm: () => {
                                        deleteMut.mutate(c.id);
                                        setConfirm(prev => ({ ...prev, show: false }));
                                    }
                                });
                            },
                            disabled: deleteMut.isPending,
                        },
                    ]} />
                );
            },
        }),
    ];

    const coupons = data?.coupons || [];
    const table = useReactTable({
        data: coupons,
        columns,
        getCoreRowModel: getCoreRowModel()
    });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Coupons</h1>
                    <p className="page-subtitle">Manage Stripe discount coupons</p>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="search-wrapper" style={{ minWidth: 260 }}>
                        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by ID, name, discount or duration..."
                            className="search-input"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); }}
                        />
                    </div>
                    <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => {
                        setForm(INIT_FORM);
                        setShowCreateModal(true);
                    }}>
                        + New Coupon
                    </button>
                </div>
            </div>

            {isLoading && !data && <div className="center"><div className="spinner" /></div>}
            {isError && <div className="alert alert-error">Failed to load coupons.</div>}

            {data && !isError && (
                <>
                    <div className={`table-wrap ${isFetching ? 'fetching' : ''}`}>
                        {isFetching && (
                            <div className="table-loader-overlay">
                                <div className="spinner-sm" />
                            </div>
                        )}
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
                                {coupons.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                                            No coupons found.
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

                    {data && data.lastPage > 1 && (
                        <div className="pagination">
                            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                            {[...Array(data.lastPage)].map((_, i) => (
                                <button key={i} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>
                                    {i + 1}
                                </button>
                            ))}
                            <button className="page-btn" disabled={page === data.lastPage} onClick={() => setPage(p => p + 1)}>›</button>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>{data.total} total</span>
                        </div>
                    )}
                </>
            )}

            {/* ── Create Coupon Modal ── */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div
                        className="modal"
                        style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700 }}>New Coupon</h2>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', minWidth: 'auto', fontSize: 18 }} onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label className="form-label">Coupon ID (Optional)</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. SUMMER2024"
                                    value={form.id}
                                    onChange={setField('id')}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Internal Name (Optional)</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. Summer Sale 20%"
                                    value={form.name}
                                    onChange={setField('name')}
                                />
                            </div>

                            <div className="grid-2-col">
                                <div className="form-group">
                                    <label className="form-label">Amount Off ({form.currency.toUpperCase()})</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        placeholder="0.00"
                                        disabled={!!form.percent_off}
                                        value={form.amount_off}
                                        onChange={setField('amount_off')}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Percent Off (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="form-input"
                                        placeholder="20"
                                        disabled={!!form.amount_off}
                                        value={form.percent_off}
                                        onChange={setField('percent_off')}
                                    />
                                </div>
                            </div>

                            {form.amount_off && (
                                <div className="form-group">
                                    <label className="form-label">Currency</label>
                                    <select className="form-input" value={form.currency} onChange={setField('currency')}>
                                        <option value="aud">AUD</option>
                                        <option value="usd">USD</option>
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Duration</label>
                                <select className="form-input" value={form.duration} onChange={setField('duration')}>
                                    <option value="forever">Forever (Multiple orders)</option>
                                    <option value="once">Once (Single order)</option>
                                    <option value="repeating">Repeating (Specific number of months)</option>
                                </select>
                            </div>

                            {form.duration === 'repeating' && (
                                <div className="form-group">
                                    <label className="form-label">Duration in Months</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="e.g. 3"
                                        value={form.duration_in_months}
                                        onChange={setField('duration_in_months')}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={createMut.isPending || !isSubmittable}
                                >
                                    {createMut.isPending ? 'Creating...' : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* ── Confirm Modal ── */}
            <ConfirmModal
                show={confirm.show}
                title={confirm.title}
                message={confirm.message}
                variant="danger"
                confirmText="Delete"
                onConfirm={confirm.onConfirm}
                onCancel={() => setConfirm(prev => ({ ...prev, show: false }))}
                isLoading={deleteMut.isPending}
            />
        </div>
    );
}
