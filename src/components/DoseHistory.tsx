import { Clock, Trash2, Activity, Calendar } from 'lucide-react';
import { Dose, Substance } from '../types';
import { cn } from '../lib/utils';

interface HistoryProps {
  doses: Dose[];
  substances: Substance[];
  onDeleteDose: (id: string) => void;
  onClearAll: () => void;
}

export default function History({ doses, substances, onDeleteDose, onClearAll }: HistoryProps) {
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

  return (
    <div className="space-y-4 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[30%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[15%] right-[-10%] w-[35%] h-[35%] bg-purple-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="flex items-center justify-between px-1 relative z-10">
        <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
          <Clock size={10} className="text-cyan-primary" /> Časová osa
        </h2>
        <button 
          onClick={onClearAll}
          className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors"
        >
          Vymazat vše
        </button>
      </div>

      {doses.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/40 backdrop-blur-md rounded-2xl border border-white/5 border-dashed relative z-10">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3 border border-white/5">
            <Clock size={24} className="text-slate-700" />
          </div>
          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Žádné záznamy</span>
        </div>
      ) : (
        <div className="space-y-6 relative z-10">
          {Object.entries(groupedDoses).map(([date, dayDoses]) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Calendar size={10} className="text-slate-600" />
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{date}</h3>
              </div>
              
              <div className="space-y-1.5">
                {dayDoses.map(dose => {
                  const substance = substances.find(s => s.id === dose.substanceId);
                  if (!substance) return null;
                  
                  return (
                    <div 
                      key={dose.id} 
                      className="bg-slate-950/40 backdrop-blur-md rounded-xl p-3 border border-white/5 flex items-center justify-between group hover:bg-white/[0.05] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:scale-105 transition-transform">
                          <Activity size={14} style={{ color: substance.color || '#00d1ff' }} />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-200 leading-tight">
                            {substance.name}
                            {dose.strainId && <span className="text-[9px] text-slate-500 ml-1.5 font-bold">({dose.strainId})</span>}
                          </div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">
                            {dose.amount.toFixed(1)}{substance.unit} • {new Date(dose.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                            {dose.route && ` • ${dose.route}`}
                          </div>
                          {dose.note && (
                            <div className="mt-1 text-[9px] text-slate-500 italic leading-tight border-l border-white/10 pl-2">
                              {dose.note}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => onDeleteDose(dose.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
