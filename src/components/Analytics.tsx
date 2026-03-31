import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  LineChart as LineChartIcon, 
  BarChart2, 
  RefreshCw, 
  GitMerge, 
  Calendar,
  TrendingUp,
  Activity,
  PieChart as PieChartIcon,
  ChevronRight,
  ChevronLeft,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Zap,
  DollarSign,
  History,
  Filter,
  Layers,
  Search,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { Substance, Dose, UserSettings, Strain } from '../types';
import { cn } from '../lib/utils';
import { calculateTolerance } from '../services/pharmacology';

interface AnalyticsProps {
  substances: Substance[];
  doses: Dose[];
  settings: UserSettings;
  onToggleTheme?: () => void;
}

type Period = 7 | 30 | 90 | 365;

const calculatePredictions = (doses: Dose[], substances: Substance[], period: number) => {
  const calculateCost = (dosesList: Dose[]) => {
    return dosesList.reduce((sum, d) => {
      const substance = substances.find(s => s.id === d.substanceId);
      if (!substance) return sum;
      const strainPrice = d.strainId ? substance.strains.find(s => s.name === d.strainId)?.price : null;
      const price = strainPrice || substance.price || 0;
      return sum + (d.amount * price);
    }, 0);
  };

  const totalCost = calculateCost(doses);
  const daily = doses.length > 0 ? totalCost / period : 0;
  
  return {
    daily,
    monthly: daily * 30,
    yearly: daily * 365
  };
};

