import React, { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface HoldToDeleteProps {
  onDelete: () => void;
  disabled: boolean;
  itemName: string;
  children: React.ReactNode;
}

export default function HoldToDelete({ onDelete, disabled, itemName, children }: HoldToDeleteProps) {
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [isHolding, setIsHolding] = useState(false);
  const progressIntervalRef = useRef<any>(null);

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    
    setIsHolding(true);
    setHoldProgress(0);

    const startTime = Date.now();
    const duration = 1000; // 1 second

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setHoldProgress(pct);
      
      if (pct >= 100) {
        clearInterval(progressIntervalRef.current);
        onDelete();
        resetHold();
      }
    }, 30);
  };

  const resetHold = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  return (
    <div
      className="relative group select-none h-full"
      onMouseDown={startHold}
      onTouchStart={startHold}
      onMouseUp={resetHold}
      onMouseLeave={resetHold}
      onTouchEnd={resetHold}
    >
      {children}

      {/* Progress Overlay when holding */}
      {isHolding && !disabled && (
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center text-center p-4 z-40 transition-all duration-150 animate-in fade-in border border-red-500/30">
          <Trash2 className="h-8 w-8 text-red-500 animate-bounce mb-2" />
          <span className="text-white text-[11px] font-black uppercase tracking-wider font-mono">
            Apagando Registro
          </span>
          <span className="text-[9px] text-red-400 mt-1 font-mono">
            {itemName}
          </span>
          
          {/* Progress bar */}
          <div className="w-32 bg-slate-950 h-2 rounded-full overflow-hidden border border-red-900/50 mt-3 shadow-inner">
            <div
              className="bg-gradient-to-r from-red-600 to-red-400 h-full transition-all duration-75"
              style={{ width: `${holdProgress}%` }}
            />
          </div>
          <span className="text-[8px] text-slate-500 font-mono uppercase mt-2 tracking-widest">// SECURE_DELETE_1S</span>
        </div>
      )}
    </div>
  );
}
