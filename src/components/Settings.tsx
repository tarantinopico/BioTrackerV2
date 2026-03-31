import React, { useState } from 'react';
import { 
  X, 
  User, 
  Monitor, 
  Sparkles, 
  Database, 
  Download, 
  Upload, 
  Trash2,
  Plus,
  Activity,
  Clock,
  Settings as SettingsIcon,
  Info,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserSettings, CustomEffect, Valence } from '../types';
import { cn } from '../lib/utils';

interface SettingsProps {
  isOpen: boolean;
  settings: UserSettings;
  customEffects: CustomEffect[];
  onClose: () => void;
  onSave: (settings: UserSettings) => void;
  onSaveEffects: (effects: CustomEffect[]) => void;
  onClearData: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
}

export default function Settings({ 
  isOpen, 
  settings, 
  customEffects, 
  onClose, 
  onSave, 
  onSaveEffects,
  onClearData,
  onImport,
  onExport
}: SettingsProps) {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [newEffectName, setNewEffectName] = useState('');
  const [newEffectType, setNewEffectType] = useState<Valence>('positive');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const addCustomEffect = () => {
    if (!newEffectName.trim()) return;
    const colors = ['#00f2ff', '#00e676', '#d500f9', '#2979ff', '#ffea00', '#ff4081', '#00e5ff', '#ff1744'];
    
    const newEffect: CustomEffect = {
      name: newEffectName.trim(),
      icon: 'sparkles',
      color: colors[Math.floor(Math.random() * colors.length)],
      valence: newEffectType
    };
    
    onSaveEffects([...customEffects, newEffect]);
    setNewEffectName('');
  };

  const deleteCustomEffect = (index: number) => {
    onSaveEffects(customEffects.filter((_, i) => i !== index));
  };

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
        className="relative bg-android-bg border-t border-white/10 rounded-t-[3.5rem] w-full max-w-lg h-[94vh] overflow-hidden flex flex-col shadow-[0_-20px_80px_rgba(0,0,0,0.8)]"
      >
        <div className="w-12 h-1.5 bg-android-border rounded-full mx-auto mt-6 mb-2 opacity-50" />
        
        {/* Header */}
        <div className="flex items-center justify-between p-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-android-text tracking-tighter">Settings<span className="text-android-accent">.</span></h2>
            <p className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Neural System Config</p>
          </div>
          <button onClick={onClose} className="p-3.5 rounded-2xl bg-android-surface border border-android-border text-android-text-muted hover:text-android-text android-button shadow-inner">
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-12 no-scrollbar">
          {/* User Profile */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 rounded-xl bg-android-accent/10 border border-android-accent/20">
                <User size={16} className="text-android-accent" />
              </div>
              <h3 className="text-xs font-black text-android-text uppercase tracking-[0.2em]">Biological Profile</h3>
            </div>
            
            <div className="android-card p-8 space-y-8 glass-accent border-white/5">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Mass (kg)</label>
                  <input 
                    type="number" 
                    value={localSettings.userWeight} 
                    onChange={e => setLocalSettings(prev => ({ ...prev, userWeight: parseInt(e.target.value) }))}
                    className="android-input w-full h-16 text-xl font-black tracking-tight" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Age Cycle</label>
                  <input 
                    type="number" 
                    value={localSettings.userAge} 
                    onChange={e => setLocalSettings(prev => ({ ...prev, userAge: parseInt(e.target.value) }))}
                    className="android-input w-full h-16 text-xl font-black tracking-tight" 
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Metabolic Velocity</label>
                <div className="grid grid-cols-3 gap-3 p-1.5 bg-android-bg rounded-[2rem] border border-android-border shadow-inner">
                  {['slow', 'normal', 'fast'].map(m => (
                    <button
                      key={m}
                      onClick={() => setLocalSettings(prev => ({ ...prev, userMetabolism: m as any }))}
                      className={cn(
                        "py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 android-button",
                        localSettings.userMetabolism === m 
                          ? "bg-android-accent text-android-bg shadow-[0_5px_15px_rgba(0,242,255,0.3)]" 
                          : "text-android-text-muted hover:text-android-text"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Interface Settings */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <Monitor size={16} className="text-purple-400" />
              </div>
              <h3 className="text-xs font-black text-android-text uppercase tracking-[0.2em]">Neural Interface</h3>
            </div>
            
            <div className="android-card overflow-hidden border-white/5 shadow-2xl">
              {[
                { id: 'timeFormat24h', label: '24-hour Chronology', icon: Clock },
                { id: 'showSeconds', label: 'High Precision Clock', icon: Activity },
                { id: 'compactMode', label: 'Molecular View (Compact)', icon: Sparkles },
              ].map((item, i, arr) => (
                <button 
                  key={item.id} 
                  onClick={() => setLocalSettings(prev => ({ ...prev, [item.id]: !(prev as any)[item.id] }))}
                  className={cn(
                    "w-full flex items-center justify-between p-6 hover:bg-android-surface transition-all duration-300 text-left group",
                    i !== arr.length - 1 && "border-b border-android-border"
                  )}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-android-surface border border-android-border flex items-center justify-center text-android-text-muted group-active:text-android-accent transition-colors shadow-inner">
                      <item.icon size={20} strokeWidth={2.5} />
                    </div>
                    <span className="text-base font-black text-android-text tracking-tight">{item.label}</span>
                  </div>
                  <div className={cn(
                    "w-14 h-8 rounded-full relative transition-all duration-500 shadow-inner",
                    (localSettings as any)[item.id] ? "bg-android-accent" : "bg-android-surface border border-android-border"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-6 h-6 rounded-full transition-all duration-500 shadow-lg",
                      (localSettings as any)[item.id] ? "left-7 bg-android-bg" : "left-1 bg-android-text-muted"
                    )} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Data Management */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Database size={16} className="text-emerald-400" />
              </div>
              <h3 className="text-xs font-black text-android-text uppercase tracking-[0.2em]">Core Database</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={onExport}
                className="android-card p-8 flex flex-col items-center justify-center gap-4 android-button bg-android-surface/40 hover:border-android-accent/30 border-white/5 group shadow-xl"
              >
                <div className="w-14 h-14 rounded-3xl bg-android-accent/10 flex items-center justify-center text-android-accent shadow-inner group-hover:scale-110 transition-transform">
                  <Download size={28} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-android-text uppercase tracking-[0.2em]">Backup System</span>
              </button>
              <label className="android-card p-8 flex flex-col items-center justify-center gap-4 android-button bg-android-surface/40 hover:border-android-accent/30 border-white/5 group shadow-xl cursor-pointer">
                <div className="w-14 h-14 rounded-3xl bg-android-accent/10 flex items-center justify-center text-android-accent shadow-inner group-hover:scale-110 transition-transform">
                  <Upload size={28} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-android-text uppercase tracking-[0.2em]">Restore Array</span>
                <input type="file" accept=".json" onChange={onImport} className="hidden" />
              </label>
            </div>
            
            <button 
              onClick={onClearData}
              className="w-full h-16 rounded-[2rem] border border-red-500/20 text-red-500 hover:bg-red-500/5 flex items-center justify-center gap-4 transition-all font-black text-[11px] uppercase tracking-[0.3em] android-button shadow-lg shadow-red-500/5 mt-4"
            >
              <Trash2 size={18} strokeWidth={2.5} /> Force Purge All Memory
            </button>
          </section>

          {/* App Info */}
          <section className="pt-8 border-t border-android-border space-y-8">
            <div className="android-card p-10 space-y-8 glass-accent overflow-hidden relative border-white/5 shadow-2xl">
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-20 h-20 rounded-[2rem] bg-android-accent text-android-bg flex items-center justify-center shadow-[0_0_40px_rgba(0,242,255,0.3)]">
                  <ShieldCheck size={40} strokeWidth={3} />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-android-text tracking-tighter">BioTracker Pro</h4>
                  <p className="text-[10px] text-android-accent font-black uppercase tracking-[0.3em] mt-1 opacity-80">v2.5.0 Molecular OS</p>
                </div>
              </div>
              
              <p className="text-sm text-android-text-muted leading-relaxed font-bold">
                Elite pharmacokinetic monitoring and biometric analysis environment. Your genetic and chemical data never leaves this encrypted device. High-precision science for the digital human.
              </p>

              <div className="flex items-center gap-3 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-4 border-android-card bg-android-surface shadow-lg" />
                  ))}
                </div>
                <span className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] ml-3">Validated by 50k+ Bio-Trackers</span>
              </div>
            </div>
          </section>
        </div>
        
        {/* Footer Actions */}
        <div className="p-8 border-t border-android-border bg-android-bg/95 backdrop-blur-2xl">
          <button 
            onClick={handleSave}
            className="w-full h-18 rounded-[2.5rem] bg-android-accent text-android-bg font-black text-lg uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(0,242,255,0.35)] android-button flex items-center justify-center gap-4"
          >
            <span>Execute Calibration</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
