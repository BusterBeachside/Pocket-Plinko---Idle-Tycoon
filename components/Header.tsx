
import React, { useEffect, useState } from 'react';
import { engine } from '../game/engine';
import { assets } from '../game/assets';

import { User } from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';

export const Header = ({ onCoreClick, onAuthClick, profile }: { onCoreClick: () => void, onAuthClick: () => void, profile?: any }) => {
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
            <div 
                className="auth-trigger absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-2 py-1 transition-all cursor-pointer"
                onClick={onAuthClick}
            >
                {profile ? (
                    <AvatarDisplay avatarId={profile.avatar_url || 'marble_white'} size={20} ownedSkins={engine.state.ownedMarbles} />
                ) : (
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span className="hidden sm:inline text-[10px] font-bold text-white/60 uppercase tracking-wider pr-2">
                    {profile?.username || 'Underdog ID'}
                </span>
            </div>
            
            <h1 className="header-title">Pocket Plinko</h1>
            
            <div className={`kinetic-icon ${glow ? 'glow' : ''}`} onClick={onCoreClick} style={{cursor: 'pointer'}}>
                {/* Use preloaded asset source if available, else raw path */}
                <img src={assets.getSrc('core')} alt="Core" />
            </div>
        </div>
    );
};
