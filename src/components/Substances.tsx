import { 
  FlaskConical, Plus, Trash2, Database, Package, Activity, ChevronRight, Search, X, Star,
  Pill, Syringe, Leaf, Coffee, Cigarette, Wine, Beer, Droplet, TestTube, Beaker, Flame, Wind, Brain, Heart
} from 'lucide-react';
import { Substance, SubstanceCategory } from '../types';
import { cn } from '../lib/utils';
import { DEFAULT_SUBSTANCES } from '../constants';
import { useState, useMemo } from 'react';

const ICONS: Record<string, any> = {
  'pill': Pill,
  'syringe': Syringe,
  'leaf': Leaf,
  'coffee': Coffee,
  'cigarette': Cigarette,
  'wine': Wine,
  'beer': Beer,
  'droplet': Droplet,
  'test-tube': TestTube,
  'beaker': Beaker,
  'flame': Flame,
  'wind': Wind,
  'brain': Brain,
  'heart': Heart,
  'flask-conical': FlaskConical,
  'activity': Activity
};

export const getIconComponent = (iconName: string | undefined) => {
  return ICONS[iconName || 'activity'] || Activity;
};

interface SubstancesProps {
  substances: Substance[];
  onEditSubstance: (id: string | 'new', template?: Substance) => void;
  onDeleteSubstance: (id: string) => void;
  onAddPreset: (preset: Substance) => void;
  onToggleFavorite: (id: string) => void;
  onRestockSubstance: (id: string) => void;
}

