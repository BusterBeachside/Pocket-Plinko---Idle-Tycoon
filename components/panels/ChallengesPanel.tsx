import React, { useEffect, useState, useRef } from 'react';
import { engine } from '../../game/engine';
import { formatNumber } from '../../game/utils';
import { CHALLENGES, ChallengesManager } from '../../game/challenges';
import { UPGRADES } from '../../game/config';
import { X, Trophy, CheckCircle2, ShieldAlert, Sparkles, Flame, Coins, Zap } from 'lucide-react';
import { assets } from '../../game/assets';

interface ChallengesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    gameState: any;
    forceUpdateState: () => void;
    onToggleChallenge: () => void;
}

export const ChallengesPanel: React.FC<ChallengesPanelProps> = ({ isOpen, onClose, gameState, forceUpdateState, onToggleChallenge }) => {
    const [rotation, setRotation] = useState(ChallengesManager.getRotationInfo());
    const [activeId, setActiveId] = useState(ChallengesManager.getActiveChallengeId());
    const [isDebugOpen, setIsDebugOpen] = useState(false);

    const touchStart = useRef<{x: number, y: number} | null>(null);
    const isSwiping = useRef(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isSwiping.current = true;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current || !isSwiping.current) return;
        
        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        const dx = touchEnd.x - touchStart.current.x;
        const dy = touchEnd.y - touchStart.current.y;
        
        // Horizontal swipe must be significantly larger than vertical to count
        // and must exceed a higher threshold (100px)
        if (Math.abs(dx) > 100 && Math.abs(dx) > Math.abs(dy) * 2) {
            if (dx > 0 && isOpen) { // Swipe right to close
                onClose();
            }
        }
        
        touchStart.current = null;
        isSwiping.current = false;
    };

    useEffect(() => {
        const i = setInterval(() => {
            const rot = ChallengesManager.getRotationInfo();
            setRotation(rot);
            setActiveId(rot.activeChallengeId);
        }, 1000);
        return () => clearInterval(i);
    }, []);

    if (!isOpen) return null;

    const challenge = CHALLENGES[activeId];
    if (!challenge) return null;

    const inChallenge = gameState.inChallengeMode;
    const cState = gameState.challengeState || { money: 0, lifetimePegsBroken: 0, upgrades: {} };
    const goalsStatus = gameState.challengeGoalClaimed?.[activeId] || { bronze: false, silver: false, gold: false };

    // Metric values for tracker
    const metricType = challenge.goals.bronze.metric;
    const currentMetricVal = metricType === 'pegsBroken' ? (cState.lifetimePegsBroken || 0) : (cState.lifetimeEarnings || cState.money || 0);

    const handleToggleChallenge = () => {
        onToggleChallenge();
    };

    const handleBuyUpgrade = (key: any) => {
        if (ChallengesManager.buyUpgrade(engine.state, key)) {
            engine.saveState();
            forceUpdateState();
            engine.notify();
        }
    };

    const getGoalProgressPercent = (target: number) => {
        return Math.min(100, (currentMetricVal / target) * 100);
    };

    // Upgrades allowed in the active challenge
    const availableUpgrades = (() => {
        const baseUpgrades = UPGRADES.map(u => {
            let name = u.name;
            let description = u.description;
            if (activeId === 'single_marble' && u.id === 'extraBall') {
                name = 'Extra Marbles';
                description = 'Adds +x5 to the Master marble payout multiplier!';
            }
            return {
                id: u.id,
                name,
                desc: description
            };
        });

        if (activeId === 'anti_gravity') {
            return baseUpgrades.filter(u => u.id !== 'ballSpeed' && u.id !== 'basketValue');
        } else if (activeId === 'single_marble') {
            return baseUpgrades.filter(u => u.id !== 'uncommonChance' && u.id !== 'rareChance' && u.id !== 'legendaryChance');
        } else if (activeId === 'sand_peg') {
            const list: { id: any; name: string; desc: string; }[] = [];
            baseUpgrades.forEach(u => {
                if (u.id === 'pegValue' || u.id === 'basketValue') {
                    return;
                }
                if (u.id === 'microValue') {
                    list.push({
                        id: 'sandPegMultiplier',
                        name: 'Broken Peg Yield',
                        desc: 'Each broken peg becomes worth 1 more than before (Doesn`t count towards Goal progress).'
                    });
                } else {
                    list.push(u);
                }
            });
            return list;
        } else if (activeId === 'micro_mania') {
            return [
                ...baseUpgrades.filter(u => u.id !== 'extraBall' && u.id !== 'uncommonChance' && u.id !== 'rareChance' && u.id !== 'legendaryChance'),
                { id: 'microAutoclicker', name: 'Micro Autoclicker', desc: 'Automatically drops 0.1 Micro Marbles per second per level' }
            ];
        } else if (activeId === 'critical_meltdown') {
            return baseUpgrades.filter(u => u.id !== 'criticalChance');
        }
        return baseUpgrades;
    })();

    // Filter upgrades based on current challenge conditions
    const filteredUpgrades = availableUpgrades;

    const isSandPeg = activeId === 'sand_peg';

    return (
        <div 
            className="fixed inset-y-0 right-0 w-full sm:max-w-[420px] bg-[#0c0f17] border-l border-white/10 shadow-2xl z-[100] flex flex-col font-sans text-slate-200"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-black/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
                    <span className="text-sm font-bold uppercase tracking-wider text-amber-500">Challenge Dome</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Active Challenge Overview */}
                <div className="p-4 rounded-xl relative border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
                    <div className="absolute top-2 right-2 text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-amber-400 uppercase tracking-widest animate-pulse">
                        Time: {rotation.timeLeftStr}
                    </div>
                    <div className="text-[10px] font-mono text-amber-400 font-extrabold uppercase tracking-widest">Active Rotating Gimmick</div>
                    <h2 className="text-xl font-black text-white mt-1 uppercase tracking-tight">{challenge.name}</h2>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{challenge.description}</p>
                    <div className="mt-3 p-3 bg-black/60 border border-white/5 rounded-lg text-xs font-bold text-amber-300 leading-relaxed">
                        <span className="text-amber-500 uppercase tracking-wider text-[10px] block mb-1">⚠️ Spark Rule</span>
                        {challenge.gimmickDescription}
                    </div>
                </div>

                {/* Main Challenge Action Button */}
                <button
                    onClick={handleToggleChallenge}
                    className={`w-full py-3.5 px-4 rounded-xl font-extrabold uppercase tracking-widest border transition-all text-xs flex items-center justify-center gap-2 shadow-lg ${
                        inChallenge
                            ? 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25 active:scale-98'
                            : 'bg-amber-500 text-black border-amber-400 font-black hover:bg-amber-400 active:scale-98'
                    }`}
                >
                    <Sparkles className="w-4 h-4" />
                    {inChallenge ? 'Return To Main Board' : 'Enter Challenge Game'}
                </button>
                <p className="text-[10px] font-medium text-slate-500 text-center leading-normal">
                    Your permanent main board upgrades are safe and untouched. You can toggle back and forth instantly at any time!
                </p>

                {/* Socket Rune/Gem Stash */}
                <div className="p-4 bg-[#141829] border border-cyan-550/20 rounded-xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-mono tracking-widest text-slate-300 uppercase font-black flex items-center gap-1">
                            💎 Reward Gem Sockets
                        </span>
                        <span className="text-[8.5px] px-2 py-0.5 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded font-black animate-pulse">
                            Active
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-black/40 border border-rose-500/25 p-3 rounded-lg text-center flex flex-col items-center justify-center gap-1.5">
                            <img src={assets.getSrc('ruby_gem')} alt="Ruby" className="w-6 h-6 object-contain my-1 select-none pointer-events-none drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                            <div className="text-[10px] font-mono text-slate-300 uppercase font-extrabold mt-1">Ruby</div>
                            <div className="text-base font-black text-rose-400">{gameState.gems?.crimson || 0}</div>
                        </div>
                        <div className="bg-black/40 border border-emerald-500/25 p-3 rounded-lg text-center flex flex-col items-center justify-center gap-1.5">
                            <img src={assets.getSrc('emerald_gem')} alt="Emerald" className="w-6 h-6 object-contain my-1 select-none pointer-events-none drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                            <div className="text-[10px] font-mono text-slate-300 uppercase font-extrabold mt-1">Emerald</div>
                            <div className="text-base font-black text-emerald-400">{gameState.gems?.amber || 0}</div>
                        </div>
                        <div className="bg-black/40 border border-cyan-500/25 p-3 rounded-lg text-center flex flex-col items-center justify-center gap-1.5">
                            <img src={assets.getSrc('diamond_gem')} alt="Diamond" className="w-6 h-6 object-contain my-1 select-none pointer-events-none drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
                            <div className="text-[10px] font-mono text-slate-300 uppercase font-extrabold mt-1">Diamond</div>
                            <div className="text-base font-black text-cyan-400">{gameState.gems?.azure || 0}</div>
                        </div>
                    </div>

                    <p className="text-[9.5px] font-medium text-slate-400 leading-normal">
                        Earn these powerful Gems by hitting Milestone Goals inside the rotating Challenges! Use them immediately as permanent Board Modifiers.
                    </p>

                    {!inChallenge ? (
                        <button 
                            onClick={() => {
                                engine.socketingActive = true;
                                engine.audio.play('upgrade');
                                engine.notify();
                                onClose();
                            }}
                            className="w-full mt-1.5 py-2.5 px-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all select-none"
                        >
                            🛠️ Open Peg Sockets Builder
                        </button>
                    ) : (
                        <button 
                            disabled
                            className="w-full mt-1.5 py-2.5 px-3 bg-zinc-950/40 border border-zinc-800/60 text-zinc-500 font-extrabold text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 select-none cursor-not-allowed"
                        >
                            🚫 Builder Blocked in Challenge Mode
                        </button>
                    )}
                </div>

                {/* Challenge Goals */}
                <div className="space-y-3">
                    <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-black">Challenge Milestone Goals</div>
                    
                    {/* Progress Monitor */}
                    <div className="p-3 bg-black/50 border border-white/5 rounded-lg flex items-center justify-between text-xs">
                        <span className="text-slate-400">Current Sandbox Progress:</span>
                        <span className="font-mono text-amber-400 font-extrabold">
                            {isSandPeg ? `${formatNumber(currentMetricVal)} Broken Pegs` : `$${formatNumber(currentMetricVal)} Challenge Cash`}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {(['bronze', 'silver', 'gold'] as const).map(tier => {
                            const goal = challenge.goals[tier];
                            const isClaimed = goalsStatus[tier];
                            const isAchieved = currentMetricVal >= goal.target;

                            // Only show progress for the next available/upcoming goal
                            let isLocked = false;
                            if (tier === 'silver' && !goalsStatus.bronze && currentMetricVal < challenge.goals.bronze.target) {
                                isLocked = true;
                            }
                            if (tier === 'gold' && (!goalsStatus.silver || !goalsStatus.bronze) && currentMetricVal < challenge.goals.silver.target) {
                                isLocked = true;
                            }

                            const percent = isLocked ? 0 : getGoalProgressPercent(goal.target);
                            
                            const tierColor = tier === 'bronze' ? 'text-amber-700 border-amber-700/30' : (tier === 'silver' ? 'text-slate-400 border-slate-400/30' : 'text-amber-400 border-amber-400/30');

                            return (
                                <div key={tier} className={`p-3 bg-black/30 border border-white/5 rounded-xl space-y-2 relative overflow-hidden ${isClaimed ? 'opacity-60' : ''} ${isLocked ? 'opacity-40' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[10px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full ${tierColor}`}>
                                                {tier}
                                            </span>
                                            <span className="text-xs font-bold text-white">{goal.description}</span>
                                        </div>
                                        {isClaimed ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            isAchieved && <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider animate-bounce">Achieved!</span>
                                        )}
                                    </div>

                                    {/* Progress track */}
                                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden relative">
                                        {isLocked ? (
                                            <div className="h-full w-full bg-white/5 border-t border-dashed border-white/10" />
                                        ) : (
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    tier === 'bronze' ? 'bg-amber-700' : (tier === 'silver' ? 'bg-slate-400' : 'bg-amber-400')
                                                }`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                                        {isLocked ? (
                                            <span className="text-slate-500 italic">🔒 Complete previous goal to unlock</span>
                                        ) : (
                                            <span>{isSandPeg ? formatNumber(currentMetricVal) : `$${formatNumber(currentMetricVal)}`}</span>
                                        )}
                                        <span>Target: {isSandPeg ? formatNumber(goal.target) : `$${formatNumber(goal.target)}`}</span>
                                    </div>

                                    {/* Gift Box Banner */}
                                    <div className="bg-black/40 border-t border-white/5 -mx-3 -mb-3 p-2 text-[9.5px] font-semibold text-slate-400 flex items-center justify-between">
                                        <span>Reward: {goal.rewardDescription}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Debug Panel Accordion */}
                <div className="mt-4 border border-red-500/15 rounded-xl overflow-hidden bg-red-950/5">
                    <button
                        onClick={() => setIsDebugOpen(!isDebugOpen)}
                        className="w-full px-4 py-3 bg-red-950/20 text-[11px] font-bold font-mono text-red-400 hover:bg-red-950/30 transition-all flex justify-between items-center tracking-widest uppercase"
                    >
                        <span>⚙️ Challenge Debug Panel</span>
                        <span>{isDebugOpen ? '▲' : '▼'}</span>
                    </button>
                    {isDebugOpen && (
                        <div className="p-4 space-y-4 border-t border-red-500/15 bg-[#0a0707]/90">
                            {/* Override Dropdown */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                                    Force Selected Challenge:
                                </label>
                                <select
                                    value={localStorage.getItem('plinko_challenge_debug_override') || 'auto'}
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        if (id === 'auto') {
                                            localStorage.removeItem('plinko_challenge_debug_override');
                                        } else {
                                            localStorage.setItem('plinko_challenge_debug_override', id);
                                        }
                                        
                                        // Sync new state
                                        ChallengesManager.checkAndSyncChallengeState(engine.state);
                                        
                                        // Clean active balls
                                        engine.balls = [];
                                        engine.spawnBalls();
                                        
                                        // Update local states
                                        engine.respawnAllPegs();
                                        const rot = ChallengesManager.getRotationInfo();
                                        setRotation(rot);
                                        setActiveId(rot.activeChallengeId);
                                        
                                        engine.saveState();
                                        forceUpdateState();
                                        engine.notify();
                                    }}
                                    className="w-full bg-[#111622] border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-200 outline-none focus:border-amber-500/50 cursor-pointer"
                                >
                                    <option value="auto">Standard Rotation (No Override)</option>
                                    <option value="anti_gravity">Anti-Gravity Dome</option>
                                    <option value="sand_peg">Sand Peg Erosion</option>
                                    <option value="micro_mania">Micro Mania Grid</option>
                                    <option value="single_marble">The One Master</option>
                                    <option value="critical_meltdown">Critical Meltdown</option>
                                </select>
                            </div>

                            {/* Reset Button */}
                            <button
                                onClick={() => {
                                    if (window.confirm("Careful! Are you sure you want to completely reset all upgrades, earnings, and goals for the current challenge? This is irreversible.")) {
                                        engine.state.challengeState = {
                                            challengeId: activeId,
                                            money: 0,
                                            lifetimeEarnings: 0,
                                            pegsBrokenCurrency: 0,
                                            lifetimePegsBroken: 0,
                                            lifetimeMicroMarblesDropped: 0,
                                            upgrades: {
                                                extraBall: activeId === 'micro_mania' ? 0 : 1,
                                                pegValue: 0,
                                                ballSpeed: 0,
                                                basketValue: 0,
                                                uncommonChance: 0,
                                                rareChance: 0,
                                                legendaryChance: 0,
                                                criticalChance: 0,
                                                microValue: 0,
                                                bonusValue: 0,
                                                sandPegMultiplier: 0,
                                                microAutoclicker: 0
                                            },
                                            currentMps: 0,
                                            currentRunPeakMps: 0
                                        };
                                        if (engine.state.challengeGoalClaimed) {
                                            engine.state.challengeGoalClaimed[activeId] = { bronze: false, silver: false, gold: false };
                                        }
                                        engine.balls = [];
                                        engine.spawnBalls();
                                        
                                        engine.saveState();
                                        forceUpdateState();
                                        engine.notify();
                                    }
                                }}
                                className="w-full py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-mono tracking-widest uppercase font-bold transition-all active:scale-95 cursor-pointer"
                            >
                                ⚠️ Reset Current Challenge Data
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
