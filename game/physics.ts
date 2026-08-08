
import { Ball, GameState, Peg, Popup, VisualEffect } from './types';
import { formatNumber } from './utils';
import { AudioController } from './audio';
import { ProgressionManager } from './progression';
import { DailyEventsManager } from './dailyEvents';
import { ChallengesManager } from './challenges';

export class PhysicsManager {
    static getEffectiveStats(state: GameState) {
        if (!state.inChallengeMode) {
            return {
                upgrades: state.upgrades,
                criticalChancePercent: state.criticalChancePercent,
                pegValue: state.pegValue,
                microValuePercent: state.microValuePercent,
                uncommonChancePercent: state.uncommonChancePercent,
                rareChancePercent: state.rareChancePercent,
                legendaryChancePercent: state.legendaryChancePercent,
                criticalIncomeBoostPercent: 0,
                permanentIncomeBoostPercent: state.permanentIncomeBoostPercent || 0,
                permanentMicroBoostPercent: state.permanentMicroBoostPercent || 0,
                derivedIncomeBoostPercent: state.derivedIncomeBoostPercent || 0,
                derivedMasterBonus: state.derivedMasterBonus || 0,
                masterMultiplier: state.masterMultiplier || 0,
                ballSpeed: state.ballSpeed || 1,
                basketValueBonus: state.basketValueBonus || 0,
            };
        } else {
            // CHALLENGE MODE: Ignore permanent/prestige buffs completely.
            ChallengesManager.checkAndSyncChallengeState(state);
            const u = state.challengeState.upgrades;
            const cid = state.challengeState.challengeId;
            
            // Challenge specific overrides
            let critChance = Math.min(20, u.criticalChance);
            if (cid === 'critical_meltdown') {
                critChance = 50; // Locked to 50%
            }
            
            let pegBaseVal = 1 + (u.pegValue * 2);
            if (cid === 'anti_gravity') {
                pegBaseVal *= 5; // 5x Anti-Gravity Peg Yield Boost!
            }

            return {
                upgrades: u,
                criticalChancePercent: critChance,
                pegValue: pegBaseVal,
                microValuePercent: u.microValue * 2,
                uncommonChancePercent: Math.min(20, u.uncommonChance),
                rareChancePercent: Math.min(20, u.rareChance),
                legendaryChancePercent: Math.min(20, u.legendaryChance),
                criticalIncomeBoostPercent: 0,
                permanentIncomeBoostPercent: 0,
                permanentMicroBoostPercent: 0,
                derivedIncomeBoostPercent: 0,
                derivedMasterBonus: 0,
                masterMultiplier: 0,
                ballSpeed: Math.pow(1.05, u.ballSpeed),
                basketValueBonus: u.basketValue * 10
            };
        }
    }

