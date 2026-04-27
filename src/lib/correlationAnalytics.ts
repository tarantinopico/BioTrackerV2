import { Dose } from '../types';

export interface CorrelationResult {
  x: number;
  y: number;
}

export interface SubstanceCorrelation {
  substanceId: string;
  substanceName: string;
  gapVsDoseSize: CorrelationResult[]; // x: gap in hours, y: dose size
  doseSizeVsNextGap: CorrelationResult[]; // x: dose size, y: next gap in hours
  firstDoseVsDailyTotal: CorrelationResult[]; // x: first dose, y: daily total
  trendGapVsDose: 'positive' | 'negative' | 'neutral'; // 'positive' = longer break means bigger dose
  trendDoseVsNextGap: 'positive' | 'negative' | 'neutral'; // 'positive' = bigger dose means longer break
  dataPointsCount: number;
}

export interface CrossCorrelationResult {
  substanceIdA: string;
  substanceNameA: string;
  substanceIdB: string;
  substanceNameB: string;
  points: CorrelationResult[]; // x: daily total of A, y: daily total of B
  trend: 'positive' | 'negative' | 'neutral'; // positive = taking A increases B. negative = taking A decreases B (substitution)
  strength: number; 
}

export interface CorrelationAnalysisData {
  substanceCorrelations: SubstanceCorrelation[];
  crossCorrelations: CrossCorrelationResult[];
}

export function generateCorrelations(doses: Dose[], getSubstanceName: (id: string) => string, sensitivity: number = 50): CorrelationAnalysisData {
  const correlations: SubstanceCorrelation[] = [];
  const crossCorrelations: CrossCorrelationResult[] = [];
  
  // Adjusted thresholds based on sensitivity (0-100)
  // Higher sensitivity (e.g. 100) -> lower threshold (e.g. 0.01)
  // Lower sensitivity (e.g. 0) -> higher threshold (e.g. 0.15)
  const threshold = 0.15 - (sensitivity / 100) * 0.14; 

  function calculateTrend(points: CorrelationResult[]): 'positive' | 'negative' | 'neutral' {
    if (points.length < 3) return 'neutral';
    
    // Simple linear regression to find slope
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
  
  // Group doses by substance
  const bySubstance = doses.reduce((acc, dose) => {
    if (!acc[dose.substanceId]) acc[dose.substanceId] = [];
    acc[dose.substanceId].push(dose);
    return acc;
  }, {} as Record<string, Dose[]>);

  for (const [substanceId, subsDoses] of Object.entries(bySubstance)) {
    // Sort chronologically
    subsDoses.sort((a, b) => a.timestamp - b.timestamp);
    
    if (subsDoses.length < 5) continue; // Not enough data
    
    const gapVsDoseSize: CorrelationResult[] = [];
    const doseSizeVsNextGap: CorrelationResult[] = [];
    const firstDoseVsDailyTotal: CorrelationResult[] = [];

    // Gap vs Dose and Dose vs Next Gap
    for (let i = 1; i < subsDoses.length; i++) {
        const prev = subsDoses[i - 1];
        const current = subsDoses[i];
        
        const gapMs = current.timestamp - prev.timestamp;
        const gapHours = gapMs / (1000 * 60 * 60);
        
        // Skip gaps longer than 7 days as they might be outliers or periods of abstinence
        if (gapHours > 24 * 7) continue;

        gapVsDoseSize.push({
            x: gapHours, // hours
            y: current.amount
        });
        
        doseSizeVsNextGap.push({
            x: prev.amount,
            y: gapHours
        });
    }

    // First Dose vs Daily Total
    const byDay = subsDoses.reduce((acc, dose) => {
        const date = new Date(dose.timestamp);
        const dayStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!acc[dayStr]) acc[dayStr] = [];
        acc[dayStr].push(dose);
        return acc;
    }, {} as Record<string, Dose[]>);

    for (const [day, dayDoses] of Object.entries(byDay)) {
        if (dayDoses.length < 2) continue; // Need at least 2 doses in a day to see effect on total
        dayDoses.sort((a, b) => a.timestamp - b.timestamp);
        
        const firstDose = dayDoses[0].amount;
        const total = dayDoses.reduce((sum, d) => sum + d.amount, 0);
        
        firstDoseVsDailyTotal.push({
            x: firstDose,
            y: total
        });
    }

    correlations.push({
        substanceId,
        substanceName: getSubstanceName(substanceId),
        gapVsDoseSize,
        doseSizeVsNextGap,
        firstDoseVsDailyTotal,
        trendGapVsDose: calculateTrend(gapVsDoseSize),
        trendDoseVsNextGap: calculateTrend(doseSizeVsNextGap),
        dataPointsCount: subsDoses.length
    });
  }

  // Cross correlations (Daily Total A vs Daily Total B)
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
          points,
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
