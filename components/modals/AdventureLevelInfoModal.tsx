import React from 'react';
import { AdventureLevelsManager } from '../../game/adventureLevels';
import { formatNumber } from '../../game/utils';

interface AdventureLevelInfoModalProps {
    levelId: number | null;
    isOpen: boolean;
    onClose: () => void;
    onStartLevel?: () => void;
}

export const AdventureLevelInfoModal: React.FC<AdventureLevelInfoModalProps> = ({
    levelId,
    isOpen,
    onClose,
    onStartLevel
}) => {
    if (!isOpen || !levelId) return null;

    const config = AdventureLevelsManager.getLevelConfig(levelId);
    const boostPercent = Math.round((config.multiplierReward - 1) * 100);

    const handleConfirm = () => {
        onClose();
        if (onStartLevel) {
            onStartLevel();
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
            <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl shadow-amber-950/60 flex flex-col items-center gap-4 relative overflow-hidden">
                {/* Decorative glows */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />

                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-all cursor-pointer text-sm font-bold w-7 h-7 flex items-center justify-center"
                >
                    ✕
                </button>

                {/* Level Tag & Boss Badge */}
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                        Adventure Board {levelId}
                    </span>
                    {config.isBoss && (
                        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-full animate-pulse shadow-md shadow-red-500/30">
                            👑 BOSS BOARD
                        </span>
                    )}
                </div>

                {/* Board Title */}
                <div className="text-center px-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        {config.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Board Texture: <span className="text-amber-200 font-semibold">{config.bgName}</span>
                    </p>
                </div>

                {/* Gimmick Section */}
                <div className="w-full bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col gap-2.5 shadow-inner">
                    <div className="flex items-center justify-between text-amber-300 font-black text-sm border-b border-amber-500/20 pb-2">
                        <span className="flex items-center gap-1.5">
                            <span className="text-base">✨</span>
                            <span>{config.gimmickName}</span>
                        </span>
                        {config.isBoss && <span className="text-[10px] text-red-400 font-mono font-bold">SPECIAL PHYSICS</span>}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 font-medium">
                        {config.gimmickDesc}
                    </p>
                </div>

                {/* Target & Rewards Box */}
                <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2.5 text-xs">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Earnings Goal:</span>
                        <span className="font-extrabold text-emerald-400 text-sm font-mono">
                            ${formatNumber(config.targetGoal)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
                        <span className="text-slate-400 font-medium">Victory Reward:</span>
                        <span className="font-black text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                            +{boostPercent}% Permanent Multiplier
                        </span>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={handleConfirm}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer mt-1"
                >
                    {config.isBoss ? '🔥 Challenge Boss Board ➔' : '🎮 Play Board ➔'}
                </button>
            </div>
        </div>
    );
};
