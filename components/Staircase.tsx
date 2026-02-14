import React, { useEffect, useRef } from 'react';
import { PlayerId, PlayerState, MineReveal } from '../types';
import { TOTAL_STEPS } from '../constants';

interface StaircaseProps {
  p1: PlayerState;
  p2: PlayerState;
  revealedMines: MineReveal[];
  currentSetupMines?: number[]; // For showing mines during setup (only for current player)
  isSetupPhase?: boolean;
  onStepClick?: (step: number) => void;
}

const Staircase: React.FC<StaircaseProps> = ({
  p1,
  p2,
  revealedMines,
  currentSetupMines = [],
  isSetupPhase = false,
  onStepClick,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the leading player's position
  useEffect(() => {
    if (isSetupPhase) return;
    
    const leadingPos = Math.max(p1.position, p2.position);
    const stepElement = document.getElementById(`step-${leadingPos}`);
    
    if (stepElement && scrollContainerRef.current) {
      stepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [p1.position, p2.position, isSetupPhase]);

  const steps = Array.from({ length: TOTAL_STEPS + 1 }, (_, i) => i).reverse();

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto bg-slate-200 border-x border-slate-300 relative shadow-inner"
      style={{ maxHeight: '60vh' }}
    >
      <div className="py-8 px-4 flex flex-col items-center space-y-1">
        {steps.map((step) => {
          const isP1Here = p1.position === step;
          const isP2Here = p2.position === step;
          const isStart = step === 0;
          const isGoal = step === TOTAL_STEPS;
          
          const revealedMine = revealedMines.find((m) => m.step === step);
          const isSelectedInSetup = currentSetupMines.includes(step);

          // Interaction for setup
          const isClickable = isSetupPhase && !isStart && !isGoal;
          
          let stepColor = "bg-white";
          if (isGoal) stepColor = "bg-yellow-100 border-yellow-400";
          else if (isStart) stepColor = "bg-slate-300";
          else if (revealedMine) {
            stepColor = revealedMine.owner === PlayerId.P1 ? "bg-red-50" : "bg-blue-50";
          }

          return (
            <div
              key={step}
              id={`step-${step}`}
              onClick={() => isClickable && onStepClick && onStepClick(step)}
              className={`
                relative w-full max-w-md h-12 flex items-center justify-between px-4 border rounded shadow-sm transition-colors
                ${stepColor}
                ${isClickable ? 'cursor-pointer hover:bg-slate-50' : ''}
                ${isSelectedInSetup ? 'ring-2 ring-purple-500 bg-purple-50' : 'border-slate-300'}
              `}
            >
              {/* Step Number */}
              <div className="absolute left-2 text-xs font-mono text-slate-400">
                {step === TOTAL_STEPS ? 'GOAL' : step === 0 ? 'START' : step}
              </div>

              {/* Mine Indicators */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                 {revealedMine && (
                   <span className="text-2xl" role="img" aria-label="mine">
                     {revealedMine.owner === PlayerId.P1 ? '🔴' : '🔵'}💣
                   </span>
                 )}
                 {isSelectedInSetup && (
                   <span className="text-2xl opacity-50">💣</span>
                 )}
              </div>

              {/* Player Avatars */}
              <div className="flex w-full justify-between items-center px-8 z-10">
                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-lg transition-all duration-500
                    ${isP1Here ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
                    bg-red-500 border-2 border-white
                  `}>
                  P1
                </div>

                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-lg transition-all duration-500
                    ${isP2Here ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
                    bg-blue-500 border-2 border-white
                  `}>
                  P2
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Staircase;
