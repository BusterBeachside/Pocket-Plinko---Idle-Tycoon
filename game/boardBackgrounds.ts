// Procedural and Asset-backed background pattern generators for Adventure Mode boards

export type BackgroundKey = 'Paper' | 'Wood' | 'Leaf' | 'GrayConcrete' | 'Sand' | 'BrickWall' | 'Sky' | 'FrostedGlass' | 'MarbleSurface' | 'Space';

interface PatternCache {
    [key: string]: CanvasPattern | HTMLImageElement | null;
}

const patternCache: PatternCache = {};
const bgImages: { [key: string]: HTMLImageElement } = {};

import { AdventureLevelsManager } from './adventureLevels';

interface BoardParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    life: number;
    maxLife: number;
    rotation?: number;
    vRot?: number;
    color?: string;
    extra?: any;
}

interface CafeBokehCircle {
    x: number;
    y: number;
    radius: number;
    maxAlpha: number;
    color: string;
    life: number;
    maxLife: number;
}

export class BoardBackgrounds {
    private static particles: BoardParticle[] = [];
    private static cafeBokehCircles: CafeBokehCircle[] = [];
    private static lastTime: number = performance.now();

    static init() {
        const bgKeys: BackgroundKey[] = ['Paper', 'Wood', 'Leaf', 'GrayConcrete', 'Sand', 'BrickWall', 'Sky', 'FrostedGlass', 'MarbleSurface', 'Space'];
        bgKeys.forEach(key => {
            const img = new Image();
            img.src = `images/BoardBackground/${key}.jpg`;
            img.onload = () => {
                bgImages[key] = img;
            };
            img.onerror = () => {
                const img2 = new Image();
                img2.src = `images/${key}.png`;
                img2.onload = () => {
                    bgImages[key] = img2;
                };
            };
        });
    }

