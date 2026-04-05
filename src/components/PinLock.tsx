import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Delete } from 'lucide-react';
import { cn } from '../lib/utils';

interface PinLockProps {
  correctPin: string;
  onUnlock: () => void;
  isSettingPin?: boolean;
  onSetPin?: (pin: string) => void;
  onCancel?: () => void;
}

export default function PinLock({ correctPin, onUnlock, isSettingPin, onSetPin, onCancel }: PinLockProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');

  useEffect(() => {
    if (pin.length === 4) {
      if (isSettingPin) {
        if (step === 'enter') {
          setFirstPin(pin);
          setPin('');
          setStep('confirm');
        } else {
          if (pin === firstPin) {
            onSetPin?.(pin);
          } else {
            setError(true);
            setTimeout(() => {
              setPin('');
              setError(false);
            }, 500);
          }
        }
      } else {
        if (pin === correctPin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 500);
        }
      }
    }
  }, [pin, correctPin, onUnlock, isSettingPin, step, firstPin, onSetPin]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 bg-theme-bg z-[100] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xs flex flex-col items-center"
      >
        <div className="w-16 h-16 rounded-full bg-md3-primary/10 flex items-center justify-center text-md3-primary mb-6">
          <Lock size={32} />
        </div>
        
        <h2 className="text-xl font-bold text-theme-text mb-2 text-center">
          {isSettingPin 
            ? (step === 'enter' ? 'Zadejte nový PIN' : 'Potvrďte nový PIN')
            : 'Zadejte PIN pro odemknutí'}
        </h2>
        
        <div className={cn(
          "flex gap-4 my-8",
          error && "animate-shake"
        )}>
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-300",
                i < pin.length ? "bg-md3-primary scale-110" : "bg-theme-subtle border border-theme-border"
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-[260px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              className="w-full aspect-square rounded-full flex items-center justify-center text-2xl font-bold text-theme-text bg-theme-card hover:bg-theme-subtle-hover active:scale-95 transition-all shadow-sm"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {isSettingPin && onCancel && (
              <button 
                onClick={onCancel}
                className="text-sm font-bold text-md3-gray hover:text-theme-text transition-colors"
              >
                Zrušit
              </button>
            )}
          </div>
          <button
            onClick={() => handleNumberClick('0')}
            className="w-full aspect-square rounded-full flex items-center justify-center text-2xl font-bold text-theme-text bg-theme-card hover:bg-theme-subtle-hover active:scale-95 transition-all shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-full aspect-square rounded-full flex items-center justify-center text-theme-text bg-theme-card hover:bg-theme-subtle-hover active:scale-95 transition-all shadow-sm"
          >
            <Delete size={24} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
