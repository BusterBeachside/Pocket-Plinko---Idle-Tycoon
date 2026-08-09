
import { GameState, Ball, Peg, Popup, VisualEffect, SandParticle } from './types';
import { AudioController } from './audio';
import { formatNumber } from './utils';
import { SaveSystem } from './saveSystem';
import { GameRenderer } from './renderer';
import { ShopSystem } from './shop';
import { ProgressionManager } from './progression';
import { PhysicsManager } from './physics';
import { Spawner } from './spawner';
import { UnderdogService } from '../services/underdogService';
import { DailyEventsManager } from './dailyEvents';
import { ChallengesManager } from './challenges';

export class GameEngine {
    state: GameState;
    listeners: Set<() => void> = new Set();
    audio: AudioController;
    renderer: GameRenderer;
    
    // Peg Socket Mode State
    socketingActive: boolean = false;
    selectedSocketIndex: number | null = null;
    hideMarbles: boolean = false;
    
    // Physics State
    balls: Ball[] = [];
    pegs: Peg[] = [];
    popups: Popup[] = [];
    visualEffects: VisualEffect[] = [];
    sandParticles: SandParticle[] = [];
    
    canvas: HTMLCanvasElement | null = null;
    ctx: CanvasRenderingContext2D | null = null;
    width: number = 400;
    height: number = 600;
    
    lastTime: number = 0;
    running: boolean = false;
    debugDoubleSpeed: boolean = false;
    
    // FPS Tracking
    fps: number = 60;
    fpsFrameCount: number = 0;
    fpsLastTime: number = performance.now();
    
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

    notifications: { id: string, message: string, type: 'achievement' | 'mission' | 'multiple_achievements', achievements?: string[], expanded?: boolean, fading?: boolean }[] = [];
    private notificationQueue: { message: string, type: 'achievement' | 'mission' }[] = [];
    private notificationTimeout: any = null;
    
    isGameStarted: boolean = false;
    isResetting: boolean = false;
    isSyncing: boolean = false;
    lastCloudSave: number = 0;
    lastLeaderboardSync: number = 0;

    constructor() {
        this.state = SaveSystem.loadState();
        SaveSystem.calculateDerivedState(this.state); // Ensure stats are correct on load
        this.audio = new AudioController();
        this.renderer = new GameRenderer();
        this.initPegs();
        
        // Visibility Change Listener
        if (typeof window !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                this.handleVisibilityChange();
            });
            (window as any).spawnGoldenBonus = () => this.spawnGoldenBonusMarble();
            (window as any).spawnGoldenBonusMarble = () => this.spawnGoldenBonusMarble();
            (window as any).engine = this;
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
            // Reset bonus spawn timer so it doesn't instantly spawn a second one after the first is resolved
            this.lastBonusSpawn = Date.now();
            
