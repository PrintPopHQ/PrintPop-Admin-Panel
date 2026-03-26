import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBannerImages, updateBannerImages, uploadImage } from '../api';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableBannerCardProps {
    url: string;
    index: number;
    onRemove: (index: number) => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    isFirst: boolean;
    isLast: boolean;
}

function SortableBannerCard({ url, index, onRemove, onMove, isFirst, isLast }: SortableBannerCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: url });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.6 : 1,
        transformOrigin: 'center',
    };

    return (
        <div
            ref={setNodeRef}
            className={`card ${isDragging ? 'dragging' : ''}`}
            style={{
                ...style,
                padding: 12,
                position: 'relative',
                overflow: 'hidden',
                background: isDragging ? 'var(--surface2)' : 'var(--surface)',
                border: isDragging ? '2px dashed var(--primary)' : '1px solid var(--border)',
                boxShadow: isDragging ? '0 8px 32px rgba(0,0,0,0.5)' : 'none',
                touchAction: 'none'
            }}
        >
            <div {...attributes} {...listeners} style={{ cursor: 'grab' }}>
                <img
                    src={url}
                    alt={`Banner ${index + 1}`}
                    draggable={false}
                    style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, marginBottom: 12 }}
                />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Position: {index + 1}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); onMove(index, 'up'); }}
                        disabled={isFirst}
                        title="Move Up"
                    >
                        ↑
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); onMove(index, 'down'); }}
                        disabled={isLast}
                        title="Move Down"
                    >
                        ↓
                    </button>
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                        title="Remove"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function BannerManagementPage() {
    const qc = useQueryClient();
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const { data: existing, isLoading } = useQuery({
        queryKey: ['banner-images'],
        queryFn: () => getBannerImages().then(r => r.data.data),
    });

    useEffect(() => {
        if (existing) {
            setImages(existing.map((img: any) => img.image_url));
        }
    }, [existing]);

    const mut = useMutation({
        mutationFn: (urls: string[]) => updateBannerImages(urls),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['banner-images'] });
            setSuccess('Banner images updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        },
        onError: (err: any) => setError(err?.response?.data?.message || 'Failed to update banner images'),
    });

    const processFiles = async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;

        setUploading(true);
        setError('');
        try {
            const uploadedUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const res = await uploadImage(files[i]);
                uploadedUrls.push(res.data.data.url);
            }
            setImages(prev => [...prev, ...uploadedUrls]);
        } catch (err) {
            setError('Some images failed to upload. Please try again.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) await processFiles(files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            await processFiles(files);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const moveImage = (index: number, direction: 'up' | 'down') => {
        const newImages = [...images];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= images.length) return;
        [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
        setImages(newImages);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setImages((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const isChanged = useMemo(() => {
        if (!existing) return false;
        const existingUrls = existing.map((img: any) => img.image_url);
        return JSON.stringify(images) !== JSON.stringify(existingUrls);
    }, [images, existing]);

    if (isLoading) return <div className="center"><div className="spinner" /></div>;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%', paddingBottom: 40 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Banner Management</h1>
                    <p className="page-subtitle">Drag and drop images to reorder them</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => mut.mutate(images)}
                        disabled={mut.isPending || !isChanged}
                    >
                        {mut.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="card">
                <div style={{ marginBottom: 24 }}>
                    <button
                        className={`btn ${isDragging ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        disabled={uploading}
                        style={{
                            border: isDragging ? '2px solid var(--primary)' : '2px dashed var(--border)',
                            width: '100%',
                            minHeight: 160,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            padding: 24,
                            background: isDragging ? 'var(--primary-light)' : 'transparent',
                            transition: 'all 0.2s ease',
                            transform: isDragging ? 'scale(1.01)' : 'scale(1)',
                        }}
                    >
                        {uploading ? (
                            <><span className="spinner spinner-sm" /> Uploading...</>
                        ) : (
                            <>
                                <span style={{ fontSize: 40, filter: isDragging ? 'drop-shadow(0 0 8px var(--primary))' : 'none' }}>
                                    {isDragging ? '📥' : '📁'}
                                </span>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: 16, display: 'block', marginBottom: 4 }}>
                                        {isDragging ? 'Drop images here' : 'Click or drag images to upload'}
                                    </span>
                                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                        Recommended size: 1920x600px • PNG, JPG, WEBP
                                    </span>
                                </div>
                            </>
                        )}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleUpload}
                    />
                </div>

                {images.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>🎞️</div>
                        <p>No banner images uploaded yet.</p>
                        <p style={{ fontSize: 13 }}>Uploaded images will appear here for reordering.</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={images} strategy={rectSortingStrategy}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                                {images.map((url, index) => (
                                    <SortableBannerCard
                                        key={url}
                                        url={url}
                                        index={index}
                                        onRemove={removeImage}
                                        onMove={moveImage}
                                        isFirst={index === 0}
                                        isLast={index === images.length - 1}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    );
}
