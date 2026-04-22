import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { getAdminOrderById, updateOrderTracking } from '../api';
import ActionMenu from '../components/ActionMenu';
import { toast } from 'react-hot-toast';

const col = createColumnHelper<any>();

export default function OrderDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const qc = useQueryClient();
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [localTrackingId, setLocalTrackingId] = useState('');

    const backPath = location.state?.from || '/orders';

    const { data: order, isLoading, isError } = useQuery({
        queryKey: ['admin-order', id],
        queryFn: () => getAdminOrderById(id!).then(res => res.data.data),
        enabled: !!id,
    });

    useEffect(() => {
        if (order?.tracking_id) {
            setLocalTrackingId(order.tracking_id);
        }
    }, [order]);

    const trackingMutation = useMutation({
        mutationFn: () => updateOrderTracking(id!, localTrackingId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-order', id] });
            toast.success('Order tracking updated and customer notified');
        },
        onError: (err: any) => {
            toast.error(err?.message || 'Failed to update tracking');
        }
    });

    const columns = [
        col.accessor('model.name', {
            header: 'Item Model',
            cell: info => {
                const item = info.row.original;
                const img = item.custom_image_url || item.model?.model_pic;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
                            <img
                                src={img}
                                alt=""
                                style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }}
                            />
                            <button
                                onClick={() => setPreviewImage(img)}
                                style={{
                                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                                    opacity: 0, borderRadius: 8, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', transition: '0.2s', border: 'none', cursor: 'pointer'
                                }}
                                className="preview-hover-btn"
                                title="Preview Image"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500 }}>{info.getValue() || 'Custom Item'}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                                {item.material?.replace('_', ' ')} Case
                            </span>
                        </div>
                    </div>
                );
            }
        }),
        col.accessor('quantity', {
            header: 'Qty',
            cell: info => <span style={{ fontWeight: 600 }}>x{info.getValue()}</span>,
        }),
        col.accessor('model_id', {
            header: 'Model ID',
            cell: info => <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'monospace' }}>{info.getValue()?.split('-')[0]}...</span>,
        }),
        col.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const item = row.original;
                const img = item.custom_image_url || item.model?.model_pic;
                return (
                    <ActionMenu
                        items={[
                            {
                                label: 'Preview Item',
                                icon: '👁️',
                                onClick: () => setPreviewImage(img),
                            },
                            ...(item.design_image_url ? [{
                                label: 'View Final Design',
                                icon: '🎨',
                                onClick: () => setPreviewImage(item.design_image_url),
                            }] : [])
                        ]}
                    />
                );
            }
        }),
    ];

    const table = useReactTable({
        data: order?.items || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (isLoading) return <div className="center"><div className="spinner" /></div>;
    if (isError || !order) return <div className="center">Order not found.</div>;

    const shipping = order.shipping_address || {};
    const shippingDetails = order.shipping_details || {};
    const billing = order.billing_address || shipping;
    // For billing details, we might not have 'billing_details' from backend, so fallback to shippingDetails
    const billingDetails = order.billing_details || shippingDetails;

    return (
        <div className="order-details-page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(backPath)}>
                        ← Back
                    </button>
                    <div>
                        <h1 className="page-title">Order Details</h1>
                        <p className="page-subtitle">#{order.id.split('-')[0]} • {order.user_email}</p>
                    </div>
                </div>
                <span className={`badge ${order.payment_status === 'PAID' ? 'badge-success' : 'badge-warning'}`} style={{ padding: '6px 14px', fontSize: 12 }}>
                    {order.payment_status}
                </span>
            </div>

            <div className="grid-2-col" style={{ marginBottom: 24 }}>
                <div className="card">
                    <h3 className="card-title">Order Summary</h3>
                    <div className="info-list">
                        <div className="info-item">
                            <label>Payment Method</label>
                            <span>{order.payment_method || 'Stripe'}</span>
                        </div>
                        <div className="info-item">
                            <label>Payment Status</label>
                            <span>{order.payment_status || 'PAID'}</span>
                        </div>
                        <div className="info-item">
                            <label>Shipping Method</label>
                            <span>{shippingDetails.shippingMethodName || order.shipping_method || 'Standard Shipping'}</span>
                        </div>
                        <div className="info-item">
                            <label>Placed On</label>
                            <span>{new Date(order.created_at).toLocaleString()}</span>
                        </div>
                        {order.coupon_details && (
                            <div className="info-item" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                                <label>Coupon Code</label>
                                <span className="badge badge-sm" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                                    {order.coupon_details.code} 
                                    ({order.coupon_details.percent_off ? `${order.coupon_details.percent_off}% off` : `$${order.coupon_details.amount_off} off`})
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <h3 className="card-title">Customer Information</h3>
                    <div className="info-list">
                        <div className="info-item">
                            <label>Email Address</label>
                            <span>{order.user_email}</span>
                        </div>
                        <div className="info-item">
                            <label>User ID</label>
                            <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{order.user_id || 'Guest'}</span>
                        </div>
                        <div className="info-item">
                            <label>Total Amount</label>
                            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>${Number(order.total_price).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-2-col" style={{ marginBottom: 24 }}>
                <div className="card">
                    <h3 className="card-title">Shipping Address</h3>
                    <div className="info-list" style={{ gap: 8 }}>
                        <p style={{ fontWeight: 600 }}>{shippingDetails.firstName} {shippingDetails.lastName}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{shipping.streetAddress1}</p>
                        {shipping.streetAddress2 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{shipping.streetAddress2}</p>}
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                            {shipping.suburb}, {shipping.state} {shipping.postal}
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{shipping.country}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{shippingDetails.phone}</p>
                    </div>
                </div>

                <div className="card">
                    <h3 className="card-title">Billing Address</h3>
                    <div className="info-list" style={{ gap: 8 }}>
                        <p style={{ fontWeight: 600 }}>{billingDetails.firstName} {billingDetails.lastName}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{billing.streetAddress1}</p>
                        {billing.streetAddress2 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{billing.streetAddress2}</p>}
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                            {billing.suburb}, {billing.state} {billing.postal}
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{billing.country}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{billingDetails.phone}</p>
                    </div>
                </div>
            </div>

            <div className="grid-1-col" style={{ marginBottom: 24 }}>
                <div className="card">
                    <h3 className="card-title">Fulfillment & Tracking</h3>
                    <div className="info-list" style={{ gap: 16 }}>
                        <div className="info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                            <label>Tracking ID</label>
                            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    style={{ flex: 1 }}
                                    placeholder="Enter tracking ID..."
                                    value={localTrackingId}
                                    onChange={(e) => setLocalTrackingId(e.target.value)}
                                />
                                <button 
                                    className="btn btn-primary" 
                                    style={{ whiteSpace: 'nowrap' }}
                                    onClick={() => trackingMutation.mutate()}
                                    disabled={trackingMutation.isPending || (!localTrackingId && !order?.tracking_id)}
                                >
                                    {trackingMutation.isPending ? 'Updating...' : order?.tracking_id ? 'Update Tracking' : 'Mark as Dispatched'}
                                </button>
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                                Entering a tracking ID will notify the customer via email that their order has been dispatched.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

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
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {previewImage && (
                <div className="modal-overlay" onClick={() => setPreviewImage(null)} style={{ background: 'rgba(0,0,0,0.8)' }}>
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                        <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, boxShadow: 'var(--shadow)' }} />
                        <button
                            onClick={() => setPreviewImage(null)}
                            style={{ position: 'absolute', top: -40, right: 0, background: 'none', border: 'none', color: 'white' }}
                        >
                            Close ✕
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .preview-hover-btn:hover { opacity: 1 !important; }
            `}</style>
        </div>
    );
}
