import { useMemo, useState } from 'react';
import { 
  HeartPulse, 
  Activity, 
  TrendingUp, 
  Clock, 
  ArrowDownCircle,
  Zap,
  ShieldCheck,
  AlertCircle,
  X,
  Plus,
  Info,
  Sparkles,
  Brain,
  Moon,
  Eye,
  Target,
  Users,
  Utensils,
  Move,
  Droplet,
  Smile,
  Bed,
  Bookmark,
  Palette,
  Crosshair,
  BatteryCharging,
  Frown,
  ShieldAlert,
  Wallet,
  Coffee,
  Leaf,
  Wine,
  Pill,
  Syringe,
  Cigarette,
  TestTube,
  FlaskConical,
  Beaker,
  Heart,
  Sun,
  Sunrise,
  Sunset,
  MoonStar
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Substance, Dose, UserSettings, Shortcut, Effect } from '../types';
import { 
  calculateSubstanceLevelAtTime, 
  calculateCleanTime, 
  calculateTolerance,
  calculateEffectIntensityAtTime 
} from '../services/pharmacology';
import { cn, formatTime } from '../lib/utils';
import QuickActions from './QuickActions';

interface DashboardProps {
  substances: Substance[];
  doses: Dose[];
  settings: UserSettings;
  activeDoses: Dose[];
  currentTime: Date;
  shortcuts: Shortcut[];
  onUseShortcut: (shortcut: Shortcut) => void;
  onAddShortcut: (shortcut: Shortcut) => void;
  onRemoveShortcut: (id: string) => void;
  onUpdateShortcut: (shortcut: Shortcut) => void;
  onAddDose: (dose: Dose) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'stimulant': '#f59e0b', // Amber
  'depressant': '#3b82f6', // Blue
  'psychedelic': '#d946ef', // Fuchsia
  'dissociative': '#8b5cf6', // Violet
  'empathogen': '#ec4899', // Pink
  'opioid': '#10b981', // Emerald
  'cannabinoid': '#22c55e', // Green
  'nootropic': '#06b6d4', // Cyan
  'supplement': '#64748b', // Slate
  'vitamin': '#eab308', // Yellow
  'steroid': '#ef4444', // Red
  'peptide': '#8b5cf6', // Violet
  'herb': '#84cc16', // Lime
  'deliriant': '#57534e', // Stone
  'medication': '#ef4444', // Red
  'other': '#9ca3af' // Gray
};

const SUBSTANCE_ICONS: Record<string, any> = {
  'coffee': Coffee,
  'leaf': Leaf,
  'wine': Wine,
  'moon': Moon,
  'zap': Zap,
  'cannabis': Leaf,
  'pill': Pill,
  'syringe': Syringe,
  'cigarette': Cigarette,
  'test-tube': TestTube,
  'flask': FlaskConical,
  'beaker': Beaker
};

const EFFECT_ICONS: Record<string, any> = {
  'Stimulace': Zap,
  'Relaxace': Sparkles,
  'Kognice': Brain,
  'Spánek': Moon,
  'BDĚLOST': Eye,
  'Motivace': Target,
  'Sociabilita': Users,
  'Bolest': Activity,
  'Úzkost': ShieldAlert,
  'Chuť k jídlu': Utensils,
  'Koordinace': Move,
  'Diuréza': Droplet,
  'Euphorie': Smile,
  'Sedace': Bed,
  'Paměť': Bookmark,
  'Kreativita': Palette,
  'Fokus': Crosshair,
  'Energie': BatteryCharging,
  'Nausea': Frown,
  'Paranoia': ShieldAlert
};

const EFFECT_COLORS: Record<string, string> = {
  'Stimulace': '#fbbf24', // Amber
  'Relaxace': '#10b981', // Emerald
  'Kognice': '#8b5cf6', // Violet
  'Spánek': '#3b82f6', // Blue
  'BDĚLOST': '#06b6d4', // Cyan
  'Motivace': '#f59e0b', // Amber
  'Sociabilita': '#ec4899', // Pink
  'Bolest': '#ef4444', // Red
  'Úzkost': '#f97316', // Orange
  'Chuť k jídlu': '#84cc16', // Lime
  'Koordinace': '#6366f1', // Indigo
  'Diuréza': '#0ea5e9', // Sky
  'Euphorie': '#f43f5e', // Rose
  'Sedace': '#64748b', // Slate
  'Paměť': '#a855f7', // Purple
  'Kreativita': '#d946ef', // Fuchsia
  'Fokus': '#14b8a6', // Teal
  'Energie': '#fbbf24', // Amber
  'Nausea': '#ef4444', // Red
  'Paranoia': '#7f1d1d'  // Dark Red
};

