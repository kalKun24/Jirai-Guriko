import React from 'react';
import { Hand, PlayerId } from '../types';

interface JankenControlProps {
  activePlayer: PlayerId;
  onSelect: (hand: Hand) => void;
  selectedHand: Hand | null;
  phaseTitle: string;
}

const JankenControl: React.FC<JankenControlProps> = ({ activePlayer, onSelect, selectedHand, phaseTitle }) => {
  const isP1 = activePlayer === PlayerId.P1;
  const colorClass = isP1 ? 'text-red-600' : 'text-blue-600';
  const bgClass = isP1 ? 'bg-red-50' : 'bg-blue-50';

  const hands = [
    { type: Hand.ROCK, label: '✊ Glico (3)', sub: 'Gu' },
    { type: Hand.SCISSORS, label: '✌️ Chiyokoreito (6)', sub: 'Choki' },
    { type: Hand.PAPER, label: '✋ Painatsupuru (6)', sub: 'Pa' },
  ];

  return (
    <div className={`p-4 rounded-lg shadow-lg ${bgClass} w-full max-w-md mx-auto mb-4`}>
      <h3 className={`text-lg font-bold text-center mb-4 ${colorClass}`}>
        {phaseTitle}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {hands.map((hand) => (
          <button
            key={hand.type}
            onClick={() => onSelect(hand.type)}
            className={`
              flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
              ${selectedHand === hand.type 
                ? (isP1 ? 'border-red-500 bg-red-100' : 'border-blue-500 bg-blue-100') 
                : 'border-slate-200 bg-white hover:border-slate-400'}
            `}
          >
            <span className="text-3xl mb-1">{hand.label.split(' ')[0]}</span>
            <span className="text-xs font-bold">{hand.sub}</span>
            <span className="text-[10px] text-slate-500">{hand.label.split('(')[1].replace(')', '')} steps</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default JankenControl;
