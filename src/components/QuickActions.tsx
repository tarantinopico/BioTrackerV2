import { Plus, Zap, X, ChevronDown, Edit2, Trash2, Pill, Droplet, Wind, Flame } from 'lucide-react';
import { Substance, Shortcut } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { getIconComponent } from './Substances';

interface QuickActionsProps {
  shortcuts: Shortcut[];
  substances: Substance[];
  onUseShortcut: (shortcut: Shortcut) => void;
  onAddShortcut: (shortcut: Shortcut) => void;
  onRemoveShortcut: (id: string) => void;
  onUpdateShortcut: (shortcut: Shortcut) => void;
}

export default function QuickActions({ shortcuts, substances, onUseShortcut, onAddShortcut, onRemoveShortcut, onUpdateShortcut }: QuickActionsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);
  const [newShortcut, setNewShortcut] = useState<Partial<Shortcut>>({
    name: '',
    amount: 0,
    substanceId: '',
    strainId: null,
    route: 'oral',
    color: '#00d1ff'
  });

  const handleSave = () => {
    if (!newShortcut.name || !newShortcut.substanceId || (newShortcut.amount ?? 0) <= 0) return;
    
    const substance = substances.find(s => s.id === newShortcut.substanceId);
    
    if (editingShortcutId) {
      onUpdateShortcut({
        id: editingShortcutId,
        name: newShortcut.name as string,
        substanceId: newShortcut.substanceId as string,
        strainId: newShortcut.strainId,
        amount: Number(newShortcut.amount),
        route: newShortcut.route || 'oral',
        color: substance?.color || '#00d1ff',
      });
    } else {
      onAddShortcut({
        id: Math.random().toString(36).substr(2, 9),
        name: newShortcut.name as string,
        substanceId: newShortcut.substanceId as string,
        strainId: newShortcut.strainId,
        amount: Number(newShortcut.amount),
        route: newShortcut.route || 'oral',
        color: substance?.color || '#00d1ff',
      });
    }
    
    setIsAdding(false);
    setEditingShortcutId(null);
    setNewShortcut({ name: '', amount: 0, substanceId: '', strainId: null, route: 'oral', color: '#00d1ff' });
  };

  const handleEdit = (shortcut: Shortcut) => {
    setNewShortcut(shortcut);
    setEditingShortcutId(shortcut.id);
    setIsAdding(true);
  };

  const selectedSubstance = substances.find(s => s.id === newShortcut.substanceId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-3">
        <h3 className="text-[11px] font-bold text-md3-gray/80 uppercase tracking-[0.2em] leading-none flex items-center gap-2 drop-shadow-sm">
          <Zap size={14} className="text-md3-primary/90" strokeWidth={2.5} /> Rychlé Akce
        </h3>
        <button 
          onClick={() => {
            setEditingShortcutId(null);
            setNewShortcut({ name: '', amount: 0, substanceId: '', strainId: null, route: 'oral', color: '#0a84ff' });
            setIsAdding(true);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 dark:bg-black/20 border border-white/10 text-md3-primary hover:bg-white/10 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.05)] backdrop-blur-md active:scale-95 group"
        >
          <Plus size={16} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        <AnimatePresence mode="popLayout">
          {shortcuts.map((shortcut) => (
            <motion.div
              key={shortcut.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group"
            >
              <button
                onClick={() => onUseShortcut(shortcut)}
                className="w-full flex flex-col justify-between items-start p-3 bg-white/5 dark:bg-black/20 border border-white/10 rounded-[1.4rem] text-left relative overflow-hidden active:scale-95 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:bg-white/10 dark:hover:bg-black/30 backdrop-blur-2xl h-[78px]"
              >
                {/* Glow drop */}
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[25px] pointer-events-none opacity-[0.15]" style={{ backgroundColor: shortcut.color }} />
                
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-inner bg-theme-bg/60 border border-white/5 relative z-10 backdrop-blur-md" style={{ color: shortcut.color }}>
                  {(() => {
                    const substance = substances.find(s => s.id === shortcut.substanceId);
                    const IconComponent = getIconComponent(substance?.icon);
                    return <IconComponent size={16} strokeWidth={2.5}/>;
                  })()}
                </div>
                
                <div className="flex flex-col mt-auto w-full relative z-10 min-w-0 pt-2">
                  <div className="text-[11px] font-bold text-theme-text/90 truncate w-full leading-tight mb-0.5 tracking-tight drop-shadow-sm">
                    {shortcut.name}
                  </div>
                  <div className="flex items-baseline gap-[2px] truncate drop-shadow-sm">
                    <span className="text-[13px] font-black tabular-nums leading-none tracking-tight" style={{ color: shortcut.color }}>
                      {shortcut.amount}
                    </span>
                    <span className="text-[9px] font-bold text-md3-gray/80 leading-none truncate ml-0.5 uppercase tracking-wide">
                      {substances.find(s => s.id === shortcut.substanceId)?.unit || ''}
                    </span>
                  </div>
                </div>
              </button>
              
              <div className="absolute -top-2 -right-2 flex gap-1 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(shortcut);
                  }}
                  className="w-6 h-6 rounded-lg bg-theme-bg/90 border border-theme-border/30 text-md3-primary flex items-center justify-center shadow-md active:scale-90"
                >
                  <Edit2 size={10} strokeWidth={2.5} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveShortcut(shortcut.id);
                  }}
                  className="w-6 h-6 rounded-lg bg-theme-bg/90 border border-theme-border/30 text-red-500 flex items-center justify-center shadow-md active:scale-90"
                >
                  <Trash2 size={10} strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {shortcuts.length === 0 && (
          <button
            onClick={() => setIsAdding(true)}
            className="col-span-full py-4 bg-theme-bg/20 border-dashed border-2 border-theme-border/40 flex flex-col items-center justify-center gap-1.5 text-md3-gray hover:text-md3-primary rounded-2xl transition-all"
          >
            <div className="w-8 h-8 rounded-xl bg-theme-bg/50 border border-theme-border/30 flex items-center justify-center shadow-sm">
              <Plus size={14} strokeWidth={3} />
            </div>
            <span className="text-[10px] font-semibold text-md3-gray tracking-wide">Žádné zkratky</span>
          </button>
        )}
      </div>

      {/* Add Shortcut Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 pb-safe">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md max-h-[85vh] overflow-y-auto no-scrollbar bg-theme-card/95 backdrop-blur-3xl border border-theme-border rounded-[2.5rem] p-6 sm:p-8 relative z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-theme-text uppercase tracking-wider">{editingShortcutId ? 'Upravit zkratku' : 'Nová zkratka'}</h2>
                <button onClick={() => setIsAdding(false)} className="p-3 rounded-full bg-theme-subtle text-md3-gray hover:text-theme-text transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-md3-gray uppercase tracking-widest ml-1 mb-2 block">Název</label>
                  <input
                    type="text"
                    value={newShortcut.name}
                    onChange={(e) => setNewShortcut(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Např. Ranní espresso"
                    className="w-full bg-theme-bg border border-theme-border rounded-2xl px-4 py-4 text-sm text-theme-text font-bold outline-none focus:border-md3-primary transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-md3-gray uppercase tracking-widest ml-1 mb-2 block">Látka</label>
                    <div className="relative">
                      <select
                        value={newShortcut.substanceId}
                        onChange={(e) => setNewShortcut(prev => ({ ...prev, substanceId: e.target.value }))}
                        className="w-full bg-theme-bg border border-theme-border rounded-2xl px-4 py-4 text-sm text-theme-text font-bold outline-none focus:border-md3-primary transition-all appearance-none pr-10"
                      >
                        <option value="" className="bg-theme-card">Vyberte...</option>
                        {substances.map(s => (
                          <option key={s.id} value={s.id} className="bg-theme-card">{s.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-md3-gray">
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-md3-gray uppercase tracking-widest ml-1 mb-2 block">Množství</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={newShortcut.amount ?? ''}
                        onChange={(e) => setNewShortcut(prev => ({ ...prev, amount: Number(e.target.value) }))}
                        placeholder="0"
                        className="w-full bg-theme-bg border border-theme-border rounded-2xl px-4 py-4 text-sm text-theme-text font-bold outline-none focus:border-md3-primary transition-all pr-12"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-md3-gray uppercase">
                        {selectedSubstance?.unit || ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-black text-md3-gray uppercase tracking-widest ml-1 mb-2 block">Způsob užití</label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                      {[
                        { id: 'oral', label: 'Oral', icon: Pill },
                        { id: 'sublingual', label: 'Subling', icon: Droplet },
                        { id: 'insufflated', label: 'Sniff', icon: Wind },
                        { id: 'inhaled', label: 'Inhale', icon: Flame },
                        { id: 'intravenous', label: 'IV', icon: Droplet },
                        { id: 'intramuscular', label: 'IM', icon: Droplet },
                        { id: 'subcutaneous', label: 'SC', icon: Droplet },
                        { id: 'rectal', label: 'Rectal', icon: Pill },
                        { id: 'topical', label: 'Topical', icon: Droplet }
                      ].map(r => (
                        <button
                          key={r.id}
                          onClick={() => setNewShortcut(prev => ({ ...prev, route: r.id }))}
                          className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap border active:scale-95",
                            newShortcut.route === r.id 
                              ? "bg-md3-primary/20 text-md3-primary border-md3-primary/30" 
                              : "bg-theme-subtle text-md3-gray border-theme-border hover:bg-theme-subtle-hover"
                          )}
                        >
                          {r.icon && <r.icon size={14} />}
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedSubstance?.strains && selectedSubstance.strains.length > 0 && (
                    <div className="col-span-2">
                      <label className="text-xs font-black text-md3-gray uppercase tracking-widest ml-1 mb-2 block">Druh</label>
                      <div className="relative">
                        <select
                          value={newShortcut.strainId || ''}
                          onChange={(e) => setNewShortcut(prev => ({ ...prev, strainId: e.target.value || null }))}
                          className="w-full bg-theme-bg border border-theme-border rounded-2xl px-4 py-4 text-sm text-theme-text font-bold outline-none focus:border-md3-primary transition-all appearance-none pr-10"
                        >
                          <option value="" className="bg-theme-card">Základní</option>
                          {selectedSubstance.strains.map(s => (
                            <option key={s.name} value={s.name} className="bg-theme-card">{s.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-md3-gray">
                          <ChevronDown size={18} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4 pb-2">
                  <button
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 rounded-[1.5rem] bg-theme-subtle text-md3-gray font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                  >
                    Zrušit
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!newShortcut.name || !newShortcut.substanceId || (newShortcut.amount ?? 0) <= 0}
                    className="flex-1 py-4 rounded-[1.5rem] bg-md3-primary text-theme-bg font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    {editingShortcutId ? 'ULOŽIT' : 'PŘIDAT'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
