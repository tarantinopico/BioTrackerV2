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
  CheckCircle,
  ChevronRight,
  FlaskConical,
  Scale,
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
    const duration = Math.max(halfLife * 5, tmax * 4, 12);
    const steps = 100;
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
    <div className="h-48 w-full android-card p-5 relative overflow-hidden glass-accent group">
      <div className="flex justify-between items-start relative z-10 mb-4">
        <div>
          <div className="text-[10px] font-bold text-android-accent uppercase tracking-widest">Kinetics Preview</div>
          <div className="text-[8px] text-android-text-muted uppercase font-bold tracking-wider mt-0.5">Estimated concentration curve</div>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-[8px] text-android-text-muted font-bold uppercase tracking-widest">Tmax</div>
            <div className="text-xs font-bold text-android-text tabular-nums">{tmax}h</div>
          </div>
          <div className="text-right">
            <div className="text-[8px] text-android-text-muted font-bold uppercase tracking-widest">T1/2</div>
            <div className="text-xs font-bold text-android-text tabular-nums">{halfLife}h</div>
          </div>
        </div>
      </div>

      <div className="h-28 w-full relative z-10">
        <ReResponsiveContainer width="100%" height="100%">
          <ReAreaChart data={data}>
            <defs>
              <linearGradient id="kineticsGradEditor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <ReCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <ReXAxis dataKey="time" hide />
            <ReYAxis hide domain={[0, 110]} />
            <ReArea 
              type="monotone" 
              dataKey="level" 
              stroke={color} 
              fill="url(#kineticsGradEditor)" 
              strokeWidth={3} 
              animationDuration={1000} 
              dot={false}
            />
          </ReAreaChart>
        </ReResponsiveContainer>
      </div>
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

