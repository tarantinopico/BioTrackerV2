import { Dose } from '../types';

export interface CorrelationResult {
  x: number;
  y: number;
}

export interface CorrelationBin {
  label: string;
  avgX: number;
  avgY: number;
  count: number;
}

export interface SubstanceCorrelation {
  substanceId: string;
  substanceName: string;
  unit: string;
  gapVsDoseBins: CorrelationBin[]; 
  doseVsNextGapBins: CorrelationBin[]; 
  firstDoseVsDailyTotalBins: CorrelationBin[]; 
  timeOfDayVsDoseBins: CorrelationBin[];
  dayOfWeekVsTotalBins: CorrelationBin[];
  streakVsDoseBins: CorrelationBin[];
  intraDayDoseIndexBins: CorrelationBin[];
  trendGapVsDose: 'positive' | 'negative' | 'neutral'; 
  trendDoseVsNextGap: 'positive' | 'negative' | 'neutral'; 
  trendFirstDose: 'positive' | 'negative' | 'neutral';
  dataPointsCount: number;
}

export interface CrossCorrelationResult {
  substanceIdA: string;
  substanceNameA: string;
  substanceIdB: string;
  substanceNameB: string;
  bins: CorrelationBin[];
  trend: 'positive' | 'negative' | 'neutral';
  strength: number; 
}

export interface CorrelationAnalysisData {
  substanceCorrelations: SubstanceCorrelation[];
  crossCorrelations: CrossCorrelationResult[];
}

function createBin(points: CorrelationResult[], label: string): CorrelationBin {
  const sumX = points.reduce((s,p) => s + p.x, 0);
  const sumY = points.reduce((s,p) => s + p.y, 0);
  return {
    label,
    avgX: points.length ? sumX / points.length : 0,
    avgY: points.length ? sumY / points.length : 0,
    count: points.length
  };
}

function binDataDynamic(points: CorrelationResult[], binCount: number, formatLabel: (min: number, max: number) => string): CorrelationBin[] {
   if (points.length < 2) return [];
   const minX = Math.min(...points.map(p => p.x));
   const maxX = Math.max(...points.map(p => p.x));
   
   if (maxX === minX) return [createBin(points, formatLabel(minX, minX))];

   const step = (maxX - minX) / binCount;
   const bins: CorrelationBin[] = [];

   for (let i = 0; i < binCount; i++) {
     const start = minX + i * step;
     const end = i === binCount - 1 ? maxX : start + step;
     const inside = points.filter(p => p.x >= start && (i === binCount - 1 ? p.x <= end : p.x < end));
     if (inside.length > 0) {
        bins.push(createBin(inside, formatLabel(start, end)));
     }
   }
   return bins;
}

function binDataCategorical(points: CorrelationResult[], categories: {min: number, max: number, label: string}[]): CorrelationBin[] {
   const bins: CorrelationBin[] = [];
   for (const cat of categories) {
     const inside = points.filter(p => p.x >= cat.min && p.x < cat.max);
     if (inside.length > 0) {
       bins.push(createBin(inside, cat.label));
     }
   }
   return bins;
}

