
import { Ball, GameState, Peg, Popup, VisualEffect } from './types';
import { formatNumber } from './utils';
import { AudioController } from './audio';
import { ProgressionManager } from './progression';

export class PhysicsManager {
    static calculateScore(state: GameState, ball: Ball, baseValue: number, rarityMultiplier: number) {
        const isCritical = Math.random() * 100 < state.criticalChancePercent;
        const marbleCountMult = Math.max(1, (state.upgrades.extraBall) * 0.75);
        const totalIncomePercent = (state.permanentIncomeBoostPercent || 0) + (state.derivedIncomeBoostPercent || 0);
        const permIncomeMult = 1 + (totalIncomePercent / 100);
        
        let multiplier = rarityMultiplier;

        if (ball.micro) {
            const transientPercent = state.microValuePercent || 0;
            const permanentPercent = state.permanentMicroBoostPercent || 0;
            const microValuePercentage = 1 + transientPercent + permanentPercent;
            multiplier *= (microValuePercentage / 100);
        }

        if (ball.master) {
            const ownedBonus = Math.floor(state.ownedMarbles.length); 
            const milestoneBonus = Math.floor(state.ownedMarbles.length / 10) * 5;
            const totalMasterMult = (1 + (state.masterMultiplier || 0) + ownedBonus + milestoneBonus);
            multiplier = totalMasterMult;
        }

        let gain = baseValue * multiplier * marbleCountMult * permIncomeMult;
        if (ball.micro && gain < 1 && gain > 0.01) gain = 1;
        gain = Math.round(gain);
        if (isCritical) gain *= 2;
        
        return { gain, isCritical };
    }

