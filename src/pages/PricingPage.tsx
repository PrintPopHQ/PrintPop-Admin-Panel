import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPricing, updatePricing, getPricingMetadata } from '../api';
import { toast } from 'react-hot-toast';

// Mapping for tech IDs to pretty UI metadata
const METADATA_MAP: Record<string, { label: string; icon: string; description: string; count?: number }> = {
    'magnetic': { label: 'Magnetic Case', icon: '🧲', description: 'Premium MagSafe compatible protection' },
    'non_magnetic': { label: 'Non-Magnetic Case', icon: '📱', description: 'Standard slim protection for every day' },
    'single': { label: 'Single', count: 1, icon: '📦', description: 'Standard unit' },
    'pair_of_2': { label: 'Pair Deal', count: 2, icon: '👯', description: 'Better together' },
    'pair_of_3': { label: 'Triple Deal', count: 3, icon: '✨', description: 'Most popular' },
    'family_plan': { label: 'Family Deal', count: 4, icon: '👨‍👩‍👧‍👦', description: 'Best value' },
    // Fallback for old IDs just in case
    'pair': { label: 'Pair Deal', count: 2, icon: '👯', description: 'Better together' },
    'triple': { label: 'Triple Deal', count: 3, icon: '✨', description: 'Most popular' },
    'family': { label: 'Family Deal', count: 4, icon: '👨‍👩‍👧‍👦', description: 'Best value' },
};

export default function PricingPage() {
    const qc = useQueryClient();
    const [prices, setPrices] = useState<Record<string, number | string>>({});
    const [updatingKeys, setUpdatingKeys] = useState<Set<string>>(new Set());

    const { data: pricingData, isLoading: isPricingLoading } = useQuery({
        queryKey: ['admin-pricing'],
        queryFn: () => getPricing().then(r => r.data.data),
    });

    const { data: metaData, isLoading: isMetaLoading } = useQuery({
        queryKey: ['admin-pricing-metadata'],
        queryFn: () => getPricingMetadata().then(r => r.data.data),
    });

    const updateMut = useMutation({
        mutationFn: (data: { case_type: string; plan_type: string; price: number }) => updatePricing(data),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ['admin-pricing'] });
            const key = `${variables.case_type}_${variables.plan_type}`;
            setTimeout(() => {
                setUpdatingKeys(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            }, 1000);
        },
        onError: (err: any, variables) => {
            toast.error(err?.message || 'Failed to update price');
            const key = `${variables.case_type}_${variables.plan_type}`;
            setUpdatingKeys(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    });

    useEffect(() => {
        if (pricingData) {
            const initialPrices: Record<string, number> = {};
            pricingData.forEach((p: any) => {
                initialPrices[`${p.case_type}_${p.plan_type}`] = parseFloat(p.price);
            });
            setPrices(initialPrices);
        }
    }, [pricingData]);

    const handlePriceChange = (caseType: string, planType: string, value: string) => {
        if (value === '') {
            setPrices(prev => ({
                ...prev,
                [`${caseType}_${planType}`]: ''
            }));
            return;
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue)) return;

        setPrices(prev => ({
            ...prev,
            [`${caseType}_${planType}`]: numValue
        }));
    };

    const handleSave = async (caseType: string, planType: string) => {
        const key = `${caseType}_${planType}`;
        const rawPrice = prices[key];

        if (rawPrice === undefined) return;

        const price = rawPrice === '' ? 0 : Number(rawPrice);

        // Check if price actually changed
        const originalPrice = pricingData?.find((p: any) => p.case_type === caseType && p.plan_type === planType)?.price;
        if (parseFloat(originalPrice) === price) return;

        setUpdatingKeys(prev => new Set(prev).add(key));
        updateMut.mutate({ case_type: caseType, plan_type: planType, price });
    };

    const isLoading = isPricingLoading || isMetaLoading;

    if (isLoading) return <div className="center" style={{ height: '70vh' }}><div className="spinner" /></div>;

    const caseTypes = metaData?.caseTypes || [];
    const planTypes = metaData?.planTypes || [];

    return (
        <div className="pricing-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: '40px' }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em' }}>Dynamic Pricing</h1>
                    <p className="page-subtitle" style={{ fontSize: '16px', marginTop: '4px' }}>Configure your catalog pricing strategy and bulk deals
                        <br />All changes are automatically synchronized with the production storefront.
                    </p>
                </div>
                <div className="badge badge-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', marginRight: '8px', display: 'inline-block' }}></span>
                    Live Sync Active
                </div>
            </div>

            <div className="flex flex-col gap-16" style={{ gap: '64px' }}>
                {caseTypes.map((caseId: string) => {
                    const ct = METADATA_MAP[caseId] || { label: caseId, icon: '📁', description: 'Additional case type' };

                    return (
                        <div key={caseId} className="glass-card">
                            <div className="p-8 border-bottom border-border" style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.02)' }}>
                                <div className="flex items-center gap-4">
                                    <div style={{
                                        fontSize: '32px',
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '16px',
                                        background: 'var(--surface2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
                                    }}>
                                        {ct.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black" style={{ letterSpacing: '-0.01em' }}>
                                            {ct.label}
                                        </h2>
                                        <p className="text-muted-foreground mt-1 font-medium">{ct.description}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 md:p-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-14">
                                    {planTypes.map((planId: string) => {
                                        const plan = METADATA_MAP[planId] || { label: planId, count: 1, icon: '📦', description: 'Package deal' };
                                        const key = `${caseId}_${planId}`;
                                        const isUpdating = updatingKeys.has(key);
                                        const count = plan.count || 1;

                                        return (
                                            <div key={planId} className={`pricing-tier-card ${isUpdating ? 'active' : ''}`} style={{ marginBottom: '20px' }}>
                                                <div className={`save-indicator visible`} style={{ color: isUpdating ? 'var(--primary)' : 'var(--success)', opacity: isUpdating ? 1 : 0 }}>
                                                    {isUpdating ? 'Saving...' : 'Saved'}
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <div className="pricing-icon-wrapper">
                                                        {plan.icon}
                                                    </div>
                                                    <h3 className="font-bold text-lg">{plan.label}</h3>
                                                    <p className="text-xs text-muted-foreground font-medium">{plan.description}</p>
                                                </div>

                                                <div className="price-input-wrapper">
                                                    <span className="price-currency">$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className="price-input"
                                                        placeholder="0.00"
                                                        value={prices[key] ?? ''}
                                                        onChange={e => handlePriceChange(caseId, planId, e.target.value)}
                                                        onBlur={() => handleSave(caseId, planId)}
                                                    />
                                                </div>

                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground bg-surface2 px-2 py-1 rounded">
                                                        {count} UNIT{count > 1 ? 'S' : ''}
                                                    </span>
                                                    {/* <span className="text-[10px] font-medium text-muted-foreground">
                                                        {prices[key] ? `(${(Number(prices[key]) / count).toFixed(2)}/ea)` : ''}
                                                    </span> */}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
