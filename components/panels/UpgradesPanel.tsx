
import React, { useRef } from 'react';
import { engine } from '../../game/engine';
import { UPGRADES } from '../../game/config';
import { UpgradeCard } from '../UpgradeCard';
import { GameState } from '../../game/types';
import { ChallengesManager } from '../../game/challenges';
import { formatNumber } from '../../game/utils';

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

    const inChallenge = gameState.inChallengeMode;
    const activeChallengeId = inChallenge ? (gameState.challengeState?.challengeId || ChallengesManager.getActiveChallengeId()) : '';
    const isSandPeg = activeChallengeId === 'sand_peg';
    const isAntiGravity = activeChallengeId === 'anti_gravity';

    const challengeUpgrades = (() => {
        if (!inChallenge) return [];
        const baseUpgrades = UPGRADES.map(u => {
            let name = u.name;
            let description = u.description;
            if (activeChallengeId === 'single_marble' && u.id === 'extraBall') {
                name = 'Extra Marbles';
                description = 'Adds +x5 to the Master marble payout multiplier!';
            }
            return {
                id: u.id,
                name,
                description
            };
        });

        if (activeChallengeId === 'anti_gravity') {
            return baseUpgrades.filter(u => u.id !== 'ballSpeed' && u.id !== 'basketValue');
        } else if (activeChallengeId === 'single_marble') {
            return baseUpgrades.filter(u => u.id !== 'uncommonChance' && u.id !== 'rareChance' && u.id !== 'legendaryChance');
        } else if (activeChallengeId === 'sand_peg') {
            const list: { id: any; name: string; description: string; }[] = [];
            baseUpgrades.forEach(u => {
                if (u.id === 'pegValue' || u.id === 'basketValue') {
                    return;
                }
                if (u.id === 'microValue') {
                    list.push({
                        id: 'sandPegMultiplier',
                        name: 'Broken Peg Yield',
                        description: 'Increases broken peg sand points rewarded.'
                    });
                } else {
                    list.push(u);
                }
            });
            return list;
        } else if (activeChallengeId === 'micro_mania') {
            return [
                ...baseUpgrades.filter(u => u.id !== 'extraBall' && u.id !== 'uncommonChance' && u.id !== 'rareChance' && u.id !== 'legendaryChance'),
                { id: 'microAutoclicker', name: 'Micro Autoclicker', description: 'Automatically drops 0.1 Micro Marbles per second per level' }
            ];
        } else if (activeChallengeId === 'critical_meltdown') {
            return baseUpgrades.filter(u => u.id !== 'criticalChance');
        }
        return baseUpgrades;
    })();

    return (
        <div 
            className={`sidebar ${isOpen ? 'open' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="panel-header">
                <h2>{inChallenge ? 'Challenge Shop' : 'Upgrades'}</h2>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>
            
            {inChallenge && (
                <div className="px-4 py-2 mx-4 mt-2 bg-[#f59e0b]/10 border border-dashed border-[#f59e0b]/30 text-[#f59e0b] text-[11px] font-bold uppercase tracking-wider text-center rounded-lg">
                    {isSandPeg ? 'Costs: Broken Pegs' : 'Costs: Sandbox Cash'}
                </div>
            )}
 
            <div className="sidebar-content">
                <div className="upgrade-grid">
                    {inChallenge ? (
                        challengeUpgrades.map(u => {
                            const level = (gameState.challengeState?.upgrades as any)?.[u.id] || 0;
                            const cost = ChallengesManager.getUpgradeCost(gameState, u.id as any);
                            const isCapped = ['uncommonChance', 'rareChance', 'legendaryChance', 'criticalChance'].includes(u.id) && level >= 20;
                            const canAfford = !isCapped && (isSandPeg 
                                ? (gameState.challengeState?.pegsBrokenCurrency || 0) >= cost 
                                : (gameState.challengeState?.money || 0) >= cost);
                            const costString = isSandPeg ? `${cost} Peg${cost > 1 ? 's' : ''}` : `$${formatNumber(cost)}`;
 
                            return (
                                <UpgradeCard 
                                    key={u.id}
                                    id={u.id}
                                    level={level}
                                    cost={cost}
                                    canAfford={canAfford}
                                    locked={isCapped}
                                    message={isCapped ? "MAXED" : ""}
                                    onClick={onBuy}
                                    customName={u.name}
                                    customDescription={u.description}
                                    costString={costString}
                                    inChallenge={true}
                                />
                            );
                        })
                    ) : (
                        UPGRADES.map(u => {
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
                                    inChallenge={false}
                                />
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
