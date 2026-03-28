import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Info, 
  Layers, 
  Activity, 
  Timer, 
  Sparkles, 
  ArrowDown, 
  AlertTriangle, 
  Settings2,
  Plus,
  Trash2,
  Shield,
  Scale,
  Zap,
  AlertCircle
} from 'lucide-react';
import { 
  XAxis as ReXAxis, 
  YAxis as ReYAxis, 
  CartesianGrid as ReCartesianGrid, 
  Tooltip as ReTooltip, 
  ResponsiveContainer as ReResponsiveContainer,
  AreaChart as ReAreaChart,
  Area as ReArea
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Substance, CustomEffect, SubstanceCategory, MetabolismCurveType } from '../types';
import { cn } from '../lib/utils';

const KineticsPreview = ({ halfLife, tmax, onset, color }: { halfLife: number; tmax: number; onset: number; color: string }) => {
  const data = useMemo(() => {
    const points = [];
    const duration = Math.max(halfLife * 4, tmax * 3, 12);
    const steps = 60;
    const step = duration / steps;

    for (let i = 0; i <= steps; i++) {
      const t = i * step;
      let level = 0;
      
      const onsetH = onset / 60;
      if (t < onsetH) {
        level = 0;
      } else if (t < tmax) {
        const progress = (t - onsetH) / (tmax - onsetH);
        level = Math.sin(progress * Math.PI / 2) * 100;
      } else {
        level = 100 * Math.pow(0.5, (t - tmax) / halfLife);
      }
      
      points.push({ time: t.toFixed(2), level: Math.max(0, level) });
    }
    return points;
  }, [halfLife, tmax, onset]);

  return (
    <div className="h-32 w-full bg-white/[0.02] backdrop-blur-2xl rounded-3xl border border-white/5 p-2 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-primary/5 blur-[40px] rounded-full -mr-16 -mt-16" />
      <div className="absolute top-2 left-4 text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] z-10">Kinetická Predikce</div>
      <ReResponsiveContainer width="100%" height="100%">
        <ReAreaChart data={data}>
          <defs>
            <linearGradient id="kineticsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <ReCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
          <ReXAxis dataKey="time" hide />
          <ReYAxis hide domain={[0, 110]} />
          <ReArea 
            type="monotone" 
            dataKey="level" 
            stroke={color} 
            fill="url(#kineticsGradient)" 
            strokeWidth={3} 
            animationDuration={800} 
            isAnimationActive={true} 
          />
        </ReAreaChart>
      </ReResponsiveContainer>
    </div>
  );
};

const MetabolismPreview = ({ type, beta, color, customCurve }: { type: MetabolismCurveType; beta: number; color: string; customCurve?: { time: number; level: number }[] }) => {
  const data = useMemo(() => {
    const points = [];
    const steps = 60;
    
    if (type === 'custom' && customCurve && customCurve.length > 0) {
      const sorted = [...customCurve].sort((a, b) => a.time - b.time);
      const duration = Math.max(sorted[sorted.length - 1].time, 12);
      const step = duration / steps;
      
      for (let i = 0; i <= steps; i++) {
        const t = i * step;
        let level = 0;
        
        if (t <= sorted[0].time) level = sorted[0].level;
        else if (t >= sorted[sorted.length - 1].time) level = sorted[sorted.length - 1].level;
        else {
          for (let j = 0; j < sorted.length - 1; j++) {
            const p1 = sorted[j];
            const p2 = sorted[j + 1];
            if (t >= p1.time && t <= p2.time) {
              const progress = (t - p1.time) / (p2.time - p1.time);
              level = p1.level + progress * (p2.level - p1.level);
              break;
            }
          }
        }
        points.push({ time: t.toFixed(2), level: Math.max(0, level) });
      }
    } else {
      const duration = 24;
      const step = duration / steps;

      for (let i = 0; i <= steps; i++) {
        const t = i * step;
        let level = 0;
        
        if (type === 'exponential' || type === 'standard') {
          level = 100 * Math.exp(-beta * t);
        } else if (type === 'alcohol') {
          level = Math.max(0, 100 - (beta * 10 * t));
        } else if (type === 'linear') {
          level = Math.max(0, 100 - (beta * 5 * t));
        } else if (type === 'sigmoid') {
          level = 100 / (1 + Math.exp(beta * (t - 8)));
        }
        
        points.push({ time: t.toFixed(2), level: Math.max(0, level) });
      }
    }
    return points;
  }, [type, beta, customCurve]);

  return (
    <div className="h-32 w-full bg-white/[0.02] backdrop-blur-2xl rounded-3xl border border-white/5 p-2 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 blur-[40px] rounded-full -mr-16 -mt-16" />
      <div className="absolute top-2 left-4 text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] z-10">Metabolická Analýza</div>
      <ReResponsiveContainer width="100%" height="100%">
        <ReAreaChart data={data}>
          <defs>
            <linearGradient id="metabolismGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <ReCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
          <ReXAxis dataKey="time" hide />
          <ReYAxis hide domain={[0, 110]} />
          <ReArea 
            type="monotone" 
            dataKey="level" 
            stroke={color} 
            fill="url(#metabolismGradient)" 
            strokeWidth={3} 
            animationDuration={800} 
            isAnimationActive={true} 
          />
        </ReAreaChart>
      </ReResponsiveContainer>
    </div>
  );
};

