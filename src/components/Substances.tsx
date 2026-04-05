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
}

export default function Substances({ substances, onEditSubstance, onDeleteSubstance, onAddPreset, onToggleFavorite }: SubstancesProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SubstanceCategory | 'all'>('all');

  const categories: (SubstanceCategory | 'all')[] = [
    'all', 'stimulant', 'depressant', 'psychedelic', 'dissociative', 'empathogen', 'opioid', 'cannabinoid', 'nootropic', 'supplement', 'vitamin', 'steroid', 'peptide', 'herb', 'deliriant', 'medication', 'other'
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
                ? "bg-cyan-primary border-transparent text-black shadow-[0_0_15px_rgba(0,209,255,0.4)] scale-105" 
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
            <div className="p-3 rounded-2xl bg-cyan-primary/10 shadow-[0_0_15px_rgba(0,209,255,0.1)]">
              <Database className="w-6 h-6 text-cyan-primary" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-md3-gray uppercase tracking-wider">Databáze</h2>
              <div className="text-2xl font-bold text-theme-text leading-tight tracking-tight">Moje látky</div>
            </div>
          </div>
          <button 
            onClick={() => onEditSubstance('new')}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,209,255,0.3)] active:scale-90 transition-all hover:scale-105"
          >
            <Plus className="w-6 h-6 text-black" strokeWidth={3} />
          </button>
        </div>
        
        <div className="space-y-3">
          {filteredSubstances.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-theme-border rounded-2xl bg-theme-subtle">
              <span className="text-sm text-md3-gray font-bold uppercase tracking-wider">Žádné látky</span>
            </div>
          ) : (
            filteredSubstances.map(substance => {
              const IconComponent = getIconComponent(substance.icon);
              return (
              <div 
                key={substance.id} 
                onClick={() => onEditSubstance(substance.id)}
                className="bg-theme-subtle border border-theme-border rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-theme-subtle-hover transition-all group relative overflow-hidden shadow-sm"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full shadow-[2px_0_10px_rgba(0,0,0,0.2)]" style={{ backgroundColor: substance.color || '#00d1ff' }} />
                
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-theme-subtle border border-theme-border shadow-inner">
                  <IconComponent size={24} style={{ color: substance.color || '#00d1ff' }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-theme-text truncate text-base tracking-tight">{substance.name}</h3>
                    <span className={cn(
                      "text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-theme-subtle text-md3-gray border border-theme-border"
                    )}>
                      {substance.category}
                    </span>
                  </div>
                  <div className="text-xs text-md3-gray font-medium uppercase tracking-wider">
                    T₁/₂: <span className="text-theme-text font-bold">{substance.halfLife}h</span> • Tmax: <span className="text-theme-text font-bold">{substance.tmax}h</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(substance.id);
                    }}
                    className={cn(
                      "p-2 rounded-xl transition-all active:scale-90",
                      substance.isFavorite ? "text-amber-400 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.2)]" : "text-md3-gray hover:text-amber-400 hover:bg-amber-400/5"
                    )}
                  >
                    <Star size={16} fill={substance.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSubstance(substance.id);
                    }}
                    className="p-2 rounded-xl hover:bg-red-500/10 text-md3-gray hover:text-red-500 transition-all active:scale-90"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronRight size={18} className="text-md3-gray group-hover:text-cyan-primary transition-all group-hover:translate-x-1" />
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
