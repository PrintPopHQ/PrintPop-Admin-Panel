// ConfirmModal component

interface ConfirmModalProps {
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'success' | 'warning';
    isLoading?: boolean;
}

export default function ConfirmModal({
    show,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary',
    isLoading = false
}: ConfirmModalProps) {
    if (!show) return null;

    const getBtnClass = () => {
        switch (variant) {
            case 'danger': return 'btn-danger';
            case 'success': return 'btn-success';
            case 'warning': return 'btn-warning'; // Need to make sure this exists or fallback
            default: return 'btn-primary';
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <h2 className="modal-title" style={{ marginBottom: '12px' }}>{title}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
                    {message}
                </p>

                <div className="modal-footer">
                    <button
                        className="btn btn-ghost"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`btn ${getBtnClass()}`}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="spinner-sm" style={{ marginRight: '8px' }} />
                                Processing...
                            </>
                        ) : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
