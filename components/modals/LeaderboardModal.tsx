import React, { useEffect, useState } from 'react';
import { RefreshCw, Trophy, Shield, Medal, Clock, ShieldCheck, Hourglass } from 'lucide-react';
import { UnderdogService } from '../../services/underdogService';
import { engine } from '../../game/engine';
import { formatNumber } from '../../game/utils';
import { AvatarDisplay } from '../AvatarDisplay';
import { WebsimAdBanner } from '../WebsimAdBanner';

export const LeaderboardModal = ({ onClose }: { onClose: () => void }) => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [peakMps, setPeakMps] = useState<number>(0);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Hover tooltip states
    const [hoveredEntry, setHoveredEntry] = useState<any | null>(null);
    const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const loadUserAndData = async () => {
            const user = await UnderdogService.getCurrentUser();
            setCurrentUser(user);
            
            setLoading(true);
            const data = await UnderdogService.getLeaderboard('mps', 50);
            setLeaderboard(data);
            setLoading(false);
        };
        loadUserAndData();
        
        if (engine && engine.state) {
            setPeakMps(engine.state.peakMps || 0);
        }
    }, []);

    const formatPlayTime = (seconds?: number) => {
        if (!seconds) return '0s';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="confirm-modal leaderboard-modal max-w-md w-full max-h-[80vh] flex flex-col select-none text-white relative">
                <div className="modal-header-row shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-orange-400 animate-bounce" />
                        </div>
                        <div>
                            <h2 className="column-title daily" style={{ fontSize: '1.4rem', margin: 0, color: '#f97316' }}>
                                Global Rankings
                            </h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold mt-0.5">
                                {UnderdogService.isWebsim() ? 'Websim Global Leaderboard' : 'Underdog Leaderboard'}
                            </p>
                        </div>
                    </div>
                    <button className="close-core" onClick={onClose}>Close</button>
                </div>

                <div className="p-4 shrink-0 border-b border-white/5 space-y-3">
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-mono uppercase font-bold">Category</span>
                            <span className="text-white font-extrabold px-2 py-0.5 bg-orange-600/20 text-[10px] border border-orange-400/20 rounded font-mono uppercase">Peak $/Sec (MPS)</span>
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <span>⚡</span> <span>Your Best:</span>
                            </div>
                            <strong className="text-sm text-emerald-400 font-black">${formatNumber(peakMps)}/s</strong>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="h-40 flex flex-col items-center justify-center text-slate-500">
                            <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                            <span className="text-xs font-mono uppercase">Loading Database...</span>
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-slate-500 text-sm font-medium">
                            No entries found yet. Be the first!
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {leaderboard.map((entry, index) => {
                                const isSelf = currentUser?.username === entry.username;
                                return (
                                    <div 
                                        key={index} 
                                        onMouseEnter={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setHoveredRect(rect);
                                            setHoveredEntry(entry);
                                        }}
                                        onMouseLeave={() => {
                                            setHoveredRect(null);
                                            setHoveredEntry(null);
                                        }}
                                        className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-crosshair ${
                                            isSelf 
                                                ? 'bg-orange-500/10 border-orange-500/30' 
                                                : 'bg-black/30 border-white/5 hover:bg-black/50 hover:border-white/15'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                                                index === 0 ? 'bg-yellow-500 text-yellow-950' :
                                                index === 1 ? 'bg-slate-300 text-slate-800' :
                                                index === 2 ? 'bg-amber-700 text-amber-100' :
                                                'bg-white/5 text-slate-400'
                                            }`}>
                                                {index < 3 ? <Medal className="w-4 h-4" /> : `#${index + 1}`}
                                            </div>
                                            
                                            {/* Beautiful custom avatar display column */}
                                            <div className="shrink-0 ring-1 ring-white/10 rounded-full">
                                                <AvatarDisplay 
                                                    avatarId={entry.avatarUrl || 'marble_white'} 
                                                    size={24} 
                                                    ownedSkins={engine.state.ownedMarbles}
                                                />
                                            </div>

                                            <span className={`font-semibold text-sm ${
                                                isSelf ? 'text-orange-400 font-extrabold' : 'text-slate-200'
                                            }`}>
                                                {entry.username.substring(0, 16)}{entry.username.length > 16 ? '...' : ''}
                                            </span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-black text-emerald-400 text-sm">
                                                ${formatNumber(entry.score)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Floating Detailed Stats Tooltip Window */}
                {hoveredEntry && hoveredRect && (
                    <div 
                        style={isMobile ? {
                            position: 'fixed',
                            bottom: '24px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 'calc(100vw - 32px)',
                            maxWidth: '380px'
                        } : {
                            position: 'fixed',
                            top: Math.max(100, Math.min(window.innerHeight - 260, hoveredRect.top + hoveredRect.height / 2)),
                            left: hoveredRect.right + 12,
                            transform: 'translateY(-50%)',
                            width: '270px'
                        }}
                        className="z-[5000] bg-[#1a1b1e] border border-orange-500/40 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.85)] p-4 text-white pointer-events-none animate-fadeIn flex flex-col gap-3.5"
                    >
                        {/* Tooltip Header to Inspect Player */}
                        <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/5">
                            <AvatarDisplay 
                                avatarId={hoveredEntry.avatarUrl || 'marble_white'} 
                                size={32} 
                                ownedSkins={engine.state.ownedMarbles}
                            />
                            <div>
                                <h4 className="text-xs font-black text-orange-400 uppercase tracking-tight truncate max-w-[180px]">
                                    {hoveredEntry.username}
                                </h4>
                                <p className="text-[9px] text-slate-500 font-mono uppercase font-semibold">Player Statistics</p>
                            </div>
                        </div>

                        {/* Detailed Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2 text-left">
                            <div className="p-2 bg-black/40 rounded-lg border border-white/5 flex flex-col justify-center">
                                <span className="text-[8px] text-slate-500 font-mono uppercase">Times Prestiged</span>
                                <span className="text-xs font-black text-slate-200 mt-0.5">
                                    🏆 {hoveredEntry.metadata?.timesPrestiged ?? 0}
                                </span>
                            </div>
                            <div className="p-2 bg-black/40 rounded-lg border border-white/5 flex flex-col justify-center">
                                <span className="text-[8px] text-slate-500 font-mono uppercase">Master Multi</span>
                                <span className="text-xs font-black text-orange-400 mt-0.5">
                                    ⚡ x{(hoveredEntry.metadata?.masterMultiplier ?? 1).toFixed(1)}
                                </span>
                            </div>
                            <div className="p-2 bg-black/40 rounded-lg border border-white/5 flex flex-col justify-center">
                                <span className="text-[8px] text-slate-500 font-mono uppercase">Income Boost</span>
                                <span className="text-xs font-black text-emerald-400 mt-0.5">
                                    📈 +{formatNumber((hoveredEntry.metadata?.permanentIncomeBoostPercent || 0) + (hoveredEntry.metadata?.derivedIncomeBoostPercent || 0))}%
                                </span>
                            </div>
                            <div className="p-2 bg-black/40 rounded-lg border border-white/5 flex flex-col justify-center">
                                <span className="text-[8px] text-slate-500 font-mono uppercase">Owned Skins</span>
                                <span className="text-xs font-black text-blue-400 mt-0.5">
                                    🎨 {hoveredEntry.metadata?.ownedMarblesCount ?? 1} / 50
                                </span>
                            </div>
                            <div className="p-2 bg-black/40 rounded-lg border border-white/5 flex flex-col justify-center">
                                <span className="text-[8px] text-slate-500 font-mono uppercase">Peg Hits / Baskets</span>
                                <span className="text-xs font-black text-amber-300 mt-0.5">
                                    🎯 {formatNumber(hoveredEntry.metadata?.lifetimePegHits || 0)} / {formatNumber(hoveredEntry.metadata?.lifetimeBaskets || 0)}
                                </span>
                            </div>
                            <div className="p-2 bg-black/40 rounded-lg border border-white/5 flex flex-col justify-center">
                                <span className="text-[8px] text-slate-500 font-mono uppercase">Crits / Micro Drops</span>
                                <span className="text-xs font-black text-red-400 mt-0.5">
                                    ⚡ {formatNumber(hoveredEntry.metadata?.lifetimeCriticalHits || 0)} / {formatNumber(hoveredEntry.metadata?.lifetimeMicroMarbles || 0)}
                                </span>
                            </div>
                            <div className="p-2 bg-black/40 rounded-lg border border-white/5 flex flex-col justify-center col-span-2">
                                <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono uppercase">
                                    <span>Sync Age</span>
                                    <span>Play Duration</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-black mt-0.5">
                                    <span className="text-[#bfdbfe] text-[10px] flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-[#3b82f6]" /> Live Sync
                                    </span>
                                    <span className="text-slate-300 font-mono">
                                        {formatPlayTime(hoveredEntry.metadata?.totalPlayTime)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {hoveredEntry.metadata?.kineticShards > 0 && (
                            <div className="px-2 py-1.5 bg-purple-950/20 border border-purple-500/20 rounded-lg text-left flex justify-between items-center font-mono">
                                <span className="text-[8px] text-purple-400 uppercase font-black">Shards Banked</span>
                                <span className="text-[11px] font-black text-purple-300">
                                    💎 {hoveredEntry.metadata.kineticShards}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <WebsimAdBanner id="websim-ad-leaderboard-modal" type="banner" style={{ marginTop: '12px' }} />
            </div>
        </div>
    );
};
