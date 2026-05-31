import React, { useEffect, useState } from 'react';
import { RefreshCw, Play, Trophy, Shield, ArrowRight } from 'lucide-react';
import { CrazyGamesService } from '../../services/crazyGamesService';
import { engine } from '../../game/engine';
import { formatNumber } from '../../game/utils';

export const LeaderboardModal = ({ onClose }: { onClose: () => void }) => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [peakMps, setPeakMps] = useState<number>(0);

    useEffect(() => {
        const loadUser = async () => {
            const user = await CrazyGamesService.getCurrentUser();
            setCurrentUser(user);
        };
        loadUser();
        if (engine && engine.state) {
            setPeakMps(engine.state.peakMps || 0);
        }
    }, []);

    const handleOpenCrazyGamesLeaderboard = () => {
        CrazyGamesService.showLeaderboard('mps');
    };

    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="confirm-modal leaderboard-modal max-w-md select-none text-white">
                <div className="modal-header-row">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-orange-400 animate-bounce" />
                        </div>
                        <div>
                            <h2 className="column-title daily" style={{ fontSize: '1.4rem', margin: 0, color: '#f97316' }}>
                                Global Rankings
                            </h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold mt-0.5">CrazyGames Leaderboard</p>
                        </div>
                    </div>
                    <button className="close-core" onClick={onClose}>Close</button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Intro Card */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-center leading-relaxed">
                        <p className="text-xs text-slate-300">
                            The pocket plinko world scores are tracked under the official, verified <strong className="text-orange-400 font-extrabold">CrazyGames Leaderboard</strong> database based on your <strong className="text-orange-400 font-black">Peak Cash Output per Second (MPS)</strong>.
                        </p>
                    </div>

                    {/* Stats Summary Panel */}
                    <div className="p-5 bg-black/40 rounded-xl border border-white/5 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-mono uppercase font-bold">Primary Category</span>
                            <span className="text-white font-extrabold px-2 py-0.5 bg-orange-600/20 text-[10px] border border-orange-400/20 rounded font-mono uppercase">Peak $/Sec (MPS)</span>
                        </div>
                        
                        <div className="h-px bg-white/5" />

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <span>⚡</span> <span>Your Checked Best:</span>
                            </div>
                            <strong className="text-md text-emerald-400 font-black">${formatNumber(peakMps)}/s</strong>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <Shield className="w-3.5 h-3.5 text-orange-500/80" /> <span>Synchronization:</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">Continuous Cloud Sync</span>
                        </div>
                    </div>

                    {/* Submit Note */}
                    <p className="text-[10px] text-slate-500 text-center font-medium my-2">
                        Ranks are automatically and securely submitted as you play. Higher prestiges and upgraded pegs accelerate your score!
                    </p>

                    {/* Central Action Button */}
                    <button
                        onClick={handleOpenCrazyGamesLeaderboard}
                        className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.35)] uppercase tracking-wider text-sm active:scale-[0.98] cursor-pointer cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current text-white animate-pulse" />
                        <span>Open Live Leaderboard Overlay</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    
                    <p className="text-[9px] text-slate-600 text-center font-mono uppercase tracking-widest leading-normal">
                        Launches Full Immersive Device Overlay
                    </p>
                </div>
            </div>
        </div>
    );
};