            // Calculate offline income from tab-out
            if (this.state.lastTabOutTime && this.isGameStarted) {
                this.applyAllOfflineIncome(true);
            }
        }
    }

    start() {
        this.running = true;
        this.isGameStarted = true;
        this.lastTime = performance.now();
        this.lastBonusSpawn = Date.now(); 
        this.applyAllOfflineIncome(false); // Check for long-term offline (closed browser)
        this.spawnBalls();
    }

    subscribe(callback: () => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb());
    }

    async saveState(force: boolean = false) {
        if (this.isResetting || this.isSyncing) return;
        
        // Always save to local storage as backup/offline mode
        SaveSystem.saveState(this.state);

        // If debugMode is active, skip Cloud Sync to prevent cheating on official leaderboards
        if (this.state.debugMode) {
            return;
        }

        // If online, sync to Underdog (Throttled to every 30 seconds)
        const now = Date.now();
        if (!this.state.isOffline && !this.isSyncing && (force || (now - this.lastCloudSave > 30000))) {
            this.lastCloudSave = now;
            try {
                const { money, ...stats } = this.state;
                // Clean temporary visual state
                stats.bonusMarble = { active: false, x: 0, y: 0, baseY: 0, t: 0 };
                console.log("[Engine Save] Syncing to Underdog data and leaderboards:", stats);
                
                // Sync both progress and leaderboard on the same cycle for guest and authenticated sessions alike
                await Promise.all([
                    UnderdogService.saveProgress(stats, money, {}),
                    UnderdogService.submitScore(this.state.peakMps, 'mps', {
                        timesPrestiged: this.state.timesPrestiged || 0,
                        masterMultiplier: this.state.masterMultiplier || 1,
                        derivedIncomeBoostPercent: this.state.derivedIncomeBoostPercent || 0,
                        permanentIncomeBoostPercent: this.state.permanentIncomeBoostPercent || 0,
                        activeMarbleSkinID: (this.state.activeMarbleSkinID && this.state.activeMarbleSkinID !== 'default') ? this.state.activeMarbleSkinID : 'marble_white',
                        ownedMarblesCount: this.state.ownedMarbles?.length || 1,
                        kineticShards: this.state.kineticShards || 0,
                        totalPlayTime: this.state.totalPlayTime || 0,
                        lifetimePegHits: this.state.lifetimePegHits || 0,
                        lifetimeBaskets: this.state.lifetimeBaskets || 0,
                        lifetimeCriticalHits: this.state.lifetimeCriticalHits || 0,
                        lifetimeMicroMarbles: this.state.lifetimeMicroMarblesDropped || 0
                    })
                ]);
                this.state.lastCloudSyncTime = Date.now();
                this.lastLeaderboardSync = Date.now();
            } catch (err) {
                console.error("Failed to sync to Underdog SDK:", err);
            }
        }
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

    buyGem(gemType: 'ruby' | 'emerald' | 'diamond') {
        if (ShopSystem.buyGem(this.state, gemType, this.audio, () => this.saveState())) {
            this.notify();
        }
    }

    socketGem(pegIndex: number, type: 'ruby' | 'emerald' | 'diamond') {
        if (!this.state.gems) {
            this.state.gems = { crimson: 0, azure: 0, amber: 0 };
        }
        if (!this.pegs || pegIndex < 0 || pegIndex >= this.pegs.length) return false;
        
        // If there's already a gem in this peg, unsocket it first!
        const existingType = this.state.socketedPegs[pegIndex];
        if (existingType) {
            this.unsocketGem(pegIndex);
        }
        
        // Ensure we have the gem in inventory
        const gemKey = type === 'ruby' ? 'crimson' : (type === 'diamond' ? 'azure' : 'amber');
        if ((this.state.gems[gemKey] || 0) > 0) {
            this.state.gems[gemKey]--;
            this.state.socketedPegs[pegIndex] = type;
            this.syncSocketedPegs();
            this.saveState();
            this.notify();
            this.audio.play('upgrade');
            return true;
        }
        return false;
    }

    unsocketGem(pegIndex: number) {
        if (!this.pegs || pegIndex < 0 || pegIndex >= this.pegs.length) return false;
        
        const existingType = this.state.socketedPegs[pegIndex];
        if (existingType) {
            delete this.state.socketedPegs[pegIndex];
            if (!this.state.gems) {
                this.state.gems = { crimson: 0, azure: 0, amber: 0 };
            }
            const gemKey = existingType === 'ruby' ? 'crimson' : (existingType === 'diamond' ? 'azure' : 'amber');
            this.state.gems[gemKey] = (this.state.gems[gemKey] || 0) + 1;
            this.syncSocketedPegs();
            this.saveState();
            this.notify();
            this.audio.play('upgrade');
            return true;
        }
        return false;
    }

    autoAssignGems() {
        if (!this.pegs) return;
        if (!this.state.gems) {
            this.state.gems = { crimson: 0, azure: 0, amber: 0 };
        }

        const types: { gemType: 'ruby' | 'emerald' | 'diamond', key: 'crimson' | 'azure' | 'amber' }[] = [
            { gemType: 'ruby', key: 'crimson' },
            { gemType: 'emerald', key: 'amber' },
            { gemType: 'diamond', key: 'azure' }
        ];
        let madeChanges = false;
        
        for (const t of types) {
            while ((this.state.gems[t.key] || 0) > 0) {
                const emptyPegIdx = this.pegs.findIndex((p, idx) => !this.state.socketedPegs[idx]);
                if (emptyPegIdx === -1) break;
                
                this.state.gems[t.key]--;
                this.state.socketedPegs[emptyPegIdx] = t.gemType;
                madeChanges = true;
            }
        }
        
        if (madeChanges) {
            this.syncSocketedPegs();
            this.saveState();
            this.notify();
            this.audio.play('upgrade');
        }
    }

    clearAllGems() {
        if (!this.pegs) return;
        let madeChanges = false;
        this.pegs.forEach((p, idx) => {
            const existingType = this.state.socketedPegs[idx];
            if (existingType) {
                delete this.state.socketedPegs[idx];
                if (!this.state.gems) {
                    this.state.gems = { crimson: 0, azure: 0, amber: 0 };
                }
                const gemKey = existingType === 'ruby' ? 'crimson' : (existingType === 'diamond' ? 'azure' : 'amber');
                this.state.gems[gemKey] = (this.state.gems[gemKey] || 0) + 1;
                madeChanges = true;
            }
        });
        if (madeChanges) {
            this.syncSocketedPegs();
            this.saveState();
            this.notify();
            this.audio.play('upgrade');
        }
    }
    
    equipSkin(id: string) {
        ShopSystem.equipSkin(this.state, id, () => this.saveState());
        this.notify();
    }
    
    public applyAllOfflineIncome(fromTabIn: boolean = false) {
        const threshold = fromTabIn ? 5 : 30;
        const now = Date.now();
        
        // --- 1. MAIN BOARD OFFLINE INCOME ---
        const lastMainTime = fromTabIn 
            ? (this.state.lastTabOutTime || this.state.lastMainPlayTime || this.state.lastSaveTime)
            : (this.state.lastMainPlayTime || this.state.lastSaveTime);
            
        if (lastMainTime) {
            let diffSeconds = (now - lastMainTime) / 1000;
            if (diffSeconds > 86400) diffSeconds = 86400; // Cap to 24 hours
            
            if (diffSeconds > threshold && this.state.currentRunPeakMps > 0) {
                const earnings = Math.floor(this.state.currentRunPeakMps * 0.25 * diffSeconds);
                if (earnings > 0) {
                    this.state.money += earnings;
                    this.state.lifetimeEarnings += earnings;
                    this.state.allTimeEarnings = (this.state.allTimeEarnings || 0) + earnings;
                    this.pushNotification(`Welcome back! Offline: +$${formatNumber(earnings)} Career Cash.`, 'mission');
                    if (!this.state.inChallengeMode) {
                        this.offlineEarnings = earnings;
                    }
                }
            }
        }
        this.state.lastMainPlayTime = now;
        
        // --- 2. CHALLENGE BOARD OFFLINE INCOME ---
        if (this.state.challengeState) {
            const lastChallengeTime = fromTabIn
                ? (this.state.lastTabOutTime || this.state.challengeState.lastPlayTime)
                : this.state.challengeState.lastPlayTime;
                
            if (lastChallengeTime) {
                let diffSeconds = (now - lastChallengeTime) / 1000;
                if (diffSeconds > 86400) diffSeconds = 86400; // Cap to 24 hours
                
                const peakMps = this.state.challengeState.currentRunPeakMps || 0;
                if (diffSeconds > threshold && peakMps > 0) {
                    const earnings = Math.floor(peakMps * 0.25 * diffSeconds);
                    if (earnings > 0) {
                        const cid = this.state.challengeState.challengeId;
                        if (cid === 'sand_peg') {
                            this.state.challengeState.pegsBrokenCurrency = (this.state.challengeState.pegsBrokenCurrency || 0) + earnings;
                            this.state.challengeState.lifetimePegsBroken = (this.state.challengeState.lifetimePegsBroken || 0) + earnings;
                            this.pushNotification(`Welcome back! Offline busters broke +${formatNumber(earnings)} Pegs!`, 'mission');
                            if (this.state.inChallengeMode) {
                                this.offlineEarnings = earnings;
                            }
                        } else {
                            this.state.challengeState.money = (this.state.challengeState.money || 0) + earnings;
                            this.state.challengeState.lifetimeEarnings = (this.state.challengeState.lifetimeEarnings || 0) + earnings;
                            this.pushNotification(`Welcome back! Offline: +$${formatNumber(earnings)} Challenge Cash.`, 'mission');
                            if (this.state.inChallengeMode) {
                                this.offlineEarnings = earnings;
                            }
                        }
                    }
                }
            }
            this.state.challengeState.lastPlayTime = now;
        }
        
        this.state.lastTabOutTime = undefined;
        this.saveState();
        this.notify();
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
        this.syncSocketedPegs();
    }

    syncSocketedPegs() {
        if (!this.pegs || !this.state.socketedPegs) return;
        this.pegs.forEach((p, idx) => {
            if (this.state.inChallengeMode) {
                p.gemType = undefined;
                p.diamondHits = 0;
            } else {
                p.gemType = this.state.socketedPegs[idx] || undefined;
                if (p.gemType !== 'diamond') {
                    p.diamondHits = 0;
                }
            }
        });
    }

    respawnAllPegs() {
        if (this.pegs) {
            this.pegs.forEach(p => {
                p.broken = false;
                p.hp = 3;
                p.glow = 1.0;
                p.reformingStarted = false;
                p.respawnTimer = 0;
            });
        }
    }

    spawnBalls() {
        Spawner.spawnBalls(this.state, this.balls, this.width, this.height, (o) => this.spawnBall(o));
    }

    spawnMicroMarble(ignoredX: number, ignoredY: number) {
        if (!this.running) return;
        Spawner.spawnMicroMarble(this.width, (o) => this.spawnBall(o), (e) => this.visualEffects.push(e));
        ProgressionManager.updateMissionProgress(this.state, 'micro_marbles', 1);
        if (this.state.inChallengeMode && this.state.challengeState) {
            this.state.challengeState.lifetimeMicroMarblesDropped = (this.state.challengeState.lifetimeMicroMarblesDropped || 0) + 1;
        }
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
        this.fpsLastTime = performance.now();
        
        const loop = (t: number) => {
            this.fpsFrameCount++;
            if (t - this.fpsLastTime >= 500) {
                this.fps = Math.round((this.fpsFrameCount * 1000) / Math.max(1, t - this.fpsLastTime));
                this.fpsFrameCount = 0;
                this.fpsLastTime = t;
            }

            let dt = Math.min((t - this.lastTime) / 1000, 0.1);
            if (this.debugDoubleSpeed) {
                dt *= 2.0;
            }
            this.lastTime = t;
            this.update(dt);
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);

        setInterval(() => {
            if (!this.running) return;
            
            const mps = Math.round(this.incomeBuffer);
            if (this.state.inChallengeMode && this.state.challengeState) {
                this.state.challengeState.currentMps = mps;
                if (mps > (this.state.challengeState.currentRunPeakMps || 0)) {
                    this.state.challengeState.currentRunPeakMps = mps;
                }
            } else {
                this.state.currentMps = mps;
                
                // Update All-time Peak
                if (mps > this.state.peakMps) {
                    this.state.peakMps = mps;
                    // Force immediate sync to cloud and leaderboard
                    if (!this.state.isOffline) {
                        this.saveState(true);
                    }
                }
                
                // Update Current Run Peak
                if (mps > (this.state.currentRunPeakMps || 0)) {
                    this.state.currentRunPeakMps = mps;
                }
            }
            
            this.incomeBuffer = 0;
            this.saveState();
            
            // Allow bonus marble spawns in challenge mode but ignore the windfall_wednesday daily event if active
            const bSpawnMult = this.state.inChallengeMode ? 1.0 : DailyEventsManager.getBonusSpawnMultiplier();
            const spawnTimerLimit = 60000 / bSpawnMult;
            if (Date.now() - this.lastBonusSpawn > spawnTimerLimit && this.isGameStarted) {
                if (!this.state.bonusMarble?.active) {
                    const roll = Math.random();
                    const tutorialSeen = this.state.tutorials['plinko_seen_bonus_tutorial_v1'] || (typeof window !== 'undefined' && localStorage.getItem('plinko_seen_bonus_tutorial_v1'));
                    
                    const bonusChance = this.state.bonusChance ?? 0.5;
                    // Force first spawn if tutorial not seen
                    if (roll < bonusChance || !tutorialSeen) {
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
                const isChallenge = this.state.inChallengeMode;
                const isSandPeg = isChallenge && this.state.challengeState?.challengeId === 'sand_peg';
                const bonusLevel = isChallenge 
                    ? (this.state.challengeState?.upgrades?.bonusValue || 0)
                    : (this.state.upgrades?.bonusValue || 0);

                const bonusRate = 0.10 + (bonusLevel * 0.10); 
                
                let amount = 0;
                if (isChallenge) {
                    if (isSandPeg) {
                        // Sand Peg: give pegs based on broken peg yield upgrade (sandPegMultiplier) and bonus level
                        const mult = 1 + (this.state.challengeState?.upgrades?.sandPegMultiplier || 0);
                        amount = Math.max(5, Math.round(5 * mult * (1 + bonusLevel * 0.5)));
                        
                        this.state.challengeState.pegsBrokenCurrency = (this.state.challengeState.pegsBrokenCurrency || 0) + amount;
                        this.state.challengeState.lifetimePegsBroken = (this.state.challengeState.lifetimePegsBroken || 0) + amount;
                    } else {
                        // Other challenges: give challenge cash based on peak MPS in the active challenge
                        const peakToUse = this.state.challengeState?.currentRunPeakMps || this.state.challengeState?.currentMps || 0;
                        amount = Math.max(100, Math.round(peakToUse * bonusRate));
                        
                        this.state.challengeState.money = (this.state.challengeState.money || 0) + amount;
                        this.state.challengeState.lifetimeEarnings = (this.state.challengeState.lifetimeEarnings || 0) + amount;
                    }
                } else {
                    const peakToUse = this.state.currentRunPeakMps || this.state.currentMps || 0;
                    amount = Math.max(100, Math.round(peakToUse * bonusRate));
                    this.addMoney(amount, false);
                }

                // NOTE: We do NOT push to popups here anymore to let UI handle it externally
                this.audio.play('bonus', 0, 0.35);
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

    clickGoldenBonusMarble(x: number, y: number): boolean {
        if (!UnderdogService.isWebsim() && !this.state.goldenBonusMarble?.active) return false;
        if (this.state.goldenBonusMarble && this.state.goldenBonusMarble.active) {
            const gx = this.state.goldenBonusMarble.x;
            const gy = this.state.goldenBonusMarble.y;
            const dist = Math.sqrt((x - gx) * (x - gx) + (y - gy) * (y - gy));
            if (dist < 45) {
                this.audio.play('bonus', 0, 0.4);
                this.state.goldenBonusMarble.active = false;
                // Reset spawn timer to randomly 4-5 minutes (240 to 300 seconds)
                this.state.goldenBonusMarble.spawnTimer = 240 + Math.random() * 60;
                this.notify();
                return true;
            }
        }
        return false;
    }

    spawnGoldenBonusMarble(force: boolean = false) {
        if (!force && !UnderdogService.isWebsim()) return;
        const nextTimer = 240 + Math.random() * 60; // 4 to 5 minutes
        if (!this.state.goldenBonusMarble) {
            this.state.goldenBonusMarble = { active: false, x: this.width / 2, y: 80, baseY: 80, t: 0, spawnTimer: nextTimer, activeTimer: 45 };
        }
        this.state.goldenBonusMarble.active = true;
        this.state.goldenBonusMarble.spawnTimer = nextTimer; // Timer for next spawn after this one disappears
        this.state.goldenBonusMarble.activeTimer = 45; // Lingers for up to 45s before despawning if unclicked
        this.state.goldenBonusMarble.baseY = 75 + Math.random() * 20;
        this.state.goldenBonusMarble.y = this.state.goldenBonusMarble.baseY;
        this.state.goldenBonusMarble.x = Math.random() * Math.max(100, this.width - 120) + 60;
        this.state.goldenBonusMarble.t = 0;
        this.notify();
    }

    addMoney(amount: number, countTowardsIncome: boolean = true) {
        if (this.state.inChallengeMode && countTowardsIncome) {
            ChallengesManager.checkAndSyncChallengeState(this.state);
            if (this.state.challengeState.challengeId === 'sand_peg') {
                this.incomeBuffer += amount;
            } else {
                this.state.challengeState.money = (this.state.challengeState.money || 0) + amount;
                this.state.challengeState.lifetimeEarnings = (this.state.challengeState.lifetimeEarnings || 0) + amount;
                this.incomeBuffer += amount;
            }
        } else {
            this.state.money += amount;
            this.state.lifetimeEarnings += amount;
            this.state.allTimeEarnings = (this.state.allTimeEarnings || 0) + amount;
            if (countTowardsIncome) {
                this.incomeBuffer += amount;
            }
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
        let autoLevel = this.state.inChallengeMode ? 0 : (this.state.permUpgradesLevels['perm_micro_autoclicker'] || 0);
        if (this.state.inChallengeMode && this.state.challengeState?.challengeId === 'micro_mania') {
            autoLevel = this.state.challengeState.upgrades.microAutoclicker || 0;
        }
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

        // Golden Bonus Marble update (spawns randomly every 4-5 minutes, lingers near top of canvas - WEBSIM ONLY)
        if (UnderdogService.isWebsim()) {
            if (!this.state.goldenBonusMarble) {
                this.state.goldenBonusMarble = { active: false, x: this.width / 2, y: 80, baseY: 80, t: 0, spawnTimer: 240 + Math.random() * 60, activeTimer: 45 };
            }

            const gbm = this.state.goldenBonusMarble;
            if (!gbm.active) {
                gbm.spawnTimer -= dt;
                if (gbm.spawnTimer <= 0) {
                    this.spawnGoldenBonusMarble();
                }
            } else {
                // Floating motion near top of canvas
                gbm.t += dt;
                const halfW = Math.max(100, (this.width / 2) - 60);
                gbm.x = (this.width / 2) + Math.sin(gbm.t * 0.7) * halfW;
                gbm.y = gbm.baseY + Math.sin(gbm.t * 2.2) * 10;

                // Despawn after activeTimer expires if player doesn't click it
                if (gbm.activeTimer !== undefined) {
                    gbm.activeTimer -= dt;
                    if (gbm.activeTimer <= 0) {
                        gbm.active = false;
                        gbm.spawnTimer = 240 + Math.random() * 60; // Reset spawn timer so it appears again in 4-5 minutes
                        this.notify();
                    }
                }
            }
        } else if (this.state.goldenBonusMarble?.active) {
            this.state.goldenBonusMarble.active = false;
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
            this.audio,
            (peg) => this.spawnSandExplosion(peg)
        );
        
        // Challenge-specific physics updates (e.g. sand peg respawning)
        if (this.state.inChallengeMode && this.state.challengeState?.challengeId === 'sand_peg') {
            this.pegs.forEach(p => {
                if (p.broken) {
                    p.respawnTimer = (p.respawnTimer || 5) - dt;
                    if (p.respawnTimer <= 1.2 && !p.reformingStarted) {
                        p.reformingStarted = true;
                        this.spawnSandForming(p);
                    }
                    if (p.respawnTimer <= 0) {
                        p.broken = false;
                        p.hp = 3;
                        p.glow = 1.0;
                        p.reformingStarted = false;
                    }
                }
            });
        }

        this.updateSandParticles(dt);

        this.spawnBalls();

        // Automated Challenge Milestone Evaluation
        if (this.state.inChallengeMode) {
            const completedAny = ChallengesManager.updateGoalMilestones(
                this.state,
                (msg, type) => {
                    // 1. Dispatch custom event for React-level toast
                    const event = new CustomEvent('challenge-notif', { detail: { msg, type } });
                    window.dispatchEvent(event);

                    // 2. Add to standard in-game notification drawer (extremely robust & visible)
                    this.pushNotification(msg, 'achievement');

                    // 3. Play the custom goal_complete sound
                    this.audio.play('goal_complete');
                },
                (amount, countTowardsIncome) => this.addMoney(amount, countTowardsIncome)
            );
            if (completedAny) {
                this.saveState();
                this.notify();
            }
        }

        this.pegs.forEach(p => { if (p.glow > 0) p.glow -= dt * 3; });
        
        const qModeEng = this.state.qualityMode || 'high';
        const maxPopups = qModeEng === 'low' ? 10 : (qModeEng === 'medium' ? 20 : 50);
        const popupLifespan = qModeEng === 'low' ? 600 : (qModeEng === 'medium' ? 1000 : 1500);
        
        if (this.popups.length > maxPopups) {
             const now = performance.now();
             this.popups = this.popups.filter(p => now - p.t < popupLifespan);
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
            this.hideMarbles ? [] : this.balls, 
            this.pegs, 
            this.hideMarbles ? [] : this.visualEffects, 
            this.hideMarbles ? [] : this.popups,
            this.hideMarbles ? [] : this.sandParticles,
            this.socketingActive,
            !this.running,
            this.fps
        );
    }

    spawnSandExplosion(peg: Peg) {
        // Explode into 15-20 sand particles
        const count = 15 + Math.floor(Math.random() * 6);
        const colors = [
            'rgba(230, 200, 120, 0.95)', // sand gold
            'rgba(245, 222, 179, 0.95)', // wheat
            'rgba(210, 180, 140, 0.95)', // tan
            'rgba(244, 164, 96, 0.95)'   // sandy brown
        ];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 90;
            const p: SandParticle = {
                id: Math.random().toString(),
                x: peg.x + (Math.random() - 0.5) * 4,
                y: peg.y + (Math.random() - 0.5) * 4,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50, // eject slightly upwards
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 1.2 + Math.random() * 1.5,
                alpha: 1.0,
                life: 0,
                maxLife: 2.5 + Math.random() * 1.0, // total 2.5s-3.5s life
                type: 'explode'
            };
            this.sandParticles.push(p);
        }
    }

    spawnSandForming(peg: Peg) {
        // When pegs re-materialize, make particles fly up to the peg position
        const count = 15 + Math.floor(Math.random() * 6);
        const colors = [
            'rgba(230, 200, 120, 0.95)',
            'rgba(245, 222, 179, 0.95)',
            'rgba(210, 180, 140, 0.95)'
        ];
        for (let i = 0; i < count; i++) {
            // Start position: scattered at the bottom of the screen
            const startX = peg.x + (Math.random() - 0.5) * 60;
            const startY = this.height - 5 - Math.random() * 15;
            
            // Target position: forming the peg circumference
            const r = Math.random() * this.pegRadius;
            const theta = Math.random() * Math.PI * 2;
            const targetX = peg.x + Math.cos(theta) * r;
            const targetY = peg.y + Math.sin(theta) * r;

            const p: SandParticle = {
                id: Math.random().toString(),
                x: startX,
                y: startY,
                vx: 0,
                vy: 0,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 1.2 + Math.random() * 1.5,
                alpha: 0.0, // Start invisible, fade in rapidly
                life: 0,
                maxLife: 1.2, // Forming fits exactly inside the final 1.2 seconds of respawn cycle
                type: 'form',
                startX,
                startY,
                targetX,
                targetY
            };
            this.sandParticles.push(p);
        }
    }

    updateSandParticles(dt: number) {
        // Prevent too many active particles
        if (this.sandParticles.length > 400) {
            this.sandParticles = this.sandParticles.slice(-400);
        }

        this.sandParticles.forEach(p => {
            p.life += dt;
            
            if (p.type === 'explode') {
                if (p.y < this.height - 5) {
                    // Physics gravity
                    p.vy += 220 * dt;
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    
                    // Boundary damp
                    if (p.x < 5) { p.x = 5; p.vx = -p.vx * 0.3; }
                    if (p.x > this.width - 5) { p.x = this.width - 5; p.vx = -p.vx * 0.3; }
                } else {
                    // Settle at the bottom/linger
                    p.y = this.height - 5;
                    p.vy = 0;
                    p.vx *= 0.8; // friction
                }

                // Linger and then fade out
                const remaining = p.maxLife - p.life;
                if (remaining < 0.6) {
                    p.alpha = Math.max(0, remaining / 0.6);
                } else {
                    p.alpha = 1.0;
                }
            } else if (p.type === 'form') {
                // Fly dynamically from start (bottom) to peg target!
                const pct = Math.min(1.0, p.life / p.maxLife);
                
                // Position interpolation
                p.x = p.startX! + (p.targetX! - p.startX!) * pct;
                p.y = p.startY! + (p.targetY! - p.startY!) * pct;
                
                // Fade in at start and fade out slightly
                if (pct < 0.2) {
                    p.alpha = pct / 0.2;
                } else {
                    p.alpha = 1.0;
                }
            }
        });

        // Filter expired particles
        this.sandParticles = this.sandParticles.filter(p => p.life < p.maxLife);
    }

    private addNotificationToDisplay(message: string, type: 'achievement' | 'mission' | 'multiple_achievements', achievements?: string[]) {
        const id = Math.random().toString(36).substr(2, 9);
        this.notifications.push({ id, message, type, achievements, expanded: false, fading: false });
        this.notify();
        
        const dismissTime = type === 'multiple_achievements' ? 12000 : 4000;
        const fadeTime = dismissTime - 500;

        // Start fade out after timeout
        setTimeout(() => {
            const n = this.notifications.find(x => x.id === id);
            if (n && !(n.type === 'multiple_achievements' && n.expanded)) {
                n.fading = true;
                this.notify();
            }
        }, fadeTime);

        // Remove after timeout
        setTimeout(() => {
            const n = this.notifications.find(x => x.id === id);
            if (n && !(n.type === 'multiple_achievements' && n.expanded)) {
                this.notifications = this.notifications.filter(n => n.id !== id);
                this.notify();
            }
        }, dismissTime);
    }

    private processNotificationQueue() {
        if (this.notificationQueue.length === 0) return;
        
        const queue = [...this.notificationQueue];
        this.notificationQueue = [];
        this.notificationTimeout = null;

        const groupedToAdd: { message: string, type: 'achievement' | 'mission' | 'multiple_achievements', achievements?: string[] }[] = [];

        // Track matches to combine
        const achievementUnlockedMatches: string[] = [];
        let achievementClaimedCount = 0;
        let achievementClaimedSum = 0;
        const missionCompleteMatches: string[] = [];
        let missionClaimedCount = 0;
        let missionClaimedSum = 0;
        let missionRerollCount = 0;

        const otherCountMap: { [key: string]: { count: number, type: 'achievement' | 'mission' | 'multiple_achievements' } } = {};

        for (const item of queue) {
            const { message, type } = item;

            const achUnlockedMatch = message.match(/^Achievement Unlocked: (.+)!$/);
            const achClaimedMatch = message.match(/^Claimed (.+) reward: \+\$([0-9,]+) Career Cash!$/);
            const misCompleteMatch = message.match(/^Mission Complete: (.+)!$/);
            const isReroll = message.toLowerCase().includes('reroll') || message.toLowerCase().includes('re-roll');

            if (type === 'achievement' && achUnlockedMatch) {
                achievementUnlockedMatches.push(achUnlockedMatch[1]);
            } else if (type === 'achievement' && achClaimedMatch) {
                achievementClaimedCount++;
                const amount = parseInt(achClaimedMatch[2].replace(/,/g, ''), 10);
                achievementClaimedSum += isNaN(amount) ? 0 : amount;
            } else if (type === 'mission' && misCompleteMatch) {
                missionCompleteMatches.push(misCompleteMatch[1]);
            } else if (type === 'mission' && achClaimedMatch) {
                missionClaimedCount++;
                const amount = parseInt(achClaimedMatch[2].replace(/,/g, ''), 10);
                missionClaimedSum += isNaN(amount) ? 0 : amount;
            } else if (isReroll) {
                missionRerollCount++;
            } else {
                if (!otherCountMap[message]) {
                    otherCountMap[message] = { count: 0, type };
                }
                otherCountMap[message].count++;
            }
        }

        // 1. Grouped "Achievement Unlocked" - CONDENSE into multiple_achievements card if length > 1
        if (achievementUnlockedMatches.length > 0) {
            if (achievementUnlockedMatches.length === 1) {
                groupedToAdd.push({
                    message: `Achievement Unlocked: ${achievementUnlockedMatches[0]}!`,
                    type: 'achievement'
                });
            } else {
                groupedToAdd.push({
                    message: `Multiple Achievements Unlocked!`,
                    type: 'multiple_achievements',
                    achievements: achievementUnlockedMatches
                });
            }
        }

        // 2. Grouped "Achievement Claimed"
        if (achievementClaimedCount > 0) {
            if (achievementClaimedCount === 1) {
                const orig = queue.find(x => x.type === 'achievement' && x.message.startsWith('Claimed ') && x.message.includes(' reward:'));
                if (orig) {
                    groupedToAdd.push({ message: orig.message, type: 'achievement' });
                } else {
                    groupedToAdd.push({
                        message: `Claimed Achievement reward: +$${achievementClaimedSum.toLocaleString()} Career Cash!`,
                        type: 'achievement'
                    });
                }
            } else {
                groupedToAdd.push({
                    message: `Claimed ${achievementClaimedCount} Achievement rewards: +$${achievementClaimedSum.toLocaleString()} Career Cash!`,
                    type: 'achievement'
                });
            }
        }

        // 3. Grouped "Mission Complete"
        if (missionCompleteMatches.length > 0) {
            if (missionCompleteMatches.length === 1) {
                groupedToAdd.push({
                    message: `Mission Complete: ${missionCompleteMatches[0]}!`,
                    type: 'mission'
                });
            } else if (missionCompleteMatches.length === 2) {
                groupedToAdd.push({
                    message: `Missions Complete: ${missionCompleteMatches[0]} & ${missionCompleteMatches[1]}!`,
                    type: 'mission'
                });
            } else {
                groupedToAdd.push({
                    message: `Missions Complete: ${missionCompleteMatches[0]} (+${missionCompleteMatches.length - 1} more)!`,
                    type: 'mission'
                });
            }
        }

        // 4. Grouped "Mission Claimed"
        if (missionClaimedCount > 0) {
            if (missionClaimedCount === 1) {
                const orig = queue.find(x => x.type === 'mission' && x.message.startsWith('Claimed ') && x.message.includes(' reward:'));
                if (orig) {
                    groupedToAdd.push({ message: orig.message, type: 'mission' });
                } else {
                    groupedToAdd.push({
                        message: `Claimed Mission reward: +$${missionClaimedSum.toLocaleString()} Career Cash!`,
                        type: 'mission'
                    });
                }
            } else {
                groupedToAdd.push({
                    message: `Claimed ${missionClaimedCount} Mission rewards: +$${missionClaimedSum.toLocaleString()} Career Cash!`,
                    type: 'mission'
                });
            }
        }

        // 4.5. Grouped "Mission Rerolled"
        if (missionRerollCount > 0) {
            if (missionRerollCount === 1) {
                groupedToAdd.push({
                    message: `Mission Rerolled!`,
                    type: 'mission'
                });
            } else {
                groupedToAdd.push({
                    message: `${missionRerollCount} Missions Rerolled!`,
                    type: 'mission'
                });
            }
        }

        // 5. "Other" unique/identical messages
        for (const [msg, info] of Object.entries(otherCountMap)) {
            if (info.count === 1) {
                groupedToAdd.push({ message: msg, type: info.type });
            } else {
                groupedToAdd.push({ message: `${msg} (x${info.count})`, type: info.type });
            }
        }

        // Fire display notifications
        for (const item of groupedToAdd) {
            this.addNotificationToDisplay(item.message, item.type, item.achievements);
        }
    }

    pushNotification(message: string, type: 'achievement' | 'mission') {
        this.notificationQueue.push({ message, type });
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        this.notificationTimeout = setTimeout(() => {
            this.processNotificationQueue();
        }, 50);
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

    rerollMission(instanceId: string, useShards: boolean = false) {
        if (ProgressionManager.rerollMission(this.state, instanceId, useShards, (m, t) => this.pushNotification(m, t))) {
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

    claimAllMissions() {
        let anyClaimed = false;
        // Dailies
        if (this.state.missions?.activeDailies) {
            const claimableDailies = this.state.missions.activeDailies.filter(m => m.completed && !m.claimed);
            for (const m of claimableDailies) {
                if (ProgressionManager.claimMission(this.state, m.instanceId, (a, c) => this.addMoney(a, c), (m, t) => this.pushNotification(m, t))) {
                    anyClaimed = true;
                }
            }
        }
        // Repeatables (splice safety copy)
        if (this.state.missions?.activeRepeatables) {
            const claimableRepeatableIds = this.state.missions.activeRepeatables
                .filter(m => m.completed && !m.claimed)
                .map(m => m.instanceId);
            for (const instanceId of claimableRepeatableIds) {
                if (ProgressionManager.claimMission(this.state, instanceId, (a, c) => this.addMoney(a, c), (m, t) => this.pushNotification(m, t))) {
                    anyClaimed = true;
                }
            }
        }
        if (anyClaimed) {
            this.audio.play('upgrade');
            this.notify();
            this.saveState();
            return true;
        }
        return false;
    }

    claimAllAchievements() {
        let anyClaimed = false;
        const achievementIds = Object.keys(this.state.achievements);
        for (const id of achievementIds) {
            const aState = this.state.achievements[id];
            const isCompleted = aState === true || (aState && typeof aState === 'object' && aState.completed);
            const isClaimed = aState && typeof aState === 'object' && aState.claimed;
            if (isCompleted && !isClaimed) {
                if (ProgressionManager.claimAchievement(this.state, id, (a, c) => this.addMoney(a, c), (m, t) => this.pushNotification(m, t))) {
                    anyClaimed = true;
                }
            }
        }
        if (anyClaimed) {
            this.audio.play('upgrade');
            this.notify();
            this.saveState();
            return true;
        }
        return false;
    }

    findClosestPegIndex(x: number, y: number, maxDist: number = 20): number | null {
        if (!this.pegs) return null;
        let bestIdx: number | null = null;
        let bestDist = maxDist;
        
        for (let i = 0; i < this.pegs.length; i++) {
            const p = this.pegs[i];
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }
        return bestIdx;
    }
}

// Export the singleton instance
export const engine = new GameEngine();

if (typeof window !== 'undefined') {
    const spawnFn = () => {
        console.log("[Pocket Plinko] Spawning Golden Bonus Marble...");
        engine.spawnGoldenBonusMarble(true);
        window.dispatchEvent(new CustomEvent('open-golden-bonus-modal'));
    };
    (window as any).engine = engine;
    (window as any).spawnGoldenBonus = spawnFn;
    (window as any).spawnGoldenBonusMarble = spawnFn;
    try {
        if (window.top && window.top !== window) {
            (window.top as any).engine = engine;
            (window.top as any).spawnGoldenBonus = spawnFn;
            (window.top as any).spawnGoldenBonusMarble = spawnFn;
        }
    } catch (e) {}
}
