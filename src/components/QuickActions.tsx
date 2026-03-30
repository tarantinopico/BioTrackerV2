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
    <section className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-bold text-ios-gray uppercase tracking-widest">Rychlé užití</h3>
        <button 
          onClick={() => {
            setEditingShortcutId(null);
            setNewShortcut({ name: '', amount: 0, substanceId: '', strainId: null, route: 'oral', color: '#0a84ff' });
            setIsAdding(true);
          }}
          className="p-2 rounded-full bg-ios-secondary ios-button text-ios-blue"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
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
                className="w-full flex flex-col items-center gap-1.5 p-2 ios-card ios-button text-center relative overflow-hidden"
              >
                <div className="w-8 h-8 rounded-xl bg-theme-subtle flex items-center justify-center mb-0.5">
                  <Zap 
                    size={14} 
                    style={{ color: shortcut.color }} 
                  />
                </div>
                
                <div className="w-full">
                  <div className="text-[9px] font-bold text-theme-text uppercase tracking-tight truncate mb-0.5">
                    {shortcut.name}
                  </div>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xs font-bold text-theme-text tabular-nums">
                      {shortcut.amount}
                    </span>
                    <span className="text-[7px] font-medium text-ios-gray uppercase">
                      {substances.find(s => s.id === shortcut.substanceId)?.unit || ''}
                    </span>
                  </div>
                </div>

                <div 
                  className="absolute bottom-0 left-0 h-1 opacity-30"
                  style={{ backgroundColor: shortcut.color, width: '100%' }}
                />
              </button>
              
              <div className="absolute -top-2 -right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(shortcut);
                  }}
                  className="w-6 h-6 rounded-full bg-ios-blue text-white flex items-center justify-center shadow-lg ios-button"
                >
                  <Edit2 size={10} strokeWidth={3} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveShortcut(shortcut.id);
                  }}
                  className="w-6 h-6 rounded-full bg-ios-red text-white flex items-center justify-center shadow-lg ios-button"
                >
                  <Trash2 size={10} strokeWidth={3} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {shortcuts.length === 0 && (
          <button
            onClick={() => setIsAdding(true)}
            className="col-span-3 py-8 ios-card border-dashed border-theme-border flex flex-col items-center justify-center gap-3 text-ios-gray hover:text-ios-blue hover:border-ios-blue/50 transition-all ios-button"
          >
            <div className="w-10 h-10 rounded-full bg-theme-subtle flex items-center justify-center">
              <Plus size={20} strokeWidth={2} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">Přidat zkratku</span>
          </button>
        )}
      </div>

      {/* Add Shortcut Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-8 sm:items-center sm:pb-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-theme-bg/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full max-w-md max-h-[85vh] overflow-y-auto no-scrollbar bg-ios-card/90 backdrop-blur-3xl border border-theme-border rounded-[2.5rem] p-6 sm:p-8 relative z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-theme-text">{editingShortcutId ? 'Upravit zkratku' : 'Nová zkratka'}</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 rounded-full bg-theme-subtle text-ios-gray hover:text-theme-text transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-ios-gray uppercase tracking-widest ml-1 mb-2 block">Název</label>
                  <input
                    type="text"
                    value={newShortcut.name}
                    onChange={(e) => setNewShortcut(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Např. Ranní káva"
                    className="w-full ios-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-ios-gray uppercase tracking-widest ml-1 mb-2 block">Látka</label>
                    <div className="relative">
                      <select
                        value={newShortcut.substanceId}
                        onChange={(e) => setNewShortcut(prev => ({ ...prev, substanceId: e.target.value }))}
                        className="w-full ios-input appearance-none pr-10"
                      >
                        <option value="" className="bg-theme-card">Vyberte</option>
                        {substances.map(s => (
                          <option key={s.id} value={s.id} className="bg-theme-card">{s.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ios-gray">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ios-gray uppercase tracking-widest ml-1 mb-2 block">Množství</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={newShortcut.amount ?? ''}
                        onChange={(e) => setNewShortcut(prev => ({ ...prev, amount: Number(e.target.value) }))}
                        placeholder="0"
                        className="w-full ios-input pr-12"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-ios-gray uppercase">
                        {selectedSubstance?.unit || ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-ios-gray uppercase tracking-widest ml-1 mb-2 block">Způsob užití</label>
                    <div className="relative">
                      <select
                        value={newShortcut.route}
                        onChange={(e) => setNewShortcut(prev => ({ ...prev, route: e.target.value }))}
                        className="w-full ios-input appearance-none pr-10"
                      >
                        <option value="oral" className="bg-theme-card">Orálně</option>
                        <option value="sublingual" className="bg-theme-card">Pod jazyk</option>
                        <option value="insufflated" className="bg-theme-card">Nos</option>
                        <option value="inhaled" className="bg-theme-card">Inhalace</option>
                        <option value="intravenous" className="bg-theme-card">IV</option>
                        <option value="intramuscular" className="bg-theme-card">IM</option>
                        <option value="subcutaneous" className="bg-theme-card">SC</option>
                        <option value="rectal" className="bg-theme-card">Rektálně</option>
                        <option value="topical" className="bg-theme-card">Topicky</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ios-gray">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  {selectedSubstance?.strains && selectedSubstance.strains.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-ios-gray uppercase tracking-widest ml-1 mb-2 block">Druh</label>
                      <div className="relative">
                        <select
                          value={newShortcut.strainId || ''}
                          onChange={(e) => setNewShortcut(prev => ({ ...prev, strainId: e.target.value || null }))}
                          className="w-full ios-input appearance-none pr-10"
                        >
                          <option value="" className="bg-theme-card">Základní</option>
                          {selectedSubstance.strains.map(s => (
                            <option key={s.name} value={s.name} className="bg-theme-card">{s.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ios-gray">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 rounded-2xl bg-ios-secondary text-theme-text font-bold ios-button"
                  >
                    Zrušit
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!newShortcut.name || !newShortcut.substanceId || (newShortcut.amount ?? 0) <= 0}
                    className="flex-1 py-4 rounded-2xl bg-ios-blue text-theme-text font-bold ios-button disabled:opacity-50"
                  >
                    {editingShortcutId ? 'Uložit' : 'Vytvořit'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
