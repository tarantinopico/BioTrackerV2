import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  Leaf, 
  Cigarette, 
  Coffee, 
  Activity, 
  Clock,
  ChevronRight,
  ChevronDown,
  Fingerprint,
  AlertTriangle
} from 'lucide-react';
import { Substance, Dose, UserSettings } from '../types';
import { cn } from '../lib/utils';
import { ROUTE_MULTIPLIERS, STOMACH_MULTIPLIERS } from '../constants';
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
  const [timeOffset, setTimeOffset] = useState(0);
  const [route, setRoute] = useState('oral');
  const [stomach, setStomach] = useState('full');
  const [note, setNote] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [warnings, setWarnings] = useState<{ title: string; message: string; severity: 'high' | 'low' }[]>([]);

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
    setAmount(prev => Math.max(0, parseFloat((prev + (direction * step)).toFixed(2))));
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
    setTimeOffset(0);
    setNote('');
    setAmount(selectedSubstance.step || 1); // Reset amount to step after logging
  };

  const getSubstanceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('kratom')) return Leaf;
    if (n.includes('nikotin') || n.includes('nicotine')) return Cigarette;
    if (n.includes('kofein') || n.includes('caffeine') || n.includes('káva')) return Coffee;
    return Activity;
  };

  const timeOptions = [
    { label: 'Now', value: 0 },
    { label: '15m', value: 15 },
    { label: '30m', value: 30 },
    { label: '1h', value: 60 },
    { label: '2h', value: 120 },
  ];

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-android-accent/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Substance Selection - Modern Grid */}
      <section className="relative z-10">
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Select Substance</span>
          <span className="text-[10px] font-black text-android-accent uppercase tracking-wider">{substances.length} Available</span>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
          {substances.map(s => {
            const Icon = getSubstanceIcon(s.name);
            const isActive = selectedSubstanceId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSubstanceId(s.id)}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-[2rem] border transition-all min-w-[100px] justify-center relative overflow-hidden group android-button",
                  isActive 
                    ? "border-android-accent/30 bg-android-accent/10 shadow-[0_10px_30px_rgba(0,242,255,0.15)]" 
                    : "bg-android-surface border-android-border text-android-text-muted hover:border-android-accent/20"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                  isActive ? "bg-android-accent text-android-bg" : "bg-android-bg text-android-text-muted"
                )}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn("text-[10px] font-black uppercase tracking-widest", isActive ? "text-android-accent" : "text-android-text-muted")}>
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Amount Control - Hero Unit */}
      <section className="android-card p-8 flex flex-col items-center relative overflow-hidden z-10 glass-accent border-white/5">
        <div className="flex items-center justify-between w-full max-w-[280px] relative z-10">
          <button 
            onClick={() => handleAdjust(-1)}
            className="w-14 h-14 rounded-3xl flex items-center justify-center bg-android-surface border border-android-border text-android-text active:scale-90 transition-all hover:border-android-accent/30"
          >
            <Minus size={24} strokeWidth={2.5} />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black tracking-tighter tabular-nums text-android-text" style={{ textShadow: `0 0 30px ${selectedSubstance?.color}44` }}>
                {amount}
              </span>
              <span className="font-black text-xs uppercase tracking-[0.2em] text-android-text-muted leading-none">
                {selectedSubstance?.unit || 'g'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => handleAdjust(1)}
            className="w-14 h-14 rounded-3xl flex items-center justify-center bg-android-accent text-android-bg active:scale-90 transition-all shadow-[0_10px_20px_rgba(0,242,255,0.3)]"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Quick Amount Presets */}
        <div className="flex gap-2 mt-8 relative z-10 overflow-x-auto no-scrollbar max-w-full px-2">
          {[1, 5, 10, 25, 50, 100].map(val => (
            <button
              key={val}
              onClick={() => setAmount(val)}
              className={cn(
                "px-4 py-2 rounded-xl border text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest android-button",
                amount === val ? "bg-android-accent/10 border-android-accent text-android-accent" : "bg-android-bg border-android-border text-android-text-muted hover:text-android-text"
              )}
            >
              {val} {selectedSubstance?.unit}
            </button>
          ))}
        </div>
      </section>

      {/* Advanced Settings Grid */}
      <section className="grid grid-cols-2 gap-4 relative z-10">
        <div className="android-card p-4 bg-android-surface/40">
          <div className="text-[9px] font-black text-android-text-muted uppercase tracking-[0.2em] mb-2">Route</div>
          <select 
            value={route} 
            onChange={(e) => setRoute(e.target.value)}
            className="w-full bg-transparent text-sm font-black text-android-text outline-none uppercase tracking-wider cursor-pointer"
          >
            <option value="oral">Oral</option>
            <option value="sublingual">Sublingual</option>
            <option value="insufflated">Sniff</option>
            <option value="inhaled">Inhale</option>
          </select>
        </div>
        <div className="android-card p-4 bg-android-surface/40">
          <div className="text-[9px] font-black text-android-text-muted uppercase tracking-[0.2em] mb-2">Timing</div>
          <select 
            value={timeOffset} 
            onChange={(e) => setTimeOffset(Number(e.target.value))}
            className="w-full bg-transparent text-sm font-black text-android-text outline-none uppercase tracking-wider cursor-pointer"
          >
            {timeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Note Input & Submit */}
      <div className="space-y-4 relative z-10">
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Fingerprint size={16} className="text-android-text-muted" />
          </div>
          <input 
            type="text" 
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add biometric note..."
            className="android-input w-full pl-12 h-14 font-bold text-sm"
          />
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full h-16 rounded-3xl bg-android-accent text-android-bg font-black text-lg flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(0,242,255,0.25)] android-button uppercase tracking-[0.2em]"
        >
          <Activity size={20} strokeWidth={3} />
          <span>Record Data</span>
        </button>
      </div>

      {/* Warning Center */}
      {warnings.length > 0 && (
        <section className="space-y-3 relative z-10 pt-4">
          <div className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Warnings</div>
          {warnings.map((w, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "p-4 rounded-3xl border flex items-start gap-3",
                w.severity === 'high' ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"
              )}
            >
              <div className={cn("p-2 rounded-xl", w.severity === 'high' ? "bg-red-500/20" : "bg-amber-500/20")}>
                <AlertTriangle size={16} className={w.severity === 'high' ? "text-red-500" : "text-amber-500"} />
              </div>
              <div>
                <div className={cn("text-[10px] font-black uppercase tracking-wider mb-1", w.severity === 'high' ? "text-red-500" : "text-amber-500")}>
                  {w.title}
                </div>
                <div className="text-xs font-bold text-android-text/70 leading-relaxed">{w.message}</div>
              </div>
            </motion.div>
          ))}
        </section>
      )}
    </div>
  );
}
