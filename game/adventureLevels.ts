export interface AdventureLevelConfig {
    levelId: number;
    name: string;
    bgKey: 'Paper' | 'Wood' | 'Leaf' | 'GrayConcrete' | 'Sand' | 'BrickWall' | 'Sky' | 'FrostedGlass' | 'MarbleSurface' | 'Space';
    bgName: string;
    targetGoal: number;
    isBoss: boolean;
    gimmickId: string;
    gimmickName: string;
    gimmickDesc: string;
    multiplierReward: number; // e.g. 1.20 (+20%) or 1.50 (+50%)
}

const BOARD_TEXTURES: Array<{
    bgKey: AdventureLevelConfig['bgKey'];
    bgName: string;
    gimmickId: string;
    gimmickName: string;
    gimmickDesc: string;
}> = [
    {
        bgKey: 'Paper',
        bgName: 'Paper Scratchpad',
        gimmickId: 'paper_blueprint',
        gimmickName: 'Fresh Blueprint',
        gimmickDesc: '+10% base coin value & +15% ball spawn speed.'
    },
    {
        bgKey: 'Wood',
        bgName: 'Timber Grove',
        gimmickId: 'wood_springy',
        gimmickName: 'Oak Elasticity',
        gimmickDesc: 'Pegs are extra springy (+20% bounce velocity).'
    },
    {
        bgKey: 'Leaf',
        bgName: 'Verdant Canopy',
        gimmickId: 'leaf_breeze',
        gimmickName: 'Gale Breeze',
        gimmickDesc: 'Gentle ambient wind forces sway dropping marbles sideways.'
    },
    {
        bgKey: 'GrayConcrete',
        bgName: 'Industrial Quarry',
        gimmickId: 'concrete_gravity',
        gimmickName: 'Heavy Gravity',
        gimmickDesc: '+30% downward gravity for rapid, heavy drops.'
    },
    {
        bgKey: 'Sand',
        bgName: 'Sandstorm Citadel',
        gimmickId: 'sand_pegs',
        gimmickName: 'Sand Pegs (BOSS)',
        gimmickDesc: 'BOSS: Pegs wear down and dissolve on impact, slowly regenerating over time.'
    },
    {
        bgKey: 'BrickWall',
        bgName: 'Fortress Rampart',
        gimmickId: 'brick_wide',
        gimmickName: 'Fortress Grid',
        gimmickDesc: 'Dense masonry brick grid with extra rivet pegs and stone deflection.'
    },
    {
        bgKey: 'Sky',
        bgName: 'Cerulean Heights',
        gimmickId: 'sky_thermals',
        gimmickName: 'Thermals Draft',
        gimmickDesc: 'Upward air drafts float marbles toward top pegs for extra hits.'
    },
    {
        bgKey: 'FrostedGlass',
        bgName: 'Nighttime City Cafe',
        gimmickId: 'frosted_cafe',
        gimmickName: 'Cozy Ambiance',
        gimmickDesc: '2x Bonus Marble spawn frequency & ambient lo-fi glow.'
    },
    {
        bgKey: 'MarbleSurface',
        bgName: 'Imperial Hall',
        gimmickId: 'marble_society',
        gimmickName: 'High Society',
        gimmickDesc: '+50% boost to all bottom bucket payouts.'
    },
    {
        bgKey: 'Space',
        bgName: 'Deep Cosmos',
        gimmickId: 'space_zero_g',
        gimmickName: 'Zero-G Orbit (BOSS)',
        gimmickDesc: 'BOSS: Low-gravity orbital physics chamber with floaty trajectories.'
    }
];

export class AdventureLevelsManager {
    static getLevelConfig(levelId: number): AdventureLevelConfig {
        const isBoss = (levelId % 5 === 0);
        const textureIndex = (levelId - 1) % BOARD_TEXTURES.length;
        const baseTexture = BOARD_TEXTURES[textureIndex];

        // Target goals scale progressively to ensure players spend ~1.5 - 4 minutes engaging with each gimmick
        const BASE_TARGETS: { [level: number]: number } = {
            1: 15000,             // Timber Grove: $15K
            2: 60000,             // Verdant Canopy: $60K
            3: 250000,            // Rocky Path: $250K
            4: 1000000,           // Pebble Creek: $1M
            5: 6000000,           // BOSS 1 (Sand Pegs): $6M
            6: 20000000,          // Fortress Grid: $20M
            7: 75000000,          // Ancient Citadel: $75M
            8: 300000000,         // Nighttime City Cafe: $300M
            9: 1200000000,        // Marble Society: $1.2B
            10: 8000000000,       // BOSS 2 (Zero-G Orbit): $8B
            11: 35000000000,      // Blueprint Workshop: $35B
            12: 150000000000,     // Architect Studio: $150B
            13: 600000000000,     // Gravel Pit: $600B
            14: 2500000000000,    // Stone Quarry: $2.5T
            15: 18000000000000,   // BOSS 3 (Micro Frenzy): $18T
            16: 80000000000000,   // Sunset Skylight: $80T
            17: 350000000000000,  // Starlight Roof: $350T
            18: 1500000000000000, // Polished Obsidian: $1.5Qa
            19: 7000000000000000, // Golden Vein: $7Qa
            20: 50000000000000000 // BOSS 4 (Thermal Meltdown): $50Qa
        };

        let targetGoal: number;
        if (BASE_TARGETS[levelId]) {
            targetGoal = BASE_TARGETS[levelId];
        } else {
            // For continuous endless progression past Board 20
            const overflow = levelId - 20;
            targetGoal = Math.round(50e15 * Math.pow(4.5, overflow));
        }

        let gimmickId = baseTexture.gimmickId;
        let gimmickName = baseTexture.gimmickName;
        let gimmickDesc = baseTexture.gimmickDesc;
        let bgKey = baseTexture.bgKey;

        // Custom boss gimmicks and matching themes for boss levels
        if (isBoss) {
            const bossType = Math.floor(levelId / 5) % 4;
            if (bossType === 1) {
                // Sand Pegs
                bgKey = 'Sand';
                gimmickId = 'sand_pegs';
                gimmickName = 'Sand Pegs (BOSS)';
                gimmickDesc = 'BOSS: Pegs wear down and dissolve on impact, slowly regenerating over time.';
            } else if (bossType === 2) {
                // Zero-G Orbit
                bgKey = 'Space';
                gimmickId = 'space_zero_g';
                gimmickName = 'Zero-G Orbit (BOSS)';
                gimmickDesc = 'BOSS: Low-gravity orbital physics chamber with floaty trajectories.';
            } else if (bossType === 3) {
                // Micro Frenzy
                bgKey = 'FrostedGlass';
                gimmickId = 'micro_frenzy';
                gimmickName = 'Micro Frenzy (BOSS)';
                gimmickDesc = 'BOSS: Peg collisions fracture marbles into miniaturized micro-marbles.';
            } else {
                // Critical Overload
                bgKey = 'BrickWall';
                gimmickId = 'critical_overload';
                gimmickName = 'Thermal Meltdown (BOSS)';
                gimmickDesc = 'BOSS: Only Critical Marbles generate earnings; standard collisions overheat pegs.';
            }
        }

        const name = isBoss ? `${bgKey} Domain` : baseTexture.bgName;

        const multiplierReward = isBoss ? 1.50 : 1.20; // +50% for Boss, +20% for Standard

        return {
            levelId,
            name,
            bgKey,
            bgName: baseTexture.bgName,
            targetGoal,
            isBoss,
            gimmickId,
            gimmickName,
            gimmickDesc,
            multiplierReward
        };
    }
}
