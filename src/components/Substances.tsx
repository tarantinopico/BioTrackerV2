import { FlaskConical, Plus, Trash2, Database, Package, Activity, ChevronRight, Search, X, Star } from 'lucide-react';
import { Substance, SubstanceCategory } from '../types';
import { cn } from '../lib/utils';
import { DEFAULT_SUBSTANCES } from '../constants';
import { useState, useMemo } from 'react';

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
    <div className="space-y-6 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-500/10 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] left-[-5%] w-[35%] h-[35%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Search Bar */}
      <div className="relative group z-10">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search size={14} className="text-slate-500 group-focus-within:text-cyan-primary transition-colors" />
        </div>
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Hledat látku..."
          className="w-full bg-slate-950/40 backdrop-blur-md border border-white/5 rounded-xl py-3 pl-10 pr-10 text-xs outline-none focus:border-cyan-primary/50 focus:ring-1 focus:ring-cyan-primary/20 transition-all text-slate-200"
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 relative z-10">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
              selectedCategory === cat 
                ? "bg-cyan-primary border-transparent text-dark-bg shadow-[0_0_10px_rgba(0,209,255,0.2)]" 
                : "bg-slate-950/40 backdrop-blur-md border-white/5 text-slate-500 hover:text-slate-300"
            )}
          >
            {cat === 'all' ? 'Vše' : cat}
          </button>
        ))}
      </div>

      {/* My Substances */}
      <section className="bg-slate-950/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-primary/10">
              <Database className="w-4 h-4 text-cyan-primary" />
            </div>
            <div>
              <h2 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Databáze</h2>
              <div className="text-base font-black text-white leading-tight">Moje látky</div>
            </div>
          </div>
          <button 
            onClick={() => onEditSubstance('new')}
            className="w-8 h-8 rounded-lg bg-cyan-primary flex items-center justify-center shadow-[0_0_10px_rgba(0,209,255,0.2)] active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 text-dark-bg" />
          </button>
        </div>
        
        <div className="space-y-2">
          {filteredSubstances.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
              <span className="text-[10px] text-slate-600 font-medium uppercase tracking-widest">Žádné látky</span>
            </div>
          ) : (
            filteredSubstances.map(substance => (
              <div 
                key={substance.id} 
                onClick={() => onEditSubstance(substance.id)}
                className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.05] transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: substance.color || '#00d1ff' }} />
                
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/5">
                  <Activity size={16} style={{ color: substance.color || '#00d1ff' }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-bold text-slate-200 truncate text-xs">{substance.name}</h3>
                    <span className={cn(
                      "text-[6px] uppercase font-black tracking-widest px-1 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5"
                    )}>
                      {substance.category}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    T₁/₂: {substance.halfLife}h • Tmax: {substance.tmax}h
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(substance.id);
                    }}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      substance.isFavorite ? "text-amber-400 bg-amber-400/10" : "text-slate-600 hover:text-amber-400 hover:bg-amber-400/5"
                    )}
                  >
                    <Star size={12} fill={substance.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSubstance(substance.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                  <ChevronRight size={14} className="text-slate-700 group-hover:text-cyan-primary transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Presets */}
      {presets.length > 0 && (
        <section className="bg-slate-950/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 relative z-10">
          <h2 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Package size={10} className="text-purple-400" /> Přednastavené látky
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {presets.map(preset => (
              <button 
                key={preset.id}
                onClick={() => onAddPreset(preset)}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-left flex items-center gap-2.5 transition-all active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                  <Activity size={12} style={{ color: preset.color || '#00d1ff' }} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-bold text-slate-200 truncate">{preset.name}</div>
                  <div className="text-[7px] text-slate-500 font-bold uppercase">{preset.category}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
