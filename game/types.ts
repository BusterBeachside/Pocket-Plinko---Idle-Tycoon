
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

export interface ChallengeState {
    challengeId: string;
    money: number;
    lifetimeEarnings: number;
    pegsBrokenCurrency: number;
    lifetimePegsBroken: number;
    lifetimeMicroMarblesDropped?: number;
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
        sandPegMultiplier: number;
        microAutoclicker?: number;
    };
    currentMps?: number;
    currentRunPeakMps?: number;
    lastPlayTime?: number;
}

export interface ChallengeSummary {
    challengeId: string;
    challengeName: string;
    metric: 'money' | 'pegsBroken';
    finalValue: number;
    medalsClaimed: {
        bronze: boolean;
        silver: boolean;
        gold: boolean;
    };
}

export interface GameState {
    version: number; // For save migration
    money: number;
    lifetimeEarnings: number;
    allTimeEarnings: number;
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
    critMuted: boolean;
    disableMoneyPopups: boolean;
    activeTheme: 'dark' | 'purple'; // New theme setting

    // Stats
    peakMps: number;
    currentRunPeakMps: number; // New: Peak MPS for current run
    currentMps: number;
    lastSaveTime: number;
    lastCloudSyncTime?: number; // New: track when last synced to cloud
    lastTabOutTime?: number; // New: track when user tabbed out
    totalPlayTime: number; // New: seconds
    isOffline: boolean; // New: track online status in state
    
    // Lifetime Stats for Achievements
    lifetimePegHits: number;
    lifetimeBaskets: number;
    lifetimeBonusMarbles: number;
    lifetimeUpgradesBought: number;
    lifetimeCriticalHits: number;
    lifetimeBronzeMedals: number;
    lifetimeSilverMedals: number;
    lifetimeGoldMedals: number;
    
    // Prestige / Core
    kineticShards: number;
    masterMultiplier: number;
    timesPrestiged: number;

    // Collection & Progression
    ownedMarbles: string[];
    activeMarbleSkinID: string;
    activeMarbleTexture: string | null;
    bonusChance: number;

    // Tutorials Seen
    tutorials: { [key: string]: boolean };

    // Runtime (not always persisted fully, but good to have in type)
    bonusMarble?: BonusMarbleState;
    achievements: { [key: string]: any };
    missions: {
        date: string;
        activeDailies: ActiveMission[];
        activeRepeatables: ActiveMission[];
    };
    dailyCompleted: number;
    repeatableCompleted: number;
    lifetimeMissionsCompleted: number;
    achievementsUnlocked: number;
    lastSeenDailyEventId?: string;

    // Challenge and Gem States
    gems: {
        crimson: number;
        azure: number;
        amber: number;
    };
    inChallengeMode: boolean;
    challengeGoalClaimed: { [challengeId: string]: { bronze: boolean; silver: boolean; gold: boolean } };
    challengeState: ChallengeState;
    gemInventory: {
        ruby: number;
        emerald: number;
        diamond: number;
    };
    socketedPegs: {
        [pegIndex: number]: 'ruby' | 'emerald' | 'diamond' | null;
    };
    dailyLogin: {
        lastClaimedDate: string;
        streak: number;
    };
    lastMainPlayTime?: number;
    pendingChallengeSummary?: ChallengeSummary;
    showChallengeSummary?: boolean;
}

export interface ActiveMission {
    id: string;
    instanceId: string;
    type: 'daily' | 'repeatable';
    progress: number;
    completed: boolean;
    claimed: boolean;
}

export const INITIAL_STATE: GameState = {
    version: 2,
    money: 0,
    lifetimeEarnings: 0,
    allTimeEarnings: 0,
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
    critMuted: false,
    disableMoneyPopups: false,
    activeTheme: 'dark', // Default to dark

    peakMps: 0,
    currentRunPeakMps: 0,
    currentMps: 0,
    lastSaveTime: Date.now(),
    lastCloudSyncTime: 0,
    totalPlayTime: 0,
    isOffline: true,
    
    lifetimePegHits: 0,
    lifetimeBaskets: 0,
    lifetimeBonusMarbles: 0,
    lifetimeUpgradesBought: 0,
    lifetimeCriticalHits: 0,
    lifetimeBronzeMedals: 0,
    lifetimeSilverMedals: 0,
    lifetimeGoldMedals: 0,
    
    kineticShards: 0,
    masterMultiplier: 0,
    timesPrestiged: 0,

    ownedMarbles: ['tie_dye_1'],
    activeMarbleSkinID: 'tie_dye_1',
    activeMarbleTexture: null,
    bonusChance: 0.5,
    tutorials: {},
    
    bonusMarble: { active: false, x: 0, y: 0, baseY: 0, t: 0 },
    achievements: {},
    missions: {
        date: '',
        activeDailies: [],
        activeRepeatables: []
    },
    dailyCompleted: 0,
    repeatableCompleted: 0,
    lifetimeMissionsCompleted: 0,
    achievementsUnlocked: 0,
    lastSeenDailyEventId: '',

    // Challenge and Gems Statuses
    dailyLogin: {
        lastClaimedDate: '',
        streak: 0
    },
    gems: {
        crimson: 0,
        azure: 0,
        amber: 0
    },
    inChallengeMode: false,
    challengeGoalClaimed: {},
    challengeState: {
        challengeId: '',
        money: 0,
        lifetimeEarnings: 0,
        pegsBrokenCurrency: 0,
        lifetimePegsBroken: 0,
        lifetimeMicroMarblesDropped: 0,
        upgrades: {
            extraBall: 1, // Start at 1 ball
            pegValue: 0,
            ballSpeed: 0,
            basketValue: 0,
            uncommonChance: 0,
            rareChance: 0,
            legendaryChance: 0,
            criticalChance: 0,
            microValue: 0,
            bonusValue: 0,
            sandPegMultiplier: 0,
            microAutoclicker: 0
        }
    },
    gemInventory: {
        ruby: 0,
        emerald: 0,
        diamond: 0
    },
    socketedPegs: {}
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
    age?: number;
    maxAge?: number;
    isSplit?: boolean;
}

export interface Peg {
    x: number; y: number; glow: number; cooldown: number;
    hitType?: 'normal' | 'uncommon' | 'rare' | 'legendary' | 'master' | 'micro';
    hp?: number;
    broken?: boolean;
    respawnTimer?: number;
    reformingStarted?: boolean;
    gemType?: 'ruby' | 'emerald' | 'diamond' | null;
    diamondHits?: number;
}

export interface SandParticle {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    alpha: number;
    life: number;
    maxLife: number;
    type: 'explode' | 'form';
    startX?: number;
    startY?: number;
    targetX?: number;
    targetY?: number;
}

export interface Popup {
    x: number; y: number; text: string; t: number; critical: boolean; master: boolean; micro: boolean;
}

export interface VisualEffect {
    x: number; y: number; t: number; duration: number; type: 'micro_spawn' | 'critical_hit' | 'explosion';
}