export default function Analytics({ substances, doses, settings, onToggleTheme }: AnalyticsProps) {
  const [selectedSubstanceId, setSelectedSubstanceId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(30);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailTab, setDetailTab] = useState<'trends' | 'time' | 'distribution' | 'history' | 'finance'>('trends');

  const now = Date.now();
  const dayMs = 86400000;
  const periodMs = period * dayMs;
  const startTime = now - periodMs;

  const filteredDoses = useMemo(() => {
    return doses.filter(d => new Date(d.timestamp).getTime() > startTime);
  }, [doses, startTime]);

  const calculateCost = (dosesList: Dose[]) => {
    return dosesList.reduce((sum, d) => {
      const substance = substances.find(s => s.id === d.substanceId);
      if (!substance) return sum;
      const strainPrice = d.strainId ? substance.strains.find(s => s.name === d.strainId)?.price : null;
      const price = strainPrice || substance.price || 0;
      return sum + (d.amount * price);
    }, 0);
  };

  const totalCost = useMemo(() => calculateCost(filteredDoses), [filteredDoses, substances]);
  const allTimeCost = useMemo(() => calculateCost(doses), [doses, substances]);
  
  const costBySubstance = useMemo(() => {
    const data: Record<string, { name: string, value: number, color: string }> = {};
    filteredDoses.forEach(d => {
      const s = substances.find(sub => sub.id === d.substanceId);
      if (!s) return;
      if (!data[s.id]) {
        data[s.id] = { name: s.name, value: 0, color: s.color || '#00d1ff' };
      }
      const strainPrice = d.strainId ? s.strains.find(st => st.name === d.strainId)?.price : null;
      const price = strainPrice || s.price || 0;
      data[s.id].value += d.amount * price;
    });
    return Object.values(data).sort((a, b) => b.value - a.value);
  }, [filteredDoses, substances]);

  const usageByTimeOfDay = useMemo(() => {
    const hours = Array(24).fill(0);
    filteredDoses.forEach(d => {
      const hour = new Date(d.timestamp).getHours();
      hours[hour]++;
    });
    return hours.map((count, hour) => ({
      hour: `${hour}:00`,
      count
    }));
  }, [filteredDoses]);

  const activityHeatmap = useMemo(() => {
    const days = 28; // Last 4 weeks
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * dayMs);
      const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = dayStart + dayMs;
      const count = doses.filter(d => {
        const ts = new Date(d.timestamp).getTime();
        return ts >= dayStart && ts < dayEnd;
      }).length;
      data.push({ date, count });
    }
    return data;
  }, [doses, now, dayMs]);

  const trendData = useMemo(() => {
    const data = [];
    const days = period === 7 ? 7 : period === 30 ? 30 : period === 90 ? 12 : 12;
    const step = period === 7 || period === 30 ? dayMs : period === 90 ? dayMs * 7.5 : dayMs * 30.5;

    for (let i = days - 1; i >= 0; i--) {
      const t = now - (i * step);
      const d = new Date(t);
      const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = dayStart + step;

      const periodDoses = doses.filter(dose => {
        const ts = new Date(dose.timestamp).getTime();
        return ts >= dayStart && ts < dayEnd;
      });

      const cost = calculateCost(periodDoses);
      const count = periodDoses.length;

      data.push({
        name: period <= 30 ? d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' }) : d.toLocaleDateString('cs-CZ', { month: 'short' }),
        cost,
        count
      });
    }
    return data;
  }, [doses, substances, period, now]);

  const substanceStats = useMemo(() => {
    return substances.map(s => {
      const sDoses = filteredDoses.filter(d => d.substanceId === s.id);
      const totalAmount = sDoses.reduce((sum, d) => sum + d.amount, 0);
      const cost = calculateCost(sDoses);
      const tolerance = calculateTolerance(s.id, substances, doses);
      const avgDose = sDoses.length > 0 ? totalAmount / sDoses.length : 0;
      
      return {
        ...s,
        count: sDoses.length,
        totalAmount,
        cost,
        tolerance,
        avgDose
      };
    }).filter(s => s.count > 0 || s.isFavorite).sort((a, b) => b.count - a.count);
  }, [substances, filteredDoses, doses]);

  const spendingStats = useMemo(() => {
    const now = Date.now();
    const periods = [
      { label: '7 dní', days: 7 },
      { label: '30 dní', days: 30 },
      { label: '90 dní', days: 90 }
    ];

    return periods.map(p => {
      const startTime = now - p.days * 86400000;
      const periodDoses = doses.filter(d => new Date(d.timestamp).getTime() >= startTime);
      const total = calculateCost(periodDoses);
      return { ...p, total };
    });
  }, [doses, substances]);

  const predictions = useMemo(() => 
    calculatePredictions(filteredDoses, substances, period),
    [filteredDoses, substances, period]
  );

  const predictionData = useMemo(() => [
    { name: 'Denně', value: predictions.daily },
    { name: 'Měsíčně', value: predictions.monthly },
    { name: 'Ročně', value: predictions.yearly }
  ], [predictions]);

  const filteredSubstanceStats = substanceStats.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryBreakdown = useMemo(() => {
    const data: Record<string, { name: string, count: number, cost: number }> = {};
    filteredDoses.forEach(d => {
      const s = substances.find(sub => sub.id === d.substanceId);
      if (!s) return;
      const cat = s.category || 'other';
      if (!data[cat]) {
        data[cat] = { name: cat, count: 0, cost: 0 };
      }
      data[cat].count++;
      const strainPrice = d.strainId ? s.strains.find(st => st.name === d.strainId)?.price : null;
      const price = strainPrice || s.price || 0;
      data[cat].cost += d.amount * price;
    });
    return Object.values(data).sort((a, b) => b.cost - a.cost);
  }, [filteredDoses, substances]);

  // Hooks for Substance Detail (moved to top level to follow Rules of Hooks)
  const selectedSubstance = useMemo(() => 
    substances.find(s => s.id === selectedSubstanceId),
    [substances, selectedSubstanceId]
  );

  const selectedSubstanceDoses = useMemo(() => 
    filteredDoses.filter(d => d.substanceId === selectedSubstanceId),
    [filteredDoses, selectedSubstanceId]
  );

  const strainUsage = useMemo(() => {
    if (!selectedSubstance || !selectedSubstanceId) return [];
    const data: Record<string, { name: string, count: number, amount: number, cost: number }> = {};
    selectedSubstanceDoses.forEach(d => {
      const strainName = d.strainId || 'Základní';
      if (!data[strainName]) {
        data[strainName] = { name: strainName, count: 0, amount: 0, cost: 0 };
      }
      data[strainName].count++;
      data[strainName].amount += d.amount;
      const strainPrice = d.strainId ? selectedSubstance.strains.find(st => st.name === d.strainId)?.price : null;
      const price = strainPrice || selectedSubstance.price || 0;
      data[strainName].cost += d.amount * price;
    });
    return Object.values(data).sort((a, b) => b.amount - a.amount);
  }, [selectedSubstanceDoses, selectedSubstance, selectedSubstanceId]);

  const dailyTrend = useMemo(() => {
    if (!selectedSubstanceId) return [];
    const data = [];
    const days = period === 7 ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const t = now - i * dayMs;
      const d = new Date(t);
      const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = dayStart + dayMs;
      
      const dayDoses = selectedSubstanceDoses.filter(dose => {
        const ts = new Date(dose.timestamp).getTime();
        return ts >= dayStart && ts < dayEnd;
      });

      const histTolerance = calculateTolerance(selectedSubstanceId, substances, doses, dayEnd);

      data.push({
        name: d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' }),
        amount: dayDoses.reduce((sum, dose) => sum + dose.amount, 0),
        count: dayDoses.length,
        tolerance: histTolerance
      });
    }
    return data;
  }, [selectedSubstanceDoses, period, now, selectedSubstanceId, substances, doses]);

  const substanceRouteStats = useMemo(() => {
    if (!selectedSubstanceId) return [];
    const data: Record<string, number> = {};
    selectedSubstanceDoses.forEach(d => {
      data[d.route] = (data[d.route] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [selectedSubstanceDoses, selectedSubstanceId]);

  const substanceTimeStats = useMemo(() => {
    if (!selectedSubstanceId) return [];
    const hours = Array(24).fill(0);
    selectedSubstanceDoses.forEach(d => {
      const hour = new Date(d.timestamp).getHours();
      hours[hour]++;
    });
    return hours.map((count, hour) => ({ hour: `${hour}h`, count }));
  }, [selectedSubstanceDoses, selectedSubstanceId]);

  const dosageDistribution = useMemo(() => {
    if (!selectedSubstanceId) return [];
    const amounts = selectedSubstanceDoses.map(d => d.amount);
    if (amounts.length === 0) return [];
    
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const range = max - min;
    const bins = 8;
    const binSize = range / bins || 1;
    
    const distribution = Array(bins).fill(0).map((_, i) => ({
      range: `${(min + i * binSize).toFixed(1)}`,
      count: 0
    }));
    
    amounts.forEach(d => {
      const binIndex = Math.min(Math.floor((d - min) / binSize), bins - 1);
      distribution[binIndex].count++;
    });
    
    return distribution;
  }, [selectedSubstanceDoses, selectedSubstanceId]);

  const lastDosesInfo = useMemo(() => {
    const lastDoses: Record<string, { name: string, hoursAgo: number, color: string }> = {};
    substances.forEach(s => {
      const sDoses = doses.filter(d => d.substanceId === s.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (sDoses.length > 0) {
        const lastTs = new Date(sDoses[0].timestamp).getTime();
        const hoursAgo = (now - lastTs) / (1000 * 60 * 60);
        lastDoses[s.id] = { name: s.name, hoursAgo, color: s.color || '#00d1ff' };
      }
    });
    return Object.values(lastDoses).sort((a, b) => a.hoursAgo - b.hoursAgo).slice(0, 5);
  }, [doses, substances, now]);

  const renderOverview = () => (
    <div className="space-y-8 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-2 relative z-10">
        <div>
          <h1 className="text-3xl font-black text-android-text tracking-tighter">Analytics<span className="text-android-accent">.</span></h1>
          <p className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] mt-1">Biometric Intelligence</p>
        </div>
        <div className="flex bg-android-surface p-1 rounded-2xl border border-android-border shadow-inner">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as Period)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 android-button",
                period === p 
                  ? "bg-android-accent text-android-bg shadow-[0_5px_15px_rgba(0,242,255,0.3)]" 
                  : "text-android-text-muted hover:text-android-text"
              )}
            >
              {p}D
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div className="android-card p-6 glass-accent border-white/5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-android-accent/10 border border-android-accent/20 flex items-center justify-center text-android-accent shadow-inner">
              <DollarSign size={18} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Spent ({period}D)</span>
          </div>
          <div className="text-3xl font-black text-android-text tracking-tighter">
            {totalCost.toLocaleString('cs-CZ')} <span className="text-base font-bold text-android-text-muted uppercase ml-1">Kč</span>
          </div>
        </div>
        <div className="android-card p-6 bg-android-surface/40 border-white/5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <Wallet size={18} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Total All-Time</span>
          </div>
          <div className="text-3xl font-black text-android-text tracking-tighter">
            {allTimeCost.toLocaleString('cs-CZ')} <span className="text-base font-bold text-android-text-muted uppercase ml-1">Kč</span>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <section className="android-card p-6 bg-android-surface/40 relative z-10 border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-android-accent/5 blur-[100px] -mr-20 -mt-20 pointer-events-none" />
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-android-accent/10 text-android-accent">
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
            <h2 className="text-xs font-black text-android-text uppercase tracking-[0.2em]">Financial Dynamics</h2>
          </div>
          <div className="text-[10px] font-black text-android-accent bg-android-accent/10 px-3 py-1.5 rounded-full border border-android-accent/20 tracking-wider">
            AVG: {(totalCost / period).toFixed(0)} Kč / DAY
          </div>
        </div>
        <div className="h-56 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#00f2ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: '900' }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: '900' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#121212', 
                  borderRadius: '20px', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  fontSize: '11px',
                  letterSpacing: '0.05em'
                }}
                itemStyle={{ color: '#fff', padding: '4px 0' }}
                labelStyle={{ color: '#9ca3af', marginBottom: '6px' }}
              />
              <Area 
                type="monotone" 
                dataKey="cost" 
                stroke="#00f2ff" 
                fillOpacity={1} 
                fill="url(#colorCost)" 
                strokeWidth={4} 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Activity & Predictions */}
      <div className="grid grid-cols-1 gap-6 relative z-10">
        <section className="android-card p-6 bg-android-surface/40 border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Calendar size={18} strokeWidth={2.5} />
            </div>
            <h2 className="text-xs font-black text-android-text uppercase tracking-[0.2em]">Neural Activity Map</h2>
          </div>
          <div className="flex flex-wrap gap-2.5 justify-center py-4 bg-android-bg/30 rounded-3xl border border-android-border shadow-inner">
            {activityHeatmap.map((day, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.01 }}
                className="w-5 h-5 rounded-md transition-all duration-500 hover:scale-125 cursor-help shadow-sm"
                style={{ 
                  backgroundColor: day.count > 0 ? `rgba(0, 242, 255, ${0.15 + (Math.min(day.count, 5) * 0.15)})` : 'rgba(255, 255, 255, 0.03)',
                  border: day.count > 0 ? '1px solid rgba(0, 242, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)'
                }}
              />
            ))}
          </div>
        </section>

        <section className="android-card p-6 glass-accent border-white/5 overflow-hidden">
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/5 blur-[80px] -ml-16 -mb-16 pointer-events-none" />
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
              <Zap size={18} strokeWidth={2.5} />
            </div>
            <h2 className="text-xs font-black text-android-text uppercase tracking-[0.2em]">Forecast Projection</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {predictionData.map((p, i) => (
              <div key={i} className="text-center p-4 rounded-3xl bg-android-bg border border-android-border shadow-lg">
                <div className="text-[9px] text-android-text-muted font-black uppercase mb-2 tracking-[0.1em]">{p.name}</div>
                <div className="text-base font-black text-android-text tracking-tighter leading-none">{p.value.toFixed(0)} <span className="text-[10px] text-android-text-muted uppercase">Kč</span></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Substance List */}
      <div className="space-y-4 relative z-10 pb-24">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-android-text-muted uppercase tracking-[0.2em]">Substances</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-android-text-muted" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-android-surface border-none rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:ring-1 focus:ring-android-accent/50 transition-all w-40 text-android-text font-black tracking-tight"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {filteredSubstanceStats.map((s) => (
            <button 
              key={s.id}
              onClick={() => setSelectedSubstanceId(s.id)}
              className="w-full android-card p-4 flex items-center justify-between android-button-subtle text-left border-white/5"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-theme-subtle flex items-center justify-center relative" style={{ backgroundColor: s.color || '#ffffff' }}>
                  <div className="absolute inset-0 blur-lg opacity-30 rounded-full" style={{ backgroundColor: s.color }} />
                  <Activity size={20} className="relative z-10" style={{ color: s.color }} />
                </div>
                <div>
                  <div className="text-base font-black text-android-text tracking-tight">{s.name}</div>
                  <div className="text-xs text-android-text-muted font-black">{s.count} entries</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs font-black text-android-text">{s.tolerance.toFixed(0)}%</div>
                  <div className="text-[8px] font-black text-android-text-muted uppercase tracking-[0.2em]">Tolerance</div>
                </div>
                <ChevronRight size={20} className="text-android-text-muted" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSubstanceDetail = (substanceId: string) => {
    const substance = selectedSubstance;
    if (!substance) return null;

    const sDoses = selectedSubstanceDoses;
    const totalAmount = sDoses.reduce((sum, d) => sum + d.amount, 0);
    const cost = calculateCost(sDoses);
    const tolerance = calculateTolerance(substanceId, substances, doses);
    const substancePredictions = calculatePredictions(sDoses, substances, period);
    
    return (
      <div className="space-y-6 relative pb-24">
        {/* Back Button & Header */}
        <div className="flex items-center justify-between relative z-10 px-2">
          <button 
            onClick={() => setSelectedSubstanceId(null)}
            className="flex items-center gap-2 text-android-accent font-black android-button-subtle"
          >
            <ChevronLeft size={24} />
            <span>Back</span>
          </button>
          <div className="w-10 h-10 rounded-2xl bg-theme-subtle flex items-center justify-center" style={{ backgroundColor: substance.color }}>
            <Activity size={20} style={{ color: substance.color }} />
          </div>
        </div>

        {/* Substance Title Card */}
        <div className="px-2">
          <h2 className="text-3xl font-black text-android-text tracking-tighter mb-1">{substance.name}</h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-android-surface text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">
              {substance.category}
            </span>
            <span className="text-xs font-medium text-android-text-muted">
              {sDoses.length} entries in period
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-android-surface p-1 rounded-2xl relative z-10 overflow-x-auto no-scrollbar border border-android-border shadow-inner">
          {[
            { id: 'trends', label: 'Trends', icon: TrendingUp },
            { id: 'time', label: 'Time', icon: Clock },
            { id: 'distribution', label: 'Dosage', icon: GitMerge },
            { id: 'finance', label: 'Finance', icon: Wallet },
            { id: 'history', label: 'History', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDetailTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap",
                detailTab === tab.id 
                  ? "bg-android-accent text-android-bg shadow-[0_5px_15px_rgba(0,242,255,0.3)]" 
                  : "text-android-text-muted hover:text-android-text"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {detailTab === 'trends' && (
            <motion.div
              key="trends"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 relative z-10 px-2"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="android-card p-6 glass-accent border-white/5">
                  <div className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] mb-2">Tolerance</div>
                  <div className="text-2xl font-black text-android-text tracking-tighter">{tolerance.toFixed(0)}%</div>
                </div>
                <div className="android-card p-6 bg-android-surface/40 border-white/5">
                  <div className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] mb-2">Total Amount</div>
                  <div className="text-2xl font-black text-android-text tracking-tighter">
                    {totalAmount.toFixed(1)} <span className="text-sm font-bold text-android-text-muted uppercase ml-1">{substance.unit}</span>
                  </div>
                </div>
              </div>

              <section className="android-card p-6 bg-android-surface/40 border-white/5">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-android-accent/10 text-android-accent">
                    <TrendingUp size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xs font-black text-android-text uppercase tracking-[0.2em]">Daily Amount Trend</h3>
                </div>
                <div className="h-56 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrend}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={substance.color || '#00f2ff'} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={substance.color || '#00f2ff'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: '900' }}
                        dy={15}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: '900' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#121212', 
                          borderRadius: '20px', 
                          border: '1px solid rgba(255, 255, 255, 0.1)', 
                          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                          fontWeight: '900',
                          textTransform: 'uppercase',
                          fontSize: '11px',
                          letterSpacing: '0.05em'
                        }}
                        itemStyle={{ color: '#fff', padding: '4px 0' }}
                        labelStyle={{ color: '#9ca3af', marginBottom: '6px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke={substance.color || '#00f2ff'} 
                        fillOpacity={1} 
                        fill="url(#colorAmount)" 
                        strokeWidth={4} 
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </motion.div>
          )}

          {detailTab === 'time' && (
            <motion.div
              key="time"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 relative z-10 px-2"
            >
              <section className="android-card p-6 bg-android-surface/40 border-white/5">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-android-accent/10 text-android-accent">
                    <Clock size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xs font-black text-android-text uppercase tracking-[0.2em]">Peak Usage Times</h3>
                </div>
                <div className="h-56 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={substanceTimeStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis 
                        dataKey="hour" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: '900' }}
                        dy={15}
                      />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 8 }}
                        contentStyle={{ 
                          backgroundColor: '#121212', 
                          borderRadius: '20px', 
                          border: '1px solid rgba(255, 255, 255, 0.1)', 
                          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                          fontWeight: '900',
                          textTransform: 'uppercase',
                          fontSize: '11px',
                          letterSpacing: '0.05em'
                        }}
                        itemStyle={{ color: '#fff', padding: '4px 0' }}
                        labelStyle={{ color: '#9ca3af', marginBottom: '6px' }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill={substance.color || '#00f2ff'} 
                        radius={[6, 6, 0, 0]} 
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </motion.div>
          )}

          {detailTab === 'distribution' && (
            <motion.div
              key="distribution"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 relative z-10 px-2"
            >
              <section className="android-card p-6 bg-android-surface/40 border-white/5">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-android-purple/10 text-android-purple">
                    <GitMerge size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xs font-black text-android-text uppercase tracking-[0.2em]">Dosage Distribution</h3>
                </div>
                <div className="h-56 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dosageDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis 
                        dataKey="range" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: '900' }}
                        dy={15}
                      />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 8 }}
                        contentStyle={{ 
                          backgroundColor: '#121212', 
                          borderRadius: '20px', 
                          border: '1px solid rgba(255, 255, 255, 0.1)', 
                          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                          fontWeight: '900',
                          textTransform: 'uppercase',
                          fontSize: '11px',
                          letterSpacing: '0.05em'
                        }}
                        itemStyle={{ color: '#fff', padding: '4px 0' }}
                        labelStyle={{ color: '#9ca3af', marginBottom: '6px' }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill={substance.color || '#00f2ff'} 
                        radius={[6, 6, 0, 0]} 
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </motion.div>
          )}

          {detailTab === 'finance' && (
            <motion.div
              key="finance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 relative z-10 px-2"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="android-card p-6 glass-accent border-white/5">
                  <div className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] mb-2">Total Spent</div>
                  <div className="text-2xl font-black text-android-text tracking-tighter">{cost.toFixed(0)} Kč</div>
                </div>
                <div className="android-card p-6 bg-android-surface/40 border-white/5">
                  <div className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] mb-2">Avg per Dose</div>
                  <div className="text-2xl font-black text-android-text tracking-tighter">{(cost / (sDoses.length || 1)).toFixed(0)} Kč</div>
                </div>
              </div>

              <section className="android-card p-6 glass-accent border-white/5 overflow-hidden">
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/5 blur-[80px] -ml-16 -mb-16 pointer-events-none" />
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
                    <Zap size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xs font-black text-android-text uppercase tracking-[0.2em]">Spending Forecast</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Daily', value: substancePredictions.daily },
                    { label: 'Monthly', value: substancePredictions.monthly },
                    { label: 'Yearly', value: substancePredictions.yearly },
                  ].map((p, i) => (
                    <div key={i} className="text-center p-4 rounded-3xl bg-android-bg border border-android-border shadow-lg">
                      <div className="text-[9px] text-android-text-muted font-black uppercase mb-2 tracking-[0.1em]">{p.label}</div>
                      <div className="text-base font-black text-android-text tracking-tighter leading-none">{p.value.toFixed(0)} <span className="text-[10px] text-android-text-muted uppercase">Kč</span></div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {detailTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 relative z-10 px-2"
            >
              <section className="android-card p-6 bg-android-surface/40 border-white/5">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-android-text-muted/10 text-android-text-muted">
                    <History size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xs font-black text-android-text uppercase tracking-[0.2em]">Recent Entries</h3>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                  {sDoses.slice(0, 10).map((dose) => (
                    <div key={dose.id} className="flex items-center justify-between p-4 rounded-2xl bg-android-bg border border-android-border group hover:bg-android-surface-hover transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-android-surface flex items-center justify-center border border-android-border group-hover:scale-110 transition-transform shadow-inner">
                          <Clock size={16} className="text-android-text-muted" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-android-text tracking-tight">
                            {dose.amount} {substance.unit}
                            {dose.strainId && <span className="text-[10px] text-android-accent ml-2 font-black uppercase tracking-[0.2em]">({dose.strainId})</span>}
                          </div>
                          <div className="text-[10px] text-android-text-muted font-black uppercase tracking-[0.2em] mt-0.5">
                            {new Date(dose.timestamp).toLocaleDateString('cs-CZ')} • {new Date(dose.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] mb-1">
                          {dose.route}
                        </div>
                        {dose.cost && (
                          <div className="text-[11px] font-black text-emerald-400 tracking-tight">
                            {dose.cost} Kč
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={selectedSubstanceId || 'overview'}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        {selectedSubstanceId ? renderSubstanceDetail(selectedSubstanceId) : renderOverview()}
      </motion.div>
    </AnimatePresence>
  );
}
