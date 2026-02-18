
import { GameState } from './types';
import { UPGRADES } from './config';
import { PERM_UPGRADES, MARBLE_SKINS } from './shardShopConfig';
import { AudioController } from './audio';
import { SaveSystem } from './saveSystem';

export class ShopSystem {
    
    static buyUpgrade(state: GameState, id: keyof GameState['upgrades'], audio: AudioController, saveCallback: () => void): boolean {
        const cfg = UPGRADES.find(u => u.id === id);
        if (!cfg) return false;

        const level = state.upgrades[id];
        const cost = Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, level));

        if (cfg.unlocksAt && (state.upgrades.extraBall) < cfg.unlocksAt) return false;
        if (cfg.maxPercent) {
             const currentPercent = state[id + 'Percent' as keyof GameState] as number;
             if (currentPercent >= cfg.maxPercent) return false;
        }

        if (state.money >= cost) {
            state.money -= cost;
            state.upgrades[id]++;
            state.lifetimeEarnings += cost;
            
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
        return Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, level));
    }

    static buyPermanentUpgrade(state: GameState, id: string, audio: AudioController, saveCallback: () => void): boolean {
        const cfg = PERM_UPGRADES.find(u => u.id === id);
        if (!cfg) return false;
        
        const currentLevel = state.permUpgradesLevels[id] || 0;
        const currentCost = state.permUpgradeCosts[id] || cfg.baseCost;
        
        if (state.kineticShards >= currentCost) {
            if (cfg.maxLevel && currentLevel >= cfg.maxLevel) return false;

            state.kineticShards -= currentCost;
            state.permUpgradesLevels[id] = currentLevel + 1;
            state.permUpgradeCosts[id] = Math.floor(currentCost * 1.4);
            
            if (id === 'perm_income_a') {
                state.permanentIncomeBoostPercent = (state.permanentIncomeBoostPercent || 0) + 5;
            } else if (id === 'perm_shard_multi') {
                state.shardMultiplierPercent = (state.shardMultiplierPercent || 0) + 10;
            } else if (id === 'perm_micro_boost') {
                state.permanentMicroBoostPercent = (state.permanentMicroBoostPercent || 0) + 2;
            } else if (id === 'perm_bonus_chance') {
                state.bonusChance = Math.min(1, 0.5 + ((currentLevel + 1) * 0.01));
            }
            
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
