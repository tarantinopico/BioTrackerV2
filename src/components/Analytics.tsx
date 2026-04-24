import { useMemo, useState, useEffect } from 'react';
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
  ShieldAlert,
  Activity,
  Smile,
  Sparkles,
  FlaskConical,
  Lightbulb,
  Radar as Target,
  Database,
  Cpu,
  Brain,
  Dna,
  Timer,
  Loader2
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
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine
} from 'recharts';
import { Substance, Dose, UserSettings, Strain } from '../types';
import { cn, formatTime, formatAmount } from '../lib/utils';
import { 
  calculateTolerance, 
  calculateSubstanceLevelAtTime, 
  calculatePeakSubstanceLevel 
} from '../services/pharmacology';

import { getIconComponent } from './Substances';

interface AnalyticsProps {
  substances: Substance[];
  doses: Dose[];
  settings: UserSettings;
  onToggleTheme?: () => void;
  onUpdateSettings?: (settings: UserSettings) => void;
}

type Period = 7 | 30 | 90 | 365 | 'all';

interface AiGlobalAnalysis {
  generalTrend: 'Improving' | 'Worsening' | 'Stable';
  riskScore: number;
  keyTriggers: string[];
  suggestedAction: string;
  radarScores: {
    frequency: number;
    amount: number;
    timing: number;
    combinations: number;
  };
  habitAnalysis?: string;
  weeklyDistribution?: number[];
  projectedRiskNextMonth?: number;
  primaryReason?: string;
}

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

export const calculateActiveIngredients = (dosesList: Dose[], substance: Substance): Record<string, number> => {
  const ingredients: Record<string, number> = {};
  
  dosesList.forEach(d => {
    const strain = d.strainId ? substance.strains?.find(s => s.name === d.strainId) : null;
    
    // Legacy support
    const legacyName = substance.activeIngredientName;
    if (legacyName) {
      const activePct = strain?.activeIngredientPercentage ?? substance.activeIngredientPercentage;
      if (activePct) {
        ingredients[legacyName] = (ingredients[legacyName] || 0) + ((d.amount * activePct) / 100);
      }
    }

    // New array support
    const baseIngredients = substance.activeIngredients || [];
    const strainIngredients = strain?.activeIngredients || [];
    const arrToUse = strainIngredients.length > 0 ? strainIngredients : baseIngredients;

    arrToUse.forEach(i => {
      ingredients[i.name] = (ingredients[i.name] || 0) + ((d.amount * i.percentage) / 100);
    });
  });

  return ingredients;
};

const renderActiveIngredientsString = (dosesList: Dose[], substance: Substance): string => {
  const ingredients = calculateActiveIngredients(dosesList, substance);
  const entries = Object.entries(ingredients).filter(([, val]) => val > 0);
  if (entries.length === 0) return '';
  return entries.map(([name, val]) => `${formatAmount(val, substance.unit, 2)} ${name}`).join(' + ');
};