    static updateBalls(
        dt: number,
        state: GameState,
        balls: Ball[],
        pegs: Peg[][][],
        width: number,
        height: number,
        gridSize: number,
        gridCols: number,
        gridRows: number,
        pegRadius: number,
        addMoney: (amount: number) => void,
        pushPopup: (p: Popup) => void,
        pushEffect: (e: VisualEffect) => void,
        audio: AudioController
    ) {
        const timeScale = state.ballSpeed;
        const gravity = 500 * timeScale;
        const bounce = 0.6;

        balls.forEach(b => {
            if (b._remove) return;

            b.vy += gravity * dt;
            b.x += b.vx * dt * timeScale;
            b.y += b.vy * dt * timeScale;
            
            // Wall Collision
            if (b.x < b.radius) {
                b.x = b.radius;
                b.vx = Math.abs(b.vx) * 0.6;
            }
            if (b.x > width - b.radius) {
                b.x = width - b.radius;
                b.vx = -Math.abs(b.vx) * 0.6;
            }
            
            if (b.trail.length > 20) b.trail.shift();
            b.trail.push({x: b.x, y: b.y});

            // Peg collision
            if(b._pegCooldown > 0) b._pegCooldown -= dt * 60;

            const gx = Math.floor(b.x / gridSize);
            const gy = Math.floor(b.y / gridSize);

            for(let dy = -1; dy <= 1; dy++) {
                for(let dx = -1; dx <= 1; dx++) {
                    const cx = gx + dx;
                    const cy = gy + dy;
                    if(cx >= 0 && cx < gridCols && cy >= 0 && cy < gridRows) {
                        const cell = pegs[cy][cx];
                        for(let i=0; i<cell.length; i++) {
                            const p = cell[i];
                            const distX = b.x - p.x;
                            const distY = b.y - p.y;
                            const distSq = distX*distX + distY*distY;
                            const minDist = b.radius + pegRadius;
                            
                            if (distSq < minDist*minDist) {
                                const angle = Math.atan2(distY, distX);
                                const speed = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
                                b.vx = Math.cos(angle) * speed * bounce + (Math.random() - 0.5) * 50;
                                b.vy = Math.sin(angle) * speed * bounce;
                                const overlap = minDist - Math.sqrt(distSq);
                                b.x += Math.cos(angle) * overlap;
                                b.y += Math.sin(angle) * overlap;

                                p.glow = 1.0;
                                p.cooldown = 10;
                                
                                if (b._pegCooldown <= 0) {
                                    b._pegCooldown = 10;
                                    state.lifetimePegHits = (state.lifetimePegHits || 0) + 1;
                                    
                                    ProgressionManager.updateMissionProgress(state, 'pegs_hit', 1);

                                    const pegBase = Math.max(1, state.pegValue);
                                    const rarityMult = b.type === 'legendary' ? 4 : (b.type === 'rare' ? 3 : (b.type === 'uncommon' ? 2 : 1));
                                    const { gain, isCritical } = PhysicsManager.calculateScore(state, b, pegBase, rarityMult);
                                    
                                    if (isCritical) {
                                        state.lifetimeCriticalHits = (state.lifetimeCriticalHits || 0) + 1;
                                        pushEffect({
                                            x: p.x, y: p.y, t: performance.now(), duration: 400, type: 'critical_hit'
                                        });

                                        ProgressionManager.updateMissionProgress(state, 'critical_hits', 1);
                                    }

                                    addMoney(gain);
                                    if(!state.disableMoneyPopups) {
                                        pushPopup({
                                            x: p.x, y: p.y, text: `+$${formatNumber(gain)}`, t: performance.now(),
                                            critical: isCritical, master: b.master, micro: b.micro
                                        });
                                    }
                                    if (!state.pegMuted) {
                                        if(b.micro) audio.play('microPeg', 2, 0.3);
                                        else audio.play('peg', 2, 0.3);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Basket collision
            if (b.y > height - 40 && b.y < height - 10) {
                if (b.vy > 0) {
                    state.lifetimeBaskets = (state.lifetimeBaskets || 0) + 1;
                    ProgressionManager.updateMissionProgress(state, 'baskets', 1);

                    const basketWidth = width / 5;
                    const idx = Math.floor(b.x / basketWidth);
                    const baseValues = [10, 5, 20, 5, 10];
                    const base = (baseValues[idx] || 5) + state.basketValueBonus;
                    const rarityMult = b.type === 'legendary' ? 4 : (b.type === 'rare' ? 3 : (b.type === 'uncommon' ? 2 : 1));
                    
                    const { gain, isCritical } = PhysicsManager.calculateScore(state, b, base, rarityMult);
                    
                    if (isCritical) {
                        state.lifetimeCriticalHits = (state.lifetimeCriticalHits || 0) + 1;
                        pushEffect({
                            x: b.x, y: height - 20, t: performance.now(), duration: 500, type: 'critical_hit'
                        });

                        ProgressionManager.updateMissionProgress(state, 'critical_hits', 1);
                    }

                    addMoney(gain);
                    if(!state.disableMoneyPopups) {
                        pushPopup({
                            x: b.x, y: b.y, text: `+$${formatNumber(gain)}`, t: performance.now(),
                            critical: isCritical, master: b.master, micro: b.micro
                        });
                    }
                    if (!state.basketMuted) {
                        if(b.micro) audio.play('microBasket', 1, 0.4);
                        else audio.play('basket', 1, 0.4);
                    }

                    if (b.micro) {
                        b._remove = true; 
                    } else if (b.master) {
                        b.y = 20;
                        b.x = width / 2 + (Math.random() - 0.5) * 50;
                        b.vx = 0; b.vy = 0;
                        b.trail = [];
                    } else {
                        b.type = PhysicsManager.rollRarity(state);
                        b.y = 20;
                        b.x = 20 + Math.random() * (width - 40);
                        b.vx = 0; b.vy = 0;
                        b.trail = [];
                    }
                }
            }
        });
    }

    static rollRarity(state: GameState): 'normal' | 'uncommon' | 'rare' | 'legendary' {
        const legChance = (state.legendaryChancePercent || 0) / 100;
        const rareChance = (state.rareChancePercent || 0) / 100;
        const uncChance = (state.uncommonChancePercent || 0) / 100;

        if (Math.random() < legChance) return 'legendary';
        if (Math.random() < rareChance) return 'rare';
        if (Math.random() < uncChance) return 'uncommon';
        return 'normal';
    }
}
