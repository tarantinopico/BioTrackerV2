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
  BarChart2
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
  onExportCSV
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [newEffectName, setNewEffectName] = useState('');
  const [newEffectType, setNewEffectType] = useState<Valence>('positive');
  const [isSettingPin, setIsSettingPin] = useState(false);

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
            <div className="space-y-6">
               <div className="md3-card border border-red-500/20 bg-red-500/5 p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-500 flex items-center gap-2">
                  <Terminal size={16} /> Vývojářský Režim
                </h3>
                <p className="text-xs text-md3-gray leading-relaxed mb-4">
                  Změňte základní výpočetní proměnné a upravte chování AI. Pouze pro experty, může rozbít aplikaci.
                </p>

                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between border-b border-theme-border pb-2">
                     <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest">Pravidla Umělé Inteligence (Prompty)</h4>
                        <button
                        onClick={() => {
                           updateSetting('aiSystemPrompt', DEFAULT_SYSTEM_PROMPT);
                           updateSetting('aiGlobalPrompt', DEFAULT_GLOBAL_PROMPT);
                           updateSetting('aiPredictionPrompt', DEFAULT_PREDICTION_PROMPT);
                           updateSetting('aiTaperingSystemPrompt', DEFAULT_TAPERING_PROMPT);
                        }}
                        className="text-[10px] bg-red-500/20 text-red-500 px-2 py-1 rounded"
                     >
                        Resetovat Prompty
                     </button>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-md3-gray">Systémový Prompt pro AI (Přepis)</label>
                    <textarea 
                      value={settings.aiSystemPrompt ?? DEFAULT_SYSTEM_PROMPT}
                      onChange={e => updateSetting('aiSystemPrompt', e.target.value)}
                      placeholder="Volitelně přepište roli AI..."
                      className="w-full md3-input h-24 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-md3-gray">Systémový Prompt pro Tapering</label>
                    <textarea 
                      value={settings.aiTaperingSystemPrompt ?? DEFAULT_TAPERING_PROMPT}
                      onChange={e => updateSetting('aiTaperingSystemPrompt', e.target.value)}
                      placeholder="Role AI pro tapering..."
                      className="w-full md3-input h-24 font-mono text-xs"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-md3-gray">AI Globální Analýza Prompt (Přepis JSON Schématu)</label>
                    <textarea 
                      value={settings.aiGlobalPrompt ?? DEFAULT_GLOBAL_PROMPT}
                      onChange={e => updateSetting('aiGlobalPrompt', e.target.value)}
                      placeholder="Custom format JSON..."
                      className="w-full md3-input h-48 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-md3-gray">AI Predikční Prompt (Přepis JSON Schématu)</label>
                    <textarea 
                      value={settings.aiPredictionPrompt ?? DEFAULT_PREDICTION_PROMPT}
                      onChange={e => updateSetting('aiPredictionPrompt', e.target.value)}
                      placeholder="Custom format JSON..."
                      className="w-full md3-input h-48 font-mono text-xs"
                    />
                  </div>
                  
                  <h4 className="text-xs font-bold text-md3-gray uppercase tracking-widest mt-6 mb-2 border-b border-theme-border pb-2">Parametry Modelu a Backend</h4>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                       <label className="text-[10px] font-bold text-md3-gray">AI Max Tokens (default: 600)</label>
                       <input 
                         type="number"
                         value={settings.aiMaxTokens ?? 600}
                         onChange={e => updateSetting('aiMaxTokens', parseInt(e.target.value) || 600)}
                         className="w-full md3-input font-mono text-xs"
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[10px] font-bold text-md3-gray">AI Max Retries (default: 2)</label>
                       <input 
                         type="number"
                         value={settings.aiMaxRetries ?? 2}
                         onChange={e => updateSetting('aiMaxRetries', parseInt(e.target.value) || 2)}
                         className="w-full md3-input font-mono text-xs"
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[10px] font-bold text-md3-gray">Habit Sensitivity (default: 1.0)</label>
                       <input 
                         type="number"
                         step="0.1"
                         value={settings.habitAnalysisSensitivity ?? 1.0}
                         onChange={e => updateSetting('habitAnalysisSensitivity', parseFloat(e.target.value) || 1.0)}
                         className="w-full md3-input font-mono text-xs"
                       />
                     </div>
                  </div>

                  <h4 className="text-xs font-bold text-md3-gray uppercase tracking-widest mt-6 mb-2 border-b border-theme-border pb-2">Farmakokinetika a Výpočty</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-md3-gray">Násobič Tolerance (default: 1.0)</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={settings.toleranceMultiplier ?? 1.0}
                        onChange={e => updateSetting('toleranceMultiplier', parseFloat(e.target.value) || 1.0)}
                        className="w-full md3-input font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-md3-gray">Násobič Metabolismu (default: 1.0)</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={settings.metabolismMultiplier ?? 1.0}
                        onChange={e => updateSetting('metabolismMultiplier', parseFloat(e.target.value) || 1.0)}
                        className="w-full md3-input font-mono text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-md3-gray">Násobič Poločasu Rozpadu (def: 1.0)</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={settings.halfLifeMultiplier ?? 1.0}
                        onChange={e => updateSetting('halfLifeMultiplier', parseFloat(e.target.value) || 1.0)}
                        className="w-full md3-input font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-md3-gray">Decay Rate Dávky (default: 1.0)</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={settings.doseDecayRate ?? 1.0}
                        onChange={e => updateSetting('doseDecayRate', parseFloat(e.target.value) || 1.0)}
                        className="w-full md3-input font-mono text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-md3-gray">Násobič Peak Intensity (default: 1.0)</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={settings.peakIntensityMultiplier ?? 1.0}
                        onChange={e => updateSetting('peakIntensityMultiplier', parseFloat(e.target.value) || 1.0)}
                        className="w-full md3-input font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-md3-gray">Risk Score Násobič (default: 1.0)</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={settings.riskScoreMultiplier ?? 1.0}
                        onChange={e => updateSetting('riskScoreMultiplier', parseFloat(e.target.value) || 1.0)}
                        className="w-full md3-input font-mono text-xs"
                      />
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

                  <label className="w-full flex items-center justify-between p-4 rounded-2xl bg-theme-subtle border border-theme-border text-theme-text hover:bg-theme-subtle-hover transition-all cursor-pointer group md3-button">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                        <Upload size={18} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">Obnovit ze zálohy</div>
                        <div className="text-xs text-md3-gray">Načte data z JSON souboru</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-md3-gray" />
                    <input type="file" accept=".json" onChange={onImport} className="hidden" />
                  </label>

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
              <div className="md3-card p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-md3-primary flex items-center justify-center shadow-lg">
                  <Activity size={40} className="text-theme-bg" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-theme-text tracking-tight">BioTracker Pro</h2>
                  <p className="text-sm font-bold text-md3-gray tracking-widest uppercase mt-1">Verze 2.1.0</p>
                </div>
                <p className="text-sm text-md3-gray font-medium max-w-sm leading-relaxed">
                  Pokročilý systém pro sledování farmakokinetiky, biometrických dat a hloubkovou analýzu užívání látek. Navrženo pro maximální kontrolu a bezpečnost.
                </p>
                
                <div className="w-full text-left space-y-4 mt-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-md3-text border-b border-theme-border pb-2">Hlavní funkce</h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-subtle border border-theme-border">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500 mt-0.5">
                        <Activity size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-theme-text">Farmakokinetika</h4>
                        <p className="text-xs text-md3-gray mt-1 leading-relaxed">Výpočet plazmatické koncentrace v reálném čase na základě poločasu rozpadu, hmotnosti a metabolismu.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-subtle border border-theme-border">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 mt-0.5">
                        <BarChart3 size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-theme-text">Pokročilá analytika</h4>
                        <p className="text-xs text-md3-gray mt-1 leading-relaxed">Detailní grafy, sledování výdajů, analýza denní doby užívání a výpočet průměrné výdrže balení.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-subtle border border-theme-border">
                      <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 mt-0.5">
                        <ShieldAlert size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-theme-text">Prevence a bezpečnost</h4>
                        <p className="text-xs text-md3-gray mt-1 leading-relaxed">Automatické varování před nebezpečnými interakcemi, sledování budování tolerance a upozornění na comedown.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full text-left space-y-4 mt-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-md3-text border-b border-theme-border pb-2">Ochrana soukromí</h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-subtle border border-theme-border">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 mt-0.5">
                        <Database size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-theme-text">Lokální úložiště</h4>
                        <p className="text-xs text-md3-gray mt-1 leading-relaxed">Všechna data jsou ukládána výhradně ve vašem zařízení. Aplikace neodesílá žádné informace na externí servery.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-subtle border border-theme-border">
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 mt-0.5">
                        <Lock size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-theme-text">Zabezpečení přístupu</h4>
                        <p className="text-xs text-md3-gray mt-1 leading-relaxed">Možnost uzamknout aplikaci PIN kódem a skrýt citlivé finanční údaje pomocí Režimu soukromí.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a href="#" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-theme-subtle border border-theme-border hover:bg-theme-subtle-hover transition-all text-theme-text">
                  <Github size={24} className="text-md3-gray" />
                  <span className="text-xs font-bold uppercase tracking-wider">Zdrojový kód</span>
                </a>
                <a href="#" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-theme-subtle border border-theme-border hover:bg-theme-subtle-hover transition-all text-theme-text">
                  <Heart size={24} className="text-rose-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Podpořit</span>
                </a>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