export function generateCorrelations(doses: Dose[], getSubstanceName: (id: string) => string, getSubstanceUnit: (id: string) => string, sensitivity: number = 50, binCountSetting: number = 5): CorrelationAnalysisData {
  const correlations: SubstanceCorrelation[] = [];
  const crossCorrelations: CrossCorrelationResult[] = [];
  
  const threshold = 0.15 - (sensitivity / 100) * 0.14; 
  const binCount = Math.max(2, Math.min(10, binCountSetting)); // ensure realistic clamp

  function calculateTrend(points: CorrelationResult[]): 'positive' | 'negative' | 'neutral' {
    if (points.length < 3) return 'neutral';
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = points.length;
    
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }
    
    const div = (n * sumXX - sumX * sumX);
    if (div === 0) return 'neutral';
    const slope = (n * sumXY - sumX * sumY) / div;
    
    const avgY = sumY / n;
    const normalizedSlope = avgY === 0 ? 0 : slope / avgY;

    if (normalizedSlope > threshold) return 'positive';
    if (normalizedSlope < -threshold) return 'negative';
    return 'neutral';
  }
  
  const bySubstance = doses.reduce((acc, dose) => {
    if (!acc[dose.substanceId]) acc[dose.substanceId] = [];
    acc[dose.substanceId].push(dose);
    return acc;
  }, {} as Record<string, Dose[]>);

  for (const [substanceId, subsDoses] of Object.entries(bySubstance)) {
    subsDoses.sort((a, b) => a.timestamp - b.timestamp);
    if (subsDoses.length < 5) continue;
    
    const gapVsDoseSize: CorrelationResult[] = [];
    const doseSizeVsNextGap: CorrelationResult[] = [];
    const firstDoseVsDailyTotal: CorrelationResult[] = [];
    const timeOfDayVsDose: CorrelationResult[] = [];
    const dayOfWeekVsTotal: CorrelationResult[] = [];
    const streakVsDose: CorrelationResult[] = [];
    const intraDayIndexVsDose: CorrelationResult[] = [];

    // Gap vs Dose Size / Dose Size vs Next Gap
    for (let i = 1; i < subsDoses.length; i++) {
        const prev = subsDoses[i - 1];
        const current = subsDoses[i];
        
        const gapMs = current.timestamp - prev.timestamp;
        const gapHours = gapMs / (1000 * 60 * 60);
        
        if (gapHours > 24 * 7) continue;

        gapVsDoseSize.push({ x: gapHours, y: current.amount });
        doseSizeVsNextGap.push({ x: prev.amount, y: gapHours });
    }

    // Time of Day
    for (const d of subsDoses) {
        const hour = new Date(d.timestamp).getHours();
        timeOfDayVsDose.push({ x: hour, y: d.amount });
    }

    // Daily Grouping
    const byDay = subsDoses.reduce((acc, dose) => {
        const date = new Date(dose.timestamp);
        const dayStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!acc[dayStr]) acc[dayStr] = { doses: [], dateObj: date };
        acc[dayStr].doses.push(dose);
        return acc;
    }, {} as Record<string, { doses: Dose[], dateObj: Date }>);

    let streak = 0;
    let lastDate: Date | null = null;
    const sortedDays = Object.values(byDay).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    for (const dayData of sortedDays) {
        const dayDoses = dayData.doses;
        const total = dayDoses.reduce((sum, d) => sum + d.amount, 0);

        // Day of Week
        const dow = dayData.dateObj.getDay(); 
        const dowAdjusted = dow === 0 ? 7 : dow; // 1=Mon ... 7=Sun
        dayOfWeekVsTotal.push({ x: dowAdjusted, y: total });

        // Streak logic
        if (lastDate) {
            const diffDays = Math.round((dayData.dateObj.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) streak++;
            else streak = 1;
        } else {
            streak = 1;
        }
        streakVsDose.push({ x: streak, y: total });
        lastDate = dayData.dateObj;

        // Intra-day distribution
        dayDoses.sort((a, b) => a.timestamp - b.timestamp);
        for (let i = 0; i < dayDoses.length; i++) {
           if (i > 9) break; // limit to first 10 doses of day
           intraDayIndexVsDose.push({ x: i + 1, y: dayDoses[i].amount });
        }

        // First dose vs total
        if (dayDoses.length >= 2) {
            const firstDose = dayDoses[0].amount;
            firstDoseVsDailyTotal.push({ x: firstDose, y: total });
        }
    }

    correlations.push({
        substanceId,
        substanceName: getSubstanceName(substanceId),
        unit: getSubstanceUnit(substanceId),
        gapVsDoseBins: binDataDynamic(gapVsDoseSize, binCount, (min, max) => `${min.toFixed(1)}-${max.toFixed(1)}h`),
        doseVsNextGapBins: binDataDynamic(doseSizeVsNextGap, binCount, (min, max) => `${min.toFixed(1)}-${max.toFixed(1)}`),
        firstDoseVsDailyTotalBins: binDataDynamic(firstDoseVsDailyTotal, binCount, (min, max) => `${min.toFixed(1)}-${max.toFixed(1)}`),
        timeOfDayVsDoseBins: binDataCategorical(timeOfDayVsDose, [
           { min: 0, max: 6, label: "00-06 Noc" },
           { min: 6, max: 12, label: "06-12 Ráno" },
           { min: 12, max: 18, label: "12-18 Odp." },
           { min: 18, max: 24, label: "18-24 Večer" }
        ]),
        dayOfWeekVsTotalBins: binDataCategorical(dayOfWeekVsTotal, [
           { min: 1, max: 2, label: "Po" }, { min: 2, max: 3, label: "Út" }, { min: 3, max: 4, label: "St" },
           { min: 4, max: 5, label: "Čt" }, { min: 5, max: 6, label: "Pá" }, { min: 6, max: 7, label: "So" },
           { min: 7, max: 8, label: "Ne" }
        ]),
        streakVsDoseBins: binDataDynamic(streakVsDose, Math.min(5, binCount), (min, max) => `${min.toFixed(0)}-${max.toFixed(0)} dní`),
        intraDayDoseIndexBins: binDataDynamic(intraDayIndexVsDose, Math.min(5, binCount), (min, max) => min === max ? `${Math.round(min)}. dávka` : `${Math.round(min)}-${Math.round(max)}.`),
        trendGapVsDose: calculateTrend(gapVsDoseSize),
        trendDoseVsNextGap: calculateTrend(doseSizeVsNextGap),
        trendFirstDose: calculateTrend(firstDoseVsDailyTotal),
        dataPointsCount: subsDoses.length
    });
  }

  const allDays = Array.from(new Set(doses.map(d => {
    const dt = new Date(d.timestamp);
    return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
  })));

  const dailyTotalsBySubstance: Record<string, Record<string, number>> = {};
  for (const day of allDays) {
    dailyTotalsBySubstance[day] = {};
  }
  
  for (const dose of doses) {
    const dt = new Date(dose.timestamp);
    const dayStr = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    if (!dailyTotalsBySubstance[dayStr][dose.substanceId]) {
      dailyTotalsBySubstance[dayStr][dose.substanceId] = 0;
    }
    dailyTotalsBySubstance[dayStr][dose.substanceId] += dose.amount;
  }

  const substanceIds = Object.keys(bySubstance);
  for (let i = 0; i < substanceIds.length; i++) {
    for (let j = i + 1; j < substanceIds.length; j++) {
      const subA = substanceIds[i];
      const subB = substanceIds[j];
      
      const points: CorrelationResult[] = [];
      for (const day of allDays) {
        const valA = dailyTotalsBySubstance[day][subA] || 0;
        const valB = dailyTotalsBySubstance[day][subB] || 0;
        if (valA > 0 || valB > 0) {
          points.push({ x: valA, y: valB });
        }
      }

      if (points.length < 5) continue;

      const currentTrend = calculateTrend(points);
      if (currentTrend !== 'neutral') {
        crossCorrelations.push({
          substanceIdA: subA,
          substanceNameA: getSubstanceName(subA),
          substanceIdB: subB,
          substanceNameB: getSubstanceName(subB),
          bins: binDataDynamic(points, Math.min(5, binCount), (min, max) => `${min.toFixed(1)}-${max.toFixed(1)}`),
          trend: currentTrend,
          strength: points.length
        });
      }
    }
  }

  return {
    substanceCorrelations: correlations.sort((a,b) => b.dataPointsCount - a.dataPointsCount),
    crossCorrelations: crossCorrelations.sort((a,b) => b.strength - a.strength)
  };
}
