import React, { useMemo, useState } from 'react';
import { Substance, Dose, UserSettings } from '../types';
import { 
  LineChart, 
  Line,
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Cell
} from 'recharts';
import { 
  Lightbulb, 
  TrendingUp, 
  Cpu, 
  Calendar, 
  Wallet, 
  Activity,
  AlertTriangle,
  Brain,
  Database,
  Clock,
  Eye,
  Droplet
} from 'lucide-react';
import { formatAmount, cn } from '../lib/utils';
import { 
  calculateSubstanceLevelAtTime, 
  calculatePeakSubstanceLevel,
  calculateTolerance 
} from '../services/pharmacology';
import { motion, AnimatePresence } from 'motion/react';

interface PredictionsProps {
  substances: Substance[];
  doses: Dose[];
  settings: UserSettings;
}

export default function Predictions({ substances, doses, settings }: PredictionsProps) {
  const [selectedSubstanceId, setSelectedSubstanceId] = useState<string | null>(
    substances.length > 0 ? substances[0].id : null
  );
  
  const [timeframe, setTimeframe] = useState<'intraday' | '48h' | '7d' | '14d' | '3m'>('intraday');

  const activeSubstances = useMemo(() => {
    const activeIds = Array.from(new Set(doses.map(d => d.substanceId)));
    return substances.filter(s => activeIds.includes(s.id));
  }, [substances, doses]);

  const selectedSubstance = substances.find(s => s.id === selectedSubstanceId);
  const sDoses = useMemo(() => doses.filter(d => d.substanceId === selectedSubstanceId).sort((a,b) => a.timestamp - b.timestamp), [doses, selectedSubstanceId]);

  const predictionMetrics = useMemo(() => {
    if (!selectedSubstance || sDoses.length < 3) return null;

    const totalAmount = sDoses.reduce((sum, d) => sum + d.amount, 0);
    const firstDoseTimestamp = sDoses[0].timestamp;
    const lastDose = sDoses[sDoses.length - 1];
    
    // Day totals
    const dailyTotalsRecord: Record<string, number> = {};
    sDoses.forEach(d => {
      const day = new Date(d.timestamp).toISOString().split('T')[0];
      dailyTotalsRecord[day] = (dailyTotalsRecord[day] || 0) + d.amount;
    });
    const dailyTotalsArray = Object.values(dailyTotalsRecord).sort((a, b) => a - b);
    const daysWithDosesCount = dailyTotalsArray.length;
    
    // Safe averages
    const avgDailyConsumptionGlobal = totalAmount / Math.max(1, (Date.now() - firstDoseTimestamp) / 86400000);
    const medianDailyDoseRaw = daysWithDosesCount > 0 
        ? (daysWithDosesCount % 2 !== 0 
           ? dailyTotalsArray[Math.floor(daysWithDosesCount / 2)] 
           : (dailyTotalsArray[daysWithDosesCount / 2 - 1] + dailyTotalsArray[daysWithDosesCount / 2]) / 2)
        : 0;

    // Intervals (Global vs Recent)
    let totalInterval = 0;
    for (let i = 0; i < sDoses.length - 1; i++) {
       totalInterval += (sDoses[i+1].timestamp - sDoses[i].timestamp);
    }
    const globalAvgIntervalMs = totalInterval / (sDoses.length - 1);

    // AI Insight: Heavily weight recent doses (last 5-10) to fix the "too long gap" bug
    let recentAvgIntervalMs = globalAvgIntervalMs;
    if (sDoses.length >= 5) {
       let recentTotal = 0;
       const recentCount = Math.min(10, sDoses.length - 1);
       for(let i = sDoses.length - recentCount - 1; i < sDoses.length - 1; i++) {
          recentTotal += (sDoses[i+1].timestamp - sDoses[i].timestamp);
       }
       recentAvgIntervalMs = recentTotal / recentCount;
    }

    // Circadian analysis
    const hourBuckets: Record<number, { amount: number, count: number }> = {};
    sDoses.forEach(d => {
       const h = new Date(d.timestamp).getHours();
       if (!hourBuckets[h]) hourBuckets[h] = { amount: 0, count: 0 };
       hourBuckets[h].amount += d.amount;
       hourBuckets[h].count++;
    });
    
    let peakHour = 0;
    let maxCount = 0;
    Object.entries(hourBuckets).forEach(([h, data]) => {
       if (data.count > maxCount) {
           maxCount = data.count;
           peakHour = parseInt(h);
       }
    });

    const predictedNextAmount = hourBuckets[peakHour] ? hourBuckets[peakHour].amount / hourBuckets[peakHour].count : medianDailyDoseRaw;
    
    // Financial modeling
    const avgCostPerWeek = (selectedSubstance.price && selectedSubstance.price > 0) ? (avgDailyConsumptionGlobal * 7 * selectedSubstance.price) : 0;
    const projectedCost3Months = avgCostPerWeek * 13; // ~13 weeks in 3 months

    // Stash tracking
    let stashDaysLeft = null;
    let stashExhaustionDate = null;
    let projectedStashZero = null;
    if ((selectedSubstance as any).stash !== undefined && avgDailyConsumptionGlobal > 0) {
      stashDaysLeft = (selectedSubstance as any).stash / avgDailyConsumptionGlobal;
      stashExhaustionDate = new Date(Date.now() + (stashDaysLeft * 86400000));
      projectedStashZero = stashExhaustionDate.getTime();
    }

    // Predict Next Specific Dose Event using Recent Interval
    let predictedNextDoseTime = "";
    let predictionReason = "";
    let predictionStatusColor = "text-md3-primary";

    // If even the recent average is over 24h, the user is likely a daily or sparse user
    if (recentAvgIntervalMs > 86400000 && !((Date.now() - lastDose.timestamp) < 43200000 && recentAvgIntervalMs < 172800000)) {
       const daysInterval = Math.round(recentAvgIntervalMs / 86400000);
       const nextDateRaw = new Date(lastDose.timestamp + (recentAvgIntervalMs));
       const dateNext = new Date(nextDateRaw);
       dateNext.setHours(peakHour, 0, 0, 0); // align to typical hour, but on the expected day
       
       // Check if missed
       if (dateNext.getTime() < Date.now()) {
          predictedNextDoseTime = `Dávka zpožděna (Očekávána ${dateNext.toLocaleDateString('cs-CZ')})`;
          predictionStatusColor = "text-red-500";
       } else {
          const isToday = new Date().toDateString() === dateNext.toDateString();
          const isTomorrow = new Date(Date.now() + 86400000).toDateString() === dateNext.toDateString();
          const dateStr = isToday ? 'Dnes' : isTomorrow ? 'Zítra' : dateNext.toLocaleDateString('cs-CZ');
          predictedNextDoseTime = `${dateStr} kolem ${peakHour}:00`;
       }

       predictionReason = `Užíváno s větším odstupem (ø ${daysInterval} dnů). Model ukazuje na obvyklý slot v ${peakHour}:00.`;
    } else {
       // Frequent intra-day user
       const rawExpectedMs = lastDose.timestamp + recentAvgIntervalMs;
       const nextExpectedDate = new Date(rawExpectedMs);
       if (rawExpectedMs < Date.now()) {
          predictedNextDoseTime = "Očekáváno nyní / Zpoždění";
          predictionStatusColor = "text-md3-orange";
          predictionReason = `Nejbližší intra-denní okno již proběhlo (frekvence cca ${(recentAvgIntervalMs / 3600000).toFixed(1)}h).`;
       } else {
          const h = nextExpectedDate.getHours();
          const m = nextExpectedDate.getMinutes() < 30 ? "00" : "30";
          const isTomm = nextExpectedDate.getDate() !== new Date().getDate();
          predictedNextDoseTime = `${isTomm ? 'Zítra' : 'Dnes'} v ${h}:${m}`;
          predictionReason = `Extrapolace nedávné vnitrodenní hustoty (cca ${(recentAvgIntervalMs / 3600000).toFixed(1)}h mezi dávkami).`;
       }
    }

    // AI Behavioral Pattern Recognition
    let weekendDoses = 0, weekdayDoses = 0;
    let morningDoses = 0, eveningDoses = 0;
    
    // Streak calculations
    const uniqueDays = Array.from(new Set(sDoses.map(d => new Date(d.timestamp).setHours(0,0,0,0)))).sort();
    let maxStreak = 0;
    let currentStreak = 0;
    let tempStreak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
        const diff = Math.round((uniqueDays[i] - uniqueDays[i-1]) / 86400000);
        if (diff === 1) tempStreak++;
        else tempStreak = 1;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
    }
    if (uniqueDays.length === 1) maxStreak = 1;

    // Is current streak active?
    const today0 = new Date().setHours(0,0,0,0);
    const lastDay = uniqueDays[uniqueDays.length-1];
    if (lastDay === today0 || lastDay === today0 - 86400000) {
        currentStreak = 1;
        for (let i = uniqueDays.length - 2; i >= 0; i--) {
            if (Math.round((uniqueDays[i+1] - uniqueDays[i]) / 86400000) === 1) currentStreak++;
            else break;
        }
    }

    // Time Drift Calculation
    let timeDrift = 0;
    let timeDriftText = "Stabilní";
    if (sDoses.length >= 10) {
        const recent = sDoses.slice(-5).reduce((acc, d) => acc + new Date(d.timestamp).getHours() + (new Date(d.timestamp).getMinutes()/60), 0) / 5;
        const older = sDoses.slice(sDoses.length - 10, sDoses.length - 5).reduce((acc, d) => acc + new Date(d.timestamp).getHours() + (new Date(d.timestamp).getMinutes()/60), 0) / 5;
        timeDrift = recent - older;
        if (timeDrift > 1) timeDriftText = `Posun o +${timeDrift.toFixed(1)}h (Později)`;
        else if (timeDrift < -1) timeDriftText = `Posun o ${timeDrift.toFixed(1)}h (Dříve)`;
    }

    sDoses.forEach(d => {
       const date = new Date(d.timestamp);
       const day = date.getDay();
       const hour = date.getHours();
       
       if (day === 0 || day === 6 || (day === 5 && hour >= 18)) weekendDoses++;
       else weekdayDoses++;
       
       if (hour >= 6 && hour < 14) morningDoses++;
       else if (hour >= 18 || hour < 4) eveningDoses++;
    });

    const weekendPct = Math.round((weekendDoses / sDoses.length) * 100) || 0;
    const morningPct = Math.round((morningDoses / sDoses.length) * 100) || 0;
    const eveningPct = Math.round((eveningDoses / sDoses.length) * 100) || 0;

    let usePatternStr = 'Neurčitý';
    if (weekendPct > 60) usePatternStr = 'Víkendový rekreační mód';
    else if (weekdayDoses > weekendDoses * 3) usePatternStr = 'Pracovní / Denní rutinní užívání';
    else usePatternStr = 'Rovnoměrné (Denní užívání)';
    
    // Trend escalation & Dependency Risk check
    let trendEscalation = 'Stabilní (Žádná eskalace)';
    let trendColor = 'text-emerald-500';
    let riskLevel = 'Nízké';
    let riskColorbg = 'bg-emerald-500/10 border-emerald-500/20';
    let dependencyScore = 15; // Base minimum risk
    let dependencyReason = "Stabilní a příležitostné užívání.";

    if (sDoses.length >= 10) {
       const recentHalf = sDoses.slice(-5);
       const oldHalf = sDoses.slice(-10, -5);
       
       let recentIntervals = 0, oldIntervals = 0;
       for(let i=0; i<4; i++) {
           recentIntervals += (recentHalf[i+1].timestamp - recentHalf[i].timestamp);
           oldIntervals += (oldHalf[i+1].timestamp - oldHalf[i].timestamp);
       }
       
       // Calculate an acceleration ratio (lower means faster)
       const ratio = recentIntervals / Math.max(1, oldIntervals);
       
       if (ratio < 0.6 || currentStreak >= 7) {
           trendEscalation = 'Kritická eskalace frekvence (Varování)';
           trendColor = 'text-rose-500';
           riskLevel = 'Vysoké';
           riskColorbg = 'bg-rose-500/10 border-rose-500/20';
           dependencyScore = ratio < 0.4 ? 90 : 75;
           dependencyReason = "Zkracování intervalů mezi dávkami a silná progrese sekvence užívání.";
       } else if (ratio < 0.85 || currentStreak >= 3) {
           trendEscalation = 'Mírná eskalace užívání';
           trendColor = 'text-md3-orange';
           riskLevel = 'Střední';
           riskColorbg = 'bg-md3-orange/10 border-md3-orange/20';
           dependencyScore = ratio < 0.7 ? 60 : 45;
           dependencyReason = "Postupně se zvyšující frekvence užívání s náznaky habituace.";
       } else if (ratio > 1.3) {
           trendEscalation = 'Zpomalení frekvence (Tapering)';
           trendColor = 'text-md3-primary';
           riskLevel = 'Minimální';
           riskColorbg = 'bg-md3-primary/10 border-md3-primary/20';
           dependencyScore = 20;
           dependencyReason = "Aktivní snižování dávkování nebo pozvolné protahování pauz.";
       }
       
       // Modifier for multi-dosing today
       const dosesInLast24h = sDoses.filter(d => d.timestamp > Date.now() - 86400000).length;
       if (dosesInLast24h > 3) dependencyScore = Math.min(100, dependencyScore + 20);
    } else if (sDoses.length > 3 && sDoses.length < 10) {
       trendEscalation = 'Zatím krátkodobý profil';
       trendColor = 'text-md3-gray';
       riskColorbg = 'bg-theme-subtle border-theme-border';
       dependencyScore = 15;
    }

    // Time to washout (Clearance Prediction)
    const halfLifeH = selectedSubstance.halfLife || 12;
    const timeToClearanceMs = halfLifeH * 5.5 * 3600000;
    const estimatedClearanceDate = new Date(lastDose.timestamp + timeToClearanceMs);
    let clearanceText = estimatedClearanceDate.getTime() < Date.now() ? "Již čistý" : `${estimatedClearanceDate.toLocaleDateString('cs-CZ')} v ${estimatedClearanceDate.getHours()}:00`;

    return {
       medianDailyDoseRaw,
       avgDailyConsumptionGlobal,
       recentAvgIntervalMs,
       peakHour,
       lastDose,
       predictedNextAmount,
       avgCostPerWeek,
       projectedCost3Months,
       stashDaysLeft,
       projectedStashZero,
       weekendPct,
       morningPct,
       eveningPct,
       usePatternStr,
       trendEscalation,
       trendColor,
       riskLevel,
       riskColorbg,
       predictedNextDoseTime,
       predictionReason,
       predictionStatusColor,
       currentStreak,
       maxStreak,
       timeDriftText,
       timeDrift,
       dependencyScore,
       dependencyReason,
       clearanceText
    };

  }, [selectedSubstance, sDoses]);

  // -- 48h Micro Kinetics --
  const kineticsData48h = useMemo(() => {
    if (!selectedSubstance || !predictionMetrics) return [];
    
    const { recentAvgIntervalMs, predictedNextAmount, lastDose } = predictionMetrics;
    const projectionDoses = [...sDoses];
    const FUTURE_WINDOW_HOURS = 48;
    const intervalSafe = Math.max(recentAvgIntervalMs, 3600000); // minimum 1h interval
    let projectedTime = (recentAvgIntervalMs > 86400000 && lastDose.timestamp < Date.now() - 86400000) 
         ? Date.now() + 3600000 
         : Math.max(lastDose.timestamp + intervalSafe, Date.now() + 1800000);
     
    while (projectedTime < Date.now() + FUTURE_WINDOW_HOURS * 3600000) {
       projectionDoses.push({
          id: `simulated-${projectedTime}`,
          substanceId: selectedSubstance.id,
          amount: predictedNextAmount,
          timestamp: projectedTime,
          isSimulated: true
       } as any);
       projectedTime += intervalSafe;
    }

    const startTime = Date.now() - 24 * 3600000;
    const endTime = Date.now() + FUTURE_WINDOW_HOURS * 3600000;
    const points = 100;
    const step = (endTime - startTime) / points;
    const peak = calculatePeakSubstanceLevel(selectedSubstance.id, projectionDoses, substances, settings, startTime, endTime);

    const data = [];
    for(let i=0; i<=points; i++) {
       const t = startTime + (step * i);
       const isFuture = t > Date.now();
       const rawLevel = calculateSubstanceLevelAtTime(selectedSubstance.id, t, substances, projectionDoses, settings);
       data.push({
          timeTs: t,
          timeStr: new Date(t).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
          dateStr: new Date(t).toLocaleDateString('cs-CZ', { weekday: 'short' }),
          realStatus: isFuture ? 0 : (rawLevel/peak)*100,
          predictedStatus: isFuture ? (rawLevel/peak)*100 : 0
       });
    }
    return data;
  }, [selectedSubstance, predictionMetrics, sDoses, settings, substances]);

  // -- 14D Tolerance & Stash Burn Model --
  const modelData14d = useMemo(() => {
    if (!selectedSubstance || !predictionMetrics) return [];
    
    const data = [];
    const { avgDailyConsumptionGlobal, stashDaysLeft, avgCostPerWeek } = predictionMetrics;
    const currentStash = (selectedSubstance as any).stash || 0;
    const costPerDay = avgCostPerWeek / 7;

    for (let i = 0; i <= 14; i++) {
       const futureTime = Date.now() + (i * 86400000);
       const tol = calculateTolerance(selectedSubstance.id, substances, doses, futureTime);
       
       // Calculate remaining stash for this projected day
       let projectedStash = currentStash - (avgDailyConsumptionGlobal * i);
       if (projectedStash < 0) projectedStash = 0;
       
       data.push({
          day: i === 0 ? 'Dnes' : `+${i}d`,
          tolerance: tol.toFixed(1),
          stash: currentStash > 0 ? projectedStash.toFixed(2) : undefined,
          cost: Math.round(costPerDay * i)
       });
    }
    return data;
  }, [selectedSubstance, predictionMetrics, substances, doses]);

  // -- 7D Probability Model --
  const probData7d = useMemo(() => {
     if (!selectedSubstance || !predictionMetrics || sDoses.length < 5) return [];
     
     // Baseline probabilities by Day of Week 
     const dayFreq = [0,0,0,0,0,0,0];
     sDoses.forEach(d => dayFreq[new Date(d.timestamp).getDay()]++);
     const maxFreq = Math.max(...dayFreq) || 1;
     
     const prob7d = [];
     for(let i=0; i<7; i++) {
        const date = new Date(Date.now() + i * 86400000);
        const dow = date.getDay();
        
        // Quasi-probability 0-100%
        const userDowProb = (dayFreq[dow] / maxFreq); 
        // Overall frequency weighting using recent avg
        const overallFreq = Math.min(1, 1 / Math.max(1, (predictionMetrics.recentAvgIntervalMs / 86400000)));
        
        let finalProb = userDowProb * overallFreq * 100;
        
        // Boost day if our Next Dose Predictor flagged it
        const localizedDateStr = date.toLocaleDateString('cs-CZ');
        if (
            predictionMetrics.predictedNextDoseTime.includes(localizedDateStr) || 
            (i === 0 && predictionMetrics.predictedNextDoseTime.includes('Dnes')) || 
            (i === 1 && predictionMetrics.predictedNextDoseTime.includes('Zítra'))
        ) {
           finalProb = Math.max(finalProb, 85);
        }
        
        // Normalize
        finalProb = Math.min(100, Math.max(0, finalProb));
        
        prob7d.push({
           name: i === 0 ? 'Dnes' : i === 1 ? 'Zítra' : date.toLocaleDateString('cs-CZ', {weekday: 'short'}),
           probability: Math.round(finalProb)
        });
     }
     return prob7d;
  }, [selectedSubstance, predictionMetrics, sDoses]);

  // -- Intraday 24H Probability Model --
  const probData24h = useMemo(() => {
     if (!selectedSubstance || sDoses.length < 5) return [];

     const hourBuckets: Record<number, number> = {};
     sDoses.forEach(d => {
        const h = new Date(d.timestamp).getHours();
        hourBuckets[h] = (hourBuckets[h] || 0) + 1;
     });
     
     const maxFreq = Math.max(...Object.values(hourBuckets), 1);
     const currentHour = new Date().getHours();
     
     const prob24h = [];
     for(let i=0; i<24; i++) {
        const rawProb = ((hourBuckets[i] || 0) / maxFreq) * 100;
        prob24h.push({
           hour: `${i}:00`,
           isCurrent: i === currentHour,
           probability: Math.round(rawProb)
        });
     }
     return prob24h;
  }, [selectedSubstance, sDoses]);

  // -- 3M Macro Moving Averages --
  const trendData3m = useMemo(() => {
     if (!selectedSubstance || sDoses.length < 5) return [];

     // Start from 3 months ago up to today
     const START = Date.now() - (90 * 86400000);
     const relevant = sDoses.filter(d => d.timestamp >= START);
     if(relevant.length === 0) return [];

     const weeklyTotals: Record<string, number> = {};
     relevant.forEach(d => {
        // Group by ISO week conceptually by chunking dates
        const date = new Date(d.timestamp);
        const ww = `${date.getFullYear()}-W${Math.ceil((date.getDate() - date.getDay() + 1) / 7)}`; // Rough week
        if (!weeklyTotals[ww]) weeklyTotals[ww] = 0;
        weeklyTotals[ww] += d.amount;
     });

     const data = Object.keys(weeklyTotals).map(k => ({
        week: k,
        amount: weeklyTotals[k]
     }));
     
     // Calculate linear regression (trend line)
     if (data.length > 1) {
         let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
         data.forEach((d, i) => {
             sumX += i;
             sumY += d.amount;
             sumXY += i * d.amount;
             sumXX += i * i;
         });
         const slope = (data.length * sumXY - sumX * sumY) / (data.length * sumXX - sumX * sumX);
         const intercept = (sumY - slope * sumX) / data.length;

         data.forEach((d, i) => {
             (d as any).trend = slope * i + intercept;
         });
     }

     return data;
  }, [selectedSubstance, sDoses]);

  if (!settings.insightEngine) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full text-center space-y-4">
        <Cpu size={48} className="text-md3-gray opacity-30" />
        <h2 className="text-xl font-black text-theme-text">ML Insight Engine je vypnutý</h2>
        <p className="text-sm border-theme-border font-medium text-md3-gray max-w-[250px]">
           Predikční modely vyžadují aktivaci AI Insight Enginu v nastavení (karta Systém).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
       <div className="flex items-center gap-3 px-1 mb-2">
         <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
           <Cpu size={24} strokeWidth={2.5} />
         </div>
         <div>
           <h1 className="text-2xl font-black text-theme-text tracking-tight flex items-center gap-2">
             Laboratoř Predikcí
           </h1>
           <p className="text-xs text-md3-gray font-bold uppercase tracking-widest mt-0.5">
             Chytré Sledování & Behaviorální Analýza
           </p>
         </div>
       </div>

       {activeSubstances.length === 0 ? (
          <div className="md3-card p-8 flex flex-col items-center justify-center text-center">
            <Database size={32} className="text-md3-gray mb-4 opacity-50" />
            <p className="text-md3-gray font-medium">Nemáte dostatek záznamů pro spuštění prediktivních modelů.</p>
          </div>
       ) : (
         <>
           {/* Substance Selector */}
           <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar px-1">
             {activeSubstances.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubstanceId(sub.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    selectedSubstanceId === sub.id 
                      ? "bg-theme-text text-theme-bg shadow-md" 
                      : "bg-theme-card border border-theme-border text-md3-gray hover:text-theme-text"
                  )}
                >
                  {sub.name}
                </button>
             ))}
           </div>

           {selectedSubstance && sDoses.length >= 3 && predictionMetrics ? (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               key={selectedSubstance.id}
               className="space-y-4 z-10"
             >
                {/* At a Glance Summaries */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   <div className="md3-card p-4 relative overflow-hidden group">
                      <div className="absolute -right-3 -bottom-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                         <Activity size={80} />
                      </div>
                      <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-1">Typická denní dávka</div>
                      <div className="text-2xl font-black text-theme-text mb-1">{formatAmount(predictionMetrics.medianDailyDoseRaw, selectedSubstance.unit, 1)}</div>
                      <div className="text-[9px] font-bold text-md3-gray">Očištěný medián</div>
                   </div>

                   <div className="md3-card p-4 relative overflow-hidden group">
                      <div className="absolute -right-3 -bottom-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                         <Clock size={80} />
                      </div>
                      <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-1">Průměrný Rozestup</div>
                      <div className="text-xl font-black text-theme-text mb-1">
                         {(predictionMetrics.recentAvgIntervalMs / 3600000).toFixed(1)} <span className="text-xs">h</span>
                      </div>
                      <div className="text-[9px] font-bold text-md3-gray">AI extrapolace</div>
                   </div>

                   <div className="md3-card p-4 relative overflow-hidden group">
                      <div className="absolute -right-3 -bottom-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                         <Wallet size={80} />
                      </div>
                      <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-1">Cena za Qurtál</div>
                      <div className="text-xl font-black text-theme-text mb-1">
                         {predictionMetrics.projectedCost3Months > 0 ? `${predictionMetrics.projectedCost3Months.toLocaleString('cs-CZ')} Kč` : '—'}
                      </div>
                      <div className="text-[9px] font-bold text-md3-gray uppercase text-md3-orange">90denní Projekce</div>
                   </div>

                   <div className="md3-card p-4 relative overflow-hidden group">
                      <div className="absolute -right-3 -bottom-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                         <AlertTriangle size={80} />
                      </div>
                      <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-1">Zásoba dojde</div>
                      <div className="text-xl font-black text-theme-text mb-1">
                         {predictionMetrics.stashDaysLeft && predictionMetrics.stashDaysLeft < 365 
                           ? `Za ${predictionMetrics.stashDaysLeft.toFixed(0)} dní` 
                           : '> 1 ROK'}
                      </div>
                      <div className="text-[9px] font-bold text-md3-gray uppercase text-md3-green">Simulace Burn Rate</div>
                   </div>
                </div>

                <div className="md3-card p-4 flex flex-col md:flex-row md:items-center gap-4">
                   <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", predictionMetrics.predictionStatusColor.replace('text-', 'bg-').replace('-500', '-500/10'))}>
                      <Clock size={20} className={predictionMetrics.predictionStatusColor} />
                   </div>
                   <div className="flex-1">
                      <div className="text-[10px] uppercase font-black text-md3-gray tracking-widest mb-1">Predikce nejbližší dávky</div>
                      <div className={cn("text-lg font-black mb-1 leading-tight", predictionMetrics.predictionStatusColor)}>
                         {predictionMetrics.predictedNextDoseTime} <span className="opacity-70 text-sm ml-1">({formatAmount(predictionMetrics.predictedNextAmount, selectedSubstance.unit, 1)})</span>
                      </div>
                      <div className="text-xs font-bold text-md3-gray leading-snug">{predictionMetrics.predictionReason}</div>
                   </div>
                </div>

                {/* Main Prediction Terminal */}
                <div className="md3-card overflow-hidden">
                    <div className="border-b border-theme-border bg-theme-bg p-2 flex overflow-x-auto hide-scrollbar gap-2">
                       {[{ id: 'intraday', label: 'Den (24H)' }, { id: '48h', label: 'Mikro (48H)' }, { id: '7d', label: 'Týden (7D)' }, { id: '14d', label: 'Makro (14D)' }, { id: '3m', label: 'Trendy (3M)' }].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setTimeframe(opt.id as any)}
                            className={cn(
                               "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                               timeframe === opt.id ? "bg-md3-primary/20 text-md3-primary" : "text-md3-gray hover:text-theme-text"
                            )}
                          >
                             {opt.label}
                          </button>
                       ))}
                    </div>

                    <div className="p-4">
                       <AnimatePresence mode="wait">
                          {timeframe === 'intraday' && (
                             <motion.div key="intraday" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                                <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest flex items-center gap-1 mb-2">
                                   <Clock size={12} className="text-md3-primary" /> Cirkadiánní Model (Pravděpodobnost Intraday)
                                </div>
                                {probData24h.length < 2 ? (
                                   <div className="h-56 flex items-center justify-center text-sm text-md3-gray font-medium italic">Nedostatek dat pro výpočet intraday.</div>
                                ) : (
                                   <>
                                      <div className="h-56 w-full">
                                          <ResponsiveContainer width="100%" height="100%">
                                             <BarChart data={probData24h} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <XAxis dataKey="hour" tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} tickLine={false} axisLine={false} interval={2} />
                                                <YAxis tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                                                <Tooltip 
                                                  cursor={{ fill: 'var(--md3-border)', opacity: 0.4 }}
                                                  contentStyle={{ backgroundColor: 'var(--md3-card)', borderColor: 'var(--md3-border)', borderRadius: '12px', fontSize: '10px' }}
                                                  labelStyle={{ color: '#8e8e93', fontWeight: 800 }}
                                                  formatter={(val: number) => [`${val}%`, 'Pravděpodobnost']}
                                                />
                                                <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
                                                  {probData24h.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.isCurrent ? '#0a84ff' : (selectedSubstance.color || '#a855f7')} opacity={entry.isCurrent ? 1 : 0.6} />
                                                  ))}
                                                </Bar>
                                             </BarChart>
                                          </ResponsiveContainer>
                                      </div>
                                      <div className="bg-theme-bg p-3 rounded-xl border border-theme-border text-xs text-md3-gray font-medium border-l-4 border-l-md3-primary">
                                         Graf ukazuje historicky nejčastější hodiny vaší konzumace. Sloupec se 100% ukazuje hodinu s největším množstvím zkonzumovaných dávek a určuje tak váš Peak (Vrchol dne). Zvýrazněný sloupec představuje aktuální hodinu.
                                      </div>
                                   </>
                                )}
                             </motion.div>
                          )}

                          {timeframe === '48h' && (
                             <motion.div key="48h" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                                <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest flex items-center gap-1 mb-2">
                                   <TrendingUp size={12} className="text-md3-primary" /> Modelovaná Projekce v Krvi (Minulost vs Předpověď)
                                </div>
                                <div className="h-56 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={kineticsData48h}>
                                        <defs>
                                          <linearGradient id="colorRealP" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={selectedSubstance.color || '#0a84ff'} stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor={selectedSubstance.color || '#0a84ff'} stopOpacity={0}/>
                                          </linearGradient>
                                          <linearGradient id="colorPredP" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ff9f0a" stopOpacity={0.5}/>
                                            <stop offset="95%" stopColor="#ff9f0a" stopOpacity={0}/>
                                          </linearGradient>
                                        </defs>
                                        <XAxis dataKey="timeStr" tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 800 }} minTickGap={30} tickLine={false} axisLine={false} />
                                        <YAxis hide domain={[0, 110]} />
                                        <Tooltip 
                                          contentStyle={{ backgroundColor: 'var(--md3-card)', borderColor: 'var(--md3-border)', borderRadius: '12px', fontSize: '10px' }}
                                          labelStyle={{ color: '#8e8e93', fontWeight: 800, marginBottom: '4px' }}
                                          itemStyle={{ color: 'var(--theme-text)', fontWeight: 800, padding: 0 }}
                                          formatter={(val: number) => [`${val.toFixed(1)}% z Maxima`, "Saturace"]}
                                          labelFormatter={(l, p) => p[0]?.payload.dateStr + ' ' + l}
                                        />
                                        <Area type="monotone" dataKey="realStatus" stroke={selectedSubstance.color || '#0a84ff'} fill="url(#colorRealP)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="predictedStatus" stroke="#ff9f0a" strokeDasharray="3 3" fill="url(#colorPredP)" strokeWidth={2} />
                                        
                                        <ReferenceLine x={kineticsData48h.find(d => d.timeTs > Date.now())?.timeStr} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" label={{ position: 'top', value: 'START PŘEDPOVĚDI', fill: '#8e8e93', fontSize: 9 }} />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-theme-bg p-3 rounded-xl border border-theme-border text-xs text-md3-gray font-medium">
                                   Simulace 48 hodin využívá matematický model rozkladu společně s AI odhadem vašich nejbližších dávek a frekvence.
                                </div>
                             </motion.div>
                          )}

                          {timeframe === '7d' && (
                             <motion.div key="7d" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                                <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest flex items-center gap-1 mb-2">
                                   <Calendar size={12} className="text-md3-primary" /> Pravděpodobnost Užívání (Zítra a dalších 6 dní)
                                </div>
                                <div className="h-56 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={probData7d} margin={{top: 20}}>
                                        <XAxis dataKey="name" tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} tickLine={false} axisLine={false} />
                                        <YAxis hide domain={[0, 100]} />
                                        <Tooltip 
                                          cursor={false}
                                          contentStyle={{ backgroundColor: 'var(--md3-card)', borderColor: 'var(--md3-border)', borderRadius: '12px', fontSize: '10px' }}
                                          labelStyle={{ color: '#8e8e93', fontWeight: 800 }}
                                          formatter={(val: number) => [`${val}%`, "Pravděpodobnost"]}
                                        />
                                        <Bar dataKey="probability" radius={[6, 6, 0, 0]}>
                                           {probData7d.map((entry, index) => (
                                             <Cell key={`cell-${index}`} fill={entry.probability > 70 ? '#ff453a' : entry.probability > 40 ? '#ff9f0a' : '#0a84ff'} />
                                           ))}
                                        </Bar>
                                      </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-theme-bg p-3 rounded-xl border border-theme-border text-xs text-md3-gray font-medium border-l-4 border-l-md3-primary">
                                   Tato tepelná mapa kombinuje Vaši četnost, preference konkrétních dnů a váhu extrapolované další dávky do spojité %.
                                </div>
                             </motion.div>
                          )}

                          {timeframe === '14d' && (
                             <motion.div key="14d" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                                <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest flex items-center gap-1 mb-2">
                                   <Calendar size={12} className="text-emerald-500" /> Projekce Tolerance & Zásoby
                                </div>
                                <div className="h-56 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={modelData14d}>
                                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />
                                         <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} dy={5} />
                                         <YAxis yAxisId="left" hide domain={[0, 100]} />
                                         <YAxis yAxisId="right" orientation="right" hide />
                                         <YAxis yAxisId="cost" orientation="right" hide />
                                         <Tooltip 
                                            contentStyle={{ backgroundColor: 'var(--md3-card)', borderColor: 'var(--md3-border)', borderRadius: '12px', fontSize: '10px' }}
                                            labelStyle={{ color: '#8e8e93', fontWeight: 800, marginBottom: '4px' }}
                                         />
                                         <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                         <Line yAxisId="left" type="monotone" name="Zátěž Tolerance (%)" dataKey="tolerance" stroke="#ff453a" strokeWidth={3} dot={false} />
                                         {modelData14d[0]?.stash !== undefined && (
                                            <Line yAxisId="right" type="monotone" name={`Zásoba (${selectedSubstance.unit})`} dataKey="stash" stroke="#0a84ff" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                                         )}
                                         {modelData14d[0]?.cost !== undefined && (
                                            <Line yAxisId="cost" type="monotone" name="Kumulativní útrata" dataKey="cost" stroke="#32d74b" strokeDasharray="3 3" strokeWidth={2} dot={false} />
                                         )}
                                       </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-theme-bg p-3 rounded-xl border border-theme-border text-xs text-md3-gray font-medium border-l-4 border-l-emerald-500">
                                   Model zachycuje pravděpodobnou křivku neurochemické nálože těla, pokud budete pokračovat ve vašem aktuálním {predictionMetrics.avgDailyConsumptionGlobal.toFixed(1)}{selectedSubstance.unit} denním tempu.
                                </div>
                             </motion.div>
                          )}

                          {timeframe === '3m' && (
                             <motion.div key="3m" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                                <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest flex items-center gap-1 mb-2">
                                   <Brain size={12} className="text-purple-500" /> Týdenní Kumulace (Trend za poslední 3 Měsíce)
                                </div>
                                {trendData3m.length < 2 ? (
                                   <div className="h-56 flex items-center justify-center text-sm text-md3-gray font-medium italic">Nedostatek dat pro Qurtální trendovou analýzu.</div>
                                ) : (
                                   <>
                                      <div className="h-56 w-full">
                                          <ResponsiveContainer width="100%" height="100%">
                                             <BarChart data={trendData3m}>
                                                <XAxis dataKey="week" tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} tickLine={false} axisLine={false} />
                                                <YAxis hide />
                                                <Tooltip 
                                                  contentStyle={{ backgroundColor: 'var(--md3-card)', borderColor: 'var(--md3-border)', borderRadius: '12px', fontSize: '10px' }}
                                                  labelStyle={{ color: '#8e8e93', fontWeight: 800 }}
                                                />
                                                <Bar dataKey="amount" fill={selectedSubstance.color || '#a855f7'} radius={[4, 4, 0, 0]} name={`Množství (${selectedSubstance.unit})`} />
                                                <Line type="monotone" dataKey="trend" stroke="#ff9f0a" strokeWidth={3} dot={false} name="Regresní Trend" />
                                             </BarChart>
                                          </ResponsiveContainer>
                                      </div>
                                      <div className="bg-theme-bg p-3 rounded-xl border border-theme-border text-xs text-md3-gray font-medium border-l-4 border-l-purple-500">
                                         Regresní analýza ukazuje celistvý dlouhodobý posun ve vaší útratě a množství. Pokud je oranžová linka stoupající, systém zaznamenal dlouhodobou eskalaci užívání.
                                      </div>
                                   </>
                                )}
                             </motion.div>
                          )}
                       </AnimatePresence>
                    </div>
                </div>

                {/* Behavioral Pattern Recognition Component */}
                {sDoses.length >= 5 && predictionMetrics && (
                   <div className="md3-card overflow-hidden mt-4">
                      <div className="px-5 py-4 border-b border-theme-border flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Eye size={16} className="text-md3-primary" />
                            <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Behaviorální Profil & Eskalace</h3>
                         </div>
                         <div className="text-[10px] uppercase font-bold text-md3-gray bg-theme-bg px-2 py-1 rounded">Insight Engine v2</div>
                      </div>
                      <div className="p-5 space-y-5">
                         <div className="flex items-start gap-4">
                            <div className={`w-1 shrink-0 self-stretch rounded-full ${predictionMetrics.trendColor.replace('text-', 'bg-')}`}></div>
                            <div className="flex-1">
                               <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-1">Dlouhodobá Trajektorie</div>
                               <div className="text-lg font-black text-theme-text leading-tight mb-1">{predictionMetrics.trendEscalation}</div>
                               <div className="flex gap-2">
                                  <div className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border", predictionMetrics.riskColorbg, predictionMetrics.trendColor)}>
                                    Riziko: {predictionMetrics.riskLevel}
                                  </div>
                               </div>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-3">
                            <div className="bg-theme-bg rounded-xl border border-theme-border p-3 flex flex-col justify-between">
                               <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-2 line-clamp-1">Aktuální Série</div>
                               <div className="text-xl font-black text-theme-text">{predictionMetrics.currentStreak} <span className="text-xs text-md3-gray font-bold uppercase tracking-widest">Dní</span></div>
                               <div className="text-[9px] text-md3-gray font-bold mt-1">Maximum: {predictionMetrics.maxStreak} dní</div>
                            </div>
                            <div className="bg-theme-bg rounded-xl border border-theme-border p-3 flex flex-col justify-between">
                               <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-2 line-clamp-1">Kategorizace Vzorce</div>
                               <div className="text-sm font-bold text-theme-text leading-tight">{predictionMetrics.usePatternStr}</div>
                            </div>
                            <div className="bg-theme-bg rounded-xl border border-theme-border p-3 flex flex-col justify-between">
                               <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-2 line-clamp-1">Vývoj Doby Užívání</div>
                               <div className="text-sm font-bold text-theme-text leading-tight">{predictionMetrics.timeDriftText}</div>
                            </div>
                            <div className="bg-theme-bg rounded-xl border border-theme-border p-3 flex flex-col justify-between">
                               <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-2 line-clamp-1">Víkendová Progrese</div>
                               <div className="text-lg font-black text-theme-text leading-none">{predictionMetrics.weekendPct}% <span className="text-[10px] text-md3-gray font-bold">akcí přes víkend</span></div>
                            </div>
                            <div className="bg-theme-bg rounded-xl border border-theme-border p-3 flex flex-col justify-between">
                               <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-2 line-clamp-1">Ranní Dávkování</div>
                               <div className="text-lg font-black text-theme-text leading-none">{predictionMetrics.morningPct}% <span className="text-[10px] text-md3-gray font-bold">dávek do 14:00</span></div>
                            </div>
                            <div className="bg-theme-bg rounded-xl border border-theme-border p-3 flex flex-col justify-between">
                               <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-2 line-clamp-1">Večer / Noc</div>
                               <div className="text-lg font-black text-theme-text leading-none">{predictionMetrics.eveningPct}% <span className="text-[10px] text-md3-gray font-bold">dávek po 18:00</span></div>
                            </div>
                         </div>
                      </div>
                   </div>
                )}

             </motion.div>
           ) : (
             <div className="text-center p-8 border border-theme-border rounded-xl bg-theme-subtle">
                <Lightbulb size={24} className="text-md3-gray mx-auto mb-3" />
                <div className="text-theme-text font-black text-lg">Nedostatek Dat</div>
                <div className="text-md3-gray text-sm mt-1">K výpočtu chytrých modelů jsou vyžadovány alespoň 3 záznamy dané látky.</div>
             </div>
           )}
         </>
       )}
    </div>
  );
}
