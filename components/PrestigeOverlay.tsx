
import React, { useEffect, useRef } from 'react';
import { engine } from '../game/engine';

export const PrestigeOverlay = ({ onComplete }: { onComplete: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Snapshot marbles immediately to preserve their types/colors
    const marblesSnapshot = useRef(engine.balls.map(b => ({
        ...b,
        // Ensure valid props for animation if snapshot happened mid-frame
        x: b.x || 200,
        y: b.y || 300,
        // Colors mapping
        color: b.master ? 'rainbow' : 
               b.micro ? '#b200ff' : 
               b.type === 'legendary' ? '#39ff14' : 
               b.type === 'rare' ? '#ff2e2e' : 
               b.type === 'uncommon' ? '#00f5ff' : '#fff'
    }))).current;

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        if (!ctx) return;

        cvs.width = window.innerWidth;
        cvs.height = window.innerHeight;

        // Pause Physics Engine & Mute Music
        const wasRunning = engine.running;
        const previousMusicVol = engine.state.musicVolume;
        
        engine.running = false; // Stop physics updates
        engine.audio.setMusicVolume(0); // Mute music for prestige SFX

        // Re-center balls for the start of animation relative to screen center
        const centerX = cvs.width / 2;
        const centerY = cvs.height / 2;
        
        // --- CHAOTIC SETUP ---
        const total = marblesSnapshot.length;
        // Create an array of indices [0, 1, 2, ... N]
        const indices = Array.from({length: total}, (_, i) => i);
        // Fisher-Yates shuffle to randomize the "suck order"
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        const animBalls = marblesSnapshot.map((b, i) => {
            const orderPos = indices[i];
            return {
                ...b,
                x: centerX + (Math.random() - 0.5) * 300,
                y: centerY + (Math.random() - 0.5) * 400,
                radius: b.radius || 6,
                
                // Chaos factors
                // Random spin direction and speed multiplier
                speedVar: (Math.random() < 0.5 ? 1 : -1) * (1.5 + Math.random() * 2), 
                phaseOffset: Math.random() * Math.PI * 2,
                
                // Suction Timing:
                // Spread the start times over the first 1.5s of the 2.5s vortex phase
                suctionDelay: (orderPos / Math.max(1, total)) * 1.5,
                
                // How fast it zips to center once started (0.3s - 0.5s)
                suctionDuration: 0.3 + Math.random() * 0.2
            };
        });
        
        let start = performance.now();
        let phase = 'expand'; // expand -> hold -> vortex -> fade
        
        engine.audio.play('prestige1'); // Start sound

        let rAF = 0;

        const loop = () => {
            const now = performance.now();
            const dt = (now - start) / 1000;
            const globalTime = now * 0.002;
            
            // Clear
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            
            // Background Dim
            ctx.fillStyle = `rgba(0,0,0,${Math.min(0.8, dt * 0.5)})`;
            ctx.fillRect(0,0,cvs.width, cvs.height);
            
            if (phase === 'expand') {
                const progress = Math.min(1, dt / 1.5);
                animBalls.forEach((b, i) => {
                    const angle = (i / animBalls.length) * Math.PI * 2;
                    // Spiraling out target with Wave Motion
                    const waveOffset = Math.sin(globalTime * 3 + i * 0.5) * 20;
                    const targetR = 250 + waveOffset;
                    
                    const r = targetR * (1 - Math.pow(1 - progress, 2)); // Ease out
                    
                    // Orbit
                    b.x = centerX + Math.cos(angle + globalTime) * r;
                    b.y = centerY + Math.sin(angle + globalTime) * r;
                });
                
                if (progress >= 1) {
                    phase = 'hold';
                    start = now;
                }
            } else if (phase === 'hold') {
                // Continuous Wave Float
                animBalls.forEach((b, i) => {
                    const angle = (i / animBalls.length) * Math.PI * 2 + globalTime;
                    const waveOffset = Math.sin(globalTime * 3 + i * 0.5) * 20;
                    const r = 250 + waveOffset;
                    
                    b.x = centerX + Math.cos(angle) * r;
                    b.y = centerY + Math.sin(angle) * r;
                });

                if (dt > 1.0) { // Slightly longer hold to appreciate the wave
                    phase = 'vortex';
                    start = now;
                    engine.audio.play('prestige2'); // Vortex sound
                }
            } else if (phase === 'vortex') {
                const duration = 2.5; // Longer phase to allow staggered intake
                const progress = Math.min(1, dt / duration);
                
                // Draw vortex bg
                const hue = (now / 20) % 360;
                const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 600);
                grad.addColorStop(0, 'white');
                grad.addColorStop(0.1, `hsl(${hue}, 100%, 50%)`);
                grad.addColorStop(0.4, 'transparent');
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(centerX, centerY, 600 * (1-progress*0.5), 0, Math.PI*2); ctx.fill();
                ctx.globalCompositeOperation = 'source-over';

                animBalls.forEach((b, i) => {
                    // 1. Extreme Spin
                    // Base rotation + Time-based acceleration + Random SpeedVar
                    const spinSpeed = 2 + (dt * 8 * Math.abs(b.speedVar));
                    const angle = (i / animBalls.length) * Math.PI * 2 + (now * 0.001 * spinSpeed * Math.sign(b.speedVar));

                    // 2. Staggered Suction Logic
                    let r = 250;
                    
                    if (dt > b.suctionDelay) {
                        // Suction has started for this ball
                        const suckT = (dt - b.suctionDelay) / b.suctionDuration;
                        const suckProgress = Math.min(1, Math.max(0, suckT));
                        
                        // Cubic In easing for "SHOOP" effect
                        const suction = Math.pow(suckProgress, 3);
                        r = 250 * (1 - suction);
                    } else {
                        // Waiting to be sucked in, keep waving
                        const waveOffset = Math.sin(globalTime * 10 + i * 0.5) * 10;
                        r = 250 + waveOffset;
                    }

                    b.x = centerX + Math.cos(angle) * r;
                    b.y = centerY + Math.sin(angle) * r;
                });
                
                if (progress >= 1) {
                    phase = 'fade';
                    start = now;
                }
            } else if (phase === 'fade') {
                const progress = Math.min(1, dt / 0.5);
                ctx.fillStyle = `rgba(0,0,0,${progress})`;
                ctx.fillRect(0,0,cvs.width, cvs.height);
                if (progress >= 1) {
                    // Restore state before calling complete
                    engine.running = wasRunning; 
                    engine.audio.setMusicVolume(previousMusicVol);
                    onComplete();
                    cancelAnimationFrame(rAF);
                    return; 
                }
            }

            // Draw Balls with correct colors
            animBalls.forEach(b => {
                if (b.color === 'rainbow') {
                    const hue = (now / 5 + b.id * 10) % 360;
                    ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
                    ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                    ctx.shadowBlur = 15;
                } else {
                    ctx.fillStyle = b.color;
                    ctx.shadowColor = b.color;
                    ctx.shadowBlur = 10;
                }
                
                ctx.beginPath(); 
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2); 
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            rAF = requestAnimationFrame(loop);
        };
        rAF = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(rAF);
            // Safety restore in case component unmounts unexpectedly
            engine.running = true; 
            engine.audio.setMusicVolume(previousMusicVol);
        };
        
    }, []);

    return <canvas ref={canvasRef} style={{position:'fixed', inset:0, zIndex:10000}} />;
};
