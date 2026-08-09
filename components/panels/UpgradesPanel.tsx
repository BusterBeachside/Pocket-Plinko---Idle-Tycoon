
import React, { useRef } from 'react';
import { engine } from '../../game/engine';
import { UPGRADES } from '../../game/config';
import { UpgradeCard } from '../UpgradeCard';
import { GameState } from '../../game/types';
import { ChallengesManager } from '../../game/challenges';
import { formatNumber } from '../../game/utils';
import { PhysicsManager } from '../../game/physics';
import { WebsimAdBanner } from '../WebsimAdBanner';

interface UpgradesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    gameState: GameState;
    onBuy: (id: string) => void;
}

const getCurrentValueText = (id: string, level: number, stats: any, state: GameState) => {
    const isChallenge = state.inChallengeMode;
    let masterCount = 0;
    if (isChallenge) {
        if (state.challengeState?.challengeId === 'single_marble') {
            masterCount = 1;
        }
    } else {
        const hasMasterUnlock = state.masterMultiplier > 0 || state.timesPrestiged > 0;
        masterCount = hasMasterUnlock ? (1 + (state.permUpgradesLevels?.['perm_extra_master'] || 0)) : 0;
    }
    const purchased = isChallenge ? (state.challengeState?.upgrades.extraBall || 1) : (state.upgrades.extraBall || 1);

    switch (id) {
        case 'extraBall':
            return `Current: ${purchased + masterCount} Total Marble${(purchased + masterCount) !== 1 ? 's' : ''} (${purchased} Regular${masterCount > 0 ? ` + ${masterCount} Master` : ''})`;
        case 'microValue':
            return `Current: ${(1.5 + stats.microValuePercent + stats.permanentMicroBoostPercent).toFixed(1)}% of normal marble value`;
        case 'pegValue': {
            const baseVal = stats.pegValue;
            const marbleMult = Math.max(1, purchased * 0.75);
            const totalIncomePercent = stats.permanentIncomeBoostPercent + stats.derivedIncomeBoostPercent;
            const incomeMult = 1 + (totalIncomePercent / 100);
            const finalVal = Math.round(baseVal * marbleMult * incomeMult);
            return `Current: +$${baseVal} base (Times ${purchased} Marble${purchased !== 1 ? 's' : ''} [x${marbleMult.toFixed(2)}] = +$${finalVal})`;
        }
        case 'uncommonChance':
            return `Current: ${stats.uncommonChancePercent}% spawn chance`;
        case 'bonusValue':
            return `Current: ${Math.round((0.10 + (stats.upgrades.bonusValue || 0) * 0.10) * 100)}% of peak income per second`;
        case 'criticalChance':
            return `Current: ${stats.criticalChancePercent}% critical hit chance`;
        case 'basketValue': {
            const baseVal = stats.basketValueBonus;
            const marbleMult = Math.max(1, purchased * 0.75);
            const totalIncomePercent = stats.permanentIncomeBoostPercent + stats.derivedIncomeBoostPercent;
            const incomeMult = 1 + (totalIncomePercent / 100);
            const finalVal = Math.round(baseVal * marbleMult * incomeMult);
            return `Current: +$${baseVal} base (Times ${purchased} Marble${purchased !== 1 ? 's' : ''} [x${marbleMult.toFixed(2)}] = +$${finalVal})`;
        }
        case 'rareChance':
            return `Current: ${stats.rareChancePercent}% spawn chance`;
        case 'ballSpeed':
            return `Current: ${stats.ballSpeed.toFixed(2)}x physical simulation speed`;
        case 'legendaryChance':
            return `Current: ${stats.legendaryChancePercent}% spawn chance`;
        case 'sandPegMultiplier':
            return `Current: ${Math.pow(1.25, stats.upgrades.sandPegMultiplier || 0).toFixed(2)}x peg breaking yield`;
        case 'microAutoclicker':
            return `Current: ${(stats.upgrades.microAutoclicker * 0.1).toFixed(1)} micro marble drops per second`;
        default:
            return '';
    }
};

export const UpgradesPanel = ({ isOpen, onClose, gameState, onBuy }: UpgradesPanelProps) => {
    const touchStart = useRef<{x: number, y: number} | null>(null);
    const isSwiping = useRef(false);
    
    const stats = PhysicsManager.getEffectiveStats(gameState);

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

        if (cfg.maxLevel !== undefined && gameState.upgrades[cfg.id] >= cfg.maxLevel) {
             return { locked: true, message: 'MAXED' };
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
                if (u.id === 'basketValue' || u.id === 'microValue') {
                    return;
                }
                if (u.id === 'pegValue') {
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
                <WebsimAdBanner id="websim-ad-upgrades-panel" type="banner" style={{ marginBottom: '12px' }} />
                <div className="upgrade-grid">
                    {inChallenge ? (
                        challengeUpgrades.map(u => {
                            const level = (gameState.challengeState?.upgrades as any)?.[u.id] || 0;
                            const cost = ChallengesManager.getUpgradeCost(gameState, u.id as any);
                            const isCapped = (['uncommonChance', 'rareChance', 'legendaryChance', 'criticalChance'].includes(u.id) && level >= 20) || (u.id === 'ballSpeed' && level >= 20);
                            const canAfford = !isCapped && (isSandPeg 
                                ? (gameState.challengeState?.pegsBrokenCurrency || 0) >= cost 
                                : (gameState.challengeState?.money || 0) >= cost);
                            const costString = isSandPeg ? `${cost} Peg${cost > 1 ? 's' : ''}` : `$${formatNumber(cost)}`;
                            const currentValueString = getCurrentValueText(u.id, level, stats, gameState);
 
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
                                    currentValueString={currentValueString}
                                />
                            );
                        })
                    ) : (
                        UPGRADES.map(u => {
                            const lock = getLockStatus(u.id);
                            const currentValueString = getCurrentValueText(u.id, gameState.upgrades[u.id], stats, gameState);
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
                                    currentValueString={currentValueString}
                                />
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
