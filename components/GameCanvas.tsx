import React, { useEffect, useRef } from 'react';
import { engine } from '../game/engine';
import { formatNumber } from '../game/utils';

export const GameCanvas = ({ inChallengeMode }: { inChallengeMode?: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current) {
            engine.attachCanvas(canvasRef.current);
        }
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleInputAt = (clientX: number, clientY: number) => {
            const rect = canvas.getBoundingClientRect();
            const x = (clientX - rect.left) * (engine.width / rect.width);
            const y = (clientY - rect.top) * (engine.height / rect.height);
            
            // Check Peg Socket Interaction first
            if (engine.socketingActive) {
                const pegIdx = engine.findClosestPegIndex(x, y, 22);
                if (pegIdx !== null) {
                    window.dispatchEvent(new CustomEvent('peg-socket-selected', { detail: { index: pegIdx } }));
                    return true; // Block ball spawn
                }
            }
            
            // Check Bonus Marble Hit
            let bonusHit = false;
            if (engine.state.bonusMarble?.active) {
                const amount = engine.clickBonusMarble(x, y);
                if (amount > 0) {
                    bonusHit = true;
                    const inSandPeg = engine.state.inChallengeMode && engine.state.challengeState?.challengeId === 'sand_peg';
                    const popupText = inSandPeg ? `+${formatNumber(amount)} Peg${amount !== 1 ? 's' : ''}` : `+$${formatNumber(amount)}`;
                    window.dispatchEvent(new CustomEvent('spawn-floating-text', {
                        detail: { 
                            x: clientX, 
                            y: clientY, 
                            text: popupText,
                            type: 'bonus'
                        }
                    }));
                }
            }
            
            // Only spawn micro marble if we didn't just click the bonus marble
            if (!bonusHit) {
                engine.spawnMicroMarble(x, y);

                // Short tactile haptic vibration feedback response for mobile/haptic-ready devices
                if (typeof navigator !== 'undefined' && navigator.vibrate && !engine.state.hapticsDisabled) {
                    try {
                        navigator.vibrate(12);
                    } catch (err) {
                        // Safe catch-all for potential iframe or permission blocks
                    }
                }
            }
            return false;
        };

        // Handled via native pointerdown for touch/pen so multiple fingers work on mobile,
        // and native mousedown for mouse clicking on desktops so holding one button doesn't suppress clicks on other buttons.
        const onPointerDownNative = (e: PointerEvent) => {
            if (e.pointerType === 'mouse') {
                return; // Mouse clicks are handled of by mousedown for multi-button support
            }
            e.preventDefault();
            handleInputAt(e.clientX, e.clientY);
        };

        const onMouseDownNative = (e: MouseEvent) => {
            e.preventDefault();
            handleInputAt(e.clientX, e.clientY);
        };

        const onContextMenuNative = (e: MouseEvent) => {
            e.preventDefault();
        };

        canvas.addEventListener('pointerdown', onPointerDownNative, { passive: false });
        canvas.addEventListener('mousedown', onMouseDownNative, { passive: false });
        canvas.addEventListener('contextmenu', onContextMenuNative);

        return () => {
            canvas.removeEventListener('pointerdown', onPointerDownNative);
            canvas.removeEventListener('mousedown', onMouseDownNative);
            canvas.removeEventListener('contextmenu', onContextMenuNative);
        };
    }, []);

    return (
        <canvas 
            id="game-canvas"
            ref={canvasRef} 
            width={400} 
            height={600} 
            className={inChallengeMode ? 'challenge-board' : ''}
            style={{ touchAction: 'none' }}
        />
    );
};