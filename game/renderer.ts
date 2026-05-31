
import { GameState, Ball, Peg, Popup, VisualEffect, SandParticle } from './types';
import { assets } from './assets';
import { formatNumber } from './utils';
import { PhysicsManager } from './physics';

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
        socketingActive?: boolean
    ) {
        ctx.clearRect(0, 0, width, height);
        
        // Faint Tech Grid Background
        ctx.save();
        if (state.inChallengeMode) {
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
        ctx.restore();
        
        // Draw Pegs with 3D spherical look + neon hit glow
        pegs.forEach(p => {
            const isSandPeg = state.inChallengeMode && state.challengeState?.challengeId === 'sand_peg';

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
            
            if (isSandPeg) {
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
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = hpColor;
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
                ctx.shadowBlur = 15;
                let glowColor = '#ffd700'; // Default gold
                let startCol = '#fff';
                let midCol = '#fff7cc';
                let endCol = '#ffab00';
                
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
                
                ctx.shadowColor = glowColor;
                grad.addColorStop(0, startCol);
                grad.addColorStop(0.2, midCol);
                grad.addColorStop(1, endCol);
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
                ctx.shadowBlur = 8;
                ctx.shadowColor = ctx.strokeStyle;
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
                ctx.shadowBlur = 15;
                ctx.shadowColor = 'rgba(56, 189, 248, 1)';
                ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
                ctx.stroke();
                
                // Secondary intense white/blue sharp expansion wave
                ctx.beginPath();
                ctx.lineWidth = 1.5 + 4 * (1 - pct);
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#ffffff';
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
                
                ctx.restore();
            } else if (e.type === 'critical_hit') {
                const scale = 5 + (pct * 25);
                
                ctx.save();
                ctx.translate(e.x, e.y);
                ctx.rotate(pct * 2); // Rotate as it expands
                
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

        // Draw Master Aura Pass (Before other balls to be in background but over board)
        balls.forEach(b => {
            if (b.master) {
                const time = performance.now();
                const hue = (time / 15) % 360; 
                // Using hardcoded visual radius 8 for aura calculation
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

        // Draw Balls
        balls.forEach(b => {
            // Visual size override for Master Marble (8) vs Physics size (6)
            const visualRadius = b.master ? 8 : b.radius;

            // Draw Trails as fading circles (Legacy Style)
            if (b.trail.length > 0) {
                for(let i=0; i<b.trail.length; i++) {
                    const pt = b.trail[i];
                    // Alpha increases for newer points
                    const tAlpha = (i / b.trail.length) * (b.master ? 0.75 : 0.45);
                    const tRadius = Math.max(0.6, visualRadius * (i / b.trail.length));
                    
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
                    // Set to cache immediately so we don't spam fetch
                    this.textureCache.set(tex, img);
                    
                    fetch(`images/${tex}`)
                        .then(response => {
                            if(response.ok) return response.blob();
                            throw new Error('Network response was not ok.');
                        })
                        .then(blob => {
                            const objectURL = URL.createObjectURL(blob);
                            img!.src = objectURL;
                        })
                        .catch(e => {
                            console.error('Texture load failed:', tex, e);
                        });
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
                    this.drawMasterRainbow(ctx, b.x, b.y, visualRadius);
                }
            } else if (b.master) {
                this.drawMasterRainbow(ctx, b.x, b.y, visualRadius);
            } else {
                ctx.beginPath();
                ctx.arc(b.x, b.y, visualRadius, 0, Math.PI * 2);
                let color = '#fff';
                if (b.micro) color = '#b200ff';
                else if (b.type === 'legendary') color = '#39ff14';
                else if (b.type === 'rare') color = '#ff2e2e';
                else if (b.type === 'uncommon') color = '#00f5ff';
                
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
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
        const displayMult = marbleCountMult * permIncomeMult;

        const isAntiGravity = state.inChallengeMode && state.challengeState?.challengeId === 'anti_gravity';

        for(let i=0; i<5; i++) {
            const bx = i * basketW;
            const by = height - basketH;
            const col = isAntiGravity ? '#fd79a8' : basketColors[i];
            
            ctx.save();
            
            if (isAntiGravity) {
                // Strong Pink Neon Glow
                ctx.shadowBlur = 40;
                ctx.shadowColor = '#fd79a8';
                
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
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 4;
                ctx.fillText(`BOUNCE`, cx, cy + 1);
            } else {
                // Strong Neon Glow
                ctx.shadowBlur = 30; // Increased blur
                ctx.shadowColor = col;
                
                // Background with Gradient
                const bgGrad = ctx.createLinearGradient(bx, by, bx, height);
                bgGrad.addColorStop(0, col); // Solid at top
                bgGrad.addColorStop(1, 'rgba(0,0,0,0.2)'); // Fade to dark
                
                ctx.fillStyle = bgGrad;
                ctx.globalAlpha = 0.3;
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
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(bx + 4, by);
                ctx.lineTo(bx + basketW - 4, by);
                ctx.stroke();
                
                const isSandPegMode = state.inChallengeMode && state.challengeState?.challengeId === 'sand_peg';
                if (!isSandPegMode) {
                    // Text
                    const val = (baseValues[i] + stats.basketValueBonus) * displayMult;
                    ctx.fillStyle = '#fff';
                    ctx.font = '800 13px "Segoe UI", Roboto, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.shadowColor = 'rgba(0,0,0,0.8)';
                    ctx.shadowBlur = 4;
                    
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
                ctx.shadowBlur = 20;
                ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
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
    }

    private drawMasterRainbow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
        const hue = (performance.now() / 20) % 360;
        const grad = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, r);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.5, `hsl(${hue}, 100%, 50%)`);
        grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 100%, 40%)`);
        ctx.fillStyle = grad;
        ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
        ctx.shadowBlur = 15;
        ctx.beginPath(); 
        ctx.arc(x, y, r, 0, Math.PI * 2); 
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
