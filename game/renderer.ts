
import { GameState, Ball, Peg, Popup, VisualEffect, SandParticle } from './types';
import { assets } from './assets';
import { formatNumber } from './utils';
import { PhysicsManager } from './physics';
import { BoardBackgrounds } from './boardBackgrounds';

export class GameRenderer {
    private textureCache: Map<string, HTMLImageElement> = new Map();
    private pegRadius: number = 6;

    draw(
        ctx: CanvasRenderingContext2D, 
        width: number, 
        height: number, 
        state: GameState, 
        balls: Ball[], 
        pegs: Peg[], 
        visualEffects: VisualEffect[], 
        popups: Popup[],
        sandParticles?: SandParticle[],
        socketingActive?: boolean,
        isPaused?: boolean,
        fps?: number
    ) {
        ctx.clearRect(0, 0, width, height);
        const quality = state.qualityMode || 'high';
        const isLowQuality = quality === 'low';
        const isMediumQuality = quality === 'medium';
        const isHighQuality = quality === 'high';

        const totalBalls = balls.length;
        // Optimization: Shadow blur & canvas filters are bottlenecks during high ball counts.
        // High Quality: Always allows full heavy shadows, multi-layered auras, filters & maximum trail length.
        // Medium Quality: Dynamically throttles heavy shadows & trails during heavy cascades.
        // Low Quality: Flat, maximum performance mode.
        const allowHeavyShadows = isHighQuality || (isMediumQuality && totalBalls < 15);
        const allowLightShadows = isHighQuality || (isMediumQuality && totalBalls < 30);
        
        // Background Rendering
        ctx.save();
        if (state.gameMode === 'adventure') {
            BoardBackgrounds.drawBackground(ctx, width, height, state.adventureState?.currentLevel || 1);
        } else if (state.inChallengeMode) {
            // Animated scrolling tech grid for Challenges!
            const t = (Date.now() / 1500) % 1; // 0 to 1
            const offset = t * 40;
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.07)'; // Golden/Amber challenge theme
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            // Vertical static lines
            for(let gx=0; gx<=width; gx+=40) { ctx.moveTo(gx, 0); ctx.lineTo(gx, height); }
            // Horizontal scrolling lines
            for(let gy=-40; gy<=height+40; gy+=40) { ctx.moveTo(0, gy+offset); ctx.lineTo(width, gy+offset); }
            ctx.stroke();

            // Render a watermark text behind elements
            ctx.fillStyle = 'rgba(245, 158, 11, 0.04)';
            ctx.font = '800 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡ CHALLENGE ACTIVE ⚡', width / 2, height / 2 - 40);
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(let gx=0; gx<=width; gx+=40) { ctx.moveTo(gx, 0); ctx.lineTo(gx, height); }
            for(let gy=0; gy<=height; gy+=40) { ctx.moveTo(0, gy); ctx.lineTo(width, gy); }
            ctx.stroke();
        }
        ctx.restore();

        // Enhanced Neon Side Glow/Walls
        ctx.save();
        if (!isLowQuality) {
            const wallGradLeft = ctx.createLinearGradient(0, 0, 40, 0);
            wallGradLeft.addColorStop(0, 'rgba(50, 220, 255, 0.3)');
            wallGradLeft.addColorStop(1, 'rgba(50, 220, 255, 0)');
            ctx.fillStyle = wallGradLeft;
            ctx.fillRect(0, 0, 40, height);
            
            const wallGradRight = ctx.createLinearGradient(width, 0, width - 40, 0);
            wallGradRight.addColorStop(0, 'rgba(220, 50, 255, 0.3)');
            wallGradRight.addColorStop(1, 'rgba(220, 50, 255, 0)');
            ctx.fillStyle = wallGradRight;
            ctx.fillRect(width - 40, 0, 40, height);
        } else {
            ctx.fillStyle = 'rgba(50, 220, 255, 0.06)';
            ctx.fillRect(0, 0, 40, height);
            ctx.fillStyle = 'rgba(220, 50, 255, 0.06)';
            ctx.fillRect(width - 40, 0, 40, height);
        }
        ctx.restore();
        
        // Draw Pegs with 3D spherical look + neon hit glow
        pegs.forEach(p => {
            const isSandPeg = (state.inChallengeMode && state.challengeState?.challengeId === 'sand_peg') || (PhysicsManager.getActiveAdventureGimmick(state) === 'sand_pegs');
            const isOverheated = p.overheated || (p.heat && p.heat > 0);
            const isBrickWide = state.gameMode === 'adventure' && PhysicsManager.getActiveAdventureGimmick(state) === 'brick_wide';

            if (p.broken) {
                // Faint dashed outline showing former peg placement
                ctx.save();
                ctx.strokeStyle = 'rgba(230, 200, 120, 0.12)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 3]);
                ctx.beginPath();
                ctx.arc(p.x, p.y, this.pegRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
                return;
            }

            ctx.beginPath();
            // Spherical gradient
            const grad = ctx.createRadialGradient(p.x - 2, p.y - 2, 1, p.x, p.y, this.pegRadius);
            
            if (isOverheated) {
                // Fiery overheated red/orange thermal glow
                if (allowLightShadows) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#ef4444';
                }
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.3, '#f97316');
                grad.addColorStop(1, '#dc2626');
            } else if (isSandPeg) {
                // 7. Color pegs differently in this mode to show their current HP. Green for 3, yellow for 2, and red for 1.
                const hp = p.hp !== undefined ? p.hp : 3;
                let hpColor = '#39ff14'; // green
                let hpStart = '#ffffff';
                let hpMid = '#b0ff9e';
                let hpEnd = '#1b8010';

                if (hp === 2) {
                    hpColor = '#ffd214'; // yellow
                    hpStart = '#ffffff';
                    hpMid = '#fff99e';
                    hpEnd = '#b38800';
                } else if (hp <= 1) {
                    hpColor = '#ff3b3b'; // red
                    hpStart = '#ffffff';
                    hpMid = '#ff9e9e';
                    hpEnd = '#a60c0c';
                }

                if (p.glow > 0) {
                    if (allowLightShadows) {
                        ctx.shadowBlur = 12;
                        ctx.shadowColor = hpColor;
                    }
                    grad.addColorStop(0, hpStart);
                    grad.addColorStop(0.2, hpMid);
                    grad.addColorStop(1, hpColor);
                } else {
                    grad.addColorStop(0, hpStart);
                    grad.addColorStop(0.3, hpMid);
                    grad.addColorStop(1, hpEnd);
                    ctx.shadowBlur = 0;
                }
            } else if (p.glow > 0) {
                // Active Glow based on hit type
                let glowColor = isBrickWide ? '#f97316' : '#ffd700'; // Amber spark on BrickWall
                let startCol = '#fff';
                let midCol = isBrickWide ? '#fed7aa' : '#fff7cc';
                let endCol = isBrickWide ? '#ea580c' : '#ffab00';
                
                if (p.hitType === 'master') {
                    const hue = (performance.now() / 5) % 360;
                    glowColor = `hsl(${hue}, 100%, 70%)`;
                    startCol = '#fff';
                    midCol = `hsl(${hue}, 100%, 85%)`;
                    endCol = `hsl(${hue}, 100%, 60%)`;
                } else if (p.hitType === 'micro') {
                    glowColor = '#b200ff';
                    startCol = '#fff';
                    midCol = '#e5b3ff';
                    endCol = '#b200ff';
                } else if (p.hitType === 'legendary') {
                    glowColor = '#39ff14';
                    startCol = '#fff';
                    midCol = '#b0ff9e';
                    endCol = '#39ff14';
                } else if (p.hitType === 'rare') {
                    glowColor = '#ff2e2e';
                    startCol = '#fff';
                    midCol = '#ff9e9e';
                    endCol = '#ff2e2e';
                } else if (p.hitType === 'uncommon') {
                    glowColor = '#00f5ff';
                    startCol = '#fff';
                    midCol = '#b0faff';
                    endCol = '#00f5ff';
                }
                
                if (allowLightShadows) {
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = glowColor;
                }
                grad.addColorStop(0, startCol);
                grad.addColorStop(0.2, midCol);
                grad.addColorStop(1, endCol);
            } else if (isBrickWide) {
                // Fortress stone rivet styling
                grad.addColorStop(0, '#f8fafc');
                grad.addColorStop(0.3, '#cbd5e1');
                grad.addColorStop(1, '#475569');
                ctx.shadowBlur = 0;
            } else {
                // Idle Metallic/Glass look
                grad.addColorStop(0, '#e6e6e6');
                grad.addColorStop(0.3, '#999');
                grad.addColorStop(1, '#444');
                ctx.shadowBlur = 0;
            }
            
            ctx.fillStyle = grad;
            ctx.arc(p.x, p.y, this.pegRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            if (socketingActive && !p.broken) {
                ctx.save();
                const pulseAlpha = 0.35 + Math.sin(Date.now() / 120) * 0.15;
                ctx.strokeStyle = p.gemType 
                    ? (p.gemType === 'ruby' ? `rgba(244, 63, 94, ${pulseAlpha + 0.35})` : (p.gemType === 'emerald' ? `rgba(16, 185, 129, ${pulseAlpha + 0.35})` : `rgba(56, 189, 248, ${pulseAlpha + 0.35})`)) 
                    : `rgba(255, 255, 255, ${pulseAlpha})`;
                ctx.lineWidth = p.gemType ? 1.5 : 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(p.x, p.y, (p.gemType ? 11 : 9) + Math.sin(Date.now() / 120) * 1.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            if (p.gemType) {
                ctx.save();
                // Glowing outer ring
                ctx.strokeStyle = p.gemType === 'ruby' ? '#f43f5e' : (p.gemType === 'emerald' ? '#10b981' : '#38bdf8');
                ctx.lineWidth = 1.5;
                if (!isLowQuality) {
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = ctx.strokeStyle;
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, this.pegRadius + 1.5, 0, Math.PI * 2);
                ctx.stroke();

                if (p.gemType === 'ruby') {
                    // Draw a ruby vector crystal! (Octagonal or diamond-shaped)
                    ctx.fillStyle = '#ef4444';
                    ctx.strokeStyle = '#fee2e2';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y - 7);
                    ctx.lineTo(p.x + 5, p.y - 3);
                    ctx.lineTo(p.x + 5, p.y + 3);
                    ctx.lineTo(p.x, p.y + 7);
                    ctx.lineTo(p.x - 5, p.y + 3);
                    ctx.lineTo(p.x - 5, p.y - 3);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Tiny highlight
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(p.x - 1.5, p.y - 2, 1, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.gemType === 'emerald') {
                    // Draw an emerald vector crystal! (Hexagon or oblong diamond)
                    ctx.fillStyle = '#10b981';
                    ctx.strokeStyle = '#d1fae5';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p.x - 5, p.y - 4);
                    ctx.lineTo(p.x + 5, p.y - 4);
                    ctx.lineTo(p.x + 7, p.y);
                    ctx.lineTo(p.x + 5, p.y + 4);
                    ctx.lineTo(p.x - 5, p.y + 4);
                    ctx.lineTo(p.x - 7, p.y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Highlight
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(p.x - 2, p.y - 1.5, 1, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.gemType === 'diamond') {
                    // Draw a diamond vector shape!
                    ctx.fillStyle = '#06b6d4';
                    ctx.strokeStyle = '#ecfeff';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y - 7);
                    ctx.lineTo(p.x + 5, p.y);
                    ctx.lineTo(p.x, p.y + 7);
                    ctx.lineTo(p.x - 5, p.y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Draw charge indicators around or on the diamond!
                    const hits = p.diamondHits || 0;
                    if (hits > 0) {
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 8px system-ui';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(hits.toString(), p.x, p.y + 1);
                    } else {
                        // Diamond highlight
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(p.x - 1.5, p.y - 2, 1, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                
                // Overlay preloaded HTMLImageElement if they exist and are loaded (not 1x1 transparent)
                const gemImg = assets.get(`${p.gemType}_gem` as any);
                if (gemImg && gemImg.src && !gemImg.src.startsWith('data:')) {
                    try {
                        ctx.drawImage(gemImg, p.x - 8, p.y - 8, 16, 16);
                    } catch (e) {
                        // safe
                    }
                }
                ctx.restore();
            }
        });

        // Draw Visual Effects
        for (let i = visualEffects.length - 1; i >= 0; i--) {
            const e = visualEffects[i];
            const elapsed = performance.now() - e.t;
            if (elapsed > e.duration) {
                // Should be cleaned up by engine, but for rendering we just skip or clamp
                continue;
            }
            const pct = elapsed / e.duration;
            const alpha = 1 - pct;

            if (e.type === 'micro_spawn') {
                const r = 2 + pct * 36;
                ctx.save();
                ctx.beginPath();
                ctx.lineWidth = Math.max(1, 4 * (1 - pct));
                ctx.strokeStyle = `rgba(100,220,255,${0.9 * alpha})`;
                ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else if (e.type === 'explosion') {
                const r = pct * 150;
                ctx.save();
                
                // Outer shockwave distortion ring (fast, bright neon cyan/blue)
                ctx.beginPath();
                ctx.lineWidth = 4 + 10 * (1 - pct);
                ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
                if (allowLightShadows) {
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = 'rgba(56, 189, 248, 1)';
                }
                ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
                ctx.stroke();
                
                if (!isLowQuality) {
                    // Secondary intense white/blue sharp expansion wave
                    ctx.beginPath();
                    ctx.lineWidth = 1.5 + 4 * (1 - pct);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
                    if (allowLightShadows) {
                        ctx.shadowBlur = 5;
                        ctx.shadowColor = '#ffffff';
                    }
                    ctx.arc(e.x, e.y, r * 0.9, 0, Math.PI * 2);
                    ctx.stroke();

                    // Inner radial energy expanding core
                    ctx.beginPath();
                    const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 0.75);
                    grad.addColorStop(0, `rgba(251, 113, 133, 0)`);
                    grad.addColorStop(0.3, `rgba(244, 63, 94, ${alpha * 0.35})`);
                    grad.addColorStop(1, `rgba(56, 189, 248, ${alpha * 0.15})`);
                    ctx.fillStyle = grad;
                    ctx.arc(e.x, e.y, r * 0.85, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                ctx.restore();
            } else if (e.type === 'critical_hit') {
                const scale = 5 + (pct * 25);
                
                ctx.save();
                ctx.translate(e.x, e.y);
                if (!isLowQuality) {
                    ctx.rotate(pct * 2); // Rotate as it expands
                }
                
                // Draw Star
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                for (let j = 0; j < 5; j++) {
                    ctx.lineTo(Math.cos((18 + j * 72) * Math.PI / 180) * scale, 
                               Math.sin((18 + j * 72) * Math.PI / 180) * scale);
                    ctx.lineTo(Math.cos((54 + j * 72) * Math.PI / 180) * (scale * 0.4), 
                               Math.sin((54 + j * 72) * Math.PI / 180) * (scale * 0.4));
                }
                ctx.closePath();
                ctx.fill();
                
                // Draw Shockwave
                ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
                ctx.lineWidth = 2 * (1-pct);
                ctx.beginPath();
                ctx.arc(0, 0, scale * 0.8, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.restore();
            }
        }

        // Draw Master Aura Pass (Always in High Quality, throttled in Medium)
        if (isHighQuality || (isMediumQuality && totalBalls < 20)) {
            balls.forEach(b => {
                if (b.master) {
                    const time = performance.now();
                    const hue = (time / 15) % 360; 
                    const visualRadius = 8;
                    const auraR = visualRadius * 10; 
                    
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter'; 
                    
                    const g = ctx.createRadialGradient(b.x, b.y, visualRadius, b.x, b.y, auraR);
                    g.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.6)`);
                    g.addColorStop(0.4, `hsla(${(hue+60)%360}, 100%, 50%, 0.3)`);
                    g.addColorStop(1, 'rgba(0,0,0,0)');
                    
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, auraR, 0, Math.PI*2);
                    ctx.fill();
                    
                    ctx.restore();
                }
            });
        }

        // Draw Balls with dynamic trail & shadow throttling
        const maxTrailPoints = isLowQuality ? 0 : (isMediumQuality ? 3 : 8);

        balls.forEach(b => {
            const visualRadius = b.master ? 8 : b.radius;

            // Draw Trails
            if (!isLowQuality && maxTrailPoints > 0 && b.trail.length > 0) {
                const startIdx = Math.max(0, b.trail.length - maxTrailPoints);
                const count = b.trail.length - startIdx;
                for(let i = startIdx; i < b.trail.length; i++) {
                    const pt = b.trail[i];
                    const relIdx = i - startIdx;
                    const tAlpha = (relIdx / count) * (b.master ? 0.75 : 0.45);
                    const tRadius = Math.max(0.6, visualRadius * (relIdx / count));
                    
                    let trailCol = 'rgba(255,255,255,1)';
                    if (b.master) {
                        const hue = (performance.now() / 10 + i * 12) % 360;
                        trailCol = `hsla(${hue}, 85%, 60%, 1)`;
                    } else if (b.micro) {
                        trailCol = '#b200ff';
                    } else if (b.type === 'legendary') {
                        trailCol = '#39ff14';
                    } else if (b.type === 'rare') {
                        trailCol = '#ff2e2e';
                    } else if (b.type === 'uncommon') {
                        trailCol = '#00f5ff';
                    }

                    ctx.globalAlpha = tAlpha;
                    ctx.fillStyle = trailCol;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, tRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1.0;
            }

            if (b.master && state.activeMarbleTexture && state.activeMarbleTexture !== 'null') {
                const tex = state.activeMarbleTexture;
                let img = this.textureCache.get(tex);
                if (!img) {
                    img = new Image();
                    this.textureCache.set(tex, img);
                    const cleanPath = tex.startsWith('images/') ? tex : `images/${tex}`;
                    img.src = cleanPath;
                }
                
                if (img.complete && img.naturalWidth) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, visualRadius, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.translate(b.x, b.y);
                    const angle = Math.atan2(b.vy, b.vx);
                    ctx.rotate(angle);
                    const size = visualRadius * 2;
                    ctx.drawImage(img, -size/2, -size/2, size, size);
                    ctx.restore();
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, visualRadius, 0, Math.PI*2);
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else {
                    this.drawMasterRainbow(ctx, b.x, b.y, visualRadius, allowHeavyShadows);
                }
            } else if (b.master) {
                this.drawMasterRainbow(ctx, b.x, b.y, visualRadius, allowHeavyShadows);
            } else {
                ctx.beginPath();
                ctx.arc(b.x, b.y, visualRadius, 0, Math.PI * 2);
                let color = '#fff';
                if (b.micro) color = '#b200ff';
                else if (b.type === 'legendary') color = '#39ff14';
                else if (b.type === 'rare') color = '#ff2e2e';
                else if (b.type === 'uncommon') color = '#00f5ff';
                
                ctx.fillStyle = color;
                if (allowHeavyShadows && (b.type === 'legendary' || b.type === 'rare')) {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 8;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                } else {
                    ctx.fill();
                }
            }

            if (b.mergeCount && b.mergeCount > 1) {
                ctx.save();
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(b.x, b.y, visualRadius + 2.5, 0, Math.PI * 2);
                ctx.stroke();

                if (b.mergeCount >= 2 && !b.micro) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '900 8px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(`x${b.mergeCount}`, b.x, b.y - visualRadius - 2);
                }
                ctx.restore();
            }
        });
        
        // Draw Fancy Baskets with strong neon glow
        const basketColors = ['#a55eea', '#f7b731', '#26de81', '#f7b731', '#a55eea'];
        const baseValues = [10, 5, 20, 5, 10];
        const basketW = width / 5;
        const basketH = 35; // Visual height
        
        const stats = PhysicsManager.getEffectiveStats(state);
        const marbleCountMult = Math.max(1, stats.upgrades.extraBall * 0.75);
        const totalIncomePercent = (stats.permanentIncomeBoostPercent || 0) + (stats.derivedIncomeBoostPercent || 0);
        const permIncomeMult = 1 + (totalIncomePercent / 100);
        let displayMult = marbleCountMult * permIncomeMult;

        const isMarbleSociety = state.gameMode === 'adventure' && PhysicsManager.getActiveAdventureGimmick(state) === 'marble_society';
        if (isMarbleSociety) {
            displayMult *= 1.5; // +50% extra gimmick on Board 9 High Society
        }

        const isAntiGravity = state.inChallengeMode && state.challengeState?.challengeId === 'anti_gravity';

        for(let i=0; i<5; i++) {
            const bx = i * basketW;
            const by = height - basketH;
            const col = isAntiGravity ? '#fd79a8' : (isMarbleSociety ? '#eab308' : basketColors[i]);
            
            ctx.save();
            
            if (isAntiGravity) {
                // Strong Pink Neon Glow
                if (!isLowQuality) {
                    ctx.shadowBlur = 40;
                    ctx.shadowColor = '#fd79a8';
                }
                
                const cx = bx + basketW / 2;
                const cy = by + basketH / 2;
                const rx = basketW / 2 - 12;
                const ry = 8;
                
                ctx.fillStyle = 'rgba(253, 121, 168, 0.25)';
                ctx.strokeStyle = '#fd79a8';
                ctx.lineWidth = 4;
                
                ctx.beginPath();
                const x1 = cx - rx;
                const x2 = cx + rx;
                const y1 = cy - ry;
                const y2 = cy + ry;
                ctx.arc(x1, cy, ry, Math.PI * 0.5, Math.PI * 1.5);
                ctx.lineTo(x2, y1);
                ctx.arc(x2, cy, ry, Math.PI * 1.5, Math.PI * 0.5);
                ctx.lineTo(x1, y2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Capsule shining light core
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(x1 + 2, cy - ry + 3, 2, Math.PI, Math.PI * 1.5);
                ctx.lineTo(x2 - 2, cy - ry + 1);
                ctx.stroke();
                
                // Text label
                ctx.fillStyle = '#fff';
                ctx.font = '900 11px font-mono, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (!isLowQuality) {
                    ctx.shadowColor = 'rgba(0,0,0,0.8)';
                    ctx.shadowBlur = 4;
                }
                ctx.fillText(`BOUNCE`, cx, cy + 1);
            } else {
                // Strong Neon Glow
                if (!isLowQuality) {
                    ctx.shadowBlur = isMarbleSociety ? 35 : 30; // Increased blur
                    ctx.shadowColor = col;
                }
                
                // Background with Gradient
                const bgGrad = ctx.createLinearGradient(bx, by, bx, height);
                bgGrad.addColorStop(0, col); // Solid at top
                bgGrad.addColorStop(1, isMarbleSociety ? 'rgba(234, 179, 8, 0.2)' : 'rgba(0,0,0,0.2)'); // Fade to dark
                
                ctx.fillStyle = bgGrad;
                ctx.globalAlpha = isMarbleSociety ? 0.45 : 0.3;
                // Draw shape with rounded top
                ctx.beginPath();
                ctx.moveTo(bx + 4, by);
                ctx.lineTo(bx + basketW - 4, by);
                ctx.lineTo(bx + basketW - 4, height);
                ctx.lineTo(bx + 4, height);
                ctx.closePath();
                ctx.fill();
                
                ctx.globalAlpha = 1.0;
                
                // Bright Top Line (The "Lip")
                ctx.strokeStyle = col;
                ctx.lineWidth = isMarbleSociety ? 4 : 3;
                ctx.beginPath();
                ctx.moveTo(bx + 4, by);
                ctx.lineTo(bx + basketW - 4, by);
                ctx.stroke();
                
                const isSandPegMode = state.inChallengeMode && state.challengeState?.challengeId === 'sand_peg';
                if (!isSandPegMode) {
                    // Text
                    const val = (baseValues[i] + stats.basketValueBonus) * displayMult;
                    ctx.fillStyle = isMarbleSociety ? '#fef08a' : '#fff';
                    ctx.font = isMarbleSociety ? '900 13px "Segoe UI", Roboto, sans-serif' : '800 13px "Segoe UI", Roboto, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    if (!isLowQuality) {
                        ctx.shadowColor = isMarbleSociety ? 'rgba(234, 179, 8, 0.6)' : 'rgba(0,0,0,0.8)';
                        ctx.shadowBlur = isMarbleSociety ? 6 : 4;
                    }
                    
                    let txt = formatNumber(val);
                    ctx.fillText(`$${txt}`, bx + basketW/2, by + basketH/2 + 2);
                }
            }
            
            ctx.restore();
        }

        const now = performance.now();
        // NOTE: Popups are filtered in Engine update, here we just draw active ones
        popups.forEach(p => {
            if (now - p.t > 1000) return;
            const age = (now - p.t) / 1000;
            const yOff = age * 50;
            const alpha = 1 - age;
            
            if (p.master) {
                const hue = (now / 5) % 360;
                ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
                ctx.font = '900 20px Arial';
            } else if (p.micro) {
                ctx.fillStyle = `rgba(178, 0, 255, ${alpha})`;
                ctx.font = 'bold 16px Arial';
            } else {
                ctx.fillStyle = p.critical ? `rgba(255, 250, 122, ${alpha})` : `rgba(255, 215, 0, ${alpha})`;
                ctx.font = p.critical ? 'bold 24px Arial' : 'bold 16px Arial';
            }
            
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y - yOff);
        });

        // Draw Bonus Marble
        if (state.bonusMarble && state.bonusMarble.active) {
            const bm = state.bonusMarble;
            ctx.save();
            ctx.translate(bm.x, bm.y);
            
            const bonusImage = assets.get('bonus');
            
            if (bonusImage && bonusImage.complete && bonusImage.naturalWidth > 0) {
                const aspectRatio = bonusImage.naturalWidth / bonusImage.naturalHeight;
                const drawW = 75; // Increased size
                const drawH = drawW / aspectRatio;
                if (!isLowQuality) {
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
                }
                ctx.drawImage(bonusImage, -drawW/2, -drawH/2, drawW, drawH);
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = '#ff6b6b';
                ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.fill();
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.ellipse(-20, 0, 16, 8, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(20, 0, 16, 8, 0, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        }

        // Draw Golden Bonus Marble
        if (state.goldenBonusMarble && state.goldenBonusMarble.active) {
            const gbm = state.goldenBonusMarble;
            ctx.save();
            ctx.translate(gbm.x, gbm.y);

            const bonusImage = assets.get('bonus');
            const pulse = 1 + Math.sin(gbm.t * 3.5) * 0.12;

            if (!isLowQuality) {
                // Golden Aura Pulse Effect
                const auraGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 50 * pulse);
                auraGrad.addColorStop(0, 'rgba(255, 223, 0, 0.75)');
                auraGrad.addColorStop(0.5, 'rgba(255, 175, 0, 0.35)');
                auraGrad.addColorStop(1, 'rgba(255, 140, 0, 0)');
                
                ctx.fillStyle = auraGrad;
                ctx.beginPath();
                ctx.arc(0, 0, 50 * pulse, 0, Math.PI * 2);
                ctx.fill();

                // Sparkle Particles around the Golden Marble
                for (let i = 0; i < 4; i++) {
                    const angle = gbm.t * 2 + (i * Math.PI / 2);
                    const r = 36 + Math.sin(gbm.t * 3 + i) * 8;
                    const sx = Math.cos(angle) * r;
                    const sy = Math.sin(angle) * r;
                    ctx.fillStyle = '#fff9c4';
                    ctx.beginPath();
                    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            if (bonusImage && bonusImage.complete && bonusImage.naturalWidth > 0) {
                const aspectRatio = bonusImage.naturalWidth / bonusImage.naturalHeight;
                const drawW = 85 * pulse;
                const drawH = drawW / aspectRatio;

                if (isHighQuality) {
                    ctx.shadowBlur = 28;
                    ctx.shadowColor = '#ffd700';
                    ctx.filter = 'drop-shadow(0px 0px 8px #ffd700) sepia(100%) saturate(450%) hue-rotate(8deg) brightness(1.25)';
                } else if (allowLightShadows) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = '#ffd700';
                }
                ctx.drawImage(bonusImage, -drawW/2, -drawH/2, drawW, drawH);
                if (isHighQuality) {
                    ctx.filter = 'none';
                }
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = '#ffd700';
                ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
            }

            // Label "⭐ GOLDEN BONUS ⭐" below marble
            ctx.font = '900 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffe082';
            if (!isLowQuality) {
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 5;
            }
            ctx.fillText('⭐ GOLDEN BONUS ⭐', 0, 42);

            ctx.restore();
        }

        // Render Sand Particles
        if (sandParticles && sandParticles.length > 0) {
            ctx.save();
            sandParticles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        // Render Paused Badge Overlay
        if (isPaused) {
            ctx.save();
            const badgeW = 140;
            const badgeH = 30;
            const bx = (width - badgeW) / 2;
            const by = 16;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
            ctx.lineWidth = 1.5;
            
            ctx.beginPath();
            if ((ctx as any).roundRect) {
                (ctx as any).roundRect(bx, by, badgeW, badgeH, 15);
            } else {
                ctx.rect(bx, by, badgeW, badgeH);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f59e0b';
            ctx.font = '800 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⏸ PHYSICS PAUSED', width / 2, by + badgeH / 2);
            ctx.restore();
        }

        // Render FPS Badge Overlay
        if (state.showFps) {
            ctx.save();
            const fpsValue = fps ?? 60;
            const text = `${fpsValue} FPS`;
            const badgeW = 60;
            const badgeH = 22;
            const bx = width - badgeW - 10;
            const by = 12;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;

            ctx.beginPath();
            if ((ctx as any).roundRect) {
                (ctx as any).roundRect(bx, by, badgeW, badgeH, 11);
            } else {
                ctx.rect(bx, by, badgeW, badgeH);
            }
            ctx.fill();
            ctx.stroke();

            // FPS Color: Green >= 55, Amber >= 30, Red < 30
            let fpsColor = '#10b981';
            if (fpsValue < 30) fpsColor = '#ef4444';
            else if (fpsValue < 55) fpsColor = '#f59e0b';

            ctx.fillStyle = fpsColor;
            ctx.font = '800 11px monospace, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, bx + badgeW / 2, by + badgeH / 2 + 1);
            ctx.restore();
        }
    }

    private drawMasterRainbow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, allowShadow: boolean = false) {
        const hue = (performance.now() / 20) % 360;
        const grad = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, r);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.5, `hsl(${hue}, 100%, 50%)`);
        grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 100%, 40%)`);
        ctx.fillStyle = grad;
        if (allowShadow) {
            ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
            ctx.shadowBlur = 12;
        }
        ctx.beginPath(); 
        ctx.arc(x, y, r, 0, Math.PI * 2); 
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
