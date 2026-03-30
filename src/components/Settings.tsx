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
  ExternalLink,
  Moon,
  Sun
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
        className="absolute inset-0 bg-theme-bg/90 backdrop-blur-md"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative bg-theme-subtle backdrop-blur-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-xl h-[90vh] md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] border-t md:border border-theme-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme-border bg-theme-subtle">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-primary/10 flex items-center justify-center border border-cyan-primary/20 shadow-[0_0_15px_rgba(0,209,255,0.1)]">
              <SettingsIcon className="text-cyan-primary" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-theme-text uppercase tracking-tight">Nastavení systému</h2>
              <p className="text-[9px] text-ios-gray font-black uppercase tracking-[0.3em]">Konfigurace BioTrackeru</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-theme-subtle-hover transition-all text-ios-gray hover:text-theme-text active:scale-90">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-6 relative">
          {/* Background Decorative Elements */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[5%] right-[-5%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[15%] left-[-5%] w-[35%] h-[35%] bg-purple-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          </div>

          {/* User Profile */}
          <div className="space-y-4 relative z-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-ios-gray flex items-center gap-3 px-1">
              <User size={12} className="text-cyan-primary" /> Biometrický profil
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-ios-gray ml-1">Váha (kg)</label>
                <input 
                  type="number" 
                  value={localSettings.userWeight} 
                  onChange={e => setLocalSettings(prev => ({ ...prev, userWeight: parseInt(e.target.value) }))}
                  className="w-full p-4 rounded-2xl bg-theme-subtle border border-theme-border text-sm outline-none focus:border-cyan-primary transition-all text-theme-text font-black shadow-inner" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-ios-gray ml-1">Věk</label>
                <input 
                  type="number" 
                  value={localSettings.userAge} 
                  onChange={e => setLocalSettings(prev => ({ ...prev, userAge: parseInt(e.target.value) }))}
                  className="w-full p-4 rounded-2xl bg-theme-subtle border border-theme-border text-sm outline-none focus:border-cyan-primary transition-all text-theme-text font-black shadow-inner" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-ios-gray ml-1">Metabolismus</label>
              <select 
                value={localSettings.userMetabolism} 
                onChange={e => setLocalSettings(prev => ({ ...prev, userMetabolism: e.target.value as any }))}
                className="w-full p-4 rounded-2xl bg-theme-subtle border border-theme-border text-sm outline-none focus:border-cyan-primary transition-all text-theme-text h-[54px] font-black shadow-inner appearance-none"
              >
                <option value="slow">Pomalý (-20%)</option>
                <option value="normal">Normální</option>
                <option value="fast">Rychlý (+20%)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-ios-gray ml-1">Týdenní rozpočet (Kč)</label>
              <input 
                type="number" 
                value={localSettings.weeklyBudget || 1000} 
                onChange={e => setLocalSettings(prev => ({ ...prev, weeklyBudget: parseInt(e.target.value) }))}
                className="w-full p-4 rounded-2xl bg-theme-subtle border border-theme-border text-sm outline-none focus:border-cyan-primary transition-all text-theme-text font-black shadow-inner" 
              />
            </div>
          </div>

          {/* Display Settings */}
          <div className="space-y-4 relative z-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-ios-gray flex items-center gap-3 px-1">
              <Monitor size={12} className="text-cyan-primary" /> Rozhraní
            </h3>
            <div className="space-y-2">
              {[
                { id: 'timeFormat24h', label: '24h formát času', icon: Clock },
                { id: 'showSeconds', label: 'Zobrazit sekundy', icon: Activity },
                { id: 'compactMode', label: 'Kompaktní režim', icon: Smartphone },
                { id: 'theme', label: localSettings.theme === 'dark' ? 'Tmavý režim' : 'Světlý režim', icon: localSettings.theme === 'dark' ? Moon : Sun },
              ].map(item => (
                <button 
                  key={item.id} 
                  onClick={() => {
                    if (item.id === 'theme') {
                      setLocalSettings(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
                    } else {
                      setLocalSettings(prev => ({ ...prev, [item.id]: !(prev as any)[item.id] }));
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl border transition-all backdrop-blur-3xl shadow-sm",
                    item.id === 'theme' 
                      ? "bg-theme-subtle border-theme-border text-ios-gray"
                      : ((localSettings as any)[item.id] 
                        ? "bg-cyan-primary/10 border-cyan-primary/30 text-cyan-primary shadow-[0_0_15px_rgba(0,209,255,0.05)]" 
                        : "bg-theme-subtle border-theme-border text-ios-gray")
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} />
                    <span className="text-xs font-black uppercase tracking-tight">{item.label}</span>
                  </div>
                  <div className={cn(
                    "w-10 h-5 rounded-full relative transition-all shadow-inner",
                    item.id === 'theme' 
                      ? "bg-theme-border"
                      : ((localSettings as any)[item.id] ? "bg-cyan-primary" : "bg-theme-border")
                  )}>
                    <div className={cn(
                      "absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-md",
                      item.id === 'theme'
                        ? (localSettings.theme === 'dark' ? "left-1" : "right-1")
                        : ((localSettings as any)[item.id] ? "right-1" : "left-1")
                    )} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Effects */}
          <div className="space-y-4 relative z-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-ios-gray flex items-center gap-3 px-1">
              <Sparkles size={12} className="text-cyan-primary" /> Knihovna účinků
            </h3>
            <div className="flex flex-col gap-4 p-4 bg-theme-subtle backdrop-blur-3xl border border-theme-border rounded-[2rem] shadow-sm">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newEffectName} 
                  onChange={e => setNewEffectName(e.target.value)}
                  className="flex-1 p-3.5 rounded-xl bg-theme-subtle border border-theme-border text-xs outline-none focus:border-cyan-primary transition-all text-theme-text font-black shadow-inner" 
                  placeholder="Nový účinek..." 
                />
                <select 
                  value={newEffectType} 
                  onChange={e => setNewEffectType(e.target.value as Valence)}
                  className="p-3.5 rounded-xl bg-theme-subtle border border-theme-border text-[10px] outline-none focus:border-cyan-primary transition-all text-theme-text font-black shadow-inner appearance-none"
                >
                  <option value="positive">Pozit.</option>
                  <option value="negative">Negat.</option>
                  <option value="neutral">Neutr.</option>
                </select>
                <button 
                  onClick={addCustomEffect}
                  className="p-3.5 rounded-xl bg-cyan-primary text-black hover:bg-cyan-primary/80 transition-all active:scale-90 shadow-[0_0_15px_rgba(0,209,255,0.2)]"
                >
                  <Plus size={20} />
                </button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide pr-1">
                {customEffects.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-theme-border rounded-2xl bg-theme-subtle">
                    <p className="text-[10px] text-ios-gray font-black uppercase tracking-[0.2em]">Žádné vlastní účinky</p>
                  </div>
                ) : (
                  customEffects.map((effect, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 bg-theme-subtle rounded-xl border border-theme-border group hover:bg-theme-subtle-hover transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-theme-subtle border border-theme-border shadow-inner">
                          <Activity size={14} style={{ color: effect.color }} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-theme-text uppercase tracking-tight">{effect.name}</span>
                          <span className={cn(
                            "text-[8px] uppercase font-black tracking-[0.2em] ml-2 px-1.5 py-0.5 rounded-md",
                            effect.valence === 'positive' ? "bg-emerald-500/10 text-emerald-400" : effect.valence === 'negative' ? "bg-rose-500/10 text-rose-400" : "bg-cyan-primary/10 text-cyan-primary"
                          )}>
                            {effect.valence}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteCustomEffect(i)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-ios-gray hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="space-y-4 relative z-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-ios-gray flex items-center gap-3 px-1">
              <Database size={12} className="text-cyan-primary" /> Správa dat
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={onExport}
                className="py-4 px-4 rounded-[2rem] bg-theme-subtle backdrop-blur-3xl border border-theme-border hover:bg-theme-subtle-hover flex flex-col items-center justify-center gap-2 transition-all group shadow-sm"
              >
                <div className="p-3 rounded-2xl bg-theme-subtle border border-theme-border group-hover:scale-110 transition-transform shadow-inner">
                  <Download className="text-ios-gray group-hover:text-cyan-primary transition-colors" size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-ios-gray">Export</span>
              </button>
              <label className="py-4 px-4 rounded-[2rem] bg-theme-subtle backdrop-blur-3xl border border-theme-border hover:bg-theme-subtle-hover flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group shadow-sm">
                <div className="p-3 rounded-2xl bg-theme-subtle border border-theme-border group-hover:scale-110 transition-transform shadow-inner">
                  <Upload className="text-ios-gray group-hover:text-cyan-primary transition-colors" size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-ios-gray">Import</span>
                <input type="file" accept=".json" onChange={onImport} className="hidden" />
              </label>
            </div>
            <button 
              onClick={onClearData}
              className="w-full py-4 rounded-[2rem] border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-sm"
            >
              <Trash2 size={16} /> Smazat všechna data
            </button>
          </div>

          {/* About App Section */}
          <div className="space-y-4 relative z-10 pt-6 border-t border-theme-border">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-ios-gray flex items-center gap-3 px-1">
              <Info size={12} className="text-cyan-primary" /> O Aplikaci
            </h3>
            <div className="p-6 rounded-[2.5rem] bg-theme-subtle backdrop-blur-3xl border border-theme-border space-y-6 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,209,255,0.3)]">
                  <Activity size={28} className="text-theme-text" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-theme-text uppercase tracking-tight">BioTracker Pro</h4>
                  <p className="text-[10px] text-ios-gray font-black uppercase tracking-[0.2em]">Verze 2.4.0 "Glass Edition"</p>
                </div>
              </div>
              
              <p className="text-[11px] text-ios-gray leading-relaxed font-medium">
                BioTracker je pokročilý nástroj pro monitorování biometrických dat, kinetiky látek a analýzu trendů. 
                Navržen pro maximální soukromí a efektivitu. Všechna data jsou uložena lokálně ve vašem prohlížeči.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2.5 p-3 rounded-xl bg-theme-subtle hover:bg-theme-subtle-hover transition-all group border border-theme-border">
                  <Github size={14} className="text-ios-gray group-hover:text-theme-text" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-ios-gray group-hover:text-theme-text">GitHub</span>
                </button>
                <button className="flex items-center justify-center gap-2.5 p-3 rounded-xl bg-theme-subtle hover:bg-theme-subtle-hover transition-all group border border-theme-border">
                  <ExternalLink size={14} className="text-ios-gray group-hover:text-theme-text" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-ios-gray group-hover:text-theme-text">Web</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-ios-gray">Made with</span>
                <Heart size={10} className="text-rose-500 fill-rose-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-ios-gray">for better health</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-theme-border bg-theme-subtle backdrop-blur-3xl">
          <button 
            onClick={handleSave}
            className="w-full py-4.5 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] bg-cyan-primary text-black shadow-[0_0_20px_rgba(0,209,255,0.3)] active:scale-[0.98] transition-all hover:bg-cyan-primary/90"
          >
            Uložit konfiguraci
          </button>
        </div>
      </motion.div>
    </div>
  );
}
