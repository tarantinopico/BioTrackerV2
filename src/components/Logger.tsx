import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  AlertTriangle, 
  Fingerprint,
  Clock,
  Activity,
  ChevronDown
} from 'lucide-react';
import { Substance, Dose, UserSettings } from '../types';
import { cn } from '../lib/utils';
import { ROUTE_MULTIPLIERS, STOMACH_MULTIPLIERS } from '../constants';
import { getMetabolismMultiplier } from '../services/pharmacology';
import { motion, AnimatePresence } from 'motion/react';
import { getIconComponent } from './Substances';

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
  const [purpose, setPurpose] = useState<'medical' | 'recreational' | 'functional' | 'spiritual' | 'other'>('recreational');
  const [environment, setEnvironment] = useState<'home' | 'social' | 'work' | 'nature' | 'other'>('home');
  const [mood, setMood] = useState(3);
  const [rating, setRating] = useState(3);
  const [heartRate, setHeartRate] = useState<number | undefined>();
  const [bloodPressure, setBloodPressure] = useState('');

  const selectedSubstance = useMemo(() => 
    substances.find(s => s.id === selectedSubstanceId), 
  [substances, selectedSubstanceId]);

  useEffect(() => {
    if (selectedSubstance) {
      setAmount(selectedSubstance.step || 1);
      setSelectedStrainId('');
      if (selectedSubstance.defaultRoute) {
        setRoute(selectedSubstance.defaultRoute);
      }
    }
  }, [selectedSubstanceId, selectedSubstance]);

  const handleAdjust = (direction: number) => {
    const step = selectedSubstance?.step || 1;
    setAmount(prev => Math.max(0, prev + (direction * step)));
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
        ...(showAdvanced && {
          purpose,
          environment,
          mood,
          rating,
          heartRate,
          bloodPressure: bloodPressure.trim() || undefined
        })
      };

      onAddDose(dose);
      // Reset offset and note but keep substance
      setTimeOffset(0);
      setNote('');
      setHeartRate(undefined);
      setBloodPressure('');
      setMood(3);
    };

  const getSubstanceIcon = (substance: Substance | undefined) => {
    return getIconComponent(substance?.icon);
  };

  const warnings = useMemo(() => {
    const list = [];
    if (!selectedSubstance) return list;

    // Too soon warning
    const lastDose = doses.find(d => d.substanceId === selectedSubstanceId);
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
          message: `Dnešní dávka (${totalToday.toFixed(1)} ${selectedSubstance.unit}) překračuje nastavený limit ${selectedSubstance.dailyLimit} ${selectedSubstance.unit}.`,
          severity: 'high'
        });
      } else if (totalToday > selectedSubstance.dailyLimit * 0.8) {
        list.push({
          type: 'limit',
          title: 'Blížíte se dennímu limitu',
          message: `Dnešní dávka (${totalToday.toFixed(1)} ${selectedSubstance.unit}) se blíží limitu ${selectedSubstance.dailyLimit} ${selectedSubstance.unit}.`,
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
          message: `Požadované množství (${amount} ${selectedSubstance.unit}) překračuje aktuální zásobu (${selectedSubstance.stash.toFixed(1)} ${selectedSubstance.unit}).`,
          severity: 'high'
        });
      } else if (selectedSubstance.packageSize && selectedSubstance.stash <= selectedSubstance.packageSize * 0.1) {
        list.push({
          type: 'limit',
          title: 'Nízká zásoba',
          message: `Vaše zásoba (${selectedSubstance.stash.toFixed(1)} ${selectedSubstance.unit}) klesla pod 10% velikosti balení.`,
          severity: 'medium'
        });
      }
    }

    return list;
  }, [selectedSubstanceId, doses, selectedSubstance, substances, amount]);

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
    <div className="space-y-3 pb-6 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[15%] left-[-5%] w-[35%] h-[35%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[25%] right-[-5%] w-[30%] h-[30%] bg-purple-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Substance Selection */}
      <section className="relative z-10">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
          {substances.map(s => {
            const Icon = getSubstanceIcon(s);
            const isActive = selectedSubstanceId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSubstanceId(s.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-2xl border transition-all whitespace-nowrap min-w-[110px] justify-center relative overflow-hidden group shadow-md",
                  isActive 
                    ? "border-transparent text-black font-bold" 
                    : "bg-theme-card/40 backdrop-blur-md border-theme-border text-md3-gray hover:bg-theme-subtle hover:border-theme-border"
                )}
                style={isActive ? { backgroundColor: s.color || '#00d1ff', boxShadow: `0 0 20px ${s.color}44` } : {}}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeSubstanceGlow"
                    className="absolute inset-0 bg-theme-subtle-hover blur-xl rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
                <span className="text-sm uppercase tracking-wider relative z-10">{s.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Substance Description */}
      {selectedSubstance?.description && (
        <section className="relative z-10">
          <div className="bg-theme-subtle/50 backdrop-blur-sm border border-theme-border rounded-xl p-3 text-xs text-md3-gray leading-relaxed">
            {selectedSubstance.description}
          </div>
        </section>
      )}

      {/* Strain Selection */}
      {selectedSubstance?.strains && selectedSubstance.strains.length > 0 && (
        <section className="relative z-10">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
            {selectedSubstance.strains.map(strain => {
              const isActive = selectedStrainId === strain.name;
              const color = strain.color || selectedSubstance.color || '#00d1ff';
              return (
                <button
                  key={strain.name}
                  onClick={() => setSelectedStrainId(strain.name)}
                  className={cn(
                    "px-4 py-2 rounded-xl border text-xs font-bold transition-all whitespace-nowrap uppercase tracking-wider",
                    isActive 
                      ? "bg-theme-border border-cyan-primary text-cyan-primary" 
                      : "bg-theme-card/40 backdrop-blur-md border-theme-border text-md3-gray"
                  )}
                  style={isActive ? { borderColor: color, color: color } : {}}
                >
                  {strain.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Tags Display */}
      {selectedSubstance?.tags && selectedSubstance.tags.length > 0 && (
        <section className="relative z-10">
          <div className="flex flex-wrap gap-2">
            {selectedSubstance.tags.map(tag => (
              <span key={tag} className="px-2 py-1 rounded-lg bg-theme-subtle border border-theme-border text-[10px] font-bold text-md3-gray uppercase tracking-widest">
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Amount Control */}
      <section className="bg-theme-card/40 backdrop-blur-md rounded-[2rem] p-6 border border-theme-border flex flex-col items-center relative overflow-hidden z-10 shadow-lg group">
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20" 
          style={{ background: `radial-gradient(circle at center, ${currentStrain?.color || selectedSubstance?.color || '#00d1ff'}, transparent 70%)` }}
        />
        
        {selectedSubstance?.stash !== undefined && (
          <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest text-md3-gray bg-theme-subtle px-2 py-1 rounded-lg border border-theme-border">
            Zásoba: <span style={{ color: currentStrain?.color || selectedSubstance?.color || '#00d1ff' }}>{selectedSubstance.stash.toFixed(1)} {selectedSubstance.unit}</span>
          </div>
        )}

        <div className="flex items-center justify-between w-full max-w-[280px] relative z-10 mt-2">
          <button 
            onClick={() => handleAdjust(-1)}
            className="w-14 h-14 rounded-full flex items-center justify-center bg-theme-subtle border border-theme-border text-md3-gray active:scale-95 transition-all hover:bg-theme-subtle-hover hover:border-theme-border"
          >
            <Minus size={24} />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-black tracking-tighter tabular-nums" style={{ color: currentStrain?.color || selectedSubstance?.color || '#00d1ff', filter: `drop-shadow(0 0 15px ${currentStrain?.color || selectedSubstance?.color}66)` }}>{amount}</span>
              <span className="font-bold text-sm uppercase tracking-widest opacity-70" style={{ color: currentStrain?.color || selectedSubstance?.color || '#00d1ff' }}>{selectedSubstance?.unit || 'g'}</span>
            </div>
          </div>
          
          <button 
            onClick={() => handleAdjust(1)}
            className="w-14 h-14 rounded-full flex items-center justify-center text-black active:scale-95 transition-all hover:scale-105 shadow-lg"
            style={{ backgroundColor: currentStrain?.color || selectedSubstance?.color || '#00d1ff', boxShadow: `0 0 20px ${currentStrain?.color || selectedSubstance?.color}66` }}
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        {selectedSubstance?.activeIngredientName && (currentStrain?.activeIngredientPercentage || selectedSubstance?.activeIngredientPercentage) && (
          <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-md3-gray">
            Obsahuje cca <span style={{ color: currentStrain?.color || selectedSubstance?.color || '#00d1ff' }}>{((amount * (currentStrain?.activeIngredientPercentage || selectedSubstance?.activeIngredientPercentage || 0)) / 100).toFixed(2)}{selectedSubstance.unit}</span> {selectedSubstance.activeIngredientName}
          </div>
        )}

        {/* Quick Amount Presets */}
        <div className="flex gap-2 mt-4 relative z-10 overflow-x-auto no-scrollbar max-w-full px-1">
          {[1, 5, 10, 25, 50, 100].map(val => (
            <button
              key={val}
              onClick={() => setAmount(val)}
              className="px-3 py-1.5 rounded-xl bg-theme-subtle border border-theme-border text-xs font-bold text-md3-gray hover:text-theme-text transition-all whitespace-nowrap uppercase tracking-wider"
              style={{ borderColor: amount === val ? selectedSubstance?.color : undefined }}
            >
              {val} {selectedSubstance?.unit}
            </button>
          ))}
        </div>
      </section>

      {/* Time Selection */}
      <section className="relative z-10">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {timeOptions.map(opt => {
            const isActive = timeOffset === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTimeOffset(opt.value)}
                className={cn(
                  "flex-1 px-3 py-3 rounded-xl border text-xs font-bold transition-all whitespace-nowrap min-w-[70px] uppercase tracking-wider",
                  isActive 
                    ? "text-black font-bold border-transparent" 
                    : "bg-theme-card/40 backdrop-blur-md border-theme-border text-md3-gray"
                )}
                style={isActive ? { backgroundColor: selectedSubstance?.color || '#00d1ff' } : {}}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Advanced Details Toggle */}
      <section className="relative z-10 pt-2">
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-theme-subtle border border-theme-border text-sm font-bold text-md3-gray hover:text-theme-text transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity size={16} />
            <span>Podrobnosti (Kontext)</span>
          </div>
          <ChevronDown size={16} className={cn("transition-transform", showAdvanced && "rotate-180")} />
        </button>
        
        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 mt-2 rounded-2xl bg-theme-card/40 backdrop-blur-md border border-theme-border space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray">Účel</label>
                    <select 
                      value={purpose} 
                      onChange={e => setPurpose(e.target.value as any)}
                      className="w-full bg-theme-subtle border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text outline-none"
                    >
                      <option value="recreational">Rekreační</option>
                      <option value="functional">Funkční / Práce</option>
                      <option value="medical">Léčebný</option>
                      <option value="spiritual">Spirituální</option>
                      <option value="other">Jiné</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray">Prostředí</label>
                    <select 
                      value={environment} 
                      onChange={e => setEnvironment(e.target.value as any)}
                      className="w-full bg-theme-subtle border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text outline-none"
                    >
                      <option value="home">Doma</option>
                      <option value="social">Společnost / Párty</option>
                      <option value="work">Práce / Škola</option>
                      <option value="nature">Příroda</option>
                      <option value="other">Jiné</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray flex justify-between">
                      <span>Nálada před</span>
                      <span className="text-theme-text">{mood}/5</span>
                    </label>
                    <input 
                      type="range" min="1" max="5" step="1"
                      value={mood} onChange={e => setMood(parseInt(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray flex justify-between">
                      <span>Hodnocení</span>
                      <span className="text-theme-text">{rating}/5</span>
                    </label>
                    <input 
                      type="range" min="1" max="5" step="1"
                      value={rating} onChange={e => setRating(parseInt(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray">Tep (BPM)</label>
                    <input 
                      type="number" 
                      value={heartRate || ''}
                      onChange={e => setHeartRate(parseInt(e.target.value) || undefined)}
                      placeholder="např. 75"
                      className="w-full bg-theme-subtle border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-md3-gray">Tlak</label>
                    <input 
                      type="text" 
                      value={bloodPressure}
                      onChange={e => setBloodPressure(e.target.value)}
                      placeholder="např. 120/80"
                      className="w-full bg-theme-subtle border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text outline-none"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Notes & Submit */}
      <div className="space-y-3 relative z-10">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Fingerprint size={16} className="text-md3-gray group-focus-within:text-cyan-primary transition-colors" />
          </div>
          <input 
            type="text" 
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Poznámka..."
            className="w-full bg-theme-card/40 backdrop-blur-md border border-theme-border rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-cyan-primary/50 focus:ring-1 focus:ring-cyan-primary/20 transition-all text-theme-text"
          />
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all uppercase tracking-widest relative z-10 overflow-hidden group"
          style={{ backgroundColor: selectedSubstance?.color || '#fff', color: '#000' }}
        >
          <div className="absolute inset-0 bg-theme-subtle-hover translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          <Fingerprint size={24} className="relative z-10" />
          <span className="relative z-10">Zapsat</span>
        </button>
      </div>

      {/* Advanced Settings */}
      <section className="pt-4 border-t border-theme-border relative z-10">
        <div className="flex items-center justify-between px-2">
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-xs text-md3-gray uppercase font-bold mb-1">Aplikace</span>
              <select 
                value={route} 
                onChange={(e) => setRoute(e.target.value)}
                className="bg-transparent text-sm text-theme-text outline-none font-medium"
              >
                <option value="oral">Oral</option>
                <option value="sublingual">Sublingual</option>
                <option value="insufflated">Sniff</option>
                <option value="inhaled">Inhale</option>
              </select>
            </div>
            {route === 'oral' && (
              <div className="flex flex-col">
                <span className="text-xs text-md3-gray uppercase font-bold mb-1">Žaludek</span>
                <select 
                  value={stomach} 
                  onChange={(e) => setStomach(e.target.value)}
                  className="bg-transparent text-sm text-theme-text outline-none font-medium"
                >
                  <option value="empty">Empty</option>
                  <option value="light">Light</option>
                  <option value="full">Full</option>
                </select>
              </div>
            )}
          </div>
          <button className="p-3 rounded-full bg-theme-subtle text-md3-gray hover:text-theme-text transition-colors">
            <Clock size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}
