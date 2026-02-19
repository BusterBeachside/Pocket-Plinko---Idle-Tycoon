
import { GameState, INITIAL_STATE } from './types';
import { MARBLE_SKINS } from './shardShopConfig';

export class SaveSystem {
    static loadState(): GameState {
        const saved = localStorage.getItem('plinko_react_v1');
        if (saved) {
            const parsed = JSON.parse(saved);
            
            // Migration for v2: Shift extraBall level by +1 to match new "Level = Count" logic
            if (!parsed.version || parsed.version < 2) {
                if (parsed.upgrades) {
                    parsed.upgrades.extraBall = (parsed.upgrades.extraBall || 0) + 1;
                }
                parsed.version = 2;
            }

            const loaded = { 
                ...INITIAL_STATE, 
                ...parsed,
                permUpgradesLevels: { ...INITIAL_STATE.permUpgradesLevels, ...parsed.permUpgradesLevels },
                permUpgradeCosts: { ...INITIAL_STATE.permUpgradeCosts, ...parsed.permUpgradeCosts },
                ownedMarbles: parsed.ownedMarbles || INITIAL_STATE.ownedMarbles,
                activeTheme: parsed.activeTheme || INITIAL_STATE.activeTheme, // Load theme
                // Initialize currentRunPeakMps if missing (migration)
                currentRunPeakMps: parsed.currentRunPeakMps ?? (parsed.currentMps || 0)
            };
            // Ensure upgrades object structure is complete even if loaded from partial save
            loaded.upgrades = { ...INITIAL_STATE.upgrades, ...(parsed.upgrades || {}) };
            return loaded;
        }
        return JSON.parse(JSON.stringify(INITIAL_STATE));
    }

    static saveState(state: GameState) {
        state.lastSaveTime = Date.now();
        localStorage.setItem('plinko_react_v1', JSON.stringify(state));
    }

    static calculateDerivedState(state: GameState) {
        // Sync stats from upgrade levels to ensure consistency (fix for desync issues)
        const u = state.upgrades;
        state.pegValue = 1 + (u.pegValue * 2);
        state.microValuePercent = u.microValue; // 1% per level
        state.uncommonChancePercent = Math.min(20, u.uncommonChance);
        state.basketValueBonus = u.basketValue * 10;
        state.criticalChancePercent = Math.min(20, u.criticalChance);
        state.bonusValuePercent = u.bonusValue * 5;
        state.rareChancePercent = Math.min(20, u.rareChance);
        state.ballSpeed = Math.pow(1.05, u.ballSpeed);
        state.legendaryChancePercent = Math.min(20, u.legendaryChance);

        // Calculate derived boosts from skins and milestones
        const ownedCount = state.ownedMarbles.length;
        // Derived bonuses: +1% income and +1 master mult per skin
        state.derivedIncomeBoostPercent = ownedCount + Math.floor(ownedCount / 10) * 5;
        state.derivedMasterBonus = ownedCount + Math.floor(ownedCount / 10) * 5;
    }

    static createPrestigeState(currentState: GameState, shardsEarned: number, masterMultiGain: number): GameState {
        const keptShards = currentState.kineticShards + shardsEarned;
        const keptPrestiged = currentState.timesPrestiged + 1;
        const keptMasterMult = currentState.masterMultiplier + masterMultiGain;
        const keptPermUpgrades = { ...currentState.permUpgradesLevels };
        const keptPermCosts = { ...currentState.permUpgradeCosts };
        const keptOwned = [...currentState.ownedMarbles];
        const keptSkin = currentState.activeMarbleSkinID;
        const keptTexture = currentState.activeMarbleTexture;
        const keptBonusChance = currentState.bonusChance;
        const keptPermIncome = currentState.permanentIncomeBoostPercent;
        const keptPermMicro = currentState.permanentMicroBoostPercent;
        const keptTheme = currentState.activeTheme;
        const keptTotalPlayTime = currentState.totalPlayTime;
        const keptPegMuted = currentState.pegMuted;
        const keptBasketMuted = currentState.basketMuted;
        const keptPeakMps = currentState.peakMps; // All-time peak persists
        
        // Deep copy INITIAL_STATE to avoid reference issues, then override mutable fields explicitly
        const baseState = JSON.parse(JSON.stringify(INITIAL_STATE));

        const newState = {
            ...baseState,
            
            // Explicitly reset mutable progression fields to ensure clean slate
            money: 0,
            lifetimeEarnings: 0,
            ballsCount: 1,
            currentRunPeakMps: 0, // Reset current run peak
            currentMps: 0,
            
            upgrades: {
                extraBall: 1,
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

            // Restore kept values
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
            totalPlayTime: keptTotalPlayTime,
            pegMuted: keptPegMuted,
            basketMuted: keptBasketMuted,
            peakMps: keptPeakMps
        };
        
        this.calculateDerivedState(newState);
        return newState;
    }
}
