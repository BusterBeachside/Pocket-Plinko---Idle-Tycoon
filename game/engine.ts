
import { GameState, Ball, Peg, Popup, VisualEffect } from './types';
import { AudioController } from './audio';
import { formatNumber } from './utils';
import { SaveSystem } from './saveSystem';
import { GameRenderer } from './renderer';
import { ShopSystem } from './shop';

export class GameEngine {
    state: GameState;
    listeners: Set<() => void> = new Set();
    audio: AudioController;
    renderer: GameRenderer;
    
    // Physics State
    balls: Ball[] = [];
    pegs: Peg[] = [];
    popups: Popup[] = [];
    visualEffects: VisualEffect[] = [];
    
    canvas: HTMLCanvasElement | null = null;
    ctx: CanvasRenderingContext2D | null = null;
    width: number = 400;
    height: number = 600;
    
    lastTime: number = 0;
    running: boolean = false;
    
    // Spatial Grid
    grid: Peg[][][] = [];
    gridSize: number = 64;
    gridCols: number = 0;
    gridRows: number = 0;

    // Config
    pegRadius: number = 6;

    // Income Tracking
    incomeBuffer: number = 0;
    
    // Bonus Marble State
    lastBonusSpawn: number = 0;
    
    // Offline
    offlineEarnings: number = 0;
    
    // UI Throttle
    lastNotify: number = 0;

