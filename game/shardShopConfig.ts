
export interface PermUpgradeConfig {
    id: string;
    name: string;
    description: string;
    baseCost: number;
    maxLevel?: number;
}

export const PERM_UPGRADES: PermUpgradeConfig[] = [
    { id: 'perm_income_a', name: 'Permanent Income Boost', description: 'Increases all base income by 5%', baseCost: 3 },
    { id: 'perm_shard_multi', name: 'Shard Multiplier', description: 'Increases Shard gain from Prestiging by 10%', baseCost: 5 },
    { id: 'perm_micro_boost', name: 'Micro Marble Boost', description: 'Increases the base value of Micro Marbles by 2%', baseCost: 7 },
    { id: 'perm_bonus_chance', name: 'Bonus Chance Boost', description: 'Increases chance for a Bonus Marble to appear by 2%', baseCost: 10, maxLevel: 25 },
    { id: 'perm_micro_autoclicker', name: 'Micro Autoclicker', description: 'Automatically drops 0.1 Micro Marbles per second per level', baseCost: 5, maxLevel: 100 },
    { id: 'perm_extra_master', name: 'Extra Master Marble', description: 'Adds an additional Master Marble to the board', baseCost: 50 }
];

export const getPermanentUpgradeCost = (level: number, id: string): number => {
    const cfg = PERM_UPGRADES.find(u => u.id === id);
    if (!cfg) return 0;
    
    if (id === 'perm_bonus_chance') {
        return Math.floor(cfg.baseCost * (1 + Math.log2(level + 1) * 1.5));
    }
    
    const mult = id === 'perm_extra_master' ? 3.0 : 1.4;
    let cost = cfg.baseCost;
    for (let i = 0; i < level; i++) {
        cost = Math.floor(cost * mult);
    }
    return cost;
};

export interface MarbleSkinConfig {
    id: string;
    name: string;
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
    cost: number;
    texture?: string;
}

const commonTextures = [
    'Bubbles.png', 'Bricks.png', 'Camo.png', 'Scales.png', 'Cucumber.png', 'Chocolate.png', 'Fish.png',
    'Jack-o-Lantern.png', 'Metal.png', 'Sand.png', 'Boulder.png', 'PolkaDot.png', 'Cookie.png', 'Water.png',
    'Fire.png', 'Crate.png', 'Rug.png', 'Leaves.png', 'Honeycomb.png', 'Mountain.png', 'Mushroom.png',
    'Watermelon.png', 'Tiles.png'
];
const rareTextures = [
    'Leopard.png', 'Music.png', 'Magma.png', 'Strawberry.png', 'Biohazard.png', 'ValentinesChoco.png',
    'Bomb.png', 'Warning.png', 'Target.png', 'BubbleGum.png', 'Earth.png', 'Vinyl.png', 'Zirconium.png',
    'Coin.png', 'Glazed.png'
];
const epicTextures = [
    'TP.png', 'Skull.png', 'Sapphire.png', 'Ruby.png', 'Emerald.png'
];
const legendaryTextures = [
    'Nebula.png', 'Granite.png', 'YinYang.png', 'Diamond.png'
];

const generateSkins = (): MarbleSkinConfig[] => {
    const skins: MarbleSkinConfig[] = [];
    for (let i = 1; i <= 50; i++) {
        // Special Case: The starting skin
        if (i === 1) {
            skins.push({ id: 'tie_dye_1', name: 'Tie-dye', rarity: 'Legendary', cost: 0 });
            continue;
        }
        
        let rarity: MarbleSkinConfig['rarity'] = 'Common';
        let cost = 15;
        let texture = '';
        let name = '';

        // Special Legacy Overrides
        if (i === 2) {
            name = 'Wooden'; texture = 'Wooden.png';
            rarity = 'Common'; cost = 15;
        } else if (i === 3) {
            name = 'Stone'; texture = 'Stone.png';
            rarity = 'Common'; cost = 25;
        } else if (i <= 26) {
            rarity = 'Common'; cost = 40;
            texture = commonTextures[(i - 1) % commonTextures.length];
        } else if (i <= 41) {
            rarity = 'Rare'; cost = 100;
            texture = rareTextures[(i - 27) % rareTextures.length];
        } else if (i <= 46) {
            rarity = 'Epic'; cost = 250;
            texture = epicTextures[(i - 42) % epicTextures.length];
        } else {
            rarity = 'Legendary'; cost = 750;
            texture = legendaryTextures[(i - 47) % legendaryTextures.length];
        }

        if (!name) {
            name = texture.replace(/\.png$/i, '').replace(/[-_]/g, ' ');
        }

        skins.push({
            id: `marble_${i}`,
            name,
            rarity,
            cost,
            texture
        });
    }
    return skins;
};

export const MARBLE_SKINS: MarbleSkinConfig[] = generateSkins();
