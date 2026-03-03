
import { GameState, ActiveMission } from './types';
import { ACHIEVEMENT_GROUPS, romanize, getAchievementTier } from './achievements';
import { DAILY_MISSIONS, REPEATABLE_MISSIONS, getMissionById, Mission } from './missions';

export class ProgressionManager {
    static checkAchievements(state: GameState, addMoney: (amount: number, count: boolean) => void, pushNotification: (msg: string, type: 'achievement' | 'mission') => void) {
        ACHIEVEMENT_GROUPS.forEach(group => {
            const currentStatValue = (state as any)[group.stat] || 0;
            
            // Check up to 100 tiers procedurally
            for (let i = 0; i < 100; i++) {
                const tierIndex = i;
                const achievementId = `${group.id}_${tierIndex + 1}`;
                const tier = getAchievementTier(group, tierIndex);
                
                if (!state.achievements[achievementId] || state.achievements[achievementId] === true) {
                    if (currentStatValue >= tier.target) {
                        state.achievements[achievementId] = { completed: true, claimed: false };
                        
                        const achievementName = `${group.name} ${romanize(tierIndex + 1)}`;
                        pushNotification(`Achievement Unlocked: ${achievementName}!`, 'achievement');
                    } else {
                        // Stop checking higher tiers if this one isn't reached
                        break;
                    }
                }
            }
        });
    }

    static claimAchievement(state: GameState, achievementId: string, addMoney: (amount: number, count: boolean) => void, pushNotification: (msg: string, type: 'achievement' | 'mission') => void): boolean {
        // Find the achievement definition
        const lastUnderscoreIndex = achievementId.lastIndexOf('_');
        const groupId = achievementId.substring(0, lastUnderscoreIndex);
        const tierStr = achievementId.substring(lastUnderscoreIndex + 1);
        const tierIndex = parseInt(tierStr) - 1;
        const group = ACHIEVEMENT_GROUPS.find(g => g.id === groupId);
        
        if (!group) return false;
        const tier = getAchievementTier(group, tierIndex);
        
        const aState = state.achievements[achievementId];
        
        // Resilience: handle both object and boolean formats
        const isCompleted = aState === true || (aState && typeof aState === 'object' && aState.completed);
        const isClaimed = aState && typeof aState === 'object' && aState.claimed;

        if (isCompleted && !isClaimed) {
            // Ensure it's stored as object if it was boolean
            state.achievements[achievementId] = { completed: true, claimed: true };
            state.achievementsUnlocked = (state.achievementsUnlocked || 0) + 1;
            
            const peakMps = state.currentRunPeakMps || state.currentMps || 10;
            const reward = Math.floor(peakMps * tier.rewardMult);
            addMoney(reward, false);
            
            const achievementName = `${group.name} ${romanize(tierIndex + 1)}`;
            pushNotification(`Claimed ${achievementName} reward!`, 'achievement');
            return true;
        }
        return false;
    }

    static checkMissions(state: GameState, pushNotification: (msg: string, type: 'achievement' | 'mission') => void) {
        const today = new Date().toISOString().slice(0, 10);
        
        // Ensure missions object exists
        if (!state.missions) {
            state.missions = { date: today, activeDailies: [], activeRepeatables: [] };
        }

        // Midnight Reset / Initialization
        if (state.missions.date !== today) {
            state.missions.date = today;
            state.missions.activeDailies = this.getRandomMissions(DAILY_MISSIONS, 3, 'daily');
        }

        // Initialize arrays if missing
        if (!state.missions.activeDailies) state.missions.activeDailies = [];
        if (!state.missions.activeRepeatables) state.missions.activeRepeatables = [];

        // Fill Dailies if empty (e.g. first time)
        if (state.missions.activeDailies.length === 0) {
            state.missions.activeDailies = this.getRandomMissions(DAILY_MISSIONS, 3, 'daily');
        }

        // Fill Repeatables if empty
        if (state.missions.activeRepeatables.length < 3) {
            const needed = 3 - state.missions.activeRepeatables.length;
            const activeIds = [...state.missions.activeDailies.map(m => m.id), ...state.missions.activeRepeatables.map(m => m.id)];
            const newRepeatables = this.getRandomMissions(REPEATABLE_MISSIONS, needed, 'repeatable', activeIds);
            state.missions.activeRepeatables.push(...newRepeatables);
        }

        // Check Completion
        const allActive = [...state.missions.activeDailies, ...state.missions.activeRepeatables];
        allActive.forEach(active => {
            if (!active.completed) {
                const missionDef = getMissionById(active.id);
                if (missionDef && active.progress >= missionDef.target) {
                    active.completed = true;
                    pushNotification(`Mission Complete: ${missionDef.name}!`, 'mission');
                }
            }
        });
    }

