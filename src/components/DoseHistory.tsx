import { Clock, Trash2, Activity, Calendar, Edit2, X, Check } from 'lucide-react';
import { useState } from 'react';
import { Dose, Substance } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryProps {
  doses: Dose[];
  substances: Substance[];
  onDeleteDose: (id: string) => void;
  onEditDose: (dose: Dose) => void;
  onClearAll: () => void;
}

export default function History({ doses, substances, onDeleteDose, onEditDose, onClearAll }: HistoryProps) {
  const [editingDose, setEditingDose] = useState<Dose | null>(null);
  const sortedDoses = [...doses].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const groupedDoses = sortedDoses.reduce((groups: Record<string, Dose[]>, dose) => {
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
    <div className="space-y-4 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[30%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[15%] right-[-10%] w-[35%] h-[35%] bg-purple-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="flex items-center justify-between px-2 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-primary/10 shadow-[0_0_15px_rgba(0,209,255,0.1)]">
            <Clock size={16} className="text-cyan-primary" />
          </div>
          <div>
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Časová osa</h2>
            <div className="text-xl font-black text-white leading-tight tracking-tighter">Historie dávek</div>
          </div>
        </div>
        <button 
          onClick={onClearAll}
          className="px-4 py-2 rounded-xl text-[10px] font-black text-red-500 uppercase tracking-[0.2em] hover:bg-red-500/10 transition-all active:scale-90 border border-red-500/20"
        >
          Vymazat vše
        </button>
      </div>

      {doses.length === 0 ? (
        <div className="p-12 text-center bg-white/5 backdrop-blur-3xl rounded-[2rem] border border-white/10 border-dashed relative z-10 shadow-2xl">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner">
            <Clock size={32} className="text-slate-700" />
          </div>
          <span className="text-[11px] text-slate-600 font-black uppercase tracking-[0.3em]">Žádné záznamy</span>
          <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest mt-2">Zatím jste nic nezaznamenali</p>
        </div>
      ) : (
        <div className="space-y-8 relative z-10">
          {Object.entries(groupedDoses).map(([date, dayDoses]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-slate-500" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{date}</h3>
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
              </div>
              
              <div className="space-y-2">
                {dayDoses.map(dose => {
                  const substance = substances.find(s => s.id === dose.substanceId);
                  if (!substance) return null;
                  
                  return (
                    <div 
                      key={dose.id} 
                      className="bg-white/5 backdrop-blur-3xl rounded-2xl p-4 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform shadow-inner">
                          <Activity size={20} style={{ color: substance.color || '#00d1ff' }} />
                        </div>
                        <div>
                          <div className="text-sm font-black text-white leading-tight tracking-tight">
                            {substance.name}
                            {dose.strainId && <span className="text-[10px] text-slate-500 ml-2 font-black uppercase tracking-widest opacity-60">({dose.strainId})</span>}
                          </div>
                          <div className="text-[10px] text-slate-500 font-black uppercase tracking-tight mt-1">
                            <span className="text-slate-300">{dose.amount.toFixed(1)}{substance.unit}</span> • <span className="text-slate-400">{new Date(dose.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
                            {dose.route && ` • ${dose.route}`}
                          </div>
                          {dose.note && (
                            <div className="mt-2 text-[10px] text-slate-500 italic leading-tight border-l-2 border-white/10 pl-3 py-0.5">
                              {dose.note}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setEditingDose(dose)}
                          className="p-2 rounded-xl hover:bg-cyan-primary/10 text-slate-600 hover:text-cyan-primary transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => onDeleteDose(dose.id)}
                          className="p-2 rounded-xl hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                        >
                          <Trash2 size={16} />
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xs bg-[#0e1217]/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 relative z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Upravit záznam</h3>
                <button onClick={() => setEditingDose(null)} className="text-slate-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Množství</label>
                  <input
                    type="number"
                    value={editingDose.amount}
                    onChange={(e) => setEditingDose({ ...editingDose, amount: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-primary/50"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Poznámka</label>
                  <textarea
                    value={editingDose.note || ''}
                    onChange={(e) => setEditingDose({ ...editingDose, note: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-primary/50 h-20 resize-none"
                    placeholder="Přidat poznámku..."
                  />
                </div>

                <button
                  onClick={handleSaveEdit}
                  className="w-full bg-cyan-primary text-dark-bg font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-primary/20"
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
