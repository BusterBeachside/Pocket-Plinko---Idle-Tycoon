
import React, { useState } from 'react';
import { assets, ASSET_PATHS } from '../game/assets';

export const TutorialOverlay = ({ onClose, imageKey }: { onClose: () => void, imageKey?: keyof typeof ASSET_PATHS }) => {
    const [step, setStep] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    // Standard sequence if no specific key provided
    const sequence: (keyof typeof ASSET_PATHS)[] = ['tut_play', 'tut_micro'];
    
    // If imageKey provided, we only show that one.
    const activeKey = imageKey || sequence[step];

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isClosing) return;

        if (imageKey) {
            triggerClose();
        } else {
            if (step < sequence.length - 1) {
                setStep(s => s + 1);
            } else {
                triggerClose();
            }
        }
    };

    const triggerClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300); // Matches CSS transition time
    };

    const currentSrc = assets.getSrc(activeKey);

    if (activeKey === 'tut_sockets') {
        return (
            <div className="tutorial-overlay">
                <div 
                    className={`tutorial-card pop-in ${isClosing ? 'pop-out' : 'show'} bg-[#121324] border border-cyan-500/40 text-white p-6 max-w-[420px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9),_0_0_30px_rgba(6,182,212,0.15)] flex flex-col items-center gap-4 select-none`}
                    style={{ maxHeight: '90vh', overflowY: 'auto' }}
                >
                    <div className="text-center">
                        <h2 className="text-xl font-black text-cyan-400 tracking-wider flex items-center justify-center gap-1.5 uppercase mt-1 font-mono">
                            💎 Peg Sockets Builder
                        </h2>
                        <p className="text-[11px] text-zinc-400 font-sans tracking-wide mt-1">
                            Customize Your Board with Powerful Hex-Gems
                        </p>
                    </div>

                     <div className="w-full flex flex-col gap-3 my-1">
                        {/* Ruby */}
                        <div className="flex items-start gap-3 bg-rose-950/15 border border-rose-500/20 p-2.5 rounded-xl">
                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-rose-950/40 rounded-lg border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.35)]">
                                <img src={assets.getSrc('ruby_gem')} alt="Ruby" className="w-6 h-6 object-contain" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider font-mono">Ruby Gem</h4>
                                <p className="text-[10px] text-rose-200/80 leading-normal font-sans mt-0.5">
                                    Land critical hits on impact! Multiplies the hit value heavily. Perfect for centering near the top of the board.
                                </p>
                            </div>
                        </div>

                        {/* Emerald */}
                        <div className="flex items-start gap-3 bg-emerald-950/15 border border-emerald-500/20 p-2.5 rounded-xl">
                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-emerald-950/40 rounded-lg border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                                <img src={assets.getSrc('emerald_gem')} alt="Emerald" className="w-6 h-6 object-contain" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider font-mono">Emerald Gem</h4>
                                <p className="text-[10px] text-emerald-200/80 leading-normal font-sans mt-0.5">
                                    Splits hitting marbles into two copies! Creates major board cascades to flood the baskets below.
                                </p>
                            </div>
                        </div>

                        {/* Diamond */}
                        <div className="flex items-start gap-3 bg-cyan-950/15 border border-cyan-500/20 p-2.5 rounded-xl">
                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-cyan-950/40 rounded-lg border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.35)]">
                                <img src={assets.getSrc('diamond_gem')} alt="Diamond" className="w-6 h-6 object-contain" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider font-mono">Diamond Gem</h4>
                                <p className="text-[10px] text-cyan-200/80 leading-normal font-sans mt-0.5">
                                    Charges up energy and explodes every <span className="font-bold text-cyan-300">10 hits</span>! Heavy cascade-burst that triggers nearby pegs.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl flex flex-col gap-1 text-[10px] text-zinc-300 font-sans leading-relaxed">
                        <div className="font-bold text-zinc-200 mb-0.5">HOW TO EQUIP:</div>
                        <div className="flex gap-1.5"><span className="text-cyan-400 font-extrabold">1.</span> Select a gem type from the builder panel.</div>
                        <div className="flex gap-1.5"><span className="text-cyan-400 font-extrabold">2.</span> Click any of the highlighted active peg sockets on the board.</div>
                        <div className="flex gap-1.5"><span className="text-cyan-400 font-extrabold">3.</span> Use the 'Unsocket' tool to retrieve gems back into your inventory.</div>
                    </div>

                    <button className="tutorial-btn !mt-2 w-full !text-sm" onClick={handleNext}>Got it!</button>
                </div>
            </div>
        );
    }

    return (
        <div className="tutorial-overlay">
            <div className={`tutorial-card pop-in ${isClosing ? 'pop-out' : 'show'}`}>
                <img src={currentSrc} alt="Tutorial" onClick={handleNext} />
                <button className="tutorial-btn" onClick={handleNext}>Got it!</button>
            </div>
        </div>
    );
};

export const TutorialMenu = ({ onClose, onSelect }: { onClose: () => void, onSelect: (key: keyof typeof ASSET_PATHS) => void }) => {
    const items: {label: string, key: keyof typeof ASSET_PATHS}[] = [
        { label: '1. How to Play', key: 'tut_play' },
        { label: '2. Micro Marbles', key: 'tut_micro' },
        { label: '3. Bonus Marble', key: 'tut_bonus' },
        { label: '4. Kinetic Core', key: 'tut_kinetic' },
        { label: '5. Shard Shop', key: 'tut_shard' },
        { label: '6. Marble Skins', key: 'tut_skins' },
        { label: '7. Peg Sockets Builder', key: 'tut_sockets' },
    ];

    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="confirm-modal" style={{padding: '20px', maxWidth: '360px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h3 style={{margin:0}}>Tutorials</h3>
                    <button className="close-core" onClick={onClose}>Close</button>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    {items.map(item => (
                        <button key={item.key} className="tutorial-menu-btn" onClick={() => onSelect(item.key)}>
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