export default function Substances({ substances, onEditSubstance, onDeleteSubstance, onAddPreset, onToggleFavorite, onRestockSubstance }: SubstancesProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SubstanceCategory | 'all'>('all');

  const categories: (SubstanceCategory | 'all')[] = [
    'all', 'stimulant', 'depressant', 'psychedelic', 'dissociative', 'empathogen', 'opioid', 'cannabinoid', 'nootropic', 'supplement', 'vitamin', 'steroid', 'peptide', 'herb', 'deliriant', 'medication', 'antidepressant', 'antipsychotic', 'anxiolytic', 'sedative', 'entactogen', 'other'
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

  const categoryTranslations: Record<string, string> = {
    'all': 'Vše',
    'stimulant': 'Stimulans',
    'depressant': 'Depresans',
    'psychedelic': 'Psychedelikum',
    'dissociative': 'Disociativum',
    'empathogen': 'Empatogen',
    'opioid': 'Opioid',
    'cannabinoid': 'Kanabinoid',
    'nootropic': 'Nootropikum',
    'supplement': 'Doplněk',
    'vitamin': 'Vitamín',
    'steroid': 'Steroid',
    'peptide': 'Peptid',
    'herb': 'Bylina',
    'deliriant': 'Deliriant',
    'medication': 'Lék',
    'other': 'Jiné'
  };

  return (
    <div className="space-y-6 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-500/10 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] left-[-5%] w-[35%] h-[35%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Search Bar */}
      <div className="relative group z-10">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={16} className="text-md3-gray group-focus-within:text-cyan-primary transition-colors" />
        </div>
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Hledat látku..."
          className="w-full bg-theme-subtle backdrop-blur-2xl border border-theme-border rounded-2xl py-4 pl-12 pr-12 text-sm outline-none focus:border-cyan-primary/50 focus:bg-theme-subtle-hover transition-all text-theme-text shadow-inner"
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-4 flex items-center text-md3-gray hover:text-theme-text transition-colors active:scale-90"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1 relative z-10">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap active:scale-95",
              selectedCategory === cat 
                ? "bg-md3-primary border-transparent text-theme-bg shadow-[0_0_15px_var(--md3-primary-30)] scale-105 glow-effects-enabled:shadow-[0_0_15px_var(--md3-primary-30)]" 
                : "bg-theme-subtle backdrop-blur-xl border-theme-border text-md3-gray hover:text-theme-text hover:bg-theme-subtle-hover"
            )}
          >
            {categoryTranslations[cat] || cat}
          </button>
        ))}
      </div>

      {/* My Substances */}
      <section className="bg-theme-subtle backdrop-blur-md rounded-[2rem] p-6 border border-theme-border relative z-10 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-md3-primary/10 shadow-[0_0_15px_var(--md3-primary-10)]">
              <Database className="w-6 h-6 text-md3-primary" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-md3-gray uppercase tracking-wider">Databáze</h2>
              <div className="text-2xl font-bold text-theme-text leading-tight tracking-tight">Moje látky</div>
            </div>
          </div>
          <button 
            onClick={() => onEditSubstance('new')}
            className="w-12 h-12 rounded-2xl bg-md3-primary flex items-center justify-center shadow-lg active:scale-90 transition-all hover:scale-105 hover:shadow-xl glow-effects-enabled:shadow-[0_0_20px_var(--md3-primary-20)]"
          >
            <Plus className="w-6 h-6 text-theme-bg" strokeWidth={3} />
          </button>
        </div>

        {(() => {
          const totalValue = substances.reduce((sum, s) => sum + ((s.stash || 0) * (s.price || 0)), 0);
          if (totalValue > 0) {
            return (
              <div className="mb-6 p-4 rounded-2xl bg-theme-card border border-theme-border flex items-center justify-between">
                <span className="text-sm font-bold text-md3-gray uppercase tracking-widest">Celková hodnota zásob</span>
                <span className="text-lg font-black text-theme-text">{totalValue.toFixed(0)} Kč</span>
              </div>
            );
          }
          return null;
        })()}
        
        <div className="space-y-3">
          {filteredSubstances.length === 0 ? (
            <div className="py-12 text-center bg-theme-subtle backdrop-blur-md rounded-[2rem] border border-theme-border shadow-lg relative z-10 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-theme-bg rounded-2xl flex items-center justify-center mb-4 border border-theme-border shadow-inner relative overflow-hidden">
                 <FlaskConical size={28} className="text-md3-gray relative z-10" />
                 <div className="absolute inset-0 bg-gradient-to-br from-transparent to-md3-primary/10" />
              </div>
              <span className="text-sm text-theme-text font-bold uppercase tracking-wider">Laboratoř je prázdná</span>
              <p className="text-xs text-md3-gray font-medium mt-2 max-w-[200px] leading-relaxed">
                Přidejte svou první látku nebo využijte knihovnu šablon.
              </p>
            </div>
          ) : (
            filteredSubstances.map(substance => {
              const IconComponent = getIconComponent(substance.icon);
              return (
              <div 
                key={substance.id} 
                onClick={() => onEditSubstance(substance.id)}
                className="bg-theme-subtle border border-theme-border rounded-xl p-2.5 flex items-center gap-3 cursor-pointer hover:bg-theme-subtle-hover transition-all group relative overflow-hidden shadow-sm"
              >
                <div className="absolute top-0 left-0 w-1 h-full shadow-[2px_0_10px_rgba(0,0,0,0.2)]" style={{ backgroundColor: substance.color || '#00d1ff' }} />
                
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-theme-subtle border border-theme-border shadow-inner shrink-0">
                  <IconComponent size={14} style={{ color: substance.color || '#00d1ff' }} />
                </div>
                
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-black text-theme-text truncate text-xs tracking-tight">{substance.name}</h3>
                    <span className={cn(
                      "text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded border border-theme-border text-md3-gray bg-theme-bg"
                    )}>
                      {substance.category}
                    </span>
                    {substance.stash !== undefined && (
                      <span className="text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded border border-theme-border text-md3-gray ml-auto bg-theme-bg">
                        Zásoba: <span style={{ color: substance.color }}>{substance.stash.toFixed(1)}{substance.unit}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-md3-gray font-black uppercase tracking-[0.2em] mb-1">
                    T₁/₂: <span className="text-theme-text">{substance.halfLife}h</span> • Tmax: <span className="text-theme-text">{substance.tmax}h</span>
                  </div>
                  {substance.tags && substance.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {substance.tags.map(tag => (
                        <span key={tag} className="text-[8px] uppercase font-black tracking-widest px-1 py-0.5 rounded bg-theme-bg border border-theme-border text-md3-gray">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {substance.description && (
                    <div className="text-[9px] text-md3-gray mt-1 line-clamp-1 italic font-medium">
                      {substance.description}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(substance.id);
                    }}
                    className={cn(
                      "p-1.5 rounded-lg transition-all active:scale-90",
                      substance.isFavorite ? "text-amber-400 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.2)]" : "text-md3-gray hover:text-amber-400 hover:bg-amber-400/5"
                    )}
                  >
                    <Star size={14} fill={substance.isFavorite ? "currentColor" : "none"} />
                  </button>
                  {substance.packageSize !== undefined && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestockSubstance(substance.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-md3-primary/10 text-md3-gray hover:text-md3-primary transition-all active:scale-90"
                      title={`Doplnit zásobu (+${substance.packageSize}${substance.unit})`}
                    >
                      <Package size={14} />
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSubstance(substance.id);
                    }}
                    className="p-2 rounded-xl hover:bg-red-500/10 text-md3-gray hover:text-red-500 transition-all active:scale-90"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronRight size={18} className="text-md3-gray group-hover:text-md3-primary transition-all group-hover:translate-x-1" />
                </div>
              </div>
              );
            })
          )}
        </div>
      </section>

      {/* Presets */}
      {presets.length > 0 && (
        <section className="bg-theme-card/40 backdrop-blur-md rounded-2xl p-4 border border-theme-border relative z-10">
          <h2 className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-4 flex items-center gap-2">
            <Package size={10} className="text-purple-400" /> Přednastavené látky
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {presets.map(preset => {
              const PresetIcon = getIconComponent(preset.icon);
              return (
              <button 
                key={preset.id}
                onClick={() => onAddPreset(preset)}
                className="p-3 rounded-xl bg-theme-subtle border border-theme-border hover:bg-theme-subtle text-left flex items-center gap-2.5 transition-all active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-theme-subtle flex items-center justify-center border border-theme-border">
                  <PresetIcon size={12} style={{ color: preset.color || '#00d1ff' }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-theme-text truncate">{preset.name}</div>
                  <div className="text-xs text-md3-gray font-bold uppercase">{preset.category}</div>
                </div>
              </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
