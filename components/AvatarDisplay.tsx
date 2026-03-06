
import React from 'react';
import { getAvatarById } from '../game/avatars';

interface AvatarDisplayProps {
    avatarId: string;
    size?: number;
    className?: string;
    ownedSkins?: string[];
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ avatarId, size = 32, className = '', ownedSkins = [] }) => {
    const avatar = getAvatarById(avatarId, ownedSkins);
    const isMarble = avatarId.includes('marble') || avatarId.includes('tie_dye');
    const isPeg = avatarId.includes('peg');
    const isBonus = avatarId === 'marble_bonus';
    const isCore = avatarId === 'core';
    const isDollar = avatarId === 'dollar_sign';
    
    const containerStyle: React.CSSProperties = {
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: (isMarble || isDollar) ? '#000' : (avatar.color || '#333'),
        flexShrink: 0,
        position: 'relative',
        border: (isBonus || isCore) ? 'none' : '1px solid rgba(255,255,255,0.1)'
    };

    if (isBonus || isCore) {
        containerStyle.background = 'transparent';
        containerStyle.overflow = 'visible';
    }

    const marbleStyle: React.CSSProperties = {
        width: '45%',
        height: '45%',
        borderRadius: '50%',
        background: avatarId === 'tie_dye_1' 
            ? 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff)'
            : (avatar.color || '#fff'),
        boxShadow: isMarble ? `0 0 ${size/3}px ${avatar.color || '#fff'}` : 'none',
        position: 'relative',
        zIndex: 2,
    };

    const pegStyle: React.CSSProperties = {
        width: '80%',
        height: '80%',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #999999 40%, #333333 100%)',
        boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.5), 2px 2px 4px rgba(0,0,0,0.3)',
    };

    const trailStyle: React.CSSProperties = {
        position: 'absolute',
        top: '0%',
        left: '50%',
        width: '45%',
        height: '50%',
        background: `linear-gradient(to top, ${avatar.color || '#fff'} 0%, transparent 100%)`,
        transform: 'translateX(-50%) rotate(-35deg)',
        transformOrigin: 'bottom center',
        opacity: 0.4,
        zIndex: 1,
        clipPath: 'polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)'
    };

    if (isPeg) {
        return (
            <div className={`avatar-display ${className}`} style={containerStyle}>
                <div style={pegStyle} />
            </div>
        );
    }

    if (isBonus || isCore) {
        return (
            <div className={`avatar-display ${className}`} style={containerStyle}>
                <img 
                    src={`images/${avatar.texture}`} 
                    alt={avatar.name} 
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain', 
                        filter: `drop-shadow(0 0 ${size/6}px ${avatar.color || '#fff'})` 
                    }}
                    referrerPolicy="no-referrer"
                />
            </div>
        );
    }

    if (avatar.texture && avatarId !== 'tie_dye_1') {
        return (
            <div className={`avatar-display ${className}`} style={containerStyle}>
                {isMarble && <div style={trailStyle} />}
                <div style={{ ...marbleStyle, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                        src={`images/${avatar.texture}`} 
                        alt={avatar.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        referrerPolicy="no-referrer"
                    />
                </div>
            </div>
        );
    }

    if (isDollar) {
        return (
            <div className={`avatar-display ${className}`} style={containerStyle}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: size * 0.6, 
                    color: '#ffd700',
                    fontWeight: 'bold',
                    textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
                }}>
                    {avatar.icon}
                </div>
            </div>
        );
    }

    return (
        <div className={`avatar-display ${className}`} style={containerStyle}>
            {isMarble && <div style={trailStyle} />}
            <div style={marbleStyle} />
        </div>
    );
};
