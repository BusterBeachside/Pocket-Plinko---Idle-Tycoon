import React, { useState } from 'react';
import { engine } from '../../game/engine';
import { formatNumber } from '../../game/utils';
import { WebsimAdsService } from '../../services/websimAdsService';

interface GoldenBonusModalProps {
    onClose: () => void;
}

interface RewardResult {
    title: string;
    desc: string;
    type: 'common' | 'rare';
    icon: string;
}

export const GoldenBonusModal: React.FC<GoldenBonusModalProps> = ({ onClose }) => {
    const [isWatching, setIsWatching] = useState(false);
    const [rewardResult, setRewardResult] = useState<RewardResult | null>(null);

    // Calculate base bonus marble value
    const isChallenge = engine.state.inChallengeMode;
    const bonusLevel = isChallenge 
        ? (engine.state.challengeState?.upgrades?.bonusValue || 0)
        : (engine.state.upgrades?.bonusValue || 0);
    const bonusRate = 0.10 + (bonusLevel * 0.10);
    const peakToUse = isChallenge
        ? (engine.state.challengeState?.currentRunPeakMps || engine.state.challengeState?.currentMps || 0)
        : (engine.state.currentRunPeakMps || engine.state.currentMps || 0);

    const baseValue = Math.max(100, Math.round(peakToUse * bonusRate));
    const commonRewardValue = baseValue * 10;
    const rareSuperCashValue = baseValue * 50;

    const handleWatchAd = () => {
        setIsWatching(true);

        WebsimAdsService.showRewarded({
            onStart: () => {
                // Game audio suspend handled inside WebSimAds SDK or service
            },
            onReward: () => {
                const isRare = Math.random() < 0.20; // 20% Rare, 80% Common
                let result: RewardResult;

                if (!isRare) {
                    // COMMON REWARD: Bonus Marble Value x10
                    const amount = commonRewardValue;
                    if (isChallenge && engine.state.challengeState?.challengeId === 'sand_peg') {
                        engine.state.challengeState.pegsBrokenCurrency = (engine.state.challengeState.pegsBrokenCurrency || 0) + amount;
                        engine.state.challengeState.lifetimePegsBroken = (engine.state.challengeState.lifetimePegsBroken || 0) + amount;
                        result = {
                            title: 'COMMON REWARD!',
                            desc: `+${formatNumber(amount)} Sand Pegs (10x Bonus)`,
                            type: 'common',
                            icon: '⌛'
                        };
                    } else if (isChallenge) {
                        engine.state.challengeState.money = (engine.state.challengeState.money || 0) + amount;
                        engine.state.challengeState.lifetimeEarnings = (engine.state.challengeState.lifetimeEarnings || 0) + amount;
                        result = {
                            title: 'COMMON REWARD!',
                            desc: `+$${formatNumber(amount)} Cash (10x Bonus)`,
                            type: 'common',
                            icon: '💵'
                        };
                    } else {
                        engine.addMoney(amount, false);
                        result = {
                            title: 'COMMON REWARD!',
                            desc: `+$${formatNumber(amount)} Cash (10x Bonus)`,
                            type: 'common',
                            icon: '💵'
                        };
                    }
                } else {
                    // RARE REWARD: 1 of 3 options
                    const rareChoice = Math.floor(Math.random() * 3);
                    if (rareChoice === 0) {
                        // 50x Cash / Pegs
                        const amount = rareSuperCashValue;
                        if (isChallenge && engine.state.challengeState?.challengeId === 'sand_peg') {
                            engine.state.challengeState.pegsBrokenCurrency = (engine.state.challengeState.pegsBrokenCurrency || 0) + amount;
                            engine.state.challengeState.lifetimePegsBroken = (engine.state.challengeState.lifetimePegsBroken || 0) + amount;
                            result = {
                                title: '🌟 RARE REWARD!',
                                desc: `+${formatNumber(amount)} Sand Pegs (50x Super Bonus!)`,
                                type: 'rare',
                                icon: '⌛'
                            };
                        } else if (isChallenge) {
                            engine.state.challengeState.money = (engine.state.challengeState.money || 0) + amount;
                            engine.state.challengeState.lifetimeEarnings = (engine.state.challengeState.lifetimeEarnings || 0) + amount;
                            result = {
                                title: '🌟 RARE REWARD!',
                                desc: `+$${formatNumber(amount)} Cash (50x Super Bonus!)`,
                                type: 'rare',
                                icon: '💰'
                            };
                        } else {
                            engine.addMoney(amount, false);
                            result = {
                                title: '🌟 RARE REWARD!',
                                desc: `+$${formatNumber(amount)} Cash (50x Super Bonus!)`,
                                type: 'rare',
                                icon: '💰'
                            };
                        }
                    } else if (rareChoice === 1) {
                        // Kinetic Shards
                        const shards = Math.max(5, Math.round(10 + (engine.state.timesPrestiged || 0) * 3 + Math.random() * 10));
                        engine.state.kineticShards = (engine.state.kineticShards || 0) + shards;
                        result = {
                            title: '🌟 RARE REWARD!',
                            desc: `+${shards} Kinetic Shards!`,
                            type: 'rare',
                            icon: '⚡'
                        };
                    } else {
                        // Random Gem
                        const gems: Array<'ruby' | 'emerald' | 'diamond'> = ['ruby', 'emerald', 'diamond'];
                        const pickedGem = gems[Math.floor(Math.random() * gems.length)];
                        if (!engine.state.gemInventory) {
                            engine.state.gemInventory = { ruby: 0, emerald: 0, diamond: 0 };
                        }
                        engine.state.gemInventory[pickedGem] = (engine.state.gemInventory[pickedGem] || 0) + 1;
                        const gemName = pickedGem.charAt(0).toUpperCase() + pickedGem.slice(1);
                        result = {
                            title: '🌟 RARE REWARD!',
                            desc: `+1 ${gemName} Gem!`,
                            type: 'rare',
                            icon: pickedGem === 'ruby' ? '💎' : pickedGem === 'emerald' ? '❇️' : '🔷'
                        };
                    }
                }

                engine.audio.play('bonus', 0, 0.5);
                engine.notify();
                setRewardResult(result);
            },
            onClose: () => {
                setIsWatching(false);
            }
        });
    };

    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isWatching) onClose(); }}>
            <div className="confirm-modal prestige-modal max-w-md text-white select-none" style={{ background: '#12101a', border: '1px solid rgba(255, 215, 0, 0.3)', boxShadow: '0 0 30px rgba(255, 215, 0, 0.15)' }}>
                {/* Header */}
                <div className="flex justify-between items-center border-b border-amber-500/20 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xl animate-bounce">⭐</span>
                        <h2 className="text-sm font-black tracking-widest text-amber-400 uppercase">Golden Bonus Marble!</h2>
                    </div>
                    {!isWatching && (
                        <button onClick={onClose} className="text-xl text-slate-400 hover:text-red-400 transition-colors cursor-pointer px-2">×</button>
                    )}
                </div>

                {rewardResult ? (
                    /* Reward Granted View */
                    <div className="flex flex-col items-center text-center py-4 gap-3 animate-fade-in">
                        <div className="text-5xl my-2 animate-pulse">{rewardResult.icon}</div>
                        <h3 className={`text-xl font-black ${rewardResult.type === 'rare' ? 'text-amber-300' : 'text-emerald-400'}`}>
                            {rewardResult.title}
                        </h3>
                        <p className="text-base text-slate-200 font-bold bg-black/40 px-4 py-2 rounded-xl border border-white/10">
                            {rewardResult.desc}
                        </p>
                        <button 
                            onClick={onClose}
                            className="mt-4 px-8 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-sm rounded-xl cursor-pointer shadow-lg transition-all transform hover:scale-105"
                        >
                            Claim Reward!
                        </button>
                    </div>
                ) : (
                    /* Initial Prompt View */
                    <div className="flex flex-col gap-4">
                        <div className="p-4 rounded-xl bg-gradient-to-b from-amber-500/10 to-orange-500/5 border border-amber-500/20 text-center flex flex-col items-center">
                            <div className="relative mb-2">
                                <img 
                                    src="images/MarbleWings.png" 
                                    alt="Golden Bonus Marble" 
                                    className="w-16 h-16 object-contain filter drop-shadow-[0_0_12px_rgba(255,215,0,0.8)] sepia saturate-[400%] hue-rotate-15 brightness-125 animate-pulse" 
                                />
                            </div>
                            <p className="text-sm text-slate-200 font-medium leading-relaxed">
                                You clicked a <span className="text-amber-400 font-bold">Golden Bonus Marble</span>! Would you like to watch an ad to receive a reward?
                            </p>
                        </div>

                        {/* Reward Odds Info */}
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col gap-2 text-xs font-mono">
                            <div className="flex justify-between items-center text-slate-300">
                                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                                    <span>💵</span> Common Reward (80%):
                                </span>
                                <span className="font-extrabold text-white">
                                    {isChallenge && engine.state.challengeState?.challengeId === 'sand_peg' 
                                        ? `+${formatNumber(commonRewardValue)} Pegs` 
                                        : `+$${formatNumber(commonRewardValue)}`}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-300 border-t border-white/5 pt-2">
                                <span className="flex items-center gap-1.5 font-bold text-amber-400">
                                    <span>🌟</span> Rare Reward (20%):
                                </span>
                                <span className="font-extrabold text-amber-300 text-right">
                                    50x Cash, Shards, or Gem
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-2 border-t border-white/10 mt-2">
                            <button 
                                onClick={onClose}
                                disabled={isWatching}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                            >
                                No Thanks
                            </button>
                            <button 
                                onClick={handleWatchAd}
                                disabled={isWatching}
                                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-lg transform hover:scale-105 uppercase tracking-wider flex items-center gap-1.5"
                            >
                                {isWatching ? 'Loading Ad...' : '📺 Watch Ad for Reward'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
