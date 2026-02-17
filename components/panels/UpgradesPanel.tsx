import React from 'react';
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
    
    const getLockStatus = (id: string) => {
        const cfg = UPGRADES.find(u => u.id === id);
        if(!cfg) return { locked: false, message: '' };
        
        const balls = 1 + gameState.upgrades.extraBall;
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
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
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