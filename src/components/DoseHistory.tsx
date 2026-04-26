import { Clock, Trash2, Calendar, Edit2, X, Check, Search, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Dose, Substance, UserSettings } from '../types';
import { cn, formatTime, formatAmount } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getIconComponent } from './Substances';
import { calculateActiveIngredients } from './Analytics';

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
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[30%] left-[-20%] w-[50%] h-[50%] bg-md3-primary/10 blur-[120px] rounded-full animate-blob transform-gpu will-change-transform mix-blend-screen" />
      </div>

      <div className="flex items-center justify-between px-2 pt-2 relative z-10">
        <div>
          <h2 className="text-[20px] font-black text-theme-text flex items-center gap-1.5 leading-none tracking-tight">
            Archiv
          </h2>
          <p className="text-[10px] text-md3-gray/80 mt-1.5 font-bold uppercase tracking-wider leading-none flex items-center gap-1.5">
            <Clock size={10} className="text-md3-primary/80" /> Časová osa
          </p>
        </div>
        <button 
          onClick={onClearAll}
          className="px-3 py-1.5 rounded-xl text-[9px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500/10 transition-all active:scale-95 border border-red-500/20 backdrop-blur-md shadow-sm"
        >
          Smazat Vše
        </button>
      </div>

      {/* Search and Filter */}
      {doses.length > 0 && (
        <div className="relative z-10 space-y-3 px-1 mt-2">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-md3-primary/10 to-transparent rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-md3-gray group-focus-within:text-md3-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Vyhledat v archivu..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-theme-bg/40 backdrop-blur-xl border border-theme-border/30 text-xs font-semibold outline-none focus:border-md3-primary/50 transition-all text-theme-text shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-md3-gray hover:text-theme-text p-1"
              >
                <X size={12} strokeWidth={3} />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1.5 pt-0.5 px-0.5">
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
        <div className="p-12 text-center bg-theme-bg/20 backdrop-blur-2xl rounded-[2rem] border border-theme-border/20 shadow-sm relative z-10 flex flex-col items-center justify-center mx-2 mt-4">
          <div className="w-16 h-16 bg-theme-bg/40 rounded-2xl flex items-center justify-center mb-4 border border-theme-border/30 shadow-inner relative overflow-hidden">
             <Clock size={28} className="text-md3-gray relative z-10" />
             <div className="absolute inset-0 bg-gradient-to-br from-transparent to-md3-primary/10" />
          </div>
          <span className="text-sm text-theme-text font-black uppercase tracking-wider">Archiv je prázdný</span>
          <p className="text-xs text-md3-gray font-semibold mt-2 max-w-[200px] leading-relaxed">
            Zatím tu nic neruší vaši rovnováhu. První krok začíná u vás.
          </p>
        </div>
      ) : (
        <div className="space-y-8 relative z-10 mt-4">
          {Object.entries(groupedDoses).map(([date, dayDoses]) => (
            <div key={date} className="space-y-3 px-1">
              <div className="flex items-center gap-3 px-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-md3-gray/70" />
                  <h3 className="text-[10px] font-bold text-md3-gray uppercase tracking-widest">{date}</h3>
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
                        "bg-theme-card/40 backdrop-blur-2xl border border-theme-border/30 flex items-center justify-between group hover:bg-theme-bg/60 transition-all shadow-sm rounded-2xl p-3 relative overflow-hidden",
                      )}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl blur-3xl opacity-10 rounded-full pointer-events-none" style={{ from: substance.color || '#00d1ff', to: 'transparent' }} />
                      <div className="flex items-center gap-3 relative z-10 min-w-0">
                        {(() => {
                          const IconComponent = getIconComponent(substance.icon);
                          const strainColor = dose.strainId ? substance.strains?.find(s => s.name === dose.strainId)?.color : undefined;
                          const color = strainColor || substance.color || '#00d1ff';
                          return (
                            <div className="bg-theme-bg/60 flex items-center justify-center border border-theme-border/20 group-hover:scale-110 transition-transform shadow-[0_2px_10px_rgba(0,0,0,0.1)] w-10 h-10 rounded-xl shrink-0">
                              <IconComponent size={18} style={{ color }} strokeWidth={2.5}/>
                            </div>
                          );
                        })()}
                        <div className="flex flex-col min-w-0">
                          <div className="font-bold text-theme-text text-[13px] flex items-baseline gap-1.5 truncate">
                            {substance.name}
                            {dose.strainId && <span className="text-[9px] text-md3-gray font-bold uppercase tracking-widest opacity-80 truncate border border-theme-border/30 px-1 py-0.5 rounded-md bg-theme-bg/30">{dose.strainId}</span>}
                          </div>
                          <div className="text-md3-gray font-semibold text-[10px] uppercase tracking-wider mt-1 truncate flex items-center gap-1.5">
                            <span className="text-theme-text font-black text-[11px] px-1.5 py-0.5 bg-theme-bg/50 rounded-md shadow-sm border border-theme-border/20" style={{ color: substance.color }}>{formatAmount(dose.amount, substance.unit, 1)}</span>
                            <span className="opacity-50">•</span> 
                            <span className="flex items-center gap-1"><Clock size={8} /> {formatTime(dose.timestamp, settings)}</span>
                            {dose.route && <><span className="opacity-50">•</span> <span>{dose.route}</span></>}
                          </div>
                          {(() => {
                            const activeSums = calculateActiveIngredients([dose], substance);
                            const activeNames = Object.keys(activeSums);
                            if (activeNames.length > 0) {
                              return (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {activeNames.map((name, i) => (
                                    <div key={i} className="text-theme-text opacity-80 font-black text-[8px] uppercase tracking-widest bg-theme-bg/50 border border-theme-border/30 px-1.5 py-0.5 rounded shadow-sm">
                                      {formatAmount(activeSums[name], substance.unit, 2)} {name}
                                    </div>
                                  ))}
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
                      
                      <div className="flex items-center gap-1.5 relative z-10 shrink-0">
                        <button 
                          onClick={() => setEditingDose(dose)}
                          className={cn(
                            "rounded-xl hover:bg-cyan-primary/20 text-md3-gray hover:text-cyan-primary transition-all active:scale-90 bg-theme-bg/60 border border-theme-border/30 shadow-[0_2px_10px_rgba(0,0,0,0.1)] backdrop-blur-md",
                            settings.compactMode ? "p-2" : "p-2.5"
                          )}
                        >
                          <Edit2 size={settings.compactMode ? 14 : 16} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={() => onDeleteDose(dose.id)}
                          className={cn(
                            "rounded-xl hover:bg-red-500/20 text-md3-gray hover:text-red-500 transition-all active:scale-90 bg-theme-bg/60 border border-theme-border/30 shadow-[0_2px_10px_rgba(0,0,0,0.1)] backdrop-blur-md",
                            settings.compactMode ? "p-2" : "p-2.5"
                          )}
                        >
                          <Trash2 size={settings.compactMode ? 14 : 16} strokeWidth={2.5} />
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
