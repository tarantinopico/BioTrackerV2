import { Plus, Trash2, Database, Package, Activity, Search, X, Star, Filter, ChevronRight, FlaskConical } from 'lucide-react';
import { Substance, SubstanceCategory } from '../types';
import { cn } from '../lib/utils';
import { DEFAULT_SUBSTANCES } from '../constants';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SubstancesProps {
  substances: Substance[];
  onEditSubstance: (id: string | 'new', template?: Substance) => void;
  onDeleteSubstance: (id: string) => void;
  onAddPreset: (preset: Substance) => void;
  onToggleFavorite: (id: string) => void;
}

export default function Substances({ substances, onEditSubstance, onDeleteSubstance, onAddPreset, onToggleFavorite }: SubstancesProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SubstanceCategory | 'all'>('all');

  const categories: (SubstanceCategory | 'all')[] = [
    'all', 'stimulant', 'depressant', 'psychedelic', 'opioid', 'dissociative', 'cannabinoid', 'nootropic', 'supplement'
  ];

  const filteredSubstances = useMemo(() => {
    return substances.filter(sub => {
      const matchesSearch = !search.trim() || 
        sub.name.toLowerCase().includes(search.toLowerCase()) || 
        sub.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || sub.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [substances, search, selectedCategory]);

  const presets = DEFAULT_SUBSTANCES.filter(ds => !substances.some(s => s.id === ds.id));

  return (
    <div className="space-y-8 relative pb-20">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] bg-android-accent/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[15%] left-[-5%] w-[45%] h-[45%] bg-purple-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Search & Stats */}
      <div className="space-y-6 relative z-10 px-2">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={18} className="text-android-text-muted group-focus-within:text-android-accent transition-colors" />
          </div>
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Molecular Database..."
            className="android-input w-full pl-12 h-16 text-sm font-bold shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-white/5"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-4 flex items-center text-android-text-muted hover:text-android-text transition-colors active:scale-90"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-2 px-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-5 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap android-button",
                selectedCategory === cat 
                  ? "bg-android-accent border-transparent text-android-bg shadow-[0_0_20px_rgba(0,242,255,0.3)]" 
                  : "bg-android-surface border-android-border text-android-text-muted hover:text-android-text"
              )}
            >
              {cat === 'all' ? 'All Units' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Database Section */}
      <section className="android-card p-6 relative z-10 glass-accent border-white/5 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-android-bg border border-android-border shadow-inner">
              <Database className="w-6 h-6 text-android-accent" />
            </div>
            <div>
              <h2 className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.3em] mb-1">Local Archive</h2>
              <div className="text-2xl font-black text-android-text tracking-tighter">Molecular Units</div>
            </div>
          </div>
          <button 
            onClick={() => onEditSubstance('new')}
            className="w-14 h-14 rounded-3xl bg-android-accent text-android-bg flex items-center justify-center shadow-[0_10px_25px_rgba(0,242,255,0.3)] android-button"
          >
            <Plus className="w-8 h-8" strokeWidth={3} />
          </button>
        </div>
        
        <div className="space-y-4">
          {filteredSubstances.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-android-border rounded-[2rem] bg-android-bg/30">
              <div className="mb-4 flex justify-center opacity-20">
                <FlaskConical size={48} className="text-android-text-muted" />
              </div>
              <span className="text-[11px] text-android-text-muted font-black uppercase tracking-[0.3em]">No Compounds Found</span>
            </div>
          ) : (
            filteredSubstances.map(substance => (
              <motion.div 
                layout
                key={substance.id} 
                onClick={() => onEditSubstance(substance.id)}
                className="android-card bg-android-surface/50 border-android-border/50 rounded-3xl p-5 flex items-center gap-5 cursor-pointer hover:border-android-accent/30 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full opacity-50" style={{ backgroundColor: substance.color || '#00f2ff' }} />
                
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-android-bg border border-android-border shadow-inner group-hover:scale-110 transition-transform">
                  <Activity size={24} style={{ color: substance.color || '#00f2ff' }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-black text-android-text truncate text-base tracking-tight">{substance.name}</h3>
                    <span className="text-[8px] uppercase font-black tracking-[0.2em] px-2 py-0.5 rounded-lg bg-android-bg text-android-text-muted border border-android-border">
                      {substance.category}
                    </span>
                  </div>
                  <div className="text-[10px] text-android-text-muted font-black uppercase tracking-[0.1em] opacity-80">
                    Half-life: <span className="text-android-text">{substance.halfLife}h</span> • Peak: <span className="text-android-text">{substance.tmax}h</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(substance.id);
                    }}
                    className={cn(
                      "p-2.5 rounded-xl transition-all android-button",
                      substance.isFavorite ? "text-amber-400 bg-amber-400/10" : "text-android-text-muted hover:text-amber-400"
                    )}
                  >
                    <Star size={18} fill={substance.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSubstance(substance.id);
                    }}
                    className="p-2.5 rounded-xl hover:bg-red-500/10 text-android-text-muted hover:text-red-500 transition-all android-button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <ChevronRight size={20} className="text-android-text-muted group-hover:text-android-accent transition-all group-hover:translate-x-1" />
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Global Presets */}
      {presets.length > 0 && (
        <section className="android-card p-6 bg-android-surface/40 relative z-10 border-white/5">
          <h2 className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10">
              <Package size={14} className="text-purple-400" />
            </div>
            Global Templates
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {presets.map(preset => (
              <button 
                key={preset.id}
                onClick={() => onAddPreset(preset)}
                className="p-4 rounded-3xl bg-android-surface border border-android-border hover:border-android-accent/20 text-left flex items-center gap-3.5 transition-all android-button group shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-android-bg flex items-center justify-center border border-android-border shadow-inner group-hover:scale-110 transition-transform">
                  <Activity size={16} style={{ color: preset.color || '#00f2ff' }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-android-text truncate tracking-tight">{preset.name}</div>
                  <div className="text-[9px] text-android-text-muted font-bold uppercase tracking-wider">{preset.category}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
