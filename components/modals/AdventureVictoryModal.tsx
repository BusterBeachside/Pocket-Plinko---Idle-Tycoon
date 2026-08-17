import React, { useEffect, useState } from 'react';
import { engine } from '../../game/engine';
import { AdventureLevelsManager } from '../../game/adventureLevels';
import { formatNumber } from '../../game/utils';

interface AdventureVictoryModalProps {
  onAdvanceLevel?: () => void;
}

export const AdventureVictoryModal: React.FC<AdventureVictoryModalProps> = ({ onAdvanceLevel }) => {
  const [completedLevel, setCompletedLevel] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail && e.detail.levelId) {
        setCompletedLevel(e.detail.levelId);
      }
    };
    window.addEventListener('adventure-level-complete', handler);
    return () => window.removeEventListener('adventure-level-complete', handler);
  }, []);

  if (!completedLevel || engine.state.gameMode !== 'adventure') return null;

  const config = AdventureLevelsManager.getLevelConfig(completedLevel);
  const currentMult = engine.state.adventureState?.adventureMultiplier || 1.0;
  const newMult = currentMult * config.multiplierReward;
  const boostPercent = Math.round((config.multiplierReward - 1) * 100);

  const handleNextLevel = () => {
    setCompletedLevel(null);
    if (onAdvanceLevel) {
      onAdvanceLevel();
    } else {
      engine.completeAdventureLevel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950 border-2 border-amber-400 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl shadow-amber-500/30 text-center flex flex-col items-center gap-4 relative overflow-hidden">
        {/* Glowing aura background */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-4xl animate-bounce my-1">
          {config.isBoss ? '👑' : '🎉'}
        </div>

        <div>
          <span className="text-xs font-black tracking-widest uppercase text-amber-400">
            {config.isBoss ? 'Boss Board Cleared!' : 'Board Goal Reached!'}
          </span>
          <h2 className="text-2xl font-black text-white mt-1">
            Board {completedLevel}: {config.name}
          </h2>
        </div>

        {/* Rewards Box */}
        <div className="w-full bg-slate-950/70 border border-amber-500/30 rounded-2xl p-4 my-1 flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Earnings Goal Met:</span>
            <span className="font-bold text-emerald-400">
              ${formatNumber(config.targetGoal)}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2">
            <span className="text-slate-400">Compounding Multiplier Boost:</span>
            <span className="font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
              +{boostPercent}% Permanently!
            </span>
          </div>

          <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2">
            <span className="text-slate-400">New Total Multiplier:</span>
            <span className="font-extrabold text-white text-sm">
              x{currentMult.toFixed(2)} ➔ <span className="text-amber-400 font-black">x{newMult.toFixed(2)}</span>
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleNextLevel}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 active:scale-95 transition-all uppercase tracking-wider"
        >
          Advance to Board {completedLevel + 1} ➔
        </button>
      </div>
    </div>
  );
};
