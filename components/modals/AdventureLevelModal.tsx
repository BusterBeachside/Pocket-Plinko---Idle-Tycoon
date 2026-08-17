import React from 'react';
import { GameState } from '../../game/types';
import { AdventureLevelsManager } from '../../game/adventureLevels';
import { formatNumber } from '../../game/utils';

interface AdventureLevelModalProps {
  state: GameState;
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (levelId: number) => void;
}

export const AdventureLevelModal: React.FC<AdventureLevelModalProps> = ({
  state,
  isOpen,
  onClose,
  onSelectLevel,
}) => {
  if (!isOpen || state.gameMode !== 'adventure') return null;

  const highestUnlocked = state.adventureState?.highestLevelUnlocked || 1;
  const currentLevel = state.adventureState?.currentLevel || 1;
  const completedLevels = state.adventureState?.completedLevels || {};

  // Render 20 levels
  const levelIds = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
              <span>🗺️ Adventure Board Select</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete boards sequentialy to build your permanent compounding multiplier boost!
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-sm border border-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Level Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4 overflow-y-auto pr-1">
          {levelIds.map((lvl) => {
            const config = AdventureLevelsManager.getLevelConfig(lvl);
            const isUnlocked = lvl <= highestUnlocked;
            const isCurrent = lvl === currentLevel;
            const isCompleted = !!completedLevels[lvl];

            return (
              <button
                key={lvl}
                disabled={!isUnlocked}
                onClick={() => {
                  onSelectLevel(lvl);
                  onClose();
                }}
                className={`relative p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[110px] ${
                  isCurrent
                    ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/50 shadow-md shadow-amber-500/20'
                    : isCompleted
                    ? 'bg-slate-800/80 border-emerald-500/40 hover:border-emerald-400 hover:bg-slate-800'
                    : isUnlocked
                    ? 'bg-slate-800/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-50 cursor-not-allowed'
                }`}
              >
                {/* Level Tag & Boss Badge */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold ${
                      isCurrent ? 'text-amber-300' : isUnlocked ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    Board {lvl}
                  </span>
                  {config.isBoss ? (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-red-600/90 text-white rounded shadow-sm">
                      BOSS
                    </span>
                  ) : isCompleted ? (
                    <span className="text-emerald-400 text-xs">✓</span>
                  ) : null}
                </div>

                {/* Level Title & Gimmick */}
                <div className="my-1.5">
                  <div className="text-xs font-extrabold text-white truncate" title={config.name}>
                    {config.name}
                  </div>
                  <div className="text-[10px] text-amber-200/80 truncate mt-0.5" title={config.gimmickName}>
                    {config.gimmickName}
                  </div>
                </div>

                {/* Target & Reward */}
                <div className="text-[10px] text-slate-400 flex items-center justify-between w-full border-t border-slate-800 pt-1 mt-auto">
                  <span>Goal: ${formatNumber(config.targetGoal)}</span>
                  <span className="font-bold text-amber-400">
                    +{Math.round((config.multiplierReward - 1) * 100)}%
                  </span>
                </div>

                {!isUnlocked && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[1px] rounded-xl flex items-center justify-center text-xs font-bold text-slate-500">
                    🔒 Locked
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>
            Current Multiplier Boost:{' '}
            <strong className="text-amber-300">
              x{(state.adventureState?.adventureMultiplier || 1.0).toFixed(2)}
            </strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
