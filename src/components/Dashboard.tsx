import { useMemo, useState } from 'react';
import { 
  History,
  CalendarDays,
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
  MoonStar,
  Cpu,
  PiggyBank
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
  calculatePeakSubstanceLevel,
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
    const windowHours = settings.chartWindow || 24;
    const roundedNow = Math.floor(now / 60000) * 60000;
    const startTime = roundedNow - (windowHours * 3600000) / 2;
    const endTime = roundedNow + (windowHours * 3600000) / 2;

    const activeIds = Array.from(new Set(activeDoses.map(d => d.substanceId)));
    return activeIds.map(id => {
      const substance = substances.find(s => s.id === id);
      const rawLevel = calculateSubstanceLevelAtTime(id, now, substances, doses, settings);
      const peak = calculatePeakSubstanceLevel(id, doses, substances, settings, startTime, endTime);
      const level = (rawLevel / peak) * 100;
      
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
    const peaks: Record<string, number> = {};
    activeSubstanceIds.forEach(id => {
      tolerances[id] = calculateTolerance(id, substances, doses, roundedNow);
      if (chartType === 'kinetic') {
         peaks[id] = calculatePeakSubstanceLevel(id, doses, substances, settings, startTime, endTime);
      }
    });

    for (let i = 0; i <= points; i++) {
      const time = startTime + (i * step);
      const point: any = { 
        time, 
        timeStr: formatTime(time, settings) 
      };
      
      if (chartType === 'kinetic') {
        activeSubstanceIds.forEach(id => {
          const rawLevel = calculateSubstanceLevelAtTime(id, time, substances, doses, settings, tolerances[id]);
          point[id] = (rawLevel / peaks[id]) * 100;
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
    
    const stats: Record<string, { amount: number; cost: number; unit: string; color: string; name: string; icon: string }> = {};
    
    todayDoses.forEach(d => {
      const substance = substances.find(s => s.id === d.substanceId) || {
        id: d.substanceId,
        name: d.substanceId,
        unit: '?',
        color: '#8e8e93',
        icon: 'pill',
        category: 'other',
        price: 0
      } as unknown as Substance;
      
      const strainPrice = substance && d.strainId ? substance.strains?.find(s => s.name === d.strainId)?.price : null;
      const price = strainPrice || (substance ? substance.price : 0) || 0;
      const doseCost = d.amount * price;
      
      if (!stats[d.substanceId]) {
        stats[d.substanceId] = { 
          amount: 0, 
          cost: 0,
          unit: substance.unit || '', 
          color: substance.color || CATEGORY_COLORS[substance.category] || '#fff',
          name: substance.name,
          icon: substance.icon
        };
      }
      stats[d.substanceId].amount += d.amount;
      stats[d.substanceId].cost += doseCost;
    });
    
    return Object.values(stats);
  }, [doses, substances]);

  return (
    <div className="flex flex-col gap-3 relative h-full pb-32 overflow-x-hidden overflow-y-auto custom-scrollbar pt-safe">

      {/* Hero Chart - Integrated Background style */}
      <section className="relative flex-1 shrink min-h-[380px] flex flex-col -mx-5 sm:mx-0 z-0 pointer-events-none border-b border-white/5 rounded-b-[3rem] overflow-hidden shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]">
        
        {/* Floating Abstract Pills inside Chart Layer */}
        <div className="absolute top-0 left-4 pt-safe flex flex-col gap-3 z-20 pointer-events-auto mt-4">
          <div className="bg-theme-glass backdrop-blur-3xl border border-theme-border px-4 py-3 rounded-[1rem] flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <span className="text-[10px] font-bold text-theme-text/50 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5"><Brain size={12} className="text-cyan-400"/> Čas od čistoty</span>
            <span className="text-[18px] font-black tracking-tight text-theme-text leading-none drop-shadow-sm">{cleanTime > 0 ? `${cleanHours}h ${cleanMinutes}m` : '0h 0m'}</span>
          </div>
          {settings.dashboardWidgets?.budget !== false && (
             <div className="bg-theme-glass backdrop-blur-3xl border border-theme-border px-4 py-3 rounded-[1rem] flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]">
              <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5"><PiggyBank size={12} className="text-emerald-400"/> Útrata Dnes</span>
              <span className="text-[18px] font-black tracking-tight text-theme-text leading-none drop-shadow-sm">{settings.privacyMode ? '***' : dailyCost.toLocaleString('cs-CZ')} <span className="text-[11px] text-theme-text/50 font-bold ml-0.5">{settings.currency || 'Kč'}</span></span>
            </div>
          )}
        </div>

        <div className="absolute top-0 right-4 pt-safe z-20 pointer-events-auto mt-4">
          <div className="flex bg-theme-glass backdrop-blur-3xl p-1 rounded-2xl border border-theme-border shadow-[0_8px_30px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <button 
              onClick={() => setChartType('kinetic')}
              className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", chartType === 'kinetic' ? "bg-cyan-500 text-black shadow-md backdrop-blur-md" : "text-theme-text/50 hover:text-theme-text")}
            >
              Kinetika
            </button>
            <button 
              onClick={() => setChartType('effects')}
              className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", chartType === 'effects' ? "bg-orange-500 text-black shadow-md backdrop-blur-md" : "text-theme-text/50 hover:text-theme-text")}
            >
              Účinky
            </button>
          </div>
        </div>
        
        {/* Soft elegant mask for the chart */}
        <div className="absolute inset-x-0 bottom-0 top-0 w-full opacity-[0.95] transition-opacity duration-1000 -z-10 pt-4" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -25, right: -10, top: 60, bottom: -10 }}>
              <defs>
                {chartType === 'kinetic' ? (
                  substances.map(s => (
                    <linearGradient key={s.id} id={`color-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={s.color || CATEGORY_COLORS[s.category] || '#0a84ff'} stopOpacity={0.5}/>
                      <stop offset="95%" stopColor={s.color || CATEGORY_COLORS[s.category] || '#0a84ff'} stopOpacity={0}/>
                    </linearGradient>
                  ))
                ) : (
                  Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || []))).map(type => (
                    <linearGradient key={type} id={`color-effect-${type}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={EFFECT_COLORS[type] || '#ff9f0a'} stopOpacity={0.5}/>
                      <stop offset="95%" stopColor={EFFECT_COLORS[type] || '#ff9f0a'} stopOpacity={0}/>
                    </linearGradient>
                  ))
                )}
              </defs>
              <XAxis dataKey="time" hide={true} domain={['dataMin', 'dataMax']} type="number" />
              <YAxis hide={true} domain={[0, maxChartValue]} />
              
              
              
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(var(--theme-bg-rgb), 0.7)', backdropFilter: 'blur(30px) saturate(1.5)', border: '1px solid var(--theme-border)', borderRadius: '1.2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', fontSize: '11px', color: 'var(--md3-text)', fontWeight: '900', padding: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
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
                  <Area key={s.id} type="monotone" dataKey={s.id} name={s.name} stroke={s.color || CATEGORY_COLORS[s.category] || '#0a84ff'} fillOpacity={0.8} fill={`url(#color-${s.id})`} strokeWidth={3} connectNulls animationDuration={settings.chartAnimation ? 300 : 0} dot={false} activeDot={{ r: 4, fill: s.color, stroke: 'var(--theme-bg)', strokeWidth: 2 }} />
                ))
              ) : (
                Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || []))).map(type => (
                  <Area key={type} type="monotone" dataKey={type} name={type} stroke={EFFECT_COLORS[type] || '#ff9f0a'} fillOpacity={0.8} fill={`url(#color-effect-${type})`} strokeWidth={3} connectNulls animationDuration={settings.chartAnimation ? 300 : 0} dot={false} activeDot={{ r: 4, fill: EFFECT_COLORS[type], stroke: 'var(--theme-bg)', strokeWidth: 2 }} />
                ))
              )}
              <ReferenceLine 
                x={now} 
                stroke="#06b6d4" 
                strokeDasharray="4 4" 
                strokeWidth={2} 
                label={{ position: 'top', value: 'NYNÍ', fill: '#06b6d4', fontSize: 11, fontWeight: '900', letterSpacing: '0.1em' }} 
                isFront={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* QUICK ACTIONS ROW */}
      <div className="px-3 w-full max-w-[100vw] z-10 relative transform -translate-y-6">
         <QuickActions 
           shortcuts={shortcuts} 
           onUseShortcut={onUseShortcut} 
           onAddShortcut={onAddShortcut} 
           onRemoveShortcut={onRemoveShortcut}
           onUpdateShortcut={onUpdateShortcut}
           substances={substances}
         />
      </div>

      {/* Insight Engine Mini */}
      {settings.insightEngine && (() => {
        if (doses.length < 5) return null;
        const sortedDosesDesc = [...doses].sort((a, b) => b.timestamp - a.timestamp);
        const recentDoses = sortedDosesDesc.slice(0, Math.min(10, doses.length));
        
        let insightMessage = "Systém je stabilní. Pokračujte ve správném užívání.";
        let alertColor = "text-md3-gray";
        let alertBg = "bg-theme-glass border-theme-border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.05)]";
        let IconCmp = Sparkles;
        let ringColor = "ring-white/10";
        
        if (recentDoses.length >= 5) {
           const span = recentDoses[0].timestamp - recentDoses[recentDoses.length - 1].timestamp;
           if (span > 0) {
              const hourRate = recentDoses.length / (span / 3600000);
              if (hourRate > 1) { 
                 insightMessage = "Extrémní rychlost dávkování. Hrozí akutní přetížení.";
                 alertColor = "text-red-400";
                 alertBg = "bg-red-500/10 border-red-500/30 shadow-[inset_0_1px_1px_rgba(239,68,68,0.2)]";
                 IconCmp = AlertCircle;
                 ringColor = "ring-red-500/40";
              } else if (hourRate > 0.4) {
                 insightMessage = "Zvýšená frekvence užívání. Dejte tělu čas na zpracování.";
                 alertColor = "text-amber-400";
                 alertBg = "bg-amber-500/10 border-amber-500/30 shadow-[inset_0_1px_1px_rgba(245,158,11,0.2)]";
                 IconCmp = Activity;
                 ringColor = "ring-amber-500/40";
              }
           }
        }

        const cleanHours = Math.floor((currentTime.getTime() - (sortedDosesDesc[0]?.timestamp || 0)) / 3600000);

        if (activeSubstanceDetails.length === 0 && cleanHours > 48) {
            insightMessage = `Systém plně detoxifikován. Čistota: ${cleanHours}h.`;
            alertColor = "text-emerald-400";
            alertBg = "bg-emerald-500/10 border-emerald-500/30 shadow-[inset_0_1px_1px_rgba(16,185,129,0.2)]";
            IconCmp = Brain;
            ringColor = "ring-emerald-500/40";
        } else if (activeSubstanceDetails.length === 0 && cleanHours > 24) {
            insightMessage = "Fáze zotavení. Doporučena vyšší hydratace a spánek.";
            alertColor = "text-cyan-400";
            alertBg = "bg-cyan-500/10 border-cyan-500/30 shadow-[inset_0_1px_1px_rgba(6,182,212,0.2)]";
            IconCmp = Cpu;
            ringColor = "ring-cyan-500/40";
        }
        
        return (
           <div className={cn("shrink-0 rounded-[2rem] border border-theme-border/50 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.2)] py-2.5 px-4 flex gap-3 items-center justify-center w-full mx-auto max-w-[340px] shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)] border backdrop-blur-3xl transition-all relative overflow-hidden group", alertBg)}>
             <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none opacity-50" />
             <div className="flex flex-row items-center gap-3 relative z-10 min-w-0 w-full">
                <div className={cn("p-2 rounded-xl shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] ring-1 bg-theme-glass", alertColor, ringColor)}>
                   <IconCmp size={14} strokeWidth={3} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[12px] font-bold text-theme-text/90 leading-tight w-full truncate drop-shadow-sm">
                    {insightMessage}
                  </span>
                </div>
             </div>
           </div>
        );
      })()}

      {/* BENTO GRID LAYOUT */}
        
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[-20%] w-[60%] h-[40%] bg-indigo-500/10 blur-[140px] rounded-full mix-blend-screen animate-pulse duration-[10000ms]" />
        <div className="absolute top-[50%] right-[-10%] w-[50%] h-[50%] bg-rose-500/10 blur-[130px] rounded-full mix-blend-screen animate-pulse duration-[12000ms]" />
        <div className="absolute bottom-[-20%] left-[20%] w-[70%] h-[40%] bg-emerald-500/10 blur-[150px] rounded-full mix-blend-screen animate-pulse duration-[15000ms]" />
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-cyan-500/10 blur-[100px] rounded-full mix-blend-screen animate-pulse duration-[8000ms]" />
      </div>

      <div className="flex flex-col gap-3 px-4 z-10 w-full mb-4 relative drop-shadow-xl">
      
         {/* Historie Užití (Recent Substances) */}
         {settings.dashboardWidgets?.recentDoses !== false && allSubstancesLastUsed.filter(a => a.lastUsedHours !== null && a.lastUsedHours <= 48).length > 0 && (
            <div className="flex flex-col gap-3">
               <div className="flex items-center justify-between px-2">
                 <h3 className="text-[12px] font-black text-theme-text/80 uppercase tracking-widest flex items-center gap-2 drop-shadow-sm">
                   <Target size={14} className="text-indigo-400" strokeWidth={2.5} /> Poslední Aktivity
                 </h3>
               </div>
               <div className="grid grid-cols-1 gap-3">
                 {allSubstancesLastUsed.filter(a => a.lastUsedHours !== null && a.lastUsedHours <= 48).sort((a, b) => (a.lastUsedHours || 0) - (b.lastUsedHours || 0)).slice(0, 5).map((item, idx) => {
                    const activeDetails = activeSubstanceDetails.find(a => a.substance?.id === item.id);
                    const isActive = activeDetails && activeDetails.level > 0.1;
                    
                    const formatTimeAgo = (hours: number) => {
                      if (hours < 1) return `${Math.round(hours * 60)}m zpět`;
                      if (hours < 24) return `${hours.toFixed(1)}h zpět`;
                      const days = Math.floor(hours / 24);
                      if (days === 1) return `Včera`;
                      return `Před ${days} dny`;
                    };

                    return (
                      <div key={idx} className="bg-theme-glass backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(0,0,0,0.15)] p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-white/10 transition-colors">
                        <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-white to-transparent pointer-events-none" />
                        <div className="flex justify-between items-center z-10 w-full relative">
                           <div className="flex items-center gap-3 min-w-0">
                             <div className="w-10 h-10 rounded-[1rem] flex items-center justify-center shrink-0 border border-theme-border/30 bg-theme-bg/50 shadow-inner group-hover:scale-105 transition-transform" style={{ color: item.color || '#fff' }}>
                               {(() => {
                                 const IconComp = SUBSTANCE_ICONS[item.icon || 'pill'] || Pill;
                                 return <IconComp size={18} strokeWidth={2.5}/>;
                               })()}
                             </div>
                             <div className="flex flex-col min-w-0">
                               <span className="font-bold text-[13px] uppercase tracking-wider text-theme-text/90 truncate">{item.name}</span>
                               <span className="text-[10px] font-bold text-theme-text/40 flex items-center gap-1"><Clock size={10}/> {item.lastUsedHours !== null ? formatTimeAgo(item.lastUsedHours) : 'Dnes'}</span>
                             </div>
                           </div>
                           {isActive && (
                             <div className="flex flex-col items-end shrink-0">
                               <span className="text-[14px] font-black tabular-nums text-indigo-300 bg-indigo-900/40 px-3 py-1 rounded-xl shadow-inner border border-indigo-500/20">{Math.round(activeDetails.level)}%</span>
                             </div>
                           )}
                        </div>
                        
                        {isActive && (
                           <div className="w-full bg-theme-bg/50 rounded-full h-1.5 overflow-hidden shadow-inner border border-theme-border/30 mt-1 relative z-10">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${activeDetails.level}%` }}
                               transition={{ duration: 1, ease: "easeOut" }}
                               className="h-full rounded-full"
                               style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }}
                             />
                           </div>
                        )}
                      </div>
                    );
                 })}
               </div>
            </div>
         )}
         
         {/* Dnešní Výchylky (Daily Stats) */}
         {settings.dashboardWidgets?.recentDoses !== false && (
            <div className="flex flex-col gap-3">
               <div className="flex items-center justify-between px-2">
                 <h3 className="text-[12px] font-black text-theme-text/80 uppercase tracking-widest flex items-center gap-2 drop-shadow-sm">
                   <CalendarDays size={14} className="text-pink-400" strokeWidth={2.5} /> Dnešní Výchylky
                 </h3>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {dailyStats.length > 0 ? (
                    dailyStats.map((stat, idx) => {
                      const IconComp = SUBSTANCE_ICONS[stat.icon] || Pill;
                      return (
                        <div key={idx} className="bg-theme-glass backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(0,0,0,0.15)] p-4 flex flex-col justify-between gap-2 relative overflow-hidden group hover:border-white/10 transition-colors">
                           <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-white to-transparent pointer-events-none" />
                           <div className="absolute -right-3 -bottom-3 opacity-[0.08] pointer-events-none drop-shadow-md rotate-[15deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110" style={{ color: stat.color }}>
                             <IconComp size={48} />
                           </div>
                           
                           <div className="flex items-center gap-2.5 relative z-10 w-full min-w-0">
                             <div className="w-8 h-8 rounded-[0.8rem] flex justify-center items-center shrink-0 border border-theme-border/30 bg-theme-bg/50 shadow-inner group-hover:scale-105 transition-transform" style={{ color: stat.color }}>
                               <IconComp size={16} strokeWidth={2.5}/>
                             </div>
                             <span className="text-[11px] font-bold truncate text-theme-text/90 uppercase tracking-wider">{stat.name}</span>
                           </div>
                           
                           <div className="mt-2 flex flex-col gap-1.5 relative z-10 w-full">
                              <div className="flex items-center justify-between bg-theme-bg/30 px-2.5 py-1.5 rounded-xl border border-white/5">
                                 <span className="text-[9px] font-bold text-theme-text/50 uppercase tracking-wider">Množství</span>
                                 <div className="flex items-baseline gap-1">
                                    <span className="text-[14px] font-black tracking-tighter leading-none drop-shadow-sm">{stat.amount}</span>
                                    <span className="text-[9px] font-bold text-theme-text/50 uppercase">{stat.unit}</span>
                                 </div>
                              </div>
                              <div className="flex items-center justify-between bg-theme-bg/30 px-2.5 py-1.5 rounded-xl border border-white/5">
                                 <span className="text-[9px] font-bold text-theme-text/50 uppercase tracking-wider">Útrata</span>
                                 <div className="flex items-baseline gap-1">
                                    <span className="text-[14px] font-black tracking-tighter leading-none drop-shadow-sm text-emerald-400">{settings.privacyMode ? '***' : stat.cost.toLocaleString('cs-CZ')}</span>
                                    <span className="text-[9px] font-bold text-emerald-400/50 uppercase">{settings.currency || 'Kč'}</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full bg-theme-glass backdrop-blur-2xl rounded-[2rem] border border-white/5 border-dashed p-6 flex flex-col items-center justify-center gap-2 text-theme-text/40 shadow-inner">
                      <div className="w-12 h-12 rounded-full bg-theme-bg/30 flex items-center justify-center mb-1">
                        <Sparkles size={20} className="opacity-50" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Zatím nic</span>
                    </div>
                  )}
               </div>
            </div>
         )}
         
      </div>
      
    </div>
  );
}
