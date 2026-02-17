import { UpgradeConfig } from './types';

export const UPGRADES: UpgradeConfig[] = [
    { 
        id: 'extraBall', 
        name: 'Extra Marble', 
        baseCost: 25, 
        costMultiplier: 1.4, 
        description: 'Adds another marble to the board.',
        unlocksAt: 1 
    },
    { 
        id: 'pegValue', 
        name: 'Peg Value +', 
        baseCost: 100, 
        costMultiplier: 1.64, 
        description: 'Increases money earned per bounce.',
        unlocksAt: 10
    },
    { 
        id: 'microValue', 
        name: 'Micro Value +', 
        baseCost: 200, 
        costMultiplier: 1.4, 
        description: 'Increases Micro marble value.',
        unlocksAt: 15
    },
    { 
        id: 'uncommonChance', 
        name: 'Uncommon Chance +', 
        baseCost: 500, 
        costMultiplier: 1.64, 
        description: 'Chance for Uncommon marbles.',
        unlocksAt: 20,
        maxPercent: 20
    },
    { 
        id: 'basketValue', 
        name: 'Basket Value +', 
        baseCost: 2000, 
        costMultiplier: 1.48, 
        description: 'Increases bottom basket rewards.',
        unlocksAt: 30
    },
    { 
        id: 'criticalChance', 
        name: 'Critical Chance +', 
        baseCost: 5000, 
        costMultiplier: 1.64, 
        description: 'Chance for critical hits (2x).',
        unlocksAt: 35,
        maxPercent: 20
    },
    { 
        id: 'bonusValue', 
        name: 'Bonus Value +', 
        baseCost: 7500, 
        costMultiplier: 1.4, 
        description: 'Improves Bonus Marble rewards.',
        unlocksAt: 40
    },
    { 
        id: 'rareChance', 
        name: 'Rare Chance +', 
        baseCost: 10000, 
        costMultiplier: 1.64, 
        description: 'Chance for Rare marbles.',
        unlocksAt: 45,
        maxPercent: 20
    },
    { 
        id: 'ballSpeed', 
        name: 'Speed', 
        baseCost: 25000, 
        costMultiplier: 1.8, 
        description: 'Marbles move faster.',
        unlocksAt: 55
    },
    { 
        id: 'legendaryChance', 
        name: 'Legendary Chance +', 
        baseCost: 50000, 
        costMultiplier: 1.64, 
        description: 'Chance for Legendary marbles.',
        unlocksAt: 60,
        maxPercent: 20
    },
];