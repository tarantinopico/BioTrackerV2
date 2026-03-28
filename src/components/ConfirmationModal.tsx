import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Potvrdit',
  cancelText = 'Zrušit',
  variant = 'danger'
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-card-bg border border-border-muted rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                variant === 'danger' ? 'bg-red-500/10 text-red-500' :
                variant === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                'bg-cyan-500/10 text-cyan-500'
              )}>
                <AlertTriangle size={20} />
              </div>
              <button 
                onClick={onCancel}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1.5">{title}</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6 font-medium">
              {message}
            </p>

            <div className="flex gap-2.5">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 px-3 rounded-lg bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  "flex-1 py-2.5 px-3 rounded-lg font-black uppercase tracking-widest text-[10px] text-dark-bg transition-all shadow-lg",
                  variant === 'danger' ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20' :
                  variant === 'warning' ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20' :
                  'bg-cyan-primary hover:bg-cyan-400 shadow-cyan-500/20'
                )}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
