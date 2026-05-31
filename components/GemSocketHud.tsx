import React, { useState, useEffect } from 'react';
import { engine } from '../game/engine';
import { Sparkles, Wand2, Trash2 } from 'lucide-react';

export const GemSocketHud = ({ onUpdate }: { onUpdate: () => void }) => {
    const [selectedTool, setSelectedTool] = useState<'ruby' | 'emerald' | 'diamond' | 'unsocket'>('ruby');
    const [updater, setUpdater] = useState(0);

    const forceUpdate = () => {
        setUpdater(prev => prev + 1);
        onUpdate();
    };

    useEffect(() => {
        const seen = engine.state.tutorials['plinko_seen_sockets_tutorial_v1'] || localStorage.getItem('plinko_seen_sockets_tutorial_v1');
        if (!seen) {
            window.dispatchEvent(new CustomEvent('request-tutorial', { detail: { key: 'tut_sockets' } }));
        }
    }, []);

    useEffect(() => {
        const handlePegSocketSelected = (e: any) => {
            const index = e.detail?.index;
            if (index === undefined || index === null) return;

            if (selectedTool === 'unsocket') {
                const ok = engine.unsocketGem(index);
                if (ok) {
                    forceUpdate();
                }
            } else {
                const gemKey = selectedTool === 'ruby' ? 'crimson' : (selectedTool === 'diamond' ? 'azure' : 'amber');
                const count = engine.state.gems?.[gemKey] || 0;
                if (count > 0) {
                    const ok = engine.socketGem(index, selectedTool);
                    if (ok) {
                        forceUpdate();
                    }
                } else {
                    engine.audio.play('click');
                    const toolName = selectedTool === 'ruby' ? 'Ruby' : (selectedTool === 'diamond' ? 'Diamond' : 'Emerald');
                    window.dispatchEvent(new CustomEvent('spawn-floating-text', {
                        detail: { 
                            x: window.innerWidth / 2, 
                            y: window.innerHeight / 2, 
                            text: `No ${toolName} gems left!`,
                            type: 'expensive'
                        }
                    }));
                }
            }
        };

        window.addEventListener('peg-socket-selected', handlePegSocketSelected);
        return () => window.removeEventListener('peg-socket-selected', handlePegSocketSelected);
    }, [selectedTool]);

    if (!engine.socketingActive) return null;

    const inventory = engine.state.gems || { crimson: 0, azure: 0, amber: 0 };

    const tools = [
        { type: 'ruby' as const, name: 'Ruby', count: inventory.crimson || 0, color: '#f43f5e', border: 'border-rose-500/40', bg: 'bg-rose-950/20', desc: 'Critical Hit on impact. Multiplies payout heavily!' },
        { type: 'emerald' as const, name: 'Emerald', count: inventory.amber || 0, color: '#10b981', border: 'border-emerald-500/40', bg: 'bg-emerald-950/20', desc: 'Splits incoming marbles into two, doubling flow!' },
        { type: 'diamond' as const, name: 'Diamond', count: inventory.azure || 0, color: '#06b6d4', border: 'border-cyan-500/40', bg: 'bg-cyan-950/20', desc: 'Explodes every 10 hits, cascade-bursting nearby pegs.' },
        { type: 'unsocket' as const, name: 'Unsocket', count: null, color: '#a1a1aa', border: 'border-dashed border-gray-600', bg: 'bg-black/40', desc: 'Click any gemmed peg on the board to retrieve it.' }
    ];

    const activeToolInfo = tools.find(t => t.type === selectedTool);

    return (
        <div 
            id="gem-socket-hud" 
            className="fixed select-none animate-fade-in flex flex-col gap-3 p-4 rounded-xl border border-cyan-500/35 bg-[#121324]/95 shadow-[0_15px_40px_rgba(0,0,0,0.85),_0_0_25px_rgba(6,182,212,0.15)] z-[95] w-[92%] max-w-[360px] bottom-[75px] left-1/2 -translate-x-1/2 md:bottom-auto md:right-4 md:top-1/2 md:-translate-y-1/2 md:left-auto md:translate-x-0 md:w-[280px]"
        >
            <div className="flex items-center justify-between border-b border-gray-800/60 pb-2">
                <span className="text-xs font-black tracking-widest uppercase text-cyan-400 flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                    Peg Sockets Builder
                </span>
                <span className="text-[10px] text-gray-400 italic">Eearned from Challenges</span>
            </div>

            <p className="text-[10.5px] leading-relaxed text-slate-300 text-center bg-black/40 p-1.5 rounded-lg border border-white/5">
                👉 Click any highlight peg socket on the board above to install or remove.
            </p>

            {/* Selection Grid */}
            <div className="grid grid-cols-4 gap-1.5 font-sans">
                {tools.map(t => {
                    const isSelected = selectedTool === t.type;
                    return (
                        <button
                            key={t.type}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all relative cursor-pointer ${
                                isSelected 
                                    ? `bg-cyan-950/40 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.25)]` 
                                    : `${t.bg} ${t.border} opacity-75 hover:opacity-100`
                            }`}
                            onClick={() => {
                                setSelectedTool(t.type);
                                engine.audio.play('click');
                            }}
                        >
                            <span className="text-[10.5px] font-bold" style={{ color: t.color }}>{t.name}</span>
                            {t.count !== null && (
                                <span className="text-[8.5px] font-mono mt-0.5 bg-black/50 px-1 py-0.2 rounded-full border border-white/5 text-gray-300 select-none">
                                    qty: {t.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Selected Tool Details */}
            {activeToolInfo && (
                <div className="p-2.5 bg-black/30 rounded-lg border border-white/5">
                    <div className="text-[10.5px] font-bold" style={{ color: activeToolInfo.color }}>
                        {activeToolInfo.name === 'Unsocket' ? '🧹 Remove Gem Tool' : `💎 ${activeToolInfo.name} Gem`}
                    </div>
                    <div className="text-[9.5px] text-gray-400 mt-0.5 leading-normal font-sans">
                        {activeToolInfo.desc}
                    </div>
                </div>
            )}

            {/* Bottom Actions Menu */}
            <div className="flex gap-2 items-center justify-between border-t border-gray-800/60 pt-2.5">
                <div className="flex gap-1.5">
                    <button 
                        onClick={() => {
                            engine.autoAssignGems();
                            forceUpdate();
                        }}
                        className="flex items-center gap-1 text-[9px] font-extrabold uppercase bg-emerald-950/30 text-emerald-400 border border-emerald-500/30 px-2 py-1.5 rounded-lg hover:bg-emerald-900/40 transition-all select-none cursor-pointer"
                        title="Auto-place empty gem slots on pegs"
                    >
                        < Wand2 className="w-3 h-3" />
                        Auto-Place
                    </button>
                    
                    <button 
                        onClick={() => {
                            engine.clearAllGems();
                            forceUpdate();
                        }}
                        className="flex items-center gap-1 text-[9px] font-extrabold uppercase bg-rose-950/30 text-rose-400 border border-rose-500/30 px-2 py-1.5 rounded-lg hover:bg-rose-900/40 transition-all select-none cursor-pointer"
                    >
                        <Trash2 className="w-3 h-3" />
                        Retrieve All
                    </button>
                </div>

                <button 
                    onClick={() => {
                        engine.socketingActive = false;
                        engine.audio.play('upgrade');
                        forceUpdate();
                    }}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-extrabold uppercase px-4 py-1.5 rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all select-none cursor-pointer"
                >
                    Close Builder
                </button>
            </div>
        </div>
    );
};
