import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import DOMPurify from 'dompurify';
import { getBlogs, deleteBlog, publishBlog, unpublishBlog } from '../api';
import ActionMenu from '../components/ActionMenu';
import '../pages/BlogFormPage.css';

interface Blog {
    id: string;
    title: string;
    slug: string;
    content: string;
    author_name: string;
    added_by: string;
    cover_image: string;
    is_published: boolean;
    created_at: string;
}

const col = createColumnHelper<Blog>();

export default function BlogsPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [preview, setPreview] = useState<Blog | null>(null);
    const limit = 10;

    const published =
        filter === 'published' ? true : filter === 'draft' ? false : undefined;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['blogs', page, filter],
        queryFn: () => getBlogs(page, limit, published).then(r => r.data.data),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteBlog(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['blogs'] }),
    });

    const publishMut = useMutation({
        mutationFn: ({ id, pub }: { id: string; pub: boolean }) =>
            pub ? publishBlog(id) : unpublishBlog(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['blogs'] }),
    });

    const columns = [
        col.accessor('title', {
            header: 'Title',
            cell: info => (
                <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)' }}>{info.getValue()}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{info.row.original.slug}</p>
                </div>
            ),
        }),
        col.accessor('author_name', {
            header: 'Author',
            cell: info => info.getValue() || <span style={{ color: 'var(--text-dim)' }}>—</span>,
        }),
        col.accessor('added_by', {
            header: 'Added By',
            cell: info => (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{info.getValue() || '—'}</span>
            ),
        }),
        col.accessor('is_published', {
            header: 'Status',
            cell: info =>
                info.getValue()
                    ? <span className="badge badge-success">● Published</span>
                    : <span className="badge badge-warning">○ Draft</span>,
        }),
        col.accessor('created_at', {
            header: 'Created',
            cell: info => new Date(info.getValue()).toLocaleDateString(),
        }),
        col.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const b = row.original;
                return (
                    <ActionMenu items={[
                        { icon: '👁️', label: 'Preview', onClick: () => setPreview(b) },
                        { icon: '✏️', label: 'Edit', onClick: () => navigate(`/blogs/${b.id}/edit`) },
                        {
                            icon: b.is_published ? '🔴' : '🟢',
                            label: b.is_published ? 'Unpublish' : 'Publish',
                            variant: b.is_published ? 'default' : 'success',
                            onClick: () => publishMut.mutate({ id: b.id, pub: !b.is_published }),
                            disabled: publishMut.isPending,
                        },
                        {
                            icon: '🗑️', label: 'Delete', variant: 'danger',
                            onClick: () => { if (window.confirm(`Delete "${b.title}"?`)) deleteMut.mutate(b.id); },
                            disabled: deleteMut.isPending,
                        },
                    ]} />
                );
            },
        }),
    ];

    const blogs: Blog[] = data?.blogs ?? [];
    const meta = data?.meta;

    const table = useReactTable({ data: blogs, columns, getCoreRowModel: getCoreRowModel() });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Blogs</h1>
                    <p className="page-subtitle">Manage all blog posts</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/blogs/new')}>
                    + New Blog
                </button>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8 }}>
                {(['all', 'published', 'draft'] as const).map(f => (
                    <button
                        key={f}
                        className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => { setFilter(f); setPage(1); }}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {isLoading && <div className="center"><div className="spinner" /></div>}
            {isError && <div className="alert alert-error mt-4">Failed to load blogs.</div>}

            {!isLoading && !isError && (
                <>
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
                                    <tr>
                                        <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                                            No blogs found.
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

                    {/* Pagination */}
                    {meta && meta.totalPages > 1 && (
                        <div className="pagination">
                            <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
                            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                            ))}
                            <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === meta.totalPages}>›</button>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>{meta.total} total</span>
                        </div>
                    )}
                </>
            )}

            {/* ── Blog Preview Modal ── */}
            {preview && (
                <div className="modal-overlay" onClick={() => setPreview(null)}>
                    <div
                        className="modal"
                        style={{ maxWidth: 720, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                <div>
                                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{preview.title}</h2>
                                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                        {preview.author_name && <span>By {preview.author_name}</span>}
                                        {preview.added_by && <span>• Added by {preview.added_by}</span>}
                                        <span>• {new Date(preview.created_at).toLocaleDateString()}</span>
                                        <span>
                                            {preview.is_published
                                                ? <span className="badge badge-success" style={{ fontSize: 11 }}>Published</span>
                                                : <span className="badge badge-warning" style={{ fontSize: 11 }}>Draft</span>}
                                        </span>
                                    </div>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)} style={{ flexShrink: 0 }}>✕ Close</button>
                            </div>
                            {preview.cover_image && (
                                <img
                                    src={preview.cover_image}
                                    alt="Cover"
                                    style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8, marginTop: 12 }}
                                    onError={e => (e.currentTarget.style.display = 'none')}
                                />
                            )}
                        </div>

                        {/* Sanitized content */}
                        <div
                            className="blog-preview"
                            dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(preview.content),
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
