
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
        const rawCost = Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, level));
        const cost = Math.floor(rawCost * DailyEventsManager.getUpgradeCostMultiplier());

        if (cfg.unlocksAt && (state.upgrades.extraBall) < cfg.unlocksAt) return false;
        if (cfg.maxPercent) {
             const currentPercent = state[id + 'Percent' as keyof GameState] as number;
             if (currentPercent >= cfg.maxPercent) return false;
        }

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

    static buyPermanentUpgrade(state: GameState, id: string, audio: AudioController, saveCallback: () => void): boolean {
        const cfg = PERM_UPGRADES.find(u => u.id === id);
        if (!cfg) return false;
        
        const currentLevel = state.permUpgradesLevels[id] || 0;
        const currentCost = state.permUpgradeCosts[id] || cfg.baseCost;
        
        if (state.kineticShards >= currentCost) {
            if (cfg.maxLevel !== undefined && cfg.maxLevel > 0 && currentLevel >= cfg.maxLevel) return false;

            state.kineticShards -= currentCost;
            state.permUpgradesLevels[id] = currentLevel + 1;
            const multiplier = id === 'perm_extra_master' ? 3.0 : 1.4;
            state.permUpgradeCosts[id] = Math.floor(currentCost * multiplier);
            
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
        
        const ownedCount = state.ownedMarbles.length;
        const cost = Math.round(skin.cost * (1 + ownedCount * 0.25));
        
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
