import { GameState } from './types';
import { engine } from './engine';

export interface DailyEvent {
    id: string;
    dayOfWeek: number; // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
    name: string;
    description: string;
    explanation: string;
    color: string; // Tailwind class color accent
    bgClass: string; // Tailwind bg class
}

export const DAILY_EVENTS: DailyEvent[] = [
    {
        id: 'critical_event',
        dayOfWeek: 0,
        name: 'Critical Frenzy Event',
        description: 'DOUBLE Critical Rate & TRIPLE Critical Earnings',
        explanation: 'The marbles are sparkling with high-voltage energy! Today, your critical hit chance is doubled, and every critical hit earns a massive 3x cash!',
        color: 'text-orange-400 border-orange-500/30',
        bgClass: 'bg-orange-950/40'
    },
    {
        id: 'market_event',
        dayOfWeek: 1,
        name: 'Flash Sale Event',
        description: 'Half-Price Shop Upgrades',
        explanation: 'Today, all standard shop upgrades are discounted by a whopping 50%. Load up on extra marbles and juice up your board!',
        color: 'text-amber-400 border-amber-500/30',
        bgClass: 'bg-amber-950/40'
    },
    {
        id: 'mission_event',
        dayOfWeek: 2,
        name: 'Mission Mania Event',
        description: '1.5x Cash from Missions',
        explanation: 'All claimable cash rewards from completing daily and repeatable missions are boosted by 50%!',
        color: 'text-indigo-400 border-indigo-500/30',
        bgClass: 'bg-indigo-950/40'
    },
    {
        id: 'winged_event',
        dayOfWeek: 3,
        name: 'Winged Wonder Event',
        description: 'Double Winged Marble Spawn Rate',
        explanation: 'The winged Bonus Marbles are appearing more frequently today. Catch them for lump-sum rewards!',
        color: 'text-emerald-400 border-emerald-500/30',
        bgClass: 'bg-emerald-950/40'
    },
    {
        id: 'peg_event',
        dayOfWeek: 4,
        name: 'Peg Earnings Event',
        description: '1.5x Peg Strike Earnings',
        explanation: 'The board`s had its weekly peg replacement. Break them in with a 50% bonus on all peg hits!',
        color: 'text-rose-400 border-rose-500/30',
        bgClass: 'bg-rose-950/40'
    },
    {
        id: 'rarity_event',
        dayOfWeek: 5,
        name: 'Exotic Drop Event',
        description: '50% More High-Rarity Marbles',
        explanation: 'The intern accidentally(?) set the rare marble rate too high again... Uncommon, Rare, and Legendary marbles have a 50% higher chance to spawn! They may spawn even if you haven`t unlocked them yet...',
        color: 'text-purple-400 border-purple-500/30',
        bgClass: 'bg-purple-950/40'
    },
    {
        id: 'shard_event',
        dayOfWeek: 6,
        name: 'Weekend Prestige Event',
        description: 'Double Shards on Prestige',
        explanation: 'Activating the Kinetic Core yields x2 Kinetic Shards on use! Why not work towards a big payout?',
        color: 'text-cyan-400 border-cyan-500/30',
        bgClass: 'bg-cyan-950/40'
    }
];

export class DailyEventsManager {
    /**
     * Gets the current daily event based on the user's local day of the week.
     */
    static getCurrentEvent(): DailyEvent {
        const day = new Date().getDay(); // 0 to 6
        const ev = DAILY_EVENTS.find(e => e.dayOfWeek === day);
        return ev || DAILY_EVENTS[0];
    }

    /**
     * Checks if a specific daily event id is active right now.
     */
    static isEventActive(eventId: string): boolean {
        if (typeof window !== 'undefined' && engine?.state?.inChallengeMode) {
            return false;
        }
        return DailyEventsManager.getCurrentEvent().id === eventId;
    }

    /**
     * Gets the cost discount modifier for upgrade costs.
     */
    static getUpgradeCostMultiplier(): number {
        return DailyEventsManager.isEventActive('market_event') ? 0.5 : 1.0;
    }

    /**
     * Gets the prestige shards award multiplier.
     */
    static getPrestigeShardMultiplier(): number {
        return DailyEventsManager.isEventActive('shard_event') ? 2 : 1;
    }

    /**
     * Gets the mission cash winnings multiplier.
     */
    static getMissionCashMultiplier(): number {
        return DailyEventsManager.isEventActive('mission_event') ? 1.5 : 1.0;
    }

    /**
     * Gets the peg income multiplier.
     */
    static getPegIncomeMultiplier(): number {
        return DailyEventsManager.isEventActive('peg_event') ? 1.5 : 1.0;
    }

    /**
     * Gets bonus spawn frequency boost (multiplier of spawn speed).
     * 2.0 means they spawn twice as often.
     */
    static getBonusSpawnMultiplier(): number {
        return DailyEventsManager.isEventActive('winged_event') ? 2.0 : 1.0;
    }

    /**
     * Boosts critical hit settings. Returns { criticalChanceMultiplier, criticalDamageMultiplier, flatChanceBoost }
     */
    static getCriticalSettings(): { chanceMult: number; damageMult: number; flatBoost: number } {
        if (DailyEventsManager.isEventActive('critical_event')) {
            return { chanceMult: 2.0, damageMult: 3.0, flatBoost: 2.0 };
        }
        return { chanceMult: 1.0, damageMult: 2.0, flatBoost: 0 };
    }

    /**
     * Gets the multiplier for rolling high rarity marbles.
     */
    static getRarityMultiplier(): number {
        return DailyEventsManager.isEventActive('rarity_event') ? 1.5 : 1.0;
    }

    /**
     * Gets a flat base chance boost for rarity (0.01 = 1%).
     */
    static getRarityFlatBoost(): number {
        return DailyEventsManager.isEventActive('rarity_event') ? 0.01 : 0;
    }
}
