
export interface UpgradeState {
    level: number;
}

export interface BonusMarbleState {
    active: boolean;
    x: number;
    y: number;
    baseY: number;
    t: number; // time alive
    paused?: boolean;
}

export interface GameState {
    version: number; // For save migration
    money: number;
    lifetimeEarnings: number;
    ballsCount: number;
    pegValue: number;
    ballSpeed: number;
    
    // Chances
    uncommonChancePercent: number;
    rareChancePercent: number;
    legendaryChancePercent: number;
    criticalChancePercent: number;
    
    // Special Values
    microValuePercent: number;
    bonusValuePercent: number;
    basketValueBonus: number;
    
    // Permanent / Derived Boosts (New)
    permanentIncomeBoostPercent: number;
    permanentMicroBoostPercent: number;
    derivedIncomeBoostPercent: number;
    derivedMasterBonus: number;
    
    // Shard Shop State
    permUpgradesLevels: { [key: string]: number };
    permUpgradeCosts: { [key: string]: number };
    shardMultiplierPercent: number;

    // Upgrades Levels
    upgrades: {
        extraBall: number;
        pegValue: number;
        ballSpeed: number;
        basketValue: number;
        uncommonChance: number;
        rareChance: number;
        legendaryChance: number;
        criticalChance: number;
        microValue: number;
        bonusValue: number;
    };
    
    // Config
    sfxVolume: number;
    musicVolume: number;
    sfxMuted: boolean;
    musicMuted: boolean;
    pegMuted: boolean;
    basketMuted: boolean;
    disableMoneyPopups: boolean;
    activeTheme: 'dark' | 'purple'; // New theme setting

    // Stats
    peakMps: number;
    currentRunPeakMps: number; // New: Peak MPS for current run
    currentMps: number;
    lastSaveTime: number;
    totalPlayTime: number; // New: seconds
    
    // Prestige / Core
    kineticShards: number;
    masterMultiplier: number;
    timesPrestiged: number;

    // Collection & Progression
    ownedMarbles: string[];
    activeMarbleSkinID: string;
    activeMarbleTexture: string | null;
    bonusChance: number;

    // Runtime (not always persisted fully, but good to have in type)
    bonusMarble?: BonusMarbleState;
}

export const INITIAL_STATE: GameState = {
    version: 2,
    money: 0,
    lifetimeEarnings: 0,
    ballsCount: 1,
    pegValue: 1,
    ballSpeed: 1,
    
    uncommonChancePercent: 0,
    rareChancePercent: 0,
    legendaryChancePercent: 0,
    criticalChancePercent: 0,
    
    microValuePercent: 0,
    bonusValuePercent: 0,
    basketValueBonus: 0,
    
    permanentIncomeBoostPercent: 0,
    permanentMicroBoostPercent: 0,
    derivedIncomeBoostPercent: 0,
    derivedMasterBonus: 0,
    
    permUpgradesLevels: {},
    permUpgradeCosts: {},
    shardMultiplierPercent: 0,

    upgrades: {
        extraBall: 1, // Start at Level 1 (which equals 1 ball)
        pegValue: 0,
        ballSpeed: 0,
        basketValue: 0,
        uncommonChance: 0,
        rareChance: 0,
        legendaryChance: 0,
        criticalChance: 0,
        microValue: 0,
        bonusValue: 0
    },
    
    sfxVolume: 0.5,
    musicVolume: 0.3,
    sfxMuted: false,
    musicMuted: false,
    pegMuted: false,
    basketMuted: false,
    disableMoneyPopups: false,
    activeTheme: 'dark', // Default to dark

    peakMps: 0,
    currentRunPeakMps: 0,
    currentMps: 0,
    lastSaveTime: Date.now(),
    totalPlayTime: 0,
    
    kineticShards: 0,
    masterMultiplier: 0,
    timesPrestiged: 0,

    ownedMarbles: ['tie_dye_1'],
    activeMarbleSkinID: 'tie_dye_1',
    activeMarbleTexture: null,
    bonusChance: 0.5,
    
    bonusMarble: { active: false, x: 0, y: 0, baseY: 0, t: 0 }
};

export interface UpgradeConfig {
    id: keyof GameState['upgrades'];
    name: string;
    baseCost: number;
    costMultiplier: number;
    description: string;
    unlocksAt?: number; // Requires N balls
    maxPercent?: number; // Max level cap based on percentage
}

// Entity Interfaces extracted from Engine
export interface Ball {
    x: number; y: number; vx: number; vy: number; radius: number;
    id: number;
    master: boolean;
    micro: boolean;
    type: 'normal' | 'uncommon' | 'rare' | 'legendary';
    trail: {x:number, y:number}[];
    _pegCooldown: number;
    _remove?: boolean;
}

export interface Peg {
    x: number; y: number; glow: number; cooldown: number;
}

export interface Popup {
    x: number; y: number; text: string; t: number; critical: boolean; master: boolean; micro: boolean;
}

export interface VisualEffect {
    x: number; y: number; t: number; duration: number; type: 'micro_spawn' | 'critical_hit';
}
