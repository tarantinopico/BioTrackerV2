import { Clock, Trash2, Calendar, Edit2, X, Check, Search, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Dose, Substance, UserSettings } from '../types';
import { cn, formatTime } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getIconComponent } from './Substances';

interface HistoryProps {
  doses: Dose[];
  substances: Substance[];
  settings: UserSettings;
  onDeleteDose: (id: string) => void;
  onEditDose: (dose: Dose) => void;
  onClearAll: () => void;
}

export default function History({ doses, substances, settings, onDeleteDose, onEditDose, onClearAll }: HistoryProps) {
  const [editingDose, setEditingDose] = useState<Dose | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubstanceId, setSelectedSubstanceId] = useState<string | 'all'>('all');

  const filteredDoses = useMemo(() => {
    return doses.filter(dose => {
      const substance = substances.find(s => s.id === dose.substanceId);
      const substanceName = substance ? substance.name : dose.substanceId;
      const matchesSearch = substanceName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            dose.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            dose.strainId?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubstance = selectedSubstanceId === 'all' || dose.substanceId === selectedSubstanceId;
      return matchesSearch && matchesSubstance;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [doses, substances, searchQuery, selectedSubstanceId]);

  const groupedDoses = filteredDoses.reduce((groups: Record<string, Dose[]>, dose) => {
    const date = new Date(dose.timestamp).toLocaleDateString('cs-CZ', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(dose);
    return groups;
  }, {});

  const handleSaveEdit = () => {
    if (editingDose) {
      onEditDose(editingDose);
      setEditingDose(null);
    }
  };

  return (
    <div className="space-y-4 relative pb-10">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 mix-blend-screen dark:mix-blend-color-dodge">
        <div className="absolute top-[30%] left-[-10%] w-[40%] h-[40%] bg-md3-primary/10 blur-[100px] rounded-full animate-blob transform-gpu will-change-transform" />
      </div>

      <div className="flex items-center justify-between px-1 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-md3-primary/10 border border-md3-primary/20">
            <Clock size={16} className="text-md3-primary" />
          </div>
          <div>
            <h2 className="text-[9px] font-black text-md3-gray uppercase tracking-[0.2em]">Kinetika v čase</h2>
            <div className="text-lg font-black text-theme-text leading-none tracking-tight mt-0.5">Historie</div>
          </div>
        </div>
        <button 
          onClick={onClearAll}
          className="px-3 py-1.5 rounded-[1rem] text-[9px] font-black text-red-500 uppercase tracking-[0.2em] hover:bg-red-500/10 transition-all active:scale-95 border border-red-500/20"
        >
          Smazat
        </button>
      </div>

      {/* Search and Filter */}
      {doses.length > 0 && (
        <div className="relative z-10 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-md3-gray" />
            <input 
              type="text" 
              placeholder="Filtrovat..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-theme-subtle border border-theme-border text-xs outline-none focus:border-md3-primary transition-all text-theme-text font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-md3-gray hover:text-theme-text"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedSubstanceId('all')}
              className={cn(
                "px-3 py-1.5 rounded-[0.85rem] text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border",
                selectedSubstanceId === 'all' 
                  ? "bg-theme-border border-md3-primary text-md3-primary" 
                  : "bg-theme-subtle border-theme-border text-md3-gray hover:text-theme-text"
              )}
            >
              Vše
            </button>
            {Array.from(new Set(doses.map(d => d.substanceId))).map(subId => {
              const substance = substances.find(s => s.id === subId) || {
                id: subId,
                name: subId,
                unit: '?',
                color: '#8e8e93',
                icon: 'pill',
                category: 'other'
              } as unknown as Substance;
              const isActive = selectedSubstanceId === subId;
              return (
                <button
                  key={subId}
                  onClick={() => setSelectedSubstanceId(subId)}
                  className={cn(
                    "px-3 py-1.5 rounded-[0.85rem] text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border",
                    isActive 
                      ? "bg-theme-border border-md3-primary text-md3-primary" 
                      : "bg-theme-subtle border-theme-border text-md3-gray hover:text-theme-text"
                  )}
                  style={isActive ? { borderColor: substance.color, color: substance.color } : {}}
                >
                  {substance.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {filteredDoses.length === 0 ? (
        <div className="p-12 text-center bg-theme-subtle backdrop-blur-md rounded-[2rem] border border-theme-border shadow-lg relative z-10 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-theme-bg rounded-2xl flex items-center justify-center mb-4 border border-theme-border shadow-inner relative overflow-hidden">
             <Clock size={28} className="text-md3-gray relative z-10" />
             <div className="absolute inset-0 bg-gradient-to-br from-transparent to-md3-primary/10" />
          </div>
          <span className="text-sm text-theme-text font-bold uppercase tracking-wider">Historie zeje prázdnotou</span>
          <p className="text-xs text-md3-gray font-medium mt-2 max-w-[200px] leading-relaxed">
            Zatím tu nic neruší vaši rovnováhu. První krok začíná u vás.
          </p>
        </div>
      ) : (
        <div className="space-y-8 relative z-10">
          {Object.entries(groupedDoses).map(([date, dayDoses]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-md3-gray" />
                  <h3 className="text-xs font-bold text-md3-gray uppercase tracking-wider">{date}</h3>
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
              </div>
              
              <div className="space-y-2">
                {(dayDoses as Dose[]).map(dose => {
                  const substance = substances.find(s => s.id === dose.substanceId) || {
                    id: dose.substanceId,
                    name: dose.substanceId,
                    unit: '?',
                    color: '#8e8e93',
                    icon: 'pill',
                    category: 'other'
                  } as unknown as Substance;
                  
                  return (
                    <div 
                      key={dose.id} 
                      className={cn(
                        "bg-theme-card/60 backdrop-blur-md border border-theme-border flex items-center justify-between group hover:bg-theme-subtle transition-all shadow-sm rounded-xl p-2.5",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        {(() => {
                          const IconComponent = getIconComponent(substance.icon);
                          const strainColor = dose.strainId ? substance.strains?.find(s => s.name === dose.strainId)?.color : undefined;
                          const color = strainColor || substance.color || '#00d1ff';
                          return (
                            <div className="bg-theme-subtle flex items-center justify-center border border-theme-border group-hover:scale-105 transition-transform shadow-inner w-8 h-8 rounded-lg shrink-0">
                              <IconComponent size={14} style={{ color }} />
                            </div>
                          );
                        })()}
                        <div className="flex flex-col">
                          <div className="font-black text-theme-text leading-none tracking-tight text-xs flex items-baseline flex-wrap gap-1">
                            {substance.name}
                            {dose.strainId && <span className="text-[9px] text-md3-gray font-black uppercase tracking-widest opacity-80">({dose.strainId})</span>}
                          </div>
                          <div className="text-md3-gray font-black text-[9px] uppercase tracking-widest mt-1 leading-none">
                            <span className="text-theme-text">{dose.amount.toFixed(1)}{substance.unit}</span> • <span>{formatTime(dose.timestamp, settings)}</span>
                            {dose.route && ` • ${dose.route}`}
                          </div>
                          {(() => {
                            const strain = dose.strainId ? substance.strains?.find(s => s.name === dose.strainId) : null;
                            const activePct = strain?.activeIngredientPercentage ?? substance.activeIngredientPercentage;
                            if (substance.activeIngredientName && activePct) {
                              return (
                                <div className="text-md3-primary font-black text-[8px] uppercase tracking-widest mt-0.5">
                                  {((dose.amount * activePct) / 100).toFixed(2)}{substance.unit} {substance.activeIngredientName}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {!settings.compactMode && dose.note && (
                            <div className="mt-1.5 text-[10px] font-medium text-md3-gray italic leading-tight border-l border-theme-border pl-2 py-0.5">
                              {dose.note}
                            </div>
                          )}
                          {!settings.compactMode && dose.customFieldValues && Object.keys(dose.customFieldValues).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {Object.entries(dose.customFieldValues).map(([fieldId, value]) => {
                                const field = substance.customFields?.find(f => f.id === fieldId);
                                if (!field || value === false || value === '' || value === undefined) return null;
                                
                                let displayValue = value;
                                if (field.type === 'boolean') {
                                  displayValue = field.name;
                                } else if (field.type === 'rating') {
                                  displayValue = `${field.name}: ${value}/5`;
                                } else if (field.type === 'number') {
                                  displayValue = `${field.name}: ${value}${field.unit || ''}`;
                                } else if (field.type === 'multiselect') {
                                  displayValue = `${field.name}: ${Array.isArray(value) ? value.join(', ') : value}`;
                                } else if (field.type === 'text' || field.type === 'select') {
                                  displayValue = `${field.name}: ${value}`;
                                }

                                return (
                                  <span key={fieldId} className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-cyan-primary/10 text-cyan-primary border border-cyan-primary/20">
                                    {displayValue}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setEditingDose(dose)}
                          className={cn(
                            "rounded-xl hover:bg-cyan-primary/10 text-md3-gray hover:text-cyan-primary transition-all active:scale-90 bg-theme-subtle border border-theme-border shadow-sm",
                            settings.compactMode ? "p-1.5" : "p-2.5"
                          )}
                        >
                          <Edit2 size={settings.compactMode ? 14 : 16} />
                        </button>
                        <button 
                          onClick={() => onDeleteDose(dose.id)}
                          className={cn(
                            "rounded-xl hover:bg-red-500/10 text-md3-gray hover:text-red-500 transition-all active:scale-90 bg-theme-subtle border border-theme-border shadow-sm",
                            settings.compactMode ? "p-1.5" : "p-2.5"
                          )}
                        >
                          <Trash2 size={settings.compactMode ? 14 : 16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingDose && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingDose(null)}
              className="absolute inset-0 bg-theme-bg/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xs bg-md3-card/90 backdrop-blur-3xl border border-md3-border rounded-2xl p-6 relative z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-md3-text uppercase tracking-widest">Upravit záznam</h3>
                <button onClick={() => setEditingDose(null)} className="text-md3-gray hover:text-md3-text">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-md3-gray uppercase tracking-widest ml-1 mb-1 block">Množství</label>
                  <input
                    type="number"
                    value={editingDose.amount}
                    onChange={(e) => setEditingDose({ ...editingDose, amount: Number(e.target.value) })}
                    className="w-full bg-theme-subtle border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-cyan-primary/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-md3-gray uppercase tracking-widest ml-1 mb-1 block">Poznámka</label>
                  <textarea
                    value={editingDose.note || ''}
                    onChange={(e) => setEditingDose({ ...editingDose, note: e.target.value })}
                    className="w-full bg-theme-subtle border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-cyan-primary/50 h-20 resize-none"
                    placeholder="Přidat poznámku..."
                  />
                </div>

                <button
                  onClick={handleSaveEdit}
                  className="w-full bg-cyan-primary text-black font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-primary/20"
                >
                  <Check size={16} strokeWidth={3} />
                  ULOŽIT ZMĚNY
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
