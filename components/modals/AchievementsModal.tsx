import React, { useRef } from 'react';
import { ACHIEVEMENT_GROUPS, romanize, getAchievementTier } from '../../game/achievements';
import { engine } from '../../game/engine';
import { formatNumber } from '../../game/utils';

export const AchievementsModal = ({ gameState, onClose }: { gameState: any, onClose: () => void }) => {
    const groups = ACHIEVEMENT_GROUPS;
    const completedAchievements = gameState.achievements;
    const peakMps = gameState.currentRunPeakMps || gameState.currentMps || 10;
    const touchStart = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart.current === null) return;
        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchEnd - touchStart.current;
        if (diff > 50) {
            onClose();
        }
        touchStart.current = null;
    };

    return (
        <div 
            className="confirm-overlay" 
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="confirm-modal achievements-modal">
                <div style={{display:'flex', alignItems:'center', gap:'12px', justifyContent:'space-between', marginBottom:'15px'}}>
                    <h3>Achievements</h3>
                    <button className="close-core" onClick={onClose}>Close</button>
                </div>
                <div className="achievements-grid">
                    {groups.map(group => {
                        // Find the first tier that is either not completed OR completed but not claimed
                        let currentTierIndex = 0;
                        for (let i = 0; i < 100; i++) {
                            const achievementId = `${group.id}_${i + 1}`;
                            const state = completedAchievements[achievementId];
                            
                            // If not completed OR completed but not claimed, this is the one to show
                            const isClaimable = (state && typeof state === 'object' && state.completed && !state.claimed) || state === true;
                            const isNotReached = !state;

                            if (isClaimable || isNotReached) {
                                currentTierIndex = i;
                                break;
                            }
                            currentTierIndex = i; // Fallback to last checked
                        }

                        const tier = getAchievementTier(group, currentTierIndex);
                        const tierName = `${group.name} ${romanize(currentTierIndex + 1)}`;
                        const achievementId = `${group.id}_${currentTierIndex + 1}`;
                        const achievementState = completedAchievements[achievementId];
                        
                        // Resilience: handle both object and boolean formats
                        const isCompleted = achievementState === true || (achievementState && typeof achievementState === 'object' && achievementState.completed);
                        const isClaimed = achievementState && typeof achievementState === 'object' && achievementState.claimed;
                        
                        const currentStatValue = (gameState as any)[group.stat] || 0;
                        const progressPercent = Math.min(100, (currentStatValue / tier.target) * 100);

                        return (
                            <div key={group.id} className={`achievement-tile ${isCompleted ? 'completed' : ''}`}>
                                <div className="achievement-name">{tierName}</div>
                                <div className="achievement-description">
                                    {group.descriptionTemplate.replace('{n}', formatNumber(tier.target))}
                                </div>
                                <div className="achievement-progress-bar">
                                    <div className="achievement-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                                <div className="achievement-progress-text">
                                    {formatNumber(currentStatValue)} / {formatNumber(tier.target)}
                                </div>
                                <div className="achievement-reward">
                                    Reward: ${formatNumber(Math.floor(peakMps * tier.rewardMult))}
                                </div>
                                {isCompleted && !isClaimed && (
                                    <button 
                                        className="claim-btn"
                                        onClick={() => engine.claimAchievement(achievementId)}
                                        style={{ marginTop: '8px', width: '100%', padding: '8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        Claim Reward
                                    </button>
                                )}
                                {isCompleted && isClaimed && (
                                    <div style={{ marginTop: '8px', color: '#888', fontSize: '0.9em', textAlign: 'center' }}>
                                        Claimed
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
