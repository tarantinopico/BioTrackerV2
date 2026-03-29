import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  Leaf, 
  Cigarette, 
  Coffee, 
  Activity, 
  AlertTriangle, 
  Fingerprint,
  Clock
} from 'lucide-react';
import { Substance, Dose, UserSettings } from '../types';
import { cn } from '../lib/utils';
import { ROUTE_MULTIPLIERS, STOMACH_MULTIPLIERS } from '../constants';
import { getMetabolismMultiplier } from '../services/pharmacology';
import { motion, AnimatePresence } from 'motion/react';

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

  const selectedSubstance = useMemo(() => 
    substances.find(s => s.id === selectedSubstanceId), 
  [substances, selectedSubstanceId]);

  useEffect(() => {
    if (selectedSubstance) {
      setAmount(selectedSubstance.step || 1);
      setSelectedStrainId('');
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

    const timestamp = new Date(Date.now() - timeOffset * 60000).toISOString();

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
        tmaxMultiplier
      };

      onAddDose(dose);
      // Reset offset and note but keep substance
      setTimeOffset(0);
      setNote('');
    };

  const getSubstanceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('kratom')) return Leaf;
    if (n.includes('nikotin') || n.includes('nicotine')) return Cigarette;
    if (n.includes('kofein') || n.includes('caffeine') || n.includes('káva')) return Coffee;
    return Activity;
  };

  const warnings = useMemo(() => {
    const list = [];
    if (!selectedSubstance) return list;

    // Too soon warning
    const lastDose = doses.find(d => d.substanceId === selectedSubstanceId);
    if (lastDose) {
      const minInterval = 2; // hours, could be substance specific
      const elapsed = (Date.now() - new Date(lastDose.timestamp).getTime()) / 3600000;
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
      const elapsed = (Date.now() - new Date(d.timestamp).getTime()) / 3600000;
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

    return list;
  }, [selectedSubstanceId, doses, selectedSubstance, substances]);

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
    <div className="space-y-4 pb-6 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[15%] left-[-5%] w-[35%] h-[35%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[25%] right-[-5%] w-[30%] h-[30%] bg-purple-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Substance Selection */}
      <section className="relative z-10">
        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 ml-1">Zvolte látku</h3>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          {substances.map(s => {
            const Icon = getSubstanceIcon(s.name);
            const isActive = selectedSubstanceId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSubstanceId(s.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all whitespace-nowrap min-w-[100px] justify-center relative overflow-hidden",
                  isActive 
                    ? "border-transparent text-dark-bg font-black" 
                    : "bg-slate-950/40 backdrop-blur-md border-white/5 text-slate-400"
                )}
                style={isActive ? { backgroundColor: s.color || '#00d1ff', boxShadow: `0 0 15px ${s.color}30` } : {}}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs uppercase tracking-widest">{s.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Strain Selection */}
      {selectedSubstance?.strains && selectedSubstance.strains.length > 0 && (
        <section className="relative z-10">
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 ml-1 flex items-center gap-1">
            <Activity size={10} /> Druh / Varianta
          </h3>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {selectedSubstance.strains.map(strain => {
              const isActive = selectedStrainId === strain.name;
              return (
                <button
                  key={strain.name}
                  onClick={() => setSelectedStrainId(strain.name)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all whitespace-nowrap uppercase tracking-widest",
                    isActive 
                      ? "bg-slate-800 border-cyan-primary text-cyan-primary" 
                      : "bg-slate-950/40 backdrop-blur-md border-white/5 text-slate-500"
                  )}
                  style={isActive ? { borderColor: selectedSubstance.color, color: selectedSubstance.color } : {}}
                >
                  {strain.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Warnings */}
      <AnimatePresence>
        {warnings.length > 0 && (
          <div className="space-y-2 relative z-10">
            {warnings.map((w, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-4 rounded-2xl border backdrop-blur-md flex items-start gap-3",
                  w.severity === 'high' ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"
                )}
              >
                <AlertTriangle className={cn("shrink-0 mt-0.5", w.severity === 'high' ? "text-red-500" : "text-amber-500")} size={18} />
                <div className="text-sm">
                  <span className={cn("font-bold", w.severity === 'high' ? "text-red-500" : "text-amber-500")}>{w.title}: </span>
                  <span className="text-slate-300">{w.message}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Amount Control */}
      <section className="bg-slate-950/40 backdrop-blur-md rounded-3xl p-6 border border-white/5 flex flex-col items-center relative overflow-hidden z-10">
        <div 
          className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" 
          style={{ background: `linear-gradient(to bottom, ${selectedSubstance?.color || '#00d1ff'}, transparent)` }}
        />
        
        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 relative z-10">Množství dávky</h3>
        
        <div className="flex items-center justify-between w-full max-w-[240px] relative z-10">
          <button 
            onClick={() => handleAdjust(-1)}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/5 text-slate-400 active:scale-90 transition-transform"
          >
            <Minus size={20} />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black tracking-tighter" style={{ color: selectedSubstance?.color || '#00d1ff', textShadow: `0 0 15px ${selectedSubstance?.color}30` }}>{amount}</span>
              <span className="font-black text-xs uppercase" style={{ color: selectedSubstance?.color || '#00d1ff' }}>{selectedSubstance?.unit || 'g'}</span>
            </div>
          </div>
          
          <button 
            onClick={() => handleAdjust(1)}
            className="w-12 h-12 rounded-full flex items-center justify-center text-dark-bg active:scale-90 transition-transform"
            style={{ backgroundColor: selectedSubstance?.color || '#00d1ff', boxShadow: `0 0 15px ${selectedSubstance?.color}30` }}
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Quick Amount Presets */}
        <div className="flex gap-1.5 mt-6 relative z-10 overflow-x-auto no-scrollbar max-w-full px-2">
          {[1, 5, 10, 25, 50, 100].map(val => (
            <button
              key={val}
              onClick={() => setAmount(val)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-400 hover:text-white transition-all whitespace-nowrap uppercase tracking-widest"
              style={{ borderColor: amount === val ? selectedSubstance?.color : undefined }}
            >
              {val} {selectedSubstance?.unit}
            </button>
          ))}
        </div>

        <div className="flex justify-between w-full mt-6 relative z-10">
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border"
            style={{ backgroundColor: `${selectedSubstance?.color}10`, borderColor: `${selectedSubstance?.color}20` }}
          >
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: selectedSubstance?.color }} />
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: selectedSubstance?.color }}>Střední</span>
          </div>
          
          <div 
            className="px-2.5 py-1 rounded-lg border"
            style={{ backgroundColor: `${selectedSubstance?.color}10`, borderColor: `${selectedSubstance?.color}20` }}
          >
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: selectedSubstance?.color }}>{price.toFixed(1)} Kč</span>
          </div>
        </div>
      </section>

      {/* Time Selection */}
      <section className="relative z-10">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {timeOptions.map(opt => {
            const isActive = timeOffset === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTimeOffset(opt.value)}
                className={cn(
                  "flex-1 px-3 py-3 rounded-xl border text-[11px] font-black transition-all whitespace-nowrap min-w-[70px] uppercase tracking-widest",
                  isActive 
                    ? "text-dark-bg font-black border-transparent" 
                    : "bg-slate-950/40 backdrop-blur-md border-white/5 text-slate-500"
                )}
                style={isActive ? { backgroundColor: selectedSubstance?.color || '#00d1ff' } : {}}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Notes (Compact) */}
      <section className="relative z-10">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Fingerprint size={14} className="text-slate-500 group-focus-within:text-cyan-primary transition-colors" />
          </div>
          <input 
            type="text" 
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Poznámka k dávce..."
            className="w-full bg-slate-950/40 backdrop-blur-md border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs outline-none focus:border-cyan-primary/50 focus:ring-1 focus:ring-cyan-primary/20 transition-all text-slate-200"
          />
        </div>
      </section>

      {/* Submit Button */}
      <button 
        onClick={handleSubmit}
        className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-all uppercase tracking-[0.2em] relative z-10"
        style={{ backgroundColor: selectedSubstance?.color || '#fff', color: selectedSubstance?.color ? '#000' : '#000' }}
      >
        <Fingerprint size={20} />
        Zapsat
      </button>

      {/* Advanced Settings (Compact) */}
      <section className="pt-4 border-t border-white/5 relative z-10">
        <div className="flex items-center justify-between px-2">
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase font-bold">Aplikace</span>
              <select 
                value={route} 
                onChange={(e) => setRoute(e.target.value)}
                className="bg-transparent text-xs text-slate-300 outline-none"
              >
                <option value="oral">Oral</option>
                <option value="sublingual">Sublingual</option>
                <option value="insufflated">Sniff</option>
                <option value="inhaled">Inhale</option>
              </select>
            </div>
            {route === 'oral' && (
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-500 uppercase font-bold">Žaludek</span>
                <select 
                  value={stomach} 
                  onChange={(e) => setStomach(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 outline-none"
                >
                  <option value="empty">Empty</option>
                  <option value="light">Light</option>
                  <option value="full">Full</option>
                </select>
              </div>
            )}
          </div>
          <button className="p-2 text-slate-500 hover:text-slate-300">
            <Clock size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
