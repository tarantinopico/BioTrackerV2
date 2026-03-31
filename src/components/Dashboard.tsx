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
  Wallet
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
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Substance, Dose, UserSettings, Shortcut, Effect } from '../types';
import { 
  calculateSubstanceLevelAtTime, 
  calculateCleanTime, 
  calculateTolerance,
  calculateEffectIntensityAtTime 
} from '../services/pharmacology';
import { cn } from '../lib/utils';
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
      
      const substanceDoses = doses.filter(d => d.substanceId === id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const lastDose = substanceDoses[0];
      const lastUsedHours = lastDose ? (now - new Date(lastDose.timestamp).getTime()) / 3600000 : null;

      return { substance, level, tolerance, lastUsedHours };
    }).filter(item => item.substance !== undefined && item.level > 0.1);
  }, [activeDoses, substances, doses, settings, now]);

  const allSubstancesLastUsed = useMemo(() => {
    return substances.map(s => {
      const substanceDoses = doses.filter(d => d.substanceId === s.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const lastDose = substanceDoses[0];
      const lastUsedHours = lastDose ? (now - new Date(lastDose.timestamp).getTime()) / 3600000 : null;
      return { id: s.id, name: s.name, lastUsedHours, color: s.color };
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
    const startTime = now - (windowHours * 3600000) / 2;
    const endTime = now + (windowHours * 3600000) / 2;
    const points = 120;
    const step = (endTime - startTime) / points;
    
    const data = [];
    const activeSubstanceIds = Array.from(new Set(doses.map(d => d.substanceId)));
    const effectTypes = Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || [])));
    
    for (let i = 0; i <= points; i++) {
      const time = startTime + (i * step);
      const point: any = { 
        time, 
        timeStr: new Date(time).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) 
      };
      
      if (chartType === 'kinetic') {
        activeSubstanceIds.forEach(id => {
          const level = calculateSubstanceLevelAtTime(id, time, substances, doses, settings);
          point[id] = level;
        });
      } else {
        effectTypes.forEach(type => {
          const intensity = calculateEffectIntensityAtTime(type, time, substances, doses, settings);
          if (intensity > 0.1) point[type] = intensity;
        });
      }
      
      data.push(point);
    }
    return data;
  }, [substances, doses, settings, now, chartType]);

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

  const interactions = useMemo(() => {
    const activeIds = activeSubstanceDetails.map(d => d.substance!.id);
    if (activeIds.length < 2) return [];
    
    const alerts: { type: string; message: string; severity: 'low' | 'medium' | 'high' }[] = [];
    
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
    
    return alerts;
  }, [activeSubstanceDetails]);

  const cleanTime = calculateCleanTime(substances, doses, settings);
  const cleanHours = Math.floor(cleanTime / 3600000);
  const cleanMinutes = Math.floor((cleanTime % 3600000) / 60000);

  const dailyCost = useMemo(() => {
    const today = new Date().toDateString();
    return doses
      .filter(d => new Date(d.timestamp).toDateString() === today)
      .reduce((sum, d) => {
        const substance = substances.find(s => s.id === d.substanceId);
        if (!substance) return sum;
        const strainPrice = d.strainId ? substance.strains.find(s => s.name === d.strainId)?.price : null;
        const price = strainPrice || substance.price || 0;
        return sum + (d.amount * price);
      }, 0);
  }, [doses, substances]);

  const dailyStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayDoses = doses.filter(d => new Date(d.timestamp).toDateString() === today);
    
    const stats: Record<string, { amount: number; unit: string; color: string; name: string }> = {};
    
    todayDoses.forEach(d => {
      const substance = substances.find(s => s.id === d.substanceId);
      if (!substance) return;
      
      if (!stats[d.substanceId]) {
        stats[d.substanceId] = { 
          amount: 0, 
          unit: substance.unit || '', 
          color: substance.color || '#fff',
          name: substance.name
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

  return (
    <div className="space-y-8 pb-8 relative">
      {/* Main Status & Quick Stats - Deep Dark Glass */}
      <div className="grid grid-cols-2 gap-4">
        <section className="android-card p-4 flex flex-col justify-between min-h-[100px] glass-accent">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <Activity size={14} className="text-android-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-android-text-muted">Status</span>
          </div>
          <div>
            <div className={cn("text-[10px] font-black uppercase tracking-widest mb-1.5", systemLoad.color === 'text-emerald-400' ? 'text-emerald-400' : systemLoad.color === 'text-cyan-primary' ? 'text-android-accent' : systemLoad.color === 'text-amber-400' ? 'text-amber-400' : 'text-red-500')}>
              {systemLoad.label}
            </div>
            <div className="text-2xl font-black text-android-text tracking-tighter leading-none">
              {cleanTime > 0 ? `${cleanHours}h ${cleanMinutes}m` : '0h 0m'}
            </div>
          </div>
        </section>

        <section className="android-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <Wallet size={14} className="text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-android-text-muted">Expense</span>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest mb-1.5 text-android-text-muted">
              Today
            </div>
            <div className="text-2xl font-black text-android-text tracking-tighter leading-none">
              {dailyCost.toLocaleString('cs-CZ')} <span className="text-sm font-bold text-android-text-muted">Kč</span>
            </div>
          </div>
        </section>

        <section className="android-card p-4 flex flex-col col-span-2 min-h-[100px]">
          <div className="flex items-center gap-2 mb-3 opacity-60">
            <TrendingUp size={14} className="text-android-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-android-text-muted">Today's Consumption</span>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
            {dailyStats.map(s => (
              <div key={s.name} className="flex flex-col min-w-fit pr-4 border-r border-android-border last:border-0">
                <span className="text-[9px] font-black text-android-text-muted uppercase mb-1 tracking-wider">{s.name}</span>
                <span className="text-lg font-black text-android-text tabular-nums leading-none">
                  {s.amount}<span className="text-[11px] font-bold text-android-text-muted ml-1 uppercase">{s.unit}</span>
                </span>
              </div>
            ))}
            {dailyStats.length === 0 && (
              <span className="text-xs font-bold text-android-text-muted/50 italic py-2">No activity recorded today</span>
            )}
          </div>
        </section>
      </div>

      {/* Interaction Alerts */}
      {interactions.length > 0 && (
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 rounded-3xl p-4 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/20 rounded-xl">
              <AlertCircle size={18} className="text-red-500" />
            </div>
            <div>
              <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-1">Critical Warning</div>
              <div className="text-xs font-bold text-red-100/80 leading-relaxed">
                <span className="text-white">{interactions[0].type}</span>: {interactions[0].message}
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Kinetic & Effects Chart - Glass Style */}
      <section className="android-card p-5 bg-android-surface/40 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-android-accent/5 blur-[80px] -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex bg-android-bg p-1 rounded-2xl border border-android-border">
            <button 
              onClick={() => setChartType('kinetic')}
              className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300", 
                chartType === 'kinetic' ? "bg-android-accent text-android-bg shadow-[0_5px_15px_rgba(0,242,255,0.3)]" : "text-android-text-muted")}
            >
              Kinetics
            </button>
            <button 
              onClick={() => setChartType('effects')}
              className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300", 
                chartType === 'effects' ? "bg-android-accent text-android-bg shadow-[0_5px_15px_rgba(0,242,255,0.3)]" : "text-android-text-muted")}
            >
              Effects
            </button>
          </div>
          <div className="flex gap-2 items-center px-2">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", chartType === 'kinetic' ? "bg-android-accent shadow-[0_0_10px_rgba(0,242,255,0.5)]" : "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]")} />
            <span className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Real-time</span>
          </div>
        </div>
        
        <div className="h-[280px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
              <defs>
                {chartType === 'kinetic' ? (
                  substances.map(s => (
                    <linearGradient key={s.id} id={`color-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={s.color || '#00f2ff'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={s.color || '#00f2ff'} stopOpacity={0}/>
                    </linearGradient>
                  ))
                ) : (
                  Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || []))).map(type => (
                    <linearGradient key={type} id={`color-effect-${type}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={EFFECT_COLORS[type] || '#fbbf24'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={EFFECT_COLORS[type] || '#fbbf24'} stopOpacity={0}/>
                    </linearGradient>
                  ))
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} hide />
              <YAxis hide domain={[0, maxChartValue]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#121212', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '16px', 
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)', 
                  fontSize: '11px', 
                  color: '#fff',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                itemStyle={{ padding: '4px 0' }}
                labelFormatter={(time) => new Date(time).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
              />
              {chartType === 'kinetic' ? (
                substances.map(s => (
                  <Area key={s.id} type="monotone" dataKey={s.id} stroke={s.color || '#00f2ff'} fillOpacity={1} fill={`url(#color-${s.id})`} strokeWidth={3} connectNulls animationDuration={800} />
                ))
              ) : (
                Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || []))).map(type => (
                  <Area key={type} type="monotone" dataKey={type} stroke={EFFECT_COLORS[type] || '#fbbf24'} fillOpacity={1} fill={`url(#color-effect-${type})`} strokeWidth={3} connectNulls animationDuration={800} />
                ))
              )}
              <ReferenceLine 
                x={now} 
                stroke="#00f2ff" 
                strokeDasharray="6 6" 
                strokeWidth={2} 
                label={{ position: 'top', value: 'NOW', fill: '#00f2ff', fontSize: 10, fontWeight: '900', letterSpacing: '0.1em' }} 
                isFront={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="relative z-[60]">
        <QuickActions 
          shortcuts={shortcuts}
          substances={substances}
          onUseShortcut={onUseShortcut}
          onAddShortcut={onAddShortcut}
          onRemoveShortcut={onRemoveShortcut}
          onUpdateShortcut={onUpdateShortcut}
        />
      </section>

      {/* Active Substance Monitor */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Active Molecules</span>
          <span className="text-[10px] font-black text-android-accent uppercase tracking-wider">{activeSubstanceDetails.length} Detected</span>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {activeSubstanceDetails.map(({ substance, level }) => (
            <button 
              key={substance!.id} 
              onClick={() => setSelectedDetailsId(substance!.id)}
              className="flex-shrink-0 android-card p-4 min-w-[140px] text-left android-button group hover:border-android-accent/30"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-android-text uppercase tracking-widest truncate max-w-[80px]">{substance!.name}</span>
                <span className="text-sm font-black" style={{ color: substance!.color }}>{level.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-android-surface rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${level}%` }} 
                  className="h-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
                  style={{ backgroundColor: substance!.color }} 
                />
              </div>
            </button>
          ))}
          {activeSubstanceDetails.length === 0 && (
            <div className="w-full android-card p-6 text-center text-android-text-muted/50 italic text-sm">
              No active molecules detected
            </div>
          )}
        </div>
      </section>

      {/* Substance Details Modal - Glassmorphism */}
      <AnimatePresence>
        {selectedDetailsId && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-8 sm:items-center sm:pb-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetailsId(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full max-w-md android-card overflow-hidden relative z-10 shadow-2xl glass-primary"
            >
              {(() => {
                const item = activeSubstanceDetails.find(d => d.substance?.id === selectedDetailsId);
                if (!item) return null;
                const { substance, level, tolerance } = item;
                return (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-3xl bg-android-surface flex items-center justify-center border border-android-border">
                          <Activity size={28} style={{ color: substance!.color || '#00f2ff' }} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-android-text">{substance!.name}</h3>
                          <div className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Biometric Analysis</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedDetailsId(null)}
                        className="p-2.5 rounded-full bg-android-bg text-android-text-muted hover:text-android-text transition-all hover:rotate-90 android-button"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-android-surface rounded-3xl p-4 border border-android-border">
                        <div className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] mb-1">Level</div>
                        <div className="text-3xl font-black text-android-accent tracking-tighter">{level.toFixed(1)}%</div>
                      </div>
                      <div className="bg-android-surface rounded-3xl p-4 border border-android-border">
                        <div className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] mb-1">Tolerance</div>
                        <div className="text-3xl font-black text-amber-400 tracking-tighter">{tolerance.toFixed(1)}%</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { icon: Clock, label: 'Half-life', value: `${substance!.halfLife}h` },
                        { icon: Zap, label: 'Onset', value: `${substance!.onset}m` },
                        { icon: Activity, label: 'Duration', value: `${substance!.duration}h` }
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between p-3.5 bg-android-surface rounded-2xl border border-android-border">
                          <div className="flex items-center gap-2.5">
                            <row.icon size={16} className="text-android-text-muted" />
                            <span className="text-sm font-bold text-android-text-muted">{row.label}</span>
                          </div>
                          <span className="text-sm font-black text-android-text">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => setSelectedDetailsId(null)}
                      className="w-full mt-8 py-4 rounded-3xl bg-android-accent text-android-bg text-lg font-black uppercase tracking-wider android-button shadow-lg shadow-android-accent/30"
                    >
                      Close Analysis
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Floating Quick Log Button */}
      <div className="fixed bottom-24 right-5 z-[100] md:hidden">
        <button 
          onClick={() => setIsQuickLogOpen(true)}
          className="w-16 h-16 rounded-3xl bg-android-accent text-android-bg shadow-[0_0_30px_rgba(0,242,255,0.4)] flex items-center justify-center active:scale-95 transition-all border border-android-border"
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      </div>

      {/* Quick Log Modal */}
      <AnimatePresence>
        {isQuickLogOpen && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickLogOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative android-card rounded-t-[2.5rem] rounded-b-none w-full max-w-xl p-6 border-t border-android-border shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-android-text uppercase tracking-tight">Quick Log</h2>
                <button onClick={() => setIsQuickLogOpen(false)} className="p-2.5 rounded-full bg-android-bg text-android-text-muted hover:text-android-text transition-all android-button">
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                {substances.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const newDose: Dose = {
                        id: Date.now().toString(),
                        substanceId: s.id,
                        amount: s.dosage?.common || 1,
                        timestamp: new Date().toISOString(),
                        route: 'oral',
                        note: 'Quick Log',
                        bioavailabilityMultiplier: 1,
                        tmaxMultiplier: 1
                      };
                      onAddDose(newDose);
                      setIsQuickLogOpen(false);
                    }}
                    className="flex items-center gap-3 p-4 rounded-3xl bg-android-surface border border-android-border hover:bg-android-surface-hover transition-all text-left android-button"
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-android-bg border border-android-border">
                      <Zap size={18} style={{ color: s.color }} />
                    </div>
                    <div className="text-sm font-black text-android-text uppercase tracking-tight truncate">{s.name}</div>
                  </button>
                ))}
              </div>
              
              <p className="text-[10px] font-black text-android-text-muted uppercase text-center tracking-[0.2em]">Select a substance to log its default dose instantly</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
