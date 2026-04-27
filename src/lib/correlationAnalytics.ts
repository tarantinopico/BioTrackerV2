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

function binData(points: CorrelationResult[], prefix: string): CorrelationBin[] {
   if (points.length < 2) return [];
   const sorted = [...points].sort((a,b) => a.x - b.x);
   
   if (sorted.length < 6) {
      const half = Math.floor(sorted.length / 2);
      const b1 = createBin(sorted.slice(0, half), "Kratší/Menší");
      const b2 = createBin(sorted.slice(half), "Delší/Větší");
      return [b1, b2].filter(b => b.count > 0);
   }

   const third = Math.floor(sorted.length / 3);
   const b1 = createBin(sorted.slice(0, third), "Nízká/Kratší");
   const b2 = createBin(sorted.slice(third, third * 2), "Střední");
   const b3 = createBin(sorted.slice(third * 2), "Vysoká/Delší");
   return [b1, b2, b3].filter(b => b.count > 0);
}

export function generateCorrelations(doses: Dose[], getSubstanceName: (id: string) => string, getSubstanceUnit: (id: string) => string, sensitivity: number = 50): CorrelationAnalysisData {
  const correlations: SubstanceCorrelation[] = [];
  const crossCorrelations: CrossCorrelationResult[] = [];
  
  const threshold = 0.15 - (sensitivity / 100) * 0.14; 

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

    for (let i = 1; i < subsDoses.length; i++) {
        const prev = subsDoses[i - 1];
        const current = subsDoses[i];
        
        const gapMs = current.timestamp - prev.timestamp;
        const gapHours = gapMs / (1000 * 60 * 60);
        
        if (gapHours > 24 * 7) continue;

        gapVsDoseSize.push({ x: gapHours, y: current.amount });
        doseSizeVsNextGap.push({ x: prev.amount, y: gapHours });
    }

    const byDay = subsDoses.reduce((acc, dose) => {
        const date = new Date(dose.timestamp);
        const dayStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!acc[dayStr]) acc[dayStr] = [];
        acc[dayStr].push(dose);
        return acc;
    }, {} as Record<string, Dose[]>);

    for (const [day, dayDoses] of Object.entries(byDay)) {
        if (dayDoses.length < 2) continue;
        dayDoses.sort((a, b) => a.timestamp - b.timestamp);
        
        const firstDose = dayDoses[0].amount;
        const total = dayDoses.reduce((sum, d) => sum + d.amount, 0);
        
        firstDoseVsDailyTotal.push({ x: firstDose, y: total });
    }

    correlations.push({
        substanceId,
        substanceName: getSubstanceName(substanceId),
        unit: getSubstanceUnit(substanceId),
        gapVsDoseBins: binData(gapVsDoseSize, "Pauza"),
        doseVsNextGapBins: binData(doseSizeVsNextGap, "Dávka"),
        firstDoseVsDailyTotalBins: binData(firstDoseVsDailyTotal, "Dávka"),
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
          bins: binData(points, "Dávka"),
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
