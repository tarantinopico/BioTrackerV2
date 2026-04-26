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
    <div className="flex flex-col gap-5 relative h-full pb-32 overflow-x-hidden overflow-y-auto custom-scrollbar">
      {/* Header - Artistic and Open */}
      <div className="px-5 pt-6 flex items-start justify-between shrink-0 relative z-20">
        <div className="flex flex-col gap-1.5 mt-2">
          <h2 className="text-[28px] font-black text-theme-text flex items-center gap-2 leading-none tracking-tighter drop-shadow-sm">
            {greeting.text} <greeting.Icon className={cn("text-theme-text opacity-80")} size={24} strokeWidth={2.5} />
          </h2>
          <p className="text-[11px] text-md3-gray/90 font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[220px]">
            {dailyMessage}
          </p>
        </div>
        <div className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-[0_4px_20px_-5px_rgba(0,0,0,0.3)] backdrop-blur-xl", systemLoad.color, systemLoad.bg, systemLoad.color.replace('text-', 'border-').replace('400', '400/20').replace('500', '500/20'))}>
           <div className="flex items-center gap-1.5">
             <systemLoad.icon size={12} className={systemLoad.pulse ? "animate-pulse" : ""} strokeWidth={3} />
             {systemLoad.label}
           </div>
        </div>
      </div>

      {/* Hero Chart - Integrated Background style */}
      <section className="relative flex-1 shrink min-h-[220px] flex flex-col -mx-2 z-0 pointer-events-none mt-4">
        
        {/* Floating Abstract Pills inside Chart Layer */}
        <div className="absolute top-2 left-4 flex flex-col gap-3 z-20 pointer-events-auto">
          <div className="bg-white/5 dark:bg-black/20 backdrop-blur-3xl border border-white/10 px-4 py-3 rounded-[1.2rem] flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <span className="text-[10px] font-bold text-md3-gray/80 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5"><Brain size={12} className="text-md3-primary/90"/> Čas od čistoty</span>
            <span className="text-[18px] font-black tracking-tight text-theme-text leading-none drop-shadow-sm">{cleanTime > 0 ? `${cleanHours}h ${cleanMinutes}m` : '0h 0m'}</span>
          </div>
          {settings.dashboardWidgets?.budget !== false && (
             <div className="bg-white/5 dark:bg-black/20 backdrop-blur-3xl border border-white/10 px-4 py-3 rounded-[1.2rem] flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <span className="text-[10px] font-bold text-md3-green/80 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5"><PiggyBank size={12} className="text-md3-green/90"/> Útrata Dnes</span>
              <span className="text-[18px] font-black tracking-tight text-theme-text leading-none drop-shadow-sm">{settings.privacyMode ? '***' : dailyCost.toLocaleString('cs-CZ')} <span className="text-[11px] text-md3-gray/70 font-bold ml-0.5">{settings.currency || 'Kč'}</span></span>
            </div>
          )}
        </div>

        <div className="absolute top-2 right-4 z-20 pointer-events-auto">
          <div className="flex bg-white/5 dark:bg-black/20 backdrop-blur-3xl p-1 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <button 
              onClick={() => setChartType('kinetic')}
              className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", chartType === 'kinetic' ? "bg-md3-primary/90 text-white shadow-md backdrop-blur-md" : "text-md3-gray hover:text-theme-text")}
            >
              Kinetika
            </button>
            <button 
              onClick={() => setChartType('effects')}
              className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", chartType === 'effects' ? "bg-[#ff9f0a]/90 text-white shadow-md backdrop-blur-md" : "text-md3-gray hover:text-theme-text")}
            >
              Účinky
            </button>
          </div>
        </div>
        
        {/* Soft elegant mask for the chart */}
        <div className="absolute inset-x-0 bottom-0 top-[10px] w-full opacity-[0.9] transition-opacity duration-1000 -z-10" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -25, right: -10, top: 40, bottom: -20 }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="var(--md3-border)" vertical={false} opacity={0.2} />
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
                contentStyle={{ backgroundColor: 'rgba(var(--theme-bg-rgb), 0.8)', backdropFilter: 'blur(10px)', border: '1px solid var(--md3-border)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '9px', color: 'var(--md3-text)', fontWeight: '900', padding: '6px' }}
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

      {/* Insight Engine Mini */}
      {settings.insightEngine && (() => {
        if (doses.length < 5) return null;
        const sortedDosesDesc = [...doses].sort((a, b) => b.timestamp - a.timestamp);
        const recentDoses = sortedDosesDesc.slice(0, Math.min(10, doses.length));
        
        let insightMessage = "Systém je stabilní. Pokračujte ve správném užívání.";
        let alertColor = "text-md3-gray";
        let alertBg = "bg-theme-bg/40 border-theme-border/20";
        let IconCmp = Sparkles;
        let ringColor = "ring-white/5";
        
        if (recentDoses.length >= 5) {
           const span = recentDoses[0].timestamp - recentDoses[recentDoses.length - 1].timestamp;
           if (span > 0) {
              const hourRate = recentDoses.length / (span / 3600000);
              if (hourRate > 1) { 
                 insightMessage = "Extrémní rychlost dávkování. Hrozí akutní přetížení.";
                 alertColor = "text-red-500";
                 alertBg = "bg-red-500/10 border-red-500/20";
                 IconCmp = AlertCircle;
                 ringColor = "ring-red-500/30";
              } else if (hourRate > 0.4) {
                 insightMessage = "Zvýšená frekvence užívání. Dejte tělu čas na zpracování.";
                 alertColor = "text-amber-500";
                 alertBg = "bg-amber-500/10 border-amber-500/20";
                 IconCmp = Activity;
                 ringColor = "ring-amber-500/30";
              }
           }
        }

        const cleanHours = Math.floor((currentTime.getTime() - (sortedDosesDesc[0]?.timestamp || 0)) / 3600000);

        if (activeSubstanceDetails.length === 0 && cleanHours > 48) {
            insightMessage = `Systém plně detoxifikován. Čistota: ${cleanHours}h.`;
            alertColor = "text-emerald-500";
            alertBg = "bg-emerald-500/10 border-emerald-500/20";
            IconCmp = Brain;
            ringColor = "ring-emerald-500/30";
        } else if (activeSubstanceDetails.length === 0 && cleanHours > 24) {
            insightMessage = "Fáze zotavení. Doporučena vyšší hydratace a spánek.";
            alertColor = "text-cyan-primary";
            alertBg = "bg-cyan-primary/10 border-cyan-primary/20";
            IconCmp = Cpu;
            ringColor = "ring-cyan-primary/30";
        }
        
        return (
           <div className={cn("shrink-0 rounded-full py-2.5 px-4 flex gap-3.5 items-center justify-center w-full mx-auto max-w-[340px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] border backdrop-blur-2xl transition-all relative overflow-hidden group mt-2 mb-4", alertBg)}>
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent pointer-events-none group-hover:via-white/[0.08] transition-colors" />
             <div className="flex flex-row items-center gap-2.5 relative z-10 min-w-0">
                <div className={cn("p-1.5 rounded-full shrink-0 shadow-inner ring-2", alertColor, ringColor)}>
                   <IconCmp size={14} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-bold text-theme-text leading-tight w-full truncate drop-shadow-sm">
                    {insightMessage}
                  </span>
                </div>
             </div>
           </div>
        );
      })()}

      {/* Dynamic Compact Display Row */}
      <div className="flex gap-4 shrink-0 w-full relative z-10 px-2 mt-4">
        {/* Active Substance Monitor & Recent */}
        {settings.dashboardWidgets?.activeEffects !== false && (
          <section className="bg-white/5 dark:bg-black/20 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] w-1/2 flex flex-col relative group hover:bg-white/[0.08] dark:hover:bg-black/30 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none rounded-[2rem]" />
            <div className="flex items-center justify-between opacity-90 px-4 pt-4 mb-3 shrink-0 z-10">
              <span className="text-[10px] font-bold text-md3-gray/90 uppercase tracking-[0.15em] flex items-center gap-1.5 drop-shadow-sm">
                <Activity size={12} className="text-md3-primary/90" /> Interakce
              </span>
              <span className="text-[10px] font-black tabular-nums text-md3-primary bg-md3-primary/15 px-2 py-0.5 rounded-lg text-center min-w-[24px] tracking-wide">{activeSubstanceDetails.length}</span>
            </div>
            <div className="flex flex-col gap-2.5 px-3 pb-3 z-10">
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
                    <div className="bg-theme-bg/30 border border-theme-border/20 rounded-2xl p-2 flex flex-col justify-center items-center gap-1.5 opacity-60 h-full mt-1">
                      <ShieldCheck size={16} className="text-emerald-400/70" />
                      <span className="text-[10px] font-semibold tracking-wider text-md3-gray">Systém čistý</span>
                    </div>
                  );
                }

                return displayItems.map(({ substance, level, inactive }) => {
                  const Icon = SUBSTANCE_ICONS[substance!.icon] || Zap;
                  const color = inactive ? '#8e8e93' : (substance!.color || CATEGORY_COLORS[substance!.category] || '#0a84ff');
                  
                  const lastDose = doses.filter(d => d.substanceId === substance!.id).sort((a,b) => b.timestamp - a.timestamp)[0];
                  const lastDoseDate = lastDose ? new Date(lastDose.timestamp) : null;
                  let lastUsedText = '';
                  if (lastDoseDate) {
                     const diffMs = now - lastDoseDate.getTime();
                     const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                     const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                     if (diffHrs === 0) lastUsedText = `${diffMins}m`;
                     else if (diffHrs < 24) lastUsedText = `${diffHrs}h ${diffMins}m`;
                     else lastUsedText = `${diffHrs}h`;
                  }

                  return (
                    <button 
                      key={substance!.id} 
                      onClick={() => !inactive && setSelectedDetailsId(substance!.id)}
                      disabled={inactive}
                      className={cn(
                        "flex items-center gap-3 border rounded-[1.2rem] p-2.5 w-full transition-all shadow-[0_4px_15px_rgba(0,0,0,0.05)] group relative overflow-hidden shrink-0",
                        inactive ? "bg-white/5 dark:bg-black/10 border-white/5 opacity-70" : "bg-white/5 dark:bg-black/20 border-white/10 hover:bg-white/10 dark:hover:bg-black/30 backdrop-blur-xl"
                      )}
                    >
                      {!inactive && <div className="absolute left-0 bottom-0 top-0 opacity-[0.12]" style={{backgroundColor: color, width: `${level}%`}} />}
                      <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-theme-bg/60 shrink-0 shadow-inner group-hover:scale-[1.08] transition-transform relative z-10 backdrop-blur-md border border-white/5">
                        <Icon size={16} style={{ color }} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col flex-1 text-left justify-center overflow-hidden relative z-10">
                        <div className="flex justify-between items-center w-full">
                           <span className={cn("text-[12px] font-bold tracking-tight truncate mr-1.5 drop-shadow-sm", inactive ? "text-md3-gray" : "text-theme-text")}>{substance!.name}</span>
                           {!inactive && <span className="text-[10px] font-black tabular-nums leading-none ml-1 px-2 py-1 rounded-md bg-theme-bg/80 backdrop-blur-md drop-shadow-sm" style={{ color }}>{level.toFixed(0)}%</span>}
                        </div>
                        {inactive && <span className="text-[9px] font-semibold text-md3-gray/80 leading-none mt-1 truncate">{lastUsedText && `Před: ${lastUsedText}`}</span>}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </section>
        )}

        {/* Today's Stats per Substance */}
        <section className="bg-white/5 dark:bg-black/20 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col w-1/2 relative group hover:bg-white/[0.08] dark:hover:bg-black/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-bl from-white/[0.05] to-transparent pointer-events-none rounded-[2rem]" />
          <div className="flex items-center justify-between opacity-90 px-4 pt-4 mb-3 shrink-0 z-10">
            <span className="text-[10px] font-bold text-md3-gray/90 uppercase tracking-[0.15em] flex items-center gap-1.5 drop-shadow-sm">
              <Pill size={12} className="text-md3-primary/90" /> Dnes
            </span>
          </div>
          <div className="flex flex-col gap-2.5 px-3 pb-3 z-10">
            {dailyStats.length > 0 ? (
              dailyStats.map((stat, idx) => {
                const IconComp = SUBSTANCE_ICONS[stat.icon] || Pill;
                return (
                  <div key={idx} className="bg-theme-bg/40 border border-white/10 rounded-2xl p-2.5 flex items-center shadow-[0_4px_15px_rgba(0,0,0,0.05)] relative overflow-hidden shrink-0 backdrop-blur-xl" style={{ borderLeftColor: stat.color, borderLeftWidth: '3px' }}>
                    <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none" style={{ color: stat.color }}>
                       <IconComp size={48} />
                    </div>
                    <div className="w-9 h-9 rounded-xl flex justify-center items-center shrink-0 mr-3 z-10 backdrop-blur-xl shadow-inner border border-white/5" style={{ backgroundColor: stat.color + '15', color: stat.color }}>
                      <IconComp size={16} strokeWidth={2.5}/>
                    </div>
                    <div className="flex flex-col overflow-hidden z-10 w-full justify-center">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[11px] font-bold tracking-tight text-md3-gray/90 truncate mr-1.5">{stat.name}</span>
                        <span className="text-[12px] font-black text-theme-text leading-none whitespace-nowrap ml-1 drop-shadow-sm">{stat.amount}<span className="text-[10px] text-md3-gray/70 ml-0.5">{stat.unit}</span></span>
                      </div>
                      {!settings.privacyMode && stat.cost > 0 && (
                        <div className="text-[9px] font-bold text-md3-green/90 mt-1 truncate tracking-wider">{stat.cost.toLocaleString('cs-CZ')} {settings.currency || 'Kč'}</div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
               <div className="bg-theme-bg/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-center items-center opacity-60 mt-1 min-h-[90px] shadow-sm backdrop-blur-md">
                  <Coffee size={18} className="text-md3-gray/70 mb-2" strokeWidth={2.5}/>
                  <span className="text-[10px] font-bold tracking-[0.1em] text-md3-gray/70 text-center uppercase leading-tight drop-shadow-sm">Zatím<br/>čistý</span>
               </div>
            )}
          </div>
        </section>
      </div>
      
      {/* Quick Actions */}
      {settings.dashboardWidgets?.quickAdd !== false && (
        <section className="w-full shrink-0 relative z-20 mt-2 mb-4 px-1">
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
      
      {/* Keep the padding at the bottom of the column for spacing */}
      <div className="h-6 shrink-0"></div>

      {/* Substance Details Modal - Glassmorphism */}
      <AnimatePresence>
        {selectedDetailsId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetailsId(null)}
              className="absolute inset-0 bg-theme-bg/40 backdrop-blur-3xl"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="w-full max-w-md bg-white/10 dark:bg-black/30 border border-white/20 rounded-[2.5rem] overflow-hidden relative z-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-2xl pb-safe"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />
              {(() => {
                const item = activeSubstanceDetails.find(d => d.substance?.id === selectedDetailsId);
                if (!item) return null;
                const { substance, level, tolerance } = item;
                const color = substance!.color || '#00d1ff';
                return (
                  <div className="p-8 relative z-10">
                    <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-30" style={{ backgroundColor: color }} />
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[1.2rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner relative overflow-hidden backdrop-blur-md">
                          <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t opacity-20 pointer-events-none" style={{ from: color, to: 'transparent' }} />
                          <Activity size={24} style={{ color }} strokeWidth={2.5}/>
                        </div>
                        <div>
                          <h3 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">{substance!.name}</h3>
                          <div className="text-[10px] text-white/50 font-bold uppercase tracking-[0.2em] mt-1">Biometrická Měření</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedDetailsId(null)}
                        className="p-3 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all hover:scale-110 active:scale-90 border border-white/5 shadow-sm"
                      >
                        <X size={20} strokeWidth={2.5} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/5 rounded-[1.8rem] p-6 border border-white/10 relative overflow-hidden group hover:bg-white/[0.08] transition-colors shadow-inner">
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl opacity-20 transition-colors" style={{ backgroundColor: color }}></div>
                        <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-3 relative z-10">Hladina</div>
                        <div className="text-4xl font-black tracking-tight relative z-10 drop-shadow-sm" style={{ color }}>{level.toFixed(1)}<span className="text-xl opacity-80">%</span></div>
                      </div>
                      <div className="bg-white/5 rounded-[1.8rem] p-6 border border-white/10 relative overflow-hidden group hover:bg-white/[0.08] transition-colors shadow-inner">
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-rose-500/20 rounded-full blur-2xl transition-colors"></div>
                        <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-3 relative z-10">Tolerance</div>
                        <div className="text-4xl font-black text-rose-400 tracking-tight relative z-10 drop-shadow-sm">{tolerance.toFixed(1)}<span className="text-xl opacity-80">%</span></div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-8">
                      {[
                        { icon: Clock, label: 'Poločas rozpadu', value: `${substance!.halfLife}h` },
                        { icon: Zap, label: 'Nástup účinku', value: `${substance!.onset}m` },
                        { icon: Activity, label: 'Doba trvání', value: `${substance!.duration}h` }
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-4 bg-white/5 rounded-[1.2rem] border border-white/10 backdrop-blur-md shadow-sm">
                          <div className="flex items-center gap-3">
                            <row.icon size={16} className="text-white/50" />
                            <span className="text-sm font-semibold text-white/80">{row.label}</span>
                          </div>
                          <span className="text-sm font-black tracking-wide text-white drop-shadow-sm">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => setSelectedDetailsId(null)}
                      className="w-full py-5 rounded-2xl font-black text-sm text-[#000] transition-all uppercase tracking-[0.3em] relative overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.15)] active:scale-[0.98] drop-shadow-sm"
                      style={{ backgroundColor: color, boxShadow: `0 10px 30px ${color}55` }}
                    >
                      <div className="absolute inset-0 bg-white/20" />
                      <span className="relative z-10 text-black">Ukončit Zobrazení</span>
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
