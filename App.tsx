import React, { useState, useCallback, useEffect } from 'react';
import { PlayerId, PlayerState, GamePhase, Hand, MineReveal, GameLogEntry } from './types';
import { TOTAL_STEPS, MINES_PER_PLAYER, AIKO_LIMIT, MOVE_STEPS, PENALTY_STEPS } from './constants';
import Staircase from './components/Staircase';
import JankenControl from './components/JankenControl';

const INITIAL_PLAYER_STATE = (id: PlayerId, name: string): PlayerState => ({
  id,
  name,
  position: 0,
  mines: [],
  lastArrivalTurn: 0,
});

const App: React.FC = () => {
  // --- State ---
  const [phase, setPhase] = useState<GamePhase>(GamePhase.SETUP_P1);
  const [p1, setP1] = useState<PlayerState>(INITIAL_PLAYER_STATE(PlayerId.P1, "Player 1"));
  const [p2, setP2] = useState<PlayerState>(INITIAL_PLAYER_STATE(PlayerId.P2, "Player 2"));
  
  const [turn, setTurn] = useState(1);
  const [logs, setLogs] = useState<GameLogEntry[]>([]);
  const [consecutiveDraws, setConsecutiveDraws] = useState(0);
  
  const [setupSelection, setSetupSelection] = useState<number[]>([]);
  const [p1Hand, setP1Hand] = useState<Hand | null>(null);
  const [p2Hand, setP2Hand] = useState<Hand | null>(null);
  
  const [revealedMines, setRevealedMines] = useState<MineReveal[]>([]);
  const [aikoWinner, setAikoWinner] = useState<PlayerId | null>(null);

  // --- Helpers ---
  const addLog = (message: string, type: GameLogEntry['type'] = 'info') => {
    setLogs(prev => [{ turn, message, type }, ...prev]);
  };

  // --- Setup Phase Logic ---
  const handleMineToggle = (step: number) => {
    if (step === 0 || step === TOTAL_STEPS) return;
    
    setSetupSelection(prev => {
      if (prev.includes(step)) {
        return prev.filter(s => s !== step);
      }
      if (prev.length >= MINES_PER_PLAYER) {
        return prev;
      }
      return [...prev, step];
    });
  };

  const confirmSetup = () => {
    if (setupSelection.length !== MINES_PER_PLAYER) {
      alert(`Please select exactly ${MINES_PER_PLAYER} locations for mines.`);
      return;
    }

    if (phase === GamePhase.SETUP_P1) {
      setP1(prev => ({ ...prev, mines: [...setupSelection] }));
      setSetupSelection([]);
      setPhase(GamePhase.SETUP_P2);
      addLog("Player 1 placed their mines.", 'info');
    } else if (phase === GamePhase.SETUP_P2) {
      // Check for collisions
      const p1Mines = p1.mines;
      const p2Mines = setupSelection;
      const collisions = p1Mines.filter(m => p2Mines.includes(m));

      if (collisions.length > 0) {
        addLog(`Collision detected at step(s): ${collisions.join(', ')}! Setup reset.`, 'danger');
        alert(`Collision detected at step(s): ${collisions.join(', ')}! Both players must set mines again.`);
        setP1(prev => ({ ...prev, mines: [] }));
        setP2(prev => ({ ...prev, mines: [] }));
        setSetupSelection([]);
        setPhase(GamePhase.SETUP_P1);
      } else {
        setP2(prev => ({ ...prev, mines: [...setupSelection] }));
        setSetupSelection([]);
        setPhase(GamePhase.PLAYING_SELECTION);
        addLog("Game Start! Choose your hands.", 'success');
      }
    }
  };

  // --- Janken Logic ---
  const determineWinner = (h1: Hand, h2: Hand): 'P1' | 'P2' | 'DRAW' => {
    if (h1 === h2) return 'DRAW';
    if (
      (h1 === Hand.ROCK && h2 === Hand.SCISSORS) ||
      (h1 === Hand.SCISSORS && h2 === Hand.PAPER) ||
      (h1 === Hand.PAPER && h2 === Hand.ROCK)
    ) return 'P1';
    return 'P2';
  };

  const handleHandSelect = (hand: Hand) => {
    if (phase === GamePhase.PLAYING_SELECTION) {
      if (!p1Hand) {
        setP1Hand(hand);
        // Assuming shared screen, we wait for P2 input in next render or simple conditional
        // But for better UX on shared device, we want to clear P1 selection visually or hide it.
      } else {
        setP2Hand(hand);
        setPhase(GamePhase.PLAYING_REVEAL);
      }
    }
  };

  // Reset turn selection if P1 wants to change before P2 picks (Optional UX, but keeping simple for now: P1 picks -> Hidden -> P2 Picks -> Reveal)
  // To handle the "Shared Screen" secret:
  // 1. P1 Picks (UI shows "P1 Ready", hides selection)
  // 2. P2 Picks
  // 3. Reveal

  const resolveTurn = useCallback(() => {
    if (!p1Hand || !p2Hand) return;

    const result = determineWinner(p1Hand, p2Hand);

    // AIKO Logic
    if (result === 'DRAW') {
      const newDrawCount = consecutiveDraws + 1;
      setConsecutiveDraws(newDrawCount);
      addLog(`Turn ${turn}: Draw! (${p1Hand} vs ${p2Hand}). Consecutive: ${newDrawCount}`, 'info');

      if (newDrawCount >= AIKO_LIMIT) {
        // Special Rule Trigger
        addLog("5 Consecutive Draws! Special Rule Activated.", 'alert');
        let winner: PlayerId | null = null;
        
        if (p1.position > p2.position) winner = PlayerId.P1;
        else if (p2.position > p1.position) winner = PlayerId.P2;
        else {
          // Tie breaker: Who arrived first?
          if (p1.lastArrivalTurn < p2.lastArrivalTurn) winner = PlayerId.P1;
          else winner = PlayerId.P2;
        }

        setAikoWinner(winner);
        setPhase(GamePhase.SPECIAL_AIKO_CHOICE);
      } else {
        // Reset hands for next attempt in same turn (conceptually same turn, but we increment turn counter for logs usually, 
        // strictly "turn" in rules implies movement opportunity. Let's just reset hands.)
        setP1Hand(null);
        setP2Hand(null);
        setPhase(GamePhase.PLAYING_SELECTION);
      }
      return;
    }

    // Winner Decided
    setConsecutiveDraws(0); // Reset draw counter
    const winnerId = result === 'P1' ? PlayerId.P1 : PlayerId.P2;
    const winningHand = result === 'P1' ? p1Hand : p2Hand;
    const stepsToMove = MOVE_STEPS[winningHand];
    
    addLog(`Turn ${turn}: ${winnerId} wins with ${winningHand}! Moving ${stepsToMove} steps.`, 'success');
    
    applyMove(winnerId, stepsToMove);
    
  }, [p1Hand, p2Hand, consecutiveDraws, turn, p1.position, p1.lastArrivalTurn, p2.position, p2.lastArrivalTurn]);

  // Trigger resolve when entering REVEAL
  useEffect(() => {
    if (phase === GamePhase.PLAYING_REVEAL) {
      // Small delay for dramatic effect
      const timer = setTimeout(() => {
        resolveTurn();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, resolveTurn]);


  // --- Movement & Mine Logic ---
  const applyMove = (moverId: PlayerId, steps: number) => {
    const mover = moverId === PlayerId.P1 ? p1 : p2;
    const other = moverId === PlayerId.P1 ? p2 : p1;
    const setMover = moverId === PlayerId.P1 ? setP1 : setP2;

    let targetStep = mover.position + steps;
    if (targetStep > TOTAL_STEPS) targetStep = TOTAL_STEPS;

    // Check mine at landing spot
    const mineAtTarget = (p1.mines.includes(targetStep) ? PlayerId.P1 : null) || (p2.mines.includes(targetStep) ? PlayerId.P2 : null);
    
    let finalStep = targetStep;
    let message = "";
    let logType: GameLogEntry['type'] = 'info';

    if (mineAtTarget && targetStep !== TOTAL_STEPS) { // Goal is safe
       if (mineAtTarget === moverId) {
         // Own mine (Miss)
         message = `${moverId} stepped on their own mine at ${targetStep}! It's a dud, but location revealed.`;
         logType = 'alert';
         // Reveal mine
         if (!revealedMines.some(m => m.step === targetStep)) {
            setRevealedMines(prev => [...prev, { step: targetStep, owner: moverId, isBlown: false }]);
         }
       } else {
         // Enemy mine (Explosion)
         message = `BOOM! ${moverId} stepped on ${other.id}'s mine at ${targetStep}! Falling back 10 steps.`;
         logType = 'danger';
         finalStep = Math.max(0, targetStep - PENALTY_STEPS);
         // Reveal mine
         if (!revealedMines.some(m => m.step === targetStep)) {
            setRevealedMines(prev => [...prev, { step: targetStep, owner: mineAtTarget, isBlown: true }]);
         }
       }
    } else {
      if (targetStep === TOTAL_STEPS) {
        message = `${moverId} REACHED THE GOAL!`;
        logType = 'success';
      } else {
        message = `${moverId} moved to step ${targetStep}.`;
      }
    }

    // Update State
    addLog(message, logType);
    setMover(prev => ({
      ...prev,
      position: finalStep,
      lastArrivalTurn: turn // Update arrival timestamp
    }));

    // Next Turn or End Game
    if (finalStep === TOTAL_STEPS) {
      setPhase(GamePhase.GAME_OVER);
    } else {
      // Prepare next turn
      setP1Hand(null);
      setP2Hand(null);
      setTurn(t => t + 1);
      setPhase(GamePhase.PLAYING_SELECTION);
    }
  };

  // --- Special Aiko Choice Logic ---
  const handleAikoChoice = (choice: 3 | 6) => {
    if (!aikoWinner) return;
    addLog(`Special Aiko Rule: ${aikoWinner} chose to move ${choice} steps.`, 'success');
    applyMove(aikoWinner, choice);
    setAikoWinner(null); // Clear winner after move applied
    // Note: applyMove handles phase transition
  };

  // --- Rendering ---
  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-slate-50 shadow-xl overflow-hidden">
      {/* Header */}
      <header className="bg-slate-800 text-white p-4 text-center shadow-md z-20">
        <h1 className="text-2xl font-bold tracking-wider">LANDMINE GLICO</h1>
        <div className="flex justify-between text-sm mt-2 px-4">
          <div className="flex flex-col items-start">
            <span className="text-red-400 font-bold">Player 1</span>
            <span>Step: {p1.position}</span>
          </div>
          <div className="flex flex-col items-center">
             <span className="text-slate-400">Turn {turn}</span>
             {consecutiveDraws > 0 && <span className="text-yellow-400 text-xs">Draws: {consecutiveDraws}/{AIKO_LIMIT}</span>}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-blue-400 font-bold">Player 2</span>
            <span>Step: {p2.position}</span>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Stairs Visual */}
        <div className="flex-1 relative">
           <Staircase 
              p1={p1} 
              p2={p2} 
              revealedMines={revealedMines} 
              isSetupPhase={phase === GamePhase.SETUP_P1 || phase === GamePhase.SETUP_P2}
              currentSetupMines={setupSelection}
              onStepClick={handleMineToggle}
           />
           
           {/* Overlay for Turn Resolution/Animations could go here */}
           {phase === GamePhase.PLAYING_REVEAL && (
             <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
               <div className="bg-white p-6 rounded-xl shadow-2xl text-center animate-bounce">
                  <h2 className="text-3xl font-bold mb-4">Janken...</h2>
                  <div className="flex gap-8 justify-center text-5xl">
                    <div className="text-red-500">
                       {p1Hand === Hand.ROCK ? '✊' : p1Hand === Hand.SCISSORS ? '✌️' : '✋'}
                    </div>
                    <div className="text-slate-900 font-bold">VS</div>
                    <div className="text-blue-500">
                       {p2Hand === Hand.ROCK ? '✊' : p2Hand === Hand.SCISSORS ? '✌️' : '✋'}
                    </div>
                  </div>
               </div>
             </div>
           )}
        </div>

        {/* Controls Area */}
        <div className="bg-white border-t border-slate-200 p-4 z-20">
          
          {/* Setup Controls */}
          {(phase === GamePhase.SETUP_P1 || phase === GamePhase.SETUP_P2) && (
             <div className="text-center">
               <h3 className="text-lg font-bold mb-2">
                 {phase === GamePhase.SETUP_P1 ? "Player 1" : "Player 2"}: Place 3 Mines
               </h3>
               <p className="text-sm text-slate-500 mb-4">Click on the stairs above to place/remove mines.</p>
               <div className="text-lg mb-4 font-mono">
                 Selected: {setupSelection.join(', ')} / {MINES_PER_PLAYER}
               </div>
               <button 
                 onClick={confirmSetup}
                 disabled={setupSelection.length !== MINES_PER_PLAYER}
                 className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold disabled:opacity-50 hover:bg-slate-700 transition"
               >
                 Confirm Mines
               </button>
             </div>
          )}

          {/* Gameplay Controls */}
          {phase === GamePhase.PLAYING_SELECTION && (
            <div>
              {!p1Hand ? (
                 <JankenControl 
                    activePlayer={PlayerId.P1} 
                    onSelect={handleHandSelect} 
                    selectedHand={p1Hand}
                    phaseTitle="Player 1 Turn"
                 />
              ) : !p2Hand ? (
                <div className="text-center py-4">
                  <p className="mb-4 text-green-600 font-bold">Player 1 Locked In!</p>
                  <hr className="my-4"/>
                  <JankenControl 
                    activePlayer={PlayerId.P2} 
                    onSelect={handleHandSelect} 
                    selectedHand={p2Hand}
                    phaseTitle="Player 2 Turn"
                 />
                </div>
              ) : null}
            </div>
          )}

          {/* Aiko Special Choice */}
          {phase === GamePhase.SPECIAL_AIKO_CHOICE && (
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-300">
              <h3 className="text-xl font-bold mb-2 text-yellow-800">Special Aiko Rule!</h3>
              <p className="mb-4">
                {aikoWinner} is closer to the goal (or arrived earlier).<br/>
                Choose your bonus move:
              </p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => handleAikoChoice(3)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded shadow"
                >
                  Move 3 Steps
                </button>
                <button 
                  onClick={() => handleAikoChoice(6)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded shadow"
                >
                  Move 6 Steps
                </button>
              </div>
            </div>
          )}

          {/* Game Over */}
          {phase === GamePhase.GAME_OVER && (
            <div className="text-center py-6">
              <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
                GAME OVER
              </h2>
              <p className="text-xl font-bold mb-6">
                {p1.position === TOTAL_STEPS ? 'Player 1' : 'Player 2'} Wins!
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-slate-700 transition"
              >
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Action Log */}
        <div className="bg-slate-100 h-32 overflow-y-auto border-t border-slate-300 p-2 text-sm font-mono">
          {logs.map((log, i) => (
            <div key={i} className={`mb-1 ${
              log.type === 'danger' ? 'text-red-600 font-bold' :
              log.type === 'success' ? 'text-green-600 font-bold' :
              log.type === 'alert' ? 'text-orange-600' :
              'text-slate-600'
            }`}>
              <span className="opacity-50 mr-2">[{log.turn}]</span>
              {log.message}
            </div>
          ))}
        </div>

      </main>
    </div>
  );
};

export default App;
