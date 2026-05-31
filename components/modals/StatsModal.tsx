import React, { useEffect, useState } from 'react';
import { engine } from '../../game/engine';
import { formatNumber } from '../../game/utils';
import { CHALLENGES } from '../../game/challenges';

export const StatsModal = ({ onClose }: { onClose: () => void }) => {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const i = setInterval(() => setTick(t => t + 1), 100);
        return () => clearInterval(i);
    }, []);

    const s = engine.state;
    const format = formatNumber;

    if (s.inChallengeMode && s.challengeState) {
        const activeId = s.challengeState.challengeId;
        const def = CHALLENGES[activeId];
        const challengeName = def?.name || "Active Challenge";
        const isSandPeg = activeId === 'sand_peg';
        const goals = s.challengeGoalClaimed[activeId] || { bronze: false, silver: false, gold: false };

        const metricType = def?.goals?.bronze?.metric;
        const currentVal = metricType === 'pegsBroken' 
            ? (s.challengeState.lifetimePegsBroken || 0) 
            : (s.challengeState.lifetimeEarnings || 0);

        const formatMetric = (val: number) => {
            return metricType === 'pegsBroken' ? `${format(val)} Broken` : `$${format(val)}`;
        };

        const activeUpgrades = s.challengeState.upgrades || {};
        const UPGRADE_LABELS: { [key: string]: string } = {
            extraBall: 'Extra Marbles',
            pegValue: 'Peg Value',
            ballSpeed: 'Marble Speed',
            basketValue: 'Basket Multiplier',
            uncommonChance: 'Uncommon Chance',
            rareChance: 'Rare Chance',
            legendaryChance: 'Legendary Chance',
            criticalChance: 'Critical Chance',
            microValue: 'Micro Value',
            bonusValue: 'Bonus Splash Value',
            sandPegMultiplier: 'Broken Peg Yield',
            microAutoclicker: 'Autoclicker Speed'
        };

        return (
            <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="confirm-modal stats-modal max-w-xl">
                    <div style={{display:'flex', alignItems:'center', gap:'12px', justifyContent:'space-between', marginBottom:'15px'}}>
                        <div>
                            <h3 className="text-amber-500 font-extrabold uppercase tracking-wide text-xs flex items-center gap-1">
                                🏆 Challenge Stats
                            </h3>
                            <h2 className="text-xl font-bold leading-tight">{challengeName}</h2>
                        </div>
                        <button className="close-core" onClick={onClose}>Close</button>
                    </div>

                    {/* Medal Goals Column / Panel */}
                    <div className="mb-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">Medal Goal Milestones</h4>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <div className="p-2 bg-neutral-900/60 rounded-lg text-center border border-white/5">
                                <div className="text-[10px] uppercase text-[#b45309] font-bold">Bronze Medal</div>
                                <div className="text-xs font-mono font-bold">{formatMetric(def?.goals?.bronze?.target || 0)}</div>
                                <div className="text-xs mt-1">{goals.bronze ? '✅ Claimed' : '⏳ Pending'}</div>
                            </div>
                            <div className="p-2 bg-neutral-900/60 rounded-lg text-center border border-white/5">
                                <div className="text-[10px] uppercase text-[#94a3b8] font-bold">Silver Medal</div>
                                <div className="text-xs font-mono font-bold">{formatMetric(def?.goals?.silver?.target || 0)}</div>
                                <div className="text-xs mt-1">{goals.silver ? '✅ Claimed' : '⏳ Pending'}</div>
                            </div>
                            <div className="p-2 bg-neutral-900/60 rounded-lg text-center border border-white/5">
                                <div className="text-[10px] uppercase text-[#fbbf24] font-bold">Gold Medal</div>
                                <div className="text-xs font-mono font-bold">{formatMetric(def?.goals?.gold?.target || 0)}</div>
                                <div className="text-xs mt-1">{goals.gold ? '✅ Claimed' : '⏳ Pending'}</div>
                            </div>
                        </div>
                        <div className="text-xs text-amber-200/80 flex justify-between items-center px-1 font-mono">
                            <span>Current Progress:</span>
                            <span className="font-extrabold text-amber-400">{formatMetric(currentVal)}</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Active Challenge Metrics</h4>
                    <div className="stats-grid mb-4">
                        {isSandPeg ? (
                            <>
                                <div className="stat-tile">
                                    <div className="stat-label">Broken Pegs (Currency)</div>
                                    <div className="stat-value text-amber-400">{format(s.challengeState.pegsBrokenCurrency || 0)}</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-label">Total Broken Pegs</div>
                                    <div className="stat-value text-amber-400">{format(s.challengeState.lifetimePegsBroken || 0)}</div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="stat-tile">
                                    <div className="stat-label">Challenge Cash</div>
                                    <div className="stat-value text-amber-400">${format(s.challengeState.money || 0)}</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-label">Lifetime Earnings</div>
                                    <div className="stat-value text-amber-400">${format(s.challengeState.lifetimeEarnings || 0)}</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-label">Peak Cash/s</div>
                                    <div className="stat-value">${format(s.challengeState.currentRunPeakMps || 0)}/s</div>
                                </div>
                            </>
                        )}
                        <div className="stat-tile">
                            <div className="stat-label">Micro Marbles Dropped</div>
                            <div className="stat-value">{format(s.challengeState.lifetimeMicroMarblesDropped || 0)}</div>
                        </div>
                        <div className="stat-tile">
                            <div className="stat-label">Career-Wallet Cash</div>
                            <div className="stat-value text-emerald-400">${format(s.money)}</div>
                        </div>
                        <div className="stat-tile">
                            <div className="stat-label">Kinetic Shards</div>
                            <div className="stat-value text-cyan-400">{format(s.kineticShards)}</div>
                        </div>
                    </div>

                    {/* Challenge Upgrades bought list */}
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Challenge Upgrades Purchased</h4>
                    <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                        {Object.entries(activeUpgrades).map(([key, level]) => {
                            if (typeof level !== 'number' || level <= 0) return null;
                            const label = UPGRADE_LABELS[key] || key;
                            return (
                                <div key={key} className="flex justify-between items-center p-2 rounded-lg bg-neutral-900/40 border border-white/5 text-xs">
                                    <span className="text-neutral-300 font-medium">{label}</span>
                                    <span className="font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold">Lvl {level}</span>
                                </div>
                            );
                        })}
                        {Object.values(activeUpgrades).every(lvl => lvl === 0) && (
                            <div className="col-span-2 text-center text-xs text-neutral-500 py-3 italic">
                                No upgrades purchased in this challenge yet!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const ownedArr = Array.isArray(s.ownedMarbles) ? s.ownedMarbles : [];
    const ownedCount = ownedArr.length;
    const totalMasterMultiplier = 1 + (s.masterMultiplier || 0) + (s.derivedMasterBonus || 0);
    const totalIncomeBoost = (s.permanentIncomeBoostPercent || 0) + (s.derivedIncomeBoostPercent || 0);
    const timeSecs = Math.floor(s.totalPlayTime || 0);
    const hh = Math.floor(timeSecs / 3600);
    const mm = Math.floor((timeSecs % 3600) / 60);
    const ss = timeSecs % 60;
    const timeStr = `${hh}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;

    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="confirm-modal stats-modal">
                <div style={{display:'flex', alignItems:'center', gap:'12px', justifyContent:'space-between', marginBottom:'15px'}}>
                    <h3>Player Stats</h3>
                    <button className="close-core" onClick={onClose}>Close</button>
                </div>
                <div className="stats-grid">
                    <div className="stat-tile"><div className="stat-label">Lifetime (This Run)</div><div className="stat-value" style={{color:'#ffd700'}}>${format(s.lifetimeEarnings)}</div></div>
                    <div className="stat-tile"><div className="stat-label">All-Time $</div><div className="stat-value" style={{color:'#ffd700'}}>${format(s.allTimeEarnings || 0)}</div></div>
                    <div className="stat-tile"><div className="stat-label">Peak $/s (This Run)</div><div className="stat-value">${format(s.currentRunPeakMps || 0)}/s</div></div>
                    <div className="stat-tile"><div className="stat-label">Peak $/s (All-Time)</div><div className="stat-value">${format(s.peakMps)}/s</div></div>
                    <div className="stat-tile"><div className="stat-label">Times Prestiged</div><div className="stat-value">{s.timesPrestiged}</div></div>
                    <div className="stat-tile"><div className="stat-label">Kinetic Shards</div><div className="stat-value" style={{color:'#00ffff'}}>{format(s.kineticShards)}</div></div>
                    <div className="stat-tile"><div className="stat-label">Master Multiplier</div><div className="stat-value">x{format(totalMasterMultiplier)}</div></div>
                    <div className="stat-tile"><div className="stat-label">Income Boost</div><div className="stat-value">{totalIncomeBoost}%</div></div>
                    <div className="stat-tile"><div className="stat-label">Micro Value</div><div className="stat-value">{1 + (s.microValuePercent || 0) + (s.permanentMicroBoostPercent || 0)}%</div></div>
                    <div className="stat-tile"><div className="stat-label">Bonus Chance</div><div className="stat-value">{Math.round((s.bonusChance || 0.5) * 100)}%</div></div>
                    <div className="stat-tile"><div className="stat-label">Skins Owned</div><div className="stat-value">{ownedCount}</div></div>
                    <div className="stat-tile"><div className="stat-label">Daily Missions</div><div className="stat-value">{s.dailyCompleted || 0}</div></div>
                    <div className="stat-tile"><div className="stat-label">Repeatable Missions</div><div className="stat-value">{s.repeatableCompleted || 0}</div></div>
                    <div className="stat-tile"><div className="stat-label">Achievements Unlocked</div><div className="stat-value">{s.achievementsUnlocked || 0}</div></div>
                    <div className="stat-tile"><div className="stat-label">Total Play Time</div><div className="stat-value">{timeStr}</div></div>
                </div>
            </div>
        </div>
    );
};
