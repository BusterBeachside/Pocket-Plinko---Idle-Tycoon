export interface Mission {
    id: string;
    name: string;
    description: string;
    target: number;
    reward: { moneyMultiplier: number };
    stat: string;
}

export const DAILY_MISSIONS: Mission[] = [
    { id: 'pegs_hit_daily', name: 'Peg Smasher', description: 'Hit 100,000 pegs today', target: 100000, stat: 'pegs_hit', reward: { moneyMultiplier: 10 } },
    { id: 'baskets_daily', name: 'Basket Master', description: 'Land 50,000 marbles in baskets today', target: 50000, stat: 'baskets', reward: { moneyMultiplier: 15 } },
    { id: 'bonus_marbles_daily', name: 'Bonus Catcher', description: 'Catch 10 Bonus Marbles today', target: 10, stat: 'bonus_marbles', reward: { moneyMultiplier: 25 } },
    { id: 'upgrades_bought_daily', name: 'Big Spender', description: 'Buy 200 upgrades today', target: 200, stat: 'upgrades_bought', reward: { moneyMultiplier: 15 } },
    { id: 'critical_hits_daily', name: 'Critical Eye', description: 'Get 10,000 Critical Hits today', target: 10000, stat: 'critical_hits', reward: { moneyMultiplier: 20 } },
    { id: 'micro_marbles_daily', name: 'Micro Manager', description: 'Spawn 1,000 Micro Marbles today', target: 1000, stat: 'micro_marbles', reward: { moneyMultiplier: 30 } },
    { id: 'prestige_daily', name: 'New Beginning', description: 'Prestige 5 times today', target: 5, stat: 'prestige', reward: { moneyMultiplier: 100 } },
];

export const REPEATABLE_MISSIONS: Mission[] = [
    { id: 'pegs_hit_rep', name: 'Quick Smasher', description: 'Hit 10,000 pegs', target: 10000, stat: 'pegs_hit', reward: { moneyMultiplier: 1 } },
    { id: 'baskets_rep', name: 'Quick Baskets', description: 'Land 5,000 marbles in baskets', target: 5000, stat: 'baskets', reward: { moneyMultiplier: 1.5 } },
    { id: 'bonus_marbles_rep', name: 'Quick Catcher', description: 'Catch 2 Bonus Marbles', target: 2, stat: 'bonus_marbles', reward: { moneyMultiplier: 2.5 } },
    { id: 'upgrades_bought_rep', name: 'Quick Spender', description: 'Buy 20 upgrades', target: 20, stat: 'upgrades_bought', reward: { moneyMultiplier: 1.5 } },
    { id: 'critical_hits_rep', name: 'Quick Eye', description: 'Get 1,000 Critical Hits', target: 1000, stat: 'critical_hits', reward: { moneyMultiplier: 2 } },
    { id: 'micro_marbles_rep', name: 'Quick Micro', description: 'Spawn 100 Micro Marbles', target: 100, stat: 'micro_marbles', reward: { moneyMultiplier: 3 } },
];

export function getMissionById(id: string): Mission | undefined {
    return [...DAILY_MISSIONS, ...REPEATABLE_MISSIONS].find(m => m.id === id);
}
