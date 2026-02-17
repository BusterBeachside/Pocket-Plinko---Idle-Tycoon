
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
    disableMoneyPopups: boolean;
    activeTheme: 'dark' | 'purple'; // New theme setting

    // Stats
    peakMps: number;
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
        extraBall: 0,
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
    disableMoneyPopups: false,
    activeTheme: 'dark', // Default to dark

    peakMps: 0,
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
