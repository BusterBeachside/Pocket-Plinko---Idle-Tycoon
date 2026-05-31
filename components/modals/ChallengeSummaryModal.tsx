import React from 'react';
import { ChallengeSummary } from '../../game/types';
import { formatNumber } from '../../game/utils';

interface ChallengeSummaryModalProps {
    summary: ChallengeSummary;
    onClose: () => void;
}

export const ChallengeSummaryModal = ({ summary, onClose }: ChallengeSummaryModalProps) => {
    const isSandPeg = summary.challengeId === 'sand_peg';
    const metricLabel = isSandPeg ? 'Broken Pegs' : 'Challenge Cash';
    const formattedValue = isSandPeg ? formatNumber(summary.finalValue) : `$${formatNumber(summary.finalValue)}`;

    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="confirm-modal max-w-lg w-full flex flex-col gap-6 text-center animate-fade-in" style={{ padding: '30px', borderRadius: '16px', background: '#2c3e50', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex flex-col gap-2">
                    <span className="text-amber-400 font-extrabold text-xs uppercase tracking-widest">🏆 Challenge Rotation Complete</span>
                    <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{summary.challengeName}</h2>
                    <p className="text-gray-300 text-xs px-4">
                        The previous challenge cycle has ended. Here are your final stats and milestones claimed!
                    </p>
                </div>

                {/* Score Stats Panel */}
                <div className="bg-black/20 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center gap-1">
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Final Achievement Level</span>
                    <span className="text-3xl font-black tracking-tight text-white">{formattedValue}</span>
                    <span className="text-xs text-amber-400 font-mono font-medium">{metricLabel}</span>
                </div>

                {/* Achievement Medals Grid */}
                <div className="flex flex-col gap-3 text-left">
                    <span className="text-gray-400 text-[10px] uppercase font-black tracking-wider border-b border-white/5 pb-1 block">Milestones & Career Rewards</span>
                    
                    <div className="flex flex-col gap-2.5">
                        {/* Bronze Medal */}
                        <div className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                            summary.medalsClaimed.bronze 
                                ? 'bg-amber-950/20 border-amber-800/40' 
                                : 'bg-black/20 border-white/5 opacity-40'
                        }`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                                summary.medalsClaimed.bronze 
                                    ? 'bg-amber-700 text-amber-50 shadow-[0_0_12px_rgba(180,83,9,0.3)]' 
                                    : 'bg-white/10 text-white/30'
                            }`}>
                                B
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className={`text-xs font-bold ${summary.medalsClaimed.bronze ? 'text-amber-400' : 'text-gray-500'}`}>Bronze Milestone</span>
                                <span className="text-[10px] text-gray-300 font-mono truncate">Reward: +$100K main Cash, +10 Shards</span>
                            </div>
                            <div className="ml-auto shrink-0">
                                {summary.medalsClaimed.bronze ? (
                                    <span className="text-[9px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-black font-sans uppercase">Earned</span>
                                ) : (
                                    <span className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded font-bold font-sans uppercase">Locked</span>
                                )}
                            </div>
                        </div>

                        {/* Silver Medal */}
                        <div className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                            summary.medalsClaimed.silver 
                                ? 'bg-slate-800/30 border-slate-600/40' 
                                : 'bg-black/20 border-white/5 opacity-40'
                        }`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                                summary.medalsClaimed.silver 
                                    ? 'bg-slate-500 text-slate-100 shadow-[0_0_12px_rgba(148,163,184,0.3)]' 
                                    : 'bg-white/10 text-white/30'
                            }`}>
                                S
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className={`text-xs font-bold ${summary.medalsClaimed.silver ? 'text-slate-300' : 'text-gray-500'}`}>Silver Milestone</span>
                                <span className="text-[10px] text-gray-300 font-mono truncate">Reward: +$5M Cash, +50 Shards, +1 Crimson Rune</span>
                            </div>
                            <div className="ml-auto shrink-0">
                                {summary.medalsClaimed.silver ? (
                                    <span className="text-[9px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-black font-sans uppercase">Earned</span>
                                ) : (
                                    <span className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded font-bold font-sans uppercase">Locked</span>
                                )}
                            </div>
                        </div>

                        {/* Gold Medal */}
                        <div className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                            summary.medalsClaimed.gold 
                                ? 'bg-yellow-950/20 border-yellow-800/40' 
                                : 'bg-black/20 border-white/5 opacity-40'
                        }`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                                summary.medalsClaimed.gold 
                                    ? 'bg-yellow-500 text-yellow-950 shadow-[0_0_15px_rgba(251,191,36,0.4)]' 
                                    : 'bg-white/10 text-white/30'
                            }`}>
                                G
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className={`text-xs font-bold ${summary.medalsClaimed.gold ? 'text-yellow-400' : 'text-gray-500'}`}>Gold Milestone</span>
                                <span className="text-[10px] text-gray-300 font-mono truncate">Reward: +$1B Cash, +200 Shards, +1 Amber Rune</span>
                            </div>
                            <div className="ml-auto shrink-0">
                                {summary.medalsClaimed.gold ? (
                                    <span className="text-[9px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-black font-sans uppercase">Earned</span>
                                ) : (
                                    <span className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded font-bold font-sans uppercase">Locked</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 items-center">
                    <p className="text-gray-300 text-[10.5px] leading-relaxed">
                        Earned milestone rewards are already fully credited to your main career account. We will now return to Career mode so the system reset can finalize!
                    </p>
                    <button 
                        style={{
                            background: '#fbbf24', 
                            color: '#1e293b', 
                            border: 'none', 
                            padding: '13px 28px', 
                            borderRadius: '8px', 
                            fontWeight: '900', 
                            fontSize: '1rem', 
                            cursor: 'pointer',
                            boxShadow: '0 4px 0 #d97706', 
                            transition: 'transform 0.1s'
                        }} 
                        onClick={onClose} 
                        className="active-btn w-full hover:scale-[1.01] tracking-wide"
                    >
                        OK - Go to Career Mode
                    </button>
                </div>
            </div>
        </div>
    );
};
