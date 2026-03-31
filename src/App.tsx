import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings as SettingsIcon, 
  LayoutDashboard, 
  PlusCircle, 
  FlaskConical, 
  History,
  BarChart2,
  CheckCircle,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import DoseHistory from './components/DoseHistory';
import { 
  Substance, 
  Dose, 
  UserSettings, 
  CustomEffect, 
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
    if (savedShortcuts) {
      setShortcuts(JSON.parse(savedShortcuts));
    } else {
      const defaultShortcuts: Shortcut[] = [
        { id: 'sc_coffee', name: 'Káva 100mg', substanceId: 'caffeine', amount: 100, route: 'oral', icon: 'zap', color: '#8b5cf6' }
      ];
      setShortcuts(defaultShortcuts);
      localStorage.setItem('biotracker_pro_shortcuts', JSON.stringify(defaultShortcuts));
    }
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
    document.documentElement.classList.add('dark');
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

  const handleEditDose = (updatedDose: Dose) => {
    setDoses(prev => prev.map(d => d.id === updatedDose.id ? updatedDose : d));
    showToast('Záznam upraven', 'success');
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
        setShortcuts([]);
        setSubstances(DEFAULT_SUBSTANCES);
        setSettings(DEFAULT_SETTINGS);
        setCustomEffects(DEFAULT_EFFECTS);
        showToast('Všechna data smazána', 'info');
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleUseShortcut = (shortcut: Shortcut) => {
    const substance = substances.find(s => s.id === shortcut.substanceId);
    if (!substance) return;
    
    const routeMult = ROUTE_MULTIPLIERS[shortcut.route] || ROUTE_MULTIPLIERS.oral;
    const stomachMult = STOMACH_MULTIPLIERS.full;
    
    const dose: Dose = {
      id: Math.random().toString(36).substr(2, 9),
      substanceId: shortcut.substanceId,
      strainId: shortcut.strainId,
      amount: shortcut.amount,
      timestamp: new Date().toISOString(),
      route: shortcut.route,
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

  const handleUpdateShortcut = (updatedShortcut: Shortcut) => {
    setShortcuts(prev => prev.map(s => s.id === updatedShortcut.id ? updatedShortcut : s));
    showToast('Zkratka upravena', 'success');
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
      "max-w-md mx-auto min-h-screen flex flex-col relative font-sans selection:bg-android-accent/30 transition-colors duration-500 bg-android-bg pb-32"
    )}>
      {/* Header */}
      <header className="px-5 pt-8 pb-4 flex justify-between items-center sticky top-0 z-50 bg-android-bg/60 backdrop-blur-2xl border-b border-android-border">
        <div className="flex items-center gap-3">
          <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,242,255,0.4)]", 
            systemLoad.label === 'CLEAN' ? 'bg-emerald-400 shadow-emerald-400/40' : 
            systemLoad.label === 'ACTIVE' ? 'bg-android-accent shadow-android-accent/40' : 
            systemLoad.label === 'HIGH' ? 'bg-amber-400 shadow-amber-400/40' : 'bg-red-500 shadow-red-500/40')} />
          <div>
            <span className="text-[10px] font-bold text-android-text-muted uppercase tracking-[0.2em] leading-none block mb-0.5">{systemLoad.label}</span>
            <h1 className="text-xl font-bold tracking-tight text-android-text leading-none">BioTracker</h1>
          </div>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2.5 rounded-2xl bg-android-surface border border-android-border android-button text-android-text-muted hover:text-android-text hover:bg-android-card transition-colors"
        >
          <SettingsIcon size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="space-y-8"
          >
            {view === 'dashboard' && (
              <Dashboard 
                substances={substances} 
                doses={doses} 
                settings={settings} 
                activeDoses={activeDoses}
                currentTime={currentTime}
                shortcuts={shortcuts}
                onAddDose={handleAddDose}
                onUseShortcut={handleUseShortcut}
                onAddShortcut={handleAddShortcut}
                onRemoveShortcut={handleRemoveShortcut}
                onUpdateShortcut={handleUpdateShortcut}
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
                onEditDose={handleEditDose}
                onClearAll={handleClearAll}
              />
            )}
            {view === 'analytics' && (
              <Analytics 
                substances={substances} 
                doses={doses} 
                settings={settings} 
                onToggleTheme={() => {}} 
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

      {/* Bottom Navigation - Modern Android Floating Style */}
      <div className="fixed bottom-6 left-4 right-4 z-50">
        <nav className="android-glass rounded-[2rem] px-2 py-2 flex justify-around items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/5">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
            { id: 'logger', icon: PlusCircle, label: 'Log' },
            { id: 'history', icon: History, label: 'History' },
            { id: 'analytics', icon: BarChart2, label: 'Stats' },
            { id: 'substances', icon: FlaskConical, label: 'Meds' },
          ].map((item) => {
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id as ViewType)}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-2 px-1 min-w-[64px] android-button rounded-2xl relative transition-all duration-300",
                  isActive ? 'text-android-accent' : 'text-android-text-muted hover:text-android-text'
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="nav-active"
                    className="absolute inset-0 bg-android-accent/10 rounded-2xl border border-android-accent/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
                <span className="text-[10px] font-bold uppercase tracking-wider relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {isSettingsOpen && (
          <Settings 
            isOpen={isSettingsOpen} 
            settings={settings}
            onClose={() => setIsSettingsOpen(false)} 
            onSave={setSettings}
            onExport={handleExport}
            onImport={handleImport}
            onClearAll={handleClearAll}
          />
        )}
        
        {editingSubstanceId && (
          <SubstanceEditor
            substanceId={editingSubstanceId === 'new' ? null : editingSubstanceId}
            template={editingTemplate}
            substances={substances}
            onClose={() => {
              setEditingSubstanceId(null);
              setEditingTemplate(null);
            }}
            onSave={handleSaveSubstance}
          />
        )}

        {confirmConfig.isOpen && (
          <ConfirmationModal
            isOpen={confirmConfig.isOpen}
            title={confirmConfig.title}
            message={confirmConfig.message}
            onConfirm={confirmConfig.onConfirm}
            onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            variant={confirmConfig.variant}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-[280px]">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "android-glass px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border-android-accent/20",
                toast.type === 'success' && "border-emerald-500/30",
                toast.type === 'error' && "border-red-500/30",
                toast.type === 'warning' && "border-amber-500/30"
              )}
            >
              {toast.type === 'success' && <CheckCircle className="text-emerald-400" size={18} />}
              {toast.type === 'error' && <AlertTriangle className="text-red-400" size={18} />}
              {toast.type === 'warning' && <Info className="text-amber-400" size={18} />}
              {toast.type === 'info' && <Info className="text-android-accent" size={18} />}
              <span className="text-xs font-bold text-android-text">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
