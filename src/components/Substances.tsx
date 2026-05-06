import { 
  FlaskConical, Plus, Trash2, Database, Package, Activity, ChevronRight, Search, X, Star,
  Pill, Syringe, Leaf, Coffee, Cigarette, Wine, Beer, Droplet, TestTube, Beaker, Flame, Wind, Brain, Heart
} from 'lucide-react';
import { Substance, SubstanceCategory, Dose, UserSettings } from '../types';
import { cn, formatAmount } from '../lib/utils';
import { DEFAULT_SUBSTANCES } from '../constants';
import { useState, useMemo } from 'react';
import SubstanceInfo from './SubstanceInfo';

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
  doses: Dose[];
  settings: UserSettings;
  onEditSubstance: (id: string | 'new', template?: Substance) => void;
  onDeleteSubstance: (id: string) => void;
  onAddPreset: (preset: Substance) => void;
  onToggleFavorite: (id: string) => void;
  onRestockSubstance: (id: string) => void;
}

export default function Substances({ substances, doses, settings, onEditSubstance, onDeleteSubstance, onAddPreset, onToggleFavorite, onRestockSubstance }: SubstancesProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SubstanceCategory | 'all'>('all');
  const [selectedSubstanceId, setSelectedSubstanceId] = useState<string | null>(null);

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

  if (selectedSubstanceId) {
    const substance = substances.find(s => s.id === selectedSubstanceId);
    if (!substance) {
      setSelectedSubstanceId(null);
      return null;
    }
    return (
      <SubstanceInfo 
        substance={substance}
        doses={doses}
        settings={settings}
        onBack={() => setSelectedSubstanceId(null)}
        onEdit={() => {
          setSelectedSubstanceId(null);
          onEditSubstance(substance.id);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 relative pb-32">
      {/* Decorative Background Elements */}

      <div className="flex items-center justify-between px-2 pt-2 relative z-10">
        <div>
          <h2 className="text-[20px] font-black text-theme-text flex items-center gap-1.5 leading-none tracking-tight">
            Laboratoř
          </h2>
          <p className="text-[10px] text-theme-text/50 mt-1.5 font-bold uppercase tracking-wider leading-none flex items-center gap-1.5">
            <Database size={10} className="text-cyan-400" /> Databáze látek
          </p>
        </div>
        <button 
          onClick={() => onEditSubstance('new')}
          className="w-10 h-10 rounded-2xl bg-cyan-500 text-black flex items-center justify-center shadow-[0_2px_15px_rgba(0,209,255,0.3)] active:scale-90 transition-all backdrop-blur-md"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group z-10 px-1">
        <div className="absolute inset-0 bg-cyan-500/10 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-theme-text/40 group-focus-within:text-cyan-400 transition-colors" />
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Vyhledat instanci..."
          className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-theme-glass backdrop-blur-3xl border border-theme-border text-xs font-bold outline-none focus:border-cyan-500/30 transition-all text-theme-text shadow-[0_8px_30px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)] placeholder:text-theme-text/30 tracking-widest"
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-4 flex items-center text-theme-text/40 hover:text-theme-text p-1"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1.5 pt-0.5 px-1 relative z-10">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md active:scale-95 border",
              selectedCategory === cat 
                ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(0,209,255,0.4)]" 
                : "bg-theme-glass border-theme-border text-theme-text/50 hover:text-theme-text hover:bg-theme-card"
            )}
          >
            {categoryTranslations[cat] || cat}
          </button>
        ))}
      </div>

      {/* My Substances */}
      <section className="bg-theme-glass backdrop-blur-[40px] rounded-[2rem] p-4 border border-theme-border relative z-10 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col mx-1">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-50 pointer-events-none rounded-[2rem]" />
        
        <div className="relative z-10">
        {(() => {
          const totalValue = substances.reduce((sum, s) => sum + ((s.stash || 0) * (s.price || 0)), 0);
          if (totalValue > 0) {
            return (
              <div className="mb-4 p-4 rounded-2xl bg-theme-glass border border-theme-border flex items-center justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.05)]">
                <span className="text-[10px] font-black text-theme-text/50 uppercase tracking-[0.2em]">Aktivum</span>
                <span className="text-xl font-black tracking-tight text-theme-text drop-shadow-sm">{totalValue.toFixed(0)} <span className="text-xs text-theme-text/50">{settings.currency || 'Kč'}</span></span>
              </div>
            );
          }
          return null;
        })()}
        </div>
        
        <div className="space-y-3 relative z-10">
          {filteredSubstances.length === 0 ? (
            <div className="py-12 text-center bg-theme-glass backdrop-blur-2xl rounded-[2rem] border border-theme-border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.05)] relative z-10 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-theme-card rounded-2xl flex items-center justify-center mb-4 border border-theme-border shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] relative overflow-hidden">
                 <FlaskConical size={28} className="text-theme-text/60 relative z-10" />
                 <div className="absolute inset-0 bg-gradient-to-br from-transparent to-cyan-500/20" />
              </div>
              <span className="text-sm text-theme-text font-black uppercase tracking-wider">Laboratoř je prázdná</span>
              <p className="text-xs text-theme-text/50 font-semibold mt-2 max-w-[200px] leading-relaxed">
                Přidejte svou první látku nebo využijte knihovnu šablon.
              </p>
            </div>
          ) : (
            filteredSubstances.map(substance => {
              const IconComponent = getIconComponent(substance.icon);
              return (
              <div 
                key={substance.id} 
                onClick={() => setSelectedSubstanceId(substance.id)}
                className="bg-theme-glass backdrop-blur-xl border border-theme-border rounded-[1.5rem] p-4 flex items-center gap-4 cursor-pointer hover:bg-theme-card transition-all group relative overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 blur-[40px] opacity-20 rounded-full pointer-events-none transition-all group-hover:opacity-40" style={{ backgroundColor: substance.color || '#00d1ff' }} />
                
                <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center border border-theme-border shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] shrink-0 relative z-10 group-hover:scale-110 transition-transform bg-theme-card">
                  <IconComponent size={24} style={{ color: substance.color || '#00d1ff' }} strokeWidth={2.5} className="drop-shadow-sm" />
                </div>
                
                <div className="flex-1 min-w-0 py-0.5 relative z-10">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-theme-text truncate text-[13px] tracking-tight drop-shadow-sm">{substance.name}</h3>
                    <span className={cn(
                      "text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-md border border-theme-border text-theme-text/60 bg-theme-glass shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.05)]"
                    )}>
                      {substance.category}
                    </span>
                    {substance.stash !== undefined && (
                      <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-md border border-theme-border text-theme-text/60 ml-auto bg-theme-glass shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.05)]">
                        Zásoba: <span style={{ color: substance.color }} className="font-black drop-shadow-sm">{formatAmount(substance.stash, substance.unit, 1)}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-theme-text/50 font-semibold uppercase tracking-wider mb-1 opacity-80 flex items-center gap-1.5 flex-wrap">
                    T₁/₂: <span className="text-theme-text/90 font-black">{substance.halfLife}h</span> <span className="opacity-50">•</span> Tmax: <span className="text-theme-text/90 font-black">{substance.tmax}h</span>
                    {substance.tags && substance.tags.length > 0 && <span className="opacity-50">•</span>}
                    {substance.tags && substance.tags.length > 0 && (
                        substance.tags.map(tag => (
                          <span key={tag} className="text-[8px] uppercase font-black tracking-widest text-theme-text/50">
                            {tag}
                          </span>
                        ))
                    )}
                  </div>
                  {substance.description && (
                    <div className="text-[10px] text-theme-text/40 mt-1 line-clamp-1 italic font-medium">
                      {substance.description}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 relative z-10 shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(substance.id);
                    }}
                    className={cn(
                      "p-2 rounded-xl transition-all active:scale-90 border backdrop-blur-md shadow-sm",
                      substance.isFavorite 
                        ? "text-amber-400 bg-amber-400/20 border-amber-400/30 shadow-[0_2px_10px_rgba(251,191,36,0.2)]" 
                        : "text-md3-gray hover:text-amber-400 bg-theme-bg/60 border-theme-border/30 hover:bg-theme-bg/80"
                    )}
                  >
                    <Star size={16} fill={substance.isFavorite ? "currentColor" : "none"} strokeWidth={2.5} />
                  </button>
                  {substance.packageSize !== undefined && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestockSubstance(substance.id);
                      }}
                      className="p-2 rounded-xl hover:bg-md3-primary/20 text-md3-gray hover:text-md3-primary transition-all active:scale-90 bg-theme-bg/60 border border-theme-border/30 shadow-sm backdrop-blur-md"
                      title={`Doplnit zásobu (+${substance.packageSize}${substance.unit})`}
                    >
                      <Package size={16} strokeWidth={2.5}/>
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSubstance(substance.id);
                    }}
                    className="p-2 rounded-xl hover:bg-red-500/20 text-md3-gray hover:text-red-500 transition-all active:scale-90 bg-theme-bg/60 border border-theme-border/30 shadow-sm backdrop-blur-md"
                  >
                    <Trash2 size={16} strokeWidth={2.5}/>
                  </button>
                  <ChevronRight size={18} className="text-md3-gray/60 group-hover:text-md3-primary transition-all group-hover:translate-x-1 ml-1" strokeWidth={3} />
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
