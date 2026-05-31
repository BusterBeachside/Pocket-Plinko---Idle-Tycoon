import { GameState, ChallengeState } from './types';

export interface ChallengeGoal {
    target: number;
    metric: 'money' | 'pegsBroken';
    description: string;
    rewardDescription: string;
    shardReward: number;
    moneyReward: number;
    gemReward?: 'crimson' | 'azure' | 'amber';
}

export interface ChallengeDefinition {
    id: string;
    name: string;
    description: string;
    gimmickDescription: string;
    goals: {
        bronze: ChallengeGoal;
        silver: ChallengeGoal;
        gold: ChallengeGoal;
    };
}

export const CHALLENGES: { [id: string]: ChallengeDefinition } = {
    anti_gravity: {
        id: 'anti_gravity',
        name: 'Anti-Gravity Chamber',
        description: 'Plinko in outer space? Marbles don`t quite seem to obey the laws of gravity in this challenge! (Hint: This one`s all about peg hits!)',
        gimmickDescription: 'Gravity is cut by 80%. Baskets are replaced with bumpers that send marbles right back up. Marbles automatically respawn every so often.',
        goals: {
            bronze: { target: 50000000, metric: 'money', description: 'Earn $50,000,000 in total Challenge cash', rewardDescription: '+$100K Main Cash, +10 Shards', shardReward: 10, moneyReward: 100000 },
            silver: { target: 2500000000, metric: 'money', description: 'Earn $2,500,000,000 in total Challenge cash', rewardDescription: '+$5M Main Cash, +50 Shards, +1 Azure Rune', shardReward: 50, moneyReward: 5000000, gemReward: 'azure' },
            gold: { target: 150000000000, metric: 'money', description: 'Earn $150,000,000,000 in total Challenge cash', rewardDescription: '+$1B Main Cash, +200 Shards, +1 Amber Rune', shardReward: 200, moneyReward: 1000000000, gemReward: 'amber' }
        }
    },
    sand_peg: {
        id: 'sand_peg',
        name: 'Sand Peg Busters',
        description: 'Pegs in this Challenge are made of sand and will break apart if hit enough! Broken pegs are your currency here! Micro Marbles may be very powerful...',
        gimmickDescription: 'Pegs have 3 HP. After 3 hits they break into sand. They respawn after 5 seconds. Standard upgrades cost Pegs instead of Money.',
        goals: {
            bronze: { target: 10000, metric: 'pegsBroken', description: 'Break 10,000 pegs (strength-adjusted)', rewardDescription: '+$100K Main Cash, +10 Shards', shardReward: 10, moneyReward: 100000 },
            silver: { target: 150000, metric: 'pegsBroken', description: 'Break 150,000 pegs (strength-adjusted)', rewardDescription: '+$5M Main Cash, +50 Shards, +1 Crimson Rune', shardReward: 50, moneyReward: 5000000, gemReward: 'crimson' },
            gold: { target: 1000000, metric: 'pegsBroken', description: 'Break 1,000,000 pegs (strength-adjusted)', rewardDescription: '+$1B Main Cash, +200 Shards, +1 Amber Rune', shardReward: 200, moneyReward: 1000000000, gemReward: 'amber' }
        }
    },
    micro_mania: {
        id: 'micro_mania',
        name: 'Micro Mania',
        description: 'Normal marbles are banned! this challenge is all about clicking... Unless you can buy an autoclicker, that is!',
        gimmickDescription: 'You cannot upgrade normal marble count. Only micro marbles can be dropped, but their payouts are buffed by 500% (5x value). Unique Autoclicker upgrade available.',
        goals: {
            bronze: { target: 30000000, metric: 'money', description: 'Earn $30,000,000 in total Challenge cash', rewardDescription: '+$100K Main Cash, +10 Shards', shardReward: 10, moneyReward: 100000 },
            silver: { target: 1500000000, metric: 'money', description: 'Earn $1,500,000,000 in total Challenge cash', rewardDescription: '+$5M Main Cash, +50 Shards, +1 Azure Rune', shardReward: 50, moneyReward: 5000000, gemReward: 'azure' },
            gold: { target: 100000000000, metric: 'money', description: 'Earn $100,000,000,000 in total Challenge cash', rewardDescription: '+$1B Main Cash, +200 Shards, +1 Amber Rune', shardReward: 200, moneyReward: 1000000000, gemReward: 'amber' }
        }
    },
    single_marble: {
        id: 'single_marble',
        name: 'Solo Leveling',
        description: 'A single powerhouse marble is all you get in this one-track Challenge. Focus on quality over quantity!',
        gimmickDescription: 'You only get 1 main Master marble. However, buying the Extra Marble upgrade adds +x5 to that marble\'s value multiplier each time (x5, x10, x15...).',
        goals: {
            bronze: { target: 50000000, metric: 'money', description: 'Earn $50,000,000 in total Challenge cash', rewardDescription: '+$100K Main Cash, +10 Shards', shardReward: 10, moneyReward: 100000 },
            silver: { target: 3000000000, metric: 'money', description: 'Earn $3,000,000,000 in total Challenge cash', rewardDescription: '+$5M Main Cash, +50 Shards, +1 Crimson Rune', shardReward: 50, moneyReward: 5000000, gemReward: 'crimson' },
            gold: { target: 200000000000, metric: 'money', description: 'Earn $200,000,000,000 in total Challenge cash', rewardDescription: '+$1B Main Cash, +200 Shards, +1 Amber Rune', shardReward: 200, moneyReward: 1000000000, gemReward: 'amber' }
        }
    },
    critical_meltdown: {
        id: 'critical_meltdown',
        name: 'Critical Meltdown',
        description: 'Oh, no! Marbles have stopped making any money unless they land a critical hit! Luckily, crits have become extremely common...',
        gimmickDescription: 'Normal impacts yield absolutely nothing. Cash is earned purely from Critical Hits. Critical Chance cannot be upgraded, but base Critical Chance is set to a massive 50%, and Crits deal 10x damage!',
        goals: {
            bronze: { target: 100000000, metric: 'money', description: 'Earn $100,000,000 in total Challenge cash', rewardDescription: '+$100K Main Cash, +10 Shards', shardReward: 10, moneyReward: 100000 },
            silver: { target: 5000000000, metric: 'money', description: 'Earn $5,000,000,000 in total Challenge cash', rewardDescription: '+$5M Main Cash, +50 Shards, +1 Azure Rune', shardReward: 50, moneyReward: 5000000, gemReward: 'azure' },
            gold: { target: 350000000000, metric: 'money', description: 'Earn $350,000,000,000 in total Challenge cash', rewardDescription: '+$1B Main Cash, +200 Shards, +1 Amber Rune', shardReward: 200, moneyReward: 1000000000, gemReward: 'amber' }
        }
    }
};

