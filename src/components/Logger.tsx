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
    <div className="space-y-3 pb-6 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[15%] left-[-5%] w-[35%] h-[35%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[25%] right-[-5%] w-[30%] h-[30%] bg-purple-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Substance Selection - More Compact */}
      <section className="relative z-10">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
          {substances.map(s => {
            const Icon = getSubstanceIcon(s.name);
            const isActive = selectedSubstanceId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSubstanceId(s.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all whitespace-nowrap min-w-[100px] justify-center relative overflow-hidden group shadow-lg",
                  isActive 
                    ? "border-transparent text-dark-bg font-black" 
                    : "bg-slate-950/40 backdrop-blur-xl border-white/10 text-slate-400 hover:bg-white/[0.05] hover:border-white/20"
                )}
                style={isActive ? { backgroundColor: s.color || '#00d1ff', boxShadow: `0 0 20px ${s.color}44` } : {}}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeSubstanceGlow"
                    className="absolute inset-0 bg-white/20 blur-xl rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
                <Icon size={14} strokeWidth={isActive ? 3 : 2} className="relative z-10" />
                <span className="text-[10px] uppercase tracking-[0.2em] relative z-10">{s.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Strain Selection - More Compact */}
      {selectedSubstance?.strains && selectedSubstance.strains.length > 0 && (
        <section className="relative z-10">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {selectedSubstance.strains.map(strain => {
              const isActive = selectedStrainId === strain.name;
              return (
                <button
                  key={strain.name}
                  onClick={() => setSelectedStrainId(strain.name)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg border text-[9px] font-bold transition-all whitespace-nowrap uppercase tracking-widest",
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

      {/* Amount Control - More Compact */}
      <section className="bg-slate-950/40 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/10 flex flex-col items-center relative overflow-hidden z-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] group">
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20" 
          style={{ background: `radial-gradient(circle at center, ${selectedSubstance?.color || '#00d1ff'}, transparent 70%)` }}
        />
        
        <div className="flex items-center justify-between w-full max-w-[240px] relative z-10">
          <button 
            onClick={() => handleAdjust(-1)}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-slate-400 active:scale-90 transition-all hover:bg-white/10 hover:border-white/20"
          >
            <Minus size={20} />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black tracking-tighter tabular-nums" style={{ color: selectedSubstance?.color || '#00d1ff', filter: `drop-shadow(0 0 15px ${selectedSubstance?.color}66)` }}>{amount}</span>
              <span className="font-black text-[10px] uppercase tracking-widest opacity-70" style={{ color: selectedSubstance?.color || '#00d1ff' }}>{selectedSubstance?.unit || 'g'}</span>
            </div>
          </div>
          
          <button 
            onClick={() => handleAdjust(1)}
            className="w-12 h-12 rounded-full flex items-center justify-center text-dark-bg active:scale-90 transition-all hover:scale-110 shadow-lg"
            style={{ backgroundColor: selectedSubstance?.color || '#00d1ff', boxShadow: `0 0 20px ${selectedSubstance?.color}66` }}
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Quick Amount Presets - More Compact */}
        <div className="flex gap-1 mt-4 relative z-10 overflow-x-auto no-scrollbar max-w-full px-1">
          {[1, 5, 10, 25, 50, 100].map(val => (
            <button
              key={val}
              onClick={() => setAmount(val)}
              className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[8px] font-black text-slate-400 hover:text-white transition-all whitespace-nowrap uppercase tracking-widest"
              style={{ borderColor: amount === val ? selectedSubstance?.color : undefined }}
            >
              {val} {selectedSubstance?.unit}
            </button>
          ))}
        </div>
      </section>

      {/* Time Selection - More Compact */}
      <section className="relative z-10">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {timeOptions.map(opt => {
            const isActive = timeOffset === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTimeOffset(opt.value)}
                className={cn(
                  "flex-1 px-2 py-2 rounded-xl border text-[10px] font-black transition-all whitespace-nowrap min-w-[60px] uppercase tracking-widest",
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

      {/* Notes & Submit - More Compact */}
      <div className="space-y-2 relative z-10">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Fingerprint size={12} className="text-slate-500 group-focus-within:text-cyan-primary transition-colors" />
          </div>
          <input 
            type="text" 
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Poznámka..."
            className="w-full bg-slate-950/40 backdrop-blur-md border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-[10px] outline-none focus:border-cyan-primary/50 focus:ring-1 focus:ring-cyan-primary/20 transition-all text-slate-200"
          />
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.3)] active:scale-[0.98] transition-all uppercase tracking-[0.3em] relative z-10 overflow-hidden group"
          style={{ backgroundColor: selectedSubstance?.color || '#fff', color: '#000' }}
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          <Fingerprint size={20} className="relative z-10" />
          <span className="relative z-10">Zapsat</span>
        </button>
      </div>

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