export default function Dashboard({ 
  substances, 
  doses, 
  settings, 
  activeDoses, 
  currentTime,
  shortcuts,
  onUseShortcut,
  onAddShortcut,
  onRemoveShortcut,
  onUpdateShortcut,
  onAddDose
}: DashboardProps) {
  const now = currentTime.getTime();
  const [selectedDetailsId, setSelectedDetailsId] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'kinetic' | 'effects'>('kinetic');
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  
  const activeSubstanceDetails = useMemo(() => {
    const activeIds = Array.from(new Set(activeDoses.map(d => d.substanceId)));
    return activeIds.map(id => {
      const substance = substances.find(s => s.id === id);
      const level = calculateSubstanceLevelAtTime(id, now, substances, doses, settings);
      const tolerance = calculateTolerance(id, substances, doses);
      
      const substanceDoses = doses.filter(d => d.substanceId === id).sort((a, b) => b.timestamp - a.timestamp);
      const lastDose = substanceDoses[0];
      const lastUsedHours = lastDose ? (now - lastDose.timestamp) / 3600000 : null;

      return { substance, level, tolerance, lastUsedHours };
    }).filter(item => item.substance !== undefined && item.level > 0.1);
  }, [activeDoses, substances, doses, settings, now]);

  const allSubstancesLastUsed = useMemo(() => {
    return substances.map(s => {
      const substanceDoses = doses.filter(d => d.substanceId === s.id).sort((a, b) => b.timestamp - a.timestamp);
      const lastDose = substanceDoses[0];
      const lastUsedHours = lastDose ? (now - lastDose.timestamp) / 3600000 : null;
      return { id: s.id, name: s.name, lastUsedHours, color: s.color || CATEGORY_COLORS[s.category] || '#0a84ff', icon: s.icon };
    }).filter(s => s.lastUsedHours !== null);
  }, [substances, doses, now]);

  const activeEffects = useMemo(() => {
    const effectTypes = Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || [])));
    
    return effectTypes
      .map(type => {
        const intensity = calculateEffectIntensityAtTime(type, now, substances, doses, settings);
        // Find valence from the first substance that has this effect
        const substanceWithEffect = substances.find(s => s.effects?.some(e => e.type === type));
        const effect = substanceWithEffect?.effects?.find(e => e.type === type);
        return { 
          type, 
          intensity,
          valence: effect?.valence || 'neutral'
        };
      })
      .filter(e => e.intensity > 1)
      .sort((a, b) => b.intensity - a.intensity);
  }, [substances, doses, settings, now]);

  const chartData = useMemo(() => {
    const windowHours = settings.chartWindow;
    const roundedNow = Math.floor(now / 60000) * 60000;
    const startTime = roundedNow - (windowHours * 3600000) / 2;
    const endTime = roundedNow + (windowHours * 3600000) / 2;
    const points = 120;
    const step = (endTime - startTime) / points;
    
    const data = [];
    const activeSubstanceIds = Array.from(new Set(doses.map(d => d.substanceId)));
    const effectTypes = Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || [])));
    
    const tolerances: Record<string, number> = {};
    activeSubstanceIds.forEach(id => {
      tolerances[id] = calculateTolerance(id, substances, doses, roundedNow);
    });

    for (let i = 0; i <= points; i++) {
      const time = startTime + (i * step);
      const point: any = { 
        time, 
        timeStr: formatTime(time, settings) 
      };
      
      if (chartType === 'kinetic') {
        activeSubstanceIds.forEach(id => {
          const level = calculateSubstanceLevelAtTime(id, time, substances, doses, settings, tolerances[id]);
          point[id] = level;
        });
      } else {
        effectTypes.forEach(type => {
          const intensity = calculateEffectIntensityAtTime(type, time, substances, doses, settings, tolerances);
          if (intensity > 0.1) point[type] = intensity;
        });
      }
      
      data.push(point);
    }
    return data;
  }, [substances, doses, settings, Math.floor(now / 60000), chartType]);

  const maxChartValue = useMemo(() => {
    let max = 0;
    chartData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'time' && key !== 'timeStr' && typeof point[key] === 'number') {
          if (point[key] > max) max = point[key];
        }
      });
    });
    return max > 0 ? max * 1.1 : 100;
  }, [chartData]);

  const warnings = useMemo(() => {
    const alerts: { type: string; message: string; severity: 'low' | 'medium' | 'high' }[] = [];
    
    // 1. Interactions
    const activeIds = activeSubstanceDetails.map(d => d.substance!.id);
    if (activeIds.length >= 2) {
      activeSubstanceDetails.forEach((item, i) => {
        const s = item.substance!;
        if (!s.interactions) return;
        
        activeSubstanceDetails.slice(i + 1).forEach(other => {
          const o = other.substance!;
          if (s.interactions.includes(o.id) || o.interactions?.includes(s.id)) {
            alerts.push({
              type: `${s.name} + ${o.name}`,
              message: s.interactionMessage || o.interactionMessage || 'Potenciálně nebezpečná kombinace.',
              severity: s.isSevere || o.isSevere ? 'high' : 'medium'
            });
          }
        });
      });
    }

    // 2. Daily Limits
    if (settings.doseWarnings) {
      const today = new Date().toDateString();
      const todayDoses = doses.filter(d => new Date(d.timestamp).toDateString() === today);
      
      substances.forEach(s => {
        if (s.dailyLimit) {
          const totalToday = todayDoses.filter(d => d.substanceId === s.id).reduce((sum, d) => sum + d.amount, 0);
          if (totalToday > s.dailyLimit) {
            alerts.push({
              type: `Překročen limit: ${s.name}`,
              message: `Dnes jste užili ${totalToday}${s.unit}, což překračuje váš denní limit ${s.dailyLimit}${s.unit}.`,
              severity: 'high'
            });
          } else if (totalToday > s.dailyLimit * 0.8) {
            alerts.push({
              type: `Blížíte se limitu: ${s.name}`,
              message: `Dnes jste užili ${totalToday}${s.unit} (limit je ${s.dailyLimit}${s.unit}).`,
              severity: 'medium'
            });
          }
        }
      });
    }
    
    return alerts;
  }, [activeSubstanceDetails, doses, substances, settings.doseWarnings]);

  const cleanTime = calculateCleanTime(substances, doses, settings);
  const cleanHours = Math.floor(cleanTime / 3600000);
  const cleanMinutes = Math.floor((cleanTime % 3600000) / 60000);

  const dailyCost = useMemo(() => {
    const today = new Date().toDateString();
    return doses
      .filter(d => new Date(d.timestamp).toDateString() === today)
      .reduce((sum, d) => {
        const substance = substances.find(s => s.id === d.substanceId);
        const strainPrice = substance && d.strainId ? substance.strains?.find(s => s.name === d.strainId)?.price : null;
        const price = strainPrice || (substance ? substance.price : 0) || 0;
        return sum + (d.amount * price);
      }, 0);
  }, [doses, substances]);

  const dailyStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayDoses = doses.filter(d => new Date(d.timestamp).toDateString() === today);
    
    const stats: Record<string, { amount: number; unit: string; color: string; name: string; icon: string }> = {};
    
    todayDoses.forEach(d => {
      const substance = substances.find(s => s.id === d.substanceId) || {
        id: d.substanceId,
        name: d.substanceId,
        unit: '?',
        color: '#8e8e93',
        icon: 'pill',
        category: 'other'
      } as unknown as Substance;
      
      if (!stats[d.substanceId]) {
        stats[d.substanceId] = { 
          amount: 0, 
          unit: substance.unit || '', 
          color: substance.color || CATEGORY_COLORS[substance.category] || '#fff',
          name: substance.name,
          icon: substance.icon
        };
      }
      stats[d.substanceId].amount += d.amount;
    });
    
    return Object.values(stats);
  }, [doses, substances]);

  const systemLoad = useMemo(() => {
    const totalLoad = activeSubstanceDetails.reduce((sum, item) => sum + item.level, 0);
    if (totalLoad === 0) return { label: 'SYSTÉM ČISTÝ', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: ShieldCheck };
    if (totalLoad < 50) return { label: 'LEHKÁ ZÁTĚŽ', color: 'text-cyan-primary', bg: 'bg-cyan-500/10', icon: Activity };
    if (totalLoad < 100) return { label: 'STŘEDNÍ ZÁTĚŽ', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Zap };
    return { label: 'VYSOKÁ ZÁTĚŽ!', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle, pulse: true };
  }, [activeSubstanceDetails]);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 5 || hour >= 22) return { text: 'Dobrou noc', Icon: MoonStar, color: 'text-indigo-400' };
    if (hour < 11) return { text: 'Dobré ráno', Icon: Sunrise, color: 'text-amber-400' };
    if (hour < 18) return { text: 'Dobré odpoledne', Icon: Coffee, color: 'text-amber-600' };
    return { text: 'Dobrý večer', Icon: Sunset, color: 'text-orange-500' };
  }, [currentTime]);

  const dailyMessage = useMemo(() => {
    if (activeSubstanceDetails.length === 0) return 'Váš systém je krásně čistý. Jen tak dál!';
    if (systemLoad.label === 'LEHKÁ ZÁTĚŽ' || systemLoad.label === 'STŘEDNÍ ZÁTĚŽ') return `Látky pracují ve vašem těle. Nezapomínejte pít vodu.`;
    return 'Dávejte na sebe pozor, systém hlásí vyšší zátěž!';
  }, [activeSubstanceDetails.length, systemLoad.label]);

  return (
    <div className="flex flex-col gap-2 relative h-full pb-2">
      <div className="px-1 flex items-center justify-between mb-0.5">
        <div>
          <h2 className="text-[14px] font-black text-md3-text flex items-center gap-1.5 leading-none tracking-tight">
            {greeting.text} <greeting.Icon className={cn("ml-0.5", greeting.color)} size={14} strokeWidth={2.5} />
          </h2>
          <p className="text-[9px] text-md3-gray mt-0.5 font-black uppercase tracking-widest leading-none">
            {dailyMessage}
          </p>
        </div>
        <div className={cn("text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border", systemLoad.color, systemLoad.bg, systemLoad.color.replace('text-', 'border-').replace('400', '400/30').replace('500', '500/30'))}>
          {systemLoad.label}
        </div>
      </div>

      {/* Hero Chart - Abstract with Info Pills */}
      <section className="bg-theme-card/80 backdrop-blur-md rounded-[2rem] border border-theme-border shadow-sm relative overflow-hidden flex-1 shrink-0 min-h-[220px]">
        
        {/* Floating Abstract Pills inside Chart */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
          <div className="bg-theme-bg/80 backdrop-blur-sm border border-theme-border px-3 py-2 rounded-xl flex flex-col shadow-sm">
            <span className="text-[9px] font-black text-md3-gray uppercase tracking-widest leading-none mb-1">Tělo / Zátěž</span>
            <span className="text-sm font-black text-theme-text">{cleanTime > 0 ? `${cleanHours}h ${cleanMinutes}m` : '0h 0m'}</span>
          </div>
          {settings.dashboardWidgets?.budget !== false && (
             <div className="bg-theme-bg/80 backdrop-blur-sm border border-theme-border px-3 py-2 rounded-xl flex flex-col mt-1 shadow-sm">
              <span className="text-[9px] font-black text-md3-green uppercase tracking-widest leading-none mb-1">Útrata / Dnes</span>
              <span className="text-sm font-black text-theme-text leading-none">{settings.privacyMode ? '***' : dailyCost.toLocaleString('cs-CZ')} {settings.currency || 'Kč'}</span>
            </div>
          )}
        </div>

        <div className="absolute top-4 right-4 z-10">
          <div className="flex bg-theme-bg/80 backdrop-blur-sm p-1 rounded-xl border border-theme-border shadow-sm">
            <button 
              onClick={() => setChartType('kinetic')}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", chartType === 'kinetic' ? "bg-md3-primary text-white shadow-md" : "text-md3-gray hover:text-theme-text")}
            >
              Kinetika
            </button>
            <button 
              onClick={() => setChartType('effects')}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", chartType === 'effects' ? "bg-[#ff9f0a] text-white shadow-md" : "text-md3-gray hover:text-theme-text")}
            >
              Účinky
            </button>
          </div>
        </div>
        
        <div className="absolute inset-x-0 bottom-0 top-[40px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -25, right: -10, top: 20, bottom: -10 }}>
              <defs>
                {chartType === 'kinetic' ? (
                  substances.map(s => (
                    <linearGradient key={s.id} id={`color-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={s.color || CATEGORY_COLORS[s.category] || '#0a84ff'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={s.color || CATEGORY_COLORS[s.category] || '#0a84ff'} stopOpacity={0}/>
                    </linearGradient>
                  ))
                ) : (
                  Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || []))).map(type => (
                    <linearGradient key={type} id={`color-effect-${type}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={EFFECT_COLORS[type] || '#ff9f0a'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={EFFECT_COLORS[type] || '#ff9f0a'} stopOpacity={0}/>
                    </linearGradient>
                  ))
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--md3-border)" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="time" 
                type="number" 
                domain={['dataMin', 'dataMax']} 
                tickFormatter={(time) => formatTime(time, settings)}
                stroke="transparent"
                tick={{ fill: 'var(--md3-gray)', fontSize: 8, fontWeight: '900' }}
                minTickGap={30}
                tickMargin={2}
              />
              <YAxis 
                domain={[0, maxChartValue]} 
                stroke="transparent"
                tick={false}
                width={0}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--md3-card)', border: '1px solid var(--md3-border)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '9px', color: 'var(--md3-text)', fontWeight: '900', padding: '4px' }}
                itemStyle={{ padding: '0' }}
                labelFormatter={(time) => formatTime(time, settings)}
                formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={16} 
                iconType="circle"
                iconSize={5}
                wrapperStyle={{ fontSize: '8px', fontWeight: '900', color: 'var(--md3-text)', transform: 'translateY(-4px)' }}
              />
              {chartType === 'kinetic' ? (
                substances.map(s => (
                  <Area key={s.id} type="monotone" dataKey={s.id} name={s.name} stroke={s.color || CATEGORY_COLORS[s.category] || '#0a84ff'} fillOpacity={1} fill={`url(#color-${s.id})`} strokeWidth={2.5} connectNulls animationDuration={settings.chartAnimation ? 300 : 0} dot={false} activeDot={{ r: 4, fill: s.color, stroke: 'var(--theme-bg)', strokeWidth: 2 }} />
                ))
              ) : (
                Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || []))).map(type => (
                  <Area key={type} type="monotone" dataKey={type} name={type} stroke={EFFECT_COLORS[type] || '#ff9f0a'} fillOpacity={1} fill={`url(#color-effect-${type})`} strokeWidth={2.5} connectNulls animationDuration={settings.chartAnimation ? 300 : 0} dot={false} activeDot={{ r: 4, fill: EFFECT_COLORS[type], stroke: 'var(--theme-bg)', strokeWidth: 2 }} />
                ))
              )}
              <ReferenceLine 
                x={now} 
                stroke="#ff453a" 
                strokeDasharray="3 3" 
                strokeWidth={1.5} 
                label={{ position: 'top', value: 'TEĎ', fill: '#ff453a', fontSize: 8, fontWeight: '900' }} 
                isFront={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        {/* Active Substance Monitor & Recent */}
        {settings.dashboardWidgets?.activeEffects !== false && (
          <section className="bg-theme-card/80 backdrop-blur-md rounded-[1.5rem] border border-theme-border p-3.5 shadow-sm w-full">
            <div className="flex items-center justify-between mb-2.5 opacity-90">
              <span className="text-[11px] font-black text-md3-gray uppercase tracking-widest pl-1">V Krvi / Nedávné</span>
              <span className="text-[11px] font-black text-md3-primary bg-md3-primary/10 px-2.5 py-0.5 rounded-md">{activeSubstanceDetails.length}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {(() => {
                // Combine active substances and recently used inactive substances (last 48hours)
                const now = currentTime.getTime();
                const recentThreshold = now - (48 * 60 * 60 * 1000); // 48 hours
                
                const allRecentItemsMap = new Map();
                
                // Add active items first
                activeSubstanceDetails.forEach(item => {
                  allRecentItemsMap.set(item.substance!.id, item);
                });
                
                // Add inactive items from recent doses
                const recentDoses = doses.filter(d => d.timestamp >= recentThreshold).sort((a,b) => b.timestamp - a.timestamp);
                recentDoses.forEach(dose => {
                  if (!allRecentItemsMap.has(dose.substanceId)) {
                    const substance = substances.find(s => s.id === dose.substanceId);
                    if (substance) {
                      allRecentItemsMap.set(dose.substanceId, { substance, level: 0, inactive: true });
                    }
                  }
                });
                
                const displayItems = Array.from(allRecentItemsMap.values());

                if (displayItems.length === 0) {
                  return (
                    <div className="bg-theme-subtle border border-theme-border/50 rounded-xl p-4 flex flex-row justify-center items-center gap-2 opacity-70">
                      <Activity size={18} className="text-md3-gray" />
                      <span className="text-xs uppercase font-black tracking-widest text-md3-gray">Žádná historie</span>
                    </div>
                  );
                }

                return displayItems.map(({ substance, level, inactive }) => {
                  const Icon = SUBSTANCE_ICONS[substance!.icon] || Zap;
                  const color = inactive ? '#8e8e93' : (substance!.color || CATEGORY_COLORS[substance!.category] || '#0a84ff');
                  
                  // Find last used dose for this substance
                  const lastDose = doses.filter(d => d.substanceId === substance!.id).sort((a,b) => b.timestamp - a.timestamp)[0];
                  const lastDoseDate = lastDose ? new Date(lastDose.timestamp) : null;
                  let lastUsedText = '';
                  if (lastDoseDate) {
                     const diffHrs = Math.floor((now - lastDoseDate.getTime()) / (1000 * 60 * 60));
                     if (diffHrs === 0) lastUsedText = '< 1h';
                     else if (diffHrs < 24) lastUsedText = `${diffHrs}h`;
                     else lastUsedText = `${lastDoseDate.getDate()}.${lastDoseDate.getMonth() + 1}.`;
                  }

                  return (
                    <button 
                      key={substance!.id} 
                      onClick={() => !inactive && setSelectedDetailsId(substance!.id)}
                      disabled={inactive}
                      className={cn(
                        "flex flex-col border border-theme-border/50 rounded-[14px] p-3 w-full transition-colors shadow-sm group",
                        inactive ? "bg-theme-bg/30 opacity-70" : "bg-theme-subtle hover:bg-theme-subtle-hover"
                      )}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-theme-bg shrink-0 shadow-inner group-hover:scale-[1.03] transition-transform relative overflow-hidden">
                          <div className="absolute inset-0 opacity-10" style={{ backgroundColor: color }} />
                          <Icon size={20} style={{ color }} />
                        </div>
                        <div className="flex flex-col flex-1 text-left justify-center">
                          <div className="flex justify-between items-center mb-1">
                            <span className={cn("text-[13px] font-black uppercase tracking-wider", inactive ? "text-md3-gray" : "text-theme-text")}>{substance!.name}</span>
                            {!inactive && <span className="text-xs font-black tabular-nums bg-theme-bg px-2 py-0.5 rounded shadow-sm" style={{ color }}>{level.toFixed(0)}%</span>}
                            {inactive && <span className="text-[9px] font-black uppercase tracking-widest text-md3-gray px-2 py-0.5">Nulová hladina</span>}
                          </div>
                          <span className="text-[10px] font-bold text-md3-gray uppercase tracking-widest leading-none">
                            {lastUsedText && `Užito: ${lastUsedText}`}
                          </span>
                        </div>
                      </div>
                      {/* Level Bar */}
                      {!inactive && (
                        <div className="w-full h-2 bg-theme-bg/50 rounded-full overflow-hidden shadow-inner mt-3">
                          <motion.div animate={{ width: `${level}%` }} className="h-full rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} transition={{ duration: 1 }} />
                        </div>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        {settings.dashboardWidgets?.quickAdd !== false && (
          <section className="w-full bg-theme-card/80 backdrop-blur-md rounded-[1.5rem] border border-theme-border p-3 shadow-sm mb-2">
            <QuickActions 
              shortcuts={shortcuts}
              substances={substances}
              onUseShortcut={onUseShortcut}
              onAddShortcut={onAddShortcut}
              onRemoveShortcut={onRemoveShortcut}
              onUpdateShortcut={onUpdateShortcut}
            />
          </section>
        )}
      </div>

      {/* Substance Details Modal - Glassmorphism */}
      <AnimatePresence>
        {selectedDetailsId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetailsId(null)}
              className="absolute inset-0 bg-theme-bg/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md md3-card overflow-hidden relative z-10 shadow-2xl pb-safe"
            >
              {(() => {
                const item = activeSubstanceDetails.find(d => d.substance?.id === selectedDetailsId);
                if (!item) return null;
                const { substance, level, tolerance } = item;
                return (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-theme-subtle flex items-center justify-center border border-theme-border">
                          <Activity size={24} style={{ color: substance!.color || '#00d1ff' }} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-theme-text">{substance!.name}</h3>
                          <div className="text-xs text-md3-gray font-bold uppercase tracking-widest">Biometrická Analýza</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedDetailsId(null)}
                        className="p-2 rounded-full bg-md3-secondary text-md3-gray hover:text-theme-text transition-all hover:rotate-90 md3-button"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-theme-subtle rounded-2xl p-4 border border-theme-border">
                        <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Hladina</div>
                        <div className="text-xl font-bold text-md3-primary">{level.toFixed(2)}%</div>
                      </div>
                      <div className="bg-theme-subtle rounded-2xl p-4 border border-theme-border">
                        <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Tolerance</div>
                        <div className="text-xl font-bold text-md3-orange">{tolerance.toFixed(2)}%</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        { icon: Clock, label: 'Poločas rozpadu', value: `${substance!.halfLife}h` },
                        { icon: Zap, label: 'Nástup účinku', value: `${substance!.onset}m` },
                        { icon: Activity, label: 'Doba trvání', value: `${substance!.duration}h` }
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-theme-subtle rounded-xl border border-theme-border">
                          <div className="flex items-center gap-2">
                            <row.icon size={14} className="text-md3-gray" />
                            <span className="text-xs font-bold text-md3-gray">{row.label}</span>
                          </div>
                          <span className="text-xs font-bold text-theme-text">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => setSelectedDetailsId(null)}
                      className="w-full mt-6 py-4 rounded-2xl bg-md3-primary text-theme-text text-sm font-bold uppercase tracking-wider md3-button"
                    >
                      Zavřít Analýzu
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Floating Quick Log Button */}
      <div className="fixed bottom-24 right-4 z-[100] md:hidden mb-safe">
        <button 
          onClick={() => setIsQuickLogOpen(true)}
          className="w-14 h-14 rounded-2xl bg-md3-primary text-theme-bg shadow-lg flex items-center justify-center active:scale-90 transition-all border border-md3-primary/30 glow-effects-enabled:shadow-[0_0_25px_var(--md3-primary-30)]"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      </div>

      {/* Quick Log Modal */}
      <AnimatePresence>
        {isQuickLogOpen && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 md:items-center sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickLogOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative md3-card rounded-t-[2.5rem] sm:rounded-[2.5rem] rounded-b-none sm:rounded-b-[2.5rem] w-full max-w-xl p-6 border-t md:border border-theme-border shadow-2xl pb-safe"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-theme-text uppercase tracking-tight">Rychlý Záznam</h2>
                <button onClick={() => setIsQuickLogOpen(false)} className="p-2 rounded-full bg-md3-secondary text-md3-gray hover:text-theme-text transition-all md3-button">
                  <X size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {substances.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const newDose: Dose = {
                        id: Date.now().toString(),
                        substanceId: s.id,
                        amount: s.dosage?.common || 1,
                        timestamp: Date.now(),
                        route: 'oral',
                        note: 'Quick Log',
                        bioavailabilityMultiplier: 1,
                        tmaxMultiplier: 1
                      };
                      onAddDose(newDose);
                      setIsQuickLogOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-theme-subtle border border-theme-border hover:bg-theme-subtle-hover transition-all text-left md3-button"
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-theme-subtle border border-theme-border">
                      <Zap size={14} style={{ color: s.color }} />
                    </div>
                    <div className="text-xs font-bold text-theme-text uppercase tracking-tight truncate">{s.name}</div>
                  </button>
                ))}
              </div>
              
              <p className="text-xs text-md3-gray font-bold uppercase text-center tracking-widest">Vyberte látku pro okamžitý záznam výchozí dávky</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
