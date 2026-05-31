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

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const x = (e.clientX - rect.left) * (engine.width / rect.width);
            const y = (e.clientY - rect.top) * (engine.height / rect.height);
            
            // Check Peg Socket Interaction first
            if (engine.socketingActive) {
                const pegIdx = engine.findClosestPegIndex(x, y, 22);
                if (pegIdx !== null) {
                    window.dispatchEvent(new CustomEvent('peg-socket-selected', { detail: { index: pegIdx } }));
                    return; // Block ball spawn
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
                            x: e.clientX, 
                            y: e.clientY, 
                            text: popupText,
                            type: 'bonus'
                        }
                    }));
                }
            }
            
            // Only spawn micro marble if we didn't just click the bonus marble
            if (!bonusHit) {
                engine.spawnMicroMarble(x, y);
            }
        }
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        handleClick(e);
    };

    return (
        <canvas 
            ref={canvasRef} 
            width={400} 
            height={600} 
            onClick={handleClick} 
            onContextMenu={handleContextMenu} 
            className={inChallengeMode ? 'challenge-board' : ''}
        />
    );
};