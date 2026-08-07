import React, { useState, useEffect } from 'react';
import { engine } from '../../game/engine';
import { formatNumber } from '../../game/utils';
import { WebsimAdsService } from '../../services/websimAdsService';

interface GoldenBonusModalProps {
    onClose: () => void;
}

interface AdOffer {
    isRare: boolean;
    rewardType: 'cash' | 'shards' | 'gem';
    badgeTitle: string;
    exactRewardText: string;
    rewardSubtext: string;
    icon: string;
    cashAmount?: number;
    shardsAmount?: number;
    gemType?: 'ruby' | 'emerald' | 'diamond';
}

export const GoldenBonusModal: React.FC<GoldenBonusModalProps> = ({ onClose }) => {
    const [isWatching, setIsWatching] = useState(false);
    const [rewardClaimed, setRewardClaimed] = useState(false);

    // Calculate base bonus marble value up front
    const isChallenge = engine.state.inChallengeMode;
    const bonusLevel = isChallenge 
        ? (engine.state.challengeState?.upgrades?.bonusValue || 0)
        : (engine.state.upgrades?.bonusValue || 0);
    const bonusRate = 0.10 + (bonusLevel * 0.10);
    const peakToUse = isChallenge
        ? (engine.state.challengeState?.currentRunPeakMps || engine.state.challengeState?.currentMps || 0)
        : (engine.state.currentRunPeakMps || engine.state.currentMps || 0);

    const baseValue = Math.max(100, Math.round(peakToUse * bonusRate));
    const commonCashValue = baseValue * 10;
    const rareSuperCashValue = baseValue * 50;
    const isSandPeg = isChallenge && engine.state.challengeState?.challengeId === 'sand_peg';

    // Pre-calculate the exact ad offer up front so the user knows what they get without gambling
    const [adOffer] = useState<AdOffer>(() => {
        const isRare = Math.random() < 0.20; // 20% Rare, 80% Common

        if (!isRare) {
            const amount = commonCashValue;
            return {
                isRare: false,
                rewardType: 'cash',
                badgeTitle: '📺 COMMON AD OFFER',
                exactRewardText: isSandPeg 
                    ? `+${formatNumber(amount)} Sand Pegs` 
                    : `+$${formatNumber(amount)} Cash`,
                rewardSubtext: '10x Bonus Marble Value',
                icon: isSandPeg ? '⌛' : '💵',
                cashAmount: amount
            };
        } else {
            // Rare reward: 1 of 3 options
            const rareChoice = Math.floor(Math.random() * 3);
            if (rareChoice === 0) {
                const amount = rareSuperCashValue;
                return {
                    isRare: true,
                    rewardType: 'cash',
                    badgeTitle: '🌟 RARE AD OFFER!',
                    exactRewardText: isSandPeg 
                        ? `+${formatNumber(amount)} Sand Pegs` 
                        : `+$${formatNumber(amount)} Cash`,
                    rewardSubtext: '50x Super Bonus Value!',
                    icon: isSandPeg ? '⌛' : '💰',
                    cashAmount: amount
                };
            } else if (rareChoice === 1) {
                const shards = Math.max(10, Math.round(15 + (engine.state.timesPrestiged || 0) * 3 + Math.random() * 10));
                return {
                    isRare: true,
                    rewardType: 'shards',
                    badgeTitle: '🌟 RARE AD OFFER!',
                    exactRewardText: `+${shards} Kinetic Shards`,
                    rewardSubtext: 'Prestige Currency Drop!',
                    icon: '⚡',
                    shardsAmount: shards
                };
            } else {
                const gems: Array<'ruby' | 'emerald' | 'diamond'> = ['ruby', 'emerald', 'diamond'];
                const pickedGem = gems[Math.floor(Math.random() * gems.length)];
                const gemName = pickedGem.charAt(0).toUpperCase() + pickedGem.slice(1);
                const icon = pickedGem === 'ruby' ? '💎' : pickedGem === 'emerald' ? '❇️' : '🔷';
                return {
                    isRare: true,
                    rewardType: 'gem',
                    badgeTitle: '🌟 RARE AD OFFER!',
                    exactRewardText: `+1 ${gemName} Gem`,
                    rewardSubtext: 'Socketable Peg Multiplier Gem!',
                    icon,
                    gemType: pickedGem
                };
            }
        }
    });

    const handleCloseModal = () => {
        // Ensure game engine and audio are restored when closing modal
        engine.audio.resume();
        engine.running = true;
        onClose();
    };

    const handleWatchAd = () => {
        setIsWatching(true);

        // Mute audio and pause game physics while ad is active
        engine.running = false;
        engine.audio.suspend();

        WebsimAdsService.showRewarded({
            onStart: () => {
                engine.running = false;
                engine.audio.suspend();
            },
            onReward: () => {
                // Grant the exact pre-defined offer
                if (adOffer.rewardType === 'cash' && adOffer.cashAmount) {
                    const amount = adOffer.cashAmount;
                    if (isSandPeg) {
                        engine.state.challengeState!.pegsBrokenCurrency = (engine.state.challengeState!.pegsBrokenCurrency || 0) + amount;
                        engine.state.challengeState!.lifetimePegsBroken = (engine.state.challengeState!.lifetimePegsBroken || 0) + amount;
                    } else if (isChallenge) {
                        engine.state.challengeState!.money = (engine.state.challengeState!.money || 0) + amount;
                        engine.state.challengeState!.lifetimeEarnings = (engine.state.challengeState!.lifetimeEarnings || 0) + amount;
                    } else {
                        engine.addMoney(amount, false);
                    }
                } else if (adOffer.rewardType === 'shards' && adOffer.shardsAmount) {
                    engine.state.kineticShards = (engine.state.kineticShards || 0) + adOffer.shardsAmount;
                } else if (adOffer.rewardType === 'gem' && adOffer.gemType) {
                    if (!engine.state.gemInventory) {
                        engine.state.gemInventory = { ruby: 0, emerald: 0, diamond: 0 };
                    }
                    engine.state.gemInventory[adOffer.gemType] = (engine.state.gemInventory[adOffer.gemType] || 0) + 1;
                }

                engine.audio.play('bonus', 0, 0.5);
                engine.notify();
                setRewardClaimed(true);
            },
            onClose: () => {
                // Resume game physics and restore audio
                engine.audio.resume();
                engine.running = true;
                setIsWatching(false);
            }
        });
    };

    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isWatching) handleCloseModal(); }}>
            <div className="confirm-modal prestige-modal max-w-md text-white select-none relative" style={{ background: '#12101a', border: adOffer.isRare ? '1px solid rgba(255, 215, 0, 0.5)' : '1px solid rgba(59, 130, 246, 0.4)', boxShadow: adOffer.isRare ? '0 0 35px rgba(255, 215, 0, 0.25)' : '0 0 25px rgba(59, 130, 246, 0.15)' }}>
                {/* Header */}
                <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xl animate-bounce">{adOffer.isRare ? '🌟' : '⭐'}</span>
                        <h2 className="text-sm font-black tracking-widest text-amber-400 uppercase">Golden Bonus Marble!</h2>
                    </div>
                    {!isWatching && (
                        <button onClick={handleCloseModal} className="text-xl text-slate-400 hover:text-red-400 transition-colors cursor-pointer px-2">×</button>
                    )}
                </div>

                {rewardClaimed ? (
                    /* Reward Claimed Confirmation View */
                    <div className="flex flex-col items-center text-center py-4 gap-3 animate-fade-in">
                        <div className="text-5xl my-2 animate-bounce">{adOffer.icon}</div>
                        <h3 className={`text-xl font-black ${adOffer.isRare ? 'text-amber-300' : 'text-emerald-400'}`}>
                            REWARD CLAIMED!
                        </h3>
                        <p className="text-base text-white font-extrabold bg-black/60 px-5 py-3 rounded-xl border border-white/10 shadow-inner">
                            {adOffer.exactRewardText}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">{adOffer.rewardSubtext}</p>
                        <button 
                            onClick={handleCloseModal}
                            className="mt-3 px-8 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-sm rounded-xl cursor-pointer shadow-lg transition-all transform hover:scale-105 uppercase tracking-wider"
                        >
                            Claim & Continue
                        </button>
                    </div>
                ) : (
                    /* Upfront Ad Offer View */
                    <div className="flex flex-col gap-4">
                        {/* Ad Type Classification Badge */}
                        <div className={`p-2.5 rounded-xl text-center border font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${
                            adOffer.isRare 
                                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(255,215,0,0.2)]' 
                                : 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                        }`}>
                            <span>{adOffer.badgeTitle}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 border border-white/10 text-slate-300 font-bold">
                                {adOffer.isRare ? 'Rare (20% Chance)' : 'Common (80% Chance)'}
                            </span>
                        </div>

                        {/* Guaranteed Upfront Reward Card */}
                        <div className="p-4 rounded-xl bg-gradient-to-b from-black/60 to-black/40 border border-white/10 flex flex-col items-center text-center gap-2 relative overflow-hidden">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">Guaranteed Upfront Reward</span>
                            
                            <div className="flex items-center gap-3 my-1">
                                <span className="text-4xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] animate-pulse">{adOffer.icon}</span>
                                <div className="text-left">
                                    <div className="text-lg font-black text-white leading-tight">{adOffer.exactRewardText}</div>
                                    <div className="text-xs font-semibold text-amber-400 mt-0.5">{adOffer.rewardSubtext}</div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                                Watch a short video ad to collect this exact reward!
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-2 border-t border-white/10 mt-1">
                            <button 
                                onClick={handleCloseModal}
                                disabled={isWatching}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                            >
                                No Thanks
                            </button>
                            <button 
                                onClick={handleWatchAd}
                                disabled={isWatching}
                                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-lg transform hover:scale-105 uppercase tracking-wider flex items-center gap-1.5"
                            >
                                {isWatching ? 'Loading Video Ad...' : `📺 Watch Ad (${adOffer.exactRewardText})`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

