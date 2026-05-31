import { GameState } from './types';

export interface RewardDetails {
    day: number;
    type: 'cash' | 'shards' | 'gem' | 'multi';
    label: string;
    description: string;
    icon: string; // Emoji representing the reward
}

export const getDaysDifference = (d1Str: string, d2Str: string): number => {
    if (!d1Str || !d2Str) return -1;
    try {
        const d1 = new Date(d1Str + 'T12:00:00');
        const d2 = new Date(d2Str + 'T12:00:00');
        const diffTime = d2.getTime() - d1.getTime();
        return Math.round(diffTime / (1000 * 60 * 60 * 24));
    } catch {
        return -1;
    }
};

export const getTodayDateString = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
};

export const DAILY_LOGIN_REWARDS_CONFIG: RewardDetails[] = [
    {
        day: 1,
        type: 'cash',
        label: 'Pocket Change',
        description: 'A helpful boost of cash to purchase basic ball upgrades.',
        icon: '💵'
    },
    {
        day: 2,
        type: 'shards',
        label: 'Shard Cache',
        description: '5 Kinetic Shards to purchase unique marble skins and permanent shop upgrades.',
        icon: '⚡'
    },
    {
        day: 3,
        type: 'cash',
        label: 'Loot Sack',
        description: 'An increased cash drop to speed up your progression.',
        icon: '💰'
    },
    {
        day: 4,
        type: 'gem',
        label: 'Rarity Gem',
        description: '1 random socketable gem (Ruby, Emerald, or Diamond) for the Peg Builder.',
        icon: '💎'
    },
    {
        day: 5,
        type: 'shards',
        label: 'Shard Deposit',
        description: '15 Kinetic Shards to bolster your permanent shop inventory.',
        icon: '🔮'
    },
    {
        day: 6,
        type: 'cash',
        label: 'Vault Treasure',
        description: 'A massive vault of cash to blast past bottlenecks.',
        icon: '🏦'
    },
    {
        day: 7,
        type: 'multi',
        label: 'Golden Fortune',
        description: 'The Ultimate Reward! 35 Kinetic Shards, 2 Random Sockets Gems, and tons of cash!',
        icon: '👑'
    }
];

export interface ClaimResult {
    cashAwarded: number;
    shardsAwarded: number;
    gemsAwarded: { crimson: number; amber: number; azure: number };
    descText: string;
}

export const getRewardValues = (dayNumber: number, state: GameState): { cash: number; shards: number; gems: { crimson: number; amber: number; azure: number } } => {
    const currentMps = state.currentMps || 0;
    let cash = 0;
    let shards = 0;
    const gems = { crimson: 0, amber: 0, azure: 0 };

    switch (dayNumber) {
        case 1:
            cash = Math.max(10000, Math.floor(currentMps * 120));
            break;
        case 2:
            shards = 5;
            break;
        case 3:
            cash = Math.max(35000, Math.floor(currentMps * 300));
            break;
        case 4:
            // Randomly select gem type
            const types4 = ['crimson', 'amber', 'azure'] as const;
            const rand4 = types4[Math.floor(Math.random() * types4.length)];
            gems[rand4] = 1;
            break;
        case 5:
            shards = 15;
            break;
        case 6:
            cash = Math.max(120000, Math.floor(currentMps * 600));
            break;
        case 7:
            cash = Math.max(500000, Math.floor(currentMps * 1800));
            shards = 35;
            // 2 random gems (can be the same or different)
            const types7 = ['crimson', 'amber', 'azure'] as const;
            gems[types7[Math.floor(Math.random() * types7.length)]]++;
            gems[types7[Math.floor(Math.random() * types7.length)]]++;
            break;
    }

    return { cash, shards, gems };
};

export const claimDailyLoginReward = (
    state: GameState,
    addMoney: (amount: number, countTowardsIncome?: boolean) => void,
    pushNotification: (msg: string, type: 'achievement' | 'mission') => void
): ClaimResult | null => {
    const today = getTodayDateString();
    
    // Check if already claimed today
    if (state.dailyLogin.lastClaimedDate === today) {
        return null; // Already claimed today
    }

    let nextStreak = 1;
    const lastDate = state.dailyLogin.lastClaimedDate;
    if (lastDate) {
        const diff = getDaysDifference(lastDate, today);
        if (diff === 1) {
            // Consecutive day! 1 -> 2, 2 -> 3, ..., 7 -> 1
            nextStreak = (state.dailyLogin.streak % 7) + 1;
        } else {
            // Day missed or weirdly negative. Reset to day 1.
            nextStreak = 1;
        }
    } else {
        // First claim ever
        nextStreak = 1;
    }

    const rewards = getRewardValues(nextStreak, state);

    // Apply currency rewards
    if (rewards.cash > 0) {
        addMoney(rewards.cash, false);
    }
    if (rewards.shards > 0) {
        state.kineticShards = (state.kineticShards || 0) + rewards.shards;
    }
    if (rewards.gems.crimson > 0 || rewards.gems.amber > 0 || rewards.gems.azure > 0) {
        if (!state.gems) state.gems = { crimson: 0, azure: 0, amber: 0 };
        state.gems.crimson = (state.gems.crimson || 0) + rewards.gems.crimson;
        state.gems.amber = (state.gems.amber || 0) + rewards.gems.amber;
        state.gems.azure = (state.gems.azure || 0) + rewards.gems.azure;
    }

    // Update dailyLogin state
    state.dailyLogin.lastClaimedDate = today;
    state.dailyLogin.streak = nextStreak;

    // Create description statement
    const parts: string[] = [];
    if (rewards.cash > 0) parts.push(`$${rewards.cash.toLocaleString()}`);
    if (rewards.shards > 0) parts.push(`${rewards.shards} Kinetic Shards`);
    
    const gemTypesClaimed: string[] = [];
    if (rewards.gems.crimson > 0) gemTypesClaimed.push(`${rewards.gems.crimson} Ruby`);
    if (rewards.gems.amber > 0) gemTypesClaimed.push(`${rewards.gems.amber} Emerald`);
    if (rewards.gems.azure > 0) gemTypesClaimed.push(`${rewards.gems.azure} Diamond`);
    if (gemTypesClaimed.length > 0) parts.push(`${gemTypesClaimed.join(' and ')} Gem(s)`);

    const descText = parts.join(', ');
    pushNotification(`Day ${nextStreak} Login Reward Claimed: ${descText}!`, 'mission');

    return {
        cashAwarded: rewards.cash,
        shardsAwarded: rewards.shards,
        gemsAwarded: rewards.gems,
        descText
    };
};