export class ChallengesManager {
    static getActiveChallengeId(): string {
        const msIn48Hours = 1000 * 60 * 60 * 24 * 2;
        const nowMs = Date.now();
        const cycleIndex = Math.floor(nowMs / msIn48Hours);
        const challengeIds = ['anti_gravity', 'sand_peg', 'micro_mania', 'single_marble', 'critical_meltdown'];
        return challengeIds[cycleIndex % challengeIds.length];
    }

    static getRotationInfo() {
        const msIn48Hours = 1000 * 60 * 60 * 24 * 2;
        const nowMs = Date.now();
        const currentCycleStart = Math.floor(nowMs / msIn48Hours) * msIn48Hours;
        const msRemaining = (currentCycleStart + msIn48Hours) - nowMs;
        
        const hours = Math.floor(msRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((msRemaining % (1000 * 60)) / 1000);
        const timeLeftStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        return {
            activeChallengeId: ChallengesManager.getActiveChallengeId(),
            timeLeftSeconds: Math.floor(msRemaining / 1000),
            timeLeftStr
        };
    }

    static checkAndSyncChallengeState(state: GameState): boolean {
        const activeId = ChallengesManager.getActiveChallengeId();
        let changed = false;

        // Ensure gems format is correct
        if (!state.gems) {
            state.gems = { crimson: 0, azure: 0, amber: 0 };
            changed = true;
        }

        // Ensure challengeState is initialized
        if (!state.challengeState) {
            state.challengeState = {
                challengeId: activeId,
                money: 0,
                lifetimeEarnings: 0,
                pegsBrokenCurrency: 0,
                lifetimePegsBroken: 0,
                lifetimeMicroMarblesDropped: 0,
                upgrades: {
                    extraBall: activeId === 'micro_mania' ? 0 : 1,
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
                },
                currentMps: 0,
                currentRunPeakMps: 0
            };
            changed = true;
        }

        // If active challenge changed, reset progress
        if (state.challengeState.challengeId !== activeId) {
            const oldId = state.challengeState.challengeId;
            if (oldId && oldId !== '') {
                const def = CHALLENGES[oldId];
                if (def) {
                    const isSandPeg = oldId === 'sand_peg';
                    const finalVal = isSandPeg 
                        ? (state.challengeState.lifetimePegsBroken || 0) 
                        : (state.challengeState.lifetimeEarnings || 0);
                    
                    if (finalVal > 0) {
                        state.pendingChallengeSummary = {
                            challengeId: oldId,
                            challengeName: def.name,
                            metric: def.goals.bronze.metric,
                            finalValue: finalVal,
                            medalsClaimed: {
                                bronze: !!state.challengeGoalClaimed[oldId]?.bronze,
                                silver: !!state.challengeGoalClaimed[oldId]?.silver,
                                gold: !!state.challengeGoalClaimed[oldId]?.gold
                            }
                        };
                        state.showChallengeSummary = true;
                    }
                }
            }

            state.challengeState = {
                challengeId: activeId,
                money: 0,
                lifetimeEarnings: 0,
                pegsBrokenCurrency: 0,
                lifetimePegsBroken: 0,
                lifetimeMicroMarblesDropped: 0,
                upgrades: {
                    extraBall: activeId === 'micro_mania' ? 0 : 1,
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
                },
                currentMps: 0,
                currentRunPeakMps: 0
            };
            if (!state.challengeGoalClaimed) {
                state.challengeGoalClaimed = {};
            }
            state.challengeGoalClaimed[activeId] = { bronze: false, silver: false, gold: false };
            changed = true;
        }

        // Migrate older saves missing lifetimeEarnings
        if (state.challengeState.lifetimeEarnings === undefined) {
            state.challengeState.lifetimeEarnings = state.challengeState.money || 0;
            changed = true;
        }

        if (!state.challengeGoalClaimed) {
            state.challengeGoalClaimed = {};
            changed = true;
        }

        if (!state.challengeGoalClaimed[activeId]) {
            state.challengeGoalClaimed[activeId] = { bronze: false, silver: false, gold: false };
            changed = true;
        }

        return changed;
    }

    /**
     * Spends pegs/brokenPegCurrency in the Sand Peg challenge or money in others
     */
    static getUpgradeCost(state: GameState, id: keyof ChallengeState['upgrades']): number {
        const activeChallengeId = ChallengesManager.getActiveChallengeId();
        const level = state.challengeState.upgrades[id] || 0;

        if (activeChallengeId === 'sand_peg') {
            const basePrices: { [key: string]: number } = {
                extraBall: 50,
                sandPegMultiplier: 100,
                legendaryChance: 150,
                rareChance: 80,
                uncommonChance: 40,
                criticalChance: 50,
                ballSpeed: 30,
                microValue: 25,
                bonusValue: 20
            };
            const baseCost = basePrices[id] || 25;
            const mults: { [key: string]: number } = {
                extraBall: 1.5,
                sandPegMultiplier: 1.5,
                legendaryChance: 1.6,
                rareChance: 1.5,
                uncommonChance: 1.5,
                criticalChance: 1.5,
                ballSpeed: 1.4,
                microValue: 1.4,
                bonusValue: 1.4
            };
            const mult = mults[id] || 1.4;
            return Math.floor(baseCost * Math.pow(mult, level));
        } else {
            // Money pricing inside the sandbox. Economically sized for a 48h limit!
            const basePrices: { [key: string]: number } = {
                extraBall: 100,
                pegValue: 10,
                ballSpeed: 25,
                basketValue: 50,
                uncommonChance: 80,
                rareChance: 150,
                legendaryChance: 400,
                criticalChance: 120,
                microValue: 40,
                bonusValue: 60,
                microAutoclicker: 50
            };
            const mult = (id === 'extraBall' || id === 'microAutoclicker') ? 1.8 : 1.4;
            const baseCost = basePrices[id] || 15;
            return Math.floor(baseCost * Math.pow(mult, level));
        }
    }

    static buyUpgrade(state: GameState, id: keyof ChallengeState['upgrades']): boolean {
        const normallyCappedIds = ['uncommonChance', 'rareChance', 'legendaryChance', 'criticalChance'];
        if (normallyCappedIds.includes(id)) {
            const currentLvl = state.challengeState.upgrades[id] || 0;
            if (currentLvl >= 20) {
                return false;
            }
        }

        const cost = ChallengesManager.getUpgradeCost(state, id);
        const activeChallengeId = ChallengesManager.getActiveChallengeId();

        if (activeChallengeId === 'sand_peg') {
            const currentPegs = state.challengeState.pegsBrokenCurrency || 0;
            if (currentPegs >= cost) {
                state.challengeState.pegsBrokenCurrency = currentPegs - cost;
                state.challengeState.upgrades[id] = (state.challengeState.upgrades[id] || 0) + 1;
                return true;
            }
        } else {
            const currentMoney = state.challengeState.money || 0;
            if (currentMoney >= cost) {
                state.challengeState.money = currentMoney - cost;
                state.challengeState.upgrades[id] = (state.challengeState.upgrades[id] || 0) + 1;
                return true;
            }
        }
        return false;
    }

    static updateGoalMilestones(state: GameState, pushNotification: (msg: string, type: 'achievement' | 'mission') => void, addMoney: (amount: number, countTowardsIncome?: boolean) => void): boolean {
        if (!state.inChallengeMode) return false;
        ChallengesManager.checkAndSyncChallengeState(state);
        
        const activeId = ChallengesManager.getActiveChallengeId();
        const def = CHALLENGES[activeId];
        if (!def) return false;
        
        const currentGoalStatus = state.challengeGoalClaimed[activeId];
        if (!currentGoalStatus) return false;
        
        const metricValue = (def.goals.bronze.metric === 'pegsBroken') 
            ? (state.challengeState.lifetimePegsBroken || 0) 
            : (state.challengeState.lifetimeEarnings || 0);
            
        let completedAny = false;

        // Bronze
        if (!currentGoalStatus.bronze && metricValue >= def.goals.bronze.target) {
            currentGoalStatus.bronze = true;
            state.lifetimeBronzeMedals = (state.lifetimeBronzeMedals || 0) + 1;
            ChallengesManager.awardGoalReward(state, def.goals.bronze, 'Bronze', pushNotification, addMoney);
            completedAny = true;
        }
        // Silver
        if (!currentGoalStatus.silver && metricValue >= def.goals.silver.target) {
            currentGoalStatus.silver = true;
            state.lifetimeSilverMedals = (state.lifetimeSilverMedals || 0) + 1;
            ChallengesManager.awardGoalReward(state, def.goals.silver, 'Silver', pushNotification, addMoney);
            completedAny = true;
        }
        // Gold
        if (!currentGoalStatus.gold && metricValue >= def.goals.gold.target) {
            currentGoalStatus.gold = true;
            state.lifetimeGoldMedals = (state.lifetimeGoldMedals || 0) + 1;
            ChallengesManager.awardGoalReward(state, def.goals.gold, 'Gold', pushNotification, addMoney);
            completedAny = true;
        }

        return completedAny;
    }

    private static awardGoalReward(state: GameState, goal: ChallengeGoal, tier: string, pushNotification: (msg: string, type: 'achievement' | 'mission') => void, addMoney: (amount: number, countTowardsIncome?: boolean) => void) {
        state.kineticShards = (state.kineticShards || 0) + goal.shardReward;
        addMoney(goal.moneyReward, false);
        if (goal.gemReward) {
            if (!state.gems) state.gems = { crimson: 0, azure: 0, amber: 0 };
            state.gems[goal.gemReward] = (state.gems[goal.gemReward] || 0) + 1;
        }
        
        const gemMsg = goal.gemReward ? `, +1 ${goal.gemReward.toUpperCase()} Rune` : '';
        pushNotification(`Challenge Completed: ${tier} Goal! Reward: +${goal.shardReward} Shards, +$${goal.moneyReward.toLocaleString()}${gemMsg}`, 'achievement');
    }
}
