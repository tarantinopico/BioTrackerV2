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
  X
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
}

type Period = 7 | 30 | 90 | 365;

export default function Analytics({ substances, doses, settings }: AnalyticsProps) {
  const [selectedSubstanceId, setSelectedSubstanceId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(30);
  const [searchQuery, setSearchQuery] = useState('');

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

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex bg-slate-900/50 p-0.5 rounded-xl border border-border-muted overflow-x-auto no-scrollbar">
        {[7, 30, 90, 365].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p as Period)}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              period === p ? "bg-cyan-primary text-dark-bg shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            {p === 365 ? 'Rok' : `${p} Dní`}
          </button>
        ))}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card-bg rounded-2xl p-4 border border-border-muted relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-2xl rounded-full -mr-10 -mt-10" />
          <div className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Celková útrata</div>
          <div className="text-xl font-black text-white">{totalCost.toFixed(0)} <span className="text-[10px] text-slate-500">Kč</span></div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp size={8} className="text-emerald-400" />
            <span className="text-[7px] font-bold text-emerald-400 uppercase">V limitu</span>
          </div>
        </div>
        <div className="bg-card-bg rounded-2xl p-4 border border-border-muted relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-primary/5 blur-2xl rounded-full -mr-10 -mt-10" />
          <div className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Počet záznamů</div>
          <div className="text-xl font-black text-white">{filteredDoses.length}</div>
          <div className="flex items-center gap-1 mt-1">
            <Activity size={8} className="text-cyan-primary" />
            <span className="text-[7px] font-bold text-cyan-primary uppercase">Aktivní profil</span>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <section className="bg-card-bg rounded-2xl p-4 border border-border-muted">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <TrendingUp size={10} className="text-cyan-primary" /> Trend Výdajů
          </h2>
          <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Průměr: {(totalCost / period).toFixed(0)} Kč/den</span>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="name" stroke="#475569" fontSize={7} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontWeight: 800 }} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(14, 18, 23, 0.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '9px' }}
              />
              <Area type="monotone" dataKey="cost" stroke="#00d1ff" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Category Breakdown */}
      <section className="bg-card-bg rounded-2xl p-4 border border-border-muted">
        <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <Layers size={10} className="text-indigo-400" /> Podle kategorií
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categoryBreakdown.map((cat, i) => (
            <div key={i} className="bg-slate-900/50 p-3 rounded-xl border border-border-muted/50 flex justify-between items-center">
              <div>
                <div className="text-[9px] font-black text-white uppercase tracking-widest">{cat.name}</div>
                <div className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">{cat.count}× záznamů</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-cyan-primary">{cat.cost.toFixed(0)} Kč</div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-card-bg rounded-2xl p-4 border border-border-muted">
          <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <PieChartIcon size={10} className="text-purple-400" /> Podle látek
          </h2>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costBySubstance}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {costBySubstance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(14, 18, 23, 0.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '9px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1">
            {costBySubstance.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-400">{item.name}</span>
                </div>
                <span className="text-white">{item.value.toFixed(0)} Kč</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card-bg rounded-2xl p-4 border border-border-muted">
          <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Clock size={10} className="text-amber-400" /> Časová aktivita
          </h2>
          <div className="h-32 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usageByTimeOfDay}>
                <XAxis dataKey="hour" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(14, 18, 23, 0.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '9px' }}
                />
                <Bar dataKey="count" fill="#fbbf24" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest text-center mt-2">
            Špička: {usageByTimeOfDay.sort((a, b) => b.count - a.count)[0].hour}
          </p>
        </section>
      </div>

      {/* Substance List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Detailní Analýza Látek</h3>
          <div className="relative">
            <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Hledat..."
              className="bg-slate-900/50 border border-border-muted rounded-full py-1 pl-7 pr-3 text-[9px] outline-none focus:border-cyan-primary/50 transition-all w-28"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          {filteredSubstanceStats.map((s) => (
            <button 
              key={s.id}
              onClick={() => setSelectedSubstanceId(s.id)}
              className="w-full bg-card-bg rounded-2xl p-4 border border-border-muted flex items-center justify-between group hover:bg-white/[0.02] transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.05] group-hover:scale-105 transition-transform">
                  <Activity size={16} style={{ color: s.color || '#00d1ff' }} />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-100">{s.name}</div>
                  <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    {s.count} záznamů • {s.cost.toFixed(0)} Kč
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[9px] font-black text-white mb-0.5">{s.tolerance.toFixed(1)}%</div>
                  <div className="w-12 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-primary" style={{ width: `${s.tolerance}%`, backgroundColor: s.color }} />
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-700 group-hover:text-cyan-primary transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  const renderSubstanceDetail = (substanceId: string) => {
    const substance = selectedSubstance;
    if (!substance) return null;

    const sDoses = selectedSubstanceDoses;
    const totalAmount = sDoses.reduce((sum, d) => sum + d.amount, 0);
    const cost = calculateCost(sDoses);
    const tolerance = calculateTolerance(substanceId, substances, doses);
    
    return (
      <div className="space-y-4">
        <button 
          onClick={() => setSelectedSubstanceId(null)}
          className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-cyan-primary transition-colors mb-1"
        >
          <ChevronLeft size={12} /> Zpět na přehled
        </button>

        <div className="bg-card-bg rounded-2xl p-4 border border-border-muted relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 blur-3xl rounded-full -mr-12 -mt-12 opacity-20" style={{ backgroundColor: substance.color }} />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <Activity size={24} style={{ color: substance.color || '#00d1ff' }} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{substance.name}</h2>
              <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">{substance.category}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-900/50 rounded-xl p-3 border border-border-muted/50">
              <div className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Celkem užito</div>
              <div className="text-lg font-black text-white">{totalAmount.toFixed(1)} <span className="text-[10px] text-slate-500">{substance.unit}</span></div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 border border-border-muted/50">
              <div className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Tolerance</div>
              <div className="text-lg font-black text-amber-400">{tolerance.toFixed(1)}%</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 border border-border-muted/50">
              <div className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Náklady</div>
              <div className="text-lg font-black text-white">{cost.toFixed(0)} <span className="text-[10px] text-slate-500">Kč</span></div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 border border-border-muted/50">
              <div className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Prům. dávka</div>
              <div className="text-lg font-black text-cyan-primary">{(totalAmount / (sDoses.length || 1)).toFixed(1)} <span className="text-[10px] text-slate-500">{substance.unit}</span></div>
            </div>
          </div>
        </div>

        {/* Usage & Tolerance Trend Chart */}
        <section className="bg-card-bg rounded-2xl p-4 border border-border-muted">
          <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <LineChartIcon size={10} className="text-cyan-primary" /> Trend Užívání a Tolerance
          </h2>
          <div className="h-48 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={substance.color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={substance.color} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTolerance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={7} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" hide />
                <YAxis yAxisId="right" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(14, 18, 23, 0.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '9px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '7px', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.1em', paddingTop: '15px' }} />
                <Area yAxisId="left" type="monotone" name={`Množství (${substance.unit})`} dataKey="amount" stroke={substance.color} fillOpacity={1} fill="url(#colorAmount)" strokeWidth={2} />
                <Area yAxisId="right" type="monotone" name="Tolerance (%)" dataKey="tolerance" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTolerance)" strokeWidth={1.5} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Strain Breakdown */}
        {strainUsage.length > 0 && (
          <section className="bg-card-bg rounded-2xl p-4 border border-border-muted">
            <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Layers size={10} className="text-purple-400" /> Rozdělení podle druhů
            </h2>
            <div className="space-y-3">
              {strainUsage.map((strain, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-300">{strain.name}</span>
                    <span className="text-white">{strain.amount.toFixed(1)} {substance.unit}</span>
                  </div>
                  <div className="h-1 bg-white/[0.02] rounded-full overflow-hidden border border-white/[0.05]">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${(strain.amount / totalAmount) * 100}%`, 
                        backgroundColor: substance.color 
                      }} 
                    />
                  </div>
                  <div className="flex justify-between text-[7px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>{strain.count}× záznamů</span>
                    <span>{strain.cost.toFixed(0)} Kč</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* History for this substance */}
        <section className="space-y-3">
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Poslední záznamy</h3>
          <div className="space-y-2">
            {sDoses.slice(0, 5).map(dose => (
              <div key={dose.id} className="bg-card-bg rounded-xl p-3 border border-border-muted flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    {dose.amount} {substance.unit}
                    {dose.strainId && <span className="text-[9px] text-slate-500 ml-1.5">({dose.strainId})</span>}
                  </div>
                  <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    {new Date(dose.timestamp).toLocaleDateString('cs-CZ')} • {new Date(dose.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                  {dose.route}
                </div>
              </div>
            ))}
          </div>
        </section>
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