    static drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, keyOrLevel: BackgroundKey | number) {
        ctx.save();

        let bgKey: BackgroundKey = 'Paper';
        if (typeof keyOrLevel === 'number') {
            const config = AdventureLevelsManager.getLevelConfig(keyOrLevel);
            bgKey = config.bgKey;
        } else {
            bgKey = keyOrLevel;
        }

        const now = performance.now();
        const dt = Math.min(0.05, (now - this.lastTime) / 1000);
        this.lastTime = now;

        const img = bgImages[bgKey];
        if (img && img.complete && img.naturalWidth > 0) {
            const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
            const w = img.naturalWidth * scale;
            const h = img.naturalHeight * scale;
            const x = (width - w) / 2;
            const y = (height - h) / 2;
            ctx.drawImage(img, x, y, w, h);

            // Subtle dark overlay to keep pegs readable
            ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
            ctx.fillRect(0, 0, width, height);
        } else {
            // Procedural Fallback Base
            this.drawProceduralBase(ctx, width, height, bgKey);
        }

        // --- DRAW LIVE SPECIAL ATMOSPHERIC OVERLAYS & PARTICLES ---
        this.drawSpecialBoardEffects(ctx, width, height, bgKey, dt, now);

        ctx.restore();
    }

    private static drawProceduralBase(ctx: CanvasRenderingContext2D, width: number, height: number, bgKey: BackgroundKey) {
        switch (bgKey) {
            case 'Paper': {
                ctx.fillStyle = '#f6f3eb';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = '#e2ded2';
                for (let x = 20; x < width; x += 30) {
                    for (let y = 20; y < height; y += 30) {
                        ctx.beginPath();
                        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                break;
            }
            case 'Wood': {
                const grad = ctx.createLinearGradient(0, 0, width, height);
                grad.addColorStop(0, '#4a2e1b');
                grad.addColorStop(0.5, '#3b2313');
                grad.addColorStop(1, '#2c180b');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 3;
                for (let y = 0; y < height; y += 25) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.bezierCurveTo(width * 0.3, y + 10, width * 0.7, y - 10, width, y);
                    ctx.stroke();
                }
                break;
            }
            case 'Leaf': {
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#133a1b');
                grad.addColorStop(1, '#091f0e');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = 'rgba(74, 222, 128, 0.08)';
                for (let i = 0; i < 30; i++) {
                    const cx = (i * 47) % width;
                    const cy = (i * 83) % height;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, 30, 15, Math.PI / 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
            case 'GrayConcrete': {
                ctx.fillStyle = '#2b2e33';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = '#3a3e45';
                for (let i = 0; i < 200; i++) {
                    const rx = (i * 97) % width;
                    const ry = (i * 131) % height;
                    ctx.fillRect(rx, ry, 2, 2);
                }
                break;
            }
            case 'Sand': {
                const grad = ctx.createLinearGradient(0, 0, width, height);
                grad.addColorStop(0, '#7c5828');
                grad.addColorStop(1, '#4a3314');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = 'rgba(252, 211, 77, 0.06)';
                for (let y = 0; y < height; y += 15) {
                    ctx.beginPath();
                    ctx.arc(width / 2, y, width * 0.6, 0, Math.PI);
                    ctx.fill();
                }
                break;
            }
            case 'BrickWall': {
                ctx.fillStyle = '#3d1c16';
                ctx.fillRect(0, 0, width, height);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 2;
                const bh = 20;
                const bw = 40;
                for (let y = 0; y < height; y += bh) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(width, y);
                    ctx.stroke();
                    const offset = (Math.floor(y / bh) % 2) * (bw / 2);
                    for (let x = offset; x < width; x += bw) {
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x, y + bh);
                        ctx.stroke();
                    }
                }
                break;
            }
            case 'Sky': {
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#1e3a8a');
                grad.addColorStop(0.5, '#0284c7');
                grad.addColorStop(1, '#0369a1');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath();
                    ctx.arc(100 + i * 120, 80 + i * 100, 50, 0, Math.PI * 2);
                    ctx.arc(140 + i * 120, 80 + i * 100, 70, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
            case 'FrostedGlass': {
                const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, height * 0.8);
                grad.addColorStop(0, '#1e1b4b');
                grad.addColorStop(0.5, '#0f172a');
                grad.addColorStop(1, '#020617');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
                break;
            }
            case 'MarbleSurface': {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(0, 0, width, height);
                ctx.strokeStyle = 'rgba(234, 179, 8, 0.15)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(0, height * 0.2);
                ctx.bezierCurveTo(width * 0.4, height * 0.1, width * 0.6, height * 0.4, width, height * 0.3);
                ctx.stroke();
                break;
            }
            case 'Space': {
                ctx.fillStyle = '#030712';
                ctx.fillRect(0, 0, width, height);
                break;
            }
        }
    }

    private static drawSpecialBoardEffects(ctx: CanvasRenderingContext2D, width: number, height: number, bgKey: BackgroundKey, dt: number, now: number) {
        switch (bgKey) {
            case 'Paper': {
                // Technical Blueprint Overlay
                ctx.strokeStyle = 'rgba(6, 182, 212, 0.18)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let x = 0; x <= width; x += 30) {
                    ctx.moveTo(x, 0); ctx.lineTo(x, height);
                }
                for (let y = 0; y <= height; y += 30) {
                    ctx.moveTo(0, y); ctx.lineTo(width, y);
                }
                ctx.stroke();

                // Drafting crosshairs & guidelines
                ctx.strokeStyle = 'rgba(14, 165, 233, 0.35)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(width / 2, height / 2, 120, 0, Math.PI * 2);
                ctx.moveTo(width / 2 - 140, height / 2); ctx.lineTo(width / 2 + 140, height / 2);
                ctx.moveTo(width / 2, height / 2 - 140); ctx.lineTo(width / 2, height / 2 + 140);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = 'rgba(14, 165, 233, 0.4)';
                ctx.font = '10px monospace';
                ctx.fillText('BLUEPRINT #01 • SCALE 1:1 • R=6.0mm', 15, 25);
                ctx.fillText('SPAWN_RATE: +15% • VALUE: +10%', 15, 38);
                break;
            }
            case 'Wood': {
                // Oak Elasticity Particles
                if (Math.random() < 0.25) {
                    this.particles.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        vx: (Math.random() - 0.5) * 15,
                        vy: 10 + Math.random() * 20,
                        size: 1.5 + Math.random() * 2,
                        alpha: 0.6,
                        life: 0,
                        maxLife: 2 + Math.random() * 2,
                        color: '#d97706'
                    });
                }
                break;
            }
            case 'Leaf': {
                // Gale Breeze Leaf Particles & Wind Gusts
                const windForce = Math.sin(now / 700) * 80;
                if (Math.random() < 0.4) {
                    this.particles.push({
                        x: windForce > 0 ? -10 : width + 10,
                        y: Math.random() * (height * 0.8),
                        vx: windForce + (Math.random() - 0.5) * 30,
                        vy: 20 + Math.random() * 40,
                        size: 3 + Math.random() * 4,
                        alpha: 0.7,
                        life: 0,
                        maxLife: 3 + Math.random() * 2,
                        rotation: Math.random() * Math.PI * 2,
                        vRot: (Math.random() - 0.5) * 4,
                        color: Math.random() < 0.7 ? '#22c55e' : '#eab308'
                    });
                }

                // Wind Streaks
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                const sy = (now / 20) % height;
                ctx.moveTo(20, sy); ctx.lineTo(120 + windForce, sy + 15);
                ctx.moveTo(width - 150, (sy + height / 2) % height); ctx.lineTo(width - 20 + windForce, ((sy + height / 2) % height) + 15);
                ctx.stroke();
                break;
            }
            case 'GrayConcrete': {
                // Downward Heavy Gravity Vectors & Hazard Stripes
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
                ctx.lineWidth = 1.5;
                const offset = (now / 5) % 40;
                ctx.beginPath();
                for (let x = 30; x < width; x += 60) {
                    for (let y = -40 + offset; y < height; y += 40) {
                        ctx.moveTo(x, y); ctx.lineTo(x, y + 15);
                    }
                }
                ctx.stroke();

                // Side hazard warning stripes
                ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
                ctx.beginPath();
                ctx.fillRect(0, 0, 8, height);
                ctx.fillRect(width - 8, 0, 8, height);
                break;
            }
            case 'Sand': {
                // Desert Sandstorm Stream
                if (Math.random() < 0.6) {
                    this.particles.push({
                        x: -10,
                        y: Math.random() * height,
                        vx: 120 + Math.random() * 100,
                        vy: (Math.random() - 0.5) * 40,
                        size: 1 + Math.random() * 2.5,
                        alpha: 0.5,
                        life: 0,
                        maxLife: 2 + Math.random() * 1.5,
                        color: '#fde047'
                    });
                }
                break;
            }
            case 'BrickWall': {
                // Castle Wall Torch Flames & Ember Sparks
                const leftGlow = ctx.createRadialGradient(0, height * 0.4, 10, 0, height * 0.4, 120);
                leftGlow.addColorStop(0, 'rgba(249, 115, 22, 0.25)');
                leftGlow.addColorStop(1, 'transparent');
                ctx.fillStyle = leftGlow;
                ctx.fillRect(0, 0, 150, height);

                const rightGlow = ctx.createRadialGradient(width, height * 0.4, 10, width, height * 0.4, 120);
                rightGlow.addColorStop(0, 'rgba(249, 115, 22, 0.25)');
                rightGlow.addColorStop(1, 'transparent');
                ctx.fillStyle = rightGlow;
                ctx.fillRect(width - 150, 0, 150, height);

                if (Math.random() < 0.3) {
                    this.particles.push({
                        x: Math.random() < 0.5 ? 20 + Math.random() * 30 : width - 50 + Math.random() * 30,
                        y: height * 0.4 + (Math.random() - 0.5) * 40,
                        vx: (Math.random() - 0.5) * 20,
                        vy: -30 - Math.random() * 40,
                        size: 1 + Math.random() * 2,
                        alpha: 0.8,
                        life: 0,
                        maxLife: 1.5 + Math.random(),
                        color: '#f97316'
                    });
                }
                break;
            }
            case 'Sky': {
                // Thermals Updraft Stream & Bubbles
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1;
                const offset = (-now / 8) % 50;
                ctx.beginPath();
                for (let x = 40; x < width; x += 80) {
                    for (let y = height + offset; y > height * 0.3; y -= 50) {
                        ctx.moveTo(x, y); ctx.lineTo(x, y - 20);
                    }
                }
                ctx.stroke();

                if (Math.random() < 0.3) {
                    this.particles.push({
                        x: Math.random() * width,
                        y: height + 10,
                        vx: (Math.random() - 0.5) * 15,
                        vy: -60 - Math.random() * 40,
                        size: 2 + Math.random() * 3,
                        alpha: 0.4,
                        life: 0,
                        maxLife: 3 + Math.random(),
                        color: '#ffffff'
                    });
                }
                break;
            }
            case 'FrostedGlass': {
                // Night Cafe Dynamic Ambient Bokeh Circles
                const cafeColors = [
                    'rgba(244, 114, 182,', // Soft Pink
                    'rgba(56, 189, 248,',  // Cyan/Teal
                    'rgba(251, 191, 36,',  // Warm Amber
                    'rgba(192, 132, 252,', // Lavender
                    'rgba(248, 113, 113,'  // Soft Coral
                ];

                if (this.cafeBokehCircles.length === 0) {
                    for (let i = 0; i < 12; i++) {
                        const colBase = cafeColors[Math.floor(Math.random() * cafeColors.length)];
                        this.cafeBokehCircles.push({
                            x: Math.random() * width,
                            y: Math.random() * height,
                            radius: 12 + Math.random() * 22, // Small ambient circles (12px - 34px)
                            maxAlpha: 0.18 + Math.random() * 0.22,
                            color: colBase,
                            life: Math.random() * 3, // Stagger initial life
                            maxLife: 2.2 + Math.random() * 2.5
                        });
                    }
                }

                this.cafeBokehCircles.forEach(circle => {
                    circle.life += dt;
                    if (circle.life >= circle.maxLife) {
                        // Respawn at a new random location with fresh size & color
                        circle.x = Math.random() * width;
                        circle.y = Math.random() * height;
                        circle.radius = 12 + Math.random() * 22;
                        circle.maxAlpha = 0.18 + Math.random() * 0.22;
                        circle.color = cafeColors[Math.floor(Math.random() * cafeColors.length)];
                        circle.life = 0;
                        circle.maxLife = 2.2 + Math.random() * 2.5;
                    }

                    // Smooth fade in during first 30%, hold, then fade out during last 30%
                    const progress = circle.life / circle.maxLife;
                    let currentAlpha = 0;
                    if (progress < 0.3) {
                        currentAlpha = (progress / 0.3) * circle.maxAlpha;
                    } else if (progress > 0.7) {
                        currentAlpha = ((1 - progress) / 0.3) * circle.maxAlpha;
                    } else {
                        currentAlpha = circle.maxAlpha;
                    }

                    // Outer soft glow
                    ctx.fillStyle = `${circle.color} ${currentAlpha})`;
                    ctx.beginPath();
                    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner bright core
                    ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.4})`;
                    ctx.beginPath();
                    ctx.arc(circle.x, circle.y, circle.radius * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                });
                break;
            }
            case 'MarbleSurface': {
                // Shimmering Gold Vein Glow
                const shimmer = Math.sin(now / 600) * 0.1 + 0.2;
                ctx.strokeStyle = `rgba(234, 179, 8, ${shimmer})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, height * 0.3);
                ctx.bezierCurveTo(width * 0.3, height * 0.2, width * 0.7, height * 0.5, width, height * 0.4);
                ctx.stroke();

                if (Math.random() < 0.2) {
                    this.particles.push({
                        x: Math.random() * width,
                        y: height - 60 + Math.random() * 50,
                        vx: (Math.random() - 0.5) * 10,
                        vy: -10 - Math.random() * 15,
                        size: 1 + Math.random() * 2,
                        alpha: 0.7,
                        life: 0,
                        maxLife: 1.5,
                        color: '#eab308'
                    });
                }
                break;
            }
            case 'Space': {
                // Deep Cosmos Nebula & Starfield
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 40; i++) {
                    const sx = (i * 137) % width;
                    const sy = (i * 223) % height;
                    const starAlpha = (Math.sin(now / 400 + i) + 1) / 2 * 0.8 + 0.2;
                    ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
        }

        // Render & Update Particles
        this.updateAndDrawParticles(ctx, dt);
    }

    private static updateAndDrawParticles(ctx: CanvasRenderingContext2D, dt: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
                this.particles.splice(i, 1);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.rotation !== undefined && p.vRot !== undefined) {
                p.rotation += p.vRot * dt;
            }

            const fade = 1 - (p.life / p.maxLife);
            const alpha = p.alpha * fade;

            ctx.save();
            ctx.fillStyle = p.color || 'rgba(255, 255, 255, 0.8)';
            ctx.globalAlpha = alpha;

            if (p.rotation !== undefined) {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
}

BoardBackgrounds.init();
