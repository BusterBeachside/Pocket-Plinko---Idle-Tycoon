
import { GameState, Ball, Peg, Popup, VisualEffect } from './types';
import { AudioController } from './audio';
import { formatNumber } from './utils';
import { SaveSystem } from './saveSystem';
import { GameRenderer } from './renderer';
import { ShopSystem } from './shop';
import { ProgressionManager } from './progression';
import { PhysicsManager } from './physics';
import { Spawner } from './spawner';

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

    microAutoclickerTimer: number = 0;

    notifications: { id: string, message: string, type: 'achievement' | 'mission', fading?: boolean }[] = [];
    
    isGameStarted: boolean = false;
    isResetting: boolean = false;

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
            
            // Visibility Change Listener
            document.addEventListener('visibilitychange', () => {
                this.handleVisibilityChange();
            });
        }

        this.startLoop();
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.state.lastTabOutTime = Date.now();
            this.audio.suspend();
            if (this.state.bonusMarble) {
                this.state.bonusMarble.paused = true;
            }
            this.saveState();
        } else {
            this.audio.resume();
            if (this.state.bonusMarble) {
                this.state.bonusMarble.paused = false;
            }
            
            // Calculate offline income from tab-out
            if (this.state.lastTabOutTime) {
                const now = Date.now();
                const diffSeconds = (now - this.state.lastTabOutTime) / 1000;
                
                // Only award if > 5 seconds (to avoid quick switching spam)
                if (diffSeconds > 5 && this.state.currentRunPeakMps > 0) {
                    // Cap at 24 hours
                    const cappedSeconds = Math.min(diffSeconds, 86400);
                    const earnings = Math.floor(this.state.currentRunPeakMps * 0.25 * cappedSeconds);
                    
                    if (earnings > 0) {
                        this.addMoney(earnings, false); // Don't count towards income buffer to avoid spiking MPS
                        this.offlineEarnings = earnings;
                        this.pushNotification(`Welcome back! You earned $${formatNumber(earnings)} while away.`, 'mission');
                    }
                }
                this.state.lastTabOutTime = undefined;
            }
        }
    }

    start() {
        this.running = true;
        this.isGameStarted = true;
        this.lastTime = performance.now();
        this.lastBonusSpawn = Date.now(); 
        this.checkOfflineIncome(); // Check for long-term offline (closed browser)
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
        if (this.isResetting) return;
        SaveSystem.saveState(this.state);
    }

    hardReset() {
        this.isResetting = true;
        this.running = false;
        if (typeof window !== 'undefined') {
            localStorage.clear();
            location.reload();
        }
    }
    
    resetForPrestige(shardsEarned: number, masterMultiGain: number) {
        // Create new state via SaveSystem
        this.state = SaveSystem.createPrestigeState(this.state, shardsEarned, masterMultiGain);
        
        // Track mission
        ProgressionManager.updateMissionProgress(this.state, 'prestige', 1);

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
            let diffSeconds = (now - this.state.lastSaveTime) / 1000;
            
            // Cap to 24 hours (86400 seconds)
            if (diffSeconds > 86400) diffSeconds = 86400;

            // Only award if > 30 seconds away
            // Use currentRunPeakMps for calculation
            if (diffSeconds > 30 && this.state.currentRunPeakMps > 0) {
                const earnings = Math.floor(this.state.currentRunPeakMps * 0.25 * diffSeconds);
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
        const { pegs, grid, gridCols, gridRows } = Spawner.initPegs(this.width, this.height, this.gridSize);
        this.pegs = pegs;
        this.grid = grid;
        this.gridCols = gridCols;
        this.gridRows = gridRows;
    }

    spawnBalls() {
        Spawner.spawnBalls(this.state, this.balls, this.width, this.height, (o) => this.spawnBall(o));
    }

    spawnMicroMarble(ignoredX: number, ignoredY: number) {
        Spawner.spawnMicroMarble(this.width, (o) => this.spawnBall(o), (e) => this.visualEffects.push(e));
        ProgressionManager.updateMissionProgress(this.state, 'micro_marbles', 1);
    }

    rollRarity(): 'normal' | 'uncommon' | 'rare' | 'legendary' {
        return PhysicsManager.rollRarity(this.state);
    }

    spawnBall(overrides: Partial<Ball> = {}) {
        const ball = Spawner.createBall(this.state, this.width, overrides);
        this.balls.push(ball);
    }

    buyUpgrade(id: keyof GameState['upgrades']) {
        if (ShopSystem.buyUpgrade(this.state, id, this.audio, () => this.saveState())) {
            this.state.lifetimeUpgradesBought = (this.state.lifetimeUpgradesBought || 0) + 1;
            // Track mission
            ProgressionManager.updateMissionProgress(this.state, 'upgrades_bought', 1);
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
            
            // Update All-time Peak
            if (mps > this.state.peakMps) this.state.peakMps = mps;
            
            // Update Current Run Peak
            if (mps > (this.state.currentRunPeakMps || 0)) {
                this.state.currentRunPeakMps = mps;
            }
            
            this.incomeBuffer = 0;
            this.saveState();
            
            if (Date.now() - this.lastBonusSpawn > 60000 && this.isGameStarted) {
                if (!this.state.bonusMarble?.active) {
                    const roll = Math.random();
                    const tutorialSeen = typeof window !== 'undefined' && localStorage.getItem('plinko_seen_bonus_tutorial_v1');
                    
                    // Force first spawn if tutorial not seen
                    if (roll < this.state.bonusChance || !tutorialSeen) {
                        this.spawnBonusMarble();
                    } else {
                        this.lastBonusSpawn = Date.now(); 
                    }
                }
            }
        }, 1000);
    }
    
    spawnBonusMarble() {
        Spawner.spawnBonusMarble(this.state, this.width, (key) => {
            window.dispatchEvent(new CustomEvent('request-tutorial', { detail: { key } }));
        });
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
                // Use currentRunPeakMps instead of all-time peak
                const peakToUse = this.state.currentRunPeakMps || this.state.currentMps || 0;
                const amount = Math.max(100, Math.round(peakToUse * bonusRate));
                this.addMoney(amount, false);
                // NOTE: We do NOT push to popups here anymore to let UI handle it externally
                this.audio.play('bonus');
                this.state.bonusMarble.active = false;
                this.state.lifetimeBonusMarbles = (this.state.lifetimeBonusMarbles || 0) + 1;

                // Track mission
                ProgressionManager.updateMissionProgress(this.state, 'bonus_marbles', 1);

                this.notify();
                return amount;
            }
        }
        return 0;
    }

    addMoney(amount: number, countTowardsIncome: boolean = true) {
        this.state.money += amount;
        this.state.lifetimeEarnings += amount;
        if (countTowardsIncome) {
            this.incomeBuffer += amount;
        }
    }

    calculateScore(ball: Ball, baseValue: number, rarityMultiplier: number) {
        return PhysicsManager.calculateScore(this.state, ball, baseValue, rarityMultiplier);
    }

    update(dt: number) {
        if (!this.running) return; 
        
        this.checkAchievements();
        this.checkMissions();

        // Track play time
        this.state.totalPlayTime = (this.state.totalPlayTime || 0) + dt;

        // Micro Autoclicker Logic
        const autoLevel = this.state.permUpgradesLevels['perm_micro_autoclicker'] || 0;
        if (autoLevel > 0) {
            const marblesPerSecond = autoLevel * 0.1;
            const interval = 1 / marblesPerSecond;
            this.microAutoclickerTimer += dt;
            if (this.microAutoclickerTimer >= interval) {
                this.microAutoclickerTimer -= interval;
                this.spawnMicroMarble(0, 0); // Coordinates are ignored by Spawner.spawnMicroMarble
            }
        }

        // Force UI update periodically
        const now = performance.now();
        if (now - this.lastNotify > 150) {
            this.lastNotify = now;
            this.notify();
        }

        const timeScale = this.state.ballSpeed;

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

        PhysicsManager.updateBalls(
            dt,
            this.state,
            this.balls,
            this.grid,
            this.width,
            this.height,
            this.gridSize,
            this.gridCols,
            this.gridRows,
            this.pegRadius,
            (amount) => this.addMoney(amount),
            (p) => this.popups.push(p),
            (e) => this.visualEffects.push(e),
            this.audio
        );
        
        this.spawnBalls();
        this.pegs.forEach(p => { if (p.glow > 0) p.glow -= dt * 3; });
        
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

    pushNotification(message: string, type: 'achievement' | 'mission') {
        const id = Math.random().toString(36).substr(2, 9);
        this.notifications.push({ id, message, type, fading: false });
        this.notify();
        
        // Start fade out after 3.5 seconds
        setTimeout(() => {
            const n = this.notifications.find(x => x.id === id);
            if (n) {
                n.fading = true;
                this.notify();
            }
        }, 3500);

        // Remove after 4 seconds
        setTimeout(() => {
            this.notifications = this.notifications.filter(n => n.id !== id);
            this.notify();
        }, 4000);
    }

    checkAchievements() {
        ProgressionManager.checkAchievements(this.state, (a, c) => this.addMoney(a, c), (m, t) => this.pushNotification(m, t));
    }

    checkMissions() {
        ProgressionManager.checkMissions(this.state, (m, t) => this.pushNotification(m, t));
    }

    claimMission(instanceId: string) {
        if (ProgressionManager.claimMission(this.state, instanceId, (a, c) => this.addMoney(a, c), (m, t) => this.pushNotification(m, t))) {
            this.audio.play('upgrade');
            this.notify();
            this.saveState();
            return true;
        }
        return false;
    }

    rerollMission(instanceId: string) {
        if (ProgressionManager.rerollMission(this.state, instanceId, (m, t) => this.pushNotification(m, t))) {
            this.audio.play('upgrade');
            this.notify();
            this.saveState();
            return true;
        }
        return false;
    }

    claimAchievement(achievementId: string) {
        if (ProgressionManager.claimAchievement(this.state, achievementId, (a, c) => this.addMoney(a, c), (m, t) => this.pushNotification(m, t))) {
            this.audio.play('upgrade');
            this.notify();
            this.saveState();
            return true;
        }
        return false;
    }
}

// Export the singleton instance
export const engine = new GameEngine();
