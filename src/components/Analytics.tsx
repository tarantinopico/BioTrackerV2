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
  Moon,
  ShieldAlert
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
import { cn, formatTime } from '../lib/utils';
import { calculateTolerance } from '../services/pharmacology';

import { getIconComponent } from './Substances';

interface AnalyticsProps {
  substances: Substance[];
  doses: Dose[];
  settings: UserSettings;
  onToggleTheme?: () => void;
}

type Period = 7 | 30 | 90 | 365 | 'all';

const CustomTooltip = ({ active, payload, label, type = 'default', currency = 'Kč' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-theme-card/95 backdrop-blur-xl border border-theme-border p-4 rounded-2xl shadow-xl">
        <p className="text-xs font-bold text-md3-gray mb-3 uppercase tracking-wider border-b border-theme-border pb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-6 mb-2 last:mb-0">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color || entry.payload?.fill || '#0a84ff' }} />
              <span className="text-sm font-medium text-theme-text">{entry.name}</span>
            </div>
            <span className="text-sm font-black text-theme-text">
              {type === 'currency' 
                ? `${entry.value.toLocaleString('cs-CZ')} ${currency}` 
                : type === 'amount'
                  ? `${entry.value.toLocaleString('cs-CZ')} ${entry.payload?.unit || ''}`
                  : `${entry.value}x`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const calculateActiveIngredient = (dosesList: Dose[], substance: Substance) => {
  if (!substance.activeIngredientName) return 0;
  return dosesList.reduce((sum, d) => {
    const strain = d.strainId ? substance.strains?.find(s => s.name === d.strainId) : null;
    const activePct = strain?.activeIngredientPercentage ?? substance.activeIngredientPercentage;
    if (!activePct) return sum;
    return sum + ((d.amount * activePct) / 100);
  }, 0);
};

const calculatePredictions = (doses: Dose[], substances: Substance[], period: number) => {
  const calculateCost = (dosesList: Dose[]) => {
    return dosesList.reduce((sum, d) => {
      const substance = substances.find(s => s.id === d.substanceId);
      const strainPrice = substance && d.strainId ? substance.strains?.find(s => s.name === d.strainId)?.price : null;
      const price = strainPrice || (substance ? substance.price : 0) || 0;
      return sum + (d.amount * price);
    }, 0);
  };

  const totalCost = calculateCost(doses);
  const daily = doses.length > 0 ? totalCost / period : 0;
  
  // Calculate active days
  const activeDays = new Set(doses.map(d => new Date(d.timestamp).toISOString().split('T')[0])).size;
  const activeDayAverage = activeDays > 0 ? totalCost / activeDays : 0;

  // Calculate recent trend (last 7 days vs previous 7 days)
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const fourteenDaysAgo = now - 14 * 86400000;
  
  const recentDoses = doses.filter(d => d.timestamp >= sevenDaysAgo);
  const previousDoses = doses.filter(d => d.timestamp >= fourteenDaysAgo && d.timestamp < sevenDaysAgo);
  
  const recentCost = calculateCost(recentDoses);
  const previousCost = calculateCost(previousDoses);
  
  const recentDaily = recentCost / 7;
  const previousDaily = previousCost / 7;
  
  const trendPercentage = previousDaily > 0 ? ((recentDaily - previousDaily) / previousDaily) * 100 : 0;

  const costPerDose = doses.length > 0 ? totalCost / doses.length : 0;

  return {
    daily,
    monthly: daily * 30,
    yearly: daily * 365,
    activeDayAverage,
    recentDaily,
    recentMonthly: recentDaily * 30,
    recentYearly: recentDaily * 365,
    trendPercentage,
    totalCost,
    activeDays,
    costPerDose
  };
};

export default function Analytics({ substances, doses, settings, onToggleTheme }: AnalyticsProps) {
  const [selectedSubstanceId, setSelectedSubstanceId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(30);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailTab, setDetailTab] = useState<'trends' | 'time' | 'distribution' | 'stats' | 'finance' | 'history' | 'strains' | 'day-view'>('trends');
  const [overviewTab, setOverviewTab] = useState<'overview' | 'day-view' | 'finance'>('overview');
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().split('T')[0]);

  // Stabilize 'now' to prevent excessive re-renders. Updates every 5 minutes.
  const roundedNow = Math.floor(Date.now() / 300000) * 300000;
  const now = useMemo(() => roundedNow, [roundedNow]);

  const dayMs = 86400000;
  const periodMs = period === 'all' ? Infinity : period * dayMs;
  const startTime = period === 'all' ? 0 : now - periodMs;

  const filteredDoses = useMemo(() => {
    return doses.filter(d => d.timestamp > startTime);
  }, [doses, startTime]);

  const calculateCost = (dosesList: Dose[]) => {
    return dosesList.reduce((sum, d) => {
      const substance = substances.find(s => s.id === d.substanceId);
      const strainPrice = substance && d.strainId ? substance.strains?.find(s => s.name === d.strainId)?.price : null;
      const price = strainPrice || (substance ? substance.price : 0) || 0;
      return sum + (d.amount * price);
    }, 0);
  };

  const totalCost = useMemo(() => calculateCost(filteredDoses), [filteredDoses, substances]);
  const allTimeCost = useMemo(() => calculateCost(doses), [doses, substances]);
  
  const costBySubstance = useMemo(() => {
    const data: Record<string, { name: string, value: number, color: string }> = {};
    filteredDoses.forEach(d => {
      const s = substances.find(sub => sub.id === d.substanceId) || { id: d.substanceId, name: d.substanceId, color: '#8e8e93', price: 0 } as Substance;
      if (!data[s.id]) {
        data[s.id] = { name: s.name, value: 0, color: s.color || '#00d1ff' };
      }
      const strainPrice = d.strainId ? s.strains?.find(st => st.name === d.strainId)?.price : null;
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
        const ts = d.timestamp;
        return ts >= dayStart && ts < dayEnd;
      }).length;
      data.push({ date, count });
    }
    return data;
  }, [doses, now, dayMs]);

  const stats = useMemo(() => {
    let longestStreak = 0;
    let currentStreak = 0;
    let cleanDays = 0;
    
    // Calculate for the selected period
    for (let i = period - 1; i >= 0; i--) {
      const date = new Date(now - i * dayMs);
      const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = dayStart + dayMs;
      
      const hasDose = doses.some(d => {
        const ts = d.timestamp;
        return ts >= dayStart && ts < dayEnd;
      });

      if (hasDose) {
        currentStreak++;
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else {
        currentStreak = 0;
        cleanDays++;
      }
    }
    return { longestStreak, cleanDays };
  }, [doses, period, now, dayMs]);

  const categoryData = useMemo(() => {
    const data: Record<string, { name: string, value: number, color: string }> = {};
    filteredDoses.forEach(d => {
      const s = substances.find(sub => sub.id === d.substanceId);
      if (!s) return;
      const cat = s.category;
      if (!data[cat]) {
        // Assign some colors based on category
        const colors: Record<string, string> = {
          stimulant: '#FDBA74', // orange
          depressant: '#A8C7FA', // cyan
          psychedelic: '#D0BCFF', // purple
          dissociative: '#81C995', // green
          empathogen: '#F2B8B5', // pink
          other: '#C4C7C5' // gray
        };
        data[cat] = { name: cat.charAt(0).toUpperCase() + cat.slice(1), value: 0, color: colors[cat] || colors.other };
      }
      data[cat].value++;
    });
    return Object.values(data).sort((a, b) => b.value - a.value);
  }, [filteredDoses, substances]);

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
        const ts = dose.timestamp;
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
    const stats = substances.map(s => {
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
    });

    // Add unknown substances
    const knownIds = new Set(substances.map(s => s.id));
    const unknownDoses = filteredDoses.filter(d => !knownIds.has(d.substanceId));
    const unknownIds = new Set<string>(unknownDoses.map(d => d.substanceId));
    
    unknownIds.forEach((id: string) => {
      const sDoses = unknownDoses.filter(d => d.substanceId === id);
      const totalAmount = sDoses.reduce((sum, d) => sum + d.amount, 0);
      stats.push({
        id,
        name: id,
        color: '#8e8e93',
        icon: 'pill',
        unit: '?',
        step: 1,
        price: 0,
        category: 'other',
        description: '',
        halfLife: 1,
        tmax: 1,
        bioavailability: 100,
        onset: 0,
        offset: null,
        toxicity: 1,
        toleranceRate: 0,
        toleranceReset: 1,
        metabolismCurve: 'linear',
        metabolismRate: 1,
        absorptionRate: 1,
        beta: 1,
        ka: 1,
        proteinBinding: 0,
        volumeOfDistribution: 1,
        addictionPotential: 'low',
        legalityStatus: 'legal',
        toleranceHalfLife: null,
        crossTolerance: [],
        comedownEnabled: false,
        comedownDuration: 0,
        comedownIntensity: 0,
        comedownSymptoms: [],
        strains: [],
        effects: [],
        interactions: [],
        interactionMessage: '',
        isSevere: false,
        count: sDoses.length,
        totalAmount,
        cost: 0,
        tolerance: 0,
        avgDose: sDoses.length > 0 ? totalAmount / sDoses.length : 0
      });
    });

    return stats.filter(s => s.count > 0 || (s as any).isFavorite).sort((a, b) => b.count - a.count);
  }, [substances, filteredDoses, doses]);

  const spendingStats = useMemo(() => {
    const periods = [
      { label: '7 dní', days: 7 },
      { label: '30 dní', days: 30 },
      { label: '90 dní', days: 90 }
    ];

    return periods.map(p => {
      const startTime = now - p.days * 86400000;
      const periodDoses = doses.filter(d => d.timestamp >= startTime);
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
    if (!selectedSubstanceId) return [];
    const data: Record<string, { name: string, count: number, amount: number, cost: number }> = {};
    selectedSubstanceDoses.forEach(d => {
      const strainName = d.strainId || 'Základní';
      if (!data[strainName]) {
        data[strainName] = { name: strainName, count: 0, amount: 0, cost: 0 };
      }
      data[strainName].count++;
      data[strainName].amount += d.amount;
      const strainPrice = selectedSubstance && d.strainId ? selectedSubstance.strains?.find(st => st.name === d.strainId)?.price : null;
      const price = strainPrice || (selectedSubstance ? selectedSubstance.price : 0) || 0;
      data[strainName].cost += d.amount * price;
    });
    return Object.values(data).sort((a, b) => b.amount - a.amount);
  }, [selectedSubstanceDoses, selectedSubstance, selectedSubstanceId]);

  const dailyTrend = useMemo(() => {
    if (!selectedSubstanceId) return [];
    const data = [];
    const days = period === 7 ? 7 : 30;
    let cumulativeAmount = 0;
    for (let i = days - 1; i >= 0; i--) {
      const t = now - i * dayMs;
      const d = new Date(t);
      const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = dayStart + dayMs;
      
      const dayDoses = selectedSubstanceDoses.filter(dose => {
        const ts = dose.timestamp;
        return ts >= dayStart && ts < dayEnd;
      });

      const amount = dayDoses.reduce((sum, dose) => sum + dose.amount, 0);
      cumulativeAmount += amount;
      const histTolerance = calculateTolerance(selectedSubstanceId, substances, doses, dayEnd);

      data.push({
        name: d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' }),
        amount,
        cumulativeAmount,
        count: dayDoses.length,
        tolerance: histTolerance
      });
    }
    return data;
  }, [selectedSubstanceDoses, period, now, selectedSubstanceId, substances, doses]);

  const dayOfWeekStats = useMemo(() => {
    if (!selectedSubstanceId) return [];
    const days = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
    selectedSubstanceDoses.forEach(d => {
      days[new Date(d.timestamp).getDay()] += d.amount;
    });
    
    let result = days.map((amount, i) => ({ day: dayNames[i], amount }));
    if (settings.firstDayOfWeek === 1) {
      // Move Sunday to the end
      const sunday = result.shift();
      if (sunday) result.push(sunday);
    }
    return result;
  }, [selectedSubstanceDoses, selectedSubstanceId, settings.firstDayOfWeek]);

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

  const groupedHistory = useMemo(() => {
    if (!selectedSubstanceId) return [];
    const groups: Record<string, typeof selectedSubstanceDoses> = {};
    selectedSubstanceDoses.forEach(dose => {
      const dateStr = new Date(dose.timestamp).toLocaleDateString('cs-CZ');
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(dose);
    });
    return Object.entries(groups)
      .map(([date, doses]) => ({
        date,
        doses: doses.sort((a, b) => b.timestamp - a.timestamp),
        totalAmount: doses.reduce((sum, d) => sum + d.amount, 0)
      }))
      .sort((a, b) => b.doses[0].timestamp - a.doses[0].timestamp);
  }, [selectedSubstanceDoses, selectedSubstanceId]);

  const lastDosesInfo = useMemo(() => {
    const lastDoses: Record<string, { name: string, hoursAgo: number, color: string }> = {};
    substances.forEach(s => {
      const sDoses = doses.filter(d => d.substanceId === s.id).sort((a, b) => b.timestamp - a.timestamp);
      if (sDoses.length > 0) {
        const lastTs = sDoses[0].timestamp;
        const hoursAgo = (now - lastTs) / (1000 * 60 * 60);
        lastDoses[s.id] = { name: s.name, hoursAgo, color: s.color || '#00d1ff' };
      }
    });
    return Object.values(lastDoses).sort((a, b) => a.hoursAgo - b.hoursAgo).slice(0, 5);
  }, [doses, substances, now]);

  const renderOverview = () => (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-2 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-theme-text tracking-tight">Analýza</h1>
          <p className="text-sm font-medium text-md3-gray">Přehled vašich dat</p>
        </div>
        <div className="flex bg-md3-secondary p-1 rounded-xl">
          {[7, 30, 90, 365, 'all'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as Period)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                period === p 
                  ? "bg-theme-subtle-hover text-theme-text shadow-sm" 
                  : "text-md3-gray hover:text-theme-text"
              )}
            >
              {p === 'all' ? 'VŠE' : `${p}D`}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tabs */}
      <div className="flex bg-md3-secondary p-1 rounded-2xl relative z-10">
        <button
          onClick={() => setOverviewTab('overview')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
            overviewTab === 'overview' 
              ? "bg-theme-subtle-hover text-theme-text shadow-sm" 
              : "text-md3-gray hover:text-theme-text"
          )}
        >
          <BarChart2 size={14} />
          Přehled
        </button>
        <button
          onClick={() => setOverviewTab('day-view')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
            overviewTab === 'day-view' 
              ? "bg-theme-subtle-hover text-theme-text shadow-sm" 
              : "text-md3-gray hover:text-theme-text"
          )}
        >
          <Calendar size={14} />
          Denní přehled
        </button>
        <button
          onClick={() => setOverviewTab('finance')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
            overviewTab === 'finance' 
              ? "bg-theme-subtle-hover text-theme-text shadow-sm" 
              : "text-md3-gray hover:text-theme-text"
          )}
        >
          <DollarSign size={14} />
          Finance
        </button>
      </div>

      <AnimatePresence mode="wait">
        {overviewTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 relative z-10"
          >
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="md3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-md3-primary/10 flex items-center justify-center text-md3-primary">
              <DollarSign size={16} />
            </div>
            <span className="text-xs font-bold text-md3-gray uppercase tracking-wider">Útrata ({period}D)</span>
          </div>
          <div className="text-2xl font-bold text-theme-text tracking-tight">
            {settings.privacyMode ? '***' : totalCost.toLocaleString('cs-CZ')} <span className="text-sm font-medium text-md3-gray">{settings.currency || 'Kč'}</span>
          </div>
        </div>
        <div className="md3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-md3-green/10 flex items-center justify-center text-md3-green">
              <Wallet size={16} />
            </div>
            <span className="text-xs font-bold text-md3-gray uppercase tracking-wider">Celkem</span>
          </div>
          <div className="text-2xl font-bold text-theme-text tracking-tight">
            {settings.privacyMode ? '***' : allTimeCost.toLocaleString('cs-CZ')} <span className="text-sm font-medium text-md3-gray">{settings.currency || 'Kč'}</span>
          </div>
        </div>
        <div className="md3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <TrendingUp size={16} />
            </div>
            <span className="text-xs font-bold text-md3-gray uppercase tracking-wider">Série</span>
          </div>
          <div className="text-2xl font-bold text-theme-text tracking-tight">
            {stats.longestStreak} <span className="text-sm font-medium text-md3-gray">dní</span>
          </div>
        </div>
        <div className="md3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <Calendar size={16} />
            </div>
            <span className="text-xs font-bold text-md3-gray uppercase tracking-wider">Čisté dny</span>
          </div>
          <div className="text-2xl font-bold text-theme-text tracking-tight">
            {stats.cleanDays} <span className="text-sm font-medium text-md3-gray">/ {period}</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <section className="md3-card p-6 relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon size={16} className="text-md3-primary" />
            <h2 className="text-sm font-bold text-theme-text uppercase tracking-wider">Rozdělení podle kategorií</h2>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={settings.chartAnimation}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#8e8e93' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Trend Chart */}
      <section className="md3-card p-6 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-md3-primary" />
            <h2 className="text-sm font-bold text-theme-text uppercase tracking-wider">Trend Výdajů</h2>
          </div>
          <span className="text-xs font-bold text-md3-gray uppercase tracking-wider">{settings.privacyMode ? '***' : (totalCost / period).toFixed(0)} {settings.currency || 'Kč'} / den</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--md3-primary, #0a84ff)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--md3-primary, #0a84ff)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                tickFormatter={(value) => `${value}`}
                width={40}
              />
              <Tooltip content={<CustomTooltip type="currency" currency={settings.currency} />} />
              <Area 
                type="monotone" 
                dataKey="cost" 
                name="Výdaje"
                stroke="var(--md3-primary, #0a84ff)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCost)" 
                isAnimationActive={settings.chartAnimation}
                activeDot={settings.chartPoints ? { r: 6, strokeWidth: 0, fill: "var(--md3-primary, #0a84ff)" } : false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Time of Day Chart */}
      <section className="md3-card p-6 relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <Clock size={16} className="text-md3-primary" />
          <h2 className="text-sm font-bold text-theme-text uppercase tracking-wider">Denní doba užívání</h2>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={usageByTimeOfDay}>
              {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
              <XAxis 
                dataKey="hour" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                dy={10}
                interval={3}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                width={30}
              />
              <Tooltip content={<CustomTooltip type="count" />} />
              <Bar 
                dataKey="count" 
                name="Počet užití"
                fill="var(--md3-primary, #D0BCFF)" 
                radius={[4, 4, 0, 0]} 
                isAnimationActive={settings.chartAnimation}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Activity & Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        <section className="md3-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar size={16} className="text-md3-green" />
            <h2 className="text-sm font-bold text-theme-text uppercase tracking-widest">Aktivita</h2>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {activityHeatmap.map((day, i) => (
              <div 
                key={i} 
                className="w-4 h-4 rounded-sm transition-all duration-300 hover:scale-125"
                style={{ 
                  backgroundColor: day.count > 0 ? `rgba(48, 209, 88, ${0.2 + (Math.min(day.count, 5) * 0.15)})` : 'rgba(255, 255, 255, 0.05)',
                }}
              />
            ))}
          </div>
        </section>

        <section className="md3-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap size={16} className="text-md3-orange" />
            <h2 className="text-sm font-bold text-theme-text uppercase tracking-widest">Predikce</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {predictionData.map((p, i) => (
              <div key={i} className="text-center p-3 rounded-2xl bg-theme-subtle">
                <div className="text-xs text-md3-gray font-bold uppercase mb-1 tracking-wider">{p.name}</div>
                <div className="text-sm font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : p.value.toFixed(0)} {settings.currency || 'Kč'}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Substance List */}
      <div className="space-y-4 relative z-10 pb-24">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-bold text-md3-gray uppercase tracking-widest">Látky</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-md3-gray" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Hledat..."
              className="bg-md3-secondary border-none rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:ring-1 focus:ring-md3-primary/50 transition-all w-40 text-theme-text font-medium"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {filteredSubstanceStats.map((s) => {
            const IconComponent = getIconComponent(s.icon);
            return (
            <button 
              key={s.id}
              onClick={() => setSelectedSubstanceId(s.id)}
              className="w-full md3-card p-4 flex items-center justify-between md3-button text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-theme-subtle flex items-center justify-center relative">
                  <div className="absolute inset-0 blur-lg opacity-20 rounded-full" style={{ backgroundColor: s.color }} />
                  <IconComponent size={20} style={{ color: s.color }} className="relative z-10" />
                </div>
                <div>
                  <div className="text-base font-bold text-theme-text tracking-tight">{s.name}</div>
                  <div className="text-xs text-md3-gray font-medium">{s.count} záznamů</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs font-bold text-theme-text">{s.tolerance.toFixed(0)}%</div>
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest">Tolerance</div>
                </div>
                <ChevronRight size={20} className="text-md3-gray" />
              </div>
            </button>
            );
          })}
        </div>
      </div>
          </motion.div>
        )}

        {overviewTab === 'day-view' && (
          <motion.div
            key="day-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 relative z-10"
          >
            <section className="md3-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Celkový denní přehled</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const d = new Date(selectedDay);
                      d.setDate(d.getDate() - 1);
                      setSelectedDay(d.toISOString().split('T')[0]);
                    }}
                    className="p-2 rounded-xl bg-theme-subtle border border-theme-border text-theme-text hover:bg-theme-subtle-hover transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <input 
                    type="date" 
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="bg-theme-subtle border border-theme-border rounded-xl px-3 py-1.5 text-sm font-bold text-theme-text outline-none focus:border-md3-primary"
                  />
                  <button 
                    onClick={() => {
                      const d = new Date(selectedDay);
                      d.setDate(d.getDate() + 1);
                      setSelectedDay(d.toISOString().split('T')[0]);
                    }}
                    className="p-2 rounded-xl bg-theme-subtle border border-theme-border text-theme-text hover:bg-theme-subtle-hover transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              
              {(() => {
                const startOfDay = new Date(selectedDay).setHours(0, 0, 0, 0);
                const endOfDay = new Date(selectedDay).setHours(23, 59, 59, 999);
                const dayDoses = doses.filter(d => d.timestamp >= startOfDay && d.timestamp <= endOfDay).sort((a, b) => a.timestamp - b.timestamp);
                
                if (dayDoses.length === 0) {
                  return (
                    <div className="text-center py-8 text-md3-gray text-sm font-medium">
                      Žádné záznamy pro tento den.
                    </div>
                  );
                }

                // Group by substance
                const dosesBySubstance = dayDoses.reduce((acc, dose) => {
                  if (!acc[dose.substanceId]) acc[dose.substanceId] = [];
                  acc[dose.substanceId].push(dose);
                  return acc;
                }, {} as Record<string, Dose[]>);

                const uniqueSubstances = Object.keys(dosesBySubstance);
                
                // Calculate interactions
                const activeInteractions: { s1: string, s2: string, msg?: string, severe?: boolean }[] = [];
                for (let i = 0; i < uniqueSubstances.length; i++) {
                  for (let j = i + 1; j < uniqueSubstances.length; j++) {
                    const sub1 = substances.find(s => s.id === uniqueSubstances[i]);
                    const sub2 = substances.find(s => s.id === uniqueSubstances[j]);
                    if (sub1 && sub2) {
                      if (sub1.interactions?.includes(sub2.id) || sub1.interactions?.includes(sub2.name)) {
                        activeInteractions.push({ s1: sub1.name, s2: sub2.name, msg: sub1.interactionMessage, severe: sub1.isSevere });
                      } else if (sub2.interactions?.includes(sub1.id) || sub2.interactions?.includes(sub1.name)) {
                        activeInteractions.push({ s1: sub2.name, s2: sub1.name, msg: sub2.interactionMessage, severe: sub2.isSevere });
                      }
                    }
                  }
                }

                // Calculate total cost for the day
                const dayCost = calculateCost(dayDoses);

                // Hourly distribution for the day (count of doses)
                const hourlyData = Array.from({ length: 24 }, (_, i) => {
                  const obj: any = { hour: `${i}:00` };
                  uniqueSubstances.forEach(subId => {
                    obj[subId] = 0;
                  });
                  return obj;
                });
                dayDoses.forEach(d => {
                  const hour = new Date(d.timestamp).getHours();
                  hourlyData[hour][d.substanceId] += 1;
                });

                return (
                  <div className="space-y-6">
                    {/* Daily Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border text-center">
                        <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Dávek</div>
                        <div className="text-xl font-bold text-theme-text">{dayDoses.length}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border text-center">
                        <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Látek</div>
                        <div className="text-xl font-bold text-theme-text">{uniqueSubstances.length}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border text-center">
                        <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Útrata</div>
                        <div className="text-xl font-bold text-theme-text">{settings.privacyMode ? '***' : dayCost.toFixed(0)} <span className="text-xs text-md3-gray">{settings.currency || 'Kč'}</span></div>
                      </div>
                      <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border text-center flex flex-col justify-center">
                        <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Rozpětí</div>
                        <div className="text-sm font-bold text-theme-text">
                          {formatTime(dayDoses[0].timestamp, settings)} - {formatTime(dayDoses[dayDoses.length - 1].timestamp, settings)}
                        </div>
                      </div>
                    </div>

                    {/* Interactions Warning */}
                    {activeInteractions.length > 0 && (
                      <div className="space-y-2">
                        {activeInteractions.map((interaction, idx) => (
                          <div key={idx} className={cn(
                            "flex items-start gap-3 p-4 rounded-2xl border",
                            interaction.severe 
                              ? "bg-red-500/10 border-red-500/30 text-red-500" 
                              : "bg-orange-500/10 border-orange-500/30 text-orange-500"
                          )}>
                            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-bold">Interakce: {interaction.s1} + {interaction.s2}</h4>
                              {interaction.msg && <p className="text-xs mt-1 opacity-90 leading-relaxed">{interaction.msg}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Hourly Chart */}
                    <div className="h-32 w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyData}>
                          {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                          <XAxis 
                            dataKey="hour" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                            dy={10}
                            interval={3}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                            width={30}
                          />
                          <Tooltip content={<CustomTooltip type="count" />} />
                          {uniqueSubstances.map((subId, index) => {
                            const sub = substances.find(s => s.id === subId);
                            return (
                              <Bar 
                                key={subId}
                                dataKey={subId} 
                                name={sub?.name || subId}
                                stackId="a"
                                fill={sub?.color || `hsl(${(index * 137.5) % 360}, 70%, 50%)`} 
                                radius={index === uniqueSubstances.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
                                isAnimationActive={settings.chartAnimation}
                              />
                            );
                          })}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-6 pt-4 border-t border-theme-border">
                      <h4 className="text-xs font-bold text-md3-gray uppercase tracking-widest">Detailní rozpis</h4>
                      {Object.entries(dosesBySubstance).map(([substanceId, sDoses]) => {
                      const substance = substances.find(s => s.id === substanceId) || {
                        id: substanceId,
                        name: substanceId,
                        unit: '?',
                        color: '#8e8e93',
                        icon: 'pill',
                        category: 'other'
                      } as unknown as Substance;
                      
                      const dayTotal = sDoses.reduce((sum, d) => sum + d.amount, 0);
                      const IconComponent = getIconComponent(substance.icon);

                      return (
                        <div key={substanceId} className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-2xl bg-theme-subtle border border-theme-border">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center relative">
                                <div className="absolute inset-0 blur-md opacity-20 rounded-full" style={{ backgroundColor: substance.color }} />
                                <IconComponent size={18} style={{ color: substance.color }} className="relative z-10" />
                              </div>
                              <div>
                                <span className="text-sm font-bold text-theme-text block">{substance.name}</span>
                                {substance.activeIngredientName && calculateActiveIngredient(sDoses, substance) > 0 && (
                                  <span className="text-[10px] font-bold text-md3-primary">
                                    {calculateActiveIngredient(sDoses, substance).toFixed(2)}{substance.unit} {substance.activeIngredientName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-base font-bold text-theme-text">{dayTotal.toFixed(1)} {substance.unit}</span>
                          </div>

                          <div className="space-y-2 pl-4 border-l-2 border-theme-border ml-4">
                            {sDoses.map((dose) => (
                              <div key={dose.id} className="flex items-center justify-between p-3 rounded-xl bg-theme-subtle border border-theme-border">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-theme-card flex items-center justify-center border border-theme-border">
                                    <Clock size={14} className="text-md3-gray" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-theme-text">{formatTime(dose.timestamp, settings)}</div>
                                    <div className="text-xs text-md3-gray font-medium">{dose.route}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-theme-text">{dose.amount} {substance.unit}</div>
                                  {substance.activeIngredientName && calculateActiveIngredient([dose], substance) > 0 && (
                                    <div className="text-[10px] font-bold text-md3-primary">
                                      {calculateActiveIngredient([dose], substance).toFixed(2)}{substance.unit} {substance.activeIngredientName}
                                    </div>
                                  )}
                                  {dose.strainId && <div className="text-xs text-md3-primary font-bold">{dose.strainId}</div>}
                                  {dose.rating && <div className="text-[10px] font-bold text-md3-gray uppercase tracking-widest mt-0.5">Hodnocení: <span className="text-theme-text">{dose.rating}/5</span></div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                );
              })()}
            </section>
          </motion.div>
        )}

        {overviewTab === 'finance' && (
          <motion.div
            key="finance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 relative z-10"
          >
            <section className="md3-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <DollarSign size={16} className="text-md3-primary" />
                <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Finanční přehled</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Útrata ({period}D)</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : totalCost.toLocaleString('cs-CZ')} <span className="text-sm text-md3-gray">{settings.currency || 'Kč'}</span></div>
                </div>
                <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Celkem útrata</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : allTimeCost.toLocaleString('cs-CZ')} <span className="text-sm text-md3-gray">{settings.currency || 'Kč'}</span></div>
                </div>
                <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Aktivní dny</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">{predictions.activeDays} <span className="text-sm text-md3-gray">dnů</span></div>
                </div>
                <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Průměr / aktivní den</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : predictions.activeDayAverage.toFixed(0)} <span className="text-sm text-md3-gray">{settings.currency || 'Kč'}</span></div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-md3-gray uppercase tracking-widest">Předpověď a trendy</h4>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                    <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Průměrná cena dávky</div>
                    <div className="text-xl font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : predictions.costPerDose.toFixed(1)} <span className="text-sm text-md3-gray">{settings.currency || 'Kč'}</span></div>
                  </div>
                  <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                    <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Trend (posledních 7 dní)</div>
                    <div className="flex items-center gap-2">
                      <div className="text-xl font-bold text-theme-text tracking-tight">
                        {settings.privacyMode ? '***' : predictions.recentDaily.toFixed(0)} <span className="text-sm text-md3-gray">{settings.currency || 'Kč'}/den</span>
                      </div>
                      <div className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        predictions.trendPercentage > 0 ? "bg-red-500/10 text-red-500" : 
                        predictions.trendPercentage < 0 ? "bg-green-500/10 text-green-500" : "bg-md3-gray/10 text-md3-gray"
                      )}>
                        {predictions.trendPercentage > 0 ? '+' : ''}{predictions.trendPercentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-3">
                    <div className="text-xs text-md3-gray font-bold uppercase tracking-wider text-center">Dlouhodobý průměr</div>
                    <div className="text-center p-3 rounded-xl bg-theme-subtle border border-theme-border">
                      <div className="text-[10px] text-md3-gray font-bold uppercase mb-1">Měsíčně</div>
                      <div className="text-sm font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : predictions.monthly.toFixed(0)} {settings.currency || 'Kč'}</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-theme-subtle border border-theme-border">
                      <div className="text-[10px] text-md3-gray font-bold uppercase mb-1">Ročně</div>
                      <div className="text-sm font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : predictions.yearly.toFixed(0)} {settings.currency || 'Kč'}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-xs text-md3-primary font-bold uppercase tracking-wider text-center">Odhad dle trendu</div>
                    <div className="text-center p-3 rounded-xl bg-md3-primary/5 border border-md3-primary/20">
                      <div className="text-[10px] text-md3-primary/80 font-bold uppercase mb-1">Měsíčně</div>
                      <div className="text-sm font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : predictions.recentMonthly.toFixed(0)} {settings.currency || 'Kč'}</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-md3-primary/5 border border-md3-primary/20">
                      <div className="text-[10px] text-md3-primary/80 font-bold uppercase mb-1">Ročně</div>
                      <div className="text-sm font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : predictions.recentYearly.toFixed(0)} {settings.currency || 'Kč'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-4">Vývoj útraty</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                      {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                      <XAxis dataKey="name" stroke="#8e8e93" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#8e8e93" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => settings.privacyMode ? '***' : `${val}`} width={40} />
                      <Tooltip content={<CustomTooltip type="currency" currency={settings.currency} />} />
                      <Bar dataKey="cost" name="Útrata" fill="var(--md3-primary, #0a84ff)" radius={[4, 4, 0, 0]} isAnimationActive={settings.chartAnimation} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {costBySubstance.length > 0 && (
              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <PieChartIcon size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Útrata podle látek</h3>
                </div>
                <div className="h-48 w-full mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costBySubstance}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={settings.chartAnimation}
                      >
                        {costBySubstance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip type="currency" currency={settings.currency} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {costBySubstance.map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-theme-subtle border border-theme-border">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-bold text-theme-text">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-theme-text">{settings.privacyMode ? '***' : item.value.toFixed(0)} {settings.currency || 'Kč'}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderSubstanceDetail = (substanceId: string) => {
    const substance = selectedSubstance || {
      id: substanceId,
      name: substanceId,
      unit: '?',
      color: '#8e8e93',
      icon: 'pill',
      category: 'other'
    } as unknown as Substance;

    const sDoses = selectedSubstanceDoses;
    const totalAmount = sDoses.reduce((sum, d) => sum + d.amount, 0);
    const cost = calculateCost(sDoses);
    const tolerance = calculateTolerance(substanceId, substances, doses);
    const substancePredictions = calculatePredictions(sDoses, substances, period);
    const IconComponent = getIconComponent(substance.icon);
    
    const strainsData = (() => {
      const data: Record<string, { name: string, value: number, count: number }> = {};
      sDoses.forEach(d => {
        const strainName = d.strainId || 'Neznámý druh';
        if (!data[strainName]) {
          data[strainName] = { name: strainName, value: 0, count: 0 };
        }
        data[strainName].value += d.amount;
        data[strainName].count++;
      });
      return Object.values(data).sort((a, b) => b.value - a.value);
    })();

    const dailyAmount = sDoses.length > 0 ? totalAmount / period : 0;
    const packageDuration = substance.packageSize && dailyAmount > 0 ? substance.packageSize / dailyAmount : 0;
    const currentPackageRemaining = substance.packageSize ? substance.packageSize - (totalAmount % substance.packageSize) : 0;
    const daysRemaining = dailyAmount > 0 ? currentPackageRemaining / dailyAmount : 0;

    return (
      <div className="space-y-6 relative pb-24">
        {/* Back Button & Header */}
        <div className="flex items-center justify-between relative z-10">
          <button 
            onClick={() => setSelectedSubstanceId(null)}
            className="flex items-center gap-2 text-md3-primary font-bold md3-button"
          >
            <ChevronLeft size={24} />
            <span>Zpět</span>
          </button>
          <div className="w-10 h-10 rounded-2xl bg-theme-subtle flex items-center justify-center">
            <IconComponent size={20} style={{ color: substance.color }} />
          </div>
        </div>

        {/* Substance Title Card */}
        <div className="px-2">
          <h2 className="text-3xl font-bold text-theme-text tracking-tight mb-1">{substance.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-lg bg-md3-secondary text-xs font-bold text-md3-gray uppercase tracking-widest">
              {substance.category}
            </span>
            <span className="text-xs font-medium text-md3-gray">
              {sDoses.length} záznamů v období
            </span>
            {substance.stash !== undefined && (
              <span className="px-2 py-0.5 rounded-lg border border-theme-border text-xs font-bold text-md3-gray uppercase tracking-widest">
                Zásoba: <span style={{ color: substance.color }}>{substance.stash.toFixed(1)}{substance.unit}</span>
              </span>
            )}
          </div>
          {substance.tags && substance.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {substance.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-md bg-theme-subtle border border-theme-border text-[9px] font-bold text-md3-gray uppercase tracking-widest">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-md3-secondary p-1 rounded-2xl relative z-10 overflow-x-auto no-scrollbar">
          {[
            { id: 'trends', label: 'Trendy', icon: TrendingUp },
            { id: 'time', label: 'Časy', icon: Clock },
            { id: 'distribution', label: 'Dávky', icon: GitMerge },
            { id: 'stats', label: 'Statistiky', icon: BarChart2 },
            { id: 'strains', label: 'Druhy', icon: Layers },
            { id: 'finance', label: 'Finance', icon: Wallet },
            { id: 'history', label: 'Historie', icon: History },
            { id: 'day-view', label: 'Den', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDetailTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                detailTab === tab.id 
                  ? "bg-theme-subtle-hover text-theme-text shadow-sm" 
                  : "text-md3-gray hover:text-theme-text"
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
              className="space-y-4 relative z-10"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="md3-card p-5">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-2">Tolerance</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">{tolerance.toFixed(0)}%</div>
                </div>
                <div className="md3-card p-5">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-2">Celkem</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">
                    {totalAmount.toFixed(1)} <span className="text-sm font-medium text-md3-gray">{substance.unit}</span>
                  </div>
                  {substance.activeIngredientName && calculateActiveIngredient(sDoses, substance) > 0 && (
                    <div className="text-xs font-bold text-md3-primary mt-1">
                      {calculateActiveIngredient(sDoses, substance).toFixed(2)}{substance.unit} {substance.activeIngredientName}
                    </div>
                  )}
                </div>
              </div>

              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Množství za den</h3>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrend}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={substance.color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={substance.color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        width={30}
                      />
                      <Tooltip content={<CustomTooltip type="amount" />} />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        name="Množství"
                        stroke={substance.color} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorAmount)" 
                        isAnimationActive={settings.chartAnimation}
                        activeDot={settings.chartPoints ? { r: 6, strokeWidth: 0, fill: substance.color } : false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Kumulativní spotřeba</h3>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrend}>
                      <defs>
                        <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={substance.color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={substance.color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        width={30}
                      />
                      <Tooltip content={<CustomTooltip type="amount" />} />
                      <Area 
                        type="monotone" 
                        dataKey="cumulativeAmount" 
                        name="Celkem"
                        stroke={substance.color} 
                        fillOpacity={1} 
                        fill="url(#colorCumulative)" 
                        strokeWidth={3} 
                        isAnimationActive={settings.chartAnimation}
                        activeDot={settings.chartPoints ? { r: 6, strokeWidth: 0, fill: substance.color } : false}
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
              className="space-y-4 relative z-10"
            >
              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Clock size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Kdy užívám nejvíc (Hodiny)</h3>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={substanceTimeStats}>
                      {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                      <XAxis 
                        dataKey="hour" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        width={30}
                      />
                      <Tooltip content={<CustomTooltip type="count" />} />
                      <Bar 
                        dataKey="count" 
                        name="Počet dávek"
                        fill={substance.color} 
                        radius={[6, 6, 0, 0]} 
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Calendar size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Dny v týdnu (Množství)</h3>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayOfWeekStats}>
                      {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                      <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        width={30}
                      />
                      <Tooltip content={<CustomTooltip type="amount" />} />
                      <Bar 
                        dataKey="amount" 
                        name={`Množství (${substance.unit})`}
                        fill={substance.color} 
                        radius={[6, 6, 0, 0]} 
                        isAnimationActive={settings.chartAnimation}
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
              className="space-y-4 relative z-10"
            >
              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <GitMerge size={16} className="text-md3-primary-container" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Distribuce dávek</h3>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dosageDistribution}>
                      {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                      <XAxis 
                        dataKey="range" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        width={30}
                      />
                      <Tooltip content={<CustomTooltip type="count" />} />
                      <Bar 
                        dataKey="count" 
                        name="Počet"
                        fill={substance.color} 
                        radius={[6, 6, 0, 0]} 
                        isAnimationActive={settings.chartAnimation}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </motion.div>
          )}

          {detailTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 relative z-10"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="md3-card p-5">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-2">Průměrná dávka</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">
                    {sDoses.length > 0 ? (totalAmount / sDoses.length).toFixed(1) : 0} <span className="text-sm font-medium text-md3-gray">{substance.unit}</span>
                  </div>
                  {substance.activeIngredientName && sDoses.length > 0 && calculateActiveIngredient(sDoses, substance) > 0 && (
                    <div className="text-xs font-bold text-md3-primary mt-1">
                      {(calculateActiveIngredient(sDoses, substance) / sDoses.length).toFixed(2)}{substance.unit} {substance.activeIngredientName}
                    </div>
                  )}
                </div>
                <div className="md3-card p-5">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-2">Maximální dávka</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">
                    {sDoses.length > 0 ? Math.max(...sDoses.map(d => d.amount)).toFixed(1) : 0} <span className="text-sm font-medium text-md3-gray">{substance.unit}</span>
                  </div>
                  {substance.activeIngredientName && sDoses.length > 0 && Math.max(...sDoses.map(d => calculateActiveIngredient([d], substance))) > 0 && (
                    <div className="text-xs font-bold text-md3-primary mt-1">
                      {Math.max(...sDoses.map(d => calculateActiveIngredient([d], substance))).toFixed(2)}{substance.unit} {substance.activeIngredientName}
                    </div>
                  )}
                </div>
              </div>

              {substance.dosage && (
                <div className="md3-card p-5">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-4">Orientační dávkování</div>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-md3-gray uppercase">Práh</div>
                      <div className="text-sm font-bold text-theme-text">{substance.dosage.threshold}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-md3-gray uppercase">Lehká</div>
                      <div className="text-sm font-bold text-theme-text">{substance.dosage.light}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-md3-gray uppercase">Běžná</div>
                      <div className="text-sm font-bold text-theme-text">{substance.dosage.common}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-md3-gray uppercase">Silná</div>
                      <div className="text-sm font-bold text-theme-text">{substance.dosage.strong}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-md3-gray uppercase">Těžká</div>
                      <div className="text-sm font-bold text-rose-500">{substance.dosage.heavy}</div>
                    </div>
                  </div>
                </div>
              )}

              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart2 size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Doplňující statistiky</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                    <span className="text-sm font-bold text-md3-gray">Celkový počet dávek</span>
                    <span className="text-lg font-bold text-theme-text">{sDoses.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                    <span className="text-sm font-bold text-md3-gray">Nejčastější den</span>
                    <span className="text-lg font-bold text-theme-text">
                      {(() => {
                        if (sDoses.length === 0) return '-';
                        const days = [0, 0, 0, 0, 0, 0, 0];
                        sDoses.forEach(d => days[new Date(d.timestamp).getDay()]++);
                        const maxDay = days.indexOf(Math.max(...days));
                        return ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'][maxDay];
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                    <span className="text-sm font-bold text-md3-gray">Průměrně za den</span>
                    <span className="text-lg font-bold text-theme-text">
                      {(sDoses.length / period).toFixed(1)}x
                    </span>
                  </div>
                  {substance.packageSize && substance.packageSize > 0 && (
                    <>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                        <span className="text-sm font-bold text-md3-gray">Spotřebovaná balení</span>
                        <span className="text-lg font-bold text-theme-text">
                          {(totalAmount / substance.packageSize).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                        <span className="text-sm font-bold text-md3-gray">Průměrná výdrž balení</span>
                        <span className="text-lg font-bold text-theme-text">
                          {packageDuration > 0 ? `${packageDuration.toFixed(0)} dní` : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                        <span className="text-sm font-bold text-md3-gray">Zbývá v aktuálním balení</span>
                        <span className="text-lg font-bold text-theme-text">
                          {currentPackageRemaining.toFixed(1)} <span className="text-sm font-medium text-md3-gray">{substance.unit}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                        <span className="text-sm font-bold text-md3-gray">Odhadované dny do konce</span>
                        <span className="text-lg font-bold text-theme-text">
                          {daysRemaining > 0 ? `${daysRemaining.toFixed(0)} dní` : '-'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {detailTab === 'strains' && (
            <motion.div
              key="strains"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 relative z-10"
            >
              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Layers size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Přehled podle druhů</h3>
                </div>
                {strainsData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-48 w-full mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={strainsData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            isAnimationActive={settings.chartAnimation}
                          >
                            {strainsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${(index * 137.5) % 360}, 70%, 50%)`} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip type="amount" />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {strainsData.map((strain, index) => (
                        <div key={strain.name} className="flex items-center justify-between p-3 rounded-xl bg-theme-subtle border border-theme-border">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)` }} />
                            <span className="text-sm font-bold text-theme-text">{strain.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-theme-text">{strain.value.toFixed(1)} <span className="text-xs text-md3-gray">{substance.unit}</span></div>
                            <div className="text-xs text-md3-gray font-medium">{strain.count}x</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-md3-gray text-sm font-medium">
                    Žádná data o druzích pro toto období.
                  </div>
                )}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="md3-card p-5">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-2">Celková útrata</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : cost.toLocaleString('cs-CZ')} <span className="text-sm text-md3-gray">{settings.currency || 'Kč'}</span></div>
                </div>
                <div className="md3-card p-5">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-2">Průměr/dávka</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : (cost / (sDoses.length || 1)).toFixed(0)} <span className="text-sm text-md3-gray">{settings.currency || 'Kč'}</span></div>
                </div>
                <div className="md3-card p-5">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-2">Aktivní dny</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">{substancePredictions.activeDays} <span className="text-sm text-md3-gray">dnů</span></div>
                </div>
                <div className="md3-card p-5">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-2">Průměr/aktivní den</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : substancePredictions.activeDayAverage.toFixed(0)} <span className="text-sm text-md3-gray">{settings.currency || 'Kč'}</span></div>
                </div>
              </div>

              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Zap size={16} className="text-md3-orange" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Predikce výdajů</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Denně', value: substancePredictions.daily },
                    { label: 'Měsíčně', value: substancePredictions.monthly },
                    { label: 'Ročně', value: substancePredictions.yearly },
                  ].map((p, i) => (
                    <div key={i} className="text-center p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                      <div className="text-xs text-md3-gray font-bold uppercase mb-1 tracking-wider">{p.label}</div>
                      <div className="text-sm font-bold text-theme-text tracking-tight">{settings.privacyMode ? '***' : p.value.toFixed(0)} {settings.currency || 'Kč'}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border mt-4">
                  <div>
                    <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Trend (posledních 7 dní)</div>
                    <div className="text-sm font-bold text-theme-text">
                      {settings.privacyMode ? '***' : substancePredictions.recentDaily.toFixed(0)} {settings.currency || 'Kč'} / den
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold",
                    substancePredictions.trendPercentage > 0 ? "bg-red-500/10 text-red-500" : 
                    substancePredictions.trendPercentage < 0 ? "bg-green-500/10 text-green-500" : "bg-md3-gray/10 text-md3-gray"
                  )}>
                    {substancePredictions.trendPercentage > 0 ? '+' : ''}{substancePredictions.trendPercentage.toFixed(1)}%
                  </div>
                </div>
              </section>

              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Vývoj útraty</h3>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={(() => {
                      const daysMap = new Map<string, number>();
                      sDoses.forEach(d => {
                        const date = new Date(d.timestamp).toISOString().split('T')[0];
                        const strainPrice = d.strainId ? substance.strains?.find(s => s.name === d.strainId)?.price : null;
                        const price = strainPrice || substance.price || 0;
                        const cost = d.amount * price;
                        daysMap.set(date, (daysMap.get(date) || 0) + cost);
                      });
                      return Array.from(daysMap.entries())
                        .map(([date, cost]) => ({ date, cost }))
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .slice(-14); // Last 14 active days
                    })()}>
                      <defs>
                        <linearGradient id="colorCostSubstance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={substance.color || "var(--md3-primary, #0a84ff)"} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={substance.color || "var(--md3-primary, #0a84ff)"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getDate()}.${d.getMonth() + 1}.`;
                        }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        width={40}
                      />
                      <Tooltip content={<CustomTooltip type="currency" currency={settings.currency} />} />
                      <Area 
                        type="monotone" 
                        dataKey="cost" 
                        name="Útrata"
                        stroke={substance.color || "var(--md3-primary, #0a84ff)"} 
                        fillOpacity={1} 
                        fill="url(#colorCostSubstance)" 
                        strokeWidth={3} 
                        isAnimationActive={settings.chartAnimation}
                        activeDot={settings.chartPoints ? { r: 6, strokeWidth: 0, fill: substance.color || "var(--md3-primary, #0a84ff)" } : false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <DollarSign size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Cena za dávku (posledních 30)</h3>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(() => {
                      return [...sDoses].sort((a, b) => a.timestamp - b.timestamp).slice(-30).map(d => {
                        const strainPrice = d.strainId ? substance.strains?.find(s => s.name === d.strainId)?.price : null;
                        const price = strainPrice || substance.price || 0;
                        const cost = d.amount * price;
                        return {
                          id: d.id,
                          date: new Date(d.timestamp).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
                          time: new Date(d.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
                          cost,
                          amount: d.amount,
                          route: d.route
                        };
                      });
                    })()}>
                      {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                        width={40}
                      />
                      <Tooltip content={<CustomTooltip type="currency" currency={settings.currency} />} />
                      <Bar 
                        dataKey="cost" 
                        name="Cena dávky"
                        fill={substance.color || "var(--md3-primary, #0a84ff)"} 
                        radius={[4, 4, 0, 0]} 
                        isAnimationActive={settings.chartAnimation}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <PieChartIcon size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Útrata podle způsobu užití</h3>
                </div>
                {(() => {
                  const routesMap = new Map<string, number>();
                  sDoses.forEach(d => {
                    const strainPrice = d.strainId ? substance.strains?.find(s => s.name === d.strainId)?.price : null;
                    const price = strainPrice || substance.price || 0;
                    const cost = d.amount * price;
                    routesMap.set(d.route, (routesMap.get(d.route) || 0) + cost);
                  });
                  const routeData = Array.from(routesMap.entries())
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value);

                  if (routeData.length === 0 || routeData.every(r => r.value === 0)) {
                    return <div className="text-center py-8 text-md3-gray text-sm font-medium">Žádná data o útratě.</div>;
                  }

                  return (
                    <>
                      <div className="h-48 w-full mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={routeData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                              isAnimationActive={settings.chartAnimation}
                            >
                              {routeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={`hsl(${(index * 137.5) % 360}, 70%, 50%)`} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip type="currency" currency={settings.currency} />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {routeData.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-theme-subtle border border-theme-border">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)` }} />
                              <span className="text-sm font-bold text-theme-text">{item.name}</span>
                            </div>
                            <span className="text-sm font-bold text-theme-text">{settings.privacyMode ? '***' : item.value.toFixed(0)} {settings.currency || 'Kč'}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
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
              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <History size={16} className="text-md3-gray" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Historie po dnech</h3>
                </div>
                <div className="space-y-6 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
                  {groupedHistory.map((group) => (
                    <div key={group.date} className="space-y-3">
                      <div className="flex items-center justify-between sticky top-0 bg-theme-card/90 backdrop-blur-md py-2 z-10">
                        <h4 className="text-sm font-bold text-theme-text">{group.date}</h4>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-md3-primary bg-md3-primary/10 px-2 py-1 rounded-lg">
                            Celkem: {group.totalAmount.toFixed(1)} {substance.unit}
                          </span>
                          {substance.activeIngredientName && calculateActiveIngredient(group.doses, substance) > 0 && (
                            <span className="text-[10px] font-bold text-md3-primary mt-1">
                              {calculateActiveIngredient(group.doses, substance).toFixed(2)}{substance.unit} {substance.activeIngredientName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {group.doses.map((dose) => (
                          <div key={dose.id} className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border group hover:bg-theme-subtle-hover transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-theme-subtle flex items-center justify-center border border-theme-border group-hover:scale-110 transition-transform">
                                <Clock size={16} className="text-md3-gray" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-theme-text tracking-tight">
                                  {dose.amount} {substance.unit}
                                  {dose.strainId && <span className="text-xs text-md3-primary ml-2 font-bold uppercase tracking-widest">({dose.strainId})</span>}
                                </div>
                                {substance.activeIngredientName && calculateActiveIngredient([dose], substance) > 0 && (
                                  <div className="text-[10px] font-bold text-md3-primary mt-0.5">
                                    {calculateActiveIngredient([dose], substance).toFixed(2)}{substance.unit} {substance.activeIngredientName}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-0.5">
                                  <div className="text-xs text-md3-gray font-bold uppercase tracking-wider">
                                    {formatTime(dose.timestamp, settings)}
                                  </div>
                                  {dose.rating && (
                                    <div className="text-[10px] font-bold text-md3-gray uppercase tracking-widest">
                                      • Hodnocení: <span className="text-theme-text">{dose.rating}/5</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">
                                {dose.route}
                              </div>
                              {dose.cost && (
                                <div className="text-sm font-bold text-md3-green tracking-tight">
                                  {dose.cost} {settings.currency || 'Kč'}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {groupedHistory.length === 0 && (
                    <div className="text-center py-8 text-md3-gray text-sm">Zatím žádné záznamy</div>
                  )}
                </div>
              </section>
            </motion.div>
          )}
          {detailTab === 'day-view' && (
            <motion.div
              key="day-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 relative z-10"
            >
              <section className="md3-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-md3-primary" />
                    <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Denní přehled</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const d = new Date(selectedDay);
                        d.setDate(d.getDate() - 1);
                        setSelectedDay(d.toISOString().split('T')[0]);
                      }}
                      className="p-2 rounded-xl bg-theme-subtle border border-theme-border text-theme-text hover:bg-theme-subtle-hover transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <input 
                      type="date" 
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="bg-theme-subtle border border-theme-border rounded-xl px-3 py-1.5 text-sm font-bold text-theme-text outline-none focus:border-md3-primary"
                    />
                    <button 
                      onClick={() => {
                        const d = new Date(selectedDay);
                        d.setDate(d.getDate() + 1);
                        setSelectedDay(d.toISOString().split('T')[0]);
                      }}
                      className="p-2 rounded-xl bg-theme-subtle border border-theme-border text-theme-text hover:bg-theme-subtle-hover transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                
                {(() => {
                  const startOfDay = new Date(selectedDay).setHours(0, 0, 0, 0);
                  const endOfDay = new Date(selectedDay).setHours(23, 59, 59, 999);
                  const dayDoses = sDoses.filter(d => d.timestamp >= startOfDay && d.timestamp <= endOfDay).sort((a, b) => a.timestamp - b.timestamp);
                  
                  if (dayDoses.length === 0) {
                    return (
                      <div className="text-center py-8 text-md3-gray text-sm font-medium">
                        Žádné záznamy pro tento den.
                      </div>
                    );
                  }

                  const dayTotal = dayDoses.reduce((sum, d) => sum + d.amount, 0);
                  
                  // Hourly distribution for the day
                  const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, amount: 0 }));
                  dayDoses.forEach(d => {
                    const hour = new Date(d.timestamp).getHours();
                    hourlyData[hour].amount += d.amount;
                  });

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border text-center">
                          <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Dávek</div>
                          <div className="text-xl font-bold text-theme-text">{dayDoses.length}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border text-center">
                          <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Celkem za den</div>
                          <div className="text-xl font-bold text-theme-text">{dayTotal.toFixed(1)} <span className="text-xs text-md3-gray">{substance.unit}</span></div>
                        </div>
                        <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border text-center">
                          <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Průměr/dávka</div>
                          <div className="text-xl font-bold text-theme-text">{(dayTotal / dayDoses.length).toFixed(1)} <span className="text-xs text-md3-gray">{substance.unit}</span></div>
                        </div>
                        <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border text-center flex flex-col justify-center">
                          <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Rozpětí</div>
                          <div className="text-sm font-bold text-theme-text">
                            {formatTime(dayDoses[0].timestamp, settings)} - {formatTime(dayDoses[dayDoses.length - 1].timestamp, settings)}
                          </div>
                        </div>
                      </div>

                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={hourlyData}>
                            {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                            <XAxis 
                              dataKey="hour" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                              dy={10}
                              interval={3}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                              width={30}
                            />
                            <Tooltip content={<CustomTooltip type="amount" />} />
                            <Bar 
                              dataKey="amount" 
                              name="Množství"
                              fill={substance.color || "var(--md3-primary, #0a84ff)"} 
                              radius={[4, 4, 0, 0]} 
                              isAnimationActive={settings.chartAnimation}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-3">Časová osa</h4>
                        {dayDoses.map((dose) => (
                          <div key={dose.id} className="flex items-center justify-between p-3 rounded-xl bg-theme-subtle border border-theme-border">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-theme-card flex items-center justify-center border border-theme-border">
                                <Clock size={14} className="text-md3-gray" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-theme-text">{formatTime(dose.timestamp, settings)}</div>
                                <div className="text-xs text-md3-gray font-medium">{dose.route}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-theme-text">{dose.amount} {substance.unit}</div>
                              {dose.strainId && <div className="text-xs text-md3-primary font-bold">{dose.strainId}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
