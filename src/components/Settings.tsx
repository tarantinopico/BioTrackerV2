import React, { useState } from 'react';
import { 
  User, 
  Monitor, 
  Bell, 
  Sparkles, 
  Database, 
  Download, 
  Upload, 
  Trash2,
  Plus,
  Activity,
  Clock,
  ShieldCheck,
  Smartphone,
  Info,
  Github,
  Heart,
  Moon,
  Sun,
  ChevronRight,
  Palette,
  Lock,
  Zap,
  BarChart3,
  EyeOff,
  Fingerprint,
  Cpu,
  LineChart,
  ShieldAlert,
  Check,
  Brain,
  Code,
  Terminal,
  Sliders,
  BarChart2,
  Thermometer,
  Gauge,
  HeartPulse,
  BatteryCharging,
  Droplets,
  ZapOff,
  RefreshCw,
  Network,
  BrainCircuit,
  Scan,
  Bug
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserSettings, CustomEffect, Valence } from '../types';
import { cn } from '../lib/utils';
import PinLock from './PinLock';

interface SettingsProps {
  settings: UserSettings;
  customEffects: CustomEffect[];
  onSave: (settings: UserSettings) => void;
  onSaveEffects: (effects: CustomEffect[]) => void;
  onClearData: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onExportCSV?: () => void;
  onExportText?: () => string;
  onImportText?: (text: string) => void;
}

type Tab = 'profile' | 'appearance' | 'dashboard' | 'notifications' | 'ai' | 'security' | 'effects' | 'data' | 'developer' | 'about';

const DEFAULT_SYSTEM_PROMPT = `Jsi expertní datový analytik závislostí a užívání látek. Odpovídáš POUZE striktním JSON formátem.`;

const DEFAULT_GLOBAL_PROMPT = `Tvá analýza musí identifikovat vzorce v dlouhodobém (agregovaném) užívání ze všech látek klienta.
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
Odpovídej POUZE striktně JSON objektem.`;

const DEFAULT_PREDICTION_PROMPT = `Analyzuj historii dávek pro látku a predikuj budoucí vývoj.

Schéma JSON odpovědi:
{
  "suggestedOptimalDose": (číslo - doporučená velikost dávky, např. tapering. V jednotkách látky),
  "patternDetected": (krátký string česky popisující zjištěný vzorec, např. "Zvýšená frekvence o víkendech"),
  "trajectory": (přesně jeden z těchto stringů: "escalating", "stable", "decreasing"),
  "projectedUsageNext7Days": (pole 7 čísel udávající odhadované denní množství pro následujících 7 dní),
  "currentEstimatedBloodLevelPct": (číslo 0-100 udávající hrubý odhad zůstatku aktivní látky v krvi právě teď, na základě poločasu rozpadu u této látky),
  "intradayProbability": (pole přesně 24 čísel udávající procentuální pravděpodobnost užití v každou hodinu 0-23. Součet pole nemusí být 100, ale každé číslo reprezentuje pravděpodobnost v danou hodinu (0-100).)
}
Odpovídej POUZE platným formátem JSON.`;

const DEFAULT_TAPERING_PROMPT = `Jsi lékařský asistent a farmakolog. Specializuješ se na bezpečné a postupné snižování dávek (tapering). Odpovídáš striktně JSON formátem.`;

