import { Plus, Zap, X, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { Substance, Shortcut } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useState } from 'react';

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
    color: '#00f2ff'
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
        color: substance?.color || '#00f2ff',
      });
    } else {
      onAddShortcut({
        id: Math.random().toString(36).substr(2, 9),
        name: newShortcut.name as string,
        substanceId: newShortcut.substanceId as string,
        strainId: newShortcut.strainId,
        amount: Number(newShortcut.amount),
        route: newShortcut.route || 'oral',
        color: substance?.color || '#00f2ff',
      });
    }
    
    setIsAdding(false);
    setEditingShortcutId(null);
    setNewShortcut({ name: '', amount: 0, substanceId: '', strainId: null, route: 'oral', color: '#00f2ff' });
  };

  const handleEdit = (shortcut: Shortcut) => {
    setNewShortcut(shortcut);
    setEditingShortcutId(shortcut.id);
    setIsAdding(true);
  };

  const selectedSubstance = substances.find(s => s.id === newShortcut.substanceId);

  return (
    <section className="space-y-6 relative z-10">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">Neural Shortcuts</h3>
        <button 
          onClick={() => {
            setEditingShortcutId(null);
            setNewShortcut({ name: '', amount: 0, substanceId: '', strainId: null, route: 'oral', color: '#00f2ff' });
            setIsAdding(true);
          }}
          className="w-10 h-10 rounded-2xl bg-android-accent/10 border border-android-accent/20 text-android-accent flex items-center justify-center android-button shadow-inner"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {shortcuts.map((shortcut) => (
            <motion.div
              key={shortcut.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group"
            >
              <button
                onClick={() => onUseShortcut(shortcut)}
                className="w-full flex items-center gap-4 p-5 android-card android-button relative overflow-hidden group hover:border-android-accent/30 shadow-xl bg-android-surface/40"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full opacity-30 shadow-[2px_0_15px_rgba(0,0,0,0.2)]" style={{ backgroundColor: shortcut.color }} />
                
                <div className="w-12 h-12 rounded-2xl bg-android-bg border border-android-border flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Zap size={22} strokeWidth={2.5} style={{ color: shortcut.color }} />
                </div>
                
                <div className="text-left min-w-0">
                  <div className="text-sm font-black text-android-text truncate uppercase tracking-tight">{shortcut.name}</div>
                  <div className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.1em] mt-1 opacity-80">
                    {shortcut.amount}<span className="text-[8px] ml-0.5">{substances.find(s => s.id === shortcut.substanceId)?.unit || ''}</span> • {shortcut.route}
                  </div>
                </div>
              </button>
              
              <div className="absolute -top-2 -right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10 scale-90">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(shortcut);
                  }}
                  className="w-9 h-9 rounded-2xl bg-android-accent text-android-bg flex items-center justify-center shadow-[0_5px_15px_rgba(0,242,255,0.3)] android-button"
                >
                  <Edit2 size={14} strokeWidth={3} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveShortcut(shortcut.id);
                  }}
                  className="w-9 h-9 rounded-2xl bg-red-500 text-android-bg flex items-center justify-center shadow-[0_5px_15px_rgba(239,68,68,0.3)] android-button"
                >
                  <Trash2 size={14} strokeWidth={3} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {shortcuts.length === 0 && (
          <button
            onClick={() => setIsAdding(true)}
            className="col-span-2 py-16 android-card border-2 border-dashed border-android-border bg-android-surface/20 flex flex-col items-center justify-center gap-4 text-android-text-muted hover:border-android-accent/30 hover:text-android-accent transition-all android-button shadow-inner"
          >
            <div className="w-16 h-16 rounded-[2rem] bg-android-bg border border-android-border flex items-center justify-center shadow-lg">
              <Plus size={32} strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em]">Initialize Shortcut</span>
          </button>
        )}
      </div>

      {/* Add Shortcut Modal - Modern Bottom Sheet Style */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative bg-android-bg border-t border-white/10 rounded-t-[3rem] w-full max-w-lg p-8 pb-12 shadow-[0_-20px_80px_rgba(0,0,0,0.8)] z-10 glass-accent overflow-hidden"
            >
              <div className="w-12 h-1.5 bg-android-border rounded-full mx-auto mb-8 opacity-50" />
              
              <div className="flex items-center justify-between mb-10">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-android-text tracking-tighter">{editingShortcutId ? 'Edit Protocol' : 'New Protocol'}</h2>
                  <p className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em]">One-tap rapid sequence</p>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-3.5 rounded-full bg-android-bg text-android-text-muted hover:text-android-text android-button shadow-inner">
                  <X size={24} strokeWidth={2.5} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Action Identifier</label>
                  <input
                    type="text"
                    value={newShortcut.name}
                    onChange={(e) => setNewShortcut(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. MORNING ENERGY"
                    className="android-input w-full h-16 text-lg font-black tracking-tight"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Molecule</label>
                    <div className="relative group">
                      <select
                        value={newShortcut.substanceId}
                        onChange={(e) => setNewShortcut(prev => ({ ...prev, substanceId: e.target.value }))}
                        className="android-input w-full h-16 font-black appearance-none text-xs uppercase tracking-widest pl-5"
                      >
                        <option value="">Select</option>
                        {substances.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-android-text-muted">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Concentration</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={newShortcut.amount ?? ''}
                        onChange={(e) => setNewShortcut(prev => ({ ...prev, amount: Number(e.target.value) }))}
                        className="android-input w-full h-16 text-lg font-black pr-14"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-android-accent uppercase tracking-widest">
                        {selectedSubstance?.unit || ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-android-text-muted uppercase tracking-[0.2em] px-2">Transmission Route</label>
                  <div className="relative group">
                    <select
                      value={newShortcut.route}
                      onChange={(e) => setNewShortcut(prev => ({ ...prev, route: e.target.value }))}
                      className="android-input w-full h-16 font-black appearance-none text-xs uppercase tracking-widest pl-5"
                    >
                      <option value="oral">Oral Path</option>
                      <option value="sublingual">Sublingual</option>
                      <option value="insufflated">Nasal Array</option>
                      <option value="inhaled">Inhalation</option>
                      <option value="topical">Topical</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-android-text-muted">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={!newShortcut.name || !newShortcut.substanceId || (newShortcut.amount ?? 0) <= 0}
                  className="w-full h-18 rounded-[2.5rem] bg-android-accent text-android-bg font-black text-lg uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(0,242,255,0.35)] android-button disabled:opacity-50 mt-6 flex items-center justify-center gap-4"
                >
                  <Zap size={24} strokeWidth={3} />
                  <span>{editingShortcutId ? 'Commit Changes' : 'Initialize Action'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