interface SubstanceEditorProps {
  isOpen: boolean;
  substanceId: string | null;
  template?: Substance | null;
  substances: Substance[];
  customEffects: CustomEffect[];
  onClose: () => void;
  onSave: (substance: Substance) => void;
}

type TabType = 'basic' | 'strains' | 'kinetics' | 'metabolism' | 'effects' | 'comedown' | 'interactions' | 'advanced';

export default function SubstanceEditor({ isOpen, substanceId, template, substances, customEffects, onClose, onSave }: SubstanceEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState<Partial<Substance>>({});

  useEffect(() => {
    if (substanceId && substanceId !== 'new') {
      const substance = substances.find(s => s.id === substanceId);
      if (substance) setFormData(JSON.parse(JSON.stringify(substance)));
    } else if (template) {
      setFormData({
        ...JSON.parse(JSON.stringify(template)),
        id: 'substance_' + Date.now(),
        isFavorite: false
      });
    } else {
      setFormData({
        id: 'substance_' + Date.now(),
        name: '',
        color: '#00d1ff',
        icon: 'pill',
        unit: 'mg',
        step: 0.1,
        price: 0,
        category: 'other',
        description: '',
        halfLife: 4,
        tmax: 1,
        bioavailability: 100,
        onset: 15,
        offset: 2,
        toxicity: 5,
        toleranceRate: 10,
        toleranceReset: 14,
        metabolismCurve: 'standard',
        metabolismRate: 1,
        absorptionRate: 1,
        beta: 0.1,
        ka: 1,
        proteinBinding: 0,
        volumeOfDistribution: 0.7,
        clearanceRate: 0,
        molarMass: 0,
        pKa: 7.4,
        logP: 0,
        addictionPotential: 'low',
        legalityStatus: 'legal',
        toleranceHalfLife: 7,
        crossTolerance: [],
        comedownEnabled: false,
        comedownDuration: 4,
        comedownIntensity: 5,
        comedownSymptoms: [],
        strains: [],
        effects: [],
        interactions: [],
        interactionMessage: '',
        isSevere: false
      });
    }
  }, [substanceId, substances, isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Substance);
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'basic', label: 'Základní', icon: Info },
    { id: 'strains', label: 'Druhy', icon: Layers },
    { id: 'kinetics', label: 'Kinetika', icon: Activity },
    { id: 'metabolism', label: 'Metabolismus', icon: Timer },
    { id: 'effects', label: 'Účinky', icon: Sparkles },
    { id: 'comedown', label: 'Dojezd', icon: ArrowDown },
    { id: 'interactions', label: 'Interakce', icon: AlertTriangle },
    { id: 'advanced', label: 'Pokročilé', icon: Settings2 },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-dark-bg/90 backdrop-blur-md"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative bg-card-bg rounded-t-3xl md:rounded-3xl w-full max-w-2xl h-[90vh] md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border-t md:border border-border-muted"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-muted bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-primary/10 flex items-center justify-center border border-cyan-primary/20">
              <Settings2 className="text-cyan-primary" size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-100 uppercase tracking-tight">
                {substanceId && substanceId !== 'new' ? 'Upravit látku' : 'Nová látka'}
              </h2>
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em]">Konfigurace parametrů</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-border-muted overflow-x-auto scrollbar-hide bg-slate-900/30">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] whitespace-nowrap flex items-center gap-1.5 border-b-2 transition-all",
                activeTab === tab.id 
                  ? "border-cyan-primary text-cyan-primary bg-cyan-primary/5" 
                  : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          <form id="substance-form" onSubmit={handleSave} className="space-y-6">
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Název látky</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none transition-all text-slate-200 font-bold text-sm" 
                    placeholder="Např. Kofein"
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Barva identity</label>
                    <div className="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-950 border border-border-muted">
                      <input 
                        type="color" 
                        value={formData.color || '#00d1ff'} 
                        onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none p-0" 
                      />
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{formData.color}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Kategorie</label>
                    <select 
                      value={formData.category || 'other'} 
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as SubstanceCategory }))}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200 h-[46px] text-xs font-bold"
                    >
                      <option value="stimulant">Stimulans</option>
                      <option value="depressant">Depresans</option>
                      <option value="psychedelic">Psychedelikum</option>
                      <option value="dissociative">Disociativum</option>
                      <option value="opioid">Opioid</option>
                      <option value="cannabinoid">Kanabinoid</option>
                      <option value="nootropic">Nootropikum</option>
                      <option value="supplement">Doplněk stravy</option>
                      <option value="medication">Lék</option>
                      <option value="other">Jiné</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Jednotka</label>
                    <select 
                      value={formData.unit || 'mg'} 
                      onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200 h-[46px] text-xs font-bold"
                    >
                      <option value="mg">mg</option>
                      <option value="g">g</option>
                      <option value="mcg">mcg</option>
                      <option value="ml">ml</option>
                      <option value="IU">IU</option>
                      <option value="kapsle">kapsle</option>
                      <option value="tablet">tablet</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Krok dávkování</label>
                    <input 
                      type="number" 
                      value={formData.step || 0.1} 
                      onChange={e => setFormData(prev => ({ ...prev, step: parseFloat(e.target.value) }))}
                      step="0.01" 
                      min="0.01" 
                      className="w-full p-3 rounded-xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200 text-xs font-bold" 
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Cena za jednotku (Kč)</label>
                  <input 
                    type="number" 
                    value={formData.price || 0} 
                    onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                    step="0.01" 
                    min="0" 
                    className="w-full p-3 rounded-xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200 text-xs font-bold" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Popis látky</label>
                  <textarea 
                    value={formData.description || ''} 
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2} 
                    className="w-full p-3 rounded-xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none resize-none text-slate-200 text-xs font-medium" 
                    placeholder="Volitelný popis látky..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'strains' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Varianty / Druhy</h3>
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({ ...prev, strains: [...(prev.strains || []), { name: '', price: 0 }] }))}
                    className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-cyan-primary/10 text-cyan-primary hover:bg-cyan-primary/20 transition-all flex items-center gap-2 border border-cyan-primary/20"
                  >
                    <Plus size={14} /> Přidat variantu
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(formData.strains || []).length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/50 rounded-3xl border border-border-muted border-dashed">
                      <p className="text-xs text-slate-600 font-medium uppercase tracking-widest">Žádné varianty nejsou definovány</p>
                    </div>
                  ) : (
                    (formData.strains || []).map((strain, i) => (
                      <div key={i} className="bg-slate-950 border border-border-muted rounded-2xl p-4 flex items-center gap-4">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <input 
                            type="text" 
                            value={strain.name} 
                            onChange={e => {
                              const next = [...(formData.strains || [])];
                              next[i].name = e.target.value;
                              setFormData(prev => ({ ...prev, strains: next }));
                            }}
                            className="w-full p-3 rounded-xl bg-slate-900 border border-border-muted text-sm outline-none focus:border-cyan-primary transition-all" 
                            placeholder="Název varianty" 
                          />
                          <input 
                            type="number" 
                            value={strain.price} 
                            onChange={e => {
                              const next = [...(formData.strains || [])];
                              next[i].price = parseFloat(e.target.value);
                              setFormData(prev => ({ ...prev, strains: next }));
                            }}
                            className="w-full p-3 rounded-xl bg-slate-900 border border-border-muted text-sm outline-none focus:border-cyan-primary transition-all" 
                            placeholder="Cena" 
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, strains: prev.strains?.filter((_, idx) => idx !== i) }))}
                          className="p-3 rounded-xl hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'kinetics' && (
              <div className="space-y-6">
                <KineticsPreview 
                  halfLife={formData.halfLife || 4} 
                  tmax={formData.tmax || 1} 
                  onset={formData.onset || 15} 
                  color={formData.color || '#00d1ff'} 
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Poločas rozpadu T₁/₂ (h)</label>
                    <input 
                      type="number" 
                      value={formData.halfLife || 4} 
                      onChange={e => setFormData(prev => ({ ...prev, halfLife: parseFloat(e.target.value) }))}
                      step="0.1" 
                      min="0.1" 
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Tmax (h)</label>
                    <input 
                      type="number" 
                      value={formData.tmax || 1} 
                      onChange={e => setFormData(prev => ({ ...prev, tmax: parseFloat(e.target.value) }))}
                      step="0.1" 
                      min="0.1" 
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Bioavailabilita (%)</label>
                  <input 
                    type="number" 
                    value={formData.bioavailability || 100} 
                    onChange={e => setFormData(prev => ({ ...prev, bioavailability: parseFloat(e.target.value) }))}
                    step="1" 
                    min="1" 
                    max="100" 
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Onset (min)</label>
                    <input 
                      type="number" 
                      value={formData.onset || 15} 
                      onChange={e => setFormData(prev => ({ ...prev, onset: parseFloat(e.target.value) }))}
                      step="1" 
                      min="0" 
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Offset (h)</label>
                    <input 
                      type="number" 
                      value={formData.offset || 2} 
                      onChange={e => setFormData(prev => ({ ...prev, offset: parseFloat(e.target.value) }))}
                      step="0.1" 
                      min="0" 
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'metabolism' && (
              <div className="space-y-6">
                <MetabolismPreview 
                  type={formData.metabolismCurve || 'standard'} 
                  beta={formData.beta || 0.1} 
                  color={formData.color || '#00d1ff'} 
                  customCurve={formData.customCurve}
                />
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Typ metabolické křivky</label>
                  <select 
                    value={formData.metabolismCurve || 'standard'} 
                    onChange={e => setFormData(prev => ({ ...prev, metabolismCurve: e.target.value as MetabolismCurveType }))}
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200 h-[58px]"
                  >
                    <option value="standard">Standardní (lineární)</option>
                    <option value="exponential">Exponenciální</option>
                    <option value="alcohol">Alkohol (Widmark)</option>
                    <option value="linear">Lineární (konstantní)</option>
                    <option value="sigmoid">Sigmoidní (S-křivka)</option>
                    <option value="custom">Vlastní body (čas/úroveň)</option>
                  </select>
                </div>
                
                {formData.metabolismCurve === 'custom' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Body křivky</h4>
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, customCurve: [...(prev.customCurve || []), { time: 0, level: 0 }] }))}
                        className="text-[10px] font-bold uppercase tracking-widest text-cyan-primary hover:text-cyan-primary/80"
                      >
                        + Přidat bod
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.customCurve || []).map((point, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="relative">
                              <input 
                                type="number" 
                                value={point.time} 
                                onChange={e => {
                                  const next = [...(formData.customCurve || [])];
                                  next[i].time = parseFloat(e.target.value);
                                  setFormData(prev => ({ ...prev, customCurve: next }));
                                }}
                                className="w-full p-3 pr-8 rounded-xl bg-slate-900 border border-border-muted text-sm outline-none focus:border-cyan-primary" 
                                step="0.1" 
                                min="0" 
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">h</span>
                            </div>
                            <div className="relative">
                              <input 
                                type="number" 
                                value={point.level} 
                                onChange={e => {
                                  const next = [...(formData.customCurve || [])];
                                  next[i].level = parseFloat(e.target.value);
                                  setFormData(prev => ({ ...prev, customCurve: next }));
                                }}
                                className="w-full p-3 pr-8 rounded-xl bg-slate-900 border border-border-muted text-sm outline-none focus:border-cyan-primary" 
                                min="0" 
                                max="100" 
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">%</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setFormData(prev => ({ ...prev, customCurve: prev.customCurve?.filter((_, idx) => idx !== i) }))}
                            className="p-2 rounded-xl hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {(formData.customCurve || []).length === 0 && (
                        <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest text-center py-2">Žádné body definovány</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Beta (eliminace)</label>
                      <input 
                        type="number" 
                        value={formData.beta || 0.1} 
                        onChange={e => setFormData(prev => ({ ...prev, beta: parseFloat(e.target.value) }))}
                        step="0.01" 
                        min="0.01" 
                        className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Ka (absorpce)</label>
                      <input 
                        type="number" 
                        value={formData.ka || 1} 
                        onChange={e => setFormData(prev => ({ ...prev, ka: parseFloat(e.target.value) }))}
                        step="0.01" 
                        min="0.01" 
                        className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'effects' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Profil účinků</h3>
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({ ...prev, effects: [...(prev.effects || []), { type: 'Stimulace', intensity: 5, onset: 0.5, duration: 2, valence: 'positive' }] }))}
                    className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-cyan-primary/10 text-cyan-primary hover:bg-cyan-primary/20 transition-all flex items-center gap-2 border border-cyan-primary/20"
                  >
                    <Plus size={14} /> Přidat účinek
                  </button>
                </div>
                
                <div className="space-y-4">
                  {(formData.effects || []).length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/50 rounded-3xl border border-border-muted border-dashed">
                      <p className="text-xs text-slate-600 font-medium uppercase tracking-widest">Žádné účinky nejsou definovány</p>
                    </div>
                  ) : (
                    (formData.effects || []).map((effect, i) => (
                      <div key={i} className={cn(
                        "bg-slate-950 border border-border-muted rounded-3xl p-5 space-y-4 relative overflow-hidden",
                        effect.valence === 'positive' && "border-l-4 border-l-emerald-500",
                        effect.valence === 'negative' && "border-l-4 border-l-rose-500",
                        effect.valence === 'neutral' && "border-l-4 border-l-cyan-primary"
                      )}>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 ml-1">Typ účinku</label>
                            <select 
                              value={effect.type} 
                              onChange={e => {
                                const next = [...(formData.effects || [])];
                                next[i].type = e.target.value;
                                setFormData(prev => ({ ...prev, effects: next }));
                              }}
                              className="w-full p-3 rounded-xl bg-slate-900 border border-border-muted text-sm outline-none focus:border-cyan-primary"
                            >
                              {customEffects.map(ce => <option key={ce.name} value={ce.name}>{ce.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 ml-1">Intenzita (1-10)</label>
                            <input 
                              type="number" 
                              value={effect.intensity} 
                              onChange={e => {
                                const next = [...(formData.effects || [])];
                                next[i].intensity = parseFloat(e.target.value);
                                setFormData(prev => ({ ...prev, effects: next }));
                              }}
                              className="w-full p-3 rounded-xl bg-slate-900 border border-border-muted text-sm outline-none focus:border-cyan-primary" 
                              min="1" 
                              max="10" 
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 ml-1">Onset (h)</label>
                            <input 
                              type="number" 
                              value={effect.onset} 
                              onChange={e => {
                                const next = [...(formData.effects || [])];
                                next[i].onset = parseFloat(e.target.value);
                                setFormData(prev => ({ ...prev, effects: next }));
                              }}
                              className="w-full p-3 rounded-xl bg-slate-900 border border-border-muted text-sm outline-none focus:border-cyan-primary" 
                              step="0.1" 
                              min="0" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 ml-1">Trvání (h)</label>
                            <input 
                              type="number" 
                              value={effect.duration} 
                              onChange={e => {
                                const next = [...(formData.effects || [])];
                                next[i].duration = parseFloat(e.target.value);
                                setFormData(prev => ({ ...prev, effects: next }));
                              }}
                              className="w-full p-3 rounded-xl bg-slate-900 border border-border-muted text-sm outline-none focus:border-cyan-primary" 
                              step="0.1" 
                              min="0.1" 
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex gap-2">
                            {['positive', 'neutral', 'negative'].map(v => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => {
                                  const next = [...(formData.effects || [])];
                                  next[i].valence = v as any;
                                  setFormData(prev => ({ ...prev, effects: next }));
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                                  effect.valence === v 
                                    ? v === 'positive' ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" :
                                      v === 'negative' ? "bg-rose-500/20 border-rose-500 text-rose-400" :
                                      "bg-cyan-primary/20 border-cyan-primary text-cyan-primary"
                                    : "bg-slate-900 border-border-muted text-slate-500"
                                )}
                              >
                                {v === 'positive' ? 'Pozitivní' : v === 'negative' ? 'Negativní' : 'Neutrální'}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              type="button" 
                              onClick={() => {
                                const next = [...(formData.effects || [])];
                                if (next[i].customCurve) {
                                  delete next[i].customCurve;
                                } else {
                                  next[i].customCurve = [{ time: 0, level: 0 }, { time: 1, level: 100 }, { time: 4, level: 0 }];
                                }
                                setFormData(prev => ({ ...prev, effects: next }));
                              }}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                                effect.customCurve ? "bg-cyan-primary/20 border-cyan-primary text-cyan-primary" : "bg-slate-900 border-border-muted text-slate-500"
                              )}
                            >
                              Vlastní křivka
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setFormData(prev => ({ ...prev, effects: prev.effects?.filter((_, idx) => idx !== i) }))}
                              className="p-2 rounded-xl hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {effect.customCurve && (
                          <div className="pt-4 space-y-3 border-t border-white/5">
                            <div className="flex items-center justify-between px-1">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Body účinku</h4>
                              <button 
                                type="button" 
                                onClick={() => {
                                  const next = [...(formData.effects || [])];
                                  next[i].customCurve = [...(next[i].customCurve || []), { time: 0, level: 0 }];
                                  setFormData(prev => ({ ...prev, effects: next }));
                                }}
                                className="text-[10px] font-bold uppercase tracking-widest text-cyan-primary hover:text-cyan-primary/80"
                              >
                                + Bod
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {effect.customCurve.map((point, pi) => (
                                <div key={pi} className="flex items-center gap-2">
                                  <div className="flex-1 grid grid-cols-2 gap-2">
                                    <div className="relative">
                                      <input 
                                        type="number" 
                                        value={point.time} 
                                        onChange={e => {
                                          const next = [...(formData.effects || [])];
                                          const nextCurve = [...(next[i].customCurve || [])];
                                          nextCurve[pi].time = parseFloat(e.target.value);
                                          next[i].customCurve = nextCurve;
                                          setFormData(prev => ({ ...prev, effects: next }));
                                        }}
                                        className="w-full p-2 pr-6 rounded-lg bg-slate-900 border border-border-muted text-[10px] outline-none focus:border-cyan-primary" 
                                        step="0.1" 
                                        min="0" 
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-600">h</span>
                                    </div>
                                    <div className="relative">
                                      <input 
                                        type="number" 
                                        value={point.level} 
                                        onChange={e => {
                                          const next = [...(formData.effects || [])];
                                          const nextCurve = [...(next[i].customCurve || [])];
                                          nextCurve[pi].level = parseFloat(e.target.value);
                                          next[i].customCurve = nextCurve;
                                          setFormData(prev => ({ ...prev, effects: next }));
                                        }}
                                        className="w-full p-2 pr-6 rounded-lg bg-slate-900 border border-border-muted text-[10px] outline-none focus:border-cyan-primary" 
                                        min="0" 
                                        max="100" 
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-600">%</span>
                                    </div>
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      const next = [...(formData.effects || [])];
                                      next[i].customCurve = next[i].customCurve?.filter((_, idx) => idx !== pi);
                                      setFormData(prev => ({ ...prev, effects: next }));
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'comedown' && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, comedownEnabled: !prev.comedownEnabled }))}
                  className={cn(
                    "w-full p-6 rounded-[32px] border flex items-center justify-between transition-all",
                    formData.comedownEnabled 
                      ? "bg-cyan-primary/10 border-cyan-primary/30 text-cyan-primary" 
                      : "bg-slate-950 border-border-muted text-slate-500"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                      formData.comedownEnabled ? "bg-cyan-primary/20 border-cyan-primary/30" : "bg-slate-900 border-border-muted"
                    )}>
                      <ArrowDown size={24} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold">Sledování dojezdu</div>
                      <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">Monitorovat stav po odeznění</div>
                    </div>
                  </div>
                  <div className={cn(
                    "w-12 h-6 rounded-full relative transition-all",
                    formData.comedownEnabled ? "bg-cyan-primary" : "bg-slate-800"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      formData.comedownEnabled ? "right-1" : "left-1"
                    )} />
                  </div>
                </button>
                
                {formData.comedownEnabled && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 bg-slate-950 border border-border-muted rounded-[32px] p-6"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Délka dojezdu (h)</label>
                      <input 
                        type="number" 
                        value={formData.comedownDuration || 4} 
                        onChange={e => setFormData(prev => ({ ...prev, comedownDuration: parseFloat(e.target.value) }))}
                        step="0.5" 
                        min="0" 
                        className="w-full p-4 rounded-2xl bg-slate-900 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Intenzita dojezdu</label>
                      <div className="px-2">
                        <input 
                          type="range" 
                          value={formData.comedownIntensity || 5} 
                          onChange={e => setFormData(prev => ({ ...prev, comedownIntensity: parseInt(e.target.value) }))}
                          min="1" 
                          max="10" 
                          step="1" 
                          className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-primary" 
                        />
                        <div className="flex justify-between text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-4">
                          <span>Mírný</span>
                          <span className="text-cyan-primary text-sm">{formData.comedownIntensity}</span>
                          <span>Silný</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Symptomy</h4>
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, comedownSymptoms: [...(prev.comedownSymptoms || []), ''] }))}
                          className="text-[10px] font-bold uppercase tracking-widest text-cyan-primary hover:text-cyan-primary/80"
                        >
                          + Přidat symptom
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(formData.comedownSymptoms || []).length === 0 ? (
                          <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest text-center py-2">Žádné symptomy</p>
                        ) : (
                          (formData.comedownSymptoms || []).map((symptom, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input 
                                type="text" 
                                value={symptom} 
                                onChange={e => {
                                  const next = [...(formData.comedownSymptoms || [])];
                                  next[i] = e.target.value;
                                  setFormData(prev => ({ ...prev, comedownSymptoms: next }));
                                }}
                                className="flex-1 p-3 rounded-xl bg-slate-900 border border-border-muted text-sm outline-none focus:border-cyan-primary" 
                                placeholder="Např. Bolest hlavy" 
                              />
                              <button 
                                type="button" 
                                onClick={() => setFormData(prev => ({ ...prev, comedownSymptoms: prev.comedownSymptoms?.filter((_, idx) => idx !== i) }))}
                                className="p-3 rounded-xl hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {activeTab === 'interactions' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Kritické interakce</h3>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto scrollbar-hide pr-2">
                    {substances.filter(s => s.id !== formData.id).map(s => {
                      const isSelected = (formData.interactions || []).includes(s.id);
                      return (
                        <button 
                          key={s.id} 
                          type="button"
                          onClick={() => {
                            const next = isSelected 
                              ? (formData.interactions || []).filter(id => id !== s.id)
                              : [...(formData.interactions || []), s.id];
                            setFormData(prev => ({ ...prev, interactions: next }));
                          }}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all",
                            isSelected 
                              ? "bg-rose-500/10 border-rose-500/50 text-rose-200" 
                              : "bg-slate-950 border-border-muted text-slate-400"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900 border border-border-muted">
                              <Activity size={16} style={{ color: s.color }} />
                            </div>
                            <span className="text-sm font-bold">{s.name}</span>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                            isSelected ? "bg-rose-500 border-rose-500" : "border-slate-700"
                          )}>
                            {isSelected && <X size={12} className="text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Varovná zpráva</label>
                  <textarea 
                    value={formData.interactionMessage || ''} 
                    onChange={e => setFormData(prev => ({ ...prev, interactionMessage: e.target.value }))}
                    rows={2} 
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none resize-none text-slate-200" 
                    placeholder="Specifické varování pro tuto kombinaci..."
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isSevere: !prev.isSevere }))}
                  className={cn(
                    "w-full p-6 rounded-[32px] border flex items-center justify-between transition-all",
                    formData.isSevere 
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-500" 
                      : "bg-slate-950 border-border-muted text-slate-500"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                      formData.isSevere ? "bg-rose-500/20 border-rose-500/30" : "bg-slate-900 border-border-muted"
                    )}>
                      <AlertTriangle size={24} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold">Život ohrožující</div>
                      <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">Kritické riziko při kombinaci</div>
                    </div>
                  </div>
                  <div className={cn(
                    "w-12 h-6 rounded-full relative transition-all",
                    formData.isSevere ? "bg-rose-500" : "bg-slate-800"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      formData.isSevere ? "right-1" : "left-1"
                    )} />
                  </div>
                </button>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Cross-tolerance</h3>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto scrollbar-hide pr-2">
                    {substances.filter(s => s.id !== formData.id).map(s => {
                      const isSelected = (formData.crossTolerance || []).includes(s.id);
                      return (
                        <button 
                          key={s.id} 
                          type="button"
                          onClick={() => {
                            const next = isSelected 
                              ? (formData.crossTolerance || []).filter(id => id !== s.id)
                              : [...(formData.crossTolerance || []), s.id];
                            setFormData(prev => ({ ...prev, crossTolerance: next }));
                          }}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all",
                            isSelected 
                              ? "bg-amber-500/10 border-amber-500/50 text-amber-200" 
                              : "bg-slate-950 border-border-muted text-slate-400"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-slate-900 border border-border-muted">
                              <Activity size={12} style={{ color: s.color }} />
                            </div>
                            <span className="text-xs font-bold">{s.name}</span>
                          </div>
                          <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                            isSelected ? "bg-amber-500 border-amber-500" : "border-slate-700"
                          )}>
                            {isSelected && <X size={10} className="text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-slate-600 font-medium px-1">Užívání vybraných látek bude zvyšovat toleranci i pro tuto látku.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Vazba na proteiny (%)</label>
                    <input 
                      type="number" 
                      value={formData.proteinBinding || 0} 
                      onChange={e => setFormData(prev => ({ ...prev, proteinBinding: parseFloat(e.target.value) }))}
                      step="1" 
                      min="0" 
                      max="100"
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Distribuční objem (L/kg)</label>
                    <input 
                      type="number" 
                      value={formData.volumeOfDistribution || 0.7} 
                      onChange={e => setFormData(prev => ({ ...prev, volumeOfDistribution: parseFloat(e.target.value) }))}
                      step="0.01" 
                      min="0.01" 
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Clearance (L/h/kg)</label>
                    <input 
                      type="number" 
                      value={formData.clearanceRate || 0} 
                      onChange={e => setFormData(prev => ({ ...prev, clearanceRate: parseFloat(e.target.value) }))}
                      step="0.01" 
                      min="0" 
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Molární hmotnost (g/mol)</label>
                    <input 
                      type="number" 
                      value={formData.molarMass || 0} 
                      onChange={e => setFormData(prev => ({ ...prev, molarMass: parseFloat(e.target.value) }))}
                      step="0.1" 
                      min="0" 
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">pKa</label>
                    <input 
                      type="number" 
                      value={formData.pKa || 7.4} 
                      onChange={e => setFormData(prev => ({ ...prev, pKa: parseFloat(e.target.value) }))}
                      step="0.1" 
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">logP (Lipofilicita)</label>
                    <input 
                      type="number" 
                      value={formData.logP || 0} 
                      onChange={e => setFormData(prev => ({ ...prev, logP: parseFloat(e.target.value) }))}
                      step="0.1" 
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Potenciál závislosti</label>
                    <select 
                      value={formData.addictionPotential || 'low'} 
                      onChange={e => setFormData(prev => ({ ...prev, addictionPotential: e.target.value as any }))}
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200 h-[58px]"
                    >
                      <option value="low">Nízký</option>
                      <option value="moderate">Střední</option>
                      <option value="high">Vysoký</option>
                      <option value="very-high">Velmi vysoký</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Legální status</label>
                    <input 
                      type="text" 
                      value={formData.legalityStatus || 'legal'} 
                      onChange={e => setFormData(prev => ({ ...prev, legalityStatus: e.target.value }))}
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                      placeholder="Např. Legální / Rx / Schedule I"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Poločas tolerance (dny)</label>
                  <input 
                    type="number" 
                    value={formData.toleranceHalfLife || 7} 
                    onChange={e => setFormData(prev => ({ ...prev, toleranceHalfLife: parseFloat(e.target.value) }))}
                    step="1" 
                    min="1" 
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Prahová toxicita (násobek běžné dávky)</label>
                  <input 
                    type="number" 
                    value={formData.toxicity || 5} 
                    onChange={e => setFormData(prev => ({ ...prev, toxicity: parseFloat(e.target.value) }))}
                    step="0.1" 
                    min="1" 
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Tolerance faktor (%/den)</label>
                    <input 
                      type="number" 
                      value={formData.toleranceRate || 10} 
                      onChange={e => setFormData(prev => ({ ...prev, toleranceRate: parseFloat(e.target.value) }))}
                      step="0.1" 
                      min="0" 
                      max="100" 
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Doba návratu (dní)</label>
                    <input 
                      type="number" 
                      value={formData.toleranceReset || 14} 
                      onChange={e => setFormData(prev => ({ ...prev, toleranceReset: parseFloat(e.target.value) }))}
                      step="1" 
                      min="1" 
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-border-muted focus:border-cyan-primary outline-none text-slate-200" 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isPrescription: !prev.isPrescription }))}
                    className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between transition-all",
                      formData.isPrescription ? "bg-cyan-primary/10 border-cyan-primary/30 text-cyan-primary" : "bg-slate-950 border-border-muted text-slate-500"
                    )}
                  >
                    <span className="text-sm font-bold">Pouze na předpis</span>
                    <div className={cn("w-10 h-5 rounded-full relative transition-all", formData.isPrescription ? "bg-cyan-primary" : "bg-slate-800")}>
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", formData.isPrescription ? "right-1" : "left-1")} />
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isIllegal: !prev.isIllegal }))}
                    className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between transition-all",
                      formData.isIllegal ? "bg-rose-500/10 border-rose-500/30 text-rose-500" : "bg-slate-950 border-border-muted text-slate-500"
                    )}
                  >
                    <span className="text-sm font-bold">Nelegální látka</span>
                    <div className={cn("w-10 h-5 rounded-full relative transition-all", formData.isIllegal ? "bg-rose-500" : "bg-slate-800")}>
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", formData.isIllegal ? "right-1" : "left-1")} />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-border-muted bg-slate-900/80 backdrop-blur-xl flex gap-4">
          <button 
            type="button" 
            onClick={onClose} 
            className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] border border-border-muted text-slate-400 hover:bg-slate-800 transition-all"
          >
            Zrušit
          </button>
          <button 
            form="substance-form"
            type="submit" 
            className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] bg-cyan-primary text-black shadow-lg shadow-cyan-primary/20 active:scale-[0.98] transition-all"
          >
            Uložit konfiguraci
          </button>
        </div>
      </motion.div>
    </div>
  );
}
