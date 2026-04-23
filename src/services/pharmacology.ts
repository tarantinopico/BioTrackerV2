import { Substance, Dose, UserSettings } from '../types';

export function getMetabolismMultiplier(settings: UserSettings): number {
  const metabolism = settings.userMetabolism || 'normal';
  switch (metabolism) {
    case 'slow': return 0.8;
    case 'fast': return 1.2;
    default: return 1;
  }
}

export function calculateTolerance(substanceId: string, substances: Substance[], doses: Dose[], atTimestamp: number = Date.now()): number {
  const substance = substances.find(s => s.id === substanceId);
  if (!substance) return 0;

  const crossToleranceIds = substance.crossTolerance || [];
  const targetIds = [substanceId, ...crossToleranceIds];

  const sevenDaysAgo = atTimestamp - (7 * 24 * 3600000);
  const recentDoses = doses.filter(d => 
    targetIds.includes(d.substanceId) && 
    d.timestamp > sevenDaysAgo &&
    d.timestamp <= atTimestamp
  );

  if (recentDoses.length === 0) return 0;

  const daysWithUse = new Set(recentDoses.map(d => new Date(d.timestamp).toDateString())).size;
  
  // Calculate total amount normalized by typical dose of each substance
  const normalizedTotalAmount = recentDoses.reduce((sum, d) => {
    const doseSubstance = substances.find(s => s.id === d.substanceId);
    const typicalDose = getTypicalDose(d.substanceId);
    // If it's a cross-tolerance dose, we might want to scale it, 
    // but for now we just use the normalized amount relative to its own typical dose.
    return sum + (d.amount / typicalDose);
  }, 0);
  
  const averageDailyNormalizedAmount = normalizedTotalAmount / 7;
  const frequencyFactor = (daysWithUse / 7) * 50;
  const amountFactor = Math.min(averageDailyNormalizedAmount * 30, 50);

  return Math.min(frequencyFactor + amountFactor, 95);
}

export function getTypicalDose(substanceId: string): number {
  const typicalDoses: Record<string, number> = {
    'caffeine': 100,
    'nicotine': 1,
    'alcohol': 10,
    'melatonin': 3,
    'modafinil': 100,
    'cbd': 25,
    'thc': 10,
    'kratom': 3
  };
  return typicalDoses[substanceId] || 50;
}

function interpolateCurve(points: { time: number; level: number }[], hours: number): number {
  if (!points || points.length === 0) return 0;
  
  const sorted = [...points].sort((a, b) => a.time - b.time);
  
  if (hours <= sorted[0].time) return sorted[0].level / 100;
  if (hours >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].level / 100;
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    
    if (hours >= p1.time && hours <= p2.time) {
      const t = (hours - p1.time) / (p2.time - p1.time);
      return (p1.level + t * (p2.level - p1.level)) / 100;
    }
  }
  
  return 0;
}

export function calculateDoseLevel(
  substance: Substance, 
  dose: Dose, 
  hoursSinceDose: number, 
  settings: UserSettings,
  substances: Substance[],
  doses: Dose[],
  precalculatedTolerance?: number
): number {
  if (hoursSinceDose < 0) return 0;

  const amount = dose.amount;
  const bioavailability = (substance.bioavailability / 100) * (dose.bioavailabilityMultiplier || 1);
  const effectiveDose = amount * bioavailability;

  const tolerance = precalculatedTolerance !== undefined ? precalculatedTolerance : calculateTolerance(substance.id, substances, doses);
  const toleranceFactor = 1 - (tolerance / 100);

  const metabolismMult = getMetabolismMultiplier(settings);
  const tmax = (substance.tmax * (dose.tmaxMultiplier || 1)) / metabolismMult;
  const halfLife = substance.halfLife / metabolismMult;

  const curveType = substance.metabolismCurve || 'standard';
  let level = 0;

  if (curveType === 'custom' && substance.customCurve && substance.customCurve.length > 0) {
    // For custom curves, we scale time by metabolism multiplier
    level = interpolateCurve(substance.customCurve, hoursSinceDose * metabolismMult);
  } else {
    switch (curveType) {
      case 'alcohol': {
        const absorptionTime = tmax * 0.5;
        if (hoursSinceDose < absorptionTime) {
          level = (hoursSinceDose / absorptionTime) * 0.9;
        } else {
          const eliminationTime = hoursSinceDose - absorptionTime;
          const beta = (substance.beta || 0.15) * (substance.metabolismRate || 1);
          level = Math.max(0, 0.9 - (beta * eliminationTime));
        }
        break;
      }
      case 'exponential': {
        if (hoursSinceDose < tmax * 0.1) {
          level = (hoursSinceDose / (tmax * 0.1)) * 0.1;
        } else if (hoursSinceDose < tmax) {
          const ka = (substance.ka || 1) * (substance.absorptionRate || 1);
          level = 1 - Math.exp(-ka * hoursSinceDose);
        } else {
          const eliminationTime = hoursSinceDose - tmax;
          const beta = (substance.beta || 0.1) * (substance.metabolismRate || 1);
          level = Math.exp(-beta * eliminationTime);
        }
        break;
      }
      case 'linear': {
        if (hoursSinceDose < tmax) {
          level = hoursSinceDose / tmax;
        } else {
          const eliminationTime = hoursSinceDose - tmax;
          const totalEliminationTime = halfLife * 3;
          level = Math.max(0, 1 - (eliminationTime / totalEliminationTime));
        }
        break;
      }
      case 'sigmoid': {
        if (hoursSinceDose < tmax) {
          const progress = hoursSinceDose / tmax;
          level = 1 / (1 + Math.exp(-10 * (progress - 0.5)));
        } else {
          const eliminationTime = hoursSinceDose - tmax;
          const eliminationFactor = Math.pow(0.5, eliminationTime / halfLife);
          level = eliminationFactor;
        }
        break;
      }
      default: {
        if (hoursSinceDose < tmax * 0.1) {
          level = (hoursSinceDose / (tmax * 0.1)) * 0.1;
        } else if (hoursSinceDose < tmax) {
          const absorptionProgress = (hoursSinceDose - tmax * 0.1) / (tmax * 0.9);
          level = 0.1 + (absorptionProgress * 0.9);
        } else {
          const eliminationTime = hoursSinceDose - tmax;
          const eliminationFactor = Math.pow(0.5, eliminationTime / halfLife);
          level = eliminationFactor;
        }
      }
    }
  }

  const absoluteLevel = level * effectiveDose * toleranceFactor;

  return absoluteLevel;
}

