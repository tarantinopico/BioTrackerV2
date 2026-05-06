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

      <div className="flex items-center justify-between px-2 pt-2 relative z-10">
        <div>
          <h2 className="text-[20px] font-black text-theme-text flex items-center gap-1.5 leading-none tracking-tight">
            Archiv
          </h2>
          <p className="text-[10px] text-theme-text/50 mt-1.5 font-bold uppercase tracking-wider leading-none flex items-center gap-1.5">
            <Clock size={10} className="text-cyan-400" /> Časová osa
          </p>
        </div>
        <button 
          onClick={onClearAll}
          className="px-3 py-1.5 rounded-xl text-[9px] font-black text-theme-text/60 uppercase tracking-widest hover:text-theme-text hover:bg-red-500/80 transition-all active:scale-95 border border-theme-border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md bg-theme-glass"
        >
          Smazat Vše
        </button>
      </div>

      {/* Search and Filter */}
      {doses.length > 0 && (
        <div className="relative z-10 space-y-3 px-1 mt-2">
          <div className="relative group">
            <div className="absolute inset-0 bg-cyan-500/10 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text/40 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Vyhledat v archivu..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-theme-glass backdrop-blur-3xl border border-theme-border text-xs font-semibold outline-none focus:border-cyan-500/30 transition-all text-theme-text shadow-[0_4px_15px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] placeholder:text-theme-text/30 tracking-widest"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-theme-text/40 hover:text-theme-text p-1"
              >
                <X size={12} strokeWidth={3} />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1.5 pt-0.5 px-0.5">
            <button
              onClick={() => setSelectedSubstanceId('all')}
              className={cn(
                "px-3 py-1.5 rounded-[0.85rem] text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md",
                selectedSubstanceId === 'all' 
                  ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(0,209,255,0.4)]" 
                  : "bg-theme-glass border-theme-border text-theme-text/50 hover:text-theme-text"
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
                    "px-3 py-1.5 rounded-[0.85rem] text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md",
                    isActive 
                      ? "bg-theme-card shadow-[0_0_15px_rgba(0,0,0,0.4)] text-theme-text" 
                      : "bg-theme-glass border-theme-border text-theme-text/50 hover:text-theme-text hover:bg-theme-card"
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
        <div className="p-12 text-center bg-theme-glass backdrop-blur-2xl rounded-[2rem] border border-theme-border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.05)] relative z-10 flex flex-col items-center justify-center mx-2 mt-4">
          <div className="w-16 h-16 bg-theme-card rounded-2xl flex items-center justify-center mb-4 border border-theme-border shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] relative overflow-hidden">
             <Clock size={28} className="text-theme-text/60 relative z-10" />
             <div className="absolute inset-0 bg-gradient-to-br from-transparent to-cyan-500/20" />
          </div>
          <span className="text-sm text-theme-text font-black uppercase tracking-wider">Archiv je prázdný</span>
          <p className="text-xs text-theme-text/50 font-semibold mt-2 max-w-[200px] leading-relaxed">
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
                        "bg-theme-glass backdrop-blur-2xl border border-theme-border flex items-center justify-between group hover:bg-theme-card transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_15px_rgba(0,0,0,0.2)] rounded-[1.5rem] p-3 relative overflow-hidden",
                      )}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_center,var(--tw-gradient-from),transparent_70%)] blur-3xl opacity-10 rounded-full pointer-events-none" style={{ '--tw-gradient-from': substance.color || '#00d1ff' } as any} />
                      <div className="flex items-center gap-3 relative z-10 min-w-0">
                        {(() => {
                          const IconComponent = getIconComponent(substance.icon);
                          const strainColor = dose.strainId ? substance.strains?.find(s => s.name === dose.strainId)?.color : undefined;
                          const color = strainColor || substance.color || '#00d1ff';
                          return (
                            <div className="bg-theme-card flex items-center justify-center border border-theme-border group-hover:scale-110 transition-transform shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] w-10 h-10 rounded-[1rem] shrink-0">
                              <IconComponent size={18} style={{ color }} strokeWidth={2.5}/>
                            </div>
                          );
                        })()}
                        <div className="flex flex-col min-w-0">
                          <div className="font-bold text-theme-text text-[13px] flex items-baseline gap-1.5 truncate drop-shadow-sm">
                            {substance.name}
                            {dose.strainId && <span className="text-[9px] text-theme-text/50 font-bold uppercase tracking-widest opacity-80 truncate border border-theme-border px-1 py-0.5 rounded-md bg-theme-glass">{dose.strainId}</span>}
                          </div>
                          <div className="text-theme-text/40 font-semibold text-[10px] uppercase tracking-wider mt-1 truncate flex items-center gap-1.5">
                            <span className="text-theme-text font-black text-[11px] px-1.5 py-0.5 bg-theme-card rounded-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.05)] border border-theme-border" style={{ color: substance.color }}>{formatAmount(dose.amount, substance.unit, 1)}</span>
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
                                    <div key={i} className="text-theme-text/80 font-black text-[8px] uppercase tracking-widest bg-theme-glass border border-theme-border px-1.5 py-0.5 rounded shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.05)]">
                                      {formatAmount(activeSums[name], substance.unit, 2)} {name}
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {!settings.compactMode && dose.note && (
                            <div className="mt-1.5 text-[10px] font-medium text-theme-text/50 italic leading-tight border-l border-theme-border pl-2 py-0.5">
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
                                  <span key={fieldId} className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
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
