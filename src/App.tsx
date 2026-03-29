import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Settings as SettingsIcon, 
  Download, 
  LayoutDashboard, 
  Zap, 
  PlusCircle, 
  FlaskConical, 
  BarChart3,
  HeartPulse,
  TrendingUp,
  Clock,
  ArrowDownCircle,
  History,
  Database,
  Package,
  Wallet,
  LineChart,
  BarChart2,
  RefreshCw,
  GitMerge,
  Calendar,
  X,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  Info,
  Layers,
  Timer,
  Sparkles,
  ArrowDown,
  Settings2,
  User,
  Monitor,
  Bell,
  Trash2,
  Upload,
  Search,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import DoseHistory from './components/DoseHistory';
import { 
  Substance, 
  Dose, 
  UserSettings, 
  CustomEffect, 
  SubstanceCategory,
  Shortcut
} from './types';
import { 
  DEFAULT_SUBSTANCES, 
  DEFAULT_SETTINGS, 
  DEFAULT_EFFECTS,
  ROUTE_MULTIPLIERS,
  STOMACH_MULTIPLIERS
} from './constants';
import { 
  calculateSubstanceLevelAtTime, 
  calculateCleanTime, 
  calculateTolerance,
  getMetabolismMultiplier
} from './services/pharmacology';

// Views
import Dashboard from './components/Dashboard';
import Logger from './components/Logger';
import Substances from './components/Substances';
import Analytics from './components/Analytics';
import SubstanceEditor from './components/SubstanceEditor';
import Settings from './components/Settings';
import ConfirmationModal from './components/ConfirmationModal';

export type ViewType = 'dashboard' | 'logger' | 'history' | 'analytics' | 'substances';

