import React, { useState, useEffect, useRef } from 'react';
import { getMissionById } from '../../game/missions';
import { engine } from '../../game/engine';
import { formatNumber } from '../../game/utils';
import { ActiveMission } from '../../game/types';

export const MissionsModal = ({ onClose }: { onClose: () => void }) => {
    const [gameState, setGameState] = useState(engine.state);
    const [timeToReset, setTimeToReset] = useState('');
    const touchStart = useRef<{x: number, y: number} | null>(null);
    const isSwiping = useRef(false);

    useEffect(() => {
        const unsub = engine.subscribe(() => {
            setGameState({ ...engine.state });
        });
        return () => {
            unsub();
        };
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isSwiping.current = true;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current || !isSwiping.current) return;
        
        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        const dx = touchEnd.x - touchStart.current.x;
        const dy = touchEnd.y - touchStart.current.y;
        
        // Horizontal swipe must be significantly larger than vertical to count
        // and must exceed a higher threshold (100px)
        if (Math.abs(dx) > 100 && Math.abs(dx) > Math.abs(dy) * 2) {
            if (dx > 0) { // Swipe right to close
                onClose();
            }
        }
        
        touchStart.current = null;
        isSwiping.current = false;
    };

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setHours(24, 0, 0, 0);
            const diff = tomorrow.getTime() - now.getTime();
            
            const hh = Math.floor(diff / 3600000);
            const mm = Math.floor((diff % 3600000) / 60000);
            const ss = Math.floor((diff % 60000) / 1000);
            
            setTimeToReset(`${hh}h ${mm}m ${ss}s`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    const missionState = gameState.missions;
    const peakMps = gameState.currentRunPeakMps || gameState.currentMps || 10;

    const hasClaimable = [
        ...(missionState?.activeDailies || []),
        ...(missionState?.activeRepeatables || [])
    ].some(m => m.completed && !m.claimed);

    const renderMission = (active: ActiveMission) => {
        const missionDef = getMissionById(active.id);
        if (!missionDef) return null;

        const isRepeatable = active.type === 'repeatable';
        const rerollCost = Math.floor(peakMps * (isRepeatable ? 10 : 30));
        const canAffordReroll = engine.state.money >= rerollCost;
        
        const shardCost = isRepeatable ? 1 : 3;
        const canAffordShards = engine.state.kineticShards >= shardCost;

        return (
            <div key={active.instanceId} className={`mission-tile ${active.type} ${active.completed ? 'completed' : ''} ${active.claimed ? 'claimed' : ''}`}>
                <div className="mission-type-badge">{active.type === 'daily' ? 'Daily' : 'Repeatable'}</div>
                <div className="mission-name">{missionDef.name}</div>
                <div className="mission-description">{missionDef.description}</div>
                <div className="mission-progress">
                    Progress: {active.progress} / {missionDef.target}
                </div>
                <div className="mission-reward">Reward: ${formatNumber(Math.floor(peakMps * missionDef.reward.moneyMultiplier))}</div>
                
                <div className="mission-actions">
                    {active.completed && !active.claimed && (
                        <button className="claim-btn" onClick={() => engine.claimMission(active.instanceId)}>Claim Reward</button>
                    )}
                    {!active.completed && !active.claimed && (
                        <div className="reroll-options" style={{ display: 'flex', gap: '5px' }}>
                            <button 
                                className={`reroll-btn ${canAffordReroll ? '' : 'disabled'}`} 
                                onClick={() => engine.rerollMission(active.instanceId, false)}
                                title={`Reroll for $${formatNumber(rerollCost)}`}
                                style={{ flex: 1 }}
                            >
                                🔄 Reroll (${formatNumber(rerollCost)})
                            </button>
                            <button 
                                className={`reroll-btn shard-reroll ${canAffordShards ? '' : 'disabled'}`} 
                                onClick={() => engine.rerollMission(active.instanceId, true)}
                                title={`Reroll for ${shardCost} Shard${shardCost !== 1 ? 's' : ''}`}
                                style={{ flex: 1, backgroundColor: '#9b59b6', borderColor: '#8e44ad', color: 'white' }}
                            >
                                🔄 Reroll ({shardCost} 💎)
                            </button>
                        </div>
                    )}
                    {active.claimed && (
                        <div className="claimed-badge">Claimed</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div 
            className="confirm-overlay" 
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="confirm-modal missions-modal">
                <div className="modal-header-row">
                    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                        <h3 style={{margin:0}}>Missions</h3>
                        {hasClaimable && (
                            <button 
                                className="claim-btn animate-bounce"
                                onClick={() => engine.claimAllMissions()}
                                style={{
                                    margin: 0,
                                    width: 'auto',
                                    padding: '6px 14px',
                                    background: '#3498db',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontWeight: '900',
                                    fontSize: '0.8rem',
                                    boxShadow: '0 3px 0 #2980b9',
                                    textTransform: 'uppercase',
                                    transition: 'all 0.1s'
                                }}
                            >
                                Claim All
                            </button>
                        )}
                    </div>
                    <button className="close-core" onClick={onClose}>Close</button>
                </div>
                
                <div className="missions-columns">
                    <div className="missions-column">
                        <div className="column-header-with-timer">
                            <h4 className="column-title daily">Daily Missions</h4>
                            <div className="reset-timer">Resets in: {timeToReset}</div>
                        </div>
                        <div className="missions-list">
                            {missionState.activeDailies.map(renderMission)}
                        </div>
                    </div>

                    <div className="missions-column">
                        <div className="column-header-with-timer">
                            <h4 className="column-title repeatable">Repeatable Missions</h4>
                        </div>
                        <div className="missions-list">
                            {missionState.activeRepeatables.map(renderMission)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
