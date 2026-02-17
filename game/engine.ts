// ... (Keep existing imports)
import { GameState, INITIAL_STATE } from './types';
import { UPGRADES } from './config';
import { AudioController } from './audio';
import { PERM_UPGRADES, MARBLE_SKINS } from './shardShopConfig';
import { assets } from './assets';
import { formatNumber } from './utils';

// ... (Keep existing interfaces)
interface Ball {
    x: number; y: number; vx: number; vy: number; radius: number;
    id: number;
    // Types
    master: boolean;
    micro: boolean;
    type: 'normal' | 'uncommon' | 'rare' | 'legendary';
    trail: {x:number, y:number}[];
    _pegCooldown: number;
    _remove?: boolean; // Flag for removal
}

interface Peg {
    x: number; y: number; glow: number; cooldown: number;
}

interface Popup {
    x: number; y: number; text: string; t: number; critical: boolean; master: boolean; micro: boolean;
}

interface VisualEffect {
    x: number; y: number; t: number; duration: number; type: 'micro_spawn';
}

export class GameEngine {
    // ... (Keep existing properties)
    state: GameState;
    listeners: Set<() => void> = new Set();
    audio: AudioController;
    
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
    
    // Texture Cache
    textureCache: Map<string, HTMLImageElement> = new Map();

    // UI Throttle
    lastNotify: number = 0;

