import React, { useState } from 'react';
import { 
  X, 
  User, 
  Monitor, 
  Bell, 
  Sparkles, 
  Database, 
  Download, 
  Upload, 
  Trash2,
  Plus,
  Activity,
  Clock,
  Settings as SettingsIcon,
  ShieldCheck,
  Smartphone,
  Info,
  Github,
  Heart,
  ExternalLink
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
    const icons = ['sparkles', 'zap', 'heart', 'brain', 'activity', 'smile', 'frown', 'alert-circle'];
    const colors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#06b6d4', '#f43f5e'];
    
    const newEffect: CustomEffect = {
      name: newEffectName.trim(),
      icon: icons[Math.floor(Math.random() * icons.length)],
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
        className="relative bg-card-bg rounded-t-3xl md:rounded-3xl w-full max-w-xl h-[90vh] md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border-t md:border border-border-muted"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-muted bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-primary/10 flex items-center justify-center border border-cyan-primary/20">
              <SettingsIcon className="text-cyan-primary" size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-100 uppercase tracking-tight">Nastavení systému</h2>
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em]">Konfigurace BioTrackeru</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-6 relative">
          {/* Background Decorative Elements */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[5%] right-[-5%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[15%] left-[-5%] w-[35%] h-[35%] bg-purple-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          </div>

          {/* User Profile */}
          <div className="space-y-3 relative z-10">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1">
              <User size={10} className="text-cyan-primary" /> Biometrický profil
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Váha (kg)</label>
                <input 
                  type="number" 
                  value={localSettings.userWeight} 
                  onChange={e => setLocalSettings(prev => ({ ...prev, userWeight: parseInt(e.target.value) }))}
                  className="w-full p-3 rounded-xl bg-slate-950/40 backdrop-blur-md border border-white/5 text-xs outline-none focus:border-cyan-primary transition-all text-slate-200 font-bold" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Věk</label>
                <input 
                  type="number" 
                  value={localSettings.userAge} 
                  onChange={e => setLocalSettings(prev => ({ ...prev, userAge: parseInt(e.target.value) }))}
                  className="w-full p-3 rounded-xl bg-slate-950/40 backdrop-blur-md border border-white/5 text-xs outline-none focus:border-cyan-primary transition-all text-slate-200 font-bold" 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Metabolismus</label>
              <select 
                value={localSettings.userMetabolism} 
                onChange={e => setLocalSettings(prev => ({ ...prev, userMetabolism: e.target.value as any }))}
                className="w-full p-3 rounded-xl bg-slate-950/40 backdrop-blur-md border border-white/5 text-xs outline-none focus:border-cyan-primary transition-all text-slate-200 h-[46px] font-bold"
              >
                <option value="slow">Pomalý (-20%)</option>
                <option value="normal">Normální</option>
                <option value="fast">Rychlý (+20%)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Týdenní rozpočet (Kč)</label>
              <input 
                type="number" 
                value={localSettings.weeklyBudget || 1000} 
                onChange={e => setLocalSettings(prev => ({ ...prev, weeklyBudget: parseInt(e.target.value) }))}
                className="w-full p-3 rounded-xl bg-slate-950/40 backdrop-blur-md border border-white/5 text-xs outline-none focus:border-cyan-primary transition-all text-slate-200 font-bold" 
              />
            </div>
          </div>

          {/* Display Settings */}
          <div className="space-y-3 relative z-10">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1">
              <Monitor size={10} className="text-cyan-primary" /> Rozhraní
            </h3>
            <div className="space-y-1.5">
              {[
                { id: 'timeFormat24h', label: '24h formát času', icon: Clock },
                { id: 'showSeconds', label: 'Zobrazit sekundy', icon: Activity },
                { id: 'compactMode', label: 'Kompaktní režim', icon: Smartphone },
              ].map(item => (
                <button 
                  key={item.id} 
                  onClick={() => setLocalSettings(prev => ({ ...prev, [item.id]: !(prev as any)[item.id] }))}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all backdrop-blur-md",
                    (localSettings as any)[item.id] 
                      ? "bg-cyan-primary/10 border-cyan-primary/30 text-cyan-primary" 
                      : "bg-slate-950/40 border-white/5 text-slate-400"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon size={16} />
                    <span className="text-xs font-black uppercase tracking-tight">{item.label}</span>
                  </div>
                  <div className={cn(
                    "w-8 h-4 rounded-full relative transition-all",
                    (localSettings as any)[item.id] ? "bg-cyan-primary" : "bg-slate-800"
                  )}>
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                      (localSettings as any)[item.id] ? "right-0.5" : "left-0.5"
                    )} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Effects */}
          <div className="space-y-3 relative z-10">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1">
              <Sparkles size={10} className="text-cyan-primary" /> Knihovna účinků
            </h3>
            <div className="flex flex-col gap-2.5 p-3 bg-slate-950/40 backdrop-blur-md border border-white/5 rounded-2xl">
              <div className="flex gap-1.5">
                <input 
                  type="text" 
                  value={newEffectName} 
                  onChange={e => setNewEffectName(e.target.value)}
                  className="flex-1 p-2.5 rounded-lg bg-slate-900/50 border border-white/5 text-xs outline-none focus:border-cyan-primary transition-all text-slate-200 font-bold" 
                  placeholder="Nový účinek..." 
                />
                <select 
                  value={newEffectType} 
                  onChange={e => setNewEffectType(e.target.value as Valence)}
                  className="p-2.5 rounded-lg bg-slate-900/50 border border-white/5 text-[10px] outline-none focus:border-cyan-primary transition-all text-slate-200 font-bold"
                >
                  <option value="positive">Pozit.</option>
                  <option value="negative">Negat.</option>
                  <option value="neutral">Neutr.</option>
                </select>
                <button 
                  onClick={addCustomEffect}
                  className="p-2.5 rounded-lg bg-cyan-primary text-black hover:bg-cyan-primary/80 transition-all active:scale-90"
                >
                  <Plus size={18} />
                </button>
              </div>
              
              <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-hide pr-1">
                {customEffects.length === 0 ? (
                  <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.2em] text-center py-3">Žádné vlastní účinky</p>
                ) : (
                  customEffects.map((effect, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-slate-900/30 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-950/50 border border-white/5">
                          <Activity size={12} style={{ color: effect.color }} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-200 uppercase tracking-tight">{effect.name}</span>
                          <span className={cn(
                            "text-[7px] uppercase font-black tracking-[0.2em] ml-2",
                            effect.valence === 'positive' ? "text-emerald-400" : effect.valence === 'negative' ? "text-rose-400" : "text-cyan-primary"
                          )}>
                            {effect.valence}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteCustomEffect(i)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="space-y-3 relative z-10">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1">
              <Database size={10} className="text-cyan-primary" /> Správa dat
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                onClick={onExport}
                className="py-3 px-3 rounded-xl bg-slate-950/40 backdrop-blur-md border border-white/5 hover:bg-slate-900/60 flex flex-col items-center justify-center gap-1.5 transition-all group"
              >
                <Download className="text-slate-500 group-hover:text-cyan-primary transition-colors" size={18} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Export</span>
              </button>
              <label className="py-3 px-3 rounded-xl bg-slate-950/40 backdrop-blur-md border border-white/5 hover:bg-slate-900/60 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all group">
                <Upload className="text-slate-500 group-hover:text-cyan-primary transition-colors" size={18} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Import</span>
                <input type="file" accept=".json" onChange={onImport} className="hidden" />
              </label>
            </div>
            <button 
              onClick={onClearData}
              className="w-full py-3 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 flex items-center justify-center gap-2 transition-all font-black text-[9px] uppercase tracking-[0.2em]"
            >
              <Trash2 size={14} /> Smazat všechna data
            </button>
          </div>

          {/* About App Section */}
          <div className="space-y-3 relative z-10 pt-4 border-t border-white/5">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1">
              <Info size={10} className="text-cyan-primary" /> O Aplikaci
            </h3>
            <div className="p-4 rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Activity size={24} className="text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">BioTracker Pro</h4>
                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Verze 2.4.0 "Glass Edition"</p>
                </div>
              </div>
              
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                BioTracker je pokročilý nástroj pro monitorování biometrických dat, kinetiky látek a analýzu trendů. 
                Navržen pro maximální soukromí a efektivitu. Všechna data jsou uložena lokálně ve vašem prohlížeči.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                  <Github size={12} className="text-slate-500 group-hover:text-white" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-200">GitHub</span>
                </button>
                <button className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                  <ExternalLink size={12} className="text-slate-500 group-hover:text-white" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-200">Web</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 pt-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Made with</span>
                <Heart size={8} className="text-rose-500 fill-rose-500" />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">for better health</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border-muted bg-slate-900/80 backdrop-blur-xl">
          <button 
            onClick={handleSave}
            className="w-full py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] bg-cyan-primary text-black shadow-lg shadow-cyan-primary/20 active:scale-[0.98] transition-all"
          >
            Uložit konfiguraci
          </button>
        </div>
      </motion.div>
    </div>
  );
}