    static updateMissionProgress(state: GameState, stat: string, amount: number = 1) {
        const allActive = [...state.missions.activeDailies, ...state.missions.activeRepeatables];
        allActive.forEach(active => {
            if (!active.completed) {
                const missionDef = getMissionById(active.id);
                if (missionDef && missionDef.stat === stat) {
                    active.progress += amount;
                }
            }
        });
    }

    static claimMission(state: GameState, instanceId: string, addMoney: (amount: number, count: boolean) => void, pushNotification: (msg: string, type: 'achievement' | 'mission') => void): boolean {
        const dailyIdx = state.missions.activeDailies.findIndex(m => m.instanceId === instanceId);
        const repeatableIdx = state.missions.activeRepeatables.findIndex(m => m.instanceId === instanceId);
        
        let active: ActiveMission | undefined;
        let isRepeatable = false;

        if (dailyIdx !== -1) {
            active = state.missions.activeDailies[dailyIdx];
        } else if (repeatableIdx !== -1) {
            active = state.missions.activeRepeatables[repeatableIdx];
            isRepeatable = true;
        }

        if (active && active.completed && !active.claimed) {
            const missionDef = getMissionById(active.id);
            if (!missionDef) return false;

            active.claimed = true;
            
            // Increment counters
            if (isRepeatable) {
                state.repeatableCompleted = (state.repeatableCompleted || 0) + 1;
            } else {
                state.dailyCompleted = (state.dailyCompleted || 0) + 1;
            }
            state.lifetimeMissionsCompleted = (state.lifetimeMissionsCompleted || 0) + 1;

            const peakMps = state.currentRunPeakMps || state.currentMps || 10;
            const reward = Math.floor(peakMps * missionDef.reward.moneyMultiplier);
            addMoney(reward, false);
            pushNotification(`Claimed ${missionDef.name} reward!`, 'mission');

            // If repeatable, remove it so checkMissions can replace it
            if (isRepeatable) {
                state.missions.activeRepeatables.splice(repeatableIdx, 1);
            }

            return true;
        }
        return false;
    }

    static rerollMission(state: GameState, instanceId: string, pushNotification: (msg: string, type: 'achievement' | 'mission') => void): boolean {
        const dailyIdx = state.missions.activeDailies.findIndex(m => m.instanceId === instanceId);
        const repeatableIdx = state.missions.activeRepeatables.findIndex(m => m.instanceId === instanceId);
        
        let active: ActiveMission | undefined;
        let isRepeatable = false;

        if (dailyIdx !== -1) {
            active = state.missions.activeDailies[dailyIdx];
        } else if (repeatableIdx !== -1) {
            active = state.missions.activeRepeatables[repeatableIdx];
            isRepeatable = true;
        }

        if (!active || active.completed) return false;

        const peakMps = state.currentRunPeakMps || state.currentMps || 10;
        const cost = Math.floor(peakMps * (isRepeatable ? 60 : 600)); // 1 min vs 10 min of peak income

        if (state.money >= cost) {
            state.money -= cost;
            
            const pool = isRepeatable ? REPEATABLE_MISSIONS : DAILY_MISSIONS;
            const activeIds = [...state.missions.activeDailies.map(m => m.id), ...state.missions.activeRepeatables.map(m => m.id)];
            const newMissions = this.getRandomMissions(pool, 1, isRepeatable ? 'repeatable' : 'daily', activeIds);
            
            if (isRepeatable) {
                state.missions.activeRepeatables[repeatableIdx] = newMissions[0];
            } else {
                state.missions.activeDailies[dailyIdx] = newMissions[0];
            }
            
            pushNotification(`Mission Rerolled!`, 'mission');
            return true;
        }
        return false;
    }

    private static getRandomMissions(pool: Mission[], count: number, type: 'daily' | 'repeatable', excludeIds: string[] = []): ActiveMission[] {
        const available = pool.filter(m => !excludeIds.includes(m.id));
        const shuffled = [...available].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count).map(m => ({
            id: m.id,
            instanceId: Math.random().toString(36).substr(2, 9),
            type,
            progress: 0,
            completed: false,
            claimed: false
        }));
    }
}
