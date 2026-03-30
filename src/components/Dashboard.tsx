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
    <div className="space-y-6 pb-4 relative">
      {/* Main Status & History - iOS Style Cards */}
      <div className="grid grid-cols-2 gap-2">
        <section className="ios-card p-3 flex flex-col justify-between min-h-[80px]">
          <div className="flex items-center gap-1.5 mb-1 opacity-70">
            <Activity size={12} className="text-ios-blue" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-ios-gray">Status</span>
          </div>
          <div>
            <div className={cn("text-[9px] font-bold uppercase tracking-wider mb-0.5", systemLoad.color)}>
              {systemLoad.label}
            </div>
            <div className="text-lg font-bold text-white tracking-tight leading-none">
              {cleanTime > 0 ? `${cleanHours}h ${cleanMinutes}m` : '0h 0m'}
            </div>
          </div>
        </section>

        <section className="ios-card p-3 flex flex-col justify-between min-h-[80px]">
          <div className="flex items-center gap-1.5 mb-1 opacity-70">
            <Wallet size={12} className="text-ios-green" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-ios-gray">Dnes</span>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5 text-ios-gray">
              Utraceno
            </div>
            <div className="text-lg font-bold text-white tracking-tight leading-none">
              {dailyCost.toLocaleString('cs-CZ')} Kč
            </div>
          </div>
        </section>

        <section className="ios-card p-3 flex flex-col min-h-[80px]">
          <div className="flex items-center gap-1.5 mb-2 opacity-70">
            <TrendingUp size={12} className="text-ios-blue" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-ios-gray">Dnešní spotřeba</span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {dailyStats.map(s => (
              <div key={s.name} className="flex flex-col min-w-fit">
                <span className="text-[8px] font-bold text-ios-gray uppercase mb-0.5">{s.name}</span>
                <span className="text-sm font-bold text-white tabular-nums leading-none">
                  {s.amount}<span className="text-[9px] text-ios-gray ml-0.5">{s.unit}</span>
                </span>
              </div>
            ))}
            {dailyStats.length === 0 && (
              <span className="text-[10px] font-medium text-ios-gray italic">Nic</span>
            )}
          </div>
        </section>

        <section className="ios-card p-3 flex flex-col min-h-[80px]">
          <div className="flex items-center gap-1.5 mb-2 opacity-70">
            <Clock size={12} className="text-ios-purple" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-ios-gray">Historie</span>
          </div>
          <div className="space-y-1.5 max-h-[40px] overflow-hidden">
            {allSubstancesLastUsed.slice(0, 2).map(s => (
              <div key={s.id} className="flex justify-between items-center leading-none">
                <span className="text-[10px] font-bold uppercase truncate max-w-[60px]" style={{ color: s.color }}>{s.name}</span>
                <span className="text-[10px] font-bold text-ios-gray tabular-nums">
                  {s.lastUsedHours! < 1 ? 'TEĎ' : `-${Math.round(s.lastUsedHours!)}h`}
                </span>
              </div>
            ))}
            {allSubstancesLastUsed.length === 0 && (
              <div className="text-[10px] font-medium text-ios-gray italic">Žádná data</div>
            )}
          </div>
        </section>
      </div>

      {/* Interaction Alerts */}
      {interactions.length > 0 && (
        <section className="bg-ios-red/10 rounded-2xl p-3 border border-ios-red/20">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="text-ios-red shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-bold text-ios-red uppercase tracking-wider mb-0.5">Varování: Interakce</div>
              <div className="text-xs text-red-200/80 leading-snug">
                {interactions[0].type}: {interactions[0].message}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Kinetic & Effects Chart */}
      <section className="ios-card p-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex bg-ios-secondary p-1 rounded-xl">
            <button 
              onClick={() => setChartType('kinetic')}
              className={cn("px-3 py-1 rounded-lg text-[10px] font-bold transition-all", chartType === 'kinetic' ? "bg-ios-blue text-white shadow-lg" : "text-ios-gray")}
            >
              Kinetika
            </button>
            <button 
              onClick={() => setChartType('effects')}
              className={cn("px-3 py-1 rounded-lg text-[10px] font-bold transition-all", chartType === 'effects' ? "bg-ios-orange text-white shadow-lg" : "text-ios-gray")}
            >
              Účinky
            </button>
          </div>
          <div className="flex gap-1.5 items-center px-2">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", chartType === 'kinetic' ? "bg-ios-blue" : "bg-ios-orange")} />
            <span className="text-[9px] font-bold text-ios-gray uppercase tracking-widest">Live</span>
          </div>
        </div>
        
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
              <defs>
                {chartType === 'kinetic' ? (
                  substances.map(s => (
                    <linearGradient key={s.id} id={`color-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={s.color || '#0a84ff'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={s.color || '#0a84ff'} stopOpacity={0}/>
                    </linearGradient>
                  ))
                ) : (
                  Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || []))).map(type => (
                    <linearGradient key={type} id={`color-effect-${type}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={EFFECT_COLORS[type] || '#ff9f0a'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={EFFECT_COLORS[type] || '#ff9f0a'} stopOpacity={0}/>
                    </linearGradient>
                  ))
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide domain={[0, maxChartValue]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1c1c1e', border: 'none', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontSize: '12px' }}
                itemStyle={{ padding: '2px 0' }}
                labelFormatter={(time) => new Date(time).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
              />
              {chartType === 'kinetic' ? (
                substances.map(s => (
                  <Area key={s.id} type="monotone" dataKey={s.id} stroke={s.color || '#0a84ff'} fillOpacity={1} fill={`url(#color-${s.id})`} strokeWidth={2} connectNulls animationDuration={500} />
                ))
              ) : (
                Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || []))).map(type => (
                  <Area key={type} type="monotone" dataKey={type} stroke={EFFECT_COLORS[type] || '#ff9f0a'} fillOpacity={1} fill={`url(#color-effect-${type})`} strokeWidth={2} connectNulls animationDuration={500} />
                ))
              )}
              <ReferenceLine 
                x={now} 
                stroke="#ff453a" 
                strokeDasharray="4 4" 
                strokeWidth={2} 
                label={{ position: 'top', value: 'TEĎ', fill: '#ff453a', fontSize: 10, fontWeight: 'bold' }} 
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
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold text-ios-gray uppercase tracking-widest">Aktivní látky</span>
          <span className="text-[10px] font-medium text-ios-blue">{activeSubstanceDetails.length} aktivní</span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {activeSubstanceDetails.map(({ substance, level }) => (
            <button 
              key={substance!.id} 
              onClick={() => setSelectedDetailsId(substance!.id)}
              className="flex-shrink-0 ios-card p-2.5 min-w-[110px] text-left ios-button"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white uppercase truncate max-w-[60px]">{substance!.name}</span>
                <span className="text-[11px] font-bold" style={{ color: substance!.color }}>{level.toFixed(0)}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${level}%` }} className="h-full" style={{ backgroundColor: substance!.color }} />
              </div>
            </button>
          ))}
          {activeSubstanceDetails.length === 0 && (
            <div className="w-full ios-card p-4 text-center text-ios-gray italic text-xs">
              Žádné aktivní látky v systému
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full max-w-md ios-card overflow-hidden relative z-10 shadow-2xl"
            >
              {(() => {
                const item = activeSubstanceDetails.find(d => d.substance?.id === selectedDetailsId);
                if (!item) return null;
                const { substance, level, tolerance } = item;
                return (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                          <Activity size={24} style={{ color: substance!.color || '#00d1ff' }} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{substance!.name}</h3>
                          <div className="text-[10px] text-ios-gray font-bold uppercase tracking-widest">Biometrická Analýza</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedDetailsId(null)}
                        className="p-2 rounded-full bg-ios-secondary text-ios-gray hover:text-white transition-all hover:rotate-90 ios-button"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="text-[10px] font-bold text-ios-gray uppercase tracking-widest mb-1">Hladina</div>
                        <div className="text-xl font-bold text-ios-blue">{level.toFixed(2)}%</div>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="text-[10px] font-bold text-ios-gray uppercase tracking-widest mb-1">Tolerance</div>
                        <div className="text-xl font-bold text-ios-orange">{tolerance.toFixed(2)}%</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        { icon: Clock, label: 'Poločas rozpadu', value: `${substance!.halfLife}h` },
                        { icon: Zap, label: 'Nástup účinku', value: `${substance!.onset}m` },
                        { icon: Activity, label: 'Doba trvání', value: `${substance!.duration}h` }
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex items-center gap-2">
                            <row.icon size={14} className="text-ios-gray" />
                            <span className="text-xs font-bold text-ios-gray">{row.label}</span>
                          </div>
                          <span className="text-xs font-bold text-white">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => setSelectedDetailsId(null)}
                      className="w-full mt-6 py-4 rounded-2xl bg-ios-blue text-white text-sm font-bold uppercase tracking-wider ios-button"
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
      <div className="fixed bottom-20 right-4 z-[100] md:hidden">
        <button 
          onClick={() => setIsQuickLogOpen(true)}
          className="w-14 h-14 rounded-2xl bg-cyan-primary text-black shadow-[0_0_25px_rgba(0,209,255,0.4)] flex items-center justify-center active:scale-90 transition-all border border-white/20"
        >
          <Plus size={28} strokeWidth={3} />
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative ios-card rounded-t-[2.5rem] rounded-b-none w-full max-w-xl p-6 border-t border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Rychlý Záznam</h2>
                <button onClick={() => setIsQuickLogOpen(false)} className="p-2 rounded-full bg-ios-secondary text-ios-gray hover:text-white transition-all ios-button">
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
                        timestamp: new Date().toISOString(),
                        route: 'oral',
                        note: 'Quick Log',
                        bioavailabilityMultiplier: 1,
                        tmaxMultiplier: 1
                      };
                      onAddDose(newDose);
                      setIsQuickLogOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left ios-button"
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/10">
                      <Zap size={14} style={{ color: s.color }} />
                    </div>
                    <div className="text-xs font-bold text-white uppercase tracking-tight truncate">{s.name}</div>
                  </button>
                ))}
              </div>
              
              <p className="text-[10px] text-ios-gray font-bold uppercase text-center tracking-widest">Vyberte látku pro okamžitý záznam výchozí dávky</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