    constructor() {
        this.state = SaveSystem.loadState();
        SaveSystem.calculateDerivedState(this.state); // Ensure stats are correct on load
        this.audio = new AudioController();
        this.renderer = new GameRenderer();
        this.initPegs();
        
        // Debug Keys
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', (e) => {
                if (e.shiftKey) {
                    switch(e.key.toLowerCase()) {
                        case 'm': 
                            this.addMoney(10000000); 
                            this.notify(); 
                            break;
                        case 's': 
                            this.state.kineticShards += 1000; 
                            this.notify(); 
                            break;
                        case 'b': 
                            this.spawnBonusMarble(); 
                            break;
                    }
                }
            });
        }

        this.startLoop();
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.lastBonusSpawn = Date.now(); 
        this.checkOfflineIncome();
        this.spawnBalls();
    }

    subscribe(callback: () => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb());
    }

    saveState() {
        SaveSystem.saveState(this.state);
    }
    
    resetForPrestige(shardsEarned: number, masterMultiGain: number) {
        // Create new state via SaveSystem
        this.state = SaveSystem.createPrestigeState(this.state, shardsEarned, masterMultiGain);
        
        this.saveState();
        this.balls = [];
        this.spawnBalls();
        
        // Reset music to beginning
        this.audio.restartMusic();
        
        this.notify();
    }

    buyPermanentUpgrade(id: string) {
        if (ShopSystem.buyPermanentUpgrade(this.state, id, this.audio, () => this.saveState())) {
            this.notify();
        }
    }
    
    buySkin(id: string) {
        if (ShopSystem.buySkin(this.state, id, this.audio, () => this.saveState())) {
            this.notify();
        }
    }
    
    equipSkin(id: string) {
        ShopSystem.equipSkin(this.state, id, () => this.saveState());
        this.notify();
    }
    
    private checkOfflineIncome() {
        if (this.state.lastSaveTime) {
            const now = Date.now();
            const diffSeconds = (now - this.state.lastSaveTime) / 1000;
            if (diffSeconds > 60 && this.state.peakMps > 0) {
                const earnings = Math.floor(this.state.peakMps * 0.25 * diffSeconds);
                if (earnings > 0) {
                    this.state.money += earnings;
                    this.state.lifetimeEarnings += earnings;
                    this.offlineEarnings = earnings;
                    this.saveState();
                }
            }
        }
    }

    attachCanvas(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.initPegs(); 
    }

    initPegs() {
        this.pegs = [];
        const spacingX = 40; 
        const spacingY = 40; 
        const rows = 12; // Enough rows to cover the board
        
        for(let r=0; r<rows; r++) {
            // Alternate columns for honeycomb: 11 then 10 (was 9 then 8)
            const cols = (r % 2 === 0) ? 11 : 10;
            
            const rowWidth = (cols - 1) * spacingX;
            // Center the row within the canvas width
            const startX = (this.width - rowWidth) / 2;
            
            for(let c=0; c<cols; c++) {
                this.pegs.push({
                    x: startX + (c * spacingX),
                    y: 80 + (r * spacingY),
                    glow: 0,
                    cooldown: 0
                });
            }
        }

        this.gridCols = Math.ceil(this.width / this.gridSize);
        this.gridRows = Math.ceil(this.height / this.gridSize);
        this.grid = Array.from({ length: this.gridRows }, () => Array.from({ length: this.gridCols }, () => []));

        this.pegs.forEach(p => {
            const gx = Math.floor(p.x / this.gridSize);
            const gy = Math.floor(p.y / this.gridSize);
            if(gx >= 0 && gx < this.gridCols && gy >= 0 && gy < this.gridRows) {
                this.grid[gy][gx].push(p);
            }
        });
    }

    spawnBalls() {
        const targetCount = this.state.upgrades.extraBall; // Removed 1+
        this.balls = this.balls.filter(b => b.y < this.height + 50);
        const currentNormalBalls = this.balls.filter(b => !b.micro).length;

        if (currentNormalBalls < targetCount) {
            const hasMasterUnlock = this.state.masterMultiplier > 0 || this.state.timesPrestiged > 0;
            const masterExists = this.balls.some(b => b.master);
            
            if (hasMasterUnlock && !masterExists) {
                this.spawnBall({ master: true });
            } else {
                this.spawnBall();
            }
        }
    }

    spawnMicroMarble(ignoredX: number, ignoredY: number) {
        const spawnX = Math.random() * this.width;
        const spawnY = 20;
        
        this.spawnBall({ micro: true, x: spawnX, y: spawnY });
        
        this.visualEffects.push({
            x: spawnX, y: spawnY, t: performance.now(), duration: 420, type: 'micro_spawn'
        });
    }

    rollRarity(): 'normal' | 'uncommon' | 'rare' | 'legendary' {
        const legChance = (this.state.legendaryChancePercent || 0) / 100;
        const rareChance = (this.state.rareChancePercent || 0) / 100;
        const uncChance = (this.state.uncommonChancePercent || 0) / 100;

        if (Math.random() < legChance) return 'legendary';
        if (Math.random() < rareChance) return 'rare';
        if (Math.random() < uncChance) return 'uncommon';
        return 'normal';
    }

    spawnBall(overrides: Partial<Ball> = {}) {
        let isMaster = overrides.master || false;
        let isMicro = overrides.micro || false;
        let type: 'normal' | 'uncommon' | 'rare' | 'legendary' = 'normal';

        if (!isMaster && !isMicro) {
            type = this.rollRarity();
        }

        // Master ball radius reduced to 6 (was 8) to match normal balls and avoid getting stuck
        const radius = isMaster ? 6 : (isMicro ? 3 : 6);

        const x = overrides.x !== undefined ? overrides.x : (this.width / 2 + (Math.random() - 0.5) * 50);
        const y = overrides.y !== undefined ? overrides.y : 20;

        this.balls.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: 0,
            radius,
            id: Math.random(),
            master: isMaster,
            micro: isMicro,
            type,
            trail: [],
            _pegCooldown: 0,
            _remove: false,
            ...overrides
        });
    }

    buyUpgrade(id: keyof GameState['upgrades']) {
        if (ShopSystem.buyUpgrade(this.state, id, this.audio, () => this.saveState())) {
            this.notify();
        }
    }

    getUpgradeCost(id: keyof GameState['upgrades']): number {
        return ShopSystem.getUpgradeCost(this.state, id);
    }

    startLoop() {
        this.lastBonusSpawn = Date.now();
        
        const loop = (t: number) => {
            const dt = Math.min((t - this.lastTime) / 1000, 0.1);
            this.lastTime = t;
            this.update(dt);
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);

        setInterval(() => {
            if (!this.running) return;
            
            const mps = Math.round(this.incomeBuffer);
            this.state.currentMps = mps;
            if (mps > this.state.peakMps) this.state.peakMps = mps;
            this.incomeBuffer = 0;
            this.saveState();
            
            if (Date.now() - this.lastBonusSpawn > 60000) {
                if (!this.state.bonusMarble?.active) {
                    const roll = Math.random();
                    if (roll < this.state.bonusChance) {
                        this.spawnBonusMarble();
                    } else {
                        this.lastBonusSpawn = Date.now(); 
                    }
                }
            }
        }, 1000);
    }
    
    spawnBonusMarble() {
        if (!this.state.bonusMarble) this.state.bonusMarble = { active: false, x: 0, y: 0, baseY: 0, t: 0, paused: false };
        
        // Trigger Tutorial Check if not seen
        if (typeof window !== 'undefined' && !localStorage.getItem('plinko_seen_bonus_tutorial_v1')) {
            this.state.bonusMarble.paused = true;
            window.dispatchEvent(new CustomEvent('request-tutorial', { detail: { key: 'tut_bonus' } }));
        }

        this.state.bonusMarble.active = true;
        this.state.bonusMarble.x = this.width + 50;
        this.state.bonusMarble.y = 100 + Math.random() * 200;
        this.state.bonusMarble.baseY = this.state.bonusMarble.y;
        this.state.bonusMarble.t = 0;
        this.lastBonusSpawn = Date.now();
    }
    
    unpauseBonusMarble() {
        if (this.state.bonusMarble) {
            this.state.bonusMarble.paused = false;
        }
    }
    
    clickBonusMarble(x: number, y: number): number {
        if (this.state.bonusMarble && this.state.bonusMarble.active) {
            const bx = this.state.bonusMarble.x;
            const by = this.state.bonusMarble.y;
            const dist = Math.sqrt((x-bx)*(x-bx) + (y-by)*(y-by));
            if (dist < 40) {
                const bonusRate = 0.10 + (this.state.upgrades.bonusValue * 0.05); 
                const amount = Math.max(100, Math.round(this.state.peakMps * bonusRate));
                this.addMoney(amount);
                // NOTE: We do NOT push to popups here anymore to let UI handle it externally
                this.audio.play('bonus');
                this.state.bonusMarble.active = false;
                this.notify();
                return amount;
            }
        }
        return 0;
    }

    addMoney(amount: number) {
        this.state.money += amount;
        this.state.lifetimeEarnings += amount;
        this.incomeBuffer += amount;
    }

    calculateScore(ball: Ball, baseValue: number, rarityMultiplier: number) {
        const isCritical = Math.random() * 100 < this.state.criticalChancePercent;
        
        const marbleCountMult = Math.max(1, (this.state.upgrades.extraBall) * 0.75); // Removed 1+
        
        const totalIncomePercent = (this.state.permanentIncomeBoostPercent || 0) + (this.state.derivedIncomeBoostPercent || 0);
        const permIncomeMult = 1 + (totalIncomePercent / 100);
        
        let multiplier = rarityMultiplier;

        if (ball.micro) {
            const transientPercent = this.state.microValuePercent || 0;
            const permanentPercent = this.state.permanentMicroBoostPercent || 0;
            const microValuePercentage = 1 + transientPercent + permanentPercent;
            multiplier *= (microValuePercentage / 100);
        }

        if (ball.master) {
            const ownedBonus = Math.floor(this.state.ownedMarbles.length); 
            const milestoneBonus = Math.floor(this.state.ownedMarbles.length / 10) * 5;
            const totalMasterMult = (1 + (this.state.masterMultiplier || 0) + ownedBonus + milestoneBonus);
            
            multiplier = totalMasterMult;
        }

        let gain = baseValue * multiplier * marbleCountMult * permIncomeMult;
        if (ball.micro && gain < 1 && gain > 0.01) gain = 1;
        
        // Round to nearest whole number first
        gain = Math.round(gain);
        
        // Apply critical hit doubling after rounding to ensure precise 2x
        if (isCritical) {
            gain *= 2;
        }
        
        return { gain, isCritical };
    }

    update(dt: number) {
        if (!this.running) return; 
        
        // Track play time
        this.state.totalPlayTime = (this.state.totalPlayTime || 0) + dt;

        // Force UI update periodically to keep buttons enabled/disabled correctly
        const now = performance.now();
        if (now - this.lastNotify > 150) { // 6-7 FPS UI state updates
            this.lastNotify = now;
            this.notify();
        }

        const timeScale = this.state.ballSpeed;
        const gravity = 500 * timeScale;
        const bounce = 0.6;
        const pegRadius = this.pegRadius; 

        if (this.state.bonusMarble && this.state.bonusMarble.active) {
            const bm = this.state.bonusMarble;
            if (!bm.paused) {
                bm.t += dt;
                bm.x -= 40 * dt; 
                bm.y = bm.baseY + Math.sin(bm.t * 2) * 30; 
                if (bm.x < -50) bm.active = false;
            }
        }

        this.balls = this.balls.filter(b => b.y < this.height + 100 && !b._remove);

        this.balls.forEach(b => {
            if (b._remove) return;

            b.vy += gravity * dt;
            b.x += b.vx * dt * timeScale;
            b.y += b.vy * dt * timeScale;
            
            // Wall Collision (Simple Bounce)
            if (b.x < b.radius) {
                b.x = b.radius;
                b.vx = Math.abs(b.vx) * 0.6;
            }
            if (b.x > this.width - b.radius) {
                b.x = this.width - b.radius;
                b.vx = -Math.abs(b.vx) * 0.6;
            }
            
            if (b.trail.length > 20) b.trail.shift();
            b.trail.push({x: b.x, y: b.y});

            // Standard peg collision
            if(b._pegCooldown > 0) b._pegCooldown -= dt * 60;

            const gx = Math.floor(b.x / this.gridSize);
            const gy = Math.floor(b.y / this.gridSize);

            for(let dy = -1; dy <= 1; dy++) {
                for(let dx = -1; dx <= 1; dx++) {
                    const cx = gx + dx;
                    const cy = gy + dy;
                    if(cx >= 0 && cx < this.gridCols && cy >= 0 && cy < this.gridRows) {
                        const cell = this.grid[cy][cx];
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
                                    
                                    const pegBase = Math.max(1, this.state.pegValue);
                                    const rarityMult = b.type === 'legendary' ? 4 : (b.type === 'rare' ? 3 : (b.type === 'uncommon' ? 2 : 1));
                                    const { gain, isCritical } = this.calculateScore(b, pegBase, rarityMult);
                                    
                                    if (isCritical) {
                                        this.visualEffects.push({
                                            x: p.x, y: p.y, t: performance.now(), duration: 400, type: 'critical_hit'
                                        });
                                    }

                                    this.addMoney(gain);
                                    if(!this.state.disableMoneyPopups) {
                                        this.popups.push({
                                            x: p.x, y: p.y, text: `+$${formatNumber(gain)}`, t: performance.now(),
                                            critical: isCritical, master: b.master, micro: b.micro
                                        });
                                    }
                                    if (!this.state.pegMuted) {
                                        if(b.micro) this.audio.play('microPeg', 2, 0.3);
                                        else this.audio.play('peg', 2, 0.3);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            if (b.y > this.height - 40 && b.y < this.height - 10) {
                if (b.vy > 0) {
                    const basketWidth = this.width / 5;
                    const idx = Math.floor(b.x / basketWidth);
                    const baseValues = [10, 5, 20, 5, 10];
                    const base = (baseValues[idx] || 5) + this.state.basketValueBonus;
                    const rarityMult = b.type === 'legendary' ? 4 : (b.type === 'rare' ? 3 : (b.type === 'uncommon' ? 2 : 1));
                    
                    const { gain, isCritical } = this.calculateScore(b, base, rarityMult);
                    
                    if (isCritical) {
                        this.visualEffects.push({
                            x: b.x, y: this.height - 20, t: performance.now(), duration: 500, type: 'critical_hit'
                        });
                    }

                    this.addMoney(gain);
                    if(!this.state.disableMoneyPopups) {
                        this.popups.push({
                            x: b.x, y: b.y, text: `+$${formatNumber(gain)}`, t: performance.now(),
                            critical: isCritical, master: b.master, micro: b.micro
                        });
                    }
                    if (!this.state.basketMuted) {
                        if(b.micro) this.audio.play('microBasket', 1, 0.4);
                        else this.audio.play('basket', 1, 0.4);
                    }

                    if (b.micro) {
                        b._remove = true; 
                    } else if (b.master) {
                        // Respawn master centeredish
                        b.y = 20;
                        b.x = this.width / 2 + (Math.random() - 0.5) * 50;
                        b.vx = 0; b.vy = 0;
                        b.trail = [];
                    } else {
                        // Respawn normal balls away from edges, re-rolling rarity
                        b.type = this.rollRarity();
                        b.y = 20;
                        b.x = 20 + Math.random() * (this.width - 40);
                        b.vx = 0; b.vy = 0;
                        b.trail = [];
                    }
                }
            }
        });
        
        this.spawnBalls();
        this.pegs.forEach(p => { if (p.glow > 0) p.glow -= dt * 3; });
        
        // Clean up popups and visual effects
        // Note: Popups array is shared with Renderer, so we filter it here for logic, 
        // Renderer filters it for drawing time.
        // We will remove really old popups to prevent memory leak
        if (this.popups.length > 50) {
             const now = performance.now();
             this.popups = this.popups.filter(p => now - p.t < 1500);
        }
        if (this.visualEffects.length > 20) {
             const now = performance.now();
             this.visualEffects = this.visualEffects.filter(e => now - e.t < 1000);
        }
    }

    draw() {
        if (!this.ctx || !this.canvas) return;
        
        this.renderer.draw(
            this.ctx, 
            this.width, 
            this.height, 
            this.state, 
            this.balls, 
            this.pegs, 
            this.visualEffects, 
            this.popups
        );
    }
}

// Export the singleton instance
export const engine = new GameEngine();