export default function App() {
  const [view, setView] = useState<ViewType>('dashboard');
  const [substances, setSubstances] = useState<Substance[]>([]);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [customEffects, setCustomEffects] = useState<CustomEffect[]>(DEFAULT_EFFECTS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingSubstanceId, setEditingSubstanceId] = useState<string | null | 'new'>(null);
  const [editingTemplate, setEditingTemplate] = useState<Substance | null>(null);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' | 'warning' }[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Load data
  useEffect(() => {
    const savedSubstances = localStorage.getItem('biotracker_pro_substances');
    if (savedSubstances) {
      setSubstances(JSON.parse(savedSubstances));
    } else {
      setSubstances(DEFAULT_SUBSTANCES);
      localStorage.setItem('biotracker_pro_substances', JSON.stringify(DEFAULT_SUBSTANCES));
    }

    const savedDoses = localStorage.getItem('biotracker_pro_doses');
    if (savedDoses) setDoses(JSON.parse(savedDoses));

    const savedSettings = localStorage.getItem('biotracker_pro_settings');
    if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });

    const savedEffects = localStorage.getItem('biotracker_pro_effects');
    if (savedEffects) setCustomEffects(JSON.parse(savedEffects));

    const savedShortcuts = localStorage.getItem('biotracker_pro_shortcuts');
    if (savedShortcuts) setShortcuts(JSON.parse(savedShortcuts));
  }, []);

  // Save data
  useEffect(() => {
    if (substances.length > 0) localStorage.setItem('biotracker_pro_substances', JSON.stringify(substances));
  }, [substances]);

  useEffect(() => {
    localStorage.setItem('biotracker_pro_doses', JSON.stringify(doses));
  }, [doses]);

  useEffect(() => {
    localStorage.setItem('biotracker_pro_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('biotracker_pro_effects', JSON.stringify(customEffects));
  }, [customEffects]);

  useEffect(() => {
    localStorage.setItem('biotracker_pro_shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleToggleFavorite = (id: string) => {
    setSubstances(prev => prev.map(s => 
      s.id === id ? { ...s, isFavorite: !s.isFavorite } : s
    ));
  };

  const handleAddDose = (dose: Dose) => {
    setDoses(prev => [...prev, dose]);
    showToast('Dávka zaznamenána', 'success');
  };

  const handleDeleteDose = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Smazat záznam?',
      message: 'Opravdu chcete smazat tento záznam? Tato akce je nevratná.',
      onConfirm: () => {
        setDoses(prev => prev.filter(d => d.id !== id));
        showToast('Záznam smazán', 'info');
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSaveSubstance = (substance: Substance) => {
    setSubstances(prev => {
      const index = prev.findIndex(s => s.id === substance.id);
      if (index !== -1) {
        const next = [...prev];
        next[index] = substance;
        return next;
      }
      return [...prev, substance];
    });
    setEditingSubstanceId(null);
    showToast('Látka uložena', 'success');
  };

  const handleDeleteSubstance = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Smazat látku?',
      message: 'Opravdu chcete smazat tuto látku? Všechny související záznamy zůstanou, ale nebudou mít správná data.',
      onConfirm: () => {
        setSubstances(prev => prev.filter(s => s.id !== id));
        showToast('Látka smazána', 'info');
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleExport = () => {
    const data = { substances, doses, settings, customEffects, exportDate: new Date().toISOString(), version: '2.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biotracker_pro_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exportována', 'success');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.substances) setSubstances(data.substances);
        if (data.doses) setDoses(data.doses);
        if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        if (data.customEffects) setCustomEffects(data.customEffects);
        showToast('Data importována', 'success');
      } catch (err) {
        showToast('Chyba při importu', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Smazat všechna data?',
      message: 'Tato akce vymaže veškerou historii, látky a nastavení. Chcete pokračovat?',
      onConfirm: () => {
        setDoses([]);
        setSubstances(DEFAULT_SUBSTANCES);
        setSettings(DEFAULT_SETTINGS);
        setCustomEffects(DEFAULT_EFFECTS);
        showToast('Všechna data smazána', 'info');
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleQuickDose = (substanceId: string) => {
    const substance = substances.find(s => s.id === substanceId);
    if (!substance) return;
    
    const dose: Dose = {
      id: Math.random().toString(36).substr(2, 9),
      substanceId,
      amount: substance.step || 1,
      timestamp: new Date().toISOString(),
      route: 'oral',
      note: 'Rychlá dávka',
      bioavailabilityMultiplier: 1,
      tmaxMultiplier: 1
    };
    
    handleAddDose(dose);
  };

  const handleUseShortcut = (shortcut: Shortcut) => {
    const substance = substances.find(s => s.id === shortcut.substanceId);
    if (!substance) return;
    
    // Use default oral/full stomach multipliers to match Logger default
    const routeMult = ROUTE_MULTIPLIERS.oral;
    const stomachMult = STOMACH_MULTIPLIERS.full;
    
    const dose: Dose = {
      id: Math.random().toString(36).substr(2, 9),
      substanceId: shortcut.substanceId,
      amount: shortcut.amount,
      timestamp: new Date().toISOString(),
      route: 'oral',
      stomach: 'full',
      note: `Zkratka: ${shortcut.name}`,
      bioavailabilityMultiplier: routeMult.bioavailability * stomachMult.bioavailability,
      tmaxMultiplier: routeMult.tmaxMultiplier / stomachMult.speed
    };
    
    handleAddDose(dose);
  };

  const handleAddShortcut = (shortcut: Shortcut) => {
    setShortcuts(prev => [...prev, shortcut]);
    showToast('Zkratka přidána', 'success');
  };

  const handleRemoveShortcut = (id: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== id));
    showToast('Zkratka smazána', 'info');
  };

  const activeDoses = useMemo(() => {
    const now = currentTime.getTime();
    const metabolismMult = getMetabolismMultiplier(settings);
    return doses.filter(dose => {
      const substance = substances.find(s => s.id === dose.substanceId);
      if (!substance) return false;
      const doseTime = new Date(dose.timestamp).getTime();
      const elapsed = (now - doseTime) / 3600000;
      
      let eliminationTime = substance.halfLife * 5 / metabolismMult;
      if (substance.metabolismCurve === 'custom' && substance.customCurve && substance.customCurve.length > 0) {
        const lastPoint = [...substance.customCurve].sort((a, b) => a.time - b.time).pop();
        if (lastPoint) {
          eliminationTime = lastPoint.time / metabolismMult;
        }
      }
      
      return elapsed < eliminationTime;
    });
  }, [doses, substances, currentTime, settings]);

  const systemLoad = useMemo(() => {
    const activeSubstanceIds = Array.from(new Set<string>(activeDoses.map(d => d.substanceId)));
    const activeSubstanceDetails = activeSubstanceIds.map(id => {
      const substance = substances.find(s => s.id === id);
      const level = calculateSubstanceLevelAtTime(id, currentTime.getTime(), substances, doses, settings);
      return { substance, level };
    }).filter(item => item.substance !== undefined);

    const totalLoad = activeSubstanceDetails.reduce((sum, item) => sum + item.level, 0);
    if (totalLoad === 0) return { label: 'CLEAN', color: 'bg-emerald-500' };
    if (totalLoad < 50) return { label: 'ACTIVE', color: 'bg-cyan-primary' };
    if (totalLoad < 100) return { label: 'HIGH', color: 'bg-amber-400' };
    return { label: 'CRITICAL', color: 'bg-red-500' };
  }, [activeDoses, substances, doses, settings, currentTime]);

  return (
    <div className={cn(
      "max-w-md mx-auto min-h-screen flex flex-col relative font-sans selection:bg-cyan-500/30 pb-24 transition-colors duration-300",
      settings.theme === 'dark' ? "bg-dark-bg text-slate-200" : "bg-slate-50 text-slate-900"
    )}>
      {/* Header */}
      <header className={cn(
        "p-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-2xl border-b border-white/10 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)]",
        settings.theme === 'dark' ? "bg-dark-bg/85" : "bg-white/85"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,209,255,0.4)] transition-transform hover:scale-105">
            <HeartPulse className="text-dark-bg" size={20} strokeWidth={3} />
          </div>
          <div>
            <h1 className={cn("text-xl font-black tracking-tighter leading-none transition-colors", settings.theme === 'dark' ? "text-white" : "text-slate-900")}>BioTracker</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]", systemLoad.color)} />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{systemLoad.label} MODE</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className={cn(
            "p-2.5 rounded-xl border transition-all active:scale-90 shadow-lg",
            settings.theme === 'dark' ? "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10" : "bg-slate-200 border-slate-300 text-slate-600 hover:text-slate-900"
          )}
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {view === 'dashboard' && (
              <Dashboard 
                substances={substances} 
                doses={doses} 
                settings={settings} 
                activeDoses={activeDoses}
                currentTime={currentTime}
                shortcuts={shortcuts}
                onUseShortcut={handleUseShortcut}
                onAddShortcut={handleAddShortcut}
                onRemoveShortcut={handleRemoveShortcut}
              />
            )}
            {view === 'logger' && (
              <Logger 
                substances={substances} 
                doses={doses} 
                settings={settings}
                onAddDose={handleAddDose} 
                onDeleteDose={handleDeleteDose}
                onClearAll={handleClearAll}
              />
            )}
            {view === 'history' && (
              <DoseHistory 
                doses={doses} 
                substances={substances} 
                onDeleteDose={handleDeleteDose}
                onClearAll={handleClearAll}
              />
            )}
            {view === 'analytics' && (
              <Analytics 
                substances={substances} 
                doses={doses} 
                settings={settings} 
                onToggleTheme={() => setSettings(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))}
              />
            )}
            {view === 'substances' && (
              <Substances 
                substances={substances} 
                onEditSubstance={(id, template) => {
                  setEditingSubstanceId(id);
                  if (template) setEditingTemplate(template);
                }}
                onDeleteSubstance={handleDeleteSubstance}
                onAddPreset={(preset) => setSubstances(prev => [...prev, preset])}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md backdrop-blur-2xl border border-white/10 rounded-[2.5rem] px-6 py-3 flex justify-between items-center z-50 transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.4)]",
        settings.theme === 'dark' ? "bg-dark-bg/85" : "bg-white/85"
      )}>
        {[
          { id: 'dashboard', icon: Activity, label: 'Status' },
          { id: 'logger', icon: Plus, label: 'Zápis' },
          { id: 'history', icon: History, label: 'Log' },
          { id: 'analytics', icon: BarChart3, label: 'Data' },
          { id: 'substances', icon: FlaskConical, label: 'Látky' },
        ].map((item) => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewType)}
              className={cn(
                "relative flex flex-col items-center gap-1 transition-all active:scale-90",
                isActive ? 'text-cyan-primary' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="navIndicator"
                  className="absolute -top-3 w-8 h-1 bg-cyan-primary rounded-full shadow-[0_0_10px_rgba(0,209,255,0.8)]"
                />
              )}
              <item.icon size={22} strokeWidth={isActive ? 3 : 2} className={cn("transition-transform", isActive && "scale-110")} />
              <span className="text-[8px] font-black uppercase tracking-[0.1em]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      <SubstanceEditor 
        isOpen={editingSubstanceId !== null}
        substanceId={editingSubstanceId === 'new' ? null : editingSubstanceId}
        template={editingTemplate}
        substances={substances}
        customEffects={customEffects}
        onClose={() => {
          setEditingSubstanceId(null);
          setEditingTemplate(null);
        }}
        onSave={handleSaveSubstance}
      />

      <Settings 
        isOpen={isSettingsOpen}
        settings={settings}
        customEffects={customEffects}
        onClose={() => setIsSettingsOpen(false)}
        onSave={setSettings}
        onSaveEffects={setCustomEffects}
        onClearData={handleClearAll}
        onImport={handleImport}
        onExport={handleExport}
      />

      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Toasts */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-xs">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "p-4 rounded-2xl shadow-lg border flex items-center justify-between pointer-events-auto",
                toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' :
                toast.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-200' :
                toast.type === 'warning' ? 'bg-amber-950/90 border-amber-500/50 text-amber-200' :
                'bg-cyan-950/90 border-cyan-500/50 text-cyan-200'
              )}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
                {toast.type === 'error' && <AlertTriangle className="w-4 h-4" />}
                {toast.type === 'info' && <Info className="w-4 h-4" />}
                {toast.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                <span className="text-sm font-medium">{toast.message}</span>
              </div>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
