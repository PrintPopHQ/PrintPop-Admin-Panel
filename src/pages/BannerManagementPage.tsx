import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBannerImages, updateBannerImages, uploadImage } from '../api';

export default function BannerManagementPage() {
    const qc = useQueryClient();
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
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

    if (isLoading) return <div className="center"><div className="spinner" /></div>;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Banner Management</h1>
                    <p className="page-subtitle">Upload and manage images for the homepage carousel</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => mut.mutate(images)}
                        disabled={mut.isPending}
                    >
                        {mut.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="card">
                <div style={{ marginBottom: 20 }}>
                    <button
                        className="btn btn-ghost"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{ border: '2px dashed var(--border)', width: '100%', height: 100, display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                        {uploading ? (
                            <><span className="spinner spinner-sm" /> Uploading...</>
                        ) : (
                            <>
                                <span style={{ fontSize: 24 }}>📷</span>
                                <span>Click to upload new banner images</span>
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
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        No banner images uploaded yet.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                        {images.map((url, index) => (
                            <div key={index} className="card" style={{ padding: 12, position: 'relative', overflow: 'hidden' }}>
                                <img
                                    src={url}
                                    alt={`Banner ${index + 1}`}
                                    style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, marginBottom: 12 }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Position: {index + 1}</span>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => moveImage(index, 'up')}
                                            disabled={index === 0}
                                            title="Move Up"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => moveImage(index, 'down')}
                                            disabled={index === images.length - 1}
                                            title="Move Down"
                                        >
                                            ↓
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => removeImage(index)}
                                            title="Remove"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