    constructor() {
        this.state = this.loadState();
        this.calculateDerivedState(); // Ensure stats are correct on load
        this.audio = new AudioController();
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

    private loadState(): GameState {
        const saved = localStorage.getItem('plinko_react_v1');
        if (saved) {
            const parsed = JSON.parse(saved);
            const loaded = { 
                ...INITIAL_STATE, 
                ...parsed,
                permUpgradesLevels: { ...INITIAL_STATE.permUpgradesLevels, ...parsed.permUpgradesLevels },
                permUpgradeCosts: { ...INITIAL_STATE.permUpgradeCosts, ...parsed.permUpgradeCosts },
                ownedMarbles: parsed.ownedMarbles || INITIAL_STATE.ownedMarbles,
                activeTheme: parsed.activeTheme || INITIAL_STATE.activeTheme // Load theme
            };
            // Ensure upgrades object structure is complete even if loaded from partial save
            loaded.upgrades = { ...INITIAL_STATE.upgrades, ...(parsed.upgrades || {}) };
            return loaded;
        }
        return JSON.parse(JSON.stringify(INITIAL_STATE));
    }

    saveState() {
        this.state.lastSaveTime = Date.now();
        localStorage.setItem('plinko_react_v1', JSON.stringify(this.state));
    }
    
    calculateDerivedState() {
        // Sync stats from upgrade levels to ensure consistency (fix for desync issues)
        const u = this.state.upgrades;
        this.state.pegValue = 1 + (u.pegValue * 2);
        this.state.microValuePercent = u.microValue; // 1% per level
        this.state.uncommonChancePercent = Math.min(20, u.uncommonChance);
        this.state.basketValueBonus = u.basketValue * 10;
        this.state.criticalChancePercent = Math.min(20, u.criticalChance);
        this.state.bonusValuePercent = u.bonusValue * 5;
        this.state.rareChancePercent = Math.min(20, u.rareChance);
        this.state.ballSpeed = Math.pow(1.05, u.ballSpeed);
        this.state.legendaryChancePercent = Math.min(20, u.legendaryChance);

        // Calculate derived boosts from skins and milestones
        const ownedCount = this.state.ownedMarbles.length;
        // Derived bonuses: +1% income and +1 master mult per skin (excluding default? legacy logic implies straightforward count)
        // Legacy: "ownedSkinsMasterBonus = effectiveOwnedForBonus" where effectiveOwnedForBonus was total count.
        this.state.derivedIncomeBoostPercent = ownedCount + Math.floor(ownedCount / 10) * 5;
        this.state.derivedMasterBonus = ownedCount + Math.floor(ownedCount / 10) * 5;
    }
    
    resetForPrestige(shardsEarned: number, masterMultiGain: number) {
        const keptShards = this.state.kineticShards + shardsEarned;
        const keptPrestiged = this.state.timesPrestiged + 1;
        const keptMasterMult = this.state.masterMultiplier + masterMultiGain;
        const keptPermUpgrades = { ...this.state.permUpgradesLevels };
        const keptPermCosts = { ...this.state.permUpgradeCosts };
        const keptOwned = [...this.state.ownedMarbles];
        const keptSkin = this.state.activeMarbleSkinID;
        const keptTexture = this.state.activeMarbleTexture;
        const keptBonusChance = this.state.bonusChance;
        const keptPermIncome = this.state.permanentIncomeBoostPercent;
        const keptPermMicro = this.state.permanentMicroBoostPercent;
        const keptTheme = this.state.activeTheme;
        const keptTotalPlayTime = this.state.totalPlayTime;
        
        this.state = {
            ...INITIAL_STATE,
            kineticShards: keptShards,
            timesPrestiged: keptPrestiged,
            masterMultiplier: keptMasterMult,
            permUpgradesLevels: keptPermUpgrades,
            permUpgradeCosts: keptPermCosts,
            ownedMarbles: keptOwned,
            activeMarbleSkinID: keptSkin,
            activeMarbleTexture: keptTexture,
            bonusChance: keptBonusChance,
            permanentIncomeBoostPercent: keptPermIncome,
            permanentMicroBoostPercent: keptPermMicro,
            activeTheme: keptTheme,
            totalPlayTime: keptTotalPlayTime
        };
        
        this.calculateDerivedState();
        this.saveState();
        this.balls = [];
        this.spawnBalls();
        
        // Reset music to beginning
        this.audio.restartMusic();
        
        this.notify();
    }

    buyPermanentUpgrade(id: string) {
        const cfg = PERM_UPGRADES.find(u => u.id === id);
        if (!cfg) return;
        
        const currentLevel = this.state.permUpgradesLevels[id] || 0;
        const currentCost = this.state.permUpgradeCosts[id] || cfg.baseCost;
        
        if (this.state.kineticShards >= currentCost) {
            if (cfg.maxLevel && currentLevel >= cfg.maxLevel) return;

            this.state.kineticShards -= currentCost;
            this.state.permUpgradesLevels[id] = currentLevel + 1;
            this.state.permUpgradeCosts[id] = Math.floor(currentCost * 1.4);
            
            if (id === 'perm_income_a') {
                this.state.permanentIncomeBoostPercent = (this.state.permanentIncomeBoostPercent || 0) + 5;
            } else if (id === 'perm_shard_multi') {
                this.state.shardMultiplierPercent = (this.state.shardMultiplierPercent || 0) + 10;
            } else if (id === 'perm_micro_boost') {
                this.state.permanentMicroBoostPercent = (this.state.permanentMicroBoostPercent || 0) + 2;
            } else if (id === 'perm_bonus_chance') {
                this.state.bonusChance = Math.min(1, 0.5 + ((currentLevel + 1) * 0.01));
            }
            
            this.audio.play('upgrade');
            this.saveState();
            this.notify();
        }
    }
    
    buySkin(id: string) {
        const skin = MARBLE_SKINS.find(s => s.id === id);
        if (!skin) return;
        
        const ownedCount = this.state.ownedMarbles.length;
        const cost = Math.round(skin.cost * (1 + ownedCount * 0.25));
        
        if (this.state.kineticShards >= cost && !this.state.ownedMarbles.includes(id)) {
            this.state.kineticShards -= cost;
            this.state.ownedMarbles.push(id);
            this.calculateDerivedState();
            this.audio.play('upgrade');
            this.saveState();
            this.notify();
        }
    }
    
    equipSkin(id: string) {
        if (this.state.ownedMarbles.includes(id)) {
            this.state.activeMarbleSkinID = id;
            const skin = MARBLE_SKINS.find(s => s.id === id);
            this.state.activeMarbleTexture = skin && skin.texture ? skin.texture : null;
            this.saveState();
            this.notify();
        }
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
            // Alternate columns for honeycomb: 9 then 8
            const cols = (r % 2 === 0) ? 9 : 8;
            
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

    // ... (Keep spawnBalls, spawnMicroMarble, rollRarity, spawnBall, buyUpgrade, getUpgradeCost, startLoop, spawnBonusMarble, unpauseBonusMarble)

    spawnBalls() {
        const targetCount = 1 + this.state.upgrades.extraBall;
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

        const radius = isMaster ? 8 : (isMicro ? 3 : 6);

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
        const cfg = UPGRADES.find(u => u.id === id);
        if (!cfg) return;

        const level = this.state.upgrades[id];
        const cost = Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, level));

        if (cfg.unlocksAt && (this.state.upgrades.extraBall + 1) < cfg.unlocksAt) return;
        if (cfg.maxPercent) {
             const currentPercent = this.state[id + 'Percent' as keyof GameState] as number;
             if (currentPercent >= cfg.maxPercent) return;
        }

        if (this.state.money >= cost) {
            this.state.money -= cost;
            this.state.upgrades[id]++;
            this.state.lifetimeEarnings += cost;
            
            // Recalculate derived stats immediately to ensure effects apply
            this.calculateDerivedState();
            
            this.audio.play('upgrade');
            this.saveState();
            this.notify();
        }
    }

