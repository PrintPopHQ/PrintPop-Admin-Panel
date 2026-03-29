import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getModel, addModel, updateModel, getInventoryBrands, uploadImage, deleteFile } from '../api';
import { toast } from 'react-hot-toast';
import ModelCanvasEditor from '../components/ModelCanvasEditor';

interface ModelFormData {
  id?: string;
  name: string;
  brand_id: string;
  model_pic: string;
  model_radius: number;
  case_types: string[];
}

const TEST_DESIGN_URL = 'https://pub-275088b6740f4ad8968a06be745a8cdb.r2.dev/designs/design12.png';

export default function ModelFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [formData, setFormData] = useState<ModelFormData>({
    name: '',
    brand_id: '',
    model_pic: '',
    model_radius: 65,
    case_types: ['magnetic', 'non_magnetic'],
  });

  const [localImageFile, setLocalImageFile] = useState<File | null>(null);
  const [localImagePreview, setLocalImagePreview] = useState<string>('');

  // Fetch Brands
  const { data: brandsRes } = useQuery({
    queryKey: ['brands'],
    queryFn: getInventoryBrands,
  });
  const brands = brandsRes?.data?.data || [];

  // Fetch Model (Edit Mode)
  const { data: modelRes, isLoading: isLoadingModel } = useQuery({
    queryKey: ['model', id],
    queryFn: () => getModel(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (modelRes?.data?.data) {
      const model = modelRes.data.data;
      setFormData({
        name: model.name || '',
        brand_id: model.brand_id || '',
        model_pic: model.model_pic || '',
        model_radius: model.model_radius || 65,
        case_types: model.case_types || ['magnetic', 'non_magnetic'],
      });
      setLocalImagePreview(model.model_pic || '');
    }
  }, [modelRes]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      let finalPic = data.model_pic;

      if (localImageFile) {
        const uploadRes = await uploadImage(localImageFile);
        finalPic = uploadRes.data.data.url;
      }

      const payload = { ...data, model_pic: finalPic };
      const res = await (isEdit ? updateModel(id!, payload) : addModel(payload));

      // Cleanup old image if it was replaced
      if (isEdit && localImageFile && modelRes?.data?.data?.model_pic) {
        const oldPic = modelRes.data.data.model_pic;
        if (oldPic && oldPic !== finalPic) {
          try {
            await deleteFile(oldPic);
          } catch (e) {
            console.warn('Failed to delete old model image:', e);
          }
        }
      }

      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['model', id] });
      toast.success(`Model ${isEdit ? 'updated' : 'added'} successfully`);
      navigate('/inventory');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save model'),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalImageFile(file);
      const url = URL.createObjectURL(file);
      setLocalImagePreview(url);
    }
  };

  if (isEdit && isLoadingModel) {
    return <div className="p-8 text-center">Loading model details...</div>;
  }

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Model' : 'Add New Model'}</h1>
          <p className="page-subtitle">Configure model dimensions and visual alignment</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/inventory')}>Cancel</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 450px) 1fr', gap: 48, alignItems: 'start' }}>
        {/* Left: Form */}
        <div className="bg-surface border border-border rounded-3xl p-8 sticky top-8 shadow-xl">
          <div className="flex flex-col gap-8">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, letterSpacing: '0.1em', marginBottom: 2, marginTop:15 }}>Model Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. iPhone 16 Pro"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, letterSpacing: '0.1em', marginBottom: 2, marginTop:15 }}>Brand</label>
              <select
                className="form-input"
                value={formData.brand_id}
                onChange={e => setFormData(p => ({ ...p, brand_id: e.target.value }))}
              >
                <option value="">Select Brand</option>
                {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, letterSpacing: '0.1em', marginBottom: 2, marginTop:15 }}>Model Image (Clean PNG)</label>
              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  accept="image/png"
                  className="form-input"
                  style={{ padding: '10px' }}
                  onChange={handleImageChange}
                />
                <p className="text-[10px] text-muted-foreground opacity-60 leading-relaxed">
                  Upload a high-quality PNG with transparency. This image represents the physical case shape.
                </p>
              </div>
            </div>

            <div className="form-group mt-10" style={{marginTop:20, marginBottom:20, background: 'rgba(6, 182, 212, 0.03)', padding: 24, borderRadius: 24, border: '1px solid rgba(6, 182, 212, 0.1)' }}>
              <div className="flex justify-between items-center mb-6">
                <label className="form-label" style={{ margin: 0, fontSize: 11, letterSpacing: '0.1em' }}>Calibration Radius</label>
                <div style={{ background: '#06b6d4', color: 'black', padding: '3px 10px', borderRadius: 8, fontSize: 13, fontWeight: 900, boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)' }}>
                  {formData.model_radius}px
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="1"
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: '#06b6d4' }}
                value={formData.model_radius}
                onChange={e => setFormData(p => ({ ...p, model_radius: parseInt(e.target.value) }))}
              />
              <p className="text-[10px] text-muted-foreground mt-4 opacity-70 leading-relaxed uppercase tracking-wider font-bold">
                Adjust until the test pattern fits perfectly inside the frame edges.
              </p>
            </div>

            <div className="form-group mt-10">
              <label className="form-label" style={{ fontSize: 11, letterSpacing: '0.1em', marginBottom: 2, marginTop:15 }}>Supported Case Types (Select at least one)</label>
              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    className="w-6 h-6 rounded-lg cursor-pointer"
                    style={{ accentColor: '#06b6d4' }}
                    checked={formData.case_types.includes('magnetic')}
                    onChange={e => {
                      const types = e.target.checked
                        ? [...formData.case_types, 'magnetic']
                        : formData.case_types.filter(t => t !== 'magnetic');
                      setFormData(p => ({ ...p, case_types: types }));
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white/90">Magnetic Case</span>
                  </div>
                </label>

                <label className="flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    className="w-6 h-6 rounded-lg cursor-pointer"
                    style={{ accentColor: '#06b6d4' }}
                    checked={formData.case_types.includes('non_magnetic')}
                    onChange={e => {
                      const types = e.target.checked
                        ? [...formData.case_types, 'non_magnetic']
                        : formData.case_types.filter(t => t !== 'non_magnetic');
                      setFormData(p => ({ ...p, case_types: types }));
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white/90">Non-Magnetic Case</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-10" style={{display:'flex', justifyContent:'right'}}>
              <button
                className="btn w-fit h-16 shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ 
                    borderRadius: 10, 
                    fontSize: 14, 
                    marginTop: 30,
                    fontWeight: 900, 
                    letterSpacing: '0.1em', 
                    textTransform: 'uppercase',
                    background: formData.case_types.length === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                    color: formData.case_types.length === 0 ? 'rgba(255,255,255,0.1)' : 'black',
                    boxShadow: formData.case_types.length === 0 ? 'none' : '0 20px 40px -10px rgba(6, 182, 212, 0.4)'
                }}
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending || !formData.name || !formData.brand_id || (!formData.model_pic && !localImageFile) || formData.case_types.length === 0}
              >
                {saveMutation.isPending ? 'Syncing...' : isEdit ? 'Update Model Data' : 'Save New Model'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="flex flex-col gap-6 min-w-0">
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] px-2">
            <span>Live Calibration Preview</span>
            <div className="flex items-center gap-2 text-primary">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(92,225,230,0.5)]" />
              <span>Real-time Sync</span>
            </div>
          </div>

          <div style={{
            position: 'relative',
            background: '#0a111c',
            borderRadius: 32,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Ambient background glows inside the preview */}
            <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex-grow flex items-center justify-center p-8">
              <ModelCanvasEditor
                modelImage={localImagePreview}
                testDesignUrl={TEST_DESIGN_URL}
                borderRadius={formData.model_radius}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
