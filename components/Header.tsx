
import React, { useEffect, useState } from 'react';
import { engine } from '../game/engine';
import { assets } from '../game/assets';

export const Header = ({ onCoreClick }: { onCoreClick: () => void }) => {
    const [glow, setGlow] = useState(false);
    useEffect(() => {
        const i = setInterval(() => {
            const balls = engine.state.upgrades.extraBall; // Removed 1+
            setGlow(balls >= 50);
        }, 1000);
        return () => clearInterval(i);
    }, []);

    return (
        <div className="header">
            <h1 className="header-title">Pocket Plinko</h1>
            <div className={`kinetic-icon ${glow ? 'glow' : ''}`} onClick={onCoreClick} style={{cursor: 'pointer'}}>
                {/* Use preloaded asset source if available, else raw path */}
                <img src={assets.getSrc('core')} alt="Core" />
            </div>
        </div>
    );
};
