import React, { useState } from 'react';
import { engine } from '../../game/engine';
import { GameState } from '../../game/types';
import { 
    DAILY_LOGIN_REWARDS_CONFIG, 
    getRewardValues, 
    claimDailyLoginReward, 
    getDaysDifference, 
    getTodayDateString 
} from '../../game/dailyLoginRewards';
import { X, Check, Lock, Sparkles, Gift } from 'lucide-react';

interface DailyLoginModalProps {
    onClose: () => void;
    gameState: GameState;
    onUpdate: () => void;
}

export const DailyLoginModal = ({ onClose, gameState, onUpdate }: DailyLoginModalProps) => {
    const [animationState, setAnimationState] = useState<{ claimed: boolean; rewardText: string } | null>(null);

    const today = getTodayDateString();
    const lastClaimed = gameState.dailyLogin.lastClaimedDate;
    const hasClaimedToday = lastClaimed === today;
    const streak = gameState.dailyLogin.streak || 0;

    let activeDay = 1;
    if (hasClaimedToday) {
        activeDay = -1; // No claimable day today
    } else {
        if (lastClaimed) {
            const diff = getDaysDifference(lastClaimed, today);
            if (diff === 1) {
                activeDay = (streak % 7) + 1;
            } else {
                activeDay = 1; // Reset to 1 if missed
            }
        } else {
            activeDay = 1; // First time
        }
    }

    const handleClaim = () => {
        if (hasClaimedToday) return;

        // Perform standard claim
        const result = claimDailyLoginReward(
            engine.state,
            (amount, c) => engine.addMoney(amount, c),
            (msg, t) => engine.pushNotification(msg, t)
        );

        if (result) {
            // Play sound
            engine.audio.play('bonus');
            
            // Trigger floating text in center of screen
            window.dispatchEvent(new CustomEvent('spawn-floating-text', {
                detail: { 
                    x: window.innerWidth / 2, 
                    y: window.innerHeight / 2 - 50, 
                    text: `Claimed Day ${activeDay}!`, 
                    type: 'normal' 
                }
            }));

            setAnimationState({
                claimed: true,
                rewardText: result.descText
            });

            onUpdate();
            engine.saveState(false);
        }
    };

    return (
        <div className="modal-overlay select-none" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
            <div 
                className="bg-[#0b0c16] border border-cyan-500/30 text-white rounded-2xl w-[90vw] max-w-[500px] shadow-[0_20px_50px_rgba(0,0,0,0.9),_0_0_30px_rgba(6,182,212,0.1)] flex flex-col relative overflow-hidden"
                style={{ maxHeight: '90vh' }}
            >
                {/* Visual Accent header */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-cyan-500 to-amber-500" />

                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-3 right-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-all cursor-pointer z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
                    {/* Header */}
                    <div className="text-center mt-2">
                        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 font-mono tracking-wider flex items-center justify-center gap-1.5 uppercase">
                            🎁 Daily Login Rewards
                        </h2>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-[400px] mx-auto">
                            Claim rewards daily! Missing a day resets the consecutive calendar back to <span className="text-rose-400 font-bold">Day 1</span>. Reach Day 7 for a Jackpot!
                        </p>
                    </div>

                    {/* Streak Indicator */}
                    <div className="bg-slate-900/40 border border-slate-800/60 p-3 rounded-xl flex items-center justify-between text-xs my-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🔥</span>
                            <div>
                                <div className="text-slate-400 font-medium">Consecutive Streak</div>
                                <div className="font-extrabold text-[#f59e0b] h-5 flex items-center text-sm">{streak} Days</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-slate-400 font-medium">Status Today</div>
                            <div className={`font-black uppercase tracking-wider text-sm ${hasClaimedToday ? "text-emerald-400" : "text-amber-400"}`}>
                                {hasClaimedToday ? "Claimed ✓" : "Ready to Claim!"}
                            </div>
                        </div>
                    </div>

                    {/* Claim Animation State Success Modal inside */}
                    {animationState ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 animate-fade-in">
                            <div className="w-20 h-20 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)] my-4 relative animate-bounce">
                                <Check className="w-10 h-10 text-white" />
                                <Sparkles className="w-5 h-5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
                            </div>
                            <h3 className="text-lg font-black text-emerald-400 uppercase tracking-widest font-mono">Claim Successful!</h3>
                            <p className="text-[11px] text-slate-300 mt-2 max-w-[320px]">
                                Your Daily Login Calendar values have been applied successfully:
                            </p>
                            <div className="bg-black/40 border border-emerald-500/20 p-3 rounded-xl font-mono text-xs font-extrabold text-emerald-300 mt-3 max-w-[350px] leading-relaxed">
                                {animationState.rewardText}
                            </div>
                            <button 
                                className="mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs px-8 py-2.5 rounded-full shadow-[0_4px_12px_rgba(16,184,129,0.3)] transition-all cursor-pointer uppercase tracking-wider font-mono"
                                onClick={() => {
                                    setAnimationState(null);
                                    onClose();
                                }}
                            >
                                Awesome!
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Days Matrix */}
                            <div className="grid grid-cols-3 gap-2.5">
                                {DAILY_LOGIN_REWARDS_CONFIG.slice(0, 6).map((r) => {
                                    const day = r.day;
                                    const vals = getRewardValues(day, gameState);
                                    
                                    // Assess Day State
                                    let isClaimed = false;
                                    let isActive = false;
                                    let isLocked = false;

                                    if (hasClaimedToday) {
                                        isClaimed = day <= streak;
                                        isLocked = day > streak;
                                    } else {
                                        isClaimed = day < activeDay;
                                        isActive = day === activeDay;
                                        isLocked = day > activeDay;
                                    }

                                    // Style matching
                                    let borderStyle = 'border-slate-800/80 bg-slate-950/40 text-slate-400';
                                    if (isClaimed) {
                                        borderStyle = 'border-emerald-500/35 bg-emerald-950/15 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.05)]';
                                    } else if (isActive) {
                                        borderStyle = 'border-amber-400 bg-amber-950/20 text-amber-200 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.25)] scale-[1.02] transform';
                                    }

                                    // Description calculation
                                    let valStr = '';
                                    if (vals.cash > 0) valStr = `$${vals.cash >= 1000 ? (vals.cash / 1000) + 'k' : vals.cash}`;
                                    if (vals.shards > 0) valStr = `+${vals.shards}⚡`;
                                    if (vals.gems.crimson > 0) valStr = `+1 Ruby`;
                                    if (vals.gems.amber > 0) valStr = `+1 Emerald`;
                                    if (vals.gems.azure > 0) valStr = `+1 Diamond`;

                                    return (
                                        <div 
                                            key={day}
                                            className={`p-3 border rounded-xl flex flex-col items-center justify-between text-center relative transition-all duration-300 min-h-[95px] ${borderStyle}`}
                                        >
                                            <div className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-slate-500">Day {day}</div>
                                            <div className="text-2xl my-1 select-none">{r.icon}</div>
                                            <div className="text-xs font-black font-mono tracking-tight">{r.label}</div>
                                            <div className="text-[10px] font-extrabold text-white mt-1 uppercase font-mono">{valStr}</div>
                                            
                                            {/* Indicators Overlay */}
                                            {isClaimed && (
                                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg" title="Claimed!">
                                                    <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                                                </div>
                                            )}
                                            {isLocked && (
                                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/40 border border-slate-700/50 flex items-center justify-center" title="Locked">
                                                    <Lock className="w-2 h-2 text-slate-500" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Special Reward: Day 7 Banner */}
                            {(() => {
                                const day = 7;
                                const r = DAILY_LOGIN_REWARDS_CONFIG[6];
                                const vals = getRewardValues(day, gameState);
                                
                                let isClaimed = false;
                                let isActive = false;
                                let isLocked = false;

                                if (hasClaimedToday) {
                                    isClaimed = day <= streak;
                                    isLocked = day > streak;
                                } else {
                                    isClaimed = day < activeDay;
                                    isActive = day === activeDay;
                                    isLocked = day > activeDay;
                                }

                                let borderStyle = 'border-slate-800/80 bg-slate-950/40 text-slate-400';
                                if (isClaimed) {
                                    borderStyle = 'border-emerald-500/40 bg-emerald-950/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.08)]';
                                } else if (isActive) {
                                    borderStyle = 'border-amber-400 bg-amber-950/30 text-amber-200 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.01] transform';
                                } else {
                                    borderStyle = 'border-amber-500/20 bg-[#120a1c]/40 text-amber-500/70';
                                }

                                return (
                                    <div 
                                        className={`p-4 border-2 rounded-xl flex items-center justify-between gap-4 relative transition-all duration-300 ${borderStyle}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-600 flex items-center justify-center text-4xl shadow-lg relative flex-shrink-0 animate-pulse">
                                                <span>👑</span>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-amber-400">Day 7 Ultimate Reward</div>
                                                <h4 className="text-sm font-black uppercase tracking-wide font-mono text-white flex items-center gap-1.5 mt-0.5">
                                                    {r.label}
                                                </h4>
                                                <p className="text-[9.5px] text-slate-400 tracking-wide mt-1 leading-normal pr-4">
                                                    Receive a massive cache: <span className="font-bold text-amber-300">$500,000+ Cash</span>, <span className="font-bold text-cyan-300">35 Shards</span>, + <span className="font-bold text-rose-400">2 Random Gems</span>!
                                                </p>
                                            </div>
                                        </div>

                                        {/* Status tag */}
                                        <div className="flex flex-col items-center justify-center flex-shrink-0 font-mono">
                                            {isClaimed && (
                                                <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider">
                                                    CLAIMED ✓
                                                </div>
                                            )}
                                            {isActive && (
                                                <div className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider animate-bounce">
                                                    MEGA CLAIM
                                                </div>
                                            )}
                                            {isLocked && (
                                                <div className="bg-zinc-800/50 text-slate-500 border border-slate-700/20 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                                                    <Lock className="w-2 h-2" /> LOCKED
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Main CTA button */}
                            {!hasClaimedToday ? (
                                <button
                                    onClick={handleClaim}
                                    className="p-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-sm rounded-xl shadow-[0_6px_20px_rgba(245,158,11,0.35)] transition-all transform hover:scale-[1.01] active:translate-y-0.5 cursor-pointer uppercase tracking-wider font-mono text-center flex items-center justify-center gap-2"
                                >
                                    <Gift className="w-4 h-4 stroke-[2.5]" />
                                    Claim Day {activeDay} Reward
                                </button>
                            ) : (
                                <div className="p-3.5 bg-slate-900/40 border border-slate-800 text-slate-500 font-bold text-xs rounded-xl font-mono uppercase text-center flex items-center justify-center gap-1.5 grayscale">
                                    ✓ Claimed Today! Come back tomorrow
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
