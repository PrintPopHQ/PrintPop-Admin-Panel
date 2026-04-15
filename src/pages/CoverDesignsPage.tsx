import { useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { getAdminCoverDesigns, createAdminCoverDesign, updateAdminCoverDesign, deleteAdminCoverDesign, uploadImage, deleteFile } from '../api';
import ActionMenu from '../components/ActionMenu';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'react-hot-toast';

interface CoverDesign {
    id: string;
    name: string;
    image_url: string;
    design_image_url: string;
    created_at: string;
}

interface DesignForm {
    name: string;
    image_url: string;
    design_image_url: string;
}

const INIT_FORM: DesignForm = {
    name: '',
    image_url: '',
    design_image_url: '',
};

const col = createColumnHelper<CoverDesign>();

export default function CoverDesignsPage() {
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<DesignForm>(INIT_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [uploadingField, setUploadingField] = useState<'image_url' | 'design_image_url' | null>(null);
    const [sessionImages, setSessionImages] = useState<string[]>([]);
    const [designToDelete, setDesignToDelete] = useState<CoverDesign | null>(null);

    const debouncedSearch = useDebounce(search, 500);

    const { data, isLoading, isError, isFetching } = useQuery({
        queryKey: ['cover-designs', page, debouncedSearch],
        queryFn: () => getAdminCoverDesigns(page, limit, debouncedSearch).then(r => r.data.data),
        placeholderData: keepPreviousData,
    });

    const designs = data?.designs || [];
    const lastPage = data?.lastPage || 1;

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteAdminCoverDesign(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['cover-designs'] });
            setDesignToDelete(null);
            toast.success('Design deleted successfully');
        },
        onError: (err: any) => toast.error(err?.message || 'Failed to delete design'),
    });

    const saveMut = useMutation({
        mutationFn: (payload: any) => {
            if (editingId) return updateAdminCoverDesign(editingId, payload);
            return createAdminCoverDesign(payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['cover-designs'] });
            setShowModal(false);
            setForm(INIT_FORM);
            setEditingId(null);
            toast.success(`Design ${editingId ? 'updated' : 'created'} successfully`);
        },
        onError: (err: any) => toast.error(err?.message || 'Failed to save design'),
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'design_image_url') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingField(field);
        try {
            const res = await uploadImage(file);
            const newUrl = res.data.data.url;

            // If we already uploaded an image in THIS session for this field, delete the old one
            const currentVal = form[field];
            if (currentVal && sessionImages.includes(currentVal)) {
                deleteFile(currentVal).catch(console.error);
                setSessionImages(prev => prev.filter(u => u !== currentVal));
            }

            setForm(f => ({ ...f, [field]: newUrl }));
            setSessionImages(prev => [...prev, newUrl]);
            toast.success('Image uploaded successfully');
        } catch (err) {
            toast.error('Image upload failed');
        } finally {
            setUploadingField(null);
            if (e.target) e.target.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form,
        };
        saveMut.mutate(payload, {
            onSuccess: () => {
                setSessionImages([]); // Clear session images on successful save
            }
        });
    };

    const handleEdit = (design: CoverDesign) => {
        setEditingId(design.id);
        setForm({
            name: design.name,
            image_url: design.image_url,
            design_image_url: design.design_image_url,
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        // Delete all images uploaded in this session that weren't saved
        if (sessionImages.length > 0) {
            sessionImages.forEach(url => deleteFile(url).catch(console.error));
        }
        setSessionImages([]);
        setShowModal(false);
        setForm(INIT_FORM);
        setEditingId(null);
    };

    const columns = [
        col.accessor('image_url', {
            header: 'Preview',
            cell: info => (
                <img 
                    src={info.getValue()} 
                    alt="Preview" 
                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)' }} 
                />
            ),
        }),
        col.accessor('name', {
            header: 'Name',
            cell: info => <span style={{ fontWeight: 600 }}>{info.getValue()}</span>,
        }),
        col.accessor('created_at', {
            header: 'Created',
            cell: info => new Date(info.getValue()).toLocaleDateString(),
        }),
        col.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const d = row.original;
                return (
                    <ActionMenu items={[
                        {
                            icon: '✏️', label: 'Edit',
                            onClick: () => handleEdit(d),
                        },
                        {
                            icon: '🗑️', label: 'Delete', variant: 'danger',
                            onClick: () => setDesignToDelete(d),
                            disabled: deleteMut.isPending,
                        },
                    ]} />
                );
            },
        }),
    ];

    const table = useReactTable({
        data: designs,
        columns,
        getCoreRowModel: getCoreRowModel()
    });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Cover Designs</h1>
                    <p className="page-subtitle">Manage phone case designs and templates</p>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="search-wrapper" style={{ minWidth: 260 }}>
                        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search designs..."
                            className="search-input"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => {
                        setEditingId(null);
                        setForm(INIT_FORM);
                        setSessionImages([]);
                        setShowModal(true);
                    }}>
                        + New Design
                    </button>
                </div>
            </div>

            {isLoading && !data && <div className="center"><div className="spinner" /></div>}
            {isError && <div className="alert alert-error">Failed to load cover designs.</div>}

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
                                {table.getRowModel().rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                                            No designs found.
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

                    {lastPage > 1 && (
                        <div className="pagination">
                            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                            {[...Array(lastPage)].map((_, i) => (
                                <button
                                    key={i}
                                    className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                                    onClick={() => setPage(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button className="page-btn" disabled={page === lastPage} onClick={() => setPage(p => p + 1)}>›</button>
                        </div>
                    )}
                </>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editingId ? 'Edit Design' : 'New Design'}</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input
                                    className="form-input"
                                    required
                                    placeholder="e.g. Cyberpunk Neon"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div className="grid-2-col">
                                <div className="form-group">
                                    <label className="form-label">Display Image</label>
                                    <div className="flex-col gap-2">
                                        <input
                                            className="form-input"
                                            placeholder="URL or upload →"
                                            value={form.image_url}
                                            onChange={e => setForm({ ...form, image_url: e.target.value })}
                                        />
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button 
                                                type="button" 
                                                className="btn btn-ghost btn-sm w-full" 
                                                onClick={() => {
                                                    const input = document.createElement('input');
                                                    input.type = 'file';
                                                    input.accept = 'image/*';
                                                    input.onchange = (e: any) => handleImageUpload(e, 'image_url');
                                                    input.click();
                                                }}
                                                disabled={uploadingField === 'image_url'}
                                            >
                                                {uploadingField === 'image_url' ? 'Uploading...' : 'Upload Image'}
                                            </button>
                                        </div>
                                    </div>
                                    {form.image_url && (
                                        <img src={form.image_url} alt="Preview" style={{ marginTop: 8, height: 120, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)' }} />
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Design Layer (PNG)</label>
                                    <div className="flex-col gap-2">
                                        <input
                                            className="form-input"
                                            placeholder="URL or upload →"
                                            value={form.design_image_url}
                                            onChange={e => setForm({ ...form, design_image_url: e.target.value })}
                                        />
                                        <button 
                                            type="button" 
                                            className="btn btn-ghost btn-sm w-full" 
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = (e: any) => handleImageUpload(e, 'design_image_url');
                                                input.click();
                                            }}
                                            disabled={uploadingField === 'design_image_url'}
                                        >
                                            {uploadingField === 'design_image_url' ? 'Uploading...' : 'Upload PNG'}
                                        </button>
                                    </div>
                                    {form.design_image_url && (
                                        <img src={form.design_image_url} alt="Preview" style={{ marginTop: 8, height: 120, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)', background: '#222' }} />
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saveMut.isPending || !!uploadingField}>
                                    {saveMut.isPending ? 'Saving...' : 'Save Design'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                show={!!designToDelete}
                title="Delete Design"
                message={`Are you sure you want to delete "${designToDelete?.name}"? This will also remove the images from storage and cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                isLoading={deleteMut.isPending}
                onConfirm={() => designToDelete && deleteMut.mutate(designToDelete.id)}
                onCancel={() => setDesignToDelete(null)}
            />
        </div>
    );
}