export default function Settings({ 
  settings, 
  customEffects, 
  onSave, 
  onSaveEffects,
  onClearData,
  onImport,
  onExport,
  onExportCSV,
  onExportText,
  onImportText
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [newEffectName, setNewEffectName] = useState('');
  const [newEffectType, setNewEffectType] = useState<Valence>('positive');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [showTextImport, setShowTextImport] = useState(false);
  const [importTextValue, setImportTextValue] = useState('');

  // Auto-save wrapper
  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    onSave({ ...settings, [key]: value });
  };

  const addCustomEffect = () => {
    if (!newEffectName.trim()) return;
    const icons = ['sparkles', 'zap', 'heart', 'brain', 'activity', 'smile', 'frown', 'alert-circle'];
    const colors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#06b6d4', '#f43f5e'];
    
    const newEffect: CustomEffect = {
      name: newEffectName.trim(),
      icon: icons[Math.floor(Math.random() * icons.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      valence: newEffectType
    };
    
    onSaveEffects([...customEffects, newEffect]);
    setNewEffectName('');
  };

  const deleteCustomEffect = (index: number) => {
    onSaveEffects(customEffects.filter((_, i) => i !== index));
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'appearance', label: 'Vzhled', icon: Palette },
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'notifications', label: 'Upozornění', icon: Bell },
    { id: 'ai', label: 'AI Analýza', icon: Brain },
    { id: 'security', label: 'Zabezpečení', icon: ShieldCheck },
    { id: 'data', label: 'Úložiště', icon: Database },
    { id: 'effects', label: 'Efekty', icon: Sparkles },
    { id: 'developer', label: 'Vývojář', icon: Code },
    { id: 'about', label: 'Info', icon: Info },
  ];

  return (
    <div className="space-y-6 pb-32">
      {isSettingPin && (
        <PinLock 
          correctPin=""
          onUnlock={() => {}}
          isSettingPin={true}
          onSetPin={(pin) => {
            updateSetting('pinCode', pin);
            updateSetting('requirePin', true);
            setIsSettingPin(false);
          }}
          onCancel={() => setIsSettingPin(false)}
        />
      )}

      {/* Settings Navigation */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 -mx-4 px-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all font-bold text-sm",
              activeTab === tab.id 
                ? "bg-md3-primary text-theme-bg shadow-md" 
                : "bg-theme-subtle text-md3-gray hover:bg-theme-subtle-hover"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-md3-gray flex items-center gap-2">
                  <User size={16} className="text-md3-primary" /> Biometrický profil
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Váha (kg)</label>
                    <input 
                      type="number" 
                      value={settings.userWeight} 
                      onChange={e => updateSetting('userWeight', parseInt(e.target.value) || 70)}
                      className="w-full md3-input" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Výška (cm)</label>
                    <input 
                      type="number" 
                      value={settings.userHeight || ''} 
                      onChange={e => updateSetting('userHeight', parseInt(e.target.value) || undefined)}
                      className="w-full md3-input" 
                      placeholder="Volitelné"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Věk</label>
                    <input 
                      type="number" 
                      value={settings.userAge} 
                      onChange={e => updateSetting('userAge', parseInt(e.target.value) || 25)}
                      className="w-full md3-input" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Pohlaví</label>
                    <select 
                      value={settings.userGender} 
                      onChange={e => updateSetting('userGender', e.target.value as any)}
                      className="w-full md3-input appearance-none"
                    >
                      <option value="male" className="bg-theme-bg">Muž</option>
                      <option value="female" className="bg-theme-bg">Žena</option>
                      <option value="other" className="bg-theme-bg">Jiné</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Metabolismus</label>
                  <select 
                    value={settings.userMetabolism} 
                    onChange={e => updateSetting('userMetabolism', e.target.value as any)}
                    className="w-full md3-input appearance-none"
                  >
                    <option value="slow" className="bg-theme-bg">Pomalý (-20%)</option>
                    <option value="normal" className="bg-theme-bg">Normální</option>
                    <option value="fast" className="bg-theme-bg">Rychlý (+20%)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Úroveň aktivity</label>
                  <select 
                    value={settings.activityLevel || 'moderate'} 
                    onChange={e => updateSetting('activityLevel', e.target.value as any)}
                    className="w-full md3-input appearance-none"
                  >
                    <option value="sedentary" className="bg-theme-bg">Sedavá (minimální pohyb)</option>
                    <option value="light" className="bg-theme-bg">Lehká (1-3 dny v týdnu)</option>
                    <option value="moderate" className="bg-theme-bg">Střední (3-5 dní v týdnu)</option>
                    <option value="active" className="bg-theme-bg">Aktivní (6-7 dní v týdnu)</option>
                    <option value="very_active" className="bg-theme-bg">Velmi aktivní (fyzická práce)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Tělesný tuk (%)</label>
                  <input 
                    type="number" 
                    value={settings.bodyFatPercentage || ''} 
                    onChange={e => updateSetting('bodyFatPercentage', parseInt(e.target.value) || undefined)}
                    className="w-full md3-input" 
                    placeholder="Volitelné"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Krevní skupina</label>
                  <select 
                    value={settings.bloodType || 'unknown'} 
                    onChange={e => updateSetting('bloodType', e.target.value as any)}
                    className="w-full md3-input appearance-none"
                  >
                    <option value="unknown" className="bg-theme-bg">Neznámá</option>
                    <option value="A+" className="bg-theme-bg">A+</option>
                    <option value="A-" className="bg-theme-bg">A-</option>
                    <option value="B+" className="bg-theme-bg">B+</option>
                    <option value="B-" className="bg-theme-bg">B-</option>
                    <option value="AB+" className="bg-theme-bg">AB+</option>
                    <option value="AB-" className="bg-theme-bg">AB-</option>
                    <option value="0+" className="bg-theme-bg">0+</option>
                    <option value="0-" className="bg-theme-bg">0-</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Zdravotní stav / Alergie (oddělené čárkou)</label>
                  <input 
                    type="text" 
                    value={settings.medicalConditions || ''} 
                    onChange={e => updateSetting('medicalConditions', e.target.value)}
                    className="w-full md3-input" 
                    placeholder="Např. astma, alergie na penicilin..."
                  />
                </div>
              </div>

              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-md3-gray flex items-center gap-2">
                  <Activity size={16} className="text-md3-primary" /> Cíle a limity
                </h3>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Týdenní rozpočet</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={settings.weeklyBudget || 1000} 
                      onChange={e => updateSetting('weeklyBudget', parseInt(e.target.value) || 1000)}
                      className="flex-1 md3-input" 
                    />
                    <select 
                      value={settings.currency || 'Kč'} 
                      onChange={e => updateSetting('currency', e.target.value)}
                      className="w-24 md3-input appearance-none"
                    >
                      <option value="Kč" className="bg-theme-bg">Kč</option>
                      <option value="€" className="bg-theme-bg">€</option>
                      <option value="$" className="bg-theme-bg">$</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-md3-gray flex items-center gap-2">
                  <Monitor size={16} className="text-md3-primary" /> Rozhraní
                </h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Jazyk</label>
                    <select 
                      value={settings.language} 
                      onChange={e => updateSetting('language', e.target.value)}
                      className="w-full md3-input appearance-none"
                    >
                      <option value="cs" className="bg-theme-bg">Čeština</option>
                      <option value="en" className="bg-theme-bg">English</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Téma vzhledu</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => updateSetting('theme', 'light')}
                        className={cn(
                          "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all",
                          settings.theme === 'light' ? "bg-md3-primary/10 border-md3-primary text-md3-primary" : "bg-theme-subtle border-theme-border text-md3-gray hover:bg-theme-subtle-hover"
                        )}
                      >
                        <Sun size={20} />
                        <span className="text-xs font-bold">Světlé</span>
                      </button>
                      <button 
                        onClick={() => updateSetting('theme', 'dark')}
                        className={cn(
                          "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all",
                          settings.theme === 'dark' ? "bg-md3-primary/10 border-md3-primary text-md3-primary" : "bg-theme-subtle border-theme-border text-md3-gray hover:bg-theme-subtle-hover"
                        )}
                      >
                        <Moon size={20} />
                        <span className="text-xs font-bold">Tmavé</span>
                      </button>
                      <button 
                        onClick={() => updateSetting('theme', 'midnight')}
                        className={cn(
                          "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all",
                          settings.theme === 'midnight' ? "bg-md3-primary/10 border-md3-primary text-md3-primary" : "bg-theme-subtle border-theme-border text-md3-gray hover:bg-theme-subtle-hover"
                        )}
                      >
                        <Moon size={20} className="fill-current" />
                        <span className="text-xs font-bold">Půlnoční</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Velikost písma</label>
                    <select 
                      value={settings.fontSize || 'medium'} 
                      onChange={e => updateSetting('fontSize', e.target.value as any)}
                      className="w-full md3-input appearance-none"
                    >
                      <option value="small" className="bg-theme-bg">Malé</option>
                      <option value="medium" className="bg-theme-bg">Střední</option>
                      <option value="large" className="bg-theme-bg">Velké</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Barevný akcent</label>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                      {[
                        { id: 'emerald', color: 'bg-emerald-500', label: 'Smaragdová' },
                        { id: 'blue', color: 'bg-blue-500', label: 'Modrá' },
                        { id: 'purple', color: 'bg-purple-500', label: 'Fialová' },
                        { id: 'orange', color: 'bg-orange-500', label: 'Oranžová' },
                        { id: 'pink', color: 'bg-pink-500', label: 'Růžová' },
                        { id: 'cyan', color: 'bg-cyan-500', label: 'Azurová' }
                      ].map(accent => (
                        <button
                          key={accent.id}
                          onClick={() => updateSetting('colorAccent', accent.id as any)}
                          className={cn(
                            "w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center transition-all border-2",
                            settings.colorAccent === accent.id ? "border-theme-text scale-110 shadow-lg" : "border-transparent hover:scale-105",
                            accent.color
                          )}
                          title={accent.label}
                        >
                          {settings.colorAccent === accent.id && <Check size={20} className="text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  {[
                    { id: 'bentoMode', label: 'Moderní Bento Grid', icon: Palette },
                    { id: 'ambientBackground', label: 'Prémiové ambientní pozadí', icon: Sparkles },
                    { id: 'glassEffects', label: 'Vylepšené Glass efekty', icon: Sparkles },
                    { id: 'glowEffects', label: 'Jemně zářící efekty', icon: Sparkles },
                    { id: 'animations', label: 'Povolit animace', icon: Activity },
                    { id: 'timeFormat24h', label: '24h formát času', icon: Clock },
                    { id: 'showSeconds', label: 'Zobrazit sekundy', icon: Activity },
                    { id: 'compactMode', label: 'Kompaktní režim', icon: Smartphone },
                  ].map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => updateSetting(item.id as keyof UserSettings, !(settings as any)[item.id])}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all shadow-sm",
                        (settings as any)[item.id] 
                          ? "bg-md3-primary/10 border-md3-primary/30 text-md3-primary" 
                          : "bg-theme-subtle border-theme-border text-md3-gray"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span className="font-bold text-sm">{item.label}</span>
                      </div>
                      <div className={cn(
                        "w-10 h-6 rounded-full p-1 transition-all",
                        (settings as any)[item.id] ? "bg-md3-primary" : "bg-theme-border"
                      )}>
                        <div className={cn(
                          "w-4 h-4 rounded-full bg-white transition-all",
                          (settings as any)[item.id] ? "translate-x-4" : "translate-x-0"
                        )} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-md3-gray flex items-center gap-2">
                  <Activity size={16} className="text-md3-primary" /> Dashboard Moduly
                </h3>
                <p className="text-xs text-md3-gray mb-2">Zapněte si widgety, které chcete vidět na hlavní obrazovce.</p>
                <div className="space-y-3">
                  {[
                    { id: 'activeEffects', label: 'Aktivní efekty', icon: Sparkles },
                    { id: 'recentDoses', label: 'Poslední dávky', icon: Clock },
                    { id: 'quickAdd', label: 'Rychlé přidání', icon: Plus },
                    { id: 'budget', label: 'Rozpočet', icon: Database },
                    { id: 'systemLoad', label: 'Zátěž systému', icon: Cpu },
                    { id: 'shortcuts', label: 'Zkratky', icon: Zap },
                  ].map(item => {
                    const isEnabled = settings.dashboardWidgets ? (settings.dashboardWidgets as any)[item.id] : true;
                    return (
                      <button 
                        key={item.id} 
                        onClick={() => {
                          const currentWidgets = settings.dashboardWidgets || { activeEffects: true, recentDoses: true, quickAdd: true, budget: true, systemLoad: true, shortcuts: true };
                          updateSetting('dashboardWidgets', { ...currentWidgets, [item.id]: !isEnabled });
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all shadow-sm",
                          isEnabled 
                            ? "bg-md3-primary/10 border-md3-primary/30 text-md3-primary" 
                            : "bg-theme-subtle border-theme-border text-md3-gray"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={18} />
                          <span className="font-bold text-sm">{item.label}</span>
                        </div>
                        <div className={cn(
                          "w-10 h-6 rounded-full p-1 transition-all",
                          isEnabled ? "bg-md3-primary" : "bg-theme-border"
                        )}>
                          <div className={cn(
                            "w-4 h-4 rounded-full bg-white transition-all",
                            isEnabled ? "translate-x-4" : "translate-x-0"
                          )} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-md3-gray flex items-center gap-2">
                  <Activity size={16} className="text-md3-primary" /> Grafy a zobrazení
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Časové okno</label>
                      <select 
                        value={settings.chartWindow} 
                        onChange={e => updateSetting('chartWindow', parseInt(e.target.value) || 24)}
                        className="w-full md3-input appearance-none"
                      >
                        <option value={12} className="bg-theme-bg">12 hodin</option>
                        <option value={24} className="bg-theme-bg">24 hodin</option>
                        <option value={48} className="bg-theme-bg">48 hodin</option>
                        <option value={72} className="bg-theme-bg">72 hodin</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">První den v týdnu</label>
                      <select 
                        value={settings.firstDayOfWeek ?? 1} 
                        onChange={e => updateSetting('firstDayOfWeek', parseInt(e.target.value) as 0 | 1)}
                        className="w-full md3-input appearance-none"
                      >
                        <option value={1} className="bg-theme-bg">Pondělí</option>
                        <option value={0} className="bg-theme-bg">Neděle</option>
                      </select>
                    </div>
                  </div>
                  {[
                    { id: 'chartAnimation', label: 'Animace grafů', icon: Sparkles },
                    { id: 'chartGrid', label: 'Zobrazit mřížku', icon: Monitor },
                    { id: 'chartPoints', label: 'Zobrazit body', icon: Activity },
                  ].map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => updateSetting(item.id as keyof UserSettings, !(settings as any)[item.id])}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all shadow-sm",
                        (settings as any)[item.id] 
                          ? "bg-md3-primary/10 border-md3-primary/30 text-md3-primary" 
                          : "bg-theme-subtle border-theme-border text-md3-gray"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span className="font-bold text-sm">{item.label}</span>
                      </div>
                      <div className={cn(
                        "w-10 h-6 rounded-full p-1 transition-all",
                        (settings as any)[item.id] ? "bg-md3-primary" : "bg-theme-border"
                      )}>
                        <div className={cn(
                          "w-4 h-4 rounded-full bg-white transition-all",
                          (settings as any)[item.id] ? "translate-x-4" : "translate-x-0"
                        )} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-md3-gray flex items-center gap-2">
                  <Bell size={16} className="text-md3-primary" /> Upozornění a varování
                </h3>
                <div className="space-y-3">
                  {[
                    { id: 'interactionWarnings', label: 'Varování před interakcemi', icon: ShieldCheck },
                    { id: 'doseWarnings', label: 'Varování vysoké dávky', icon: Activity },
                    { id: 'comedownWarnings', label: 'Upozornění na comedown', icon: Clock },
                    { id: 'reminders', label: 'Připomenutí dávky', icon: Bell },
                    { id: 'hapticFeedback', label: 'Haptická odezva', icon: Sparkles },
                    { id: 'soundAlerts', label: 'Zvuková upozornění', icon: Bell },
                  ].map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => updateSetting(item.id as keyof UserSettings, !(settings as any)[item.id])}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all shadow-sm",
                        (settings as any)[item.id] 
                          ? "bg-md3-primary/10 border-md3-primary/30 text-md3-primary" 
                          : "bg-theme-subtle border-theme-border text-md3-gray"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span className="font-bold text-sm">{item.label}</span>
                      </div>
                      <div className={cn(
                        "w-10 h-6 rounded-full p-1 transition-all",
                        (settings as any)[item.id] ? "bg-md3-primary" : "bg-theme-border"
                      )}>
                        <div className={cn(
                          "w-4 h-4 rounded-full bg-white transition-all",
                          (settings as any)[item.id] ? "translate-x-4" : "translate-x-0"
                        )} />
                      </div>
                    </button>
                  ))}
                  
                  <div className="pt-4 border-t border-theme-border">
                    <button 
                      onClick={() => updateSetting('quietHoursEnabled', !settings.quietHoursEnabled)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all shadow-sm mb-3",
                        settings.quietHoursEnabled 
                          ? "bg-md3-primary/10 border-md3-primary/30 text-md3-primary" 
                          : "bg-theme-subtle border-theme-border text-md3-gray"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Moon size={18} />
                        <span className="font-bold text-sm">Klidový režim (Nerušit)</span>
                      </div>
                      <div className={cn(
                        "w-10 h-6 rounded-full p-1 transition-all",
                        settings.quietHoursEnabled ? "bg-md3-primary" : "bg-theme-border"
                      )}>
                        <div className={cn(
                          "w-4 h-4 rounded-full bg-white transition-all",
                          settings.quietHoursEnabled ? "translate-x-4" : "translate-x-0"
                        )} />
                      </div>
                    </button>
                    
                    {settings.quietHoursEnabled && (
                      <div className="grid grid-cols-2 gap-3 pl-2">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Od</label>
                          <input 
                            type="time" 
                            value={settings.quietHoursStart || '22:00'} 
                            onChange={e => updateSetting('quietHoursStart', e.target.value)}
                            className="w-full md3-input" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Do</label>
                          <input 
                            type="time" 
                            value={settings.quietHoursEnd || '07:00'} 
                            onChange={e => updateSetting('quietHoursEnd', e.target.value)}
                            className="w-full md3-input" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EFFECTS TAB */}
          {activeTab === 'effects' && (
            <div className="space-y-6">
              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-md3-gray flex items-center gap-2">
                  <Sparkles size={16} className="text-md3-primary" /> Vlastní efekty
                </h3>
                <p className="text-xs text-md3-gray font-medium">
                  Přidejte si vlastní efekty, které chcete sledovat u jednotlivých látek.
                </p>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newEffectName}
                    onChange={e => setNewEffectName(e.target.value)}
                    placeholder="Název efektu..."
                    className="flex-1 md3-input"
                  />
                  <select 
                    value={newEffectType}
                    onChange={e => setNewEffectType(e.target.value as Valence)}
                    className="w-32 md3-input appearance-none"
                  >
                    <option value="positive" className="bg-theme-bg">Pozitivní</option>
                    <option value="neutral" className="bg-theme-bg">Neutrální</option>
                    <option value="negative" className="bg-theme-bg">Negativní</option>
                  </select>
                  <button 
                    onClick={addCustomEffect}
                    disabled={!newEffectName.trim()}
                    className="p-4 rounded-2xl bg-md3-primary text-theme-bg disabled:opacity-50 md3-button"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  {customEffects.map((effect, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-theme-subtle border border-theme-border">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: effect.color }} />
                        <span className="text-sm font-bold text-theme-text">{effect.name}</span>
                      </div>
                      <button 
                        onClick={() => deleteCustomEffect(idx)}
                        className="p-1.5 rounded-lg text-md3-gray hover:text-red-500 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {customEffects.length === 0 && (
                    <div className="col-span-2 text-center p-4 text-xs text-md3-gray italic">
                      Zatím nemáte žádné vlastní efekty
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI ANALÝZA TAB */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-md3-gray flex items-center gap-2">
                  <BarChart3 size={16} className="text-md3-primary" /> Pokročilá Analytika & AI
                </h3>
                <div className="space-y-3">
                  {[
                    { id: 'smartPredictions', label: 'Chytré Predikce', icon: Sparkles },
                    { id: 'insightEngine', label: 'Insight Engine (Algoritmy)', icon: Cpu },
                    { id: 'predictiveAnalytics', label: 'Prediktivní Kalkulace Ceny', icon: LineChart },
                    { id: 'taperingPlanEnabled', label: 'Plán Snižování Dávek (Tapering)', icon: Brain },
                  ].map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => updateSetting(item.id as keyof UserSettings, !(settings as any)[item.id])}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all shadow-sm",
                        (settings as any)[item.id] 
                          ? "bg-md3-primary/10 border-md3-primary/30 text-md3-primary" 
                          : "bg-theme-subtle border-theme-border text-md3-gray"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span className="font-bold text-sm">{item.label}</span>
                      </div>
                      <div className={cn(
                        "w-10 h-6 rounded-full p-1 transition-all",
                        (settings as any)[item.id] ? "bg-md3-primary" : "bg-theme-border"
                      )}>
                        <div className={cn(
                          "w-4 h-4 rounded-full bg-white transition-all",
                          (settings as any)[item.id] ? "translate-x-4" : "translate-x-0"
                        )} />
                      </div>
                    </button>
                  ))}

                  <div className="space-y-2 mt-6 pt-4 border-t border-theme-border">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1 flex items-center gap-2">
                       <Activity size={14} className="text-md3-primary" /> Citlivost Korelací (Non-AI Analytika)
                    </label>
                    <p className="text-[10px] text-md3-gray ml-1 mb-2">Nastavte citlivost pro zobrazení vzorců dávkování a pauz (0 = jen nejsilnější vazby, 100 = i velmi slabé korelace).</p>
                    <div className="flex items-center gap-4 bg-theme-subtle p-4 rounded-xl border border-theme-border">
                      <input 
                        type="range" 
                        min="1" max="100" step="1"
                        value={settings.correlationSensitivity ?? 50} 
                        onChange={e => updateSetting('correlationSensitivity', parseInt(e.target.value))}
                        className="flex-1 accent-md3-primary"
                      />
                      <div className="text-sm font-black text-md3-primary min-w-[3rem] text-right">{settings.correlationSensitivity ?? 50}%</div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 pt-4 border-t border-theme-border">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1 flex items-center gap-2">
                       <BarChart2 size={14} className="text-md3-primary" /> Detail grafů korelací
                    </label>
                    <p className="text-[10px] text-md3-gray ml-1 mb-2">Jak moc podrobné rozdělení sloupců v grafech korelací (2 až 10 skupin).</p>
                    <div className="flex items-center gap-4 bg-theme-subtle p-4 rounded-xl border border-theme-border">
                      <input 
                        type="range" 
                        min="2" max="10" step="1"
                        value={settings.correlationBinCount ?? 5} 
                        onChange={e => updateSetting('correlationBinCount', parseInt(e.target.value))}
                        className="flex-1 accent-md3-primary"
                      />
                      <div className="text-sm font-black text-md3-primary min-w-[3rem] text-right">{settings.correlationBinCount ?? 5} skupin</div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 pt-4 border-t border-theme-border">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Predikční Algoritmus</label>
                    <div className="relative">
                      <select 
                        value={settings.predictionAlgorithm || 'basic'} 
                        onChange={e => updateSetting('predictionAlgorithm', e.target.value)}
                        className="w-full md3-input appearance-none bg-theme-bg"
                      >
                        <option value="basic">Základní Aritmetický</option>
                        <option value="exponential">Exponenciální Vyrovnávání</option>
                        <option value="ml_simulated">Strojové Učení (Pravidla)</option>
                        <option value="ai_groq">Umělá Inteligence (Groq Cloud)</option>
                      </select>
                      <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-md3-gray transform rotate-90 pointer-events-none" />
                    </div>

                    {settings.predictionAlgorithm === 'ai_groq' && (
                      <div className="space-y-4 p-4 mt-2 bg-theme-bg rounded-xl border border-theme-border">
                        <div className="flex items-center gap-2 mb-2 text-md3-primary">
                          <Brain size={16} />
                          <span className="text-xs font-black uppercase tracking-widest">Nastavení AI Asistenta</span>
                        </div>
                        
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-md3-gray">Groq API Klíč (získate na console.groq.com)</label>
                           <input
                             type="password"
                             value={settings.groqApiKey || ''}
                             onChange={(e) => updateSetting('groqApiKey', e.target.value)}
                             className="w-full md3-input"
                             placeholder="gsk_..."
                           />
                        </div>

                        <div className="space-y-1">
                           <label className="text-xs font-bold text-md3-gray">Vlastní Base URL (volitelné)</label>
                           <input
                             type="url"
                             value={settings.aiBaseUrl || ''}
                             onChange={(e) => updateSetting('aiBaseUrl', e.target.value)}
                             className="w-full md3-input"
                             placeholder="Např. https://api.groq.com/openai/v1"
                           />
                        </div>

                        <div className="space-y-1">
                           <label className="text-xs font-bold text-md3-gray">Model pro Predikce</label>
                           <div className="relative">
                              <select
                                value={settings.aiModel || 'llama-3.3-70b-versatile'}
                                onChange={(e) => updateSetting('aiModel', e.target.value)}
                                className="w-full md3-input appearance-none"
                              >
                                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Nejchytřejší)</option>
                                <option value="llama-3.1-8b-instant">Llama 3.1 8B (Nejrychlejší)</option>
                                <option value="mixtral-8x7b-32768">Mixtral 8x7B (Kreativní)</option>
                                <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 (Analytický)</option>
                              </select>
                              <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-md3-gray transform rotate-90 pointer-events-none" />
                           </div>
                        </div>

                        <div className="space-y-1">
                           <label className="text-xs font-bold text-md3-gray">Model pro Globální Analýzu</label>
                           <div className="relative">
                              <select
                                value={settings.aiModelGlobal || 'llama-3.3-70b-versatile'}
                                onChange={(e) => updateSetting('aiModelGlobal', e.target.value)}
                                className="w-full md3-input appearance-none"
                              >
                                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Nejchytřejší)</option>
                                <option value="llama-3.1-8b-instant">Llama 3.1 8B (Nejrychlejší)</option>
                                <option value="mixtral-8x7b-32768">Mixtral 8x7B (Kreativní)</option>
                                <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 (Analytický)</option>
                              </select>
                              <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-md3-gray transform rotate-90 pointer-events-none" />
                           </div>
                        </div>

                        <div className="space-y-1">
                           <label className="text-xs font-bold text-md3-gray">Model pro Tapering Plány</label>
                           <div className="relative">
                              <select
                                value={settings.aiModelTapering || 'llama-3.3-70b-versatile'}
                                onChange={(e) => updateSetting('aiModelTapering', e.target.value)}
                                className="w-full md3-input appearance-none"
                              >
                                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Nejchytřejší)</option>
                                <option value="llama-3.1-8b-instant">Llama 3.1 8B (Nejrychlejší)</option>
                                <option value="mixtral-8x7b-32768">Mixtral 8x7B (Kreativní)</option>
                                <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 (Analytický)</option>
                              </select>
                              <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-md3-gray transform rotate-90 pointer-events-none" />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-md3-gray">Počet záznamů historie (Kontext)</label>
                           <input
                             type="number"
                             min="10"
                             max="1000"
                             value={settings.aiContextLimit || 50}
                             onChange={(e) => updateSetting('aiContextLimit', parseInt(e.target.value) || 50)}
                             className="w-full md3-input"
                             placeholder="50"
                           />
                           <p className="text-[10px] text-md3-gray mt-1">Více záznamů = chytřejší, ale spotřebuje víc tokenů.</p>
                        </div>
                        
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-md3-gray">Kreativita (Temperature): {settings.aiTemperature ?? 0.1}</label>
                           <input
                             type="range"
                             min="0"
                             max="2"
                             step="0.1"
                             value={settings.aiTemperature ?? 0.1}
                             onChange={(e) => updateSetting('aiTemperature', parseFloat(e.target.value))}
                             className="w-full accent-md3-primary"
                           />
                           <div className="flex justify-between text-[10px] text-md3-gray">
                              <span>Striktní (0.0)</span>
                              <span>Kreativní (2.0)</span>
                           </div>
                        </div>

                        <div className="text-[10px] text-md3-gray mt-4">
                          API klíč je uložen pouze lokálně ve vašem zařízení. Nikomu se neposílá kromě požadavku přímo na Groq server pro zhodnocení predikcí.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DEVELOPER TAB */}
          {activeTab === 'developer' && (
            <div className="space-y-6 pb-8">
               <div className="relative overflow-hidden rounded-[2rem] bg-[#111] border border-red-500/20 p-4 sm:p-8 shadow-2xl group">
                 <div className="absolute top-[-50%] right-[-10%] w-[80%] h-[150%] bg-gradient-to-l from-red-500/10 to-purple-500/0 blur-[80px] pointer-events-none" />
                 
                 <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 shrink-0 rounded-[1.25rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                           <Terminal size={28} className="text-red-500" />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none mb-1">Konzole Vývojáře</h3>
                          <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest leading-none">God Mode Expertní Nastavení</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-white/50 leading-relaxed max-w-2xl mb-8">
                      Zde můžete přepsat nízkoúrovňové proměnné celého farmakokinetického enginu, AI parametrů a vnitřní logiky aplikace. 
                      <span className="text-red-400 font-bold ml-1">Změny mohou fatálně ovlivnit výpočty rizik.</span>
                    </p>

                    <div className="grid grid-cols-1 gap-8">
                        {/* KINETIKA */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-white/80 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                             <Activity size={14} className="text-emerald-500" /> Farmakologická Kinetika & Absorpce
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-emerald-500/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <Activity size={14} className="text-emerald-500" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Metabolismus</label>
                                  </div>
                                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">{(settings.metabolismMultiplier ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Násobí rychlost odbourávání látek. Hodnoty &gt; 1 = rychlejší clearance.</p>
                               <input type="range" min="0.1" max="5.0" step="0.1" value={settings.metabolismMultiplier ?? 1.0} onChange={e => updateSetting('metabolismMultiplier', parseFloat(e.target.value) || 1.0)} className="w-full accent-emerald-500 h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-orange-500/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <Thermometer size={14} className="text-orange-500" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Úroveň Tolerance</label>
                                  </div>
                                  <span className="text-[10px] text-orange-400 font-mono bg-orange-500/10 px-1.5 py-0.5 rounded">{(settings.toleranceMultiplier ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Agresivita budování tolerance po každé dávce.</p>
                               <input type="range" min="0.1" max="3.0" step="0.1" value={settings.toleranceMultiplier ?? 1.0} onChange={e => updateSetting('toleranceMultiplier', parseFloat(e.target.value) || 1.0)} className="w-full accent-orange-500 h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-blue-500/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <Zap size={14} className="text-blue-500" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">CMax (Peak)</label>
                                  </div>
                                  <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded">{(settings.peakIntensityMultiplier ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Plošný násobič teoretické maximální plazmatické koncentrace.</p>
                               <input type="range" min="0.1" max="2.0" step="0.1" value={settings.peakIntensityMultiplier ?? 1.0} onChange={e => updateSetting('peakIntensityMultiplier', parseFloat(e.target.value) || 1.0)} className="w-full accent-blue-500 h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-purple-500/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <Clock size={14} className="text-purple-500" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Poločas Rozpadu</label>
                                  </div>
                                  <span className="text-[10px] text-purple-400 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded">{(settings.halfLifeMultiplier ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Globální prodloužení nebo zkrácení eliminačního poločasu.</p>
                               <input type="range" min="0.1" max="5.0" step="0.1" value={settings.halfLifeMultiplier ?? 1.0} onChange={e => updateSetting('halfLifeMultiplier', parseFloat(e.target.value) || 1.0)} className="w-full h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-cyan-500/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <Droplets size={14} className="text-cyan-500" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Vstřebatelnost</label>
                                  </div>
                                  <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded">{(settings.bioavailabilityGlobalMultiplier ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Úprava celkové míry absorbce účinné látky z GI traktu.</p>
                               <input type="range" min="0.1" max="2.0" step="0.1" value={settings.bioavailabilityGlobalMultiplier ?? 1.0} onChange={e => updateSetting('bioavailabilityGlobalMultiplier', parseFloat(e.target.value) || 1.0)} className="w-full h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-indigo-500/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <Gauge size={14} className="text-indigo-500" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">TMax Shift</label>
                                  </div>
                                  <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">{(settings.tmaxGlobalMultiplier ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Zpoždění nástupu teoretického peaku napříč všemi substancemi.</p>
                               <input type="range" min="0.1" max="3.0" step="0.1" value={settings.tmaxGlobalMultiplier ?? 1.0} onChange={e => updateSetting('tmaxGlobalMultiplier', parseFloat(e.target.value) || 1.0)} className="w-full h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>
                          </div>
                        </div>

                        {/* RIZIKA A ALERT SYSTÉMY */}
                        <div className="space-y-4 pt-2">
                          <h4 className="text-xs font-black text-white/80 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                             <ShieldAlert size={14} className="text-red-500" /> Analýza Rizik & Neurotoxicita
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-red-500/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <ShieldAlert size={14} className="text-red-500" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Báze Rizika</label>
                                  </div>
                                  <span className="text-[10px] text-red-400 font-mono bg-red-500/10 px-1.5 py-0.5 rounded">{(settings.riskScoreMultiplier ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Agresivita alertů u vysokých dávek a extrémním tempu užívání.</p>
                               <input type="range" min="0.1" max="3.0" step="0.1" value={settings.riskScoreMultiplier ?? 1.0} onChange={e => updateSetting('riskScoreMultiplier', parseFloat(e.target.value) || 1.0)} className="w-full h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-rose-500/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <Activity size={14} className="text-rose-500" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Interakce</label>
                                  </div>
                                  <span className="text-[10px] text-rose-400 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded">{(settings.interactionRiskMultiplier ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Zesilovač varování pro synergie a kontraidikace. Nižší = benevolentnější.</p>
                               <input type="range" min="0.1" max="3.0" step="0.1" value={settings.interactionRiskMultiplier ?? 1.0} onChange={e => updateSetting('interactionRiskMultiplier', parseFloat(e.target.value) || 1.0)} className="w-full h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-rose-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-red-400/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <ZapOff size={14} className="text-red-400" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Základní Práh (Threshold)</label>
                                  </div>
                                  <span className="text-[10px] text-red-300 font-mono bg-red-400/10 px-1.5 py-0.5 rounded">{(settings.baseRiskThreshold ?? 5.0).toFixed(1)}</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Minimální hodnota teoretické koncentrace vzbuzující high-level varování.</p>
                               <input type="range" min="1.0" max="20.0" step="0.5" value={settings.baseRiskThreshold ?? 5.0} onChange={e => updateSetting('baseRiskThreshold', parseFloat(e.target.value) || 5.0)} className="w-full h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-yellow-500/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <BatteryCharging size={14} className="text-yellow-500" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Odvykací Stav</label>
                                  </div>
                                  <span className="text-[10px] text-yellow-400 font-mono bg-yellow-500/10 px-1.5 py-0.5 rounded">{(settings.withdrawalSeverityMultiplier ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Penalizace AI skóre pro taperingové modely a zohlednění diskomfortu (craving).</p>
                               <input type="range" min="0.1" max="3.0" step="0.1" value={settings.withdrawalSeverityMultiplier ?? 1.0} onChange={e => updateSetting('withdrawalSeverityMultiplier', parseFloat(e.target.value) || 1.0)} className="w-full h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-teal-500/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <HeartPulse size={14} className="text-teal-500" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Comedown Efekt</label>
                                  </div>
                                  <span className="text-[10px] text-teal-400 font-mono bg-teal-500/10 px-1.5 py-0.5 rounded">{(settings.comedownSeverityMultiplier ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Dopamin/Serotonin deplece - ovlivňuje odhady energetické propasti v AI analýze.</p>
                               <input type="range" min="0.1" max="3.0" step="0.1" value={settings.comedownSeverityMultiplier ?? 1.0} onChange={e => updateSetting('comedownSeverityMultiplier', parseFloat(e.target.value) || 1.0)} className="w-full h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-teal-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-pink-500/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <Brain size={14} className="text-pink-500" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Potenciál Závislosti</label>
                                  </div>
                                  <span className="text-[10px] text-pink-400 font-mono bg-pink-500/10 px-1.5 py-0.5 rounded">{(settings.addictionPotentialMultiplier ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Ostražitost Habit Trackingu. Vyšší hodnota více penalizuje změny frekvence zvyků.</p>
                               <input type="range" min="0.1" max="3.0" step="0.1" value={settings.addictionPotentialMultiplier ?? 1.0} onChange={e => updateSetting('addictionPotentialMultiplier', parseFloat(e.target.value) || 1.0)} className="w-full h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>
                          </div>
                        </div>

                        {/* AI & ANALÝZA */}
                        <div className="space-y-4 pt-2">
                          <h4 className="text-xs font-black text-white/80 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                             <BrainCircuit size={14} className="text-emerald-400" /> AI & Behavior Engine
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* toggles */}
                            {[
                               { id: 'predictiveModeling', label: 'Predictive Modeling', desc: 'Aktivuje extrapolaci budoucích stavů z historie', icon: Network },
                             ].map((opt) => (
                               <button
                                  key={opt.id}
                                  onClick={() => updateSetting(opt.id as keyof UserSettings, !(settings as any)[opt.id])}
                                  className={cn(
                                    "p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all relative overflow-hidden group",
                                    (settings as any)[opt.id] 
                                      ? "bg-emerald-500/10 border-emerald-500/30 shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]" 
                                      : "bg-black/60 border-white/5 hover:bg-black/80 hover:border-white/10"
                                  )}
                               >
                                  <div className="flex justify-between items-center w-full">
                                    <opt.icon size={12} className={(settings as any)[opt.id] ? "text-emerald-400" : "text-white/40"} />
                                    <div className={cn(
                                      "w-6 h-3 rounded-full flex items-center p-0.5 transition-colors",
                                      (settings as any)[opt.id] ? "bg-emerald-500" : "bg-white/10"
                                    )}>
                                      <div className={cn(
                                        "w-2 h-2 rounded-full bg-white transition-transform",
                                        (settings as any)[opt.id] ? "translate-x-3" : "translate-x-0"
                                      )}/>
                                    </div>
                                  </div>
                                  <div>
                                    <h5 className={cn("text-[9px] font-black uppercase tracking-widest mt-1", (settings as any)[opt.id] ? "text-emerald-400" : "text-white/70")}>{opt.label}</h5>
                                    <p className="text-[8px] text-white/40 leading-tight mt-1">{opt.desc}</p>
                                  </div>
                               </button>
                             ))}

                             <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between group">
                                <label className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-2">Přísnost AI Analýzy</label>
                                <select 
                                  value={settings.aiStrictness || 'normal'}
                                  onChange={e => updateSetting('aiStrictness', e.target.value)}
                                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 outline-none focus:border-emerald-500/50"
                                >
                                  <option value="loose">Loose (Liberální)</option>
                                  <option value="normal">Normal (Standardní)</option>
                                  <option value="strict">Strict (Konzervativní)</option>
                                </select>
                             </div>

                             <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between group">
                                <label className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-2">Model Rozpadu</label>
                                <select 
                                  value={settings.decayModel || 'exponential'}
                                  onChange={e => updateSetting('decayModel', e.target.value)}
                                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 outline-none focus:border-emerald-500/50"
                                >
                                  <option value="linear">Lineární (V0)</option>
                                  <option value="exponential">Exponenciální (Farmakokinetický)</option>
                                </select>
                             </div>

                             <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between group">
                                <label className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-2">Matrix Interakcí</label>
                                <select 
                                  value={settings.interactionAlgorithm || 'v1'}
                                  onChange={e => updateSetting('interactionAlgorithm', e.target.value)}
                                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 outline-none focus:border-emerald-500/50"
                                >
                                  <option value="v1">Stable V1</option>
                                  <option value="v2_beta">V2 Beta (N-cestná interakce)</option>
                                </select>
                             </div>
                          </div>
                        </div>

                        {/* STORAGE & DATA */}
                        <div className="space-y-4 pt-2">
                          <h4 className="text-xs font-black text-white/80 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                             <Database size={14} className="text-cyan-400" /> Úložiště & Datový Model
                          </h4>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                             {[
                               { id: 'clearCacheOnStart', label: 'Clear Cache On Start', desc: 'Promaže temporální data enginu při startu', icon: RefreshCw },
                               { id: 'verboseLogging', label: 'Verbose Logging', desc: 'Zvýšená úroveň logování do Developer Konzole', icon: Terminal },
                               { id: 'debugMode', label: 'Semafor Debug Mode', desc: 'Aktivuje debug vrstvu nad rizikovým enginem', icon: Bug },
                             ].map((opt) => (
                               <button
                                  key={opt.id}
                                  onClick={() => updateSetting(opt.id as keyof UserSettings, !(settings as any)[opt.id])}
                                  className={cn(
                                    "p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all relative overflow-hidden group",
                                    (settings as any)[opt.id] 
                                      ? "bg-cyan-500/10 border-cyan-500/30 shadow-[inset_0_0_15px_rgba(6,182,212,0.05)]" 
                                      : "bg-black/60 border-white/5 hover:bg-black/80 hover:border-white/10"
                                  )}
                               >
                                  <div className="flex justify-between items-center w-full">
                                    <opt.icon size={12} className={(settings as any)[opt.id] ? "text-cyan-400" : "text-white/40"} />
                                    <div className={cn(
                                      "w-6 h-3 rounded-full flex items-center p-0.5 transition-colors",
                                      (settings as any)[opt.id] ? "bg-cyan-500" : "bg-white/10"
                                    )}>
                                      <div className={cn(
                                        "w-2 h-2 rounded-full bg-white transition-transform",
                                        (settings as any)[opt.id] ? "translate-x-3" : "translate-x-0"
                                      )}/>
                                    </div>
                                  </div>
                                  <div>
                                    <h5 className={cn("text-[9px] font-black uppercase tracking-widest mt-1", (settings as any)[opt.id] ? "text-cyan-400" : "text-white/70")}>{opt.label}</h5>
                                    <p className="text-[8px] text-white/40 leading-tight mt-1">{opt.desc}</p>
                                  </div>
                               </button>
                             ))}

                             <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between group">
                                <label className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-2">Database Engine</label>
                                <select 
                                  value={settings.databaseMode || 'indexed_db'}
                                  onChange={e => updateSetting('databaseMode', e.target.value)}
                                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 outline-none focus:border-cyan-500/50"
                                >
                                  <option value="indexed_db">Indexed DB (Optimized)</option>
                                  <option value="local_storage">Local Storage (Legacy)</option>
                                  <option value="memory">In-Memory (Volatile)</option>
                                </select>
                             </div>
                          </div>
                        </div>

                        {/* RENDER & PERFORMANCE */}
                        <div className="space-y-4 pt-2">
                          <h4 className="text-xs font-black text-white/80 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                             <Cpu size={14} className="text-blue-400" /> Renderovač & Výkon
                          </h4>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                             {[
                               { id: 'hardwareAcceleration', label: 'GPU Acceleration', desc: 'Přesune výpočty canvas objektů na GPU', icon: Zap },
                               { id: 'disableTransitions', label: 'Disable Transitions', desc: 'Vypne zbytečné UI animace pro raw výkon', icon: ZapOff },
                               { id: 'uiDebugBorders', label: 'Show UI Borders', desc: 'CSS Wireframe mód pro debugování layoutu', icon: Scan },
                             ].map((opt) => (
                               <button
                                  key={opt.id}
                                  onClick={() => updateSetting(opt.id as keyof UserSettings, !(settings as any)[opt.id])}
                                  className={cn(
                                    "p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all relative overflow-hidden group",
                                    (settings as any)[opt.id] 
                                      ? "bg-blue-500/10 border-blue-500/30 shadow-[inset_0_0_15px_rgba(59,130,246,0.05)]" 
                                      : "bg-black/60 border-white/5 hover:bg-black/80 hover:border-white/10"
                                  )}
                               >
                                  <div className="flex justify-between items-center w-full">
                                    <opt.icon size={12} className={(settings as any)[opt.id] ? "text-blue-400" : "text-white/40"} />
                                    <div className={cn(
                                      "w-6 h-3 rounded-full flex items-center p-0.5 transition-colors",
                                      (settings as any)[opt.id] ? "bg-blue-500" : "bg-white/10"
                                    )}>
                                      <div className={cn(
                                        "w-2 h-2 rounded-full bg-white transition-transform",
                                        (settings as any)[opt.id] ? "translate-x-3" : "translate-x-0"
                                      )}/>
                                    </div>
                                  </div>
                                  <div>
                                    <h5 className={cn("text-[9px] font-black uppercase tracking-widest mt-1", (settings as any)[opt.id] ? "text-blue-400" : "text-white/70")}>{opt.label}</h5>
                                    <p className="text-[8px] text-white/40 leading-tight mt-1">{opt.desc}</p>
                                  </div>
                               </button>
                             ))}

                             <div className="grid grid-cols-1 gap-2">
                               <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between group h-full">
                                  <label className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-2">Canvas Render</label>
                                  <select 
                                    value={settings.canvasRenderMode || 'webgl'}
                                    onChange={e => updateSetting('canvasRenderMode', e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 outline-none focus:border-blue-500/50 mt-auto"
                                  >
                                    <option value="webgl">WebGL (Fast)</option>
                                    <option value="2d">Canvas 2D (Safe fallback)</option>
                                  </select>
                               </div>

                               <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between group h-full">
                                  <label className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-2">Target FPS</label>
                                  <select 
                                    value={settings.renderFPS || 60}
                                    onChange={e => updateSetting('renderFPS', parseInt(e.target.value) as 30 | 60 | 120)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 outline-none focus:border-blue-500/50 mt-auto"
                                  >
                                    <option value={30}>30 FPS (Battery Saver)</option>
                                    <option value={60}>60 FPS (Standard)</option>
                                    <option value={120}>120 FPS (Display Match)</option>
                                  </select>
                               </div>
                             </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-emerald-400/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <LineChart size={14} className="text-emerald-400" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Data Stale Weight</label>
                                  </div>
                                  <span className="text-[10px] text-emerald-300 font-mono bg-emerald-400/10 px-1.5 py-0.5 rounded">{(settings.staleDataWeightMultiplier ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Degradace starých dat. Menší než 1 = AI preferuje výhradně nedávné vzorce.</p>
                               <input type="range" min="0.1" max="5.0" step="0.1" value={settings.staleDataWeightMultiplier ?? 1.0} onChange={e => updateSetting('staleDataWeightMultiplier', parseFloat(e.target.value) || 1.0)} className="w-full h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-sky-400/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <Terminal size={14} className="text-sky-400" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Decay Rate Constant</label>
                                  </div>
                                  <span className="text-[10px] text-sky-300 font-mono bg-sky-400/10 px-1.5 py-0.5 rounded">{(settings.doseDecayRate ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Přepis základní matematické konstanty celkové eliminační křivky těla.</p>
                               <input type="range" min="0.1" max="3.0" step="0.1" value={settings.doseDecayRate ?? 1.0} onChange={e => updateSetting('doseDecayRate', parseFloat(e.target.value) || 1.0)} className="w-full h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-sky-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-black/80 hover:border-yellow-400/30 transition-all duration-300">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <Code size={14} className="text-yellow-400" />
                                     <label className="text-[10px] font-bold text-white uppercase tracking-wider">Habit Sensitivity</label>
                                  </div>
                                  <span className="text-[10px] text-yellow-300 font-mono bg-yellow-400/10 px-1.5 py-0.5 rounded">{(settings.habitAnalysisSensitivity ?? 1.0).toFixed(2)}x</span>
                               </div>
                               <p className="text-[10px] text-white/40 mb-4 leading-relaxed min-h-[44px]">Určuje sílu LLM k nalézání vzorců. Vyšší = hledá spojitosti i tam, kde nejsou.</p>
                               <input type="range" min="0.1" max="5.0" step="0.1" value={settings.habitAnalysisSensitivity ?? 1.0} onChange={e => updateSetting('habitAnalysisSensitivity', parseFloat(e.target.value) || 1.0)} className="w-full h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                            </div>

                            <div className="col-span-1 sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                               <div className="bg-black/60 border border-white/5 rounded-2xl p-4 focus-within:border-white/20 transition-all duration-300">
                                 <label className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-3 block">AI Max Tokens Limit</label>
                                 <input type="number" value={settings.aiMaxTokens ?? 600} onChange={e => updateSetting('aiMaxTokens', parseInt(e.target.value) || 600)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-colors" />
                               </div>
                               <div className="bg-black/60 border border-white/5 rounded-2xl p-4 focus-within:border-white/20 transition-all duration-300">
                                 <label className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-3 block">AI Retry Fallbacks</label>
                                 <input type="number" value={settings.aiMaxRetries ?? 2} onChange={e => updateSetting('aiMaxRetries', parseInt(e.target.value) || 2)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-colors" />
                               </div>
                            </div>
                          </div>

                        {/* LLM PROMPTY */}
                        <div className="space-y-4 pt-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                             <h4 className="text-xs font-black text-white/80 uppercase tracking-widest flex items-center gap-2">
                                <Terminal size={14} className="text-purple-400" /> Super-User Prompts Override
                             </h4>
                             <button
                               onClick={() => {
                                  updateSetting('aiSystemPrompt', DEFAULT_SYSTEM_PROMPT);
                                  updateSetting('aiGlobalPrompt', DEFAULT_GLOBAL_PROMPT);
                                  updateSetting('aiPredictionPrompt', DEFAULT_PREDICTION_PROMPT);
                                  updateSetting('aiTaperingSystemPrompt', DEFAULT_TAPERING_PROMPT);
                               }}
                               className="text-[10px] font-bold bg-white/5 hover:bg-white/10 text-white/70 px-4 py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-widest border border-white/5 hover:border-white/10"
                             >
                                <RefreshCw size={12} /> Resetovat Defaultní Bloky
                             </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 focus-within:border-purple-500/30 transition-all duration-300">
                              <div className="flex items-center justify-between mb-3">
                                 <label className="text-[10px] font-bold text-white uppercase tracking-widest">Analyzátor: Metaprompt Role</label>
                                 <span className="text-purple-400/80 text-[9px] font-bold uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">SYSTEM FORMAT</span>
                              </div>
                              <textarea 
                                value={settings.aiSystemPrompt ?? DEFAULT_SYSTEM_PROMPT}
                                onChange={e => updateSetting('aiSystemPrompt', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[11px] leading-relaxed font-mono text-white/70 focus:outline-none focus:border-purple-500/50 focus:text-white focus:bg-white/10 transition-colors h-32 custom-scrollbar resize-none"
                              />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 focus-within:border-purple-500/30 transition-all duration-300">
                              <div className="flex items-center justify-between mb-3">
                                 <label className="text-[10px] font-bold text-white uppercase tracking-widest">Tapering Agent: Metaprompt Role</label>
                                 <span className="text-purple-400/80 text-[9px] font-bold uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">SYSTEM FORMAT</span>
                              </div>
                              <textarea 
                                value={settings.aiTaperingSystemPrompt ?? DEFAULT_TAPERING_PROMPT}
                                onChange={e => updateSetting('aiTaperingSystemPrompt', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[11px] leading-relaxed font-mono text-white/70 focus:outline-none focus:border-purple-500/50 focus:text-white focus:bg-white/10 transition-colors h-32 custom-scrollbar resize-none"
                              />
                            </div>
                            
                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 focus-within:border-sky-500/30 transition-all duration-300">
                              <div className="flex items-center justify-between mb-3">
                                 <label className="text-[10px] font-bold text-white uppercase tracking-widest">Analyzátor: JSON Vstup</label>
                                 <span className="text-sky-400/80 text-[9px] font-bold uppercase tracking-widest bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">USER INSTRUCTION FORMAT</span>
                              </div>
                              <textarea 
                                value={settings.aiGlobalPrompt ?? DEFAULT_GLOBAL_PROMPT}
                                onChange={e => updateSetting('aiGlobalPrompt', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[11px] leading-relaxed font-mono text-white/70 focus:outline-none focus:border-sky-500/50 focus:text-white focus:bg-white/10 transition-colors h-48 custom-scrollbar resize-none"
                              />
                            </div>

                            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 focus-within:border-sky-500/30 transition-all duration-300">
                              <div className="flex items-center justify-between mb-3">
                                 <label className="text-[10px] font-bold text-white uppercase tracking-widest">Tapering Agent: JSON Vstup</label>
                                 <span className="text-sky-400/80 text-[9px] font-bold uppercase tracking-widest bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">USER INSTRUCTION FORMAT</span>
                              </div>
                              <textarea 
                                value={settings.aiPredictionPrompt ?? DEFAULT_PREDICTION_PROMPT}
                                onChange={e => updateSetting('aiPredictionPrompt', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[11px] leading-relaxed font-mono text-white/70 focus:outline-none focus:border-sky-500/50 focus:text-white focus:bg-white/10 transition-colors h-48 custom-scrollbar resize-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* DANGER ZONE */}
                        <div className="mt-8 border border-red-500/30 bg-red-500/5 rounded-2xl p-6 relative overflow-hidden group">
                           <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDAsMCwwLjE1KSIvPjwvc3ZnPg==')] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                           <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div>
                                <h4 className="text-red-500 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                                  <ShieldAlert size={16} /> Danger Zone
                                </h4>
                                <p className="text-xs text-red-500/60 leading-relaxed max-w-sm">
                                  Tato akce kompletně vymaže všechna lokální data v prohlížeči. Vaše záznamy, nastavení i historie zvyků budou nevratně ztraceny. Proveďte nejprve textovou zálohu v sekci Security.
                                </p>
                              </div>
                              <button 
                                onClick={() => {
                                  if(window.confirm('VÁŽNÉ VAROVÁNÍ: Opravdu chcete vymazat komplet celou databázi? Tato akce je nevratná!')) {
                                    localStorage.clear();
                                    window.location.reload();
                                  }
                                }}
                                className="shrink-0 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]"
                              >
                                Hard Reset Dvojitý
                              </button>
                           </div>
                        </div>

                    </div>
                 </div>
               </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-md3-gray flex items-center gap-2">
                  <ShieldCheck size={16} className="text-md3-primary" /> Bezpečnost a soukromí
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => updateSetting('privacyMode', !settings.privacyMode)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all shadow-sm",
                      settings.privacyMode 
                        ? "bg-md3-primary/10 border-md3-primary/30 text-md3-primary" 
                        : "bg-theme-subtle border-theme-border text-md3-gray"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <EyeOff size={18} />
                      <span className="font-bold text-sm">Režim soukromí (skrýt částky a detaily)</span>
                    </div>
                    <div className={cn(
                      "w-10 h-6 rounded-full p-1 transition-all",
                      settings.privacyMode ? "bg-md3-primary" : "bg-theme-border"
                    )}>
                      <div className={cn(
                        "w-4 h-4 rounded-full bg-white transition-all",
                        settings.privacyMode ? "translate-x-4" : "translate-x-0"
                      )} />
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      if (settings.requirePin) {
                        updateSetting('requirePin', false);
                        updateSetting('pinCode', null);
                      } else {
                        setIsSettingPin(true);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all shadow-sm",
                      settings.requirePin 
                        ? "bg-md3-primary/10 border-md3-primary/30 text-md3-primary" 
                        : "bg-theme-subtle border-theme-border text-md3-gray"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Lock size={18} />
                      <span className="font-bold text-sm">Zámek aplikace (PIN kód)</span>
                    </div>
                    <div className={cn(
                      "w-10 h-6 rounded-full p-1 transition-all",
                      settings.requirePin ? "bg-md3-primary" : "bg-theme-border"
                    )}>
                      <div className={cn(
                        "w-4 h-4 rounded-full bg-white transition-all",
                        settings.requirePin ? "translate-x-4" : "translate-x-0"
                      )} />
                    </div>
                  </button>
                  
                  {settings.requirePin && (
                    <button 
                      onClick={() => setIsSettingPin(true)}
                      className="w-full flex items-center justify-center p-3 rounded-xl border border-md3-primary text-md3-primary hover:bg-md3-primary/10 transition-all font-bold text-sm"
                    >
                      <Fingerprint size={16} className="mr-2" />
                      Změnit PIN
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DATA TAB */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-md3-gray flex items-center gap-2">
                  <Database size={16} className="text-md3-primary" /> Správa dat
                </h3>
                <div className="space-y-3">
                  <div className="space-y-2 mb-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray ml-1">Automatická záloha</label>
                    <select 
                      value={settings.autoBackup || 'none'} 
                      onChange={e => updateSetting('autoBackup', e.target.value as any)}
                      className="w-full md3-input appearance-none"
                    >
                      <option value="none" className="bg-theme-bg">Vypnuto</option>
                      <option value="daily" className="bg-theme-bg">Denně</option>
                      <option value="weekly" className="bg-theme-bg">Týdně</option>
                      <option value="monthly" className="bg-theme-bg">Měsíčně</option>
                    </select>
                  </div>
                  
                  <div className="pt-2 pb-4">
                    <button 
                      onClick={() => updateSetting('privacyMode', !settings.privacyMode)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all shadow-sm",
                        settings.privacyMode 
                          ? "bg-md3-primary/10 border-md3-primary/30 text-md3-primary" 
                          : "bg-theme-subtle border-theme-border text-md3-gray"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={18} />
                        <div className="text-left">
                          <span className="font-bold text-sm block">Anonymizace dat</span>
                          <span className="text-xs opacity-80">Při exportu skryje osobní údaje</span>
                        </div>
                      </div>
                      <div className={cn(
                        "w-10 h-6 rounded-full p-1 transition-all",
                        settings.privacyMode ? "bg-md3-primary" : "bg-theme-border"
                      )}>
                        <div className={cn(
                          "w-4 h-4 rounded-full bg-white transition-all",
                          settings.privacyMode ? "translate-x-4" : "translate-x-0"
                        )} />
                      </div>
                    </button>
                  </div>

                  <button 
                    onClick={onExport}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border text-theme-text hover:bg-theme-subtle-hover transition-all group md3-button"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-md3-primary/10 text-md3-primary group-hover:scale-110 transition-transform">
                        <Download size={18} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">Zálohovat data (JSON)</div>
                        <div className="text-xs text-md3-gray">Uloží všechna data do souboru</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-md3-gray" />
                  </button>

                  {onExportCSV && (
                    <button 
                      onClick={onExportCSV}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border text-theme-text hover:bg-theme-subtle-hover transition-all group md3-button"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                          <Database size={18} />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-sm">Exportovat do CSV</div>
                          <div className="text-xs text-md3-gray">Pro analýzu v Excelu</div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-md3-gray" />
                    </button>
                  )}

                  {onExportText && (
                    <button 
                      onClick={() => {
                        const txt = onExportText();
                        navigator.clipboard.writeText(txt);
                        alert("Záloha byla zkopírována do schránky jako text.");
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border text-theme-text hover:bg-theme-subtle-hover transition-all group md3-button"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                          <Code size={18} />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-sm">Zkopírovat zálohu jako text</div>
                          <div className="text-xs text-md3-gray">Uloží zálohu do schránky</div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-md3-gray" />
                    </button>
                  )}

                  <label className="w-full flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border text-theme-text hover:bg-theme-subtle-hover transition-all cursor-pointer group md3-button">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                        <Upload size={18} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">Obnovit ze souboru</div>
                        <div className="text-xs text-md3-gray">Načte data z JSON souboru</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-md3-gray" />
                    <input type="file" accept=".json" onChange={onImport} className="hidden" />
                  </label>

                  {onImportText && (
                    <div className="rounded-2xl bg-theme-subtle border border-theme-border overflow-hidden">
                      <button 
                        onClick={() => setShowTextImport(!showTextImport)}
                        className="w-full flex items-center justify-between p-4 text-theme-text hover:bg-theme-subtle-hover transition-all group md3-button"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 group-hover:scale-110 transition-transform">
                            <Upload size={18} />
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-sm">Obnovit z textu</div>
                            <div className="text-xs text-md3-gray">Vložit textovou zálohu ze schránky</div>
                          </div>
                        </div>
                        <ChevronRight size={18} className={cn("text-md3-gray transition-transform", showTextImport && "rotate-90")} />
                      </button>
                      <AnimatePresence>
                        {showTextImport && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4"
                          >
                            <textarea 
                              value={importTextValue}
                              onChange={e => setImportTextValue(e.target.value)}
                              placeholder="Vložte text zálohy (JSON)..."
                              className="w-full h-32 md3-input mb-2 text-xs"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => { setShowTextImport(false); setImportTextValue(''); }}
                                className="px-4 py-2 rounded-xl bg-theme-bg text-theme-text border border-theme-border text-sm font-bold"
                              >
                                Zrušit
                              </button>
                              <button 
                                onClick={() => {
                                  onImportText(importTextValue);
                                  setShowTextImport(false);
                                  setImportTextValue('');
                                }}
                                className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-md"
                              >
                                Načíst text
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <button 
                    onClick={onClearData}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all group md3-button mt-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-red-500/10 group-hover:scale-110 transition-transform">
                        <Trash2 size={18} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">Smazat všechna data</div>
                        <div className="text-xs opacity-80">Tato akce je nevratná</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-[2rem] bg-black border border-white/10 p-8 flex flex-col items-center justify-center min-h-[300px] shadow-2xl">
                {/* Abstract background elements */}
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/0 blur-[60px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-emerald-500/20 to-teal-500/0 blur-[60px]" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="w-24 h-24 rounded-full bg-gradient-to-tr from-white/10 to-white/5 border border-white/20 backdrop-blur-md flex items-center justify-center p-1"
                  >
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner">
                      <Activity size={40} className="text-white" />
                    </div>
                  </motion.div>
                  
                  <div className="space-y-2">
                    <motion.h2 
                       initial={{ y: 10, opacity: 0 }}
                       animate={{ y: 0, opacity: 1 }}
                       transition={{ delay: 0.1 }}
                       className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/50 tracking-tighter"
                    >
                      BioTracker<span className="text-indigo-400">Pro</span>
                    </motion.h2>
                    <motion.div 
                       initial={{ y: 10, opacity: 0 }}
                       animate={{ y: 0, opacity: 1 }}
                       transition={{ delay: 0.2 }}
                       className="flex items-center justify-center gap-3"
                    >
                       <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold text-white tracking-widest uppercase">
                         Verze 2.1.5
                       </span>
                       <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 tracking-widest uppercase">
                         Quantified Self
                       </span>
                    </motion.div>
                  </div>

                  <motion.p 
                     initial={{ y: 10, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     transition={{ delay: 0.3 }}
                     className="text-sm text-white/60 font-medium max-w-[280px] leading-relaxed mx-auto"
                  >
                    Precizní analytický nástroj na pomezí technologie, biologie a umělé inteligence pro vizualizaci skrytých farmakokinetických dat.
                  </motion.p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="md3-card p-5 group hover:bg-theme-subtle-hover transition-colors">
                  <Cpu className="text-indigo-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
                  <h4 className="text-xs font-bold text-theme-text uppercase tracking-widest mb-1">Kinetický Engine</h4>
                  <p className="text-[10px] text-md3-gray leading-relaxed">Matematické modely predikující akumulaci a half-life pro stovky interakcí.</p>
                </div>
                <div className="md3-card p-5 group hover:bg-theme-subtle-hover transition-colors">
                  <Brain className="text-purple-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
                  <h4 className="text-xs font-bold text-theme-text uppercase tracking-widest mb-1">AI Průzkumník</h4>
                  <p className="text-[10px] text-md3-gray leading-relaxed">Samoučící se algoritmy identifikující skryté vzorce chování z metadat.</p>
                </div>
                <div className="md3-card p-5 group hover:bg-theme-subtle-hover transition-colors">
                  <LineChart className="text-emerald-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
                  <h4 className="text-xs font-bold text-theme-text uppercase tracking-widest mb-1">Chrono-Analýza</h4>
                  <p className="text-[10px] text-md3-gray leading-relaxed">Mapování cirkadiánních rytmů spotřeby, výkyvů a časových korelací.</p>
                </div>
                <div className="md3-card p-5 group hover:bg-theme-subtle-hover transition-colors">
                  <Lock className="text-rose-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
                  <h4 className="text-xs font-bold text-theme-text uppercase tracking-widest mb-1">Zero-Trust EEE</h4>
                  <p className="text-[10px] text-md3-gray leading-relaxed">Data neopouštějí váš prohlížeč. Lokální PWA s plným šifrováním exportů.</p>
                </div>
              </div>

              <div className="md3-card p-6 border-l-4 border-l-indigo-500">
                <h3 className="text-sm font-black uppercase tracking-widest text-theme-text mb-3 flex items-center gap-2">
                  <Info size={16} className="text-indigo-500" /> Manifest
                </h3>
                <p className="text-xs text-md3-gray leading-relaxed space-y-2">
                  <span className="block italic text-theme-text">„To, co neměříte, nemůžete řídit.“</span>
                  <span className="block mt-2">
                  Aplikace nevynáší soudy, nestigmatizuje a nemoralizuje. Poskytuje čistá data, surovou realitu a zrcadlo vašeho fyziologického stavu. Je nástrojem k sebe-uvědomění, biohackingu a redukci rizik (Harm Reduction). Jste administrátorem svého vlastního nervového systému.
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-8">
                <a href="#" className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl bg-black border border-white/10 hover:border-white/20 transition-all text-white group">
                  <Github size={24} className="text-white/60 group-hover:text-white transition-colors" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 group-hover:text-white">Zdrojový kód</span>
                </a>
                <a href="#" className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all text-rose-500 group">
                  <Heart size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Podpořit projekt</span>
                </a>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
