export type SubstanceCategory = 
  | 'stimulant' 
  | 'depressant' 
  | 'psychedelic' 
  | 'dissociative' 
  | 'opioid' 
  | 'cannabinoid' 
  | 'nootropic' 
  | 'supplement' 
  | 'medication' 
  | 'other';

export type MetabolismCurveType = 
  | 'standard' 
  | 'exponential' 
  | 'alcohol' 
  | 'linear' 
  | 'sigmoid'
  | 'custom';

export type Valence = 'positive' | 'negative' | 'neutral';

export interface CurvePoint {
  time: number;
  level: number;
}

export interface Strain {
  name: string;
  price: number;
}

export interface Effect {
  type: string;
  intensity: number;
  onset: number;
  duration: number;
  valence: Valence;
  customCurve?: CurvePoint[];
}

export interface Substance {
  id: string;
  name: string;
  halfLife: number;
  tmax: number;
  bioavailability: number;
  color: string;
  icon: string;
  unit: string;
  price: number;
  step: number;
  category: SubstanceCategory;
  onset: number;
  offset: number;
  toxicity: number;
  toleranceRate: number;
  toleranceReset: number;
  metabolismCurve: MetabolismCurveType;
  metabolismRate: number;
  absorptionRate: number;
  beta: number;
  ka: number;
  customCurve?: CurvePoint[];
  comedownEnabled: boolean;
  comedownDuration: number;
  comedownIntensity: number;
  comedownSymptoms: string[];
  strains: Strain[];
  effects: Effect[];
  interactions: string[];
  interactionMessage?: string;
  isSevere?: boolean;
  description?: string;
  isPrescription?: boolean;
  isIllegal?: boolean;
  isFavorite?: boolean;
  proteinBinding?: number;
  volumeOfDistribution?: number;
  clearanceRate?: number;
  molarMass?: number;
  pKa?: number;
  logP?: number;
  addictionPotential?: 'low' | 'moderate' | 'high' | 'very-high';
  legalityStatus?: string;
  toleranceHalfLife?: number;
  crossTolerance?: string[];
  dosage?: {
    unit: string;
    threshold: number;
    light: number;
    common: number;
    strong: number;
    heavy: number;
  };
}

export interface Dose {
  id: string;
  substanceId: string;
  amount: number;
  timestamp: string;
  route: string;
  stomach?: string | null;
  note: string;
  strainId?: string | null;
  bioavailabilityMultiplier: number;
  tmaxMultiplier: number;
}

export interface UserSettings {
  userWeight: number;
  userAge: number;
  userMetabolism: 'slow' | 'normal' | 'fast';
  userGender: 'male' | 'female';
  timeFormat24h: boolean;
  showSeconds: boolean;
  compactMode: boolean;
  language: string;
  chartWindow: number;
  weeklyBudget: number;
  chartAnimation: boolean;
  chartGrid: boolean;
  chartPoints: boolean;
  interactionWarnings: boolean;
  doseWarnings: boolean;
  reminders: boolean;
  comedownWarnings: boolean;
  theme: 'dark' | 'light';
}

export interface CustomEffect {
  name: string;
  icon: string;
  color: string;
  valence: Valence;
}

export interface Shortcut {
  id: string;
  name: string;
  substanceId: string;
  strainId?: string | null;
  amount: number;
  route: string;
  color: string;
  icon?: string;
}
