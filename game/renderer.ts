
import { GameState, Ball, Peg, Popup, VisualEffect } from './types';
import { assets } from './assets';
import { formatNumber } from './utils';

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
        popups: Popup[]
    ) {
        ctx.clearRect(0, 0, width, height);
        
        // Faint Tech Grid Background
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let gx=0; gx<=width; gx+=40) { ctx.moveTo(gx, 0); ctx.lineTo(gx, height); }
        for(let gy=0; gy<=height; gy+=40) { ctx.moveTo(0, gy); ctx.lineTo(width, gy); }
        ctx.stroke();
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
            ctx.beginPath();
            // Spherical gradient
            const grad = ctx.createRadialGradient(p.x - 2, p.y - 2, 1, p.x, p.y, this.pegRadius);
            
            if (p.glow > 0) {
                // Active Glow (Gold burst)
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ffd700';
                grad.addColorStop(0, '#fff');
                grad.addColorStop(0.2, '#fff7cc');
                grad.addColorStop(1, '#ffab00');
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
        
        const marbleCountMult = Math.max(1, (state.upgrades.extraBall) * 0.75); // Removed 1+
        const totalIncomePercent = (state.permanentIncomeBoostPercent || 0) + (state.derivedIncomeBoostPercent || 0);
        const permIncomeMult = 1 + (totalIncomePercent / 100);
        const displayMult = marbleCountMult * permIncomeMult;

        for(let i=0; i<5; i++) {
            const bx = i * basketW;
            const by = height - basketH;
            const col = basketColors[i];
            
            ctx.save();
            
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
            
            // Text
            const val = (baseValues[i] + state.basketValueBonus) * displayMult;
            ctx.fillStyle = '#fff';
            ctx.font = '800 13px "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            
            let txt = formatNumber(val);
            ctx.fillText(`$${txt}`, bx + basketW/2, by + basketH/2 + 2);
            
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
