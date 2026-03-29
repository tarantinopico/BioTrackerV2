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
  ShieldAlert
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
  onRemoveShortcut
}: DashboardProps) {
  const now = currentTime.getTime();
  const [selectedDetailsId, setSelectedDetailsId] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'kinetic' | 'effects'>('kinetic');
  
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
    const points = 60;
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

  const systemLoad = useMemo(() => {
    const totalLoad = activeSubstanceDetails.reduce((sum, item) => sum + item.level, 0);
    if (totalLoad === 0) return { label: 'SYSTÉM ČISTÝ', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: ShieldCheck };
    if (totalLoad < 50) return { label: 'LEHKÁ ZÁTĚŽ', color: 'text-cyan-primary', bg: 'bg-cyan-500/10', icon: Activity };
    if (totalLoad < 100) return { label: 'STŘEDNÍ ZÁTĚŽ', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Zap };
    return { label: 'VYSOKÁ ZÁTĚŽ!', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle, pulse: true };
  }, [activeSubstanceDetails]);

  return (
    <div className="space-y-4 pb-16 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[-10%] w-[35%] h-[35%] bg-purple-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[10%] w-[25%] h-[25%] bg-amber-500/5 blur-[80px] rounded-full animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Main Status & Last Used - Side by Side */}
      <div className="grid grid-cols-2 gap-3 relative z-10">
        <section className="bg-slate-950/40 backdrop-blur-xl rounded-[2rem] p-4 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden group transition-all hover:border-white/20">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 blur-2xl rounded-full -mr-8 -mt-8 group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex items-center gap-2 mb-3 opacity-50">
            <Activity size={10} className="text-cyan-primary animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">Status</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className={cn("text-[11px] font-black tracking-widest uppercase leading-none mb-1", systemLoad.color)}>
                {systemLoad.label}
              </div>
              <div className="text-lg font-black text-white cyan-text-glow leading-none">
                {cleanTime > 0 ? `${cleanHours}h ${cleanMinutes}m` : '0h 0m'}
              </div>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, activeSubstanceDetails.reduce((acc, s) => acc + s.level, 0))}%` }}
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              />
            </div>
          </div>
        </section>

        <section className="bg-slate-950/40 backdrop-blur-xl rounded-[2rem] p-4 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden group transition-all hover:border-white/20">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 blur-2xl rounded-full -mr-8 -mt-8 group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center gap-2 mb-3 opacity-50">
            <Clock size={10} className="text-purple-400" />
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">Historie</span>
          </div>
          <div className="space-y-2 max-h-[56px] overflow-y-auto scrollbar-hide">
            {allSubstancesLastUsed.slice(0, 3).map(s => (
              <div key={s.id} className="flex justify-between items-center leading-none">
                <span className="text-[9px] font-black uppercase truncate max-w-[60px] tracking-wider" style={{ color: s.color }}>{s.name}</span>
                <span className="text-[9px] font-black text-slate-400 tabular-nums">
                  {s.lastUsedHours! < 1 ? 'TEĎ' : `-${Math.round(s.lastUsedHours!)}h`}
                </span>
              </div>
            ))}
            {allSubstancesLastUsed.length === 0 && (
              <div className="text-[8px] font-bold text-slate-600 italic uppercase tracking-widest">Žádná data</div>
            )}
          </div>
        </section>
      </div>

      {/* Active Substances - More Compact */}
      {activeSubstanceDetails.length > 0 && (
        <section className="bg-slate-950/40 backdrop-blur-md rounded-2xl p-3 border border-white/5 relative z-10">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {activeSubstanceDetails.map(({ substance, level, tolerance }) => (
              <div 
                key={substance!.id} 
                className="space-y-1 cursor-pointer group"
                onClick={() => setSelectedDetailsId(substance!.id)}
              >
                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest">
                  <span className="text-slate-300 truncate max-w-[60px]">{substance!.name}</span>
                  <span style={{ color: substance!.color }}>{level.toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-white/[0.02] rounded-full overflow-hidden border border-white/[0.05]">
                  <motion.div 
                    animate={{ width: `${level}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: substance!.color || '#00d1ff' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Effects - More Compact */}
      <section className="bg-slate-950/40 backdrop-blur-xl rounded-[2rem] p-4 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative z-10 overflow-hidden group">
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 blur-3xl rounded-full -ml-12 -mb-12 group-hover:bg-amber-500/10 transition-all" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Sparkles size={10} className="text-amber-400 animate-pulse" /> Účinky
          </h2>
          <span className="text-[8px] font-black text-amber-400/60 uppercase tracking-[0.3em]">
            {activeEffects.length} AKTIVNÍ
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {activeEffects.slice(0, 4).map((effect) => {
            const Icon = EFFECT_ICONS[effect.type] || Activity;
            const color = EFFECT_COLORS[effect.type] || '#94a3b8';
            return (
              <div key={effect.type} className="flex items-center gap-3 bg-white/[0.03] rounded-2xl p-2.5 border border-white/5 transition-all hover:bg-white/[0.06] hover:border-white/10 group/item">
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover/item:scale-110",
                  effect.valence === 'positive' ? "bg-emerald-500/10 text-emerald-400 shadow-emerald-500/5" : 
                  effect.valence === 'negative' ? "bg-red-500/10 text-red-400 shadow-red-500/5" : "bg-slate-500/10 text-slate-400 shadow-slate-500/5"
                )}>
                  <Icon size={14} style={{ filter: `drop-shadow(0 0 5px ${color}44)` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-slate-200 uppercase truncate leading-none tracking-wider">{effect.type}</span>
                    <span className="text-[9px] font-black text-white leading-none tabular-nums">{Math.round(effect.intensity)}%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/[0.02]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${effect.intensity}%` }}
                      className={cn(
                        "h-full rounded-full",
                        effect.valence === 'positive' ? "bg-emerald-500" : 
                        effect.valence === 'negative' ? "bg-red-500" : "bg-slate-500"
                      )}
                      style={{ boxShadow: `0 0 8px ${color}66` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {activeEffects.length === 0 && (
            <div className="col-span-2 py-4 text-center text-[9px] font-black text-slate-700 italic uppercase tracking-[0.3em] bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
              Žádné aktivní účinky
            </div>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <div className="relative z-10">
        <QuickActions 
          shortcuts={shortcuts}
          substances={substances}
          onUseShortcut={onUseShortcut}
          onAddShortcut={onAddShortcut}
          onRemoveShortcut={onRemoveShortcut}
        />
      </div>

      {/* Kinetic & Effects Chart */}
      <section className="bg-slate-950/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 shadow-xl relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex bg-white/[0.02] p-0.5 rounded-xl border border-white/[0.05]">
            <button 
              onClick={() => setChartType('kinetic')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                chartType === 'kinetic' ? "bg-cyan-primary text-dark-bg shadow-lg" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Kinetika
            </button>
            <button 
              onClick={() => setChartType('effects')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                chartType === 'effects' ? "bg-amber-400 text-dark-bg shadow-lg" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Účinky
            </button>
          </div>
          <div className="flex gap-1.5 items-center">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", chartType === 'kinetic' ? "bg-cyan-primary" : "bg-amber-400")} />
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Live Analysis</span>
          </div>
        </div>
        
        <div className="h-[160px] w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                {chartType === 'kinetic' ? (
                  substances.map(s => (
                    <linearGradient key={s.id} id={`color-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={s.color || '#00d1ff'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={s.color || '#00d1ff'} stopOpacity={0}/>
                    </linearGradient>
                  ))
                ) : (
                  Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || []))).map(type => (
                    <linearGradient key={type} id={`color-effect-${type}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={EFFECT_COLORS[type] || '#f59e0b'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={EFFECT_COLORS[type] || '#f59e0b'} stopOpacity={0}/>
                    </linearGradient>
                  ))
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis 
                dataKey="timeStr" 
                stroke="#475569" 
                fontSize={7} 
                tickLine={false} 
                axisLine={false}
                interval={15}
                tick={{ fill: '#475569', fontWeight: 800 }}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(14, 18, 23, 0.8)', 
                  backdropFilter: 'blur(12px)',
                  borderColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  fontSize: '9px',
                  color: '#fff',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
                itemStyle={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '8px' }}
              />
              {chartType === 'kinetic' ? (
                substances.map(s => (
                  <Area
                    key={s.id}
                    type="monotone"
                    dataKey={s.id}
                    stroke={s.color || '#00d1ff'}
                    fillOpacity={1}
                    fill={`url(#color-${s.id})`}
                    strokeWidth={2}
                    connectNulls
                    animationDuration={1000}
                  />
                ))
              ) : (
                Array.from(new Set(substances.flatMap(s => s.effects?.map(e => e.type) || []))).map(type => (
                  <Area
                    key={type}
                    type="monotone"
                    dataKey={type}
                    stroke={EFFECT_COLORS[type] || '#f59e0b'}
                    fillOpacity={1}
                    fill={`url(#color-effect-${type})`}
                    strokeWidth={2}
                    connectNulls
                    animationDuration={1000}
                  />
                ))
              )}
              <ReferenceLine x={chartData[30]?.timeStr} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex justify-between mt-4 px-4">
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Minulost</span>
            <span className="text-[7px] font-bold text-slate-700">-{settings.chartWindow/2}h</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-white uppercase tracking-widest">Nyní</span>
            <div className="w-1 h-1 rounded-full bg-white mt-0.5" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Predikce</span>
            <span className="text-[7px] font-bold text-slate-700">+{settings.chartWindow/2}h</span>
          </div>
        </div>
      </section>

      {/* Active Doses List - Glassmorphism */}
      <section className="space-y-3 relative z-10">
        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Log Aktivních Dávek</h3>
        {activeDoses.length > 0 ? (
          activeDoses.map(dose => {
            const substance = substances.find(s => s.id === dose.substanceId);
            if (!substance) return null;
            const level = calculateSubstanceLevelAtTime(substance.id, now, substances, doses, settings);
            return (
              <div key={dose.id} className="bg-slate-950/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.05] group-hover:scale-105 transition-transform">
                    <Activity size={16} style={{ color: substance.color || '#00d1ff' }} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-100">{substance.name}</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                      {dose.amount.toFixed(1)}{substance.unit} • {new Date(dose.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-white mb-1">{level.toFixed(1)}%</div>
                  <div className="w-16 h-1 bg-white/[0.02] rounded-full overflow-hidden border border-white/[0.05]">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${level}%`, backgroundColor: substance.color || '#00d1ff' }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center bg-white/[0.01] rounded-2xl border border-white/5 border-dashed">
            <span className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.3em]">Žádná aktivní data</span>
          </div>
        )}
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
              className="w-full max-w-md bg-[#0e1217]/90 backdrop-blur-3xl border border-white/10 rounded-[40px] overflow-hidden relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
              {(() => {
                const item = activeSubstanceDetails.find(d => d.substance?.id === selectedDetailsId);
                if (!item) return null;
                const { substance, level, tolerance } = item;
                return (
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                          <Activity size={28} style={{ color: substance!.color || '#00d1ff' }} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white">{substance!.name}</h3>
                          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Biometrická Analýza</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedDetailsId(null)}
                        className="p-3 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all hover:rotate-90"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/5 rounded-3xl p-5 border border-white/5">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Hladina</div>
                        <div className="text-2xl font-black text-cyan-primary">{level.toFixed(2)}%</div>
                      </div>
                      <div className="bg-white/5 rounded-3xl p-5 border border-white/5">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Tolerance</div>
                        <div className="text-2xl font-black text-amber-400">{tolerance.toFixed(2)}%</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { icon: Clock, label: 'Poločas rozpadu', value: `${substance!.halfLife}h` },
                        { icon: Zap, label: 'Nástup účinku', value: `${substance!.onset}m` },
                        { icon: Activity, label: 'Doba trvání', value: `${substance!.duration}h` }
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                          <div className="flex items-center gap-3">
                            <row.icon size={16} className="text-slate-500" />
                            <span className="text-xs font-bold text-slate-400">{row.label}</span>
                          </div>
                          <span className="text-xs font-black text-white">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => setSelectedDetailsId(null)}
                      className="w-full mt-10 py-5 rounded-3xl bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-white hover:bg-white/10 transition-all active:scale-95"
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
    </div>
  );
}
