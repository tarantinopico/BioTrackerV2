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
  ZoomOut,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
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
  DEFAULT_DOSES,
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
import Predictions from './components/Predictions';
import SubstanceEditor from './components/SubstanceEditor';
import Settings from './components/Settings';
import ConfirmationModal from './components/ConfirmationModal';
import PinLock from './components/PinLock';

export type ViewType = 'dashboard' | 'logger' | 'history' | 'analytics' | 'predictions' | 'substances' | 'settings';

export default function App() {
  const [view, setView] = useState<ViewType>('dashboard');
  const [substances, setSubstances] = useState<Substance[]>([]);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [customEffects, setCustomEffects] = useState<CustomEffect[]>(DEFAULT_EFFECTS);
  const [editingSubstanceId, setEditingSubstanceId] = useState<string | null | 'new'>(null);
  const [editingTemplate, setEditingTemplate] = useState<Substance | null>(null);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' | 'warning' }[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isUnlocked, setIsUnlocked] = useState(false);
  
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
    const migrateDoses = (dosesData: any[]): Dose[] => {
      return dosesData.map(d => {
        let ts = d.timestamp;
        if (typeof ts === 'string') {
          // Check if it's a string representation of a number
          if (/^\d+$/.test(ts)) {
            ts = parseInt(ts, 10);
          } else {
            ts = new Date(ts).getTime();
          }
        } else if (ts instanceof Date) {
          ts = ts.getTime();
        }
        
        // Fallback if parsing failed
        if (typeof ts !== 'number' || isNaN(ts)) {
          ts = Date.now();
        }

        // Migrate old substance IDs
        let subId = d.substanceId;
        if (subId === 'kratom') subId = 'substance_1774623139275';
        if (subId === 'nikotin' || subId === 'nicotine') subId = 'substance_1774626436230';

        return {
          ...d,
          substanceId: subId,
          timestamp: ts,
          amount: typeof d.amount === 'string' ? parseFloat(d.amount) : (d.amount || 0)
        };
      });
    };

    const existingDoses = localStorage.getItem('biotracker_pro_doses');
    const existingSubstances = localStorage.getItem('biotracker_pro_substances');
    const migrationVersion = localStorage.getItem('biotracker_pro_migration_v3');

    if (!existingDoses && !existingSubstances && !migrationVersion) {
      // Only load defaults if there is NO existing data at all
      setSubstances(DEFAULT_SUBSTANCES);
      localStorage.setItem('biotracker_pro_substances', JSON.stringify(DEFAULT_SUBSTANCES));
      
      setDoses(DEFAULT_DOSES as any);
      localStorage.setItem('biotracker_pro_doses', JSON.stringify(DEFAULT_DOSES));
      
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem('biotracker_pro_settings', JSON.stringify(DEFAULT_SETTINGS));
      
      setCustomEffects(DEFAULT_EFFECTS);
      localStorage.setItem('biotracker_pro_effects', JSON.stringify(DEFAULT_EFFECTS));
      
      localStorage.setItem('biotracker_pro_migration_v3', 'true');
      setIsUnlocked(true);
    } else {
      // Load existing data
      if (existingSubstances) {
        setSubstances(JSON.parse(existingSubstances));
      } else {
        setSubstances(DEFAULT_SUBSTANCES);
        localStorage.setItem('biotracker_pro_substances', JSON.stringify(DEFAULT_SUBSTANCES));
      }

      if (existingDoses) {
        try {
          setDoses(migrateDoses(JSON.parse(existingDoses)));
        } catch (e) {
          console.error("Failed to parse doses", e);
        }
      }

      const savedSettings = localStorage.getItem('biotracker_pro_settings');
      if (savedSettings) {
        const parsedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
        setSettings(parsedSettings);
        if (!parsedSettings.requirePin) {
          setIsUnlocked(true);
        }
      } else {
        setIsUnlocked(true);
      }

      const savedEffects = localStorage.getItem('biotracker_pro_effects');
      if (savedEffects) setCustomEffects(JSON.parse(savedEffects));
      
      if (!migrationVersion) {
        localStorage.setItem('biotracker_pro_migration_v3', 'true');
      }
    }

    const savedShortcuts = localStorage.getItem('biotracker_pro_shortcuts');
    if (savedShortcuts) {
      setShortcuts(JSON.parse(savedShortcuts));
    } else {
      const defaultShortcuts: Shortcut[] = [];
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
    
    // Apply theme
    const root = document.documentElement;
    root.classList.remove('dark', 'midnight', 'bento-mode', 'glass-mode', 'text-sm', 'text-base', 'text-lg', 'reduced-motion', 'accent-blue', 'accent-purple', 'accent-orange', 'accent-pink', 'accent-cyan', 'accent-emerald');
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'midnight') {
      root.classList.add('midnight');
    }
    
    if (settings.bentoMode) root.classList.add('bento-mode');
    if (settings.glassEffects !== false) root.classList.add('glass-mode');
    if (settings.animations === false || settings.reducedMotion) root.classList.add('reduced-motion');
    
    if (settings.fontSize === 'small') root.classList.add('text-sm');
    else if (settings.fontSize === 'large') root.classList.add('text-lg');
    else root.classList.add('text-base');

    if (settings.colorAccent) {
      root.classList.add(`accent-${settings.colorAccent}`);
    }
    
    if (settings.theme === 'light') {
      // Light theme is default, no class needed
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches && settings.theme !== 'midnight') {
        root.classList.add('dark');
      }
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('biotracker_pro_effects', JSON.stringify(customEffects));
  }, [customEffects]);

  useEffect(() => {
    localStorage.setItem('biotracker_pro_shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  // Clock - update every 60 seconds to prevent excessive re-renders and lag
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    if (settings.hapticFeedback && navigator.vibrate) {
      if (type === 'success') navigator.vibrate(50);
      else if (type === 'error') navigator.vibrate([50, 50, 50]);
      else navigator.vibrate(20);
    }
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

  const handleRestockSubstance = (id: string) => {
    setSubstances(prev => prev.map(s => {
      if (s.id === id && s.packageSize !== undefined) {
        const currentStash = s.stash || 0;
        return { ...s, stash: currentStash + s.packageSize };
      }
      return s;
    }));
    showToast('Zásoba doplněna', 'success');
  };

  const handleAddDose = (dose: Dose) => {
    setDoses(prev => [...prev, dose]);
    
    setSubstances(prev => prev.map(s => {
      if (s.id === dose.substanceId && s.stash !== undefined) {
        return { ...s, stash: Math.max(0, s.stash - dose.amount) };
      }
      return s;
    }));

    showToast('Dávka zaznamenána', 'success');
  };

  const handleDeleteDose = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Smazat záznam?',
      message: 'Opravdu chcete smazat tento záznam? Tato akce je nevratná.',
      onConfirm: () => {
        const doseToDelete = doses.find(d => d.id === id);
        if (doseToDelete) {
          setSubstances(prev => prev.map(s => {
            if (s.id === doseToDelete.substanceId && s.stash !== undefined) {
              return { ...s, stash: s.stash + doseToDelete.amount };
            }
            return s;
          }));
        }
        setDoses(prev => prev.filter(d => d.id !== id));
        showToast('Záznam smazán', 'info');
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleEditDose = (updatedDose: Dose) => {
    const oldDose = doses.find(d => d.id === updatedDose.id);
    if (oldDose && oldDose.amount !== updatedDose.amount) {
      const diff = updatedDose.amount - oldDose.amount;
      setSubstances(prev => prev.map(s => {
        if (s.id === updatedDose.substanceId && s.stash !== undefined) {
          return { ...s, stash: Math.max(0, s.stash - diff) };
        }
        return s;
      }));
    }
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

  const handleExportCSV = () => {
    if (doses.length === 0) {
      showToast('Žádná data k exportu', 'error');
      return;
    }
    
    const headers = ['Datum', 'Čas', 'Látka', 'Množství', 'Jednotka', 'Způsob', 'Druh', 'Poznámka'];
    const rows = doses.map(dose => {
      const substance = substances.find(s => s.id === dose.substanceId);
      const date = new Date(dose.timestamp);
      return [
        date.toLocaleDateString('cs-CZ'),
        date.toLocaleTimeString('cs-CZ'),
        substance?.name || dose.substanceId,
        dose.amount,
        substance?.unit || 'mg',
        dose.route,
        dose.strainId || '',
        `"${(dose.note || '').replace(/"/g, '""')}"`
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biotracker_historie_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportováno', 'success');
  };

  const handleExportText = () => {
    const data = { substances, doses, settings, customEffects, exportDate: new Date().toISOString(), version: '2.0' };
    return JSON.stringify(data);
  };

  const processImportData = (rawText: string) => {
    try {
      const data = JSON.parse(rawText);
      if (data.substances) setSubstances(data.substances);
      if (data.doses) {
        const migratedDoses = data.doses.map((d: any) => {
          let ts = d.timestamp;
          if (typeof ts === 'string') {
            if (/^\d+$/.test(ts)) {
              ts = parseInt(ts, 10);
            } else {
              ts = new Date(ts).getTime();
            }
          } else if (ts instanceof Date) {
            ts = ts.getTime();
          }
          if (typeof ts !== 'number' || isNaN(ts)) {
            ts = Date.now();
          }
          
          let subId = d.substanceId;
          if (subId === 'kratom') subId = 'substance_1774623139275';
          if (subId === 'nikotin' || subId === 'nicotine') subId = 'substance_1774626436230';

          return { 
            ...d, 
            substanceId: subId,
            timestamp: ts,
            amount: typeof d.amount === 'string' ? parseFloat(d.amount) : (d.amount || 0)
          };
        });
        setDoses(migratedDoses);
      }
      if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      if (data.customEffects) setCustomEffects(data.customEffects);
      showToast('Data byla úspěšně obnovena', 'success');
    } catch (err) {
      console.error('Import error:', err);
      showToast('Chyba při čtení dat', 'error');
    }
  };

  const handleImportText = (text: string) => {
    processImportData(text);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      processImportData(event.target?.result as string);
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

  const handleQuickDose = (substanceId: string) => {
    const substance = substances.find(s => s.id === substanceId);
    if (!substance) return;
    
    const dose: Dose = {
      id: Math.random().toString(36).substr(2, 9),
      substanceId,
      amount: substance.step || 1,
      timestamp: Date.now(),
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
    
    const routeMult = ROUTE_MULTIPLIERS[shortcut.route] || ROUTE_MULTIPLIERS.oral;
    const stomachMult = STOMACH_MULTIPLIERS.full;
    
    const dose: Dose = {
      id: Math.random().toString(36).substr(2, 9),
      substanceId: shortcut.substanceId,
      strainId: shortcut.strainId,
      amount: shortcut.amount,
      timestamp: Date.now(),
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
      const doseTime = dose.timestamp;
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

  if (settings.requirePin && !isUnlocked) {
    return (
      <PinLock 
        correctPin={settings.pinCode || ''} 
        onUnlock={() => setIsUnlocked(true)} 
      />
    );
  }

  return (
    <MotionConfig transition={{ duration: settings.animations === false ? 0 : undefined }}>
      <div className={cn(
        "max-w-md mx-auto min-h-[100dvh] h-[100dvh] flex flex-col relative font-sans selection:bg-md3-primary/30 overflow-hidden transition-colors duration-300",
        settings.uiDebugBorders && "[&_*]:outline [&_*]:outline-1 [&_*]:outline-blue-500/30",
        settings.glassEffects !== false ? "glass-effects-enabled" : "",
        settings.glowEffects !== false ? "glow-effects-enabled" : ""
      )}>
        {/* Ambient Background */}
        {settings.ambientBackground !== false && (
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] will-change-transform transform-gpu">
            <div className="absolute inset-0 bg-theme-bg" />
            <div className="absolute inset-0 blur-[130px] opacity-[0.4] mix-blend-screen dark:mix-blend-color-dodge">
              <div className={cn(
                "absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-[100%] scale-y-[1.5] rotate-[-15deg]",
                "bg-md3-primary/80",
                settings.animations !== false && "animate-blob"
              )} />
              <div className={cn(
                "absolute top-[10%] right-[-30%] w-[80%] h-[100%] rounded-[100%] scale-x-[1.2] rotate-[20deg] opacity-70",
                "bg-cyan-primary/70",
                settings.animations !== false && "animate-blob animation-delay-2000"
              )} />
              <div className={cn(
                "absolute bottom-[-30%] left-[10%] w-[90%] h-[80%] rounded-[100%] scale-y-[0.8] rotate-[-5deg] opacity-60",
                "bg-purple-600/70",
                settings.animations !== false && "animate-blob animation-delay-4000"
              )} />
              {/* Additional artistic high-frequency light streak */}
              <div className={cn(
                "absolute inset-x-0 top-1/3 h-[20%] bg-white/20 rounded-full blur-[80px] rotate-[-30deg]",
              )} />
            </div>
            {/* Soft artistic grain overlay (CSS representation of abstract noise) */}
            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }} />
          </div>
        )}

        {/* Removed Header - Directly jumping to Main Content for a clean layout */}
        <main className={cn("flex-1 overflow-y-auto no-scrollbar pb-[90px] px-2", view === 'dashboard' ? 'pt-2' : 'pt-4')}>
          <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn("h-full", view !== 'dashboard' && "space-y-4")}
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
                settings={settings}
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
                onToggleTheme={() => {}} // Theme is locked to dark for iOS overhaul
                onUpdateSettings={setSettings}
              />
            )}
            {view === 'predictions' && (
              <Predictions 
                substances={substances} 
                doses={doses} 
                settings={settings}
              />
            )}
            {view === 'substances' && (
              <Substances 
                substances={substances} 
                doses={doses}
                settings={settings}
                onEditSubstance={(id, template) => {
                  setEditingSubstanceId(id);
                  if (template) setEditingTemplate(template);
                }}
                onDeleteSubstance={handleDeleteSubstance}
                onAddPreset={(preset) => setSubstances(prev => [...prev, preset])}
                onToggleFavorite={handleToggleFavorite}
                onRestockSubstance={handleRestockSubstance}
              />
            )}
            {view === 'settings' && (
              <Settings 
                settings={settings}
                customEffects={customEffects}
                onSave={setSettings}
                onSaveEffects={setCustomEffects}
                onClearData={handleClearAll}
                onImport={handleImport}
                onExport={handleExport}
                onExportCSV={handleExportCSV}
                onExportText={handleExportText}
                onImportText={handleImportText}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation - Premium Abstract Floating Dock */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none pb-safe">
        <nav className="mx-auto max-w-[380px] bg-white/5 dark:bg-black/20 backdrop-blur-[40px] border border-white/10 rounded-[2.5rem] flex justify-between items-center px-3 py-3 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] pointer-events-auto overflow-x-auto custom-scrollbar hide-scroll-indicator">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Přehled' },
            { id: 'logger', icon: PlusCircle, label: 'Zapsat' },
            { id: 'substances', icon: Database, label: 'Látky' },
            { id: 'history', icon: History, label: 'Historie' },
            { id: 'analytics', icon: BarChart2, label: 'Analýza' },
            { id: 'predictions', icon: Lightbulb, label: 'Predikce' },
            { id: 'settings', icon: SettingsIcon, label: 'Nastavení' },
          ].map((item) => {
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10); // Subtle haptic feedback
                  setView(item.id as ViewType);
                }}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[50px] h-12 active:scale-95 transition-all duration-300 relative group rounded-full",
                  isActive ? 'text-theme-text' : 'text-md3-gray/70 hover:text-theme-text/90'
                )}
              >
                <div className={cn(
                  "w-11 h-11 rounded-[1.2rem] transition-all duration-500 relative flex items-center justify-center",
                  isActive ? "bg-white/10 text-white shadow-[0_4px_25px_rgba(255,255,255,0.1)] border border-white/20" : "bg-transparent text-md3-gray/80 group-hover:bg-white/5",
                )}>
                  {isActive && (
                    <motion.div 
                      layoutId="activeTabBadge" 
                      className="absolute inset-0 bg-md3-primary/30 rounded-[1.2rem] blur-[8px]" 
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {item.id === 'settings' && settings.privacyMode && !isActive && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.6)]" />
                  )}
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="relative z-10 drop-shadow-sm" />
                </div>
              </button>
            );
          })}
        </nav>
      </div>

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
    </MotionConfig>
  );
}
