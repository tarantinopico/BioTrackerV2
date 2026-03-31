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
    <div className="space-y-8 pb-20 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[30%] left-[-10%] w-[40%] h-[40%] bg-android-accent/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[35%] h-[35%] bg-purple-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="flex items-center justify-between px-2 relative z-10">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-android-text tracking-tighter">Timeline<span className="text-android-accent">.</span></h2>
          <p className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Molecular Log Archive</p>
        </div>
        <button 
          onClick={onClearAll}
          className="px-5 py-2.5 rounded-[1.25rem] text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500/10 transition-all border border-red-500/20 android-button"
        >
          Purge Data
        </button>
      </div>

      {doses.length === 0 ? (
        <div className="py-24 text-center android-card border-dashed relative z-10 glass-accent">
          <div className="mb-6 flex justify-center opacity-20">
            <Clock size={64} className="text-android-text-muted" />
          </div>
          <span className="text-xs text-android-text-muted font-black uppercase tracking-[0.3em]">No Activity Records</span>
        </div>
      ) : (
        <div className="space-y-12 relative z-10">
          {Object.entries(groupedDoses).map(([date, dayDoses]) => (
            <div key={date} className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <div className="p-2 rounded-xl bg-android-accent/10 border border-android-accent/20">
                  <Calendar size={14} className="text-android-accent" />
                </div>
                <h3 className="text-[11px] font-black text-android-text uppercase tracking-[0.2em]">{date}</h3>
                <div className="h-px flex-1 bg-gradient-to-r from-android-border to-transparent ml-2" />
              </div>
              
              <div className="space-y-4">
                {dayDoses.map(dose => {
                  const substance = substances.find(s => s.id === dose.substanceId);
                  if (!substance) return null;
                  
                  return (
                    <motion.div 
                      layout
                      key={dose.id} 
                      className="android-card bg-android-surface/40 border-white/5 p-5 flex items-center justify-between group hover:border-android-accent/30 transition-all relative overflow-hidden shadow-xl"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full opacity-30 shadow-[2px_0_15px_rgba(0,0,0,0.3)]" style={{ backgroundColor: substance.color || '#00f2ff' }} />
                      
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-3xl bg-android-bg border border-android-border flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner">
                          <Activity size={28} style={{ color: substance.color || '#00f2ff' }} />
                        </div>
                        <div>
                          <div className="text-lg font-black text-android-text leading-tight flex items-center gap-3">
                            {substance.name}
                            {dose.strainId && <span className="text-[8px] text-android-text-muted font-black uppercase tracking-[0.2em] opacity-80 bg-android-bg px-2 py-0.5 rounded-lg border border-android-border">{dose.strainId}</span>}
                          </div>
                          <div className="text-[10px] text-android-text-muted font-black uppercase tracking-[0.1em] mt-2 flex items-center gap-2.5">
                            <span className="text-android-text text-sm tracking-tight">{dose.amount.toFixed(1)}<span className="text-[10px] ml-0.5">{substance.unit}</span></span>
                            <div className="w-1 h-1 rounded-full bg-android-border" />
                            <span className="opacity-70">{new Date(dose.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
                            {dose.route && (
                              <>
                                <div className="w-1 h-1 rounded-full bg-android-border" />
                                <span className="text-android-accent bg-android-accent/10 px-2 py-0.5 rounded-md border border-android-accent/20">{dose.route}</span>
                              </>
                            )}
                          </div>
                          {dose.note && (
                            <div className="mt-4 text-[10px] text-android-text-muted font-bold italic leading-relaxed bg-android-bg/50 p-2.5 rounded-2xl border-l-4 border-android-accent/40 pl-4">
                              {dose.note}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => setEditingDose(dose)}
                          className="p-3 rounded-2xl hover:bg-android-accent/10 text-android-text-muted hover:text-android-accent transition-all android-button"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button 
                          onClick={() => onDeleteDose(dose.id)}
                          className="p-3 rounded-2xl hover:bg-red-500/10 text-android-text-muted hover:text-red-500 transition-all android-button"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal - Modern Bottom Sheet Style */}
      <AnimatePresence>
        {editingDose && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingDose(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-lg android-card p-8 relative z-10 glass-accent rounded-t-[3rem] rounded-b-none border-t border-white/10 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-android-border rounded-full mx-auto mb-8 opacity-50" />
              
              <div className="flex items-center justify-between mb-10">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-android-text tracking-tighter">Edit Sequence</h3>
                  <p className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Recalibrating entry parameters</p>
                </div>
                <button onClick={() => setEditingDose(null)} className="p-3 rounded-full bg-android-bg text-android-text-muted hover:text-android-text android-button">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Molecular Concentration</label>
                  <input
                    type="number"
                    value={editingDose.amount}
                    onChange={(e) => setEditingDose({ ...editingDose, amount: Number(e.target.value) })}
                    className="android-input w-full h-16 text-lg font-black tracking-tight"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Encoded Observation</label>
                  <textarea
                    value={editingDose.note || ''}
                    onChange={(e) => setEditingDose({ ...editingDose, note: e.target.value })}
                    className="android-input w-full h-32 py-4 resize-none font-bold text-sm"
                    placeholder="Enter biometric observations..."
                  />
                </div>

                <button
                  onClick={handleSaveEdit}
                  className="w-full bg-android-accent text-android-bg h-16 rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] flex items-center justify-center gap-4 android-button shadow-[0_15px_30px_rgba(0,242,255,0.3)] mt-4"
                >
                  <Check size={24} strokeWidth={4} />
                  Execute Update
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
