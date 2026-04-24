export type SubstanceCategory = 
  | 'stimulant' 
  | 'depressant' 
  | 'psychedelic' 
  | 'dissociative' 
  | 'empathogen'
  | 'opioid' 
  | 'cannabinoid' 
  | 'nootropic' 
  | 'supplement' 
  | 'vitamin'
  | 'steroid'
  | 'peptide'
  | 'herb'
  | 'deliriant'
  | 'medication' 
  | 'antidepressant'
  | 'antipsychotic'
  | 'anxiolytic'
  | 'sedative'
  | 'entactogen'
  | 'other';

export type MetabolismCurveType = 
  | 'standard' 
  | 'exponential' 
  | 'alcohol' 
  | 'linear' 
  | 'sigmoid'
  | 'custom';

export type Valence = 'positive' | 'negative' | 'neutral';

export type CustomFieldType = 'boolean' | 'select' | 'multiselect' | 'number' | 'rating' | 'text';

export interface CustomFieldDef {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: string[];
  unit?: string;
}

export interface CurvePoint {
  time: number;
  level: number;
}

export interface ActiveIngredient {
  name: string;
  percentage: number;
}

export interface Strain {
  name: string;
  price: number;
  color?: string;
  activeIngredientPercentage?: number;
  activeIngredients?: ActiveIngredient[];
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
  dailyLimit?: number;
  packageSize?: number;
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
  activeIngredientName?: string;
  activeIngredientPercentage?: number;
  activeIngredients?: ActiveIngredient[];
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
  stash?: number;
  defaultRoute?: string;
  tags?: string[];
  customFields?: CustomFieldDef[];
}

export interface Dose {
  id: string;
  substanceId: string;
  amount: number;
  timestamp: number;
  route: string;
  stomach?: string | null;
  note: string;
  strainId?: string | null;
  bioavailabilityMultiplier: number;
  tmaxMultiplier: number;
  customFieldValues?: Record<string, any>;
}

export interface UserSettings {
  // Profile
  userWeight: number;
  userHeight?: number;
  userAge: number;
  userMetabolism: 'slow' | 'normal' | 'fast';
  userGender: 'male' | 'female' | 'other';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  bodyFatPercentage?: number;
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | '0+' | '0-' | 'unknown';
  medicalConditions?: string;

  // Appearance
  timeFormat24h: boolean;
  showSeconds: boolean;
  compactMode: boolean;
  hapticFeedback: boolean;
  language: string;
  currency: string;
  theme: 'dark' | 'light' | 'midnight';
  bentoMode?: boolean;
  glassmorphism?: boolean;
  privacyMode?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  colorAccent?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'emerald' | 'cyan';
  reducedMotion?: boolean;
  animations?: boolean;
  glassEffects?: boolean;
  glowEffects?: boolean;
  ambientBackground?: boolean;

  // Charts
  chartWindow: number;
  firstDayOfWeek?: 0 | 1;
  chartAnimation: boolean;
  chartGrid: boolean;
  chartPoints: boolean;

  // Dashboard
  dashboardWidgets?: {
    activeEffects: boolean;
    recentDoses: boolean;
    quickAdd: boolean;
    budget: boolean;
    systemLoad?: boolean;
    shortcuts?: boolean;
  };

  // Notifications
  interactionWarnings: boolean;
  doseWarnings: boolean;
  reminders: boolean;
  comedownWarnings: boolean;
  soundAlerts?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;

  // Data
  autoBackup?: 'none' | 'daily' | 'weekly' | 'monthly';

  // Analytics
  smartPredictions?: boolean;
  predictiveAnalytics?: boolean;
  insightEngine?: boolean;
  predictionAlgorithm?: 'basic' | 'exponential' | 'ml_simulated' | 'ai_groq';
  
  // AI Integrations
  groqApiKey?: string;
  aiModel?: string;
  aiContextLimit?: number;

  // Security
  pinCode?: string | null;
  requirePin?: boolean;
  
  // Goals
  weeklyBudget: number;
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