const calculatePredictions = (doses: Dose[], substances: Substance[], period: number, settings: UserSettings) => {
  const calculateCost = (dosesList: Dose[]) => {
    return dosesList.reduce((sum, d) => {
      const substance = substances.find(s => s.id === d.substanceId);
      const strainPrice = substance && d.strainId ? substance.strains?.find(s => s.name === d.strainId)?.price : null;
      const price = strainPrice || (substance ? substance.price : 0) || 0;
      return sum + (d.amount * price);
    }, 0);
  };

  const totalCost = calculateCost(doses);
  const now = Date.now();
  
  // Calculate tracking span for this period
  let trackingDays = period;
  if (doses.length > 0) {
    const minTimestamp = Math.min(...doses.map(d => d.timestamp));
    const daysSinceFirst = Math.max(1, (now - minTimestamp) / 86400000);
    // If the user started tracking less than `period` days ago, use that smaller number.
    trackingDays = Math.min(period, daysSinceFirst);
  }
  
  // Base daily logic
  let daily = doses.length > 0 ? totalCost / trackingDays : 0;
  
  // Calculate active days
  const activeDays = new Set(doses.map(d => new Date(d.timestamp).toISOString().split('T')[0])).size;
  const activeDayAverage = activeDays > 0 ? totalCost / activeDays : 0;

  // Recent Trends
  const sevenDaysAgo = now - 7 * 86400000;
  const fourteenDaysAgo = now - 14 * 86400000;
  
  const recentDoses = doses.filter(d => d.timestamp >= sevenDaysAgo);
  const previousDoses = doses.filter(d => d.timestamp >= fourteenDaysAgo && d.timestamp < sevenDaysAgo);
  
  const recentCost = calculateCost(recentDoses);
  const previousCost = calculateCost(previousDoses);
  
  let recentTrackingDays = 7;
  if (recentDoses.length > 0) {
     const minRTS = Math.min(...recentDoses.map(d => d.timestamp));
     recentTrackingDays = Math.min(7, Math.max(1, (now - minRTS) / 86400000));
  }
  let previousTrackingDays = 7;
  if (previousDoses.length > 0) {
     const minPTS = Math.min(...previousDoses.map(d => d.timestamp));
     previousTrackingDays = Math.min(7, Math.max(1, (sevenDaysAgo - minPTS) / 86400000));
  }

  // Implement smartest math logic if settings enabled
  let recentDaily = recentDoses.length > 0 ? recentCost / recentTrackingDays : 0;
  const previousDaily = previousDoses.length > 0 ? previousCost / previousTrackingDays : 0;

  // ML Simulated or Exponential smoothing
  if (settings.predictionAlgorithm === 'exponential') {
     const alpha = 0.3; // Smoothing factor
     daily = (alpha * recentDaily) + ((1 - alpha) * daily);
  } else if (settings.predictionAlgorithm === 'ml_simulated') {
     // A slightly heavier weight on recent behavior + weekend peaks
     const weekendDoses = doses.filter(d => {
       const day = new Date(d.timestamp).getDay();
       return day === 0 || day === 6;
     });
     const weekendRatio = doses.length > 0 ? weekendDoses.length / doses.length : 0;
     // Give it a tiny simulated "learning" skew
     recentDaily = recentDaily * (1 + (weekendRatio * 0.1));
     daily = (recentDaily * 0.6) + (previousDaily * 0.4); 
  }
  
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

export default function Analytics({ substances, doses, settings, onToggleTheme, onUpdateSettings }: AnalyticsProps) {
  const [selectedSubstanceId, setSelectedSubstanceId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(30);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailTab, setDetailTab] = useState<'trends' | 'time' | 'distribution' | 'stats' | 'finance' | 'history' | 'strains' | 'day-view' | 'combinations' | 'reactions' | 'predictions' | 'active-ingredients' | 'custom-fields'>('trends');
  const [overviewTab, setOverviewTab] = useState<'overview' | 'day-view' | 'finance' | 'insights' | 'patterns' | 'habits' | 'taper'>('overview');
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [aiGlobalData, setAiGlobalData] = useState<AiGlobalAnalysis | null>(null);
  const [isAiGlobalLoading, setIsAiGlobalLoading] = useState(false);
  const [aiGlobalError, setAiGlobalError] = useState<string | null>(null);

  const [taperSubstanceId, setTaperSubstanceId] = useState<string>('');
  const [taperPrompt, setTaperPrompt] = useState<string>('');
  const [isTaperLoading, setIsTaperLoading] = useState(false);
  const [taperError, setTaperError] = useState<string | null>(null);

  // Stabilize 'now' to prevent excessive re-renders. Updates every 5 minutes.
  const roundedNow = Math.floor(Date.now() / 300000) * 300000;
  const now = useMemo(() => roundedNow, [roundedNow]);

  const dayMs = 86400000;
  const periodMs = period === 'all' ? Infinity : period * dayMs;
  const startTime = period === 'all' ? 0 : now - periodMs;

  const filteredDoses = useMemo(() => {
    return doses.filter(d => d.timestamp > startTime);
  }, [doses, startTime]);

  useEffect(() => {
    if (overviewTab !== 'patterns' || settings.predictionAlgorithm !== 'ai_groq' || !settings.groqApiKey || filteredDoses.length < 10) {
      return;
    }

    if (aiGlobalData) return; // Fetch only once if we already have it

    const fetchGlobalAiAnalysis = async () => {
      setIsAiGlobalLoading(true);
      setAiGlobalError(null);
      // Prepare context
      const subMap: Record<string, string> = {};
      substances.forEach(s => subMap[s.id] = s.name);
      
      const limitCount = settings.aiContextLimit || 100;
      // Use user defined limit
      const doseHistory = filteredDoses.slice(-limitCount).map(d => {
        let fieldTxt = '';
        if (d.customFieldValues) {
          fieldTxt = Object.entries(d.customFieldValues).map(([k, v]) => `[${k}: ${v}]`).join(' ');
        }
        return `${new Date(d.timestamp).toISOString()}: ${subMap[d.substanceId] || 'Neznámá látka'} - ${d.amount} (Note: ${d.note || 'none'}) ${fieldTxt}`;
      }).join('\n');
        
      let attempt = 0;
      const maxRetries = settings.aiMaxRetries ?? 2;
      let lastError = null;

      while (attempt <= maxRetries) {
        try {
          const baseUrl = (settings.aiBaseUrl || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
          const fetchUrl = `${baseUrl}/chat/completions`;
          
          const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.groqApiKey}`
            },
            body: JSON.stringify({
              model: settings.aiModelGlobal || settings.aiModel || 'llama-3.3-70b-versatile',
              response_format: { type: "json_object" },
              messages: [
                {
                  role: 'system',
                  content: (settings.aiSystemPrompt || `Jsi expertní datový analytik závislostí a užívání látek. Odpovídáš striktně JSON formátem.`) + 
                           `\nBER V ÚVAHU NASTAVENÍ: habitAnalysisSensitivity=${settings.habitAnalysisSensitivity ?? 1.0} (čím vyšší, tím víc detekuj skryté návyky a souvislosti).`
                },
                {
                  role: 'user',
                  content: (settings.aiGlobalPrompt || `Tvá analýza musí identifikovat vzorce v dlouhodobém (agregovaném) užívání ze všech látek klienta.
Schéma odpovědi:
{
  "generalTrend": "Improving" | "Worsening" | "Stable",
  "riskScore": (celé číslo 0-100, analyzující risk vyhoření/závislosti),
  "keyTriggers": (pole 2-3 krátkých stringů, např. "Ráno v pracovní dny", "Při mixování látek", "O Víkendových nocích"),
  "suggestedAction": (string, jedno jasné doporučení do 15 slov),
  "radarScores": {
    "frequency": (číslo 0-100, kde 100=extrémně časté užívání),
    "amount": (číslo 0-100, kde 100=velké dávky),
    "timing": (číslo 0-100, rizikovost načasování např pozdě v noci),
    "combinations": (číslo 0-100, jak často se mixují látky / polydrug risk)
  },
  "habitAnalysis": (string, odstavec 20-30 slov o zjištěných návycích a psychologickém kontextu),
  "weeklyDistribution": (pole 7 čísel udávající procentuální riziko nebo zátěž pro každý den v týdnu [Pondělí-Neděle], suma nemusí být 100),
  "projectedRiskNextMonth": (číslo 0-100, extrapolace rizika do dalšího měsíce z aktuálního trendu),
  "primaryReason": (string, předpokládaný důvod užívání na základě dat, do 5 slov)
}
Odpovídej POUZE striktně JSON objektem.`) + `\n\nHistorie (posledních max ${limitCount} logů):\n${doseHistory}`
                }
              ],
              temperature: settings.aiTemperature ?? 0.1,
              max_tokens: settings.aiMaxTokens ?? 600
            })
          });

          if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`API HTTP Error: ${response.status} - ${errBody}`);
          }

          const data = await response.json();
          let content = data.choices?.[0]?.message?.content || '{}';
          const match = content.match(/\{[\s\S]*\}/);
          if (match) content = match[0];
          
          const parsed = JSON.parse(content);
          
          // Aplikuj násobič rizikového skóre
          const riskMult = settings.riskScoreMultiplier ?? 1.0;
          if (parsed.riskScore !== undefined) {
            parsed.riskScore = Math.min(Math.round(parsed.riskScore * riskMult), 100);
          }
          if (parsed.projectedRiskNextMonth !== undefined) {
            parsed.projectedRiskNextMonth = Math.min(Math.round(parsed.projectedRiskNextMonth * riskMult), 100);
          }

          setAiGlobalData(parsed as AiGlobalAnalysis);
          return; // Success, exit loop
        } catch (err: any) {
          lastError = err;
          attempt++;
          if (attempt > maxRetries) {
            setAiGlobalError(`Pokus ${attempt} selhal. AI neodpověděla správným JSON nebo selhávalo API. Detail: ${err.message || String(err)}`);
          } else {
            console.warn(`AI Analysis attempt ${attempt} failed:`, err);
            // Wait before retry
            await new Promise(res => setTimeout(res, 500 * attempt));
          }
        }
      }
      setIsAiGlobalLoading(false);
    };

    fetchGlobalAiAnalysis();
  }, [overviewTab, settings.predictionAlgorithm, settings.groqApiKey, settings.aiModel, filteredDoses]);

  const generateTaperPlan = async () => {
    if (!settings.groqApiKey) {
      setTaperError('Chybí Groq API klíč. Zadejte jej v Nastavení.');
      return;
    }
    if (!taperSubstanceId) {
      setTaperError('Vyberte látku pro plán.');
      return;
    }
    const sub = substances.find(s => s.id === taperSubstanceId);
    if (!sub) return;

    setIsTaperLoading(true);
    setTaperError(null);
    let attempt = 0;
    const maxRetries = settings.aiMaxRetries ?? 2;
    let lastError = null;

    const subDoses = doses.filter(d => d.substanceId === taperSubstanceId).slice(-50);
    const doseHistory = subDoses.map(d => {
      let fieldTxt = '';
      if (d.customFieldValues) {
        fieldTxt = Object.entries(d.customFieldValues).map(([k, v]) => `[${k}: ${v}]`).join(' ');
      }
      return `${new Date(d.timestamp).toISOString()}: ${d.amount} ${sub.unit} (Note: ${d.note || 'none'}) ${fieldTxt}`;
    }).join('\\n');

    while (attempt <= maxRetries) {
      try {
        const baseUrl = (settings.aiBaseUrl || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
        const fetchUrl = `${baseUrl}/chat/completions`;
        
        const response = await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: settings.aiModelTapering || settings.aiModel || 'llama-3.3-70b-versatile',
            response_format: { type: "json_object" },
            messages: [
              {
                role: 'system',
                content: settings.aiTaperingSystemPrompt || `Jsi lékařský asistent a farmakolog. Specializuješ se na bezpečné a postupné snižování dávek (tapering). Odpovídáš striktně JSON formátem.`
              },
              {
                role: 'user',
                content: `Látka: ${sub.name}\\nCíl/Prompt uživatele: ${taperPrompt || 'Vytvoř bezpečný plán postupného vysazení látky.'}\\n\\nHistorie užívání:\\n${doseHistory || 'Žádné dřívější dávky'}\\n\\nVytvoř detailní denní plán vysazování rozepsaný na dny a konkrétní denní dávky s časem. Odpověz POUZE validním JSON.\\n\\nSchéma:\\n{\\n "aiAdvice": "Tvé hodnocení...",\\n "plan": [\\n  {\\n   "day": 1,\\n   "totalRecommendedAmount": číslo,\\n   "doses": [{ "time": "08:00", "amount": číslo }, { "time": "20:00", "amount": číslo }]\\n  }\\n ]\\n}`
              }
            ],
            temperature: settings.aiTemperature ?? 0.2,
            max_tokens: settings.aiMaxTokens ?? 1500
          })
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`API HTTP Error: ${response.status} - ${errBody}`);
        }
        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || '{}';
        
        const match = content.match(/\{[\s\S]*\}/);
        if (match) content = match[0];
        
        const parsed = JSON.parse(content);
        
        // Transform day sequence to actual dates
        const startMs = Date.now() + 86400000; // Start tomorrow
        const mappedPlan = (parsed.plan || []).map((p: any) => ({
          day: p.day,
          totalRecommendedAmount: p.totalRecommendedAmount || p.recommendedAmount || 0,
          doses: p.doses || [],
          date: new Date(startMs + (p.day - 1) * 86400000).toISOString().split('T')[0]
        }));

        const newPlan = {
          substanceId: taperSubstanceId,
          prompt: taperPrompt,
          startDate: new Date(startMs).toISOString(),
          plan: mappedPlan,
          aiAdvice: parsed.aiAdvice || ''
        };

        if (onUpdateSettings) {
          onUpdateSettings({ ...settings, activeTaperingPlan: newPlan });
        }
        return; // Success, break loop
      } catch (err: any) {
        lastError = err;
        attempt++;
        if (attempt > maxRetries) {
          setTaperError(`Detail chyby: ${err.message || String(err)}. Zkontrolujte model nebo prompt.`);
        } else {
          console.warn(`Taper attempt ${attempt} failed:`, err);
          await new Promise(res => setTimeout(res, 500 * attempt));
        }
      }
    }
    setIsTaperLoading(false);
  };

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
  
  const numericPeriod = useMemo(() => {
    if (period !== 'all') return period;
    if (doses.length === 0) return 30; // default fallback
    const firstTs = Math.min(...doses.map(d => d.timestamp));
    const daysSince = Math.ceil((now - firstTs) / dayMs);
    return Math.max(1, daysSince);
  }, [period, doses, now, dayMs]);

  // Use for specific calculations that need accurate tracking duration, not just period
  const activeTrackingDays = useMemo(() => {
    if (filteredDoses.length === 0) return numericPeriod;
    const firstTsInWindow = Math.min(...filteredDoses.map(d => d.timestamp));
    const actualDaysActive = Math.ceil((now - firstTsInWindow) / dayMs);
    return Math.max(1, Math.min(numericPeriod, actualDaysActive));
  }, [filteredDoses, numericPeriod, now, dayMs]);
  
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
    for (let i = numericPeriod - 1; i >= 0; i--) {
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
    calculatePredictions(filteredDoses, substances, period, settings),
    [filteredDoses, substances, period, settings]
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
      <div className="flex bg-md3-secondary p-1 rounded-2xl relative z-10 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setOverviewTab('overview')}
          className={cn(
            "flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
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
            "flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
            overviewTab === 'day-view' 
              ? "bg-theme-subtle-hover text-theme-text shadow-sm" 
              : "text-md3-gray hover:text-theme-text"
          )}
        >
          <Calendar size={14} />
          Denní
        </button>
        <button
          onClick={() => setOverviewTab('finance')}
          className={cn(
            "flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
            overviewTab === 'finance' 
              ? "bg-theme-subtle-hover text-theme-text shadow-sm" 
              : "text-md3-gray hover:text-theme-text"
          )}
        >
          <DollarSign size={14} />
          Finance
        </button>
        <button
          onClick={() => setOverviewTab('insights')}
          className={cn(
            "flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
            overviewTab === 'insights' 
              ? "bg-theme-subtle-hover text-theme-text shadow-sm" 
              : "text-md3-gray hover:text-theme-text"
          )}
        >
          <Lightbulb size={14} />
          Pokročilé
        </button>
        <button
          onClick={() => setOverviewTab('patterns')}
          className={cn(
            "flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
            overviewTab === 'patterns' 
              ? "bg-theme-subtle-hover text-theme-text shadow-sm" 
              : "text-md3-gray hover:text-theme-text",
            settings.insightEngine ? "text-cyan-primary" : ""
          )}
        >
          <Brain size={14} className={settings.insightEngine ? "text-cyan-primary" : ""} />
          Vzorce & AI
        </button>
        <button
          onClick={() => setOverviewTab('habits')}
          className={cn(
            "flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
            overviewTab === 'habits' 
              ? "bg-theme-subtle-hover text-theme-text shadow-sm" 
              : "text-md3-gray hover:text-theme-text"
          )}
        >
          <Target size={14} />
          Zvyky
        </button>
        {settings.taperingPlanEnabled && (
          <button
            onClick={() => setOverviewTab('taper')}
            className={cn(
              "flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
              overviewTab === 'taper' 
                ? "bg-theme-subtle-hover text-theme-text shadow-sm border border-emerald-500/20" 
                : "text-md3-gray hover:text-theme-text"
            )}
          >
            <Brain size={14} className="text-emerald-500" />
            Taper Plán
          </button>
        )}
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
            <span className="text-xs font-bold text-md3-gray uppercase tracking-wider">Útrata ({numericPeriod}D)</span>
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
            {stats.cleanDays} <span className="text-sm font-medium text-md3-gray">/ {numericPeriod}</span>
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
          <span className="text-xs font-bold text-md3-gray uppercase tracking-wider">{settings.privacyMode ? '***' : (totalCost / activeTrackingDays).toFixed(0)} {settings.currency || 'Kč'} / den</span>
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
              {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--md3-border)" vertical={false} />}
              <XAxis 
                dataKey="hour" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--md3-gray)', fontSize: 10, fontWeight: 600 }}
                dy={10}
                interval={3}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--md3-gray)', fontSize: 10, fontWeight: 600 }}
                width={30}
              />
              <Tooltip content={<CustomTooltip type="count" />} />
              <Bar 
                dataKey="count" 
                name="Počet užití"
                fill="var(--md3-primary)" 
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
                                {renderActiveIngredientsString(sDoses, substance) && (
                                  <span className="text-[10px] font-bold text-md3-primary">
                                    {renderActiveIngredientsString(sDoses, substance)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-base font-bold text-theme-text">{formatAmount(dayTotal, substance.unit, 1)}</span>
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
                                  <div className="text-sm font-bold text-theme-text">{formatAmount(dose.amount, substance.unit, 1)}</div>
                                  {renderActiveIngredientsString([dose], substance) && (
                                    <div className="text-[10px] font-bold text-md3-primary">
                                      {renderActiveIngredientsString([dose], substance)}
                                    </div>
                                  )}
                                  {dose.strainId && <div className="text-xs text-md3-primary font-bold">{dose.strainId}</div>}
                                  {dose.customFieldValues?.rating && <div className="text-[10px] font-bold text-md3-gray uppercase tracking-widest mt-0.5">Hodnocení: <span className="text-theme-text">{dose.customFieldValues.rating}/5</span></div>}
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
        {overviewTab === 'insights' && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 relative z-10 pb-24"
          >
            {/* Radar: Circadian Rhythm */}
            <section className="md3-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Target size={16} className="text-md3-primary" />
                <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Cirkadiánní rytmus (Čas užívání)</h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    // Collect doses by hour 0-23
                    const hourlyCounts = new Array(24).fill(0);
                    doses.forEach(d => {
                      const hour = new Date(d.timestamp).getHours();
                      hourlyCounts[hour]++;
                    });
                    const radarData = hourlyCounts.map((count, hour) => ({
                      time: `${hour}:00`,
                      count
                    }));

                    return (
                      <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
                        <PolarGrid stroke="var(--md3-border)" />
                        <PolarAngleAxis dataKey="time" tick={{ fill: 'var(--md3-gray)', fontSize: 10 }} />
                        <Radar name="Počet záznamů" dataKey="count" stroke="var(--md3-primary)" fill="var(--md3-primary)" fillOpacity={0.3} isAnimationActive={settings.chartAnimation} />
                        <Tooltip content={<CustomTooltip type="count" />} />
                      </RadarChart>
                    );
                  })()}
                </ResponsiveContainer>
              </div>
            </section>

            {/* Global Routes of Administration */}
            <section className="md3-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <PieChartIcon size={16} className="text-md3-green" />
                <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Způsoby administrace</h3>
              </div>
              <div className="h-48 w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    const routeCounts: Record<string, number> = {};
                    doses.forEach(d => {
                      const r = d.route || 'Oral';
                      routeCounts[r] = (routeCounts[r] || 0) + 1;
                    });
                    const routeData = Object.entries(routeCounts)
                      .map(([name, value], i) => {
                        const COLORS = ['#00d1ff', '#c864f4', '#10e47a', '#ffd60a', '#ff9f0a', '#ff375f'];
                        return { name, value, color: COLORS[i % COLORS.length] };
                      })
                      .sort((a, b) => b.value - a.value);

                    if (routeData.length === 0) {
                      return <div className="flex items-center justify-center h-full text-md3-gray text-sm">Žádná data pro zobrazení</div>;
                    }

                    return (
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
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip type="count" />} />
                      </PieChart>
                    );
                  })()}
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {(() => {
                  const routeCounts: Record<string, number> = {};
                  doses.forEach(d => {
                    const r = d.route || 'Oral';
                    routeCounts[r] = (routeCounts[r] || 0) + 1;
                  });
                  const routeData = Object.entries(routeCounts)
                    .map(([name, value], i) => {
                      const COLORS = ['#00d1ff', '#c864f4', '#10e47a', '#ffd60a', '#ff9f0a', '#ff375f'];
                      return { name, value, color: COLORS[i % COLORS.length] };
                    })
                    .sort((a, b) => b.value - a.value);

                  return routeData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-theme-subtle border border-theme-border">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-bold text-theme-text">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-theme-text">{item.value}x</span>
                    </div>
                  ));
                })()}
              </div>
            </section>

            {/* Active Ingredients Density Globally */}
            <section className="md3-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <FlaskConical size={16} className="text-md3-orange" />
                <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Absolutní výtěžnost látek</h3>
              </div>
              <div className="space-y-4">
                {(() => {
                  let totalMass = 0;
                  let totalActive = 0;

                  doses.forEach(d => {
                    const substance = substances.find(s => s.id === d.substanceId);
                    if (substance) {
                       // if we have mg, g, ug we might want to normalize... but typically we just summarize visually per unit?
                       // Actually, doing a global pie chart of mass is hard if units mix (ug vs mg vs g).
                       // We can just calculate percentage of active vs non-active for ONLY substances that define an active ingredient.
                       if (substance.activeIngredientName) {
                         const strain = d.strainId ? substance.strains?.find(s => s.name === d.strainId) : null;
                         const activePct = strain?.activeIngredientPercentage ?? substance.activeIngredientPercentage ?? 0;
                         if (activePct > 0) {
                           totalMass += d.amount;
                           totalActive += (d.amount * activePct) / 100;
                         }
                       }
                    }
                  });

                  if (totalMass === 0) {
                    return <div className="text-sm text-md3-gray">Nemáte u žádné aktuálně zapsané látky specifikovanou procentuální koncentraci účinné látky.</div>;
                  }

                  const overallPercentage = ((totalActive / totalMass) * 100).toFixed(1);

                  return (
                    <div className="space-y-6">
                      <div className="flex flex-col items-center justify-center py-4 bg-theme-subtle rounded-2xl border border-theme-border text-center">
                        <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Průměrná čistota (koncentrace)</div>
                        <div className="text-3xl font-black text-theme-text">{overallPercentage}%</div>
                        <div className="text-xs font-medium text-md3-gray mt-2 max-w-[80%]">Tento ukazatel počítá poměr účinné látky vůči celkové hmotě pro všechny dávky, které mají specifikovanou % účinnost.</div>
                      </div>
                      <div className="w-full h-4 bg-theme-subtle rounded-full overflow-hidden flex">
                        <div className="h-full bg-md3-primary" style={{ width: `${Math.min(100, parseFloat(overallPercentage))}%` }} />
                        <div className="h-full bg-theme-border" style={{ width: `${Math.max(0, 100 - parseFloat(overallPercentage))}%` }} />
                      </div>
                      <div className="flex justify-between text-xs font-bold text-md3-gray">
                        <span>Účinná látka</span>
                        <span>Nosič / Ostatní</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </section>

            {/* Top Global Combinations */}
            <section className="md3-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <GitMerge size={16} className="text-md3-primary" />
                <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Nejčastější denní kombinace</h3>
              </div>
              <div className="space-y-3">
                {(() => {
                  const combosByDay: Record<string, Set<string>> = {};
                  doses.forEach(d => {
                    const day = new Date(d.timestamp).toISOString().split('T')[0];
                    if (!combosByDay[day]) combosByDay[day] = new Set();
                    combosByDay[day].add(d.substanceId);
                  });

                  const comboCounts: Record<string, number> = {};
                  Object.values(combosByDay).forEach(set => {
                    const arr = Array.from(set).sort();
                    if (arr.length > 1) {
                      const key = arr.join(' + ');
                      comboCounts[key] = (comboCounts[key] || 0) + 1;
                    }
                  });

                  const topCombos = Object.entries(comboCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);

                  if (topCombos.length === 0) {
                    return <div className="text-sm text-md3-gray">Žádné zaznamenané kombinace více látek v jeden den.</div>;
                  }

                  return topCombos.map(([combo, count]) => {
                    const parts = combo.split(' + ');
                    return (
                      <div key={combo} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border gap-3 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                          {parts.map((p, ix) => {
                            const sub = substances.find(s => s.id === p);
                            return (
                              <div key={p} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-bg border border-theme-border max-w-full min-w-0">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub?.color || '#fff' }} />
                                <span className="text-sm font-bold text-theme-text truncate">{sub?.name || p}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-lg font-black text-theme-text whitespace-nowrap bg-theme-bg px-4 py-1.5 rounded-lg border border-theme-border shrink-0">{count}x</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </section>
          </motion.div>
        )}
        
        {overviewTab === 'patterns' && (
          <motion.div
            key="patterns"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 relative z-10 pb-24"
          >
            {/* Conditional Insight Engine message */}
            {!settings.insightEngine && (
              <div className="md3-card p-4 border-dashed border-2 border-theme-border/50 bg-theme-bg flex flex-col items-center justify-center text-center">
                <Brain size={24} className="text-md3-gray mb-2 opacity-50" />
                <h3 className="text-sm font-bold text-theme-text mb-1 tracking-widest uppercase">Insight Engine deaktivován</h3>
                <p className="text-xs text-md3-gray">Zapněte Pokročilé analytiky a Insight Engine v Nastavení (Správa Dat) pro odemknutí automatického hledání vzorců chování.</p>
              </div>
            )}

            {settings.insightEngine && settings.predictionAlgorithm === 'ai_groq' && (
              <div className="md3-card p-5 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border-cyan-500/20 shadow-inner">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Brain size={18} className="text-cyan-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase font-black text-cyan-500 tracking-widest flex items-center gap-2">
                      Globální AI Audit {isAiGlobalLoading && <Activity size={10} className="animate-pulse text-cyan-500" />}
                    </div>
                    <div className="text-sm font-bold text-theme-text">
                      {settings.aiModel || 'Llama 3'}
                    </div>
                  </div>
                </div>

                {isAiGlobalLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 size={32} className="text-cyan-500 animate-spin" />
                    <div className="text-sm font-bold text-md3-gray animate-pulse text-center">Analyzuji interakce, rizika a dlouhodobý vývoj...</div>
                  </div>
                ) : aiGlobalError ? (
                  <div className="text-xs font-bold text-red-500 bg-red-500/10 p-3 rounded-xl">{aiGlobalError}</div>
                ) : aiGlobalData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       <div className="bg-theme-bg p-4 rounded-xl border border-theme-border flex flex-col h-full justify-between">
                          <div className="text-[10px] font-bold text-md3-gray uppercase tracking-widest mb-1">Skóre Rizika</div>
                          <div className="flex items-end gap-2">
                             <div className={cn("text-4xl font-black leading-none", (aiGlobalData.riskScore || 0) > 75 ? "text-red-500" : (aiGlobalData.riskScore || 0) > 40 ? "text-orange-500" : "text-emerald-500")}>{aiGlobalData.riskScore ?? '?'}</div>
                             <div className="text-sm font-bold text-md3-gray mb-1">/ 100</div>
                          </div>
                          <div className="mt-2 w-full h-1.5 bg-theme-border rounded-full overflow-hidden">
                             <div className={cn("h-full rounded-full transition-all", (aiGlobalData.riskScore || 0) > 75 ? "bg-red-500" : (aiGlobalData.riskScore || 0) > 40 ? "bg-orange-500" : "bg-emerald-500")} style={{width: `${aiGlobalData.riskScore || 0}%`}} />
                          </div>
                       </div>
                       
                       <div className="bg-theme-bg p-4 rounded-xl border border-theme-border flex flex-col h-full justify-between">
                          <div className="text-[10px] font-bold text-md3-gray uppercase tracking-widest mb-1">Vývoj (Trend)</div>
                          <div className="text-xl font-black text-theme-text mb-2">
                             {aiGlobalData.generalTrend === 'Improving' ? <span className="text-emerald-500 flex items-center gap-1"><ArrowDownRight size={20}/> Zlepšující</span> : aiGlobalData.generalTrend === 'Worsening' ? <span className="text-red-500 flex items-center gap-1"><ArrowUpRight size={20}/> Zhoršující</span> : <span className="text-orange-500 flex items-center gap-1"><RefreshCw size={20}/> Stabilní</span>}
                          </div>
                          <div className="text-[10px] font-bold text-md3-gray uppercase tracking-widest mt-auto">Riziko M2</div>
                          <div className="text-lg font-black text-theme-text">{aiGlobalData.projectedRiskNextMonth ?? '?'}<span className="text-xs text-md3-gray">%</span></div>
                       </div>

                       <div className="bg-theme-bg p-4 rounded-xl border border-theme-border flex flex-col h-full justify-between col-span-2">
                          <div className="text-[10px] font-bold text-md3-gray uppercase tracking-widest mb-1">AI Doporučení</div>
                          <div className="text-sm font-bold text-theme-text leading-tight mb-2">{aiGlobalData.suggestedAction || 'Zatím nedefinováno'}</div>
                          <div className="text-[10px] font-bold text-md3-gray uppercase tracking-widest mt-auto mb-1">Hlavní Důvod</div>
                          <div className="text-xs font-bold text-cyan-500 uppercase">{aiGlobalData.primaryReason || 'Neznámý'}</div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Radar Chart for Multiple dimensions of risk */}
                      {aiGlobalData.radarScores && (
                        <div className="bg-theme-bg p-4 rounded-xl border border-theme-border">
                          <div className="text-[10px] font-bold text-md3-gray uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Brain size={14} /> Dimenze Zátěže
                          </div>
                          <div className="h-48 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                                { subject: 'Frekvence', A: aiGlobalData.radarScores.frequency || 0, fullMark: 100 },
                                { subject: 'Množství', A: aiGlobalData.radarScores.amount || 0, fullMark: 100 },
                                { subject: 'Načasování', A: aiGlobalData.radarScores.timing || 0, fullMark: 100 },
                                { subject: 'Kombinace', A: aiGlobalData.radarScores.combinations || 0, fullMark: 100 },
                              ]}>
                                <PolarGrid stroke="rgba(150,150,150,0.2)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--md3-gray)', fontSize: 10, fontWeight: 800 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Zátěž" dataKey="A" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4} />
                                <Tooltip contentStyle={{backgroundColor: 'var(--theme-card)', borderColor: 'var(--theme-border)', borderRadius: '8px', fontSize: '10px'}} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="bg-cyan-500/10 p-4 rounded-xl border border-cyan-500/20 h-full flex flex-col">
                          <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Zap size={14} /> Detekované Spouštěče
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {(aiGlobalData.keyTriggers || []).map((t, i) => (
                               <span key={i} className="px-3 py-1.5 bg-black/20 dark:bg-white/10 rounded-lg text-[11px] font-bold text-theme-text">{t}</span>
                            ))}
                          </div>
                          <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-1 mt-auto">Psychologický Kontext</div>
                          <p className="text-xs text-theme-text leading-relaxed">
                            {aiGlobalData.habitAnalysis || "Nedostatek dat pro hlubší analýzu návyků."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {aiGlobalData.weeklyDistribution && aiGlobalData.weeklyDistribution.length === 7 && (
                      <div className="bg-theme-bg p-4 rounded-xl border border-theme-border">
                         <div className="text-[10px] font-bold text-md3-gray uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Activity size={14} /> Týdenní Mapa Rizika (Pondělí - Neděle)
                         </div>
                         <div className="h-32 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={aiGlobalData.weeklyDistribution.map((val, idx) => ({ day: ['Po','Út','St','Čt','Pá','So','Ne'][idx], val }))} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                                 <defs>
                                   <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                     <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                   </linearGradient>
                                 </defs>
                                 <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />
                                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#8e8e93', fontSize: 10, fontWeight: 800}} />
                                 <Tooltip cursor={{stroke: 'var(--md3-border)', strokeWidth: 2}} contentStyle={{backgroundColor: 'var(--theme-card)', borderColor: 'var(--theme-border)', borderRadius: '8px', fontSize: '10px'}} formatter={(val: number) => [`${val}%`, 'Riziko']} />
                                 <Area type="monotone" dataKey="val" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
                              </AreaChart>
                            </ResponsiveContainer>
                         </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm font-bold text-md3-gray italic text-center py-6">Zaznamenejte první dávky pro AI analýzu.</div>
                )}
              </div>
            )}

            {settings.insightEngine && (() => {
              // ML Engine patterns logic
              // 1. Weekend vs Weekday
              let weekendCount = 0;
              let weekdayCount = 0;
              let morningDoses = 0; // 5:00 - 11:59
              let eveningDoses = 0; // 18:00 - 23:59
              
              doses.forEach(d => {
                const date = new Date(d.timestamp);
                const day = date.getDay();
                const hour = date.getHours();
                
                if (day === 0 || day === 6) weekendCount++;
                else weekdayCount++;

                if (hour >= 5 && hour < 12) morningDoses++;
                if (hour >= 18 || hour < 4) eveningDoses++;
              });

              const totalDoses = doses.length || 1;
              const weekendPct = ((weekendCount / totalDoses) * 100).toFixed(0);
              const isWeekendHeavy = (weekendCount / totalDoses) > 0.4; // 2 out of 7 days is 28%. >40% means highly weekend focused.

              const morningPct = ((morningDoses / totalDoses) * 100).toFixed(0);
              const eveningPct = ((eveningDoses / totalDoses) * 100).toFixed(0);

              // Predict next general dose
              const sortedDosesDesc = [...doses].sort((a, b) => b.timestamp - a.timestamp);
              let freqInsights = '';
              let riskLevel = 'Nízké';
              let riskColor = 'text-emerald-500';

              if (sortedDosesDesc.length > 10) {
                 const recent10 = sortedDosesDesc.slice(0, 10);
                 const older10 = sortedDosesDesc.slice(10, 20);
                 if (older10.length === 10) {
                    const recentSpan = recent10[0].timestamp - recent10[9].timestamp;
                    const olderSpan = older10[0].timestamp - older10[9].timestamp;
                    if (recentSpan > 0 && olderSpan > 0) {
                       const ratio = olderSpan / recentSpan;
                       if (ratio > 1.5) {
                          freqInsights = 'Extrémní akcelerace vzorců. Intervaly se dramaticky zkracují.';
                          riskLevel = 'Vysoké';
                          riskColor = 'text-red-500';
                       } else if (ratio > 1.2) {
                          freqInsights = 'Mírné zvýšení frekvence užívání.';
                          riskLevel = 'Střední';
                          riskColor = 'text-amber-500';
                       } else if (ratio < 0.8) {
                          freqInsights = 'Zpomalení vzorců. Užíváte méně často než dříve.';
                       } else {
                          freqInsights = 'Stabilní frekvence užívání bez eskalace.';
                       }
                    }
                 }
              }

              return (
                 <div className="space-y-4">
                    {/* Insights Header */}
                    <div className="p-4 bg-cyan-primary/10 border border-cyan-primary/30 rounded-2xl flex items-center gap-3">
                       <Cpu size={24} className="text-cyan-primary shrink-0" />
                       <div>
                          <h3 className="text-sm font-bold text-cyan-primary tracking-widest uppercase">ML Insight Engine Aktivní</h3>
                          <p className="text-xs text-md3-gray font-medium">Algoritmus zanalyzoval {doses.length} záznamů a identifikoval následující vzorce chování.</p>
                       </div>
                    </div>

                    {/* Vzorce chování */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {/* Víkendový profil */}
                       <div className="md3-card p-5">
                          <div className="flex items-center gap-2 mb-3">
                             <Calendar size={16} className="text-md3-primary" />
                             <span className="text-xs font-bold text-md3-gray uppercase tracking-wider">Týdenní Distribuce</span>
                          </div>
                          <div className="flex items-end gap-2 mb-2">
                             <div className="text-3xl font-black text-theme-text">{weekendPct}%</div>
                             <div className="text-sm font-medium text-md3-gray mb-1">víkendový podíl</div>
                          </div>
                          <div className="text-xs font-bold p-2 bg-theme-bg rounded border border-theme-border text-md3-gray">
                             Závěr AI: <span className="text-theme-text">{isWeekendHeavy ? 'Silně rekreační/víkendové užívání.' : 'Rovnoměrné užívání bez silné víkendové špičky.'}</span>
                          </div>
                       </div>

                       {/* Denní doba */}
                       <div className="md3-card p-5">
                          <div className="flex items-center gap-2 mb-3">
                             <Clock size={16} className="text-md3-primary" />
                             <span className="text-xs font-bold text-md3-gray uppercase tracking-wider">Cirkadiánní Profil</span>
                          </div>
                          <div className="flex gap-4 mb-2">
                             <div>
                                <div className="text-2xl font-black text-theme-text">{morningPct}%</div>
                                <div className="text-[10px] uppercase font-bold text-md3-gray">Ráno</div>
                             </div>
                             <div>
                                <div className="text-2xl font-black text-theme-text">{eveningPct}%</div>
                                <div className="text-[10px] uppercase font-bold text-md3-gray">Večer / Noc</div>
                             </div>
                          </div>
                          <div className="text-xs font-bold p-2 bg-theme-bg rounded border border-theme-border text-md3-gray">
                             Závěr AI: <span className="text-theme-text">{morningDoses > eveningDoses ? 'Převládá ranní aktivace a start dne.' : 'Převládá večerní odpočinek nebo noční aktivita.'}</span>
                          </div>
                       </div>
                    </div>

                    {/* Eskalace a Riziko */}
                    {freqInsights && (
                       <div className="md3-card p-5">
                          <div className="flex items-center gap-2 mb-3">
                             <Activity size={16} className={riskColor} />
                             <span className="text-xs font-bold text-md3-gray uppercase tracking-wider">Rozpoznáno: Eskalace vzorce</span>
                          </div>
                          <div className="text-sm font-bold text-theme-text mb-2">
                             {freqInsights}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold bg-theme-bg border border-theme-border p-2 rounded w-fit">
                             Identifikované riziko: <span className={riskColor}>{riskLevel}</span>
                          </div>
                       </div>
                    )}
                 </div>
              );
            })()}
          </motion.div>
        )}
        
        {overviewTab === 'habits' && (
          <motion.div
            key="habits"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 relative z-10 pb-24"
          >
            {(() => {
              if (doses.length < 5) {
                return (
                  <div className="md3-card p-6 border-dashed border-2 border-theme-border/50 text-center">
                    <Target size={24} className="mx-auto text-md3-gray mb-3" />
                    <h3 className="text-sm font-bold text-theme-text mb-1">Příliš málo dat</h3>
                    <p className="text-xs text-md3-gray">Pro hloubkovou analýzu zvyků je potřeba více záznamů o dávkování.</p>
                  </div>
                );
              }

              const sortedDocs = [...doses].sort((a,b) => a.timestamp - b.timestamp);
              
              // Gaps analysis (Rozestupy)
              const intervalData = [];
              let totalGapHours = 0;
              for (let i = 1; i < sortedDocs.length; i++) {
                const gap = (sortedDocs[i].timestamp - sortedDocs[i-1].timestamp) / 3600000;
                totalGapHours += gap;
                intervalData.push({
                   index: i,
                   date: new Date(sortedDocs[i].timestamp).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' }),
                   gapHours: Number(gap.toFixed(1))
                });
              }
              const avgGap = (totalGapHours / intervalData.length).toFixed(1);

              // Cross-Substance Reactivity
              const reactivity: Record<string, Record<string, number>> = {};
              for (let i = 0; i < sortedDocs.length - 1; i++) {
                const current = sortedDocs[i];
                const next = sortedDocs[i+1];
                const timeDiff = next.timestamp - current.timestamp;
                if (timeDiff <= 6 * 3600000 && current.substanceId !== next.substanceId) { // within 6 hours
                  if (!reactivity[current.substanceId]) reactivity[current.substanceId] = {};
                  reactivity[current.substanceId][next.substanceId] = (reactivity[current.substanceId][next.substanceId] || 0) + 1;
                }
              }

              const combinationInsights = [];
              Object.entries(reactivity).forEach(([sourceId, targets]) => {
                const sourceSub = substances.find(s => s.id === sourceId);
                Object.entries(targets).forEach(([targetId, count]) => {
                  if (count > 1) { // 2+ times
                    const targetSub = substances.find(s => s.id === targetId);
                    if (sourceSub && targetSub) {
                      combinationInsights.push({
                         sourceName: sourceSub.name,
                         sourceColor: sourceSub.color,
                         targetName: targetSub.name,
                         targetColor: targetSub.color,
                         count
                      });
                    }
                  }
                });
              });

              combinationInsights.sort((a,b) => b.count - a.count);

              // Density / Momentum
              const chunkedGaps = [];
              const chunkSize = Math.max(3, Math.floor(intervalData.length / 5));
              for (let i=0; i<intervalData.length; i+=chunkSize) {
                 const chunk = intervalData.slice(i, i+chunkSize);
                 const chunkAvg = chunk.reduce((acc, c) => acc + c.gapHours, 0) / chunk.length;
                 chunkedGaps.push({
                   segment: `${chunk[0].date}`,
                   avgGapHours: Number(chunkAvg.toFixed(1))
                 });
              }

              const momentumRatio = chunkedGaps.length >= 2 
                 ? chunkedGaps[0].avgGapHours / Math.max(0.1, chunkedGaps[chunkedGaps.length - 1].avgGapHours)
                 : 1;

              // Dose vs Gap Analysis (Scatter Plot)
              // Normalizujeme dávky vůči jejich látce (100% = průměrná dávka), a k tomu přiřadíme následující rozestup
              const substanceAverages: Record<string, number> = {};
              substances.forEach(s => {
                 const sDoses = sortedDocs.filter(d => d.substanceId === s.id);
                 if (sDoses.length > 0) {
                    const avg = sDoses.reduce((acc, sum) => acc + sum.amount, 0) / sDoses.length;
                    substanceAverages[s.id] = avg;
                 }
              });

              const doseVsGapData = [];
              let correlationSum = 0;
              let validDataPoints = 0;

              for (let i = 0; i < sortedDocs.length - 1; i++) {
                const current = sortedDocs[i];
                const next = sortedDocs[i+1];
                const gapHours = (next.timestamp - current.timestamp) / 3600000;
                
                // Zajímá nás jen plynulé užívání (rozestup max např. 3 dny)
                if (gapHours <= 72 && gapHours > 0) {
                   const avgDose = substanceAverages[current.substanceId];
                   if (avgDose && avgDose > 0) {
                      const relativeDose = Math.round((current.amount / avgDose) * 100);
                      // Filtrujeme masivní extrémy v dávkách
                      if (relativeDose <= 500) {
                         const sub = substances.find(s => s.id === current.substanceId);
                         doseVsGapData.push({
                            id: current.id,
                            relativeDose,
                            gap: Number(gapHours.toFixed(1)),
                            substanceName: sub?.name || 'Neznámé',
                            color: sub?.color || '#0a84ff',
                            originalAmount: current.amount,
                            unit: sub?.unit || ''
                         });
                         correlationSum += relativeDose * gapHours;
                         validDataPoints++;
                      }
                   }
                }
              }

              return (
                <div className="space-y-6">
                  {/* Summary Metric Header */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="md3-card p-5 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                           <Activity size={100} />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Activity size={16} className="text-md3-primary" />
                          <h3 className="text-[10px] font-black text-theme-text uppercase tracking-widest">Průměrný Rozestup</h3>
                        </div>
                        <div className="text-3xl font-black text-theme-text mb-1">{avgGap} <span className="text-sm text-md3-gray font-medium">Hodin</span></div>
                        <div className="text-[10px] font-bold text-md3-gray">
                           Dlouhodobý průměr bez ohledu na látku.
                        </div>
                     </div>

                     <div className="md3-card p-5 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                           <TrendingUp size={100} />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={16} className={momentumRatio > 1.2 ? "text-red-500" : "text-emerald-500"} />
                          <h3 className="text-[10px] font-black text-theme-text uppercase tracking-widest">Momentum Vzorce</h3>
                        </div>
                        <div className="text-xl font-black text-theme-text mb-1 leading-tight">
                           {momentumRatio > 1.2 ? "Zkracování Pauz" : momentumRatio < 0.8 ? "Snižování Hustoty" : "Stabilní Vzorec"}
                        </div>
                        <div className="text-[10px] font-bold text-md3-gray">
                           {momentumRatio > 1.2 
                             ? "Vaše nedávné rozestupy jsou celkově kratší." 
                             : momentumRatio < 0.8
                             ? "Protahujete rozestupy mezi konzumacemi."
                             : "Frekvence zůstává beze změn stabilní."}
                        </div>
                     </div>

                     <div className="md3-card p-5 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                           <Timer size={100} />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Timer size={16} className="text-purple-500" />
                          <h3 className="text-[10px] font-black text-theme-text uppercase tracking-widest">Nejčastější Návaznost</h3>
                        </div>
                        <div className="text-xl font-black text-theme-text mb-1 leading-tight">
                           {combinationInsights.length > 0 ? `${combinationInsights[0].sourceName} → ${combinationInsights[0].targetName}` : 'Izolované Užití'}
                        </div>
                        <div className="text-[10px] font-bold text-md3-gray">
                           {combinationInsights.length > 0 ? `Výskyt v ${combinationInsights[0].count} případech do 6h.` : 'Žádné silné korelující sekvence.'}
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Rozestupy v čase - graf */}
                    <section className="md3-card p-6 h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-6">
                        <Clock size={16} className="text-md3-primary" />
                        <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Vývoj Průměrných Rozestupů Dávkování</h3>
                      </div>
                      <div className="h-56 w-full grow">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chunkedGaps} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="gapGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0a84ff" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#0a84ff" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />
                            <XAxis dataKey="segment" tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'var(--md3-card)', borderColor: 'var(--md3-border)', borderRadius: '12px', fontSize: '10px' }}
                              formatter={(val: number) => [`${val} h`, 'Prům. pauza']}
                              labelStyle={{ color: '#8e8e93', fontWeight: 800 }}
                            />
                            <Area type="monotone" dataKey="avgGapHours" name="Pauza / Doba bez účinku" stroke="#0a84ff" fill="url(#gapGrad)" strokeWidth={3} activeDot={{ r: 5, strokeWidth: 0, fill: '#0a84ff' }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 text-[10px] font-bold text-md3-gray bg-theme-bg p-3 rounded-xl border border-theme-border flex gap-2">
                         <Lightbulb size={12} className="text-md3-primary shrink-0 mt-0.5" />
                         Agregační graf sledující výplň "hluchých míst". Čím je čára níž, tím častěji dávkujete bez ohledu na substanci. Vzrůstající křivka ukazuje taper a delší prodlevy.
                      </div>
                    </section>

                    {/* Vztah mezi velikostí dávky a následujícím rozestupem */}
                    <section className="md3-card p-6 h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-6">
                        <Dna size={16} className="text-emerald-500" />
                        <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Korelace Dávky & Doby Trvání Zasycení</h3>
                      </div>
                      <div className="h-56 w-full grow">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
                            <XAxis 
                              type="number" 
                              dataKey="relativeDose" 
                              name="Relativní Dávka" 
                              domain={['dataMin - 10', 'dataMax + 10']}
                              tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} 
                              axisLine={false} 
                              tickLine={false}
                              tickFormatter={(val) => `${val}%`}
                            />
                            <YAxis 
                              type="number" 
                              dataKey="gap" 
                              name="Rozestup" 
                              tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} 
                              axisLine={false} 
                              tickLine={false}
                              tickFormatter={(val) => `${val}h`}
                            />
                            <Tooltip 
                              cursor={{ strokeDasharray: '3 3' }}
                              contentStyle={{ backgroundColor: 'var(--md3-card)', borderColor: 'var(--md3-border)', borderRadius: '12px', fontSize: '10px' }}
                              labelStyle={{ display: 'none' }}
                              formatter={(value, name, props) => {
                                 if (name === "Rozestup") return [`${value} h`, "Následující Pauza"];
                                 if (name === "Relativní Dávka") return [`${value}% průměru (${props.payload.originalAmount} ${props.payload.unit})`, "Síla Dávky"];
                                 return [value, name];
                              }}
                            />
                            <ZAxis range={[30, 80]} />
                            <Scatter data={doseVsGapData} fill="#10b981" opacity={0.7} />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 text-[10px] font-bold text-md3-gray bg-theme-bg p-3 rounded-xl border border-theme-border flex gap-2">
                         <Lightbulb size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                         Graf ukazuje, jak velikost dávky zdrží další užití. Zjistíte tak, zda velká (nad 100%) dávka opravdu způsobuje delší pauzu, nebo zda užíváte nezávisle na velikosti.
                      </div>
                    </section>
                  </div>

                  {/* Přímé Rozestupy a Četnost */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                     <section className="lg:col-span-2 md3-card p-6">
                       <div className="flex items-center gap-2 mb-6">
                         <BarChart2 size={16} className="text-orange-500" />
                         <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Přímá Sekvence Rozestupů</h3>
                       </div>
                       <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={intervalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />
                               <XAxis dataKey="date" tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                               <YAxis tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}h`} />
                               <Tooltip 
                                 cursor={{ fill: 'var(--md3-border)', opacity: 0.4 }}
                                 contentStyle={{ backgroundColor: 'var(--md3-card)', borderColor: 'var(--md3-border)', borderRadius: '12px', fontSize: '10px' }}
                                 formatter={(val: number) => [`${val} h`, 'Rozestup od minulé dávky']}
                                 labelStyle={{ color: '#8e8e93', fontWeight: 800 }}
                               />
                               <Bar dataKey="gapHours" fill="#f97316" radius={[4, 4, 0, 0]} opacity={0.8}>
                                 {intervalData.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={entry.gapHours < 4 ? '#ef4444' : entry.gapHours > 24 ? '#10b981' : '#f97316'} />
                                 ))}
                               </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                       </div>
                       <div className="mt-4 flex flex-wrap gap-3">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-theme-text">
                            <div className="w-2 h-2 rounded-full bg-red-500" /> &lt; 4h (Vysoká četnost)
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-theme-text">
                            <div className="w-2 h-2 rounded-full bg-orange-500" /> Běžné rozestupy
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-theme-text">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" /> &gt; 24h (Dlouhé pauzy)
                          </div>
                       </div>
                     </section>

                     {/* Combinations Info Panel */}
                    <section className="md3-card p-6 flex flex-col">
                      <div className="flex items-center gap-2 mb-6">
                        <GitMerge size={16} className="text-purple-500" />
                        <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Polydrug Spouštěče (Kaskády do 6h)</h3>
                      </div>
                      
                      {combinationInsights.length === 0 ? (
                        <div className="text-center py-10 flex-1 flex flex-col justify-center items-center">
                           <GitMerge size={32} className="text-md3-gray opacity-30 mb-2" />
                           <div className="text-sm text-md3-gray font-bold italic">Žádné zaznamenané kaskády. Udržujete separaci.</div>
                        </div>
                      ) : (
                        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                           <div className="text-[10px] font-bold text-md3-gray bg-theme-bg p-2 rounded mb-3">
                              Analýza detekovala "dominový efekt" u konkrétních látek:
                           </div>
                           {combinationInsights.map((ci, idx) => (
                             <div key={idx} className="flex flex-col bg-theme-bg rounded-xl border border-theme-border p-3 gap-2 relative overflow-hidden group">
                               <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-black/5 dark:to-white/5 transform translate-x-4 -translate-y-4 rounded-full pointer-events-none" />
                               <div className="flex items-center justify-between z-10">
                                  <div className="flex items-center gap-2 max-w-[70%]">
                                     <div className="flex items-center gap-1 min-w-0">
                                        <div className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: ci.sourceColor }} />
                                        <span className="text-xs font-black text-theme-text truncate">{ci.sourceName}</span>
                                     </div>
                                     <ChevronRight size={14} className="text-md3-gray shrink-0" />
                                     <div className="flex items-center gap-1 min-w-0">
                                        <div className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: ci.targetColor }} />
                                        <span className="text-xs font-black text-theme-text truncate">{ci.targetName}</span>
                                     </div>
                                  </div>
                                  <div className="text-sm font-black text-theme-text whitespace-nowrap bg-purple-500/10 text-purple-500 px-2 py-1 rounded">{ci.count}x</div>
                               </div>
                             </div>
                           ))}
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {overviewTab === 'taper' && (
          <motion.div
            key="taper"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="md3-card p-6">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-500">
                     <Brain size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-theme-text uppercase tracking-widest leading-none mb-1">Systém Postupného Snižování Dávek</h3>
                    <div className="text-[10px] font-bold text-md3-gray">Inteligentní tapering řízený AI.</div>
                  </div>
               </div>
               
               {taperError && (
                 <div className="text-xs bg-red-500/10 text-red-500 border border-red-500/20 p-3 rounded-lg mb-4">
                   {taperError}
                 </div>
               )}

               {!settings.activeTaperingPlan ? (
                 <div className="space-y-4">
                   <div className="space-y-1">
                     <label className="text-xs font-bold text-md3-gray">Vyberte látku k vysazování</label>
                     <select
                       value={taperSubstanceId}
                       onChange={(e) => setTaperSubstanceId(e.target.value)}
                       className="w-full md3-input"
                     >
                       <option value="">Zvolte látku...</option>
                       {substances.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     </select>
                   </div>
                   <div className="space-y-1">
                     <label className="text-xs font-bold text-md3-gray">Vaše Cíle (Doplňte prompt pro AI)</label>
                     <textarea
                       value={taperPrompt}
                       onChange={(e) => setTaperPrompt(e.target.value)}
                       placeholder="Např: Rád bych to snížil na nulu během 14 dnů bez těžkých absťáků..."
                       className="w-full md3-input h-24 text-xs"
                     />
                   </div>
                   <button
                     onClick={generateTaperPlan}
                     disabled={isTaperLoading}
                     className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                   >
                     {isTaperLoading ? 'Generuji plán...' : 'Vytvořit AI Tapering Plán'}
                   </button>
                 </div>
               ) : (
                 <div className="space-y-6">
                   <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                     <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-2">Aktivní Plán: {substances.find(s => s.id === settings.activeTaperingPlan?.substanceId)?.name || 'Látka'}</h4>
                     <p className="text-xs text-theme-text mb-4">
                       {settings.activeTaperingPlan.aiAdvice}
                     </p>
                     
                     <div className="h-48 mt-4 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={settings.activeTaperingPlan.plan} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />
                            <XAxis dataKey="day" tickFormatter={(val) => `Den ${val}`} tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} />
                            <Tooltip 
                              cursor={{ stroke: 'rgba(150,150,150,0.2)', strokeWidth: 2 }}
                              contentStyle={{ backgroundColor: 'var(--md3-card)', borderColor: 'var(--md3-border)', borderRadius: '12px', fontSize: '10px' }}
                              labelFormatter={(label) => `Den ${label}`}
                              formatter={(val: number) => [val, 'Doporučená Dávka']}
                            />
                            <Line type="monotone" dataKey="totalRecommendedAmount" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6, fill: '#10b981' }} />
                         </LineChart>
                       </ResponsiveContainer>
                     </div>
                     
                     <div className="mt-6 space-y-3">
                       <h5 className="text-[10px] font-black tracking-widest uppercase text-md3-gray">Rozpis Dávek</h5>
                       <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                         {settings.activeTaperingPlan.plan.map((dayItem) => (
                           <div key={dayItem.day} className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10 flex justify-between items-center">
                             <div>
                               <div className="text-xs font-bold text-theme-text">Den {dayItem.day} 
                                 <span className="text-[10px] font-normal text-md3-gray ml-2 text-opacity-70">{new Date(dayItem.date).toLocaleDateString()}</span>
                               </div>
                               <div className="mt-2 space-y-1">
                                 {dayItem.doses?.map((dose, i) => (
                                   <div key={i} className="text-[10px] text-md3-gray flex items-center gap-2">
                                     <span className="bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded font-mono">{dose.time}</span>
                                     <span>{dose.amount}</span>
                                   </div>
                                 ))}
                                 {(!dayItem.doses || dayItem.doses.length === 0) && (
                                   <div className="text-[10px] text-md3-gray italic">Časy neurčeny (Cesta postupného snižování)</div>
                                 )}
                               </div>
                             </div>
                             <div className="text-right">
                               <div className="text-[10px] uppercase text-emerald-500 font-bold">Celkem</div>
                               <div className="text-sm font-black text-emerald-400">{dayItem.totalRecommendedAmount}</div>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>
                   
                   <div className="flex gap-2">
                     <button
                       onClick={() => {
                         if (onUpdateSettings) {
                           onUpdateSettings({ ...settings, activeTaperingPlan: null });
                         }
                       }}
                       className="flex-1 py-3 bg-theme-subtle hover:bg-theme-subtle-hover text-theme-text font-black uppercase tracking-widest text-xs rounded-xl border border-theme-border flex items-center justify-center gap-2"
                     >
                       Zrušit Plán
                     </button>
                   </div>
                 </div>
               )}
            </div>
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
    const substancePredictions = calculatePredictions(sDoses, substances, period, settings);
    const IconComponent = getIconComponent(substance.icon);
    
    const substanceTrackingDays = sDoses.length > 0 
      ? Math.min(numericPeriod, Math.max(1, Math.ceil((now - Math.min(...sDoses.map(d => d.timestamp))) / dayMs))) 
      : numericPeriod;

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

    const dailyAmount = sDoses.length > 0 ? totalAmount / substanceTrackingDays : 0;
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
            { id: 'combinations', label: 'Kombinace', icon: Activity },
            { id: 'reactions', label: 'Reakce', icon: Smile },
            ...(substance.activeIngredientName || (substance.activeIngredients && substance.activeIngredients.length > 0) ? [{ id: 'active-ingredients', label: 'Účinné látky', icon: FlaskConical }] : []),
            ...(substance.customFields && substance.customFields.length > 0 ? [{ id: 'custom-fields', label: 'Vlastní pole', icon: Database }] : []),
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
                    {formatAmount(totalAmount, substance.unit, 1)}
                  </div>
                  {renderActiveIngredientsString(sDoses, substance) && (
                    <div className="text-xs font-bold text-md3-primary mt-1">
                      {renderActiveIngredientsString(sDoses, substance)}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="md3-card p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={14} className="text-md3-primary" />
                    <h3 className="text-[10px] font-black text-theme-text uppercase tracking-widest">Množství za den</h3>
                  </div>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyTrend}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={substance.color} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={substance.color} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }}
                          dy={5}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }}
                          width={24}
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
                          activeDot={settings.chartPoints ? { r: 5, strokeWidth: 0, fill: substance.color } : false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="md3-card p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={14} className="text-md3-primary" />
                    <h3 className="text-[10px] font-black text-theme-text uppercase tracking-widest">Kumulativní spotřeba</h3>
                  </div>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyTrend}>
                        <defs>
                          <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={substance.color} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={substance.color} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }}
                          dy={5}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#8e8e93', fontSize: 9, fontWeight: 800 }}
                          width={24}
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
                          activeDot={settings.chartPoints ? { r: 5, strokeWidth: 0, fill: substance.color } : false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>
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

              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Activity size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Hustota užívání (Den a Čas)</h3>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                      const scatterData = sDoses.map(d => {
                        const date = new Date(d.timestamp);
                        return {
                          x: date.getDay() === 0 ? 6 : date.getDay() - 1, // 0 is Monday
                          y: date.getHours() + (date.getMinutes() / 60),
                          z: d.amount,
                          dayName: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'][date.getDay() === 0 ? 6 : date.getDay() - 1],
                          timeStr: date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
                          amount: d.amount
                        };
                      });
                      
                      return (
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                          {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />}
                          <XAxis 
                            type="number" 
                            dataKey="x" 
                            name="Den" 
                            domain={[-0.5, 6.5]} 
                            ticks={[0,1,2,3,4,5,6]} 
                            tickFormatter={(v) => ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'][v]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="y" 
                            name="Čas" 
                            domain={[0, 24]} 
                            ticks={[0, 4, 8, 12, 16, 20, 24]} 
                            tickFormatter={(v) => `${v}:00`} 
                            reversed
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                            width={40}
                          />
                          <ZAxis type="number" dataKey="z" range={[20, 400]} />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }}
                            contentStyle={{ backgroundColor: 'rgba(28,28,30,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            formatter={(value: any, name: string, props: any) => {
                              if (name === 'Den') return [props.payload.dayName, 'Den'];
                              if (name === 'Čas') return [props.payload.timeStr, 'Čas'];
                              if (name === 'z') return [`${props.payload.amount} ${substance.unit}`, 'Dávka'];
                              return [value, name];
                            }}
                          />
                          <Scatter name="Dávky" data={scatterData} fill={substance.color || "var(--md3-primary, #0a84ff)"} opacity={0.7} />
                        </ScatterChart>
                      );
                    })()}
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
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Distribuce velikosti dávek</h3>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="md3-card p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <PieChartIcon size={16} className="text-md3-primary" />
                    <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Způsob užití</h3>
                  </div>
                  {(() => {
                    const routes: Record<string, number> = {};
                    sDoses.forEach(d => {
                      const r = d.route || 'oral';
                      routes[r] = (routes[r] || 0) + 1;
                    });
                    const data = Object.keys(routes).map(r => ({
                      name: { oral: 'Ústně', sublingual: 'Pod jazyk', insufflated: 'Šňupání', smoked: 'Kouření', vaped: 'Vapo', iv: 'IV' }[r] || r,
                      value: routes[r]
                    }));
                    if (data.length === 0) return <div className="text-xs text-center italic text-md3-gray">Žádná data</div>;
                    const COLORS = ['#00d1ff', '#10e47a', '#ff9f0a', '#ff3b30', '#c864f4', '#ffd60a'];
                    
                    return (
                      <div className="h-48 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip type="count" />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </section>
                
                <section className="md3-card p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <PieChartIcon size={16} className="text-md3-primary" />
                    <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Účel použití</h3>
                  </div>
                  {(() => {
                    const purposes: Record<string, number> = {};
                    let hasPurpose = false;
                    sDoses.forEach(d => {
                      if (d.purpose) {
                        hasPurpose = true;
                        purposes[d.purpose] = (purposes[d.purpose] || 0) + 1;
                      }
                    });
                    if (!hasPurpose) return <div className="text-xs text-center italic text-md3-gray mt-10">Záznamy neobsahují účel použití.</div>;
                    
                    const data = Object.keys(purposes).map(p => ({
                      name: { medical: 'Medikace', recreational: 'Rekreace', functional: 'Funkční', spiritual: 'Spirituální', other: 'Jiné' }[p] || p,
                      value: purposes[p]
                    }));
                    const COLORS = ['#c864f4', '#00d1ff', '#10e47a', '#ffd60a', '#ff9f0a'];
                    
                    return (
                      <div className="h-48 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip type="count" />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </section>
              </div>
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
                  {(function(){
                    if (sDoses.length === 0) return null;
                    const ingrs = calculateActiveIngredients(sDoses, substance);
                    const entries = Object.entries(ingrs).filter(([, val]) => val > 0);
                    if (entries.length === 0) return null;
                    return (
                      <div className="text-xs font-bold text-md3-primary mt-1">
                        {entries.map(([n,v]) => `${(v / sDoses.length).toFixed(2)}${substance.unit} ${n}`).join(' + ')}
                      </div>
                    );
                  })()}
                </div>
                <div className="md3-card p-5">
                  <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-2">Maximální dávka</div>
                  <div className="text-2xl font-bold text-theme-text tracking-tight">
                    {sDoses.length > 0 ? Math.max(...sDoses.map(d => d.amount)).toFixed(1) : 0} <span className="text-sm font-medium text-md3-gray">{substance.unit}</span>
                  </div>
                  {(function(){
                    if (sDoses.length === 0) return null;
                    const sumMap = sDoses.map(d => ({ d, total: Object.values(calculateActiveIngredients([d], substance)).reduce((a,b)=>a+b,0) }));
                    const maxDoseObj = sumMap.sort((a,b) => b.total - a.total)[0]?.d;
                    if (!maxDoseObj) return null;
                    const str = renderActiveIngredientsString([maxDoseObj], substance);
                    if (!str) return null;
                    return (
                      <div className="text-xs font-bold text-md3-primary mt-1">
                        {str}
                      </div>
                    );
                  })()}
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
                    <span className="text-sm font-bold text-md3-gray">Nejčastější způsob</span>
                    <span className="text-lg font-bold text-theme-text">
                      {(() => {
                        if (sDoses.length === 0) return '-';
                        const routes: Record<string, number> = {};
                        sDoses.forEach(d => {
                          const r = d.route || 'oral';
                          routes[r] = (routes[r] || 0) + 1;
                        });
                        const maxRoute = Object.keys(routes).reduce((a, b) => routes[a] > routes[b] ? a : b);
                        const routeNames: Record<string, string> = {
                          oral: 'Ústně', sublingual: 'Sublingválně', insufflated: 'Šňupání',
                          smoked: 'Kouření', vaped: 'Vaporizace', iv: 'Intravenózně'
                        };
                        return routeNames[maxRoute] || maxRoute;
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                    <span className="text-sm font-bold text-md3-gray">Průměrné hodnocení</span>
                    <span className="text-lg font-bold text-theme-text">
                      {(() => {
                        const ratedDoses = sDoses.filter(d => d.rating !== undefined);
                        if (ratedDoses.length === 0) return '-';
                        const avg = ratedDoses.reduce((sum, d) => sum + (d.rating || 0), 0) / ratedDoses.length;
                        return `${avg.toFixed(1)} / 5`;
                      })()}
                    </span>
                  </div>
                  {sDoses.length > 0 && (
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                      <span className="text-sm font-bold text-md3-gray">Čas od poslední dávky</span>
                      <span className="text-lg font-bold text-theme-text">
                        {(() => {
                          const lastDose = [...sDoses].sort((a, b) => b.timestamp - a.timestamp)[0];
                          const diff = Date.now() - lastDose.timestamp;
                          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                          if (days > 0) return `${days}d ${hours}h`;
                          return `${hours}h`;
                        })()}
                      </span>
                    </div>
                  )}
                  {substance.stash !== undefined && substance.price > 0 && (
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                      <span className="text-sm font-bold text-md3-gray">Hodnota zásoby</span>
                      <span className="text-lg font-bold text-theme-text">
                        {(substance.stash * substance.price).toFixed(0)} {settings.currency}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border">
                    <span className="text-sm font-bold text-md3-gray">Průměrně za den</span>
                    <span className="text-lg font-bold text-theme-text">
                      {(sDoses.length / substanceTrackingDays).toFixed(1)}x
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
              
              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Měsíční srovnání (Spotřeba)</h3>
                </div>
                {(() => {
                  if (sDoses.length === 0) return <div className="text-xs text-center italic text-md3-gray mt-4">Žádná data pro srovnání.</div>;
                  
                  const monthlyAmounts: Record<string, number> = {};
                  sDoses.forEach(d => {
                    const monthKey = new Date(d.timestamp).toLocaleString('cs-CZ', { month: 'short', year: 'numeric' });
                    monthlyAmounts[monthKey] = (monthlyAmounts[monthKey] || 0) + d.amount;
                  });
                  
                  // Sort month keys chronologically
                  const sortedKeys = Object.keys(monthlyAmounts).sort((a, b) => {
                    const [monthA, yearA] = a.split(' ');
                    const [monthB, yearB] = b.split(' ');
                    const dateA = new Date(parseInt(yearA), ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'].findIndex(m => monthA.startsWith(m)));
                    const dateB = new Date(parseInt(yearB), ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'].findIndex(m => monthB.startsWith(m)));
                    return dateA.getTime() - dateB.getTime();
                  });
                  
                  const chartData = sortedKeys.map(k => ({
                    month: k,
                    amount: parseFloat(monthlyAmounts[k].toFixed(1))
                  }));
                  
                  return (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                          <XAxis 
                            dataKey="month" 
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
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(28,28,30,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            formatter={(value: any) => [`${value} ${substance.unit}`, 'Celkem']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="amount" 
                            stroke={substance.color || "var(--md3-primary, #0a84ff)"} 
                            strokeWidth={3} 
                            dot={settings.chartPoints ? { r: 4, strokeWidth: 0, fill: substance.color || "var(--md3-primary, #0a84ff)" } : false} 
                            activeDot={{ r: 6, strokeWidth: 0 }} 
                            isAnimationActive={settings.chartAnimation}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
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
                        <div key={strain.name} className="flex items-center justify-between p-3 rounded-xl bg-theme-subtle border border-theme-border min-w-0 gap-2">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)` }} />
                            <span className="text-sm font-bold text-theme-text truncate">{strain.name}</span>
                          </div>
                          <div className="text-right flex-shrink-0">
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

          {detailTab === 'combinations' && (
            <motion.div
              key="combinations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 relative z-10"
            >
              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Activity size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Kombinováno s</h3>
                </div>
                {(() => {
                  if (sDoses.length === 0) return <div className="text-sm text-md3-gray italic text-center p-4">Zatím žádná data o kombinacích.</div>;
                  
                  // A combination is considered if taken within 6 hours of each other
                  const COMBO_WINDOW = 6 * 60 * 60 * 1000;
                  const combos: Record<string, number> = {};
                  
                  sDoses.forEach(dose => {
                    const otherDoses = doses.filter(d => 
                      d.id !== dose.id && 
                      d.substanceId !== dose.substanceId && 
                      Math.abs(d.timestamp - dose.timestamp) <= COMBO_WINDOW
                    );
                    
                    otherDoses.forEach(other => {
                      const otherSub = substances.find(s => s.id === other.substanceId);
                      if (otherSub) {
                        combos[otherSub.name] = (combos[otherSub.name] || 0) + 1;
                      }
                    });
                  });
                  
                  const sortedCombos = Object.entries(combos)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);
                    
                  if (sortedCombos.length === 0) {
                    return <div className="text-sm text-md3-gray italic text-center p-4">Tato látka nebyla v daném období s ničím kombinována.</div>;
                  }
                  
                  return (
                    <div className="space-y-3">
                      {sortedCombos.map(([name, count]) => {
                        const sub = substances.find(s => s.name === name);
                        const otherColor = sub?.color || '#00d1ff';
                        const maxCount = sortedCombos[0][1];
                        const percentage = (count / maxCount) * 100;
                        
                        return (
                          <div key={name} className="flex flex-col gap-1.5 p-3 rounded-xl bg-theme-subtle border border-theme-border">
                            <div className="flex justify-between items-end">
                              <span className="text-sm font-bold text-theme-text" style={{ color: otherColor }}>{name}</span>
                              <span className="text-xs font-bold text-md3-gray">{count}x</span>
                            </div>
                            <div className="h-1.5 w-full bg-theme-bg rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: otherColor }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </section>
            </motion.div>
          )}

          {detailTab === 'reactions' && (
            <motion.div
              key="reactions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 relative z-10"
            >
              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Smile size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Detailní statistiky parametrů</h3>
                </div>
                {(() => {
                  if (!substance.customFields || substance.customFields.length === 0) {
                    return <div className="text-sm text-md3-gray italic text-center p-4">Tato látka nemá definované žádné vlastní atributy pro sledování statistik.</div>;
                  }

                  let hasAnyData = false;

                  return (
                    <div className="space-y-8">
                      {substance.customFields.map(field => {
                        // Gather data for this field
                        const values = sDoses.map(d => d.customFieldValues?.[field.id]).filter(v => v !== undefined && v !== '');
                        
                        if (values.length === 0) return null;
                        hasAnyData = true;

                        if (field.type === 'rating') {
                          const avgRating = values.reduce((sum, v) => sum + (v as number), 0) / values.length;
                          const distribution = [0, 0, 0, 0, 0];
                          values.forEach(v => {
                            const val = v as number;
                            if (val >= 1 && val <= 5) distribution[val - 1]++;
                          });

                          return (
                            <div key={field.id} className="space-y-4">
                              <h4 className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-3">{field.name}</h4>
                              <div className="flex justify-center items-center flex-col p-4 bg-theme-subtle rounded-2xl border border-theme-border">
                                <div className="text-4xl font-black text-theme-text drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] mb-1">{avgRating.toFixed(1)}</div>
                                <div className="text-xs font-bold text-md3-gray uppercase tracking-widest">Průměrné hodnocení</div>
                                <div className="flex gap-1 mt-2">
                                  {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className={`w-3 h-3 rounded-full ${i <= Math.round(avgRating) ? 'bg-md3-primary glow-effects-enabled:shadow-[0_0_8px_var(--md3-primary-50)]' : 'bg-theme-border'}`} />
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2 mt-4">
                                {[5, 4, 3, 2, 1].map(val => {
                                  const count = distribution[val - 1];
                                  const percentage = (count / values.length) * 100;
                                  return (
                                    <div key={val} className="flex items-center gap-3">
                                      <div className="w-8 text-right text-xs font-bold text-theme-text">{val} <span className="text-[10px] text-md3-gray">★</span></div>
                                      <div className="flex-1 h-2 bg-theme-bg rounded-full overflow-hidden">
                                        <div className="h-full bg-md3-primary rounded-full transition-all" style={{ width: `${percentage}%` }} />
                                      </div>
                                      <div className="w-8 text-xs font-bold text-md3-gray">{count}x</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        if (field.type === 'boolean') {
                          const trueCount = values.filter(v => v === true).length;
                          const percentage = (trueCount / sDoses.length) * 100;

                          if (trueCount === 0) return null;

                          return (
                            <div key={field.id} className="space-y-2">
                              <h4 className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-3">{field.name}</h4>
                              <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-xs font-bold">
                                  <span className="text-theme-text">Ano</span>
                                  <span className="text-md3-gray">{trueCount}x ({percentage.toFixed(0)}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-theme-bg rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (field.type === 'select' || field.type === 'multiselect') {
                          const counts: Record<string, number> = {};
                          values.forEach(v => {
                            if (Array.isArray(v)) {
                              v.forEach(val => {
                                const parsedVal = String(val);
                                counts[parsedVal] = (counts[parsedVal] || 0) + 1;
                              });
                            } else {
                              const val = String(v);
                              counts[val] = (counts[val] || 0) + 1;
                            }
                          });

                          return (
                            <div key={field.id} className="space-y-2">
                              <h4 className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-3">{field.name}</h4>
                              <div className="space-y-2">
                                {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([opt, count], i) => {
                                  const percentage = (count / values.length) * 100;
                                  const colors = ['bg-cyan-primary', 'bg-emerald-500', 'bg-md3-orange', 'bg-rose-500', 'bg-violet-500'];
                                  const color = colors[i % colors.length];

                                  return (
                                    <div key={opt} className="flex flex-col gap-1">
                                      <div className="flex justify-between text-xs font-bold">
                                        <span className="text-theme-text">{opt}</span>
                                        <span className="text-md3-gray">{count}x ({percentage.toFixed(0)}%)</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-theme-bg rounded-full overflow-hidden">
                                        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        if (field.type === 'number') {
                          const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));
                          if (numericValues.length === 0) return null;
                          
                          const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
                          const min = Math.min(...numericValues);
                          const max = Math.max(...numericValues);

                          return (
                            <div key={field.id} className="space-y-2">
                              <h4 className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-3">{field.name}</h4>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="p-3 bg-theme-subtle rounded-xl border border-theme-border text-center">
                                  <div className="text-[10px] text-md3-gray uppercase font-bold mb-1">Průměr</div>
                                  <div className="text-lg font-black text-theme-text">{avg.toFixed(1)}{field.unit && <span className="text-[10px] ml-1 text-md3-gray">{field.unit}</span>}</div>
                                </div>
                                <div className="p-3 bg-theme-subtle rounded-xl border border-theme-border text-center">
                                  <div className="text-[10px] text-md3-gray uppercase font-bold mb-1">Min</div>
                                  <div className="text-lg font-black text-theme-text">{min}{field.unit && <span className="text-[10px] ml-1 text-md3-gray">{field.unit}</span>}</div>
                                </div>
                                <div className="p-3 bg-theme-subtle rounded-xl border border-theme-border text-center">
                                  <div className="text-[10px] text-md3-gray uppercase font-bold mb-1">Max</div>
                                  <div className="text-lg font-black text-theme-text">{max}{field.unit && <span className="text-[10px] ml-1 text-md3-gray">{field.unit}</span>}</div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return null; // Don't render complex graphs for 'text'
                      })}
                      
                      {!hasAnyData && (
                        <div className="text-sm text-md3-gray italic text-center p-4">U záznamů nebyly vyplněny žádné vlastní atributy.</div>
                      )}
                    </div>
                  );
                })()}
              </section>
            </motion.div>
          )}

          {detailTab === 'active-ingredients' && (substance.activeIngredientName || (substance.activeIngredients && substance.activeIngredients.length > 0)) && (
            <motion.div
              key="active-ingredients"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 relative z-10"
            >
              <section className="md3-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <FlaskConical size={16} className="text-md3-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">Analýza účinných látek</h3>
                </div>
                
                {(() => {
                  const activeSums = calculateActiveIngredients(sDoses, substance);
                  const activeNames = Object.keys(activeSums);
                  
                  // Monthly aggregates for active vs total
                  const monthlyData: Record<string, { total: number } & Record<string, number>> = {};
                  sDoses.forEach(d => {
                    const month = new Date(d.timestamp).toLocaleString('cs-CZ', { month: 'short', year: '2-digit' });
                    if (!monthlyData[month]) {
                      monthlyData[month] = { total: 0 };
                      activeNames.forEach(name => monthlyData[month][name] = 0);
                    }
                    monthlyData[month].total += d.amount;
                    
                    const dActives = calculateActiveIngredients([d], substance);
                    Object.entries(dActives).forEach(([k, v]) => {
                      monthlyData[month][k] = (monthlyData[month][k] || 0) + v;
                    });
                  });
                  
                  const chartData = Object.entries(monthlyData).map(([month, data]) => {
                    const item: any = { month, total: parseFloat(data.total.toFixed(2)) };
                    activeNames.forEach(name => {
                       item[name] = parseFloat((data[name] || 0).toFixed(2));
                    });
                    return item;
                  });
                  
                  // A palette for active ingredients if there are multiple
                  const colors = [substance.color || '#0a84ff', '#ff3b30', '#34c759', '#ff9f0a', '#af52de', '#ff2d55'];
                  
                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                         {activeNames.map((name, idx) => (
                           <div key={name} className="bg-theme-subtle p-4 rounded-2xl border border-theme-border shadow-sm flex flex-col justify-between">
                             <div className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-2 line-clamp-1 truncate">{name}</div>
                             <div className="text-xl font-black text-theme-text mb-1">
                               {formatAmount(activeSums[name], substance.unit, 2)}
                             </div>
                             <div className="text-[10px] font-bold text-md3-gray">
                               Prům. podíl: {totalAmount > 0 ? ((activeSums[name] / totalAmount) * 100).toFixed(1) : 0}%
                             </div>
                           </div>
                         ))}
                      </div>
                      
                      <div className="h-64 w-full md3-card p-4">
                        <h4 className="text-[10px] font-black text-md3-gray uppercase tracking-widest mb-4">Spotřeba látek v čase (Měsíčně)</h4>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                            <XAxis 
                              dataKey="month" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                              dy={10}
                            />
                            <YAxis 
                              yAxisId="left"
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                              width={30}
                            />
                            <YAxis 
                              yAxisId="right"
                              orientation="right"
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: substance.color || '#0a84ff', fontSize: 10, fontWeight: 600 }}
                              width={30}
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(28,28,30,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                              itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Bar yAxisId="left" dataKey="total" name={`Celkem objem (${substance.unit})`} fill="rgba(150,150,150,0.15)" radius={[4, 4, 0, 0]} />
                            {activeNames.map((name, idx) => (
                               <Bar key={name} yAxisId="right" dataKey={name} name={`${name} (${substance.unit})`} fill={colors[idx % colors.length]} radius={[4, 4, 0, 0]} stackId="actives" />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}
              </section>
            </motion.div>
          )}

          {detailTab === 'custom-fields' && substance.customFields && substance.customFields.length > 0 && (
            <motion.div
              key="custom-fields"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 relative z-10"
            >
              {substance.customFields.map((field) => {
                const values = sDoses.map(d => d.customFieldValues?.[field.id]).filter(v => v !== undefined && v !== null && v !== '');
                
                if (values.length === 0) {
                  return (
                    <section key={field.id} className="md3-card p-6 opacity-60">
                      <div className="flex items-center gap-2 mb-2">
                        <Database size={16} className="text-md3-gray" />
                        <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">{field.name}</h3>
                      </div>
                      <div className="text-xs text-md3-gray italic border-t border-theme-border/50 pt-4 mt-2">Zatím nejsou k dispozici žádná data k analýze.</div>
                    </section>
                  );
                }

                return (
                  <section key={field.id} className="md3-card p-6">
                    <div className="flex flex-col mb-6">
                      <div className="flex items-center gap-2">
                        <Database size={16} className="text-md3-primary" />
                        <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">{field.name}</h3>
                      </div>
                      <div className="text-[10px] text-md3-gray font-bold uppercase tracking-widest mt-1">
                        Typ pole: {field.type === 'boolean' ? 'Zaškrtávací' : field.type === 'rating' ? 'Hodnocení' : field.type === 'number' ? 'Číslo' : field.type === 'select' ? 'Výběr' : 'Text'}
                        {field.unit && ` • Jednotka: ${field.unit}`}
                      </div>
                    </div>

                    {field.type === 'boolean' && (() => {
                       const trues = values.filter(v => v === true).length;
                       const falses = values.length - trues;
                       const pct = (trues / values.length) * 100;
                       return (
                         <div className="space-y-4">
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-xs font-bold text-md3-gray uppercase tracking-widest">Aktivní ve {pct.toFixed(0)}% záznamů</span>
                             <span className="text-xs font-bold text-theme-text">{trues} / {values.length}</span>
                           </div>
                           <div className="w-full h-3 bg-theme-bg rounded-full overflow-hidden shadow-inner">
                             <div className="h-full bg-md3-primary" style={{ width: `${pct}%` }} />
                           </div>
                         </div>
                       );
                    })()}

                    {field.type === 'rating' && (() => {
                       const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
                       const avg = numValues.reduce((a,b)=>a+b, 0) / numValues.length;
                       
                       const counts: Record<number, number> = {1:0, 2:0, 3:0, 4:0, 5:0};
                       numValues.forEach(v => { counts[Math.round(v)] = (counts[Math.round(v)] || 0) + 1; });
                       
                       return (
                         <div className="space-y-4">
                           <div className="flex items-end gap-2 mb-4">
                             <div className="text-3xl font-black text-theme-text leading-none">{avg.toFixed(1)}</div>
                             <div className="text-xs font-bold text-md3-gray uppercase tracking-widest pb-1">z 5 (Průměr)</div>
                           </div>
                           <div className="space-y-2">
                             {[5, 4, 3, 2, 1].map(star => {
                               const count = counts[star] || 0;
                               const pct = numValues.length > 0 ? (count / numValues.length) * 100 : 0;
                               return (
                                 <div key={star} className="flex items-center gap-3">
                                   <div className="text-xs font-bold text-md3-gray w-4">{star}★</div>
                                   <div className="flex-1 h-2 bg-theme-bg rounded-full overflow-hidden shadow-inner">
                                     <div className="h-full bg-md3-orange" style={{ width: `${pct}%` }} />
                                   </div>
                                   <div className="text-[10px] font-bold text-theme-text w-6 text-right">{count}x</div>
                                 </div>
                               );
                             })}
                           </div>
                         </div>
                       );
                    })()}

                    {field.type === 'number' && (() => {
                       const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
                       const avg = numValues.reduce((a,b)=>a+b, 0) / numValues.length;
                       const min = Math.min(...numValues);
                       const max = Math.max(...numValues);
                       
                       // Create chart data matching the trend graph pattern
                       const chartData = sDoses.filter(d => d.customFieldValues?.[field.id] !== undefined).map(d => ({
                         time: new Date(d.timestamp).toLocaleDateString('cs-CZ'),
                         value: Number(d.customFieldValues![field.id])
                       })).reverse();

                       return (
                         <div className="space-y-6">
                           <div className="grid grid-cols-3 gap-3">
                             <div className="bg-theme-subtle p-3 rounded-2xl border border-theme-border shadow-sm text-center">
                               <div className="text-[9px] font-black text-md3-gray uppercase tracking-widest mb-1">Průměr</div>
                               <div className="text-lg font-black text-theme-text">{avg.toFixed(2)}<span className="text-[10px] ml-1 text-md3-gray">{field.unit}</span></div>
                             </div>
                             <div className="bg-theme-subtle p-3 rounded-2xl border border-theme-border shadow-sm text-center">
                               <div className="text-[9px] font-black text-md3-gray uppercase tracking-widest mb-1">Min</div>
                               <div className="text-lg font-black text-theme-text">{min}<span className="text-[10px] ml-1 text-md3-gray">{field.unit}</span></div>
                             </div>
                             <div className="bg-theme-subtle p-3 rounded-2xl border border-theme-border shadow-sm text-center">
                               <div className="text-[9px] font-black text-md3-gray uppercase tracking-widest mb-1">Max</div>
                               <div className="text-lg font-black text-theme-text">{max}<span className="text-[10px] ml-1 text-md3-gray">{field.unit}</span></div>
                             </div>
                           </div>
                           
                           {chartData.length > 1 && (
                             <div className="h-40 w-full mt-4">
                               <ResponsiveContainer width="100%" height="100%">
                                 <LineChart data={chartData}>
                                   {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                                   <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#8e8e93', fontSize: 9 }} dy={10} />
                                   <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8e8e93', fontSize: 9 }} width={30} />
                                   <Tooltip contentStyle={{ backgroundColor: 'rgba(28,28,30,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }} />
                                   <Line type="monotone" dataKey="value" name={field.name} stroke={substance.color || '#00d1ff'} strokeWidth={3} dot={{ r: 3, fill: substance.color || '#00d1ff' }} />
                                 </LineChart>
                               </ResponsiveContainer>
                             </div>
                           )}
                         </div>
                       );
                    })()}

                    {(field.type === 'select' || field.type === 'text') && (() => {
                       const counts: Record<string, number> = {};
                       // For select, we just count frequency. 
                       values.forEach(v => {
                         const str = String(v).trim();
                         if (str) {
                           counts[str] = (counts[str] || 0) + 1;
                         }
                       });
                       const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, 10);
                       
                       return (
                         <div className="space-y-3 mt-4">
                           {sorted.map(([val, count], idx) => {
                             const pct = (count / values.length) * 100;
                             return (
                               <div key={idx} className="flex flex-col gap-1">
                                 <div className="flex justify-between items-center text-xs">
                                   <span className="font-bold text-theme-text truncate pr-4">{val}</span>
                                   <span className="font-bold text-md3-gray shrink-0">{pct.toFixed(0)}% ({count}x)</span>
                                 </div>
                                 <div className="w-full h-1.5 bg-theme-bg rounded-full overflow-hidden shadow-inner">
                                   <div className="h-full bg-md3-primary" style={{ width: `${pct}%` }} />
                                 </div>
                               </div>
                             );
                           })}
                           {sorted.length === 0 && <div className="text-xs text-md3-gray italic">Žádné hodnoty</div>}
                         </div>
                       );
                    })()}

                  </section>
                );
              })}
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
                          <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-theme-subtle border border-theme-border min-w-0 gap-2">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)` }} />
                              <span className="text-sm font-bold text-theme-text truncate">{item.name}</span>
                            </div>
                            <span className="text-sm font-bold text-theme-text shrink-0">{settings.privacyMode ? '***' : item.value.toFixed(0)} {settings.currency || 'Kč'}</span>
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
                            Celkem: {formatAmount(group.totalAmount, substance.unit, 1)}
                          </span>
                          {renderActiveIngredientsString(group.doses, substance) && (
                            <span className="text-[10px] font-bold text-md3-primary mt-1">
                              {renderActiveIngredientsString(group.doses, substance)}
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
                                  {formatAmount(dose.amount, substance.unit, 1)}
                                  {dose.strainId && <span className="text-xs text-md3-primary ml-2 font-bold uppercase tracking-widest">({dose.strainId})</span>}
                                </div>
                                {renderActiveIngredientsString([dose], substance) && (
                                  <div className="text-[10px] font-bold text-md3-primary mt-0.5">
                                    {renderActiveIngredientsString([dose], substance)}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-0.5">
                                  <div className="text-xs text-md3-gray font-bold uppercase tracking-wider">
                                    {formatTime(dose.timestamp, settings)}
                                  </div>
                                </div>
                                {dose.customFieldValues && Object.keys(dose.customFieldValues).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {Object.entries(dose.customFieldValues).map(([fieldId, value]) => {
                                      const field = substance.customFields?.find(f => f.id === fieldId);
                                      if (!field || value === false || value === '' || value === undefined) return null;
                                      
                                      let displayValue = value;
                                      if (field.type === 'boolean') {
                                        displayValue = field.name;
                                      } else if (field.type === 'rating') {
                                        displayValue = `${field.name}: ${value}/5`;
                                      } else if (field.type === 'number') {
                                        displayValue = `${field.name}: ${value}${field.unit || ''}`;
                                      } else if (field.type === 'text' || field.type === 'select') {
                                        displayValue = `${field.name}: ${value}`;
                                      }

                                      return (
                                        <span key={fieldId} className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-cyan-primary/10 text-cyan-primary border border-cyan-primary/20">
                                          {displayValue}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
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
                          <div className="text-xl font-bold text-theme-text">{formatAmount(dayTotal, substance.unit, 1)}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-border text-center">
                          <div className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-1">Průměr/dávka</div>
                          <div className="text-xl font-bold text-theme-text">{formatAmount(dayTotal / dayDoses.length, substance.unit, 1)}</div>
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
                              <div className="text-sm font-bold text-theme-text">{formatAmount(dose.amount, substance.unit, 1)}</div>
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