    static calculateScore(state: GameState, ball: Ball, baseValue: number, rarityMultiplier: number, isPeg: boolean = false) {
        const stats = PhysicsManager.getEffectiveStats(state);
        const critSettings = DailyEventsManager.getCriticalSettings();
        
        // Critical calculation
        const baseCrit = stats.criticalChancePercent + critSettings.flatBoost;
        const isCritical = Math.random() * 100 < (baseCrit * critSettings.chanceMult);
        
        // Marble count multiplier
        const ballCountLevel = stats.upgrades.extraBall;
        const marbleCountMult = Math.max(1, ballCountLevel * 0.75);
        
        // Permanent / Derived income multipliers
        const totalIncomePercent = stats.permanentIncomeBoostPercent + stats.derivedIncomeBoostPercent;
        const permIncomeMult = 1 + (totalIncomePercent / 100);
        
        let multiplier = rarityMultiplier;

        if (ball.micro) {
            const microValuePercentage = 1.5 + stats.microValuePercent + stats.permanentMicroBoostPercent;
            
            // Micro Mania Challenge: Micro Marbles have 500% of normal marble's base value (5x normal base)!
            if (state.inChallengeMode && state.challengeState.challengeId === 'micro_mania') {
                multiplier *= (microValuePercentage * 5.0);
            } else {
                multiplier *= (microValuePercentage / 100);
            }
        }

        if (ball.master) {
            if (state.inChallengeMode) {
                if (state.challengeState.challengeId === 'single_marble') {
                    // Extra Ball upgrade adds x5 per level to multiplier: level * 5
                    const extraBallLevel = state.challengeState.upgrades.extraBall || 1;
                    multiplier = extraBallLevel * 5;
                } else {
                    multiplier = 1.0;
                }
            } else {
                const ownedBonus = Math.floor(state.ownedMarbles.length); 
                const milestoneBonus = Math.floor(state.ownedMarbles.length / 10) * 5;
                const totalMasterMult = (1 + stats.masterMultiplier + ownedBonus + milestoneBonus);
                multiplier = totalMasterMult;
            }
        }

        let gain = baseValue * multiplier * marbleCountMult * permIncomeMult * (ball.mergeCount || 1);
        if (isPeg) {
            gain *= DailyEventsManager.getPegIncomeMultiplier();
        }
        if (ball.micro && gain < 1 && gain > 0.01) gain = 1;
        gain = Math.round(gain);
        
        if (isCritical) {
            if (state.inChallengeMode && state.challengeState.challengeId === 'critical_meltdown') {
                gain *= 10;
            } else {
                gain *= critSettings.damageMult;
            }
        } else {
            // Critical Meltdown Challenge: Normal impacts yield nothing!
            if (state.inChallengeMode && state.challengeState.challengeId === 'critical_meltdown') {
                gain = 0;
            }
        }

        // Micro marble failsafe: always give at least $1 no matter what (under all gamemodes),
        // except in Critical Meltdown if it was a non-critical hit.
        if (ball.micro) {
            const isCriticalMeltdownNoCrit = state.inChallengeMode && state.challengeState.challengeId === 'critical_meltdown' && !isCritical;
            if (!isCriticalMeltdownNoCrit && gain < 1) {
                gain = 1;
            }
        }
        
        return { gain, isCritical };
    }

