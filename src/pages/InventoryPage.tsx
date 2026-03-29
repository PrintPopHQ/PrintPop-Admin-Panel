import { useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { listInventory, getInventoryBrands, updateInventory, deleteModel, deleteFile } from '../api';
import ActionMenu from '../components/ActionMenu';
import ConfirmModal from '../components/ConfirmModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface Brand {
    id: string;
    name: string;
}

interface InventoryRecord {
    id: string;
    case_type: string;
    stock_quantity: number;
    reserved_quantity: number;
}

interface ModelItem {
    id: string;
    name: string;
    brand_id: string;
    model_pic?: string;
    case_types: string[];
    brand: Brand;
    inventory: InventoryRecord[];
}

const col = createColumnHelper<ModelItem>();

export default function InventoryPage() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [brandId, setBrandId] = useState('');
    const [limit] = useState(20);
    const [selectedModel, setSelectedModel] = useState<ModelItem | null>(null);
    const [modelToDelete, setModelToDelete] = useState<ModelItem | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const debouncedSearch = useDebounce(search, 500);

    const { data: modelsData, isLoading: isModelsLoading, isError: isModelsError, isFetching: isModelsFetching } = useQuery({
        queryKey: ['inventory', page, debouncedSearch, brandId],
        queryFn: () => listInventory(page, limit, debouncedSearch, brandId).then(r => r.data.data),
        placeholderData: keepPreviousData,
    });

    const { data: brandsData } = useQuery({
        queryKey: ['inventory-brands'],
        queryFn: () => getInventoryBrands().then(r => r.data.data),
    });

    const updateMut = useMutation({
        mutationFn: (data: { model_id: string; case_type: string; stock_quantity: number }) => updateInventory(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['inventory'] });
            toast.success('Inventory updated');
        },
        onError: (err: any) => toast.error(err?.message || err?.response?.data?.message || 'Failed to update inventory'),
    });

    const deleteMutation = useMutation({
        mutationFn: async (model: ModelItem) => {
            // 1. Delete associated image from R2 if it exists
            if (model.model_pic) {
                try {
                    await deleteFile(model.model_pic);
                } catch (err) {
                    console.error('Failed to delete associated R2 image:', err);
                    // Continue deletion even if image cleanup fails
                }
            }
            // 2. Delete model from database
            return deleteModel(model.id);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['inventory'] });
            toast.success('Model deleted successfully');
            setShowDeleteModal(false);
            setModelToDelete(null);
        },
        onError: (err: any) => toast.error(err?.message || 'Failed to delete model'),
    });

    const columns = [
        col.accessor('name', {
            header: 'Model Name',
            cell: info => <span style={{ fontWeight: 600 }}>{info.getValue()}</span>,
        }),
        col.accessor('brand.name', {
            header: 'Brand',
            cell: info => <span className="badge badge-outline">{info.getValue()}</span>,
        }),
        col.accessor('case_types', {
            header: 'Supported Cases',
            cell: info => {
                const types = info.getValue() || [];
                return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {types.map(t => <span key={t} className="badge badge-muted" style={{ fontSize: 10 }}>{t}</span>)}
                    </div>
                );
            },
        }),
        col.display({
            id: 'stock_status',
            header: 'Current Stock',
            cell: ({ row }) => {
                const model = row.original;
                const inventory = model.inventory || [];
                const totalStock = inventory.reduce((sum, item) => sum + item.stock_quantity, 0);
                const outOfStockCount = (model.case_types || []).length - inventory.length;
                
                return (
                    <div style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: totalStock > 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {totalStock} total units
                        </span>
                        {outOfStockCount > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                                {outOfStockCount} types missing stock
                            </div>
                        )}
                    </div>
                );
            },
        }),
        col.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const model = row.original;
                return (
                    <ActionMenu items={[
                        {
                            icon: '📦', label: 'Manage Inventory',
                            onClick: () => setSelectedModel(model),
                        },
                        {
                            icon: '✏️', label: 'Edit Model',
                            onClick: () => navigate(`/inventory/model/edit/${model.id}`),
                        },
                        {
                            icon: '🗑️', label: 'Delete Model',
                            onClick: () => {
                                setModelToDelete(model);
                                setShowDeleteModal(true);
                            },
                        },
                    ]} />
                );
            },
        }),
    ];

    const models = modelsData?.models || modelsData?.inventory || [];
    const brands = (brandsData as Brand[]) || [];

    const table = useReactTable({
        data: models,
        columns,
        getCoreRowModel: getCoreRowModel()
    });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventory</h1>
                    <p className="page-subtitle">Manage stock levels for device models</p>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/inventory/model/add')}>
                        <span>+</span> Add Model
                    </button>
                    <div className="search-wrapper" style={{ minWidth: 260 }}>
                        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by model or brand..."
                            className="search-input"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    <select
                        className="search-input"
                        style={{ 
                            width: 'auto', 
                            minWidth: 150, 
                            paddingLeft: 14, 
                            paddingRight: 36,
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 10px center',
                        }}
                        value={brandId}
                        onChange={(e) => { setBrandId(e.target.value); setPage(1); }}
                    >
                        <option value="">All Brands</option>
                        {brands.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isModelsLoading && !modelsData && <div className="center"><div className="spinner" /></div>}
            {isModelsError && <div className="alert alert-error">Failed to load models.</div>}

            {modelsData && !isModelsError && (
                <>
                    <div className={`table-wrap ${isModelsFetching ? 'fetching' : ''}`}>
                        {isModelsFetching && (
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
                                {models.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                                            No models found.
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

                    {modelsData && modelsData.lastPage > 1 && (
                        <div className="pagination">
                            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                            {[...Array(modelsData.lastPage)].map((_, i) => (
                                <button key={i} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>
                                    {i + 1}
                                </button>
                            ))}
                            <button className="page-btn" disabled={page === modelsData.lastPage} onClick={() => setPage(p => p + 1)}>›</button>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>{modelsData.total} total</span>
                        </div>
                    )}
                </>
            )}

            {/* ── Deletion Confirmation ── */}
            <ConfirmModal
                show={showDeleteModal}
                title="Delete Phone Model?"
                message={`Are you sure you want to delete "${modelToDelete?.name}"? All associated inventory records will also be removed. This action cannot be undone.`}
                onConfirm={() => modelToDelete && deleteMutation.mutate(modelToDelete)}
                onCancel={() => { setShowDeleteModal(false); setModelToDelete(null); }}
                confirmText="Delete Model"
                variant="danger"
                isLoading={deleteMutation.isPending}
            />

            {/* ── Inventory Management Modal ── */}
            {selectedModel && (
                <InventoryModal 
                    model={selectedModel} 
                    onClose={() => setSelectedModel(null)}
                    onUpdate={(caseType, stock) => updateMut.mutate({ model_id: selectedModel.id, case_type: caseType, stock_quantity: stock })}
                    isUpdating={updateMut.isPending}
                />
            )}
        </div>
    );
}

function InventoryModal({ model, onClose, onUpdate, isUpdating }: { model: ModelItem, onClose: () => void, onUpdate: (caseType: string, stock: number) => void, isUpdating: boolean }) {
    const defaultTypes = ['magnetic', 'non_magnetic'];
    const types = (model.case_types && model.case_types.length > 0) ? model.case_types : defaultTypes;

    const [localStock, setLocalStock] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        const inventory = model.inventory || [];
        types.forEach(ct => {
            const record = inventory.find(inv => inv.case_type === ct);
            initial[ct] = record ? record.stock_quantity : 0;
        });
        return initial;
    });

    const [editingType, setEditingType] = useState<string | null>(null);

    const handleSave = (ct: string) => {
        onUpdate(ct, localStock[ct]);
        setEditingType(null);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Manage Inventory</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{model.brand.name} — {model.name}</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', minWidth: 'auto', fontSize: 18 }} onClick={onClose}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {types.map(ct => {
                        const inventory = model.inventory || [];
                        const record = inventory.find(inv => inv.case_type === ct);
                        const isEditing = editingType === ct;

                        const ctLabel = ct.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                        return (
                            <div key={ct} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ctLabel}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Reserved: {record?.reserved_quantity || 0}</div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {isEditing ? (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input
                                                type="number"
                                                className="form-input"
                                                style={{ width: 80, padding: '4px 8px' }}
                                                value={localStock[ct]}
                                                onChange={e => setLocalStock(prev => ({ ...prev, [ct]: parseInt(e.target.value) || 0 }))}
                                                autoFocus
                                            />
                                            <button className="btn btn-primary btn-sm" onClick={() => handleSave(ct)} disabled={isUpdating}>✓</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingType(null)}>✕</button>
                                        </div>
                                    ) : (
                                        <>
                                            <span style={{ fontWeight: 700, fontSize: 15, color: localStock[ct] > 0 ? 'var(--text)' : 'var(--danger)' }}>
                                                {localStock[ct]}
                                            </span>
                                            <button className="btn btn-ghost btn-sm" style={{ padding: '6px' }} onClick={() => setEditingType(ct)}>
                                                ✏️
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
