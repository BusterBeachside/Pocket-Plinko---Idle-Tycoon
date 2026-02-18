
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
