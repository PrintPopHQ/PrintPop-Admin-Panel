import { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './ActionMenu.css';

export interface ActionItem {
    label: string;
    icon: string;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'success';
    disabled?: boolean;
}

interface Props {
    items: ActionItem[];
}

interface DropdownPos {
    top: number;
    left: number;
    openUp: boolean;
}

export default function ActionMenu({ items }: Props) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0, openUp: false });
    const triggerRef = useRef<HTMLButtonElement>(null);

    const calcPos = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownH = items.length * 38 + 8; // approx height
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < dropdownH + 8;
        setPos({
            top: openUp ? rect.top + window.scrollY - dropdownH - 4 : rect.bottom + window.scrollY + 4,
            left: rect.right + window.scrollX - 164, // align right edge
            openUp,
        });
    }, [items.length]);

    const handleOpen = () => {
        calcPos();
        setOpen(o => !o);
    };

    // Close on outside click or scroll
    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        document.addEventListener('mousedown', close);
        document.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [open]);

    const dropdown = open ? ReactDOM.createPortal(
        <div
            className="action-dropdown"
            style={{ top: pos.top, left: pos.left, position: 'absolute' }}
            onMouseDown={e => e.stopPropagation()} // prevent outside-click handler from firing
        >
            {items.map((item, i) => (
                <button
                    key={i}
                    className={`action-item ${item.variant ?? 'default'}`}
                    disabled={item.disabled}
                    onClick={() => {
                        setOpen(false);
                        item.onClick();
                    }}
                >
                    <span className="action-icon">{item.icon}</span>
                    {item.label}
                </button>
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <div className="action-menu">
            <button
                ref={triggerRef}
                className={`action-trigger ${open ? 'active' : ''}`}
                onClick={handleOpen}
                title="Actions"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                </svg>
            </button>
            {dropdown}
        </div>
    );
}