    getUpgradeCost(id: keyof GameState['upgrades']): number {
        const cfg = UPGRADES.find(u => u.id === id);
        if (!cfg) return 0;
        const level = this.state.upgrades[id];
        return Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, level));
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
        
        const marbleCountMult = Math.max(1, (1 + this.state.upgrades.extraBall) * 0.75);
        
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
                                    
                                    this.addMoney(gain);
                                    if(!this.state.disableMoneyPopups) {
                                        this.popups.push({
                                            x: p.x, y: p.y, text: `+$${formatNumber(gain)}`, t: performance.now(),
                                            critical: isCritical, master: b.master, micro: b.micro
                                        });
                                    }
                                    if(b.micro) this.audio.play('microPeg', 2, 0.3);
                                    else this.audio.play('peg', 2, 0.3);
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

                    this.addMoney(gain);
                    if(!this.state.disableMoneyPopups) {
                        this.popups.push({
                            x: b.x, y: b.y, text: `+$${formatNumber(gain)}`, t: performance.now(),
                            critical: isCritical, master: b.master, micro: b.micro
                        });
                    }
                    if(b.micro) this.audio.play('microBasket', 1, 0.4);
                    else this.audio.play('basket', 1, 0.4);

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
    }

    draw() {
        if (!this.ctx || !this.canvas) return;
        const { width, height, ctx } = this;

        ctx.clearRect(0, 0, width, height);
        
        // Faint Tech Grid Background
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let gx=0; gx<=width; gx+=40) { ctx.moveTo(gx, 0); ctx.lineTo(gx, height); }
        for(let gy=0; gy<=height; gy+=40) { ctx.moveTo(0, gy); ctx.lineTo(width, gy); }
        ctx.stroke();
        ctx.restore();

        // Enhanced Neon Side Glow/Walls
        ctx.save();
        const wallGradLeft = ctx.createLinearGradient(0, 0, 40, 0);
        wallGradLeft.addColorStop(0, 'rgba(50, 220, 255, 0.3)');
        wallGradLeft.addColorStop(1, 'rgba(50, 220, 255, 0)');
        ctx.fillStyle = wallGradLeft;
        ctx.fillRect(0, 0, 40, height);
        
        const wallGradRight = ctx.createLinearGradient(width, 0, width - 40, 0);
        wallGradRight.addColorStop(0, 'rgba(220, 50, 255, 0.3)');
        wallGradRight.addColorStop(1, 'rgba(220, 50, 255, 0)');
        ctx.fillStyle = wallGradRight;
        ctx.fillRect(width - 40, 0, 40, height);
        ctx.restore();
        
        // Draw Pegs with 3D spherical look + neon hit glow
        this.pegs.forEach(p => {
            ctx.beginPath();
            // Spherical gradient
            const grad = ctx.createRadialGradient(p.x - 2, p.y - 2, 1, p.x, p.y, this.pegRadius);
            
            if (p.glow > 0) {
                // Active Glow (Gold burst)
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ffd700';
                grad.addColorStop(0, '#fff');
                grad.addColorStop(0.2, '#fff7cc');
                grad.addColorStop(1, '#ffab00');
            } else {
                // Idle Metallic/Glass look
                grad.addColorStop(0, '#e6e6e6');
                grad.addColorStop(0.3, '#999');
                grad.addColorStop(1, '#444');
                ctx.shadowBlur = 0;
            }
            
            ctx.fillStyle = grad;
            ctx.arc(p.x, p.y, this.pegRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        if (this.state.bonusMarble && this.state.bonusMarble.active) {
            const bm = this.state.bonusMarble;
            ctx.save();
            ctx.translate(bm.x, bm.y);
            
            const bonusImage = assets.get('bonus');
            
            if (bonusImage && bonusImage.complete && bonusImage.naturalWidth > 0) {
                const aspectRatio = bonusImage.naturalWidth / bonusImage.naturalHeight;
                const drawW = 75; // Increased size
                const drawH = drawW / aspectRatio;
                ctx.shadowBlur = 20;
                ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
                ctx.drawImage(bonusImage, -drawW/2, -drawH/2, drawW, drawH);
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = '#ff6b6b';
                ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.fill();
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.ellipse(-20, 0, 16, 8, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(20, 0, 16, 8, 0, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        }

        for (let i = this.visualEffects.length - 1; i >= 0; i--) {
            const e = this.visualEffects[i];
            const elapsed = performance.now() - e.t;
            if (elapsed > e.duration) {
                this.visualEffects.splice(i, 1);
                continue;
            }
            const pct = elapsed / e.duration;
            const alpha = 1 - pct;
            const r = 2 + pct * 36;
            
            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = Math.max(1, 4 * (1 - pct));
            ctx.strokeStyle = `rgba(100,220,255,${0.9 * alpha})`;
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Master Aura Pass (Before other balls to be in background but over board)
        this.balls.forEach(b => {
            if (b.master) {
                const time = performance.now();
                const hue = (time / 15) % 360; 
                const auraR = b.radius * 8; 
                
                ctx.save();
                ctx.globalCompositeOperation = 'lighter'; 
                
                const g = ctx.createRadialGradient(b.x, b.y, b.radius, b.x, b.y, auraR);
                g.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.6)`);
                g.addColorStop(0.4, `hsla(${(hue+60)%360}, 100%, 50%, 0.3)`);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(b.x, b.y, auraR, 0, Math.PI*2);
                ctx.fill();
                
                ctx.restore();
            }
        });

        this.balls.forEach(b => {
            // Draw Trails as fading circles (Legacy Style)
            if (b.trail.length > 0) {
                for(let i=0; i<b.trail.length; i++) {
                    const pt = b.trail[i];
                    // Alpha increases for newer points
                    const tAlpha = (i / b.trail.length) * (b.master ? 0.75 : 0.45);
                    const tRadius = Math.max(0.6, b.radius * (i / b.trail.length));
                    
                    let trailCol = 'rgba(255,255,255,1)';
                    if (b.master) {
                        const hue = (performance.now() / 10 + i * 12) % 360;
                        trailCol = `hsla(${hue}, 85%, 60%, 1)`;
                    } else if (b.micro) {
                        trailCol = '#b200ff';
                    } else if (b.type === 'legendary') {
                        trailCol = '#39ff14';
                    } else if (b.type === 'rare') {
                        trailCol = '#ff2e2e';
                    } else if (b.type === 'uncommon') {
                        trailCol = '#00f5ff';
                    }

                    ctx.globalAlpha = tAlpha;
                    ctx.fillStyle = trailCol;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, tRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1.0;
            }

            if (b.master && this.state.activeMarbleTexture && this.state.activeMarbleTexture !== 'null') {
                const tex = this.state.activeMarbleTexture;
                let img = this.textureCache.get(tex);
                if (!img) {
                    img = new Image();
                    // Set to cache immediately so we don't spam fetch
                    this.textureCache.set(tex, img);
                    
                    fetch(`./images/${tex}`)
                        .then(response => {
                            if(response.ok) return response.blob();
                            throw new Error('Network response was not ok.');
                        })
                        .then(blob => {
                            const objectURL = URL.createObjectURL(blob);
                            img!.src = objectURL;
                        })
                        .catch(e => {
                            console.error('Texture load failed:', tex, e);
                        });
                }
                
                if (img.complete && img.naturalWidth) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.translate(b.x, b.y);
                    const angle = Math.atan2(b.vy, b.vx);
                    ctx.rotate(angle);
                    const size = b.radius * 2;
                    ctx.drawImage(img, -size/2, -size/2, size, size);
                    ctx.restore();
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else {
                    this.drawMasterRainbow(ctx, b.x, b.y, b.radius);
                }
            } else if (b.master) {
                this.drawMasterRainbow(ctx, b.x, b.y, b.radius);
            } else {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                let color = '#fff';
                if (b.micro) color = '#b200ff';
                else if (b.type === 'legendary') color = '#39ff14';
                else if (b.type === 'rare') color = '#ff2e2e';
                else if (b.type === 'uncommon') color = '#00f5ff';
                
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        });
        
        // Draw Fancy Baskets with strong neon glow
        const basketColors = ['#a55eea', '#f7b731', '#26de81', '#f7b731', '#a55eea']; // Tweaked neon palette
        const baseValues = [10, 5, 20, 5, 10];
        const basketW = width / 5;
        const basketH = 35; // Visual height
        
        const marbleCountMult = Math.max(1, (1 + this.state.upgrades.extraBall) * 0.75);
        const totalIncomePercent = (this.state.permanentIncomeBoostPercent || 0) + (this.state.derivedIncomeBoostPercent || 0);
        const permIncomeMult = 1 + (totalIncomePercent / 100);
        const displayMult = marbleCountMult * permIncomeMult;

        for(let i=0; i<5; i++) {
            const bx = i * basketW;
            const by = height - basketH;
            const col = basketColors[i];
            
            ctx.save();
            
            // Strong Neon Glow
            ctx.shadowBlur = 30; // Increased blur
            ctx.shadowColor = col;
            
            // Background with Gradient
            const bgGrad = ctx.createLinearGradient(bx, by, bx, height);
            bgGrad.addColorStop(0, col); // Solid at top
            bgGrad.addColorStop(1, 'rgba(0,0,0,0.2)'); // Fade to dark
            
            ctx.fillStyle = bgGrad;
            ctx.globalAlpha = 0.3;
            // Draw shape with rounded top
            ctx.beginPath();
            ctx.moveTo(bx + 4, by);
            ctx.lineTo(bx + basketW - 4, by);
            ctx.lineTo(bx + basketW - 4, height);
            ctx.lineTo(bx + 4, height);
            ctx.closePath();
            ctx.fill();
            
            ctx.globalAlpha = 1.0;
            
            // Bright Top Line (The "Lip")
            ctx.strokeStyle = col;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(bx + 4, by);
            ctx.lineTo(bx + basketW - 4, by);
            ctx.stroke();
            
            // Text
            const val = (baseValues[i] + this.state.basketValueBonus) * displayMult;
            ctx.fillStyle = '#fff';
            ctx.font = '800 13px "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            
            let txt = formatNumber(val);
            ctx.fillText(`$${txt}`, bx + basketW/2, by + basketH/2 + 2);
            
            ctx.restore();
        }

        const now = performance.now();
        this.popups = this.popups.filter(p => now - p.t < 1000);
        this.popups.forEach(p => {
            const age = (now - p.t) / 1000;
            const yOff = age * 50;
            const alpha = 1 - age;
            
            if (p.master) {
                const hue = (now / 5) % 360;
                ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
                ctx.font = '900 20px Arial';
            } else {
                ctx.fillStyle = p.critical ? `rgba(255, 250, 122, ${alpha})` : `rgba(255, 215, 0, ${alpha})`;
                ctx.font = p.critical ? 'bold 24px Arial' : 'bold 16px Arial';
            }
            
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y - yOff);
        });
    }
    
    private drawMasterRainbow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
        const hue = (performance.now() / 20) % 360;
        const grad = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, r);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.5, `hsl(${hue}, 100%, 50%)`);
        grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 100%, 40%)`);
        ctx.fillStyle = grad;
        ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
        ctx.shadowBlur = 15;
        ctx.beginPath(); 
        ctx.arc(x, y, r, 0, Math.PI * 2); 
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

export const engine = new GameEngine();