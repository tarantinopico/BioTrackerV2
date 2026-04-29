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
  Utensils,
  Terminal
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
      <section className="relative z-10 pt-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1 snap-x snap-mandatory">
          {substances.map(s => {
            const Icon = getSubstanceIcon(s);
            const isActive = selectedSubstanceId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSubstanceId(s.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-[1.2rem] border transition-all whitespace-nowrap justify-center relative overflow-hidden shadow-sm shrink-0 snap-start active:scale-[0.98] group",
                  isActive 
                    ? "border-transparent text-white font-black scale-[1.02]" 
                    : "bg-theme-bg/60 backdrop-blur-md text-white/50 border-white/5 hover:bg-theme-bg hover:text-white/80"
                )}
                style={isActive ? { backgroundColor: s.color || '#00d1ff', boxShadow: `0 8px 25px ${s.color}66` } : {}}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeSubstanceGlow"
                    className="absolute inset-0 bg-white/30 blur-2xl pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
                <Icon size={isActive ? 22 : 18} strokeWidth={isActive ? 3 : 2.5} className="relative z-10 transition-all duration-300 group-hover:scale-110" />
                <span className={cn("font-bold tracking-widest relative z-10 leading-none drop-shadow-sm transition-all", isActive ? "text-[13px]" : "text-[11px]")}>{s.name}</span>
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
                     "px-3 py-2 rounded-[1rem] border text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest shrink-0 shadow-sm",
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
          className="mt-4 mb-1 bg-theme-subtle border-2 rounded-[1.5rem] p-4 shadow-lg relative overflow-hidden flex flex-col gap-2"
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
      <section className="relative z-10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] group mt-2 w-full rounded-[2.5rem]">
        {/* Soft abstract background glares inside an overflow-hidden wrapper */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/60 backdrop-blur-[40px] rounded-[2.5rem] border border-white/20 overflow-hidden pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">
          <div 
            className="absolute inset-0 opacity-[0.25] pointer-events-none transition-opacity duration-1000 group-hover:opacity-[0.4]" 
            style={{ background: `radial-gradient(circle at top center, ${currentStrain?.color || selectedSubstance?.color || '#00d1ff'}88, transparent 75%)` }}
          />
          <div 
            className="absolute -bottom-20 -left-20 w-64 h-64 blur-[80px] opacity-[0.3] rounded-full pointer-events-none transition-all duration-1000 group-hover:opacity-[0.4]" 
            style={{ backgroundColor: currentStrain?.color || selectedSubstance?.color || '#00d1ff' }}
          />
        </div>
        
        <div className="relative p-5 sm:p-6 flex flex-col items-center w-full">
          {selectedSubstance?.stash !== undefined && (
            <div className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest text-md3-gray bg-black/40 px-2.5 py-1 rounded-xl border border-white/10 shadow-xl backdrop-blur-xl">
              Zásoba: <span style={{ color: currentStrain?.color || selectedSubstance?.color || '#00d1ff' }} className="font-black drop-shadow-md ml-1">{formatAmount(selectedSubstance.stash, selectedSubstance.unit, 1)}</span>
            </div>
          )}

          {/* Amount Input and Adjustments */}
          <div className="flex items-center justify-between w-full max-w-[400px] relative z-10 mt-5 mb-1 sm:mb-2 gap-2">
            <div className="absolute inset-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            
            {/* Big Minus Button */}
            <button 
              onClick={() => handleAdjust(-1)}
              className="w-20 sm:w-24 h-16 sm:h-20 rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-center bg-black/40 border border-white/10 text-white/80 active:scale-95 hover:scale-105 transition-all hover:bg-black/80 shadow-[0_10px_30px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-3xl z-10 hover:border-white/30 hover:text-white relative touch-manipulation group/btn shrink-0"
            >
              <div className="absolute inset-[-15px]" /> {/* Expanded touch target */}
              <Minus size={28} strokeWidth={3} className="drop-shadow-md group-hover/btn:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all" />
            </button>
            
            <div className="flex flex-col items-center relative z-20 flex-1 min-w-0 pr-6">
              <div className="absolute inset-0 bg-theme-bg/20 blur-3xl rounded-full scale-[2] pointer-events-none" />
              <div className="flex items-baseline justify-center group-hover:scale-105 transition-transform duration-500 relative">
                <input
                  type="number"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="text-[4rem] sm:text-[5.5rem] font-black tracking-tighter tabular-nums bg-transparent border-none outline-none text-center leading-none py-0 placeholder:text-white/10 transition-all focus:scale-110"
                  placeholder="0"
                  style={{ 
                    width: `${Math.max(1, String(amount || '').length) + 0.6}ch`,
                    color: currentStrain?.color || selectedSubstance?.color || '#fff', 
                    filter: `drop-shadow(0 10px 25px ${currentStrain?.color || selectedSubstance?.color}77)` 
                  }}
                />
                <span className="font-bold text-lg sm:text-xl uppercase tracking-widest opacity-90 absolute right-0 translate-x-[110%] bottom-3 sm:bottom-4 pl-1" style={{ color: currentStrain?.color || selectedSubstance?.color || '#fff' }}>
                  {selectedSubstance?.unit || 'g'}
                </span>
              </div>
            </div>
            
            {/* Big Plus Button */}
            <button 
              onClick={() => handleAdjust(1)}
              className="w-20 sm:w-24 h-16 sm:h-20 rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-center text-black active:scale-95 hover:scale-105 transition-all z-10 shadow-[0_15px_35px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.6)] relative touch-manipulation overflow-hidden shrink-0"
              style={{ 
                backgroundColor: currentStrain?.color || selectedSubstance?.color || '#fff', 
                border: `1px solid ${currentStrain?.color || selectedSubstance?.color}aa`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
              <div className="absolute inset-[-15px]" /> {/* Expanded touch target */}
              <Plus size={28} strokeWidth={3.5} className="relative z-10 opacity-90 mix-blend-plus-darker" />
            </button>
          </div>

          {/* Optional Active Ingredients Display */}
          {(() => {
            const actives = currentStrain?.activeIngredients || selectedSubstance?.activeIngredients || [];
            if (actives.length > 0) {
              return (
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 max-w-full relative z-10">
                  {actives.map((ai, idx) => (
                    <div key={idx} className="text-[8px] font-bold uppercase tracking-widest text-md3-gray bg-black/40 px-2 py-0.5 rounded-md border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-md">
                      <span style={{ color: currentStrain?.color || selectedSubstance?.color || '#00d1ff' }} className="font-black drop-shadow-sm">
                        {formatAmount(((amount * ai.percentage) / 100), selectedSubstance?.unit || 'g', 2)}
                      </span> {ai.name}
                    </div>
                  ))}
                </div>
              );
            } else if (selectedSubstance?.activeIngredientName && (currentStrain?.activeIngredientPercentage || selectedSubstance?.activeIngredientPercentage)) {
              return (
                <div className="text-[8px] font-bold uppercase tracking-widest text-md3-gray mt-2 bg-black/40 px-2 py-0.5 rounded-md border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-md relative z-10">
                   ÚČ. LÁTKA: <span style={{ color: currentStrain?.color || selectedSubstance?.color || '#00d1ff' }} className="font-black drop-shadow-sm">{formatAmount(((amount * (currentStrain?.activeIngredientPercentage || selectedSubstance?.activeIngredientPercentage || 0)) / 100), selectedSubstance?.unit || 'g', 2)}</span> {selectedSubstance.activeIngredientName}
                </div>
              );
            }
            return null;
          })()}

          {/* Dose Guidance Display */}
          {(() => {
            const dosageInfo = currentStrain?.dosage || selectedSubstance?.dosage;
            if (dosageInfo && amount > 0) {
              let label = '';
              let color = '';
              let bg = '';
              let border = '';
              
              if (amount < dosageInfo.threshold) {
                label = 'Mikrodávka';
                color = '#A78BFA'; // Purple
                bg = 'rgba(167, 139, 250, 0.1)';
                border = 'rgba(167, 139, 250, 0.2)';
              } else if (amount < dosageInfo.light) {
                label = 'Prahová / Jemná';
                color = '#6EE7B7'; // Green
                bg = 'rgba(110, 231, 183, 0.1)';
                border = 'rgba(110, 231, 183, 0.2)';
              } else if (amount <= dosageInfo.common) {
                label = 'Lehká dávka';
                color = '#38bdf8'; // Blue
                bg = 'rgba(56, 189, 248, 0.1)';
                border = 'rgba(56, 189, 248, 0.2)';
              } else if (amount <= dosageInfo.strong) {
                label = 'Běžná dávka';
                color = '#FDE047'; // Yellow
                bg = 'rgba(253, 224, 71, 0.05)';
                border = 'rgba(253, 224, 71, 0.2)';
              } else if (amount <= dosageInfo.heavy) {
                label = 'Silná dávka';
                color = '#F97316'; // Orange
                bg = 'rgba(249, 115, 22, 0.1)';
                border = 'rgba(249, 115, 22, 0.2)';
              } else {
                label = 'Velmi silná / Extrémní';
                color = '#EF4444'; // Red
                bg = 'rgba(239, 68, 68, 0.15)';
                border = 'rgba(239, 68, 68, 0.3)';
              }

              return (
                <div className="mt-3 relative z-10 w-full flex justify-center">
                  <div 
                    className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-xl border shadow-sm backdrop-blur-md transition-all flex items-center justify-center"
                    style={{ 
                      color: color, 
                      backgroundColor: bg, 
                      borderColor: border,
                      boxShadow: `0 4px 15px ${color}15, inset 0 1px 1px ${color}33`
                    }}
                  >
                    <span className="drop-shadow-sm">{label}</span>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Quick Amount Presets */}
          <div className="flex gap-2 mt-3 sm:mt-4 relative z-10 overflow-x-auto no-scrollbar w-full pt-1 pb-1 justify-center px-1">
            {[1, 5, 10, 25, 50].map(val => (
              <button
                key={val}
                onClick={() => setAmount(val)}
                className="flex-1 min-w-[55px] sm:min-w-[70px] py-3 rounded-[1rem] sm:rounded-[1.2rem] border text-[12px] font-black transition-all uppercase tracking-widest active:scale-95 shadow-[0_5px_15px_rgba(0,0,0,0.2)] flex items-center justify-center auto-cols-auto font-sans backdrop-blur-xl"
                style={{ 
                  borderColor: amount === val ? (currentStrain?.color || selectedSubstance?.color || '#fff') : 'rgba(255,255,255,0.1)', 
                  color: amount === val ? '#fff' : 'rgba(255,255,255,0.6)',
                  backgroundColor: amount === val ? (currentStrain?.color || selectedSubstance?.color || '#555') : 'rgba(0,0,0,0.5)',
                  boxShadow: amount === val ? `0 8px 25px ${(currentStrain?.color || selectedSubstance?.color || '#fff')}66, inset 0 1px 1px rgba(255,255,255,0.3)` : 'inset 0 1px 1px rgba(255,255,255,0.05)'
                }}
              >
                +{val}<span className="text-[9px] opacity-70 ml-0.5 mt-1">{selectedSubstance?.unit}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary Controls: Time & Advanced Options Toggle  */}
      <section className="flex flex-wrap items-center justify-between w-full mt-2 gap-2 relative z-10 px-1">
        <div className="flex gap-2 overflow-x-auto no-scrollbar items-center pb-1">
            {timeOptions.slice(0, 4).map(opt => (
              <button
                key={opt.value}
                onClick={() => setTimeOffset(opt.value)}
                className={cn(
                  "px-5 py-3 rounded-[1.2rem] text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-[0.1em] shrink-0 border",
                  timeOffset === opt.value
                    ? "text-black drop-shadow-sm scale-[1.02] shadow-xl" 
                    : "bg-black/40 backdrop-blur-3xl text-white/60 border-white/5 hover:bg-black/60 hover:text-white"
                )}
                style={timeOffset === opt.value ? { backgroundColor: currentStrain?.color || selectedSubstance?.color || '#00d1ff', borderColor: 'transparent', boxShadow: `0 8px 25px ${currentStrain?.color || selectedSubstance?.color || '#00d1ff'}66` } : {}}
              >
                {opt.label}
              </button>
            ))}
        </div>
        
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          type="button"
          className={cn(
            "px-6 py-3 rounded-[1.2rem] border transition-all shrink-0 flex items-center justify-center gap-2 text-[10px] uppercase font-black tracking-widest shadow-lg",
            showAdvanced ? "bg-black/80 border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]" : "bg-black/40 backdrop-blur-3xl border-white/5 text-white/60 hover:text-white hover:bg-black/60"
          )}
        >
          <Fingerprint size={16} className={cn("transition-transform", showAdvanced && "scale-110")} />
          Pokročilé
        </button>
      </section>

      {/* Advanced Details Toggle (Content only) */}
      <section className="relative z-40 w-full mt-1">
        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full relative z-50 overflow-hidden"
            >
                <div className="p-4 rounded-[1.5rem] bg-black/40 backdrop-blur-3xl border border-white/10 space-y-4 shadow-2xl relative mb-2 flex flex-col gap-1">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                  
                  {/* Route & Stomach Options Abstract Design */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-theme-border/20">
                      <span className="text-[9px] text-md3-gray px-1 tracking-[0.2em] font-black uppercase flex items-center gap-2">
                        <Activity size={10} className="text-cyan-500" />
                        Aplikace & Kinetika
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'oral', label: 'Oral', icon: Pill },
                        { id: 'sublingual', label: 'Subling', icon: Droplet },
                        { id: 'insufflated', label: 'Sniff', icon: Wind },
                        { id: 'inhaled', label: 'Inhale', icon: Flame }
                      ].map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRoute(r.id)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl text-[9px] font-black uppercase transition-all shadow-sm border",
                            route === r.id 
                              ? "bg-gradient-to-b from-cyan-500/20 to-transparent text-cyan-400 border-cyan-500/30 scale-100" 
                              : "bg-theme-card/30 text-md3-gray border-theme-border/30 hover:bg-theme-card/60 scale-95 opacity-70 hover:opacity-100"
                          )}
                        >
                          <r.icon size={16} className={route === r.id ? "drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" : ""} />
                          <span className="tracking-widest">{r.label}</span>
                        </button>
                      ))}
                    </div>

                    <AnimatePresence>
                      {route === 'oral' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 flex items-center gap-3">
                            <Utensils size={14} className="text-md3-gray/50 shrink-0" />
                            <div className="flex bg-theme-bg/80 border border-theme-border/30 rounded-2xl overflow-hidden shadow-inner p-1 w-full relative">
                              {/* Background indicator */}
                              <div 
                                className="absolute top-1 bottom-1 w-[calc(25%-4px)] bg-orange-500/20 border border-orange-500/30 rounded-xl transition-transform duration-300 ease-out"
                                style={{ transform: `translateX(${['empty', 'light', 'full', 'heavy'].indexOf(stomach) * 100}%)` }}
                              />
                              {[
                                { id: 'empty', label: '0%' },
                                { id: 'light', label: '25%' },
                                { id: 'full', label: '75%' },
                                { id: 'heavy', label: '100%' }
                              ].map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setStomach(s.id)}
                                  className={cn(
                                    "flex-1 py-2 text-[10px] font-black transition-all relative z-10",
                                    stomach === s.id ? "text-orange-400 shadow-sm" : "text-md3-gray hover:text-white"
                                  )}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Custom Fields (abstract styling) */}
                  {selectedSubstance?.customFields && selectedSubstance.customFields.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-theme-border/20">
                      <span className="text-[9px] text-md3-gray px-1 tracking-[0.2em] font-black uppercase flex items-center gap-2 mb-4">
                        <Terminal size={10} className="text-purple-500" />
                        Metadatové Atributy
                      </span>
                      {selectedSubstance.customFields.map((field, index) => {
                        if (field.type === 'boolean') {
                          return (
                            <div key={field.id} className="relative group" style={{ zIndex: 50 - index }}>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); handleCustomFieldValueChange(field.id, !customFieldValues[field.id]); }}
                                className={cn(
                                  "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                                  customFieldValues[field.id] 
                                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]" 
                                    : "bg-theme-bg/60 border-theme-border/30 text-md3-gray hover:border-theme-border/80"
                                )}
                              >
                                <span className="text-[10px] font-black uppercase tracking-widest">{field.name || field.label}</span>
                                <div className={cn(
                                  "w-10 h-5 rounded-full p-0.5 border flex items-center transition-all duration-300",
                                  customFieldValues[field.id] ? "bg-purple-500 border-purple-400" : "bg-theme-card border-theme-border"
                                )}>
                                  <div className={cn(
                                    "w-4 h-4 rounded-full bg-white transition-transform duration-300",
                                    customFieldValues[field.id] ? "translate-x-5 shadow-[0_0_10px_rgba(255,255,255,0.8)]" : "translate-x-0"
                                  )} />
                                </div>
                              </button>
                            </div>
                          );
                        }
                        
                        if (field.type === 'select' || field.type === 'multiselect') {
                          return (
                            <div key={field.id} className="relative group" style={{ zIndex: 50 - index }}>
                              <label className="text-[8px] font-black px-2 uppercase tracking-[0.2em] text-md3-gray/60 group-focus-within:text-purple-400 transition-colors absolute -top-2 left-3 bg-[var(--theme-bg)] rounded-full px-2 py-0.5 border border-theme-border/30">{field.name || field.label}</label>
                              <div className="pt-2">
                                <ModernSelect 
                                  value={customFieldValues[field.id] || (field.type === 'multiselect' ? [] : '')} 
                                  onChange={val => handleCustomFieldValueChange(field.id, val)}
                                  options={field.options || []}
                                  multiple={field.type === 'multiselect'}
                                />
                              </div>
                            </div>
                          );
                        }

                        if (field.type === 'number') {
                          return (
                            <div key={field.id} className="relative group" style={{ zIndex: 50 - index }}>
                              <label className="text-[8px] font-black px-2 uppercase tracking-[0.2em] text-md3-gray/60 group-focus-within:text-purple-400 transition-colors absolute -top-2 left-3 bg-[var(--theme-bg)] rounded-full px-2 py-0.5 border border-theme-border/30">
                                {field.name || field.label} {field.unit && `[${field.unit}]`}
                              </label>
                              <div className="pt-2">
                                <input 
                                  type="number" 
                                  value={customFieldValues[field.id] ?? ''} 
                                  onChange={e => handleCustomFieldValueChange(field.id, e.target.value ? parseFloat(e.target.value) : undefined)}
                                  className="w-full bg-theme-bg/60 border border-theme-border/30 rounded-2xl px-5 py-4 text-[11px] font-black tracking-widest text-white outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-all shadow-inner"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          );
                        }

                        if (field.type === 'text') {
                          return (
                            <div key={field.id} className="relative group" style={{ zIndex: 50 - index }}>
                              <label className="text-[8px] font-black px-2 uppercase tracking-[0.2em] text-md3-gray/60 group-focus-within:text-purple-400 transition-colors absolute -top-2 left-3 bg-[var(--theme-bg)] rounded-full px-2 py-0.5 border border-theme-border/30">{field.name || field.label}</label>
                              <div className="pt-2">
                                <input 
                                  type="text" 
                                  value={customFieldValues[field.id] || ''} 
                                  onChange={e => handleCustomFieldValueChange(field.id, e.target.value)}
                                  className="w-full bg-theme-bg/60 border border-theme-border/30 rounded-2xl px-5 py-4 text-[11px] font-black tracking-widest text-white outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-all shadow-inner uppercase"
                                  placeholder="TEXT..."
                                />
                              </div>
                            </div>
                          );
                        }

                        if (field.type === 'rating') {
                          return (
                            <div key={field.id} className="relative group bg-theme-bg/60 border border-theme-border/30 p-4 rounded-2xl" style={{ zIndex: 50 - index }}>
                              <div className="flex justify-between items-center mb-4">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-md3-gray">
                                  {field.name || field.label}
                                </label>
                                <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20">{customFieldValues[field.id] || 3}/5</span>
                              </div>
                              <input 
                                type="range" min="1" max="5" step="1"
                                value={customFieldValues[field.id] || 3} 
                                onChange={e => handleCustomFieldValueChange(field.id, parseInt(e.target.value))}
                                className="w-full h-1.5 bg-theme-border/30 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer shadow-sm"
                              />
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Modern Submit Row (Notes + Button) */}
      <div className="mt-2 flex flex-col gap-2 relative z-10 pb-0 px-1">
        <div className="relative group w-full">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Fingerprint size={16} className="text-md3-gray/60 group-focus-within:text-white transition-colors" />
          </div>
          <input 
            type="text" 
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="PŘIPOJTE POZNÁMKU..."
            className="w-full bg-black/40 backdrop-blur-3xl border border-white/5 rounded-[1.2rem] py-3.5 pl-12 pr-4 text-[10px] font-black tracking-[0.2em] outline-none focus:border-white/20 focus:bg-black/60 transition-all text-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] placeholder:text-white/20 uppercase"
          />
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isLoggedState}
          className={cn(
            "w-full py-4 rounded-[1.2rem] font-black text-[13px] md:text-sm flex items-center justify-center gap-3 shadow-[0_4px_30px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.4)] active:scale-[0.98] transition-all uppercase tracking-[0.3em] relative overflow-hidden group border",
            isLoggedState ? "bg-emerald-500 scale-[1.02] border-emerald-400" : "border-white/20 hover:scale-[1.02]"
          )}
          style={isLoggedState ? { color: '#000' } : { backgroundColor: currentStrain?.color || selectedSubstance?.color || '#fff', color: '#000', boxShadow: `0 10px 40px ${currentStrain?.color || selectedSubstance?.color || '#fff'}66, inset 0 2px 4px rgba(255,255,255,0.5)` }}
        >
          <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          {isLoggedState ? (
            <>
               <Check size={20} strokeWidth={3} className="relative z-10" />
               <span className="relative z-10 drop-shadow-sm">Log Přidán</span>
            </>
          ) : (
            <>
               <Fingerprint size={20} strokeWidth={2.5} className="relative z-10 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
               <span className="relative z-10 drop-shadow-sm">Zapsat Interakci</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
