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
  const [detailTab, setDetailTab] = useState<'trends' | 'distribution' | 'history' | 'finance'>('trends');

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
    <div className="space-y-4 relative">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[-10%] w-[35%] h-[35%] bg-purple-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header with Theme Toggle */}
      <div className="flex items-center justify-between px-1 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,209,255,0.3)]">
            <BarChart2 className="text-dark-bg" size={20} strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tighter leading-none mb-1 uppercase">Analýza</h1>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Hloubková Data</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button 
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all active:scale-90"
            >
              {settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          <div className="flex bg-white/5 backdrop-blur-3xl p-1 rounded-xl border border-white/10 shadow-xl">
            {[7, 30, 90].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as Period)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300",
                  period === p 
                    ? "bg-cyan-primary text-black shadow-[0_0_15px_rgba(0,209,255,0.3)]" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {p}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Last Used Horizontal Scroll */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3 px-2">
          <Clock size={12} className="text-slate-500" />
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Naposledy užito</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
          {lastDosesInfo.map((item, i) => (
            <div key={i} className="flex-shrink-0 bg-white/5 backdrop-blur-3xl rounded-2xl p-3 border border-white/10 flex items-center gap-3 min-w-[140px] shadow-lg">
              <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: item.color }} />
              <div>
                <div className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[80px]">{item.name}</div>
                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                  {item.hoursAgo < 1 ? 'Před chvílí' : `Před ${item.hoursAgo.toFixed(0)}h`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3 relative z-10">
        <div className="bg-white/5 backdrop-blur-3xl rounded-[2rem] p-4 border border-white/10 relative overflow-hidden group hover:bg-white/10 transition-all duration-500 shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[50px] rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-1000" />
          <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Útrata</div>
          <div className="text-2xl font-black text-white tracking-tighter">{totalCost.toFixed(0)} <span className="text-[10px] text-slate-500 font-bold uppercase ml-1">Kč</span></div>
        </div>
        <div className="bg-white/5 backdrop-blur-3xl rounded-[2rem] p-4 border border-white/10 relative overflow-hidden group hover:bg-white/10 transition-all duration-500 shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-primary/10 blur-[50px] rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-1000" />
          <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Záznamy</div>
          <div className="text-2xl font-black text-white tracking-tighter">{filteredDoses.length}</div>
        </div>
      </div>

      {/* Compact Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {/* Trend Chart */}
        <section className="bg-white/5 backdrop-blur-3xl rounded-[2rem] p-5 border border-white/10 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={12} className="text-cyan-primary" />
              <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Trend Výdajů</h2>
            </div>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{(totalCost / period).toFixed(0)} Kč/den</span>
          </div>
          <div className="h-32 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d1ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00d1ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.95)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}
                  itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900' }}
                />
                <Area type="monotone" dataKey="cost" stroke="#00d1ff" fillOpacity={1} fill="url(#colorCost)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Activity Heatmap */}
        <section className="bg-white/5 backdrop-blur-3xl rounded-[2rem] p-5 border border-white/10 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={12} className="text-emerald-400" />
            <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Aktivita</h2>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {activityHeatmap.map((day, i) => (
              <div 
                key={i} 
                className="w-3.5 h-3.5 rounded-sm relative group transition-all duration-300 hover:scale-125 cursor-help"
                style={{ 
                  backgroundColor: day.count > 0 ? `rgba(0, 209, 255, ${0.1 + (day.count * 0.2)})` : 'rgba(255, 255, 255, 0.02)',
                  border: day.count > 0 ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.01)'
                }}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Category Breakdown & Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        <section className="bg-white/5 backdrop-blur-3xl rounded-[2rem] p-5 border border-white/10 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={12} className="text-indigo-400" />
            <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Kategorie</h2>
          </div>
          <div className="space-y-2">
            {categoryBreakdown.slice(0, 3).map((cat, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-black text-white uppercase tracking-widest">{cat.name}</span>
                <span className="text-[10px] font-black text-white tracking-tighter">{cat.cost.toFixed(0)} Kč</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/5 backdrop-blur-3xl rounded-[2rem] p-5 border border-white/10 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={12} className="text-cyan-primary" />
            <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Predikce</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {predictionData.map((p, i) => (
              <div key={i} className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[7px] text-slate-500 font-black uppercase mb-1">{p.name}</div>
                <div className="text-[10px] font-black text-white tracking-tighter">{p.value.toFixed(0)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Substance List Header */}
      <div className="flex items-center justify-between px-2 pt-2 relative z-10">
        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Látky</h3>
        <div className="relative group">
          <Search size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Hledat..."
            className="bg-white/5 border border-white/10 rounded-xl py-1.5 pl-8 pr-3 text-[10px] outline-none focus:border-cyan-primary/50 transition-all w-32 text-white font-black uppercase tracking-widest"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-3 relative z-10 pb-20">
        {filteredSubstanceStats.map((s) => (
          <button 
            key={s.id}
            onClick={() => setSelectedSubstanceId(s.id)}
            className="w-full bg-white/5 backdrop-blur-3xl rounded-[1.5rem] p-4 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all duration-300 text-left shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full opacity-40 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: s.color || '#00d1ff' }} />
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.05] group-hover:scale-110 transition-transform relative">
                <Activity size={16} style={{ color: s.color || '#00d1ff' }} className="relative z-10" />
              </div>
              <div>
                <div className="text-sm font-black text-white tracking-tight">{s.name}</div>
                <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{s.count}× záznamů</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-[9px] font-black text-white tracking-tighter">{s.tolerance.toFixed(0)}%</div>
              </div>
              <ChevronRight size={16} className="text-slate-600 group-hover:text-cyan-primary transition-colors" />
            </div>
          </button>
        ))}
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
      <div className="space-y-6 relative pb-20">
        {/* Background Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div 
            className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full animate-pulse opacity-20" 
            style={{ backgroundColor: substance.color }}
          />
          <div className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="flex items-center justify-between relative z-10">
          <button 
            onClick={() => setSelectedSubstanceId(null)}
            className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-cyan-primary transition-all group"
          >
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:bg-cyan-primary/10 transition-colors">
              <ChevronLeft size={14} />
            </div>
            Zpět
          </button>
          {onToggleTheme && (
            <button 
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all active:scale-90"
            >
              {settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
        </div>

        {/* Substance Header Card */}
        <section className="bg-white/5 backdrop-blur-3xl rounded-[2rem] p-6 border border-white/10 relative z-10 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-16 -mt-16 opacity-20" style={{ backgroundColor: substance.color }} />
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl relative group" style={{ backgroundColor: `${substance.color}11` }}>
              <div className="absolute inset-0 blur-xl opacity-50 rounded-full" style={{ backgroundColor: substance.color }} />
              <Activity size={24} style={{ color: substance.color }} className="relative z-10 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter mb-1">{substance.name}</h2>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  {substance.category}
                </span>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  {sDoses.length} záznamů
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex bg-white/5 backdrop-blur-3xl p-1 rounded-2xl border border-white/10 relative z-10 overflow-x-auto no-scrollbar">
          {[
            { id: 'trends', label: 'Trendy', icon: TrendingUp },
            { id: 'distribution', label: 'Dávkování', icon: GitMerge },
            { id: 'finance', label: 'Finance', icon: Wallet },
            { id: 'history', label: 'Historie', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDetailTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
                detailTab === tab.id 
                  ? "bg-white/10 text-white shadow-lg border border-white/10" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <tab.icon size={12} />
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
              className="space-y-4 relative z-10"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 backdrop-blur-3xl rounded-[1.5rem] p-4 border border-white/10">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Tolerance</div>
                  <div className="text-xl font-black text-white tracking-tighter">{tolerance.toFixed(0)}%</div>
                </div>
                <div className="bg-white/5 backdrop-blur-3xl rounded-[1.5rem] p-4 border border-white/10">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Celkem</div>
                  <div className="text-xl font-black text-white tracking-tighter">{totalAmount.toFixed(1)} <span className="text-[10px] text-slate-500">{substance.unit}</span></div>
                </div>
              </div>

              <section className="bg-white/5 backdrop-blur-3xl rounded-[2rem] p-5 border border-white/10 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp size={12} className="text-cyan-primary" />
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Vývoj užívání</h3>
                </div>
                <div className="h-48 w-full -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData.map(d => ({ ...d, amount: sDoses.filter(dose => new Date(dose.timestamp).toLocaleDateString() === d.name).reduce((sum, dose) => sum + dose.amount, 0) }))}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={substance.color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={substance.color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.95)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}
                        itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900' }}
                      />
                      <Area type="monotone" dataKey="amount" stroke={substance.color} fillOpacity={1} fill="url(#colorAmount)" strokeWidth={3} />
                    </AreaChart>
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
              className="space-y-4 relative z-10"
            >
              <section className="bg-white/5 backdrop-blur-3xl rounded-[2rem] p-5 border border-white/10 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <GitMerge size={12} className="text-purple-400" />
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Distribuce dávek</h3>
                </div>
                <div className="h-48 w-full -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dosageDistribution}>
                      <XAxis dataKey="range" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontWeight: 900 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.95)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}
                        itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900' }}
                      />
                      <Bar dataKey="count" fill={substance.color} radius={[4, 4, 0, 0]} />
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
              className="space-y-4 relative z-10"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 backdrop-blur-3xl rounded-[1.5rem] p-4 border border-white/10">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Celková útrata</div>
                  <div className="text-xl font-black text-white tracking-tighter">{cost.toFixed(0)} Kč</div>
                </div>
                <div className="bg-white/5 backdrop-blur-3xl rounded-[1.5rem] p-4 border border-white/10">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Průměr/dávka</div>
                  <div className="text-xl font-black text-white tracking-tighter">{(cost / (sDoses.length || 1)).toFixed(0)} Kč</div>
                </div>
              </div>

              <section className="bg-white/5 backdrop-blur-3xl rounded-[2rem] p-5 border border-white/10 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <Zap size={12} className="text-cyan-primary" />
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Predikce výdajů</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Denně', value: substancePredictions.daily },
                    { label: 'Měsíčně', value: substancePredictions.monthly },
                    { label: 'Ročně', value: substancePredictions.yearly },
                  ].map((p, i) => (
                    <div key={i} className="text-center p-3 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-[7px] text-slate-500 font-black uppercase mb-1">{p.label}</div>
                      <div className="text-xs font-black text-white tracking-tighter">{p.value.toFixed(0)} Kč</div>
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
              className="space-y-4 relative z-10"
            >
              <section className="bg-white/5 backdrop-blur-3xl rounded-[2rem] p-5 border border-white/10 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <History size={12} className="text-slate-400" />
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Poslední záznamy</h3>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                  {sDoses.slice(0, 10).map((dose) => (
                    <div key={dose.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                          <Clock size={16} className="text-slate-500" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-white tracking-tight">
                            {dose.amount} {substance.unit}
                            {dose.strainId && <span className="text-[10px] text-cyan-primary ml-2 font-black uppercase tracking-widest">({dose.strainId})</span>}
                          </div>
                          <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">
                            {new Date(dose.timestamp).toLocaleDateString('cs-CZ')} • {new Date(dose.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          {dose.route}
                        </div>
                        {dose.cost && (
                          <div className="text-[10px] font-black text-emerald-400 tracking-tighter">
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
