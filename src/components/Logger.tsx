import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  AlertTriangle, 
  Fingerprint,
  Clock,
  Activity,
  ChevronDown,
  Check,
  Pill,
  Droplet,
  Wind,
  Flame,
  Utensils
} from 'lucide-react';
import { Substance, Dose, UserSettings } from '../types';
import { cn, formatAmount } from '../lib/utils';
import { ROUTE_MULTIPLIERS, STOMACH_MULTIPLIERS } from '../constants';
import { getMetabolismMultiplier } from '../services/pharmacology';
import { motion, AnimatePresence } from 'motion/react';
import { getIconComponent } from './Substances';

const ModernSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Vyberte z možností", 
  multiple = false 
}: { 
  value: any, 
  onChange: (val: any) => void, 
  options: string[], 
  placeholder?: string,
  multiple?: boolean 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      if (current.includes(opt)) {
        onChange(current.filter(i => i !== opt));
      } else {
        onChange([...current, opt]);
      }
    } else {
      onChange(opt);
      setIsOpen(false);
    }
  };

  const displayValue = multiple 
    ? (Array.isArray(value) && value.length > 0 ? value.join(', ') : '')
    : value;

  return (
    <div className={cn("relative", isOpen ? "z-50" : "z-10")} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-theme-subtle border border-theme-border rounded-xl px-3 py-3 text-sm outline-none focus:border-cyan-primary transition-all text-left"
      >
        <span className={displayValue ? "text-theme-text font-bold" : "text-md3-gray"}>
          {displayValue || placeholder}
        </span>
        <ChevronDown size={14} className={cn("text-md3-gray transition-transform shrink-0 ml-2", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-theme-card border border-theme-border rounded-xl shadow-2xl py-1 overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto no-scrollbar">
              {options.map(opt => {
                const isSelected = multiple 
                  ? (Array.isArray(value) && value.includes(opt))
                  : value === opt;

                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-theme-subtle transition-colors"
                  >
                    <span className={isSelected ? "text-cyan-primary font-bold" : "text-theme-text"}>{opt}</span>
                    {isSelected && <Check size={14} className="text-cyan-primary shrink-0 ml-2" />}
                  </button>
                );
              })}
              {options.length === 0 && (
                <div className="px-3 py-2 text-sm text-md3-gray italic text-center">
                  Žádné možnosti
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface LoggerProps {
  substances: Substance[];
  doses: Dose[];
  settings: UserSettings;
  onAddDose: (dose: Dose) => void;
  onDeleteDose: (id: string) => void;
  onClearAll: () => void;
}

export default function Logger({ substances, doses, settings, onAddDose }: LoggerProps) {
  const [selectedSubstanceId, setSelectedSubstanceId] = useState(substances[0]?.id || '');
  const [selectedStrainId, setSelectedStrainId] = useState('');
  const [amount, setAmount] = useState(0);
  const [timeOffset, setTimeOffset] = useState(0); // in minutes
  const [route, setRoute] = useState('oral');
  const [stomach, setStomach] = useState('full');
  const [note, setNote] = useState('');
  
  // Advanced details state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [isLoggedState, setIsLoggedState] = useState(false);

  const selectedSubstance = useMemo(() => 
    substances.find(s => s.id === selectedSubstanceId), 
  [substances, selectedSubstanceId]);

  useEffect(() => {
    if (selectedSubstance) {
      setAmount(selectedSubstance.step || 1);
      setSelectedStrainId('');
      
      const initialCustomValues: Record<string, any> = {};
      selectedSubstance.customFields?.forEach(field => {
        if (field.type === 'boolean') initialCustomValues[field.id] = false;
        else if (field.type === 'select') initialCustomValues[field.id] = field.options?.[0] || '';
        else if (field.type === 'rating') initialCustomValues[field.id] = 3;
        else if (field.type === 'number') initialCustomValues[field.id] = '';
        else if (field.type === 'text') initialCustomValues[field.id] = '';
      });
      setCustomFieldValues(initialCustomValues);

      if (selectedSubstance.defaultRoute) {
        setRoute(selectedSubstance.defaultRoute);
      }
    }
  }, [selectedSubstanceId, selectedSubstance]);

  const handleAdjust = (direction: number) => {
    const step = selectedSubstance?.step || 1;
    setAmount(prev => Math.max(0, prev + (direction * step)));
  };

  const handleCustomFieldValueChange = (fieldId: string, value: any) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = () => {
    if (!selectedSubstance) return;

    const routeMult = ROUTE_MULTIPLIERS[route] || ROUTE_MULTIPLIERS.oral;
    let bioavailabilityMultiplier = routeMult.bioavailability;
    let tmaxMultiplier = routeMult.tmaxMultiplier;

    if (route === 'oral') {
      const stomachMult = STOMACH_MULTIPLIERS[stomach] || STOMACH_MULTIPLIERS.full;
      bioavailabilityMultiplier *= stomachMult.bioavailability;
      tmaxMultiplier /= stomachMult.speed;
    }

    const timestamp = Date.now() - timeOffset * 60000;

    const filteredCustomFields: Record<string, any> = {};
    if (showAdvanced) {
      Object.entries(customFieldValues).forEach(([k, v]) => {
        if (v !== '' && v !== false && v !== undefined && v !== null) {
          filteredCustomFields[k] = v;
        }
      });
    }

      const dose: Dose = {
        id: 'dose_' + Date.now(),
        substanceId: selectedSubstanceId,
        amount,
        timestamp,
        route,
        stomach: route === 'oral' ? stomach : null,
        note,
        strainId: selectedStrainId || null,
        bioavailabilityMultiplier,
        tmaxMultiplier,
        customFieldValues: Object.keys(filteredCustomFields).length > 0 ? filteredCustomFields : undefined,
      };

      onAddDose(dose);
      
      // Reset logic
      setTimeOffset(0);
      setNote('');
      
      const resetCustomValues: Record<string, any> = {};
      selectedSubstance.customFields?.forEach(field => {
        if (field.type === 'boolean') resetCustomValues[field.id] = false;
        else if (field.type === 'select') resetCustomValues[field.id] = field.options?.[0] || '';
        else if (field.type === 'rating') resetCustomValues[field.id] = 3;
        else if (field.type === 'number') resetCustomValues[field.id] = '';
        else if (field.type === 'text') resetCustomValues[field.id] = '';
      });
      setCustomFieldValues(resetCustomValues);
      
      // Visual feedback
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      setIsLoggedState(true);
      setTimeout(() => setIsLoggedState(false), 1500);
    };

  const getSubstanceIcon = (substance: Substance | undefined) => {
    return getIconComponent(substance?.icon);
  };

  const warnings = useMemo(() => {
    const list = [];
    if (!selectedSubstance) return list;

    // Too soon warning
    const lastDose = [...doses].filter(d => d.substanceId === selectedSubstanceId).sort((a,b) => b.timestamp - a.timestamp)[0];
    if (lastDose) {
      const minInterval = 2; // hours, could be substance specific
      const elapsed = (Date.now() - lastDose.timestamp) / 3600000;
      if (elapsed < minInterval) {
        list.push({
          type: 'time',
          title: 'Příliš brzy',
          message: `Minimální odstup je ${minInterval}h. Uplynulo pouze ${elapsed.toFixed(2)}h.`,
          severity: 'medium'
        });
      }
    }

    // Interaction warning
    const metabolismMult = getMetabolismMultiplier(settings);
    const activeDoses = doses.filter(d => {
      const elapsed = (Date.now() - d.timestamp) / 3600000;
      const sub = substances.find(s => s.id === d.substanceId);
      if (!sub) return false;
      
      let eliminationTime = sub.halfLife * 5 / metabolismMult;
      if (sub.metabolismCurve === 'custom' && sub.customCurve && sub.customCurve.length > 0) {
        const lastPoint = [...sub.customCurve].sort((a, b) => a.time - b.time).pop();
        if (lastPoint) {
          eliminationTime = lastPoint.time / metabolismMult;
        }
      }
      
      return elapsed < eliminationTime;
    });
    
    const activeSubstanceIds = Array.from(new Set(activeDoses.map(d => d.substanceId)));
    
    activeSubstanceIds.forEach(id => {
      if (id === selectedSubstanceId) return;
      const other = substances.find(s => s.id === id);
      if (!other) return;
      
      if (selectedSubstance.interactions?.includes(id) || other.interactions?.includes(selectedSubstanceId)) {
        list.push({
          type: 'interaction',
          title: 'Nebezpečná kombinace',
          message: `Pozor na kombinaci s ${other.name}. ${selectedSubstance.interactionMessage || other.interactionMessage || ''}`,
          severity: selectedSubstance.isSevere || other.isSevere ? 'high' : 'medium'
        });
      }
    });

    // Daily limit warning
    if (selectedSubstance.dailyLimit) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayDoses = doses.filter(d => 
        d.substanceId === selectedSubstanceId && 
        d.timestamp >= todayStart.getTime()
      );
      const totalToday = todayDoses.reduce((sum, d) => sum + d.amount, 0) + amount;
      
      if (totalToday > selectedSubstance.dailyLimit) {
        list.push({
          type: 'limit',
          title: 'Překročen denní limit',
          message: `Dnešní dávka (${formatAmount(totalToday, selectedSubstance.unit, 1)}) překračuje nastavený limit ${formatAmount(selectedSubstance.dailyLimit, selectedSubstance.unit, 1)}.`,
          severity: 'high'
        });
      } else if (totalToday > selectedSubstance.dailyLimit * 0.8) {
        list.push({
          type: 'limit',
          title: 'Blížíte se dennímu limitu',
          message: `Dnešní dávka (${formatAmount(totalToday, selectedSubstance.unit, 1)}) se blíží limitu ${formatAmount(selectedSubstance.dailyLimit, selectedSubstance.unit, 1)}.`,
          severity: 'medium'
        });
      }
    }

    // Stash warning
    if (selectedSubstance.stash !== undefined) {
      if (amount > selectedSubstance.stash) {
        list.push({
          type: 'limit',
          title: 'Nedostatek v zásobě',
          message: `Požadované množství (${formatAmount(amount, selectedSubstance.unit, 1)}) překračuje aktuální zásobu (${formatAmount(selectedSubstance.stash, selectedSubstance.unit, 1)}).`,
          severity: 'high'
        });
      } else if (selectedSubstance.packageSize && selectedSubstance.stash <= selectedSubstance.packageSize * 0.1) {
        list.push({
          type: 'limit',
          title: 'Nízká zásoba',
          message: `Vaše zásoba (${formatAmount(selectedSubstance.stash, selectedSubstance.unit, 1)}) klesla pod 10% velikosti balení.`,
          severity: 'medium'
        });
      }
    }

    return list;
  }, [selectedSubstanceId, doses, selectedSubstance, substances, amount, settings]);

  const taperingGuidance = useMemo(() => {
    if (!selectedSubstance || !settings.activeTaperingPlan || settings.activeTaperingPlan.substanceId !== selectedSubstanceId) return null;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const dayItem = settings.activeTaperingPlan.plan.find(p => p.date === todayStr);
    
    if (!dayItem) return null;

    const plannedTotal = dayItem.totalRecommendedAmount;
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayDoses = doses.filter(d => 
      d.substanceId === selectedSubstanceId && 
      d.timestamp >= todayStart.getTime()
    );
    const usedToday = todayDoses.reduce((sum, d) => sum + d.amount, 0);
    const newTotal = usedToday + amount;
    
    let doseGuidance: any = null;
    
    const currentHour = new Date().getHours();
    const currentMin = new Date().getMinutes();
    const currentMins = currentHour * 60 + currentMin - timeOffset;

    if (dayItem.doses && dayItem.doses.length > 0) {
      let nearestDose: any = null;
      let minDiff = Infinity;
      
      for (const d of dayItem.doses) {
        if (!d.time || !d.time.includes(':')) continue;
        const [h, m] = d.time.split(':').map(Number);
        const doseMins = h * 60 + m;
        const diff = Math.abs(currentMins - doseMins);
        if (diff < minDiff) {
          minDiff = diff;
          nearestDose = { ...d, diffMins: diff, doseMins };
        }
      }
      
      if (nearestDose) {
        const isRightTime = nearestDose.diffMins <= 60; // 1 hr diff allowed
        let timeMsg = isRightTime ? 'Správný čas.' : (currentMins < nearestDose.doseMins ? `Nyní je moc brzy (-${Math.round(nearestDose.diffMins)} min). Plánováno v ${nearestDose.time}.` : `Zpoždění (+${Math.round(nearestDose.diffMins)} min). Plánováno bylo v ${nearestDose.time}.`);
        
        let amountMsg = amount <= nearestDose.amount ? `Dávka je OK.` : `Plánováno max ${nearestDose.amount} ${selectedSubstance.unit}.`;
        
        const lastDose = [...doses].filter(d => d.substanceId === selectedSubstanceId).sort((a,b) => b.timestamp - a.timestamp)[0];
        let recentlyTook = false;
        if (lastDose && (Date.now() - lastDose.timestamp) < 7200000) {
           recentlyTook = true;
        }

        doseGuidance = {
           nearestDose,
           isRightTime,
           timeMsg,
           amountMsg,
           isOverAmount: amount > nearestDose.amount,
           isOverTotal: newTotal > plannedTotal,
           recentlyTook,
           plannedTotal,
           usedToday,
           newTotal
        };
      }
    } else {
      doseGuidance = {
         isOverTotal: newTotal > plannedTotal,
         plannedTotal,
         usedToday,
         newTotal
      };
    }
    
    return doseGuidance;
  }, [selectedSubstance, settings.activeTaperingPlan, doses, amount, selectedSubstanceId, timeOffset]);

  const timeOptions = [
    { label: 'Nyní', value: 0 },
    { label: '-15m', value: 15 },
    { label: '-30m', value: 30 },
    { label: '-1h', value: 60 },
    { label: '-2h', value: 120 },
  ];

  const currentStrain = selectedSubstance?.strains?.find(s => s.name === selectedStrainId);
  const price = currentStrain ? currentStrain.price * amount : (selectedSubstance?.price || 0) * amount;

  return (
    <div className="space-y-1.5 pb-2 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 mix-blend-screen dark:mix-blend-color-dodge">
        <div className="absolute top-[15%] left-[-5%] w-[35%] h-[35%] bg-md3-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[25%] right-[-5%] w-[30%] h-[30%] bg-md3-primary/5 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Substance Selection - Modern Pill Row */}
      <section className="relative z-10 pt-4">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3 px-1 snap-x snap-mandatory">
          {substances.map(s => {
            const Icon = getSubstanceIcon(s);
            const isActive = selectedSubstanceId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSubstanceId(s.id)}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-3.5 rounded-[1.2rem] border transition-all whitespace-nowrap justify-center relative overflow-hidden shadow-sm shrink-0 snap-start active:scale-95",
                  isActive 
                    ? "border-transparent text-white font-black scale-[1.02]" 
                    : "bg-theme-bg/60 backdrop-blur-md text-md3-gray border-theme-border/30 hover:bg-theme-bg/80 hover:text-theme-text"
                )}
                style={isActive ? { backgroundColor: s.color || '#00d1ff', boxShadow: `0 8px 25px ${s.color}66` } : {}}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeSubstanceGlow"
                    className="absolute inset-0 bg-white/20 blur-md rounded-full pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
                <Icon size={18} strokeWidth={isActive ? 3 : 2.5} className="relative z-10" />
                <span className="text-[11px] font-bold tracking-widest relative z-10 leading-none drop-shadow-sm">{s.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Details Row (Description, Strains, Tags) */}
      <div className="flex flex-col gap-3 relative z-10 mt-2">
        {selectedSubstance?.description && (
            <div className="bg-theme-subtle/40 backdrop-blur-sm border border-theme-border rounded-xl px-4 py-3 text-xs text-md3-gray leading-tight font-medium italic">
              {selectedSubstance.description}
            </div>
        )}
        {selectedSubstance?.strains && selectedSubstance.strains.length > 0 && (
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2">
             {selectedSubstance.strains.map(strain => {
               const isActive = selectedStrainId === strain.name;
               const color = strain.color || selectedSubstance.color || '#00d1ff';
               return (
                 <button
                   key={strain.name}
                   onClick={() => setSelectedStrainId(strain.name)}
                   className={cn(
                     "px-4 py-2.5 rounded-xl border text-xs font-black transition-all whitespace-nowrap uppercase tracking-widest shrink-0 shadow-sm",
                     isActive 
                       ? "bg-theme-border" 
                       : "bg-theme-card/60 backdrop-blur-md border-theme-border text-md3-gray hover:text-theme-text"
                   )}
                   style={isActive ? { borderColor: color, color: color } : {}}
                 >
                   {strain.name}
                 </button>
               );
             })}
          </div>
        )}
      </div>

      {/* Tapering Guidance */}
      {taperingGuidance && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 mb-2 bg-theme-subtle border-2 rounded-[2rem] p-5 shadow-lg relative overflow-hidden flex flex-col gap-3"
          style={{ 
            borderColor: taperingGuidance.isOverTotal || taperingGuidance.isOverAmount ? '#ef444455' : (taperingGuidance.isRightTime ? '#10b98155' : '#f59e0b55'),
            backgroundColor: taperingGuidance.isOverTotal || taperingGuidance.isOverAmount ? '#ef444410' : (taperingGuidance.isRightTime ? '#10b98110' : '#f59e0b10')
          }}
        >
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: taperingGuidance.isOverTotal || taperingGuidance.isOverAmount ? '#ef4444' : (taperingGuidance.isRightTime ? '#10b981' : '#f59e0b') }}
             >
                <Activity size={20} />
             </div>
             <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-theme-text mb-0.5"
                  style={{ color: taperingGuidance.isOverTotal || taperingGuidance.isOverAmount ? '#ef4444' : (taperingGuidance.isRightTime ? '#10b981' : '#f59e0b') }}
                >
                  Plánováno na Dnes
                </h4>
                <div className="text-[10px] font-bold text-md3-gray">
                  Z plných {taperingGuidance.plannedTotal} {selectedSubstance?.unit} sis dnes dal {taperingGuidance.usedToday} {selectedSubstance?.unit}.
                </div>
             </div>
          </div>
          
          {taperingGuidance.nearestDose && (
            <div className="p-3 bg-theme-bg rounded-xl border border-theme-border flex justify-between items-center mt-2 shadow-inner">
               <div>
                  <div className="text-[10px] uppercase font-bold text-md3-gray mb-1">{taperingGuidance.timeMsg}</div>
                  <div className="text-xs font-black text-theme-text">{taperingGuidance.amountMsg}</div>
                  {taperingGuidance.recentlyTook && (
                    <div className="text-[10px] text-red-500 font-bold mt-1">Nezapomeň, že dávku jsi už doložil před malou chvílí.</div>
                  )}
               </div>
               <div className="text-right pl-3">
                  <div className="text-2xl font-black">{taperingGuidance.nearestDose.time}</div>
               </div>
            </div>
          )}
          {!taperingGuidance.nearestDose && (
             <div className="text-[10px] uppercase font-bold text-md3-gray mt-1">Dnešní plán nemá určené přesné časy.</div>
          )}
        </motion.div>
      )}

      {/* Main Focus: Amount Control */}
      <section className="bg-theme-card/30 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-theme-border/30 flex flex-col items-center relative overflow-hidden z-10 shadow-sm group mt-6">
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none transition-opacity group-hover:opacity-[0.06]" 
          style={{ background: `radial-gradient(circle at center, ${currentStrain?.color || selectedSubstance?.color || '#00d1ff'}, transparent 70%)` }}
        />
        
        {selectedSubstance?.stash !== undefined && (
          <div className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest text-md3-gray bg-theme-bg/50 px-2 py-1 rounded-md border border-theme-border/20 shadow-sm backdrop-blur-md">
            Zásoba: <span style={{ color: currentStrain?.color || selectedSubstance?.color || '#00d1ff' }} className="font-black drop-shadow-sm">{formatAmount(selectedSubstance.stash, selectedSubstance.unit, 1)}</span>
          </div>
        )}

        {/* Amount Input and Adjustments */}
        <div className="flex items-center justify-between w-full max-w-[320px] relative z-10 mt-6">
          <button 
            onClick={() => handleAdjust(-1)}
            className="w-14 h-14 rounded-[1.2rem] flex items-center justify-center bg-theme-bg/60 border border-theme-border/20 text-md3-gray active:scale-90 transition-all hover:bg-theme-bg/80 shadow-[0_2px_10px_rgba(0,0,0,0.05)] backdrop-blur-md"
          >
            <Minus size={22} strokeWidth={2.5} />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1.5">
              <input
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="text-7xl font-black tracking-tighter tabular-nums bg-transparent border-none outline-none text-center w-32 leading-none py-0 placeholder:text-theme-border/30"
                placeholder="0"
                style={{ color: currentStrain?.color || selectedSubstance?.color || '#00d1ff', filter: `drop-shadow(0 0 16px ${currentStrain?.color || selectedSubstance?.color}44)` }}
              />
              <span className="font-bold text-lg uppercase tracking-widest opacity-80" style={{ color: currentStrain?.color || selectedSubstance?.color || '#00d1ff' }}>{selectedSubstance?.unit || 'g'}</span>
            </div>
          </div>
          
          <button 
            onClick={() => handleAdjust(1)}
            className="w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-white active:scale-90 transition-all hover:scale-[1.05]"
            style={{ backgroundColor: currentStrain?.color || selectedSubstance?.color || '#00d1ff', boxShadow: `0 6px 20px ${currentStrain?.color || selectedSubstance?.color}55` }}
          >
            <Plus size={22} strokeWidth={3} />
          </button>
        </div>

        {/* Optional Active Ingredients Display */}
        {(() => {
          const actives = currentStrain?.activeIngredients || selectedSubstance?.activeIngredients || [];
          if (actives.length > 0) {
            return (
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 max-w-full relative z-10">
                {actives.map((ai, idx) => (
                  <div key={idx} className="text-[8px] font-bold uppercase tracking-widest text-md3-gray bg-theme-bg/40 px-2 py-0.5 rounded-md border border-theme-border/20 shadow-sm backdrop-blur-md">
                    <span style={{ color: currentStrain?.color || selectedSubstance?.color || '#00d1ff' }} className="font-black drop-shadow-sm">
                      {formatAmount(((amount * ai.percentage) / 100), selectedSubstance?.unit || 'g', 2)}
                    </span> {ai.name}
                  </div>
                ))}
              </div>
            );
          } else if (selectedSubstance?.activeIngredientName && (currentStrain?.activeIngredientPercentage || selectedSubstance?.activeIngredientPercentage)) {
            return (
              <div className="text-[8px] font-bold uppercase tracking-widest text-md3-gray mt-2 bg-theme-bg/40 px-2 py-0.5 rounded-md border border-theme-border/20 shadow-sm backdrop-blur-md relative z-10">
                 ÚČ. LÁTKA: <span style={{ color: currentStrain?.color || selectedSubstance?.color || '#00d1ff' }} className="font-black drop-shadow-sm">{formatAmount(((amount * (currentStrain?.activeIngredientPercentage || selectedSubstance?.activeIngredientPercentage || 0)) / 100), selectedSubstance?.unit || 'g', 2)}</span> {selectedSubstance.activeIngredientName}
              </div>
            );
          }
          return null;
        })()}

        {/* Quick Amount Presets */}
        <div className="flex gap-2 mt-6 relative z-10 overflow-x-auto no-scrollbar w-full pb-1 justify-center px-1">
          {[1, 5, 10, 25, 50].map(val => (
            <button
              key={val}
              onClick={() => setAmount(val)}
              className="flex-1 min-w-[50px] py-2.5 rounded-[1rem] border text-[11px] font-bold text-md3-gray transition-all uppercase tracking-widest active:scale-95 shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex items-center justify-center gap-0.5 backdrop-blur-sm"
              style={{ 
                borderColor: amount === val ? (currentStrain?.color || selectedSubstance?.color) : 'var(--theme-border)', 
                color: amount === val ? (currentStrain?.color || selectedSubstance?.color) : undefined,
                backgroundColor: amount === val ? `${currentStrain?.color || selectedSubstance?.color}15` : 'var(--theme-bg)'
              }}
            >
              +{val}<span className="text-[9px] opacity-70 ml-0.5">{selectedSubstance?.unit}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Secondary Controls: Time & Advanced Options Toggle  */}
      <section className="flex flex-wrap items-center justify-between w-full mt-4 gap-2 relative z-10 px-1">
        <div className="flex gap-2 overflow-x-auto no-scrollbar items-center pb-1">
            {timeOptions.slice(0, 4).map(opt => (
              <button
                key={opt.value}
                onClick={() => setTimeOffset(opt.value)}
                className={cn(
                  "px-4 py-3 rounded-2xl text-[11px] font-black transition-all whitespace-nowrap uppercase tracking-widest shrink-0 border shadow-sm",
                  timeOffset === opt.value
                    ? "text-theme-bg" 
                    : "bg-theme-card/60 backdrop-blur-md border-theme-border text-md3-gray hover:bg-theme-subtle"
                )}
                style={timeOffset === opt.value ? { backgroundColor: selectedSubstance?.color || '#00d1ff', borderColor: 'transparent' } : {}}
              >
                {opt.label}
              </button>
            ))}
        </div>
        
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "p-3 rounded-2xl border transition-all shrink-0 shadow-sm flex items-center justify-center gap-1",
            showAdvanced ? "bg-theme-subtle border-theme-border text-md3-primary" : "bg-theme-card/60 backdrop-blur-md border-theme-border text-md3-gray"
          )}
        >
          <Activity size={20} className={cn("transition-transform", showAdvanced && "scale-110")} />
        </button>
      </section>

      {/* Advanced Details Toggle (Content only) */}
      <section className="relative z-40">
        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={showAdvanced ? "overflow-visible" : "overflow-hidden"}
            >
                <div className="p-4 mt-2 rounded-2xl bg-theme-subtle border border-theme-border space-y-4">
                {selectedSubstance?.customFields && selectedSubstance.customFields.length > 0 ? (
                  <div className="space-y-4">
                    {selectedSubstance.customFields.map((field, index) => {
                      if (field.type === 'boolean') {
                        return (
                          <div key={field.id} className="relative" style={{ zIndex: 50 - index }}>
                            <button
                              onClick={() => handleCustomFieldValueChange(field.id, !customFieldValues[field.id])}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                                customFieldValues[field.id] 
                                  ? "bg-md3-primary/10 border-md3-primary/30 text-md3-primary" 
                                  : "bg-theme-subtle border-theme-border text-md3-gray hover:text-theme-text"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                customFieldValues[field.id] ? "bg-md3-primary border-md3-primary" : "border-md3-gray"
                              )}>
                                {customFieldValues[field.id] && <div className="w-2.5 h-2.5 bg-theme-bg rounded-sm" />}
                              </div>
                              <span className="text-sm font-bold truncate">{field.name || field.label}</span>
                            </button>
                          </div>
                        );
                      }
                      
                      if (field.type === 'select' || field.type === 'multiselect') {
                        return (
                          <div key={field.id} className="space-y-2 relative" style={{ zIndex: 50 - index }}>
                            <label className="text-xs font-bold uppercase tracking-wider text-md3-gray">{field.name || field.label}</label>
                            <ModernSelect 
                              value={customFieldValues[field.id] || (field.type === 'multiselect' ? [] : '')} 
                              onChange={val => handleCustomFieldValueChange(field.id, val)}
                              options={field.options || []}
                              multiple={field.type === 'multiselect'}
                            />
                          </div>
                        );
                      }

                      if (field.type === 'number') {
                        return (
                          <div key={field.id} className="space-y-2 relative" style={{ zIndex: 50 - index }}>
                            <label className="text-xs font-bold uppercase tracking-wider text-md3-gray">
                              {field.name || field.label} {field.unit && `(${field.unit})`}
                            </label>
                            <input 
                              type="number" 
                              value={customFieldValues[field.id] ?? ''} 
                              onChange={e => handleCustomFieldValueChange(field.id, e.target.value ? parseFloat(e.target.value) : undefined)}
                              className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-text outline-none focus:border-md3-primary focus:ring-1 focus:ring-md3-primary/20 transition-all shadow-inner"
                            />
                          </div>
                        );
                      }

                      if (field.type === 'text') {
                        return (
                          <div key={field.id} className="space-y-2 relative" style={{ zIndex: 50 - index }}>
                            <label className="text-xs font-bold uppercase tracking-wider text-md3-gray">{field.name || field.label}</label>
                            <input 
                              type="text" 
                              value={customFieldValues[field.id] || ''} 
                              onChange={e => handleCustomFieldValueChange(field.id, e.target.value)}
                              className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-text outline-none focus:border-md3-primary focus:ring-1 focus:ring-md3-primary/20 transition-all shadow-inner"
                            />
                          </div>
                        );
                      }

                      if (field.type === 'rating') {
                        return (
                          <div key={field.id} className="space-y-2 relative" style={{ zIndex: 50 - index }}>
                            <label className="text-xs font-bold uppercase tracking-wider text-md3-gray flex justify-between">
                              <span>{field.name || field.label}</span>
                              <span className="text-theme-text">{customFieldValues[field.id] || 3}/5</span>
                            </label>
                            <input 
                              type="range" min="1" max="5" step="1"
                              value={customFieldValues[field.id] || 3} 
                              onChange={e => handleCustomFieldValueChange(field.id, parseInt(e.target.value))}
                              className="w-full accent-cyan-500"
                            />
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                ) : (
                  <div className="text-sm font-medium text-md3-gray py-4 text-center">
                    Tato látka nemá definované žádné vlastní atributy. Lze je přidat v editaci látky.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Advanced Settings (Application/Stomach) Modern layout */}
      <section className="mt-4 flex flex-col gap-3 opacity-90">
        <div>
          <span className="text-[10px] text-md3-gray uppercase font-black mb-1.5 block tracking-widest pl-1">Aplikace</span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'oral', label: 'Oral', icon: Pill },
              { id: 'sublingual', label: 'Subling', icon: Droplet },
              { id: 'insufflated', label: 'Sniff', icon: Wind },
              { id: 'inhaled', label: 'Inhale', icon: Flame }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setRoute(r.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap active:scale-95 shadow-sm border",
                  route === r.id 
                    ? "bg-md3-primary/20 text-md3-primary border-md3-primary/30" 
                    : "bg-theme-card/60 backdrop-blur-md text-md3-gray border-theme-border hover:bg-theme-subtle"
                )}
              >
                <r.icon size={14} />
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {route === 'oral' && (
          <div>
            <span className="text-[10px] text-md3-gray uppercase font-black mb-1.5 block tracking-widest pl-1">Žaludek</span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'empty', label: '0%' },
                { id: 'light', label: '25%' },
                { id: 'full', label: '75%' },
                { id: 'heavy', label: '100%' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setStomach(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap active:scale-95 shadow-sm border",
                    stomach === s.id 
                      ? "bg-md3-orange/20 text-md3-orange border-md3-orange/30" 
                      : "bg-theme-card/60 backdrop-blur-md text-md3-gray border-theme-border hover:bg-theme-subtle"
                  )}
                >
                  <Utensils size={14} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Modern Submit Row (Notes + Button) */}
      <div className="mt-8 flex flex-col gap-4 relative z-10 pb-8 px-1">
        <div className="relative group w-full">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Fingerprint size={16} className="text-md3-gray group-focus-within:text-[var(--theme-text)] transition-colors" />
          </div>
          <input 
            type="text" 
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="PŘIPOJTE POZNÁMKU"
            className="w-full bg-theme-bg/60 backdrop-blur-3xl border border-theme-border/30 rounded-2xl py-4 pl-[3.25rem] pr-5 text-[11px] font-bold tracking-[0.2em] outline-none focus:border-md3-primary/50 focus:ring-2 focus:ring-md3-primary/20 transition-all text-theme-text shadow-sm placeholder:text-theme-border/50 uppercase"
          />
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isLoggedState}
          className={cn(
            "w-full py-5 rounded-[1.2rem] font-black text-[13px] md:text-sm flex items-center justify-center gap-3 shadow-[0_4px_25px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-all uppercase tracking-[0.3em] relative overflow-hidden group border",
            isLoggedState ? "bg-emerald-500 scale-[1.02] border-emerald-400" : "border-white/20"
          )}
          style={isLoggedState ? { color: '#000' } : { backgroundColor: currentStrain?.color || selectedSubstance?.color || '#fff', color: '#000', boxShadow: `0 10px 40px ${currentStrain?.color || selectedSubstance?.color || '#fff'}66` }}
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          {isLoggedState ? (
            <>
               <Check size={20} strokeWidth={3} className="relative z-10" />
               <span className="relative z-10 drop-shadow-sm">Log Přidán</span>
            </>
          ) : (
            <>
               <Fingerprint size={20} strokeWidth={2.5} className="relative z-10 drop-shadow-sm group-hover:scale-110 transition-transform" />
               <span className="relative z-10 drop-shadow-sm">Zapsat Interakci</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