export function calculateSubstanceLevelAtTime(
  substanceId: string, 
  timestamp: number, 
  substances: Substance[], 
  doses: Dose[], 
  settings: UserSettings,
  precalculatedTolerance?: number
): number {
  const substance = substances.find(s => s.id === substanceId);
  if (!substance) return 0;

  const relevantDoses = doses.filter(d => d.substanceId === substanceId);
  let totalLevel = 0;

  const tolerance = precalculatedTolerance !== undefined ? precalculatedTolerance : calculateTolerance(substanceId, substances, doses);

  relevantDoses.forEach(dose => {
    const doseTime = dose.timestamp;
    const hoursSinceDose = (timestamp - doseTime) / 3600000;
    if (hoursSinceDose < 0) return;

    const level = calculateDoseLevel(substance, dose, hoursSinceDose, settings, substances, doses, tolerance);
    totalLevel += level;
  });

  return totalLevel;
}

export function calculatePeakSubstanceLevel(
  substanceId: string,
  doses: Dose[],
  substances: Substance[],
  settings: UserSettings,
  windowStart: number,
  windowEnd: number
): number {
  let peak = 0;
  // Step through the window in 15-minute increments
  for (let t = windowStart; t <= windowEnd; t += 15 * 60000) {
    const level = calculateSubstanceLevelAtTime(substanceId, t, substances, doses, settings);
    if (level > peak) peak = level;
  }
  return peak > 0 ? peak : 1; 
}

export function calculateCleanTime(substances: Substance[], doses: Dose[], settings: UserSettings): number {
  const now = Date.now();
  let maxCleanTime = 0;
  const metabolismMult = getMetabolismMultiplier(settings);

  doses.forEach(dose => {
    const substance = substances.find(s => s.id === dose.substanceId);
    if (!substance) return;

    const doseTime = dose.timestamp;
    let eliminationTime = substance.halfLife * 5 / metabolismMult;
    
    if (substance.metabolismCurve === 'custom' && substance.customCurve && substance.customCurve.length > 0) {
      const lastPoint = [...substance.customCurve].sort((a, b) => a.time - b.time).pop();
      if (lastPoint) {
        eliminationTime = lastPoint.time / metabolismMult;
      }
    }
    
    const cleanTime = doseTime + (eliminationTime * 3600000);

    if (cleanTime > now && (cleanTime - now) > maxCleanTime) {
      maxCleanTime = cleanTime - now;
    }
  });

  return maxCleanTime;
}

export function calculateEffectIntensityAtTime(
  effectType: string,
  timestamp: number,
  substances: Substance[],
  doses: Dose[],
  settings: UserSettings,
  precalculatedTolerances?: Record<string, number>
): number {
  let totalIntensity = 0;
  const metabolismMult = getMetabolismMultiplier(settings);
  
  substances.forEach(substance => {
    const effect = substance.effects?.find(e => e.type === effectType);
    if (!effect) return;
    
    const relevantDoses = doses.filter(d => d.substanceId === substance.id);
    const tolerance = precalculatedTolerances?.[substance.id];
    
    relevantDoses.forEach(dose => {
      const doseTime = dose.timestamp;
      const hoursSinceDose = (timestamp - doseTime) / 3600000;
      if (hoursSinceDose < 0) return;
      
      let level = 0;
      if (effect.customCurve && effect.customCurve.length > 0) {
        level = interpolateCurve(effect.customCurve, hoursSinceDose * metabolismMult);
      } else {
        // Fallback to substance level if no custom curve for effect
        level = calculateDoseLevel(substance, dose, hoursSinceDose, settings, substances, doses, tolerance) / 100;
      }
      
      const contribution = (level * 100 * Math.abs(effect.intensity)) / 10;
      totalIntensity += contribution;
    });
  });
  
  return Math.min(totalIntensity, 100);
}
