
export interface AchievementTier {
    target: number;
    rewardMult: number;
}

export interface AchievementGroup {
    id: string;
    name: string;
    stat: string;
    descriptionTemplate: string;
    baseTarget: number;
    targetScale: number;
    baseRewardMult: number;
    rewardScale: number;
}

export const ACHIEVEMENT_GROUPS: AchievementGroup[] = [
    {
        id: 'tycoon',
        name: 'Tycoon',
        stat: 'lifetimeEarnings',
        descriptionTemplate: 'Earn ${n} in total',
        baseTarget: 1000000,
        targetScale: 10,
        baseRewardMult: 20,
        rewardScale: 2
    },
    {
        id: 'peg_smasher',
        name: 'Peg Smasher',
        stat: 'lifetimePegHits',
        descriptionTemplate: 'Hit {n} pegs in total',
        baseTarget: 500,
        targetScale: 10,
        baseRewardMult: 10,
        rewardScale: 2
    },
    {
        id: 'basket_master',
        name: 'Basket Master',
        stat: 'lifetimeBaskets',
        descriptionTemplate: 'Land {n} marbles in baskets',
        baseTarget: 50,
        targetScale: 10,
        baseRewardMult: 15,
        rewardScale: 2
    },
    {
        id: 'bonus_catcher',
        name: 'Bonus Catcher',
        stat: 'lifetimeBonusMarbles',
        descriptionTemplate: 'Click {n} bonus marbles',
        baseTarget: 5,
        targetScale: 10,
        baseRewardMult: 25,
        rewardScale: 2
    },
    {
        id: 'big_spender',
        name: 'Big Spender',
        stat: 'lifetimeUpgradesBought',
        descriptionTemplate: 'Buy {n} upgrades',
        baseTarget: 20,
        targetScale: 5,
        baseRewardMult: 15,
        rewardScale: 2
    },
    {
        id: 'critical_eye',
        name: 'Critical Eye',
        stat: 'lifetimeCriticalHits',
        descriptionTemplate: 'Score {n} critical hits',
        baseTarget: 100,
        targetScale: 10,
        baseRewardMult: 20,
        rewardScale: 2
    },
    {
        id: 'prestige',
        name: 'New Beginning',
        stat: 'timesPrestiged',
        descriptionTemplate: 'Prestige {n} times',
        baseTarget: 1,
        targetScale: 5,
        baseRewardMult: 100,
        rewardScale: 2
    },
    {
        id: 'mission_master',
        name: 'Mission Master',
        stat: 'lifetimeMissionsCompleted',
        descriptionTemplate: 'Complete {n} missions',
        baseTarget: 10,
        targetScale: 5,
        baseRewardMult: 30,
        rewardScale: 2
    }
];

export function getAchievementTier(group: AchievementGroup, tierIndex: number): AchievementTier {
    return {
        target: Math.round(group.baseTarget * Math.pow(group.targetScale, tierIndex)),
        rewardMult: Math.round(group.baseRewardMult * Math.pow(group.rewardScale, tierIndex))
    };
}

export function romanize(num: number): string {
    const lookup: { [key: string]: number } = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let roman = '';
    for (const i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
}
