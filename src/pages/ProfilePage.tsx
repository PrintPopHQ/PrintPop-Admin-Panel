import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { getAdminProfile, updateAdminProfile, changeAdminPassword, uploadImage, deleteFile } from '../api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

export default function ProfilePage() {
    const qc = useQueryClient();
    const { updateAdmin: syncAdmin } = useAuth();
    const [name, setName] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

    const toggleShowPassword = (key: string) => {
        setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const [passwords, setPasswords] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const { data: profileRes, isLoading } = useQuery({
        queryKey: ['admin-profile'],
        queryFn: getAdminProfile
    });

    const profile = profileRes?.data?.data;

    const updateProfileMut = useMutation({
        mutationFn: updateAdminProfile,
        onSuccess: (res: any) => {
            const updated = res.data.data;
            // Update cache directly to avoid redundant GET call and flicker
            qc.setQueryData(['admin-profile'], (old: any) => ({
                ...old,
                data: {
                    ...old.data,
                    data: updated
                }
            }));
            syncAdmin({ name: updated.name, profile_picture: updated.profile_picture });
            toast.success('Profile updated successfully');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update profile')
    });

    useEffect(() => {
        if (profile && !updateProfileMut.isPending && !isUploading) {
            setName(profile.name);
            setProfilePicture(profile.profile_picture || '');
        }
    }, [profile, updateProfileMut.isPending, isUploading]);

    const changePassMut = useMutation({
        mutationFn: changeAdminPassword,
        onSuccess: () => {
            setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
            toast.success('Password changed successfully');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to change password')
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const oldImageUrl = profilePicture;
        try {
            const res = await uploadImage(file);
            const imageUrl = res.data.data.url;
            setProfilePicture(imageUrl);

            // Auto-save the picture to the profile
            updateProfileMut.mutate({ name, profile_picture: imageUrl });

            // Cleanup old image if it exists
            if (oldImageUrl) {
                deleteFile(oldImageUrl).catch(err => console.error('Failed to delete old image:', err));
            }
        } catch (err) {
            toast.error('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveImage = () => {
        if (!profilePicture) return;
        setShowRemoveModal(true);
    };

    const confirmRemoveImage = () => {
        const oldImageUrl = profilePicture;
        setProfilePicture('');
        updateProfileMut.mutate({ name, profile_picture: '' });
        deleteFile(oldImageUrl).catch(err => console.error('Failed to delete removed image:', err));
        setShowRemoveModal(false);
    };

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfileMut.mutate({ name, profile_picture: profilePicture });
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            return toast.error('Passwords do not match');
        }
        if (passwords.newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }
        changePassMut.mutate({
            oldPassword: passwords.oldPassword,
            newPassword: passwords.newPassword
        });
    };

    if (isLoading) return <div className="center"><div className="spinner" /></div>;

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 0' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Profile</h1>
                    <p className="page-subtitle">Manage your personal information and security settings</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* ── Personal Info ── */}
                <div className="card">
                    <h2 style={{ fontSize: 18, marginBottom: 20 }}>General Information</h2>
                    <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            <div style={{ position: 'relative' }}>
                                <div className="admin-avatar" style={{ width: 80, height: 80, fontSize: 32, cursor: 'pointer', overflow: 'hidden' }}>
                                    {profilePicture ? (
                                        <img src={profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        name?.[0]?.toUpperCase() ?? 'A'
                                    )}
                                </div>
                                {profilePicture && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        style={{
                                            position: 'absolute', top: -5, right: -5,
                                            background: '#ff4d4d', border: '2px solid var(--surface)',
                                            borderRadius: '50%', width: 24, height: 24, display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            zIndex: 2, padding: 0
                                        }}
                                        title="Remove image"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                )}
                                <label style={{
                                    position: 'absolute', bottom: 0, right: 0,
                                    background: 'var(--primary)', border: '2px solid var(--surface)',
                                    borderRadius: '50%', width: 28, height: 28, display: 'flex',
                                    alignItems: 'center', justifySelf: 'center', cursor: 'pointer'
                                }}>
                                    <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ margin: '0 auto' }}>
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                </label>
                            </div>
                            <div>
                                <p style={{ fontWeight: 600 }}>Profile Picture</p>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>JPG, GIF or PNG. 1MB Max.</p>
                                {isUploading && <p style={{ fontSize: 12, color: 'var(--primary)' }}>Uploading...</p>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input className="form-input" value={name} onChange={e => setName(e.target.value)} required />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input className="form-input" value={profile?.email || ''} disabled style={{ opacity: 0.6 }} />
                            <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>Email cannot be changed. Contact support if needed.</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <div className="badge badge-primary" style={{ alignSelf: 'flex-start', padding: '6px 12px' }}>
                                {profile?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}
                            </div>
                        </div>

                        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={updateProfileMut.isPending}>
                            {updateProfileMut.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                {/* ── Security ── */}
                <div className="card">
                    <h2 style={{ fontSize: 18, marginBottom: 20 }}>Security</h2>
                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <div className="password-input-wrapper" style={{ position: 'relative' }}>
                                <input className="form-input"
                                    type={showPasswords.old ? 'text' : 'password'}
                                    value={passwords.oldPassword}
                                    onChange={e => setPasswords({ ...passwords, oldPassword: e.target.value })}
                                    placeholder="Required to change password"
                                    style={{ paddingRight: 40 }} />
                                <button type="button" className="password-toggle" onClick={() => toggleShowPassword('old')}
                                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', opacity: 1, color: 'var(--primary)' }}>
                                    {showPasswords.old ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <div className="password-input-wrapper" style={{ position: 'relative' }}>
                                <input className="form-input"
                                    type={showPasswords.new ? 'text' : 'password'}
                                    value={passwords.newPassword}
                                    onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                                    placeholder="At least 6 characters"
                                    style={{ paddingRight: 40 }} />
                                <button type="button" className="password-toggle" onClick={() => toggleShowPassword('new')}
                                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', opacity: 1, color: 'var(--primary)' }}>
                                    {showPasswords.new ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <div className="password-input-wrapper" style={{ position: 'relative' }}>
                                <input className="form-input"
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    value={passwords.confirmPassword}
                                    placeholder="At least 6 characters"
                                    onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                    style={{ paddingRight: 40 }} />
                                <button type="button" className="password-toggle" onClick={() => toggleShowPassword('confirm')}
                                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', opacity: 1, color: 'var(--primary)' }}>
                                    {showPasswords.confirm ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button className="btn btn-danger" style={{ alignSelf: 'flex-start' }}
                            disabled={changePassMut.isPending || !passwords.newPassword}>
                            {changePassMut.isPending ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>

            <ConfirmModal
                show={showRemoveModal}
                title="Remove Profile Picture"
                message="Are you sure you want to remove your profile picture? This action cannot be undone."
                onConfirm={confirmRemoveImage}
                onCancel={() => setShowRemoveModal(false)}
                confirmText="Remove"
                variant="danger"
            />
        </div>
    );
}
