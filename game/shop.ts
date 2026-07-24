
import { GameState } from './types';
import { UPGRADES } from './config';
import { PERM_UPGRADES, MARBLE_SKINS } from './shardShopConfig';
import { AudioController } from './audio';
import { SaveSystem } from './saveSystem';
import { DailyEventsManager } from './dailyEvents';

export class ShopSystem {
    
    static buyUpgrade(state: GameState, id: keyof GameState['upgrades'], audio: AudioController, saveCallback: () => void): boolean {
        const cfg = UPGRADES.find(u => u.id === id);
        if (!cfg) return false;

        const level = state.upgrades[id];
        const cost = this.getUpgradeCost(state, id);

        if (cfg.unlocksAt && (state.upgrades.extraBall) < cfg.unlocksAt) return false;
        if (cfg.maxPercent) {
             const currentPercent = state[id + 'Percent' as keyof GameState] as number;
             if (currentPercent >= cfg.maxPercent) return false;
        }
        if (cfg.maxLevel !== undefined && level >= cfg.maxLevel) return false;

        if (state.money >= cost) {
            state.money -= cost;
            state.upgrades[id]++;
            
            SaveSystem.calculateDerivedState(state);
            audio.play('upgrade');
            saveCallback();
            return true;
        }
        return false;
    }

    static getUpgradeCost(state: GameState, id: keyof GameState['upgrades']): number {
        const cfg = UPGRADES.find(u => u.id === id);
        if (!cfg) return 0;
        const level = state.upgrades[id];
        const rawCost = Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, level));
        return Math.floor(rawCost * DailyEventsManager.getUpgradeCostMultiplier());
    }

    static getPermanentUpgradeCost(state: GameState, id: string): number {
        const cfg = PERM_UPGRADES.find(u => u.id === id);
        if (!cfg) return 0;
        
        const currentLevel = state.permUpgradesLevels[id] || 0;
        if (id === 'perm_bonus_chance') {
            // Logarithmic cost scaling for 'Bonus Chance' to remain relevant
            return Math.floor(cfg.baseCost * (1 + Math.log2(currentLevel + 1) * 1.5));
        }
        
        // Return standard cost stored in state, or calculate using standard multiplier scaling
        return state.permUpgradeCosts[id] || cfg.baseCost;
    }

    static buyPermanentUpgrade(state: GameState, id: string, audio: AudioController, saveCallback: () => void): boolean {
        const cfg = PERM_UPGRADES.find(u => u.id === id);
        if (!cfg) return false;
        
        const currentLevel = state.permUpgradesLevels[id] || 0;
        const currentCost = this.getPermanentUpgradeCost(state, id);
        
        if (state.kineticShards >= currentCost) {
            if (cfg.maxLevel !== undefined && cfg.maxLevel > 0 && currentLevel >= cfg.maxLevel) return false;

            state.kineticShards -= currentCost;
            state.permUpgradesLevels[id] = currentLevel + 1;
            
            // Calculate next cost and update state.permUpgradeCosts
            const nextLevelState = {
                ...state,
                permUpgradesLevels: {
                    ...state.permUpgradesLevels,
                    [id]: currentLevel + 1
                }
            };
            state.permUpgradeCosts[id] = this.getPermanentUpgradeCost(nextLevelState, id);
            
            SaveSystem.calculateDerivedState(state);
            
            audio.play('upgrade');
            saveCallback();
            return true;
        }
        return false;
    }

    static buySkin(state: GameState, id: string, audio: AudioController, saveCallback: () => void): boolean {
        const skin = MARBLE_SKINS.find(s => s.id === id);
        if (!skin) return false;
        
        // Count owned skins of the same rarity where cost > 0
        const ownedOfRarity = state.ownedMarbles.filter(oId => {
            const s = MARBLE_SKINS.find(x => x.id === oId);
            return s && s.rarity === skin.rarity && s.cost > 0;
        }).length;
        const cost = Math.round(skin.cost * (1 + ownedOfRarity * 0.25));
        
        if (state.kineticShards >= cost && !state.ownedMarbles.includes(id)) {
            state.kineticShards -= cost;
            state.ownedMarbles.push(id);
            SaveSystem.calculateDerivedState(state);
            audio.play('upgrade');
            saveCallback();
            return true;
        }
        return false;
    }

    static equipSkin(state: GameState, id: string, saveCallback: () => void) {
        if (state.ownedMarbles.includes(id)) {
            state.activeMarbleSkinID = id;
            const skin = MARBLE_SKINS.find(s => s.id === id);
            state.activeMarbleTexture = skin && skin.texture ? skin.texture : null;
            saveCallback();
        }
    }
}
