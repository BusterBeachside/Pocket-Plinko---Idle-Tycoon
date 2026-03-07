
import React, { useRef } from 'react';
import { engine } from '../../game/engine';
import { UPGRADES } from '../../game/config';
import { UpgradeCard } from '../UpgradeCard';
import { GameState } from '../../game/types';

interface UpgradesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    gameState: GameState;
    onBuy: (id: string) => void;
}

export const UpgradesPanel = ({ isOpen, onClose, gameState, onBuy }: UpgradesPanelProps) => {
    const touchStart = useRef<{x: number, y: number} | null>(null);
    const isSwiping = useRef(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isSwiping.current = true;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current || !isSwiping.current) return;
        
        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        const dx = touchEnd.x - touchStart.current.x;
        const dy = touchEnd.y - touchStart.current.y;
        
        // Horizontal swipe must be significantly larger than vertical to count
        // and must exceed a higher threshold (100px)
        if (Math.abs(dx) > 100 && Math.abs(dx) > Math.abs(dy) * 2) {
            if (dx < 0 && isOpen) { // Swipe left to close
                onClose();
            }
        }
        
        touchStart.current = null;
        isSwiping.current = false;
    };
    
    const getLockStatus = (id: string) => {
        const cfg = UPGRADES.find(u => u.id === id);
        if(!cfg) return { locked: false, message: '' };
        
        const balls = gameState.upgrades.extraBall; // Removed 1+
        if (cfg.unlocksAt && balls < cfg.unlocksAt) {
            return { locked: true, message: `Req: ${cfg.unlocksAt} Marbles` };
        }
        
        if (cfg.maxPercent) {
             const current = gameState[id + 'Percent' as keyof typeof gameState] as number;
             if (current >= cfg.maxPercent) return { locked: true, message: 'MAXED' };
        }
        
        return { locked: false, message: '' };
    };

    return (
        <div 
            className={`sidebar ${isOpen ? 'open' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="panel-header">
                <h2>Upgrades</h2>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="sidebar-content">
                <div className="upgrade-grid">
                    {UPGRADES.map(u => {
                        const lock = getLockStatus(u.id);
                        return (
                            <UpgradeCard 
                                key={u.id}
                                id={u.id}
                                level={gameState.upgrades[u.id]}
                                cost={engine.getUpgradeCost(u.id)}
                                canAfford={gameState.money >= engine.getUpgradeCost(u.id)}
                                locked={lock.locked}
                                message={lock.message}
                                onClick={onBuy}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
