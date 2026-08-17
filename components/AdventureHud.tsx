import React from 'react';
import { GameState } from '../game/types';
import { AdventureLevelsManager } from '../game/adventureLevels';
import { formatNumber } from '../game/utils';

interface AdventureHudProps {
  state: GameState;
  onOpenLevelMap: () => void;
}

export const AdventureHud: React.FC<AdventureHudProps> = ({ state, onOpenLevelMap }) => {
  if (state.gameMode !== 'adventure' || !state.adventureState) return null;

  const currentLevel = state.adventureState.currentLevel || 1;
  const config = AdventureLevelsManager.getLevelConfig(currentLevel);
  const earnings = state.adventureState.levelEarnings || 0;
  const goal = state.adventureState.targetGoal || config.targetGoal;
  const progressPercent = Math.min(100, Math.max(0, (earnings / goal) * 100));
  const multiplier = state.adventureState.adventureMultiplier || 1.0;

  return (
    <div className="w-full max-w-4xl mx-auto my-2 px-3 py-2.5 bg-slate-900/85 backdrop-blur-md rounded-xl border border-amber-500/30 shadow-lg shadow-amber-950/20 text-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Left: Level Info & Boss Badge */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider uppercase text-amber-400">
              Adventure Mode
            </span>
            {config.isBoss && (
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-red-600 text-white rounded-full animate-pulse shadow-sm shadow-red-500/50">
                ⚠️ BOSS LEVEL
              </span>
            )}
          </div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-1.5 leading-snug">
            <span>Level {currentLevel}:</span>
            <span className="text-amber-200">{config.name}</span>
          </h2>
        </div>
      </div>

      {/* Middle: Goal Progress Bar */}
      <div className="flex-1 w-full max-w-md flex flex-col gap-1">
        <div className="flex justify-between items-center text-xs font-medium">
          <span className="text-slate-300">Level Earnings Goal:</span>
          <span className="font-bold text-emerald-400">
            ${formatNumber(Math.floor(earnings))} / ${formatNumber(goal)} ({progressPercent.toFixed(1)}%)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80 relative">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              config.isBoss
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500'
                : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {/* Active Gimmick Description */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
          <span className="truncate max-w-[280px]" title={config.gimmickDesc}>
            ✨ <strong className="text-slate-200">{config.gimmickName}:</strong> {config.gimmickDesc}
          </span>
          <span className="text-amber-300/90 font-semibold shrink-0">
            Multiplier: x{multiplier.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Right: Map Selector Button */}
      <button
        onClick={onOpenLevelMap}
        className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-95 transition-all text-xs font-bold text-white rounded-lg shadow-md border border-amber-400/40 flex items-center gap-1.5 shrink-0"
      >
        <span>🗺️ Level Select</span>
      </button>
    </div>
  );
};
