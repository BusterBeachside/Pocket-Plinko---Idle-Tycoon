import React, { useRef, useEffect } from 'react';
import { UPGRADES } from '../game/config';
import { formatNumber } from '../game/utils';

export const UpgradeCard = ({ id, level, cost, canAfford, locked, message, onClick, customName, customDescription, costString, inChallenge, currentValueString }: any) => {
    const cfg = UPGRADES.find(u => u.id === id);
    const name = customName || cfg?.name;
    const description = customDescription || cfg?.description;

    const latestRef = useRef({ id, locked, canAfford, onClick });
    latestRef.current = { id, locked, canAfford, onClick };

    const timerRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);

    const stopAutoBuy = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const startAutoBuy = (e: React.MouseEvent | React.TouchEvent) => {
        const current = latestRef.current;
        if (current.locked || !current.canAfford) return;

        // Buy first item immediately
        current.onClick(current.id);

        stopAutoBuy();

        // 500ms delay before rapid buying begins
        timerRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                const latest = latestRef.current;
                if (!latest.locked && latest.canAfford) {
                    latest.onClick(latest.id);
                } else {
                    stopAutoBuy();
                }
            }, 75); // rapid-buy every 75ms
        }, 500);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Left click only
        startAutoBuy(e);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault(); // Prevents double click simulation on mobile
        startAutoBuy(e);
    };

    useEffect(() => {
        return () => stopAutoBuy();
    }, []);

    if (!name) return null;
    return (
        <div className="upgrade-card">
            <h3>{name}</h3>
            <div className="desc" style={{fontSize:'0.8rem', color:'#aaa', marginBottom:'4px', minHeight:'2.4em', lineHeight:'1.2'}}>{description}</div>
            {currentValueString && (
                <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#10b981', // Emerald green
                    fontWeight: '500',
                    marginBottom: '8px',
                    lineHeight: '1.25'
                }}>
                    {currentValueString}
                </div>
            )}
            <div className="info">
                <span>Level: {level}</span>
                {locked ? <span style={{color:'#ff6b6b'}}>Locked</span> : null}
            </div>
            <div style={{flex:1}}></div>
            {locked ? (
                <div style={{fontSize: '0.8rem', color: '#888', marginTop: 5}}>{message}</div>
            ) : (
                <div className="cost" style={{color: inChallenge ? '#f59e0b' : '#ffd700'}}>{costString || `$${formatNumber(cost)}`}</div>
            )}
            <button 
                className={`upgrade-btn ${locked ? 'locked' : (canAfford ? 'affordable' : 'expensive')}`}
                disabled={locked || !canAfford}
                onMouseDown={handleMouseDown}
                onMouseUp={stopAutoBuy}
                onMouseLeave={stopAutoBuy}
                onTouchStart={handleTouchStart}
                onTouchEnd={stopAutoBuy}
                onTouchCancel={stopAutoBuy}
            >
                {locked ? 'Locked' : 'Buy'}
            </button>
        </div>
    );
};