
import { Ball, GameState, Peg, VisualEffect } from './types';
import { PhysicsManager } from './physics';

export class Spawner {
    static initPegs(width: number, height: number, gridSize: number, state?: GameState): { pegs: Peg[], grid: Peg[][][], gridCols: number, gridRows: number } {
        const pegs: Peg[] = [];
        
        let isBrickWide = false;
        if (state && state.gameMode === 'adventure') {
            const gimmick = PhysicsManager.getActiveAdventureGimmick(state);
            if (gimmick === 'brick_wide') {
                isBrickWide = true;
            }
        }

        // Side margin safety so marbles NEVER get wedged/stuck on outer walls
        const minMarginX = 32;
        const startY = 75;
        const spacingY = isBrickWide ? 34 : 38;
        const maxRows = isBrickWide ? 15 : 12;
        
        // Target columns for standard vs fortress brick wall grid
        const baseColsEven = isBrickWide ? 13 : 11;
        const baseColsOdd = isBrickWide ? 12 : 10;

        // Calculate horizontal spacing across available width with 32px wall margins
        const availWidth = Math.max(200, width - (minMarginX * 2));
        const spacingXEven = availWidth / (baseColsEven - 1);

        // Buckets top is at height - 40. Lowest peg row stops at least 62px above bottom
        const maxPegY = height - 62;

        for (let r = 0; r < maxRows; r++) {
            const pegY = startY + (r * spacingY);
            if (pegY > maxPegY) break; // Strict safety check: Never overlap bottom buckets

            const isEven = (r % 2 === 0);
            const cols = isEven ? baseColsEven : baseColsOdd;
            
            // Center odd rows relative to even rows
            const rowWidth = (cols - 1) * spacingXEven;
            const startX = isEven ? minMarginX : (width - rowWidth) / 2;

            for (let c = 0; c < cols; c++) {
                const pegX = startX + (c * spacingXEven);
                // Sanity check: keep peg center well within side boundaries
                if (pegX >= 24 && pegX <= width - 24) {
                    pegs.push({
                        x: pegX,
                        y: pegY,
                        glow: 0,
                        cooldown: 0
                    });
                }
            }
        }

        const gridCols = Math.ceil(width / gridSize);
        const gridRows = Math.ceil(height / gridSize);
        const grid = Array.from({ length: gridRows }, () => Array.from({ length: gridCols }, () => [] as Peg[]));

        pegs.forEach(p => {
            const gx = Math.floor(p.x / gridSize);
            const gy = Math.floor(p.y / gridSize);
            if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
                grid[gy][gx].push(p);
            }
        });

        return { pegs, grid, gridCols, gridRows };
    }

    static spawnBalls(state: GameState, balls: Ball[], width: number, height: number, spawnBall: (overrides?: Partial<Ball>) => void) {
        if (state.inChallengeMode) {
            const cid = state.challengeState.challengeId;
            if (cid === 'micro_mania') {
                // Absolutely no normal or master marbles allowed to start!
                return;
            }
            if (cid === 'single_marble') {
                // Exactly 1 Master marble allowed!
                const currentNormalBalls = balls.filter(b => !b.micro).length;
                if (currentNormalBalls < 1) {
                    spawnBall({ master: true });
                }
                return;
            }
            
            // Other challenges
            const targetCount = state.challengeState.upgrades.extraBall;
            const currentNormalBalls = balls.filter(b => !b.micro && !b.isSplit).reduce((sum, b) => sum + (b.mergeCount || 1), 0);
            if (currentNormalBalls < targetCount) {
                spawnBall();
            }
            return;
        }

        if (state.gameMode === 'adventure') {
            const targetCount = state.upgrades.extraBall || 1;
            const currentNormalBalls = balls.filter(b => !b.micro && !b.isSplit).reduce((sum, b) => sum + (b.mergeCount || 1), 0);
            if (currentNormalBalls < targetCount) {
                spawnBall();
            }
            return;
        }

        const targetCount = state.upgrades.extraBall;
        const currentNormalBalls = balls.filter(b => !b.micro && !b.isSplit).reduce((sum, b) => sum + (b.mergeCount || 1), 0);
        const hasMasterUnlock = state.masterMultiplier > 0 || state.timesPrestiged > 0;
        const targetMasterCount = hasMasterUnlock ? (1 + (state.permUpgradesLevels?.['perm_extra_master'] || 0)) : 0;
        const currentMasterCount = balls.filter(b => b.master && !b.isSplit).reduce((sum, b) => sum + (b.mergeCount || 1), 0);

        const maxAllowed = Math.max(targetCount, targetMasterCount);

        if (currentNormalBalls < maxAllowed) {
            if (currentMasterCount < targetMasterCount) {
                spawnBall({ master: true });
            } else {
                spawnBall();
            }
        }
    }

    static createBall(state: GameState, width: number, overrides: Partial<Ball> = {}): Ball {
        const isMaster = overrides.master || false;
        const isMicro = overrides.micro || false;
        let type: 'normal' | 'uncommon' | 'rare' | 'legendary' = 'normal';

        if (!isMaster && !isMicro) {
            type = PhysicsManager.rollRarity(state);
        }

        const radius = isMaster ? 6 : (isMicro ? 3 : 6);
        const x = overrides.x !== undefined ? overrides.x : (width / 2 + (Math.random() - 0.5) * 50);
        const y = overrides.y !== undefined ? overrides.y : 20;

        return {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: 0,
            radius,
            id: Math.random(),
            master: isMaster,
            micro: isMicro,
            type,
            trail: [],
            _pegCooldown: 0,
            _remove: false,
            mergeCount: 1,
            ...overrides
        };
    }

    static spawnMicroMarble(width: number, spawnBall: (overrides: Partial<Ball>) => void, pushEffect: (e: VisualEffect) => void) {
        const spawnX = Math.random() * width;
        const spawnY = 20;
        spawnBall({ micro: true, x: spawnX, y: spawnY });
        pushEffect({
            x: spawnX, y: spawnY, t: performance.now(), duration: 420, type: 'micro_spawn'
        });
    }

    static spawnBonusMarble(state: GameState, width: number, requestTutorial: (key: string) => void) {
        if (!state.bonusMarble) state.bonusMarble = { active: false, x: 0, y: 0, baseY: 0, t: 0, paused: false };
        
        if (typeof window !== 'undefined' && !state.tutorials['plinko_seen_bonus_tutorial_v1'] && !localStorage.getItem('plinko_seen_bonus_tutorial_v1')) {
            state.bonusMarble.paused = true;
            requestTutorial('tut_bonus');
        }

        state.bonusMarble.active = true;
        state.bonusMarble.x = width + 50;
        state.bonusMarble.y = 100 + Math.random() * 200;
        state.bonusMarble.baseY = state.bonusMarble.y;
        state.bonusMarble.t = 0;
    }
}
