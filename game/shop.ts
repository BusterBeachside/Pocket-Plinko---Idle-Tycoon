
import { GameState } from './types';
import { UPGRADES } from './config';
import { PERM_UPGRADES, MARBLE_SKINS, SHARD_SHOP_GEMS, getPermanentUpgradeCost } from './shardShopConfig';
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
        const currentLevel = state.permUpgradesLevels[id] || 0;
        return getPermanentUpgradeCost(currentLevel, id);
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
            state.permUpgradeCosts[id] = this.getPermanentUpgradeCost(state, id);
            
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

    static buyGem(state: GameState, gemType: 'ruby' | 'emerald' | 'diamond', audio: AudioController, saveCallback: () => void): boolean {
        const cfg = SHARD_SHOP_GEMS.find(g => g.type === gemType);
        if (!cfg) return false;

        if (state.kineticShards >= cfg.cost) {
            state.kineticShards -= cfg.cost;

            if (!state.gems) state.gems = { crimson: 0, azure: 0, amber: 0 };
            state.gems[cfg.gemKey] = (state.gems[cfg.gemKey] || 0) + 1;

            if (!state.gemInventory) state.gemInventory = { ruby: 0, emerald: 0, diamond: 0 };
            state.gemInventory[cfg.type] = (state.gemInventory[cfg.type] || 0) + 1;

            audio.play('upgrade');
            saveCallback();
            return true;
        }
        return false;
    }
}