type TabType = 'basic' | 'kinetics' | 'metabolism' | 'effects' | 'interactions';

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
        color: '#00f2ff',
        unit: 'mg',
        step: 1,
        price: 0,
        category: 'other',
        halfLife: 4,
        tmax: 1,
        onset: 15,
        strains: [],
        effects: [],
        interactions: []
      });
    }
  }, [substanceId, substances, isOpen, template]);

  const handleSave = () => {
    onSave(formData as Substance);
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'basic', label: 'Basic', icon: Info },
    { id: 'kinetics', label: 'Kinetics', icon: Activity },
    { id: 'metabolism', label: 'Metabolism', icon: Timer },
    { id: 'effects', label: 'Effects', icon: Sparkles },
    { id: 'interactions', label: 'Safety', icon: AlertTriangle },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative bg-android-bg border-t border-white/10 rounded-t-[3.5rem] w-full max-w-xl h-[94vh] overflow-hidden flex flex-col shadow-[0_-20px_80px_rgba(0,0,0,0.8)]"
      >
        <div className="w-12 h-1.5 bg-android-border rounded-full mx-auto mt-6 mb-2 opacity-50" />
        
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-android-border/50">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-android-text tracking-tighter">
              {substanceId && substanceId !== 'new' ? 'Calibrate Unit' : 'Synthesize Unit'}
            </h2>
            <p className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Pharmacology Array Config</p>
          </div>
          <button onClick={onClose} className="p-3.5 rounded-2xl bg-android-surface border border-android-border text-android-text-muted hover:text-android-text android-button shadow-inner">
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>
        
        {/* Sub-Tabs - Glass Style */}
        <div className="flex bg-android-surface/20 px-4 pt-4 overflow-x-auto no-scrollbar gap-3 border-b border-android-border/30">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-2 px-6 py-4 rounded-t-[2rem] transition-all min-w-[110px] border-t border-x relative overflow-hidden",
                  isActive 
                    ? "bg-android-bg border-android-border text-android-accent" 
                    : "border-transparent text-android-text-muted hover:text-android-text"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-android-accent shadow-[0_0_10px_rgba(0,242,255,0.5)]" 
                  />
                )}
                <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-transform duration-500", isActive && "scale-110")} />
                <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Main Form Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar bg-gradient-to-b from-android-bg to-android-surface/20">
          {activeTab === 'basic' && (
            <section className="space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2 text-glow-blue">Molecular Identity</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-50">
                    <FlaskConical size={20} />
                  </div>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="android-input w-full pl-12 h-18 text-xl font-black tracking-tight shadow-xl" 
                    placeholder="Enter Chemical Name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Visual Spectrum</label>
                  <div className="flex items-center gap-5 p-4 rounded-3xl bg-android-surface border border-android-border shadow-inner group">
                    <div className="relative">
                      <input 
                        type="color" 
                        value={formData.color || '#00f2ff'} 
                        onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="w-12 h-12 rounded-2xl cursor-pointer bg-transparent border-none p-0 relative z-10" 
                      />
                      <div className="absolute inset-0 rounded-2xl blur-md opacity-50 pointer-events-none" style={{ backgroundColor: formData.color }} />
                    </div>
                    <span className="text-xs font-black text-android-text-muted uppercase tracking-wider font-mono">{formData.color}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Classification</label>
                  <div className="relative group">
                    <select 
                      value={formData.category || 'other'} 
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as SubstanceCategory }))}
                      className="android-input w-full h-[82px] font-black appearance-none text-xs uppercase tracking-[0.1em] pl-5"
                    >
                      <option value="stimulant">⚡ Stimulant</option>
                      <option value="depressant">🌙 Depressant</option>
                      <option value="psychedelic">🌀 Psychedelic</option>
                      <option value="dissociative">🫧 Dissociative</option>
                      <option value="opioid">💠 Opioid</option>
                      <option value="cannabinoid">🌿 Cannabinoid</option>
                      <option value="nootropic">🧠 Nootropic</option>
                      <option value="supplement">💊 Supplement</option>
                      <option value="other">⚙️ Other</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-android-text-muted">
                      <ArrowDown size={16} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Mass Unit</label>
                  <input 
                    type="text" 
                    value={formData.unit || ''} 
                    onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="android-input w-full h-16 text-lg font-black tracking-tight" 
                    placeholder="e.g. MG"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Granularity</label>
                  <input 
                    type="number" 
                    value={formData.step || 1} 
                    onChange={e => setFormData(prev => ({ ...prev, step: parseFloat(e.target.value) }))}
                    className="android-input w-full h-16 text-lg font-black tracking-tight" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Financial Valuation (PER UNIT)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-50">
                    <Scale size={20} />
                  </div>
                  <input 
                    type="number" 
                    value={formData.price || 0} 
                    onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                    className="android-input w-full pl-12 h-18 text-xl font-black tracking-tight" 
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-android-text-muted uppercase tracking-widest text-xs">KČ</div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'kinetics' && (
            <section className="space-y-12">
              <KineticsPreview 
                halfLife={formData.halfLife || 4} 
                tmax={formData.tmax || 1} 
                onset={formData.onset || 15} 
                color={formData.color || '#00f2ff'} 
              />
              
              <div className="space-y-10">
                <div className="space-y-5">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Molecular Half-Life</label>
                    <span className="text-base font-black text-android-accent bg-android-accent/10 px-4 py-1.5 rounded-2xl border border-android-accent/20 shadow-lg">{formData.halfLife} HOURS</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="168" 
                    step="0.1"
                    value={formData.halfLife || 4} 
                    onChange={e => setFormData(prev => ({ ...prev, halfLife: parseFloat(e.target.value) }))}
                    className="w-full accent-android-accent h-2 bg-android-surface rounded-full appearance-none cursor-pointer shadow-inner border border-white/5"
                  />
                </div>

                <div className="space-y-5">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Peak Concentration Time</label>
                    <span className="text-base font-black text-android-accent bg-android-accent/10 px-4 py-1.5 rounded-2xl border border-android-accent/20 shadow-lg">{formData.tmax} HOURS</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="24" 
                    step="0.1"
                    value={formData.tmax || 1} 
                    onChange={e => setFormData(prev => ({ ...prev, tmax: parseFloat(e.target.value) }))}
                    className="w-full accent-android-accent h-2 bg-android-surface rounded-full appearance-none cursor-pointer shadow-inner border border-white/5"
                  />
                </div>

                <div className="space-y-5">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Initial Onset Velocity</label>
                    <span className="text-base font-black text-android-accent bg-android-accent/10 px-4 py-1.5 rounded-2xl border border-android-accent/20 shadow-lg">{formData.onset} MINUTES</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="300" 
                    step="5"
                    value={formData.onset || 15} 
                    onChange={e => setFormData(prev => ({ ...prev, onset: parseInt(e.target.value) }))}
                    className="w-full accent-android-accent h-2 bg-android-surface rounded-full appearance-none cursor-pointer shadow-inner border border-white/5"
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'metabolism' && (
            <section className="space-y-10">
              <div className="android-card p-10 border-android-accent/20 bg-android-accent/5 glass-accent overflow-hidden relative border-white/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-android-accent/10 blur-[80px] -mr-16 -mt-16 pointer-events-none" />
                <div className="flex gap-6 items-center relative z-10">
                  <div className="w-16 h-16 bg-android-accent text-android-bg rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.3)]">
                    <Timer size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-android-text tracking-tight">Metabolic Protocol</h4>
                    <p className="text-xs font-bold text-android-text-muted mt-1.5 leading-relaxed opacity-80">Choose the clearance mathematical model. standard protocol uses exponential decay architecture.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Algorithmic Curve Model</label>
                <div className="grid grid-cols-2 gap-4">
                  {['standard', 'linear', 'alcohol', 'sigmoid'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, metabolismCurve: type as any }))}
                      className={cn(
                        "p-6 rounded-[2.5rem] border font-black uppercase tracking-[0.2em] text-[11px] transition-all duration-500 android-button shadow-lg",
                        formData.metabolismCurve === type 
                          ? "bg-android-accent text-android-bg border-transparent shadow-[0_10px_30px_rgba(0,242,255,0.3)]" 
                          : "bg-android-surface border-android-border text-android-text-muted hover:border-android-accent/30"
                      )}
                    >
                      {type} Model
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'effects' && (
            <section className="space-y-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black text-android-text uppercase tracking-[0.2em]">Active Stimuli Response</h3>
                  <span className="text-[10px] font-black text-android-accent uppercase tracking-wider">{formData.effects?.length || 0} Calibrated</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {formData.effects?.map((effect, idx) => (
                    <motion.div 
                      layout
                      key={idx} 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-3 pl-5 pr-2 py-2 rounded-[1.5rem] bg-android-surface border border-android-border shadow-xl relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-android-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <span className="text-[11px] font-black text-android-text uppercase tracking-[0.15em] relative z-10">{effect.type}</span>
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, effects: prev.effects?.filter((_, i) => i !== idx) }))}
                        className="p-2 rounded-xl bg-android-bg border border-android-border text-android-text-muted hover:text-red-500 hover:border-red-500/30 transition-all relative z-10 android-button"
                      >
                        <X size={14} strokeWidth={3} />
                      </button>
                    </motion.div>
                  ))}
                  <button 
                    type="button"
                    className="w-12 h-12 rounded-2xl bg-android-accent/10 border border-android-accent/30 text-android-accent flex items-center justify-center android-button shadow-inner hover:bg-android-accent hover:text-android-bg transition-all duration-500"
                  >
                    <Plus size={24} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'interactions' && (
            <section className="space-y-10">
              <div className="android-card p-10 bg-red-500/5 border-red-500/20 glass-accent overflow-hidden relative border-white/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[80px] -mr-16 -mt-16 pointer-events-none" />
                <div className="flex gap-6 items-center relative z-10">
                  <div className="w-16 h-16 bg-red-500 text-white rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                    <AlertTriangle size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-red-500 tracking-tight">Safety Protocol</h4>
                    <p className="text-xs font-bold text-android-text-muted mt-1.5 leading-relaxed opacity-80">Define molecular conflicts and hazardous combinations within the system array.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Conflict Mapping</label>
                <div className="space-y-4">
                  {substances.filter(s => s.id !== formData.id).slice(0, 6).map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        const current = formData.interactions || [];
                        const next = current.includes(sub.id) ? current.filter(id => id !== sub.id) : [...current, sub.id];
                        setFormData(prev => ({ ...prev, interactions: next }));
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-6 rounded-[2.5rem] border transition-all duration-500 text-left group shadow-lg",
                        formData.interactions?.includes(sub.id) 
                          ? "bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_10px_20px_rgba(239,68,68,0.1)]" 
                          : "bg-android-surface border-android-border text-android-text-muted hover:border-android-accent/30"
                      )}
                    >
                      <div className="flex items-center gap-5">
                        <div className={cn("w-3 h-3 rounded-full transition-all duration-500", formData.interactions?.includes(sub.id) ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] scale-125" : "bg-android-border")} />
                        <span className="text-base font-black uppercase tracking-tight">{sub.name}</span>
                      </div>
                      {formData.interactions?.includes(sub.id) && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <AlertTriangle size={20} className="text-red-500" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
        
        {/* Save Footer */}
        <div className="p-8 border-t border-android-border bg-android-bg/95 backdrop-blur-2xl flex gap-5">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 h-18 rounded-[2.25rem] bg-android-surface border border-android-border text-android-text-muted font-black text-xs uppercase tracking-[0.2em] android-button shadow-inner"
          >
            Abort
          </button>
          <button 
            type="button"
            onClick={handleSave}
            className="flex-[2] h-18 rounded-[2.25rem] bg-android-accent text-android-bg font-black text-base uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(0,242,255,0.35)] android-button flex items-center justify-center gap-4"
          >
            <CheckCircle size={24} strokeWidth={4} />
            Commit Sequence
          </button>
        </div>
      </motion.div>
    </div>
  );
}
