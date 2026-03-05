import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { getBlog, createBlog, updateBlog, uploadImage } from '../api';
import './BlogFormPage.css';

interface FormState {
    title: string;
    content: string;
    author_name: string;
    cover_image: string;
    is_published: boolean;
}

const INIT: FormState = {
    title: '', content: '', author_name: '', cover_image: '', is_published: false,
};



export default function BlogFormPage() {
    const { id } = useParams<{ id?: string }>();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [form, setForm] = useState<FormState>(INIT);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isFormReady, setIsFormReady] = useState(!isEdit);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const quillRef = useRef<ReactQuill>(null);

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                [{ indent: '-1' }, { indent: '+1' }],
                ['blockquote', 'code-block'],
                ['link', 'image'],
                [{ align: [] }],
                ['clean'],
            ],
            handlers: {
                image: () => {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/*');
                    input.click();

                    input.onchange = async () => {
                        const file = input.files?.[0];
                        if (!file) return;

                        setUploading(true);
                        try {
                            const res = await uploadImage(file);
                            const url = res.data.data.url;

                            const quill = quillRef.current?.getEditor();
                            if (quill) {
                                const range = quill.getSelection(true);
                                quill.insertEmbed(range.index, 'image', url);
                            }
                        } catch (err) {
                            setError('Image upload failed. Please try again.');
                        } finally {
                            setUploading(false);
                        }
                    };
                }
            }
        }
    }), []);


    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        handleFile(file);
    };

    const handleFile = async (file: File) => {
        setUploading(true);
        try {
            const res = await uploadImage(file);
            setForm(f => ({ ...f, cover_image: res.data.data.url }));
        } catch {
            setError('Image upload failed. Please try again.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            handleFile(file);
        }
    };

    const { data: existing, isLoading: loadingBlog } = useQuery({
        queryKey: ['blog', id],
        queryFn: () => getBlog(id!).then(r => r.data.data),
        enabled: isEdit,
    });

    useEffect(() => {
        if (existing) {
            setForm({
                title: existing.title ?? '',
                content: existing.content ?? '',
                author_name: existing.author_name ?? '',
                cover_image: existing.cover_image ?? '',
                is_published: existing.is_published ?? false,
            });
            setIsFormReady(true);
        }
    }, [existing]);

    const mut = useMutation({
        mutationFn: () => isEdit ? updateBlog(id!, form) : createBlog(form),
        onSuccess: (res) => {
            if (res.data.responseCode === 2000) {
                qc.invalidateQueries({ queryKey: ['blogs'] });
                navigate('/blogs');
            } else {
                setError(res.data.message);
            }
        },
        onError: (err: any) => setError(err?.response?.data?.message || 'Something went wrong'),
    });

    const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    if (!isFormReady || (isEdit && loadingBlog)) {
        return <div className="center"><div className="spinner" /></div>;
    }

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{isEdit ? 'Edit Blog' : 'New Blog'}</h1>
                    <p className="page-subtitle">{isEdit ? 'Update blog post content' : 'Write a new blog post'}</p>
                </div>
                <button className="btn btn-ghost" onClick={() => navigate('/blogs')}>← Back</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input className="form-input" placeholder="My awesome blog post" value={form.title} onChange={set('title')} />
                </div>

                <div className="form-group">
                    <label className="form-label">Content *</label>
                    <div className="quill-wrap">
                        <ReactQuill
                            ref={quillRef}
                            theme="snow"
                            value={form.content}
                            onChange={val => setForm(f => ({ ...f, content: val }))}
                            modules={modules}
                            placeholder="Write your blog content here…"
                        />
                    </div>
                </div>

                <div className="grid-2-col">
                    <div className="form-group">
                        <label className="form-label">Author Name</label>
                        <input className="form-input" placeholder="John Doe" value={form.author_name} onChange={set('author_name')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Cover Image</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleImageUpload}
                        />
                        {form.cover_image ? (
                            <div className="cover-img-preview">
                                <img
                                    src={form.cover_image}
                                    alt="Cover"
                                    onError={e => (e.currentTarget.style.display = 'none')}
                                />
                                <div className="cover-img-actions">
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                        {uploading ? 'Uploading…' : 'Change'}
                                    </button>
                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setForm(f => ({ ...f, cover_image: '' }))}>
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {uploading ? (
                                    <><span className="spinner spinner-sm" /> Uploading…</>
                                ) : (
                                    <>
                                        <span style={{ fontSize: 24, marginBottom: 8 }}>📷</span>
                                        <span>Click or drag image here</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                        type="checkbox"
                        checked={form.is_published}
                        onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
                        style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Publish immediately</span>
                </label>

                <div className="form-submit-actions">
                    <button type="button" className="btn btn-ghost btn-preview" onClick={() => setShowPreview(true)} disabled={!form.title && !form.content}>
                        👁️ Live Preview
                    </button>
                    <div className="form-submit-main">
                        <button type="button" className="btn btn-ghost" onClick={() => navigate('/blogs')}>Cancel</button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => mut.mutate()}
                            disabled={mut.isPending || !form.title || !form.content || form.content === '<p><br></p>'}
                        >
                            {mut.isPending ? 'Saving…' : isEdit ? 'Update Blog' : 'Create Blog'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Live Preview Modal ── */}
            {showPreview && (
                <div className="modal-overlay" onClick={() => setShowPreview(false)}>
                    <div
                        className="modal"
                        style={{ maxWidth: 1000, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                <div>
                                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{form.title || 'Untitled Blog Post'}</h2>
                                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                        {form.author_name && <span>By {form.author_name}</span>}
                                        <span>• {new Date().toLocaleDateString()}</span>
                                        <span>
                                            {form.is_published
                                                ? <span className="badge badge-success" style={{ fontSize: 11 }}>Published</span>
                                                : <span className="badge badge-warning" style={{ fontSize: 11 }}>Draft</span>}
                                        </span>
                                    </div>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowPreview(false)} style={{ flexShrink: 0 }}>✕ Close</button>
                            </div>
                            {form.cover_image && (
                                <img
                                    src={form.cover_image}
                                    alt="Cover"
                                    style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8, marginTop: 12 }}
                                    onError={e => (e.currentTarget.style.display = 'none')}
                                />
                            )}
                        </div>

                        <div
                            className="blog-preview"
                            dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(form.content || '<p>No content provided yet.</p>'),
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
