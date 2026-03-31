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
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm android-card p-10 glass-accent overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] border-white/10"
          >
            <div className="flex items-start justify-between mb-8">
              <div className={cn(
                "w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500",
                variant === 'danger' ? 'bg-red-500/20 text-red-500 shadow-red-500/10' :
                variant === 'warning' ? 'bg-amber-500/20 text-amber-500 shadow-amber-500/10' :
                'bg-android-accent/20 text-android-accent shadow-android-accent/10'
              )}>
                <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <button 
                onClick={onCancel}
                className="p-3 rounded-2xl bg-android-surface border border-android-border text-android-text-muted hover:text-android-text transition-colors android-button"
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            <h3 className="text-2xl font-black text-android-text mb-3 uppercase tracking-tighter">{title}</h3>
            <p className="text-android-text-muted text-sm leading-relaxed mb-10 font-bold opacity-80">
              {message}
            </p>

            <div className="flex gap-5">
              <button
                onClick={onCancel}
                className="flex-1 h-14 rounded-2xl bg-android-surface border border-android-border text-android-text-muted font-black uppercase tracking-[0.2em] text-[10px] android-button shadow-inner"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  "flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-android-bg transition-all shadow-xl android-button",
                  variant === 'danger' ? 'bg-red-500 shadow-red-500/30' :
                  variant === 'warning' ? 'bg-amber-500 shadow-amber-500/30' :
                  'bg-android-accent shadow-android-accent/30'
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