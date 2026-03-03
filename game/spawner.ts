
import { Ball, GameState, Peg, VisualEffect } from './types';
import { PhysicsManager } from './physics';

export class Spawner {
    static initPegs(width: number, height: number, gridSize: number): { pegs: Peg[], grid: Peg[][][], gridCols: number, gridRows: number } {
        const pegs: Peg[] = [];
        const spacingX = 40; 
        const spacingY = 40; 
        const rows = 12; 
        
        for(let r=0; r<rows; r++) {
            const cols = (r % 2 === 0) ? 11 : 10;
            const rowWidth = (cols - 1) * spacingX;
            const startX = (width - rowWidth) / 2;
            
            for(let c=0; c<cols; c++) {
                pegs.push({
                    x: startX + (c * spacingX),
                    y: 80 + (r * spacingY),
                    glow: 0,
                    cooldown: 0
                });
            }
        }

        const gridCols = Math.ceil(width / gridSize);
        const gridRows = Math.ceil(height / gridSize);
        const grid = Array.from({ length: gridRows }, () => Array.from({ length: gridCols }, () => [] as Peg[]));

        pegs.forEach(p => {
            const gx = Math.floor(p.x / gridSize);
            const gy = Math.floor(p.y / gridSize);
            if(gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
                grid[gy][gx].push(p);
            }
        });

        return { pegs, grid, gridCols, gridRows };
    }

    static spawnBalls(state: GameState, balls: Ball[], width: number, height: number, spawnBall: (overrides?: Partial<Ball>) => void) {
        const targetCount = state.upgrades.extraBall;
        const currentNormalBalls = balls.filter(b => !b.micro).length;

        if (currentNormalBalls < targetCount) {
            const hasMasterUnlock = state.masterMultiplier > 0 || state.timesPrestiged > 0;
            const masterExists = balls.some(b => b.master);
            
            if (hasMasterUnlock && !masterExists) {
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
        
        if (typeof window !== 'undefined' && !localStorage.getItem('plinko_seen_bonus_tutorial_v1')) {
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
