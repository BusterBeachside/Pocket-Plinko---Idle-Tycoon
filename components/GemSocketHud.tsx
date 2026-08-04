import React, { useState, useEffect } from 'react';
import { engine } from '../game/engine';
import { Sparkles, Wand2, Trash2, Eye, EyeOff, Ban, ArrowUp, ArrowDown, Minimize2, Maximize2, X } from 'lucide-react';
import { assets } from '../game/assets';

export const GemSocketHud = ({ onUpdate }: { onUpdate: () => void }) => {
    const [selectedTool, setSelectedTool] = useState<'ruby' | 'emerald' | 'diamond' | 'unsocket'>('ruby');
    const [dockPosition, setDockPosition] = useState<'bottom' | 'top'>(() => {
        return (localStorage.getItem('plinko_socket_hud_dock') as 'bottom' | 'top') || 'bottom';
    });
    const [isMinimized, setIsMinimized] = useState<boolean>(() => {
        return localStorage.getItem('plinko_socket_hud_minimized') === 'true';
    });
    const [updater, setUpdater] = useState(0);

    const forceUpdate = () => {
        setUpdater(prev => prev + 1);
        onUpdate();
    };

    const toggleDock = () => {
        const next = dockPosition === 'bottom' ? 'top' : 'bottom';
        setDockPosition(next);
        localStorage.setItem('plinko_socket_hud_dock', next);
        engine.audio.play('click');
    };

    const toggleMinimize = () => {
        const next = !isMinimized;
        setIsMinimized(next);
        localStorage.setItem('plinko_socket_hud_minimized', String(next));
        engine.audio.play('click');
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

    const items = [
        { 
            type: 'ruby' as const, 
            name: 'RUBY', 
            count: inventory.crimson || 0, 
            color: '#f43f5e', 
            textColor: 'text-rose-400',
            bg: 'bg-[#180e15]',
            borderColor: 'border-rose-500/25',
            glowColor: 'rgba(244,63,94,0.35)',
            activeBorder: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] bg-[#280a13]',
            imgKey: 'ruby_gem' as const,
            desc: 'Critical Hit on impact. Multiplies payout heavily!'
        },
        { 
            type: 'emerald' as const, 
            name: 'EMERALD', 
            count: inventory.amber || 0, 
            color: '#10b981', 
            textColor: 'text-emerald-400',
            bg: 'bg-[#0d1612]',
            borderColor: 'border-emerald-500/25',
            glowColor: 'rgba(16,185,129,0.35)',
            activeBorder: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] bg-[#052618]',
            imgKey: 'emerald_gem' as const,
            desc: 'Splits incoming marbles into two, doubling flow!'
        },
        { 
            type: 'diamond' as const, 
            name: 'DIAMOND', 
            count: inventory.azure || 0, 
            color: '#06b6d4', 
            textColor: 'text-cyan-400',
            bg: 'bg-[#0a161f]',
            borderColor: 'border-cyan-500/25',
            glowColor: 'rgba(6,182,212,0.35)',
            activeBorder: 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] bg-[#032338]',
            imgKey: 'diamond_gem' as const,
            desc: 'Explodes every 10 hits, cascade-bursting nearby pegs.'
        }
    ];

    const currentSelectedDesc = selectedTool === 'unsocket' 
        ? 'Click any gemmed peg on the board to retrieve it.' 
        : items.find(i => i.type === selectedTool)?.desc;

    // Dynamic position class based on dockPosition (Top vs Bottom)
    const positionClass = dockPosition === 'top'
        ? 'top-[70px] left-1/2 -translate-x-1/2 md:top-20 md:right-4 md:left-auto md:translate-x-0'
        : 'bottom-[75px] left-1/2 -translate-x-1/2 md:bottom-auto md:right-4 md:top-1/2 md:-translate-y-1/2 md:left-auto md:translate-x-0';

    if (isMinimized) {
        return (
            <div 
                id="gem-socket-hud-compact"
                className={`fixed select-none animate-fade-in flex items-center gap-1.5 p-2 rounded-xl border border-cyan-500/40 bg-[#0d101d]/95 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.85)] z-[95] ${positionClass}`}
            >
                {/* Tool Selector Buttons */}
                <div className="flex items-center gap-1">
                    {items.map(t => {
                        const isSelected = selectedTool === t.type;
                        return (
                            <button
                                key={t.type}
                                onClick={() => {
                                    setSelectedTool(t.type);
                                    engine.audio.play('click');
                                    forceUpdate();
                                }}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                                    isSelected 
                                        ? `${t.activeBorder}` 
                                        : `${t.bg} ${t.borderColor} hover:border-white/30`
                                }`}
                                title={`${t.name} (${t.count})`}
                            >
                                <img src={assets.getSrc(t.imgKey)} alt={t.name} className="w-4 h-4 object-contain" />
                                <span className={t.textColor}>{t.count}</span>
                            </button>
                        );
                    })}

                    {/* Unsocket Tool */}
                    <button
                        onClick={() => {
                            setSelectedTool('unsocket');
                            engine.audio.play('click');
                            forceUpdate();
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                            selectedTool === 'unsocket'
                                ? 'bg-amber-500/30 text-amber-300 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                                : 'bg-black/40 text-slate-300 border-white/10 hover:border-white/20'
                        }`}
                        title="Unsocket Eraser Tool"
                    >
                        <Ban className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Unsocket</span>
                    </button>
                </div>

                <div className="h-5 w-[1px] bg-white/15 mx-0.5" />

                {/* Move Top / Bottom Toggle */}
                <button
                    onClick={toggleDock}
                    className="p-1.5 rounded-lg bg-black/40 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    title={dockPosition === 'bottom' ? 'Move HUD to Top' : 'Move HUD to Bottom'}
                >
                    {dockPosition === 'bottom' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </button>

                {/* Expand Panel */}
                <button
                    onClick={toggleMinimize}
                    className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all cursor-pointer"
                    title="Expand Full Gem Panel"
                >
                    <Maximize2 className="w-3.5 h-3.5" />
                </button>

                {/* Close Builder */}
                <button
                    onClick={() => {
                        engine.socketingActive = false;
                        engine.hideMarbles = false;
                        engine.audio.play('upgrade');
                        forceUpdate();
                    }}
                    className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 transition-all cursor-pointer"
                    title="Close Socket Builder"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    return (
        <div 
            id="gem-socket-hud" 
            className={`fixed select-none animate-fade-in flex flex-col gap-3.5 p-4 rounded-xl border border-white/20 bg-[#0d101d]/95 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-[95] w-[92%] max-w-[390px] ${positionClass} md:w-[320px]`}
        >
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-black tracking-[0.12em] uppercase text-slate-200 flex items-center gap-2">
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-[#22d3ee]">💎</span>
                    REWARD GEM SOCKETS
                </span>

                <div className="flex items-center gap-1.5">
                    {/* Position Dock Toggle */}
                    <button
                        onClick={toggleDock}
                        className="p-1 bg-black/40 border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-all cursor-pointer flex items-center justify-center"
                        title={dockPosition === 'bottom' ? 'Move panel to top' : 'Move panel to bottom'}
                    >
                        {dockPosition === 'bottom' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Minimize Toggle */}
                    <button
                        onClick={toggleMinimize}
                        className="p-1 bg-black/40 border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-all cursor-pointer flex items-center justify-center"
                        title="Minimize panel to small bar"
                    >
                        <Minimize2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Close / Active indicator */}
                    <button 
                        onClick={() => {
                            engine.socketingActive = false;
                            engine.hideMarbles = false;
                            engine.audio.play('upgrade');
                            forceUpdate();
                        }}
                        className="text-[9px] px-2 py-1 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/40 text-[#10b981] hover:bg-emerald-500/20 rounded font-black transition-all cursor-pointer select-none"
                        title="Socket mode active. Click to close."
                    >
                        ACTIVE
                    </button>
                </div>
            </div>

            {/* Three Grid Boxes */}
            <div className="grid grid-cols-3 gap-2 font-sans">
                {items.map(t => {
                    const isSelected = selectedTool === t.type;
                    return (
                        <div
                            key={t.type}
                            onClick={() => {
                                setSelectedTool(t.type);
                                engine.audio.play('click');
                                forceUpdate();
                            }}
                            className={`p-3 rounded-lg text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all border relative select-none ${
                                isSelected 
                                    ? t.activeBorder 
                                    : `${t.bg} ${t.borderColor} hover:border-[#ffffff40] hover:scale-[1.02]`
                            }`}
                            style={{
                                boxShadow: isSelected ? `0 0 16px ${t.glowColor}` : 'none'
                            }}
                        >
                            <img 
                                src={assets.getSrc(t.imgKey)} 
                                alt={t.name} 
                                className="w-6 h-6 object-contain my-1 select-none pointer-events-none drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]" 
                            />
                            <div className="text-[9.5px] font-mono tracking-wider text-slate-300 font-extrabold mt-1">{t.name}</div>
                            <div className={`text-base font-black ${t.textColor}`}>{t.count}</div>

                            {isSelected && (
                                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Description Text */}
            <p className="text-[9.5px] font-medium text-slate-400 leading-normal text-left px-1">
                Earn these powerful Gems by hitting Milestone Goals inside the rotating Challenges! Use them immediately as permanent Board Modifiers.
            </p>

            {/* Tool Instruction & Description Box */}
            <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 flex flex-col gap-0.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                    {selectedTool === 'unsocket' ? '🧹 ACTIVE TOOL: UNSOCKET' : `🎯 ACTIVE SOCKET: ${selectedTool.toUpperCase()}`}
                </div>
                <div className="text-[9.5px] text-gray-400 mt-0.5 leading-normal">
                    {currentSelectedDesc}
                </div>
                <div className="text-[9.2px] text-cyan-400 font-extrabold mt-1">
                    👉 {selectedTool === 'unsocket' ? 'Click any gemmed peg on board to retrieve.' : 'Click highlight peg on board to install gem.'}
                </div>
            </div>

            {/* Compact Auxiliary Tools & Actions Bar */}
            <div className="flex flex-col gap-2 pt-1 border-t border-gray-800/60">
                <div className="flex gap-1.5 justify-between">
                    <button
                        onClick={() => {
                            setSelectedTool('unsocket');
                            engine.audio.play('click');
                            forceUpdate();
                        }}
                        className={`flex-1 flex items-center justify-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg border transition-all select-none cursor-pointer ${
                            selectedTool === 'unsocket'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                                : 'bg-black/35 text-slate-300 border-white/5 hover:border-white/15'
                        }`}
                        title="Switch to Unsocket Eraser Tool"
                    >
                        <Ban className="w-3 h-3" />
                        Unsocket
                    </button>

                    <button
                        onClick={() => {
                            engine.hideMarbles = !engine.hideMarbles;
                            engine.audio.play('click');
                            forceUpdate();
                        }}
                        className={`flex-1 flex items-center justify-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
                            engine.hideMarbles 
                                ? 'bg-[#3b0712] text-rose-400 border-rose-500' 
                                : 'bg-[#0a2315] text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60'
                        }`}
                        title="Toggles marble drawing to easily place sockets"
                    >
                        {engine.hideMarbles ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {engine.hideMarbles ? 'Hidden' : 'Showing'}
                    </button>
                </div>

                <div className="flex gap-1.5 justify-between">
                    <button 
                        onClick={() => {
                            engine.autoAssignGems();
                            forceUpdate();
                        }}
                        className="flex-1 flex items-center justify-center gap-1 text-[9px] font-extrabold uppercase bg-emerald-950/30 text-[#34d399] border border-emerald-550/30 px-2.5 py-1.5 rounded-lg hover:bg-[#064e3b]/40 transition-all select-none cursor-pointer"
                        title="Auto-place empty gem slots on pegs"
                    >
                        <Wand2 className="w-3 h-3" />
                        Auto-Place
                    </button>
                    
                    <button 
                        onClick={() => {
                            engine.clearAllGems();
                            forceUpdate();
                        }}
                        className="flex-1 flex items-center justify-center gap-1 text-[9px] font-extrabold uppercase bg-rose-950/30 text-[#f87171] border border-rose-550/30 px-2.5 py-1.5 rounded-lg hover:bg-rose-900/40 transition-all select-none cursor-pointer"
                    >
                        <Trash2 className="w-3 h-3" />
                        Retrieve All
                    </button>
                </div>
            </div>

            {/* Bottom Actions Menu */}
            <div className="flex gap-2 items-center justify-center pt-1.5 border-t border-gray-800/40">
                <button 
                    onClick={() => {
                        engine.socketingActive = false;
                        engine.hideMarbles = false;
                        engine.audio.play('upgrade');
                        forceUpdate();
                    }}
                    className="w-full bg-[#1b233a] hover:bg-[#232c4b] border border-white/10 text-slate-200 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-all select-none cursor-pointer text-center"
                >
                    Close Builder
                </button>
            </div>
        </div>
    );
};