    static mergeBallsIfNeeded(
        state: GameState,
        balls: Ball[],
        pushPopup?: (p: Popup) => void,
        pushEffect?: (e: VisualEffect) => void
    ) {
        // 1. Un-merge marbles if merge mode is disabled
        if (state.mergeModeEnabled === false) {
            const merged = balls.filter(b => !b._remove && (b.mergeCount || 1) > 1);
            if (merged.length > 0) {
                for (const b of merged) {
                    const count = b.mergeCount || 1;
                    b.mergeCount = 1;
                    for (let k = 1; k < count; k++) {
                        const angle = (k / (count - 1)) * Math.PI * 2;
                        const dist = 3 + Math.random() * 5;
                        balls.push({
                            ...b,
                            x: b.x + Math.cos(angle) * dist,
                            y: b.y + Math.sin(angle) * dist,
                            vx: b.vx + (Math.random() - 0.5) * 60,
                            vy: b.vy + (Math.random() - 0.5) * 60,
                            mergeCount: 1,
                            trail: [],
                            id: Date.now() + Math.random()
                        });
                    }
                }
            }
            return;
        }

        const activeBalls = balls.filter(b => !b._remove);

        const aggression = state.mergeAggression || 'low';
        let minThreshold = 45;
        let maxMergeCap = 10;

        if (aggression === 'high') {
            minThreshold = 15;
            maxMergeCap = 999;
        } else if (aggression === 'medium') {
            minThreshold = 28;
            maxMergeCap = 25;
        } else {
            minThreshold = activeBalls.some(b => b.micro) ? 35 : 45;
            maxMergeCap = 10;
        }

        if (activeBalls.length < minThreshold) return;

        const groups: Map<string, Ball[]> = new Map();
        for (const b of activeBalls) {
            if ((b.mergeCount || 1) >= maxMergeCap) continue;
            const key = `${b.master ? '1' : '0'}_${b.micro ? '1' : '0'}_${b.type}_${b.isSplit ? '1' : '0'}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(b);
        }

        groups.forEach((group) => {
            if (group.length < 2) return;

            for (let i = 0; i < group.length; i++) {
                const b1 = group[i];
                if (b1._remove || (b1.mergeCount || 1) >= maxMergeCap) continue;

                let mergeRadius = 0;
                if (aggression === 'high') {
                    const isCrowded = activeBalls.length > 30;
                    mergeRadius = (b1.micro ? 18 : 28) * (isCrowded ? 1.5 : 1.0);
                } else if (aggression === 'medium') {
                    mergeRadius = b1.micro ? 14 : 20;
                } else {
                    // low aggression: contact distance
                    mergeRadius = b1.radius + (group[0]?.micro ? 3 : 5);
                }

                for (let j = i + 1; j < group.length; j++) {
                    const b2 = group[j];
                    if (b2._remove || (b2.mergeCount || 1) >= maxMergeCap) continue;

                    const dx = b2.x - b1.x;
                    const dy = b2.y - b1.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq <= mergeRadius * mergeRadius) {
                        const m1 = b1.mergeCount || 1;
                        const m2 = b2.mergeCount || 1;
                        const total = Math.min(maxMergeCap, m1 + m2);

                        b1.x = (b1.x * m1 + b2.x * m2) / (m1 + m2);
                        b1.y = (b1.y * m1 + b2.y * m2) / (m1 + m2);
                        b1.vx = (b1.vx * m1 + b2.vx * m2) / (m1 + m2);
                        b1.vy = (b1.vy * m1 + b2.vy * m2) / (m1 + m2);

                        b1.mergeCount = total;
                        b2._remove = true;

                        if (pushPopup && (total === 5 || total === 10 || total === 25 || total === 50 || total === 100)) {
                            pushPopup({
                                x: b1.x,
                                y: b1.y,
                                text: `MERGE x${total}`,
                                t: performance.now(),
                                critical: true,
                                master: b1.master,
                                micro: b1.micro
                            });
                        }

                        if (pushEffect) {
                            pushEffect({
                                x: b1.x,
                                y: b1.y,
                                t: performance.now(),
                                duration: 250,
                                type: 'critical_hit'
                            });
                        }
                        break;
                    }
                }
            }
        });
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
        audio: AudioController,
        onPegBreak?: (p: Peg) => void
    ) {
        PhysicsManager.mergeBallsIfNeeded(state, balls, pushPopup, pushEffect);

        const stats = PhysicsManager.getEffectiveStats(state);
        const timeScale = stats.ballSpeed;
        
        // Gravity adjustments: Anti-gravity cuts gravity by 80%
        let gravity = 600 * timeScale;
        if (state.inChallengeMode && state.challengeState.challengeId === 'anti_gravity') {
            gravity = 600 * timeScale * 0.20; // Cut gravity by 80% (floating feel)
        }
        
        // Bounce adjustments: anti_gravity pegs are extremely bouncy!
        let bounce = 0.55;
        if (state.inChallengeMode && state.challengeState.challengeId === 'anti_gravity') {
            bounce = 1.15; // Elastic bumper restitution
        }
        
        const friction = 0.995; // Air resistance/friction

        balls.forEach(b => {
            if (b._remove) return;

            // Age tracking and despawn for all marbles in anti-gravity challenge, or micro marbles
            const isAntiGravity = state.inChallengeMode && state.challengeState?.challengeId === 'anti_gravity';
            if (b.micro || isAntiGravity) {
                b.age = (b.age || 0) + dt;
                b.maxAge = b.maxAge || (25 + Math.random() * 5);
                if (b.age >= b.maxAge) {
                    b._remove = true;
                    return;
                }
            }

            // Apply gravity and friction
            b.vy += gravity * dt;
            b.vx *= friction;
            b.vy *= friction;

            // Velocity cap in anti-gravity
            if (isAntiGravity) {
                const maxSpeed = 350; // Gentle floaty velocity clamp
                const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                if (speed > maxSpeed) {
                    b.vx = (b.vx / speed) * maxSpeed;
                    b.vy = (b.vy / speed) * maxSpeed;
                }
            }

            b.x += b.vx * dt * timeScale;
            b.y += b.vy * dt * timeScale;
            
            // Wall Collision
            if (b.x < b.radius) {
                b.x = b.radius;
                b.vx = Math.abs(b.vx) * 0.5;
            }
            if (b.x > width - b.radius) {
                b.x = width - b.radius;
                b.vx = -Math.abs(b.vx) * 0.5;
            }
            // Ceiling Collision
            if (b.y < b.radius) {
                b.y = b.radius;
                b.vy = Math.abs(b.vy) * 0.5;
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
                            
                            // Skipping broken sand pegs
                            if (p.broken) continue;

                            const distX = b.x - p.x;
                            const distY = b.y - p.y;
                            const distSq = distX*distX + distY*distY;
                            const minDist = b.radius + pegRadius;
                            
                            if (distSq < minDist*minDist) {
                                // Proper Reflection Physics
                                const dist = Math.sqrt(distSq);
                                const nx = distX / dist; // Normal X
                                const ny = distY / dist; // Normal Y
                                
                                // Dot product of velocity and normal
                                const dot = b.vx * nx + b.vy * ny;
                                
                                // Reflect velocity: v = v - 2 * (v . n) * n
                                // Apply restitution (bounce)
                                b.vx = (b.vx - 2 * dot * nx) * bounce;
                                b.vy = (b.vy - 2 * dot * ny) * bounce;
                                
                                // Add a tiny bit of random nudge to prevent perfect vertical stacks
                                b.vx += (Math.random() - 0.5) * 15;

                                // Resolve overlap
                                const overlap = minDist - dist;
                                b.x += nx * overlap;
                                b.y += ny * overlap;

                                p.glow = 1.0;
                                p.cooldown = 10;
                                if (b.master) {
                                    p.hitType = 'master';
                                } else if (b.micro) {
                                    p.hitType = 'micro';
                                } else {
                                    p.hitType = b.type;
                                }
                                
                                if (b._pegCooldown <= 0) {
                                    b._pegCooldown = 10;
                                    const countVal = b.mergeCount || 1;
                                    state.lifetimePegHits = (state.lifetimePegHits || 0) + countVal;
                                    ProgressionManager.updateMissionProgress(state, 'pegs_hit', countVal);

                                    const isSandPeg = state.inChallengeMode && state.challengeState.challengeId === 'sand_peg';
                                    if (isSandPeg) {
                                        if (p.hp === undefined) p.hp = 3;
                                        
                                        // 6. Critical hits in this mode should deal 2 damage to a peg when hit.
                                        let isCritical = false;
                                        let damage = 1 * (b.mergeCount || 1);
                                        const statsOver = PhysicsManager.getEffectiveStats(state);
                                        const critSettings = DailyEventsManager.getCriticalSettings();
                                        const baseCrit = statsOver.criticalChancePercent + critSettings.flatBoost;
                                        if (Math.random() * 100 < (baseCrit * critSettings.chanceMult)) {
                                            isCritical = true;
                                            damage = 2 * (b.mergeCount || 1);
                                            state.lifetimeCriticalHits = (state.lifetimeCriticalHits || 0) + 1;
                                            pushEffect({
                                                x: p.x, y: p.y, t: performance.now(), duration: 400, type: 'critical_hit'
                                            });
                                            ProgressionManager.updateMissionProgress(state, 'critical_hits', 1);
                                            if (!state.critMuted) {
                                                audio.play('crit', 0.15, 0.2);
                                            }
                                            pushPopup({
                                                x: p.x,
                                                y: p.y - 12,
                                                text: 'CRITICAL!',
                                                critical: true,
                                                t: performance.now(),
                                                master: b.master,
                                                micro: b.micro
                                            });
                                        }
                                        
                                        p.hp -= damage;
                                        if (p.hp <= 0) {
                                            p.broken = true;
                                            p.respawnTimer = 5;
                                            p.reformingStarted = false;
                                            
                                            // 5. Uncommon/Rare/Legendary marbles in this mode should earn 2/3/4 Pegs when breaking a peg.
                                            let basePegs = 1;
                                            if (b.type === 'uncommon') basePegs = 2;
                                            else if (b.type === 'rare') basePegs = 3;
                                            else if (b.type === 'legendary') basePegs = 4;
                                            
                                            const multLevel = state.challengeState.upgrades.sandPegMultiplier || 0;
                                            const pegReward = Math.round(basePegs * Math.pow(1.25, multLevel) * (b.mergeCount || 1));
                                            
                                            state.challengeState.pegsBrokenCurrency = (state.challengeState.pegsBrokenCurrency || 0) + pegReward;
                                            state.challengeState.lifetimePegsBroken = (state.challengeState.lifetimePegsBroken || 0) + pegReward;
                                            addMoney(pegReward);
                                            
                                            pushPopup({
                                                x: p.x,
                                                y: p.y,
                                                text: `+${pegReward} Peg${pegReward > 1 ? 's' : ''}`,
                                                t: performance.now(),
                                                critical: isCritical,
                                                master: b.master,
                                                micro: b.micro
                                            });
                                            audio.play('sand_break', 1.0, 0.5);
                                            if (onPegBreak) {
                                                onPegBreak(p);
                                            }
                                        } else {
                                            audio.play('peg', 1, 0.2);
                                        }
                                    } else {
                                        const pegBase = stats.pegValue;
                                        const rarityMult = b.type === 'legendary' ? 4 : (b.type === 'rare' ? 3 : (b.type === 'uncommon' ? 2 : 1));
                                        
                                        let isRuby = p.gemType === 'ruby';
                                        let { gain, isCritical } = PhysicsManager.calculateScore(state, b, pegBase, rarityMult, true);
                                        
                                        if (isRuby && !isCritical) {
                                            isCritical = true;
                                            const critSettings = DailyEventsManager.getCriticalSettings();
                                            const baseGain = Math.round(pegBase * rarityMult * Math.max(1, (state.upgrades.extraBall || 1) * 0.75) * (1 + (state.permanentIncomeBoostPercent + state.derivedIncomeBoostPercent)/100) * DailyEventsManager.getPegIncomeMultiplier());
                                            gain = Math.round(baseGain * critSettings.damageMult);
                                        }

                                        // Apply micro marble failsafe for pegs hit, including ruby forced criticals
                                        if (b.micro) {
                                            const isCriticalMeltdownNoCrit = state.inChallengeMode && state.challengeState.challengeId === 'critical_meltdown' && !isCritical;
                                            if (!isCriticalMeltdownNoCrit && gain < 1) {
                                                gain = 1;
                                            }
                                        }

                                        if (isCritical) {
                                            state.lifetimeCriticalHits = (state.lifetimeCriticalHits || 0) + 1;
                                            pushEffect({
                                                x: p.x, y: p.y, t: performance.now(), duration: 400, type: 'critical_hit'
                                            });
                                            ProgressionManager.updateMissionProgress(state, 'critical_hits', 1);
                                            if (!state.critMuted) {
                                                audio.play('crit', 0.15, 0.2);
                                            }
                                        }

                                        addMoney(gain);
                                        
                                        const qMode = state.qualityMode || 'high';
                                        let showMoneyPopup = !state.disableMoneyPopups && gain > 0;
                                        if (showMoneyPopup && qMode === 'low') {
                                            showMoneyPopup = isCritical || !!b.master;
                                        } else if (showMoneyPopup && qMode === 'medium') {
                                            if (b.micro && !isCritical) showMoneyPopup = false;
                                        }

                                        if (showMoneyPopup) {
                                            pushPopup({
                                                x: p.x, y: p.y, text: `+$${formatNumber(gain)}`, t: performance.now(),
                                                critical: isCritical, master: b.master, micro: b.micro
                                            });
                                        }
                                        if (!state.pegMuted) {
                                            if(b.micro) audio.play('microPeg', 2, 0.3);
                                            else audio.play('peg', 2, 0.3);
                                        }

                                        // Emerald split effect
                                        if (p.gemType === 'emerald' && !b.isSplit && balls.length < 180) {
                                            const mCount = b.mergeCount || 1;
                                            if (mCount > 1) {
                                                // Unmerge merged marble upon hitting Emerald Peg!
                                                b.mergeCount = 1;
                                                for (let k = 1; k < mCount; k++) {
                                                    const angle = (k / (mCount - 1)) * Math.PI * 2;
                                                    balls.push({
                                                        ...b,
                                                        x: b.x + Math.cos(angle) * 4,
                                                        y: b.y + Math.sin(angle) * 4,
                                                        vx: -b.vx + (Math.random() - 0.5) * 80,
                                                        vy: b.vy + (Math.random() * 40 + 20),
                                                        mergeCount: 1,
                                                        isSplit: true,
                                                        trail: [],
                                                        id: Date.now() + Math.random()
                                                    });
                                                }
                                                pushPopup({
                                                    x: p.x, y: p.y - 14, text: `SPLIT x${mCount}!`, t: performance.now(),
                                                    critical: true, master: b.master, micro: b.micro
                                                });
                                            } else {
                                                const angle = Math.random() * Math.PI * 2;
                                                const splitBall: Ball = {
                                                    x: b.x + Math.cos(angle) * 3,
                                                    y: b.y + Math.sin(angle) * 3,
                                                    vx: -b.vx + (Math.random() - 0.5) * 60,
                                                    vy: b.vy + (Math.random() * 40 + 20),
                                                    radius: b.radius,
                                                    id: Date.now() + Math.random(),
                                                    master: b.master,
                                                    micro: b.micro,
                                                    type: b.type,
                                                    trail: [],
                                                    _pegCooldown: 12,
                                                    age: 0,
                                                    maxAge: b.maxAge,
                                                    isSplit: true
                                                };
                                                balls.push(splitBall);
                                                pushPopup({
                                                    x: p.x, y: p.y - 14, text: "SPLIT!", t: performance.now(),
                                                    critical: false, master: b.master, micro: b.micro
                                                });
                                            }
                                            pushEffect({
                                                x: p.x, y: p.y, t: performance.now(), duration: 250, type: 'micro_spawn'
                                            });
                                        }

                                        // Diamond explosive effect
                                        if (p.gemType === 'diamond') {
                                            p.diamondHits = (p.diamondHits || 0) + (b.mergeCount || 1);
                                            if (p.diamondHits >= 10) {
                                                p.diamondHits = 0; // Reset
                                                audio.play('explode', 1, 0.25); 
                                                
                                                pushEffect({
                                                    x: p.x, y: p.y, t: performance.now(), duration: 500, type: 'explosion'
                                                });
                                                
                                                pushPopup({
                                                    x: p.x, y: p.y - 12, text: "BOOM!", t: performance.now(),
                                                    critical: true, master: b.master, micro: b.micro
                                                });
                                                
                                                // Expel balls outward
                                                const range = 150;
                                                balls.forEach(ball => {
                                                    const dx = ball.x - p.x;
                                                    const dy = ball.y - p.y;
                                                    const dist = Math.sqrt(dx * dx + dy * dy);
                                                    if (dist < range && dist > 0) {
                                                        const pwr = (range - dist) / range;
                                                        ball.vx += (dx / dist) * pwr * 580;
                                                        ball.vy += (dy / dist) * pwr * 580;
                                                    }
                                                });
                                                
                                                // Explode all nearby intact pegs (optimized boundary search on spatial partition grid)
                                                const minCol = Math.max(0, Math.floor((p.x - range) / gridSize));
                                                const maxCol = Math.min(gridCols - 1, Math.floor((p.x + range) / gridSize));
                                                const minRow = Math.max(0, Math.floor((p.y - range) / gridSize));
                                                const maxRow = Math.min(gridRows - 1, Math.floor((p.y + range) / gridSize));

                                                for (let ry = minRow; ry <= maxRow; ry++) {
                                                    for (let rx = minCol; rx <= maxCol; rx++) {
                                                        const cell = pegs[ry][rx];
                                                        for (let k = 0; k < cell.length; k++) {
                                                            const op = cell[k];
                                                            if (op.broken || op === p) continue;
                                                            const odx = op.x - p.x;
                                                            const ody = op.y - p.y;
                                                            const odist = Math.sqrt(odx * odx + ody * ody);
                                                            if (odist < range) {
                                                                op.glow = 1.0;
                                                                op.cooldown = 10;
                                                                state.lifetimePegHits = (state.lifetimePegHits || 0) + 1;
                                                                ProgressionManager.updateMissionProgress(state, 'pegs_hit', 1);
                                                                
                                                                const opIsSandPeg = state.inChallengeMode && state.challengeState?.challengeId === 'sand_peg';
                                                                if (opIsSandPeg) {
                                                                    if (op.hp === undefined) op.hp = 3;
                                                                    op.hp -= 1;
                                                                    if (op.hp <= 0) {
                                                                        op.broken = true;
                                                                        op.respawnTimer = 5;
                                                                        op.reformingStarted = false;
                                                                        
                                                                        const sandLvl = state.challengeState.upgrades.sandPegMultiplier || 0;
                                                                        const pegReward = 1 * (1 + sandLvl);
                                                                        
                                                                        state.challengeState.pegsBrokenCurrency = (state.challengeState.pegsBrokenCurrency || 0) + pegReward;
                                                                        state.challengeState.lifetimePegsBroken = (state.challengeState.lifetimePegsBroken || 0) + 1;
                                                                        
                                                                        pushPopup({
                                                                            x: op.x, y: op.y, text: `+${pegReward} Peg`, t: performance.now(),
                                                                            critical: false, master: false, micro: false
                                                                        });
                                                                        if (onPegBreak) onPegBreak(op);
                                                                    }
                                                                } else {
                                                                    const opBase = stats.pegValue;
                                                                    const { gain: opGain } = PhysicsManager.calculateScore(state, b, opBase, 1, true);
                                                                    addMoney(opGain);
                                                                    const qModeOp = state.qualityMode || 'high';
                                                                    let showOpPopup = !state.disableMoneyPopups && opGain > 0;
                                                                    if (showOpPopup && qModeOp === 'low') {
                                                                        showOpPopup = !!b.master;
                                                                    } else if (showOpPopup && qModeOp === 'medium') {
                                                                        if (b.micro) showOpPopup = false;
                                                                    }
                                                                    if (showOpPopup) {
                                                                        pushPopup({
                                                                            x: op.x, y: op.y, text: `+$${formatNumber(opGain)}`, t: performance.now(),
                                                                            critical: false, master: false, micro: false
                                                                        });
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            } else {
                                                pushPopup({
                                                    x: p.x, y: p.y - 12, text: `${p.diamondHits}/10`, t: performance.now(),
                                                    critical: false, master: false, micro: false
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Basket collision
            const basketTop = height - 40;
            const basketBottom = height - 10;
            const basketW = width / 5;

            // Anti-Gravity Baskets are launch-bumpers!
            if (state.inChallengeMode && state.challengeState.challengeId === 'anti_gravity') {
                if (b.y > basketTop - 10 && b.vy > 0) {
                    b.y = basketTop - 15;
                    b.vy = -Math.abs(b.vy) * 1.5 - 220; // Blast upward
                    b.vx = (Math.random() - 0.5) * 200;
                    b.trail = [];
                    
                    // Anti-Gravity Bumper Launch Payout (25x base peg value) & Basket Mission count
                    const bumperGain = Math.round(stats.pegValue * 25 * Math.max(1, (stats.upgrades.extraBall || 1) * 0.75) * (b.mergeCount || 1));
                    addMoney(bumperGain);
                    state.lifetimeBaskets = (state.lifetimeBaskets || 0) + 1;
                    ProgressionManager.updateMissionProgress(state, 'baskets', 1);

                    if (!state.disableMoneyPopups && bumperGain > 0) {
                        pushPopup({
                            x: b.x, y: b.y, text: `+$${formatNumber(bumperGain)} LAUNCH!`, t: performance.now(),
                            critical: true, master: b.master, micro: b.micro
                        });
                    }

                    audio.play('peg', 1.5, 0.4);
                    return;
                }
            }

            // Check for basket dividers (solid vertical lines)
            let hitDivider = false;
            for (let i = 1; i < 5; i++) {
                const dividerX = i * basketW;
                if (b.y > basketTop && b.x > dividerX - 4 && b.x < dividerX + 4) {
                    // Hit a divider
                    hitDivider = true;
                    if (b.x < dividerX) {
                        b.x = dividerX - 4;
                        b.vx = -Math.abs(b.vx) * 0.5;
                    } else {
                        b.x = dividerX + 4;
                        b.vx = Math.abs(b.vx) * 0.5;
                    }
                }
            }

            if (!hitDivider && b.y > basketTop) {
                if (b.vy > 0) {
                    const basketCount = b.mergeCount || 1;
                    state.lifetimeBaskets = (state.lifetimeBaskets || 0) + basketCount;
                    ProgressionManager.updateMissionProgress(state, 'baskets', basketCount);

                    const idx = Math.floor(b.x / basketW);
                    const baseValues = [10, 5, 20, 5, 10];
                    const base = (baseValues[idx] || 5) + stats.basketValueBonus;
                    const rarityMult = b.type === 'legendary' ? 4 : (b.type === 'rare' ? 3 : (b.type === 'uncommon' ? 2 : 1));
                    
                    const { gain, isCritical } = PhysicsManager.calculateScore(state, b, base, rarityMult);
                    
                    if (isCritical) {
                        state.lifetimeCriticalHits = (state.lifetimeCriticalHits || 0) + 1;
                        pushEffect({
                            x: b.x, y: height - 20, t: performance.now(), duration: 500, type: 'critical_hit'
                        });

                        ProgressionManager.updateMissionProgress(state, 'critical_hits', 1);
                        if (!state.critMuted) {
                            audio.play('crit', 0.15, 0.2);
                        }
                    }

                    if (!state.inChallengeMode || state.challengeState.challengeId !== 'sand_peg') {
                        addMoney(gain);
                    }
                    
                    const isSandPeg = state.inChallengeMode && state.challengeState.challengeId === 'sand_peg';
                    const qModeBasket = state.qualityMode || 'high';
                    let showBasketPopup = !state.disableMoneyPopups && gain > 0 && !isSandPeg;
                    if (showBasketPopup && qModeBasket === 'low') {
                        showBasketPopup = isCritical || !!b.master;
                    }
                    if (showBasketPopup) {
                        pushPopup({
                            x: b.x, y: b.y, text: `+$${formatNumber(gain)}`, t: performance.now(),
                            critical: isCritical, master: b.master, micro: b.micro
                        });
                    }
                    if (!state.basketMuted) {
                        if(b.micro) audio.play('microBasket', 1, 0.4);
                        else audio.play('basket', 1, 0.4);
                    }

                    if (b.micro || b.isSplit) {
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
        const stats = PhysicsManager.getEffectiveStats(state);
        const eventMult = DailyEventsManager.getRarityMultiplier();
        const eventFlat = DailyEventsManager.getRarityFlatBoost();
        const legChance = ((stats.legendaryChancePercent || 0) / 100) * eventMult;
        const rareChance = (((stats.rareChancePercent || 0) / 100) + eventFlat) * eventMult;
        const uncChance = (((stats.uncommonChancePercent || 0) / 100) + eventFlat) * eventMult;

        if (Math.random() < legChance) return 'legendary';
        if (Math.random() < rareChance) return 'rare';
        if (Math.random() < uncChance) return 'uncommon';
        return 'normal';
    }
}
