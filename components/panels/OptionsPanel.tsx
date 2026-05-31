
import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { engine } from '../../game/engine';
import { GameState } from '../../game/types';
import { CHALLENGES, ChallengesManager } from '../../game/challenges';
import { getTodayDateString } from '../../game/dailyLoginRewards';

interface OptionsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    gameState: GameState;
    onOpenStats: () => void;
    onOpenTutorials: () => void;
    onReset: () => void;
    onOpenChallenges: () => void;
    forceUpdate: () => void;
    uiState: any;
    setUiState: (state: any) => void;
    hasClaimableMissions: boolean;
    hasClaimableAchievements: boolean;
}

export const OptionsPanel = ({ isOpen, onClose, gameState, onOpenStats, onOpenTutorials, onReset, onOpenChallenges, forceUpdate, uiState, setUiState, hasClaimableMissions, hasClaimableAchievements }: OptionsPanelProps) => {
    const touchStart = useRef<{x: number, y: number} | null>(null);
    const isSwiping = useRef(false);
    const [timeLeftStr, setTimeLeftStr] = useState('');

    useEffect(() => {
        const updateTimeLeft = () => {
            const rot = ChallengesManager.getRotationInfo();
            setTimeLeftStr(rot.timeLeftStr);
        };
        updateTimeLeft();
        const interval = setInterval(updateTimeLeft, 1000);
        return () => clearInterval(interval);
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
            if (dx > 0 && isOpen) { // Swipe right to close
                onClose();
            }
        }
        
        touchStart.current = null;
        isSwiping.current = false;
    };

    const [syncing, setSyncing] = useState(false);

    const handleForceSync = async () => {
        if (gameState.isOffline || syncing) return;
        setSyncing(true);
        try {
            await engine.saveState();
            forceUpdate();
        } finally {
            setTimeout(() => setSyncing(false), 1000);
        }
    };

    const lastSyncStr = gameState.lastCloudSyncTime && gameState.lastCloudSyncTime > 0 
        ? new Date(gameState.lastCloudSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'Never';

    const rot = ChallengesManager.getRotationInfo();
    const challenge = CHALLENGES[rot.activeChallengeId];
    const cState = gameState.challengeState || { money: 0, lifetimePegsBroken: 0 };
    const metricType = challenge.goals.bronze.metric;
    const currentMetricVal = metricType === 'pegsBroken' ? (cState.lifetimePegsBroken || 0) : (cState.lifetimeEarnings || cState.money || 0);

    const isBronzeAchieved = currentMetricVal >= challenge.goals.bronze.target;
    const isSilverAchieved = currentMetricVal >= challenge.goals.silver.target;
    const isGoldAchieved = currentMetricVal >= challenge.goals.gold.target;

    return (
        <div 
            className={`sidebar-right ${isOpen ? 'open' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="panel-header">
                <h2>Options</h2>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="sidebar-content">
                
                <button 
                    className={`btn-toggle ${!gameState.inChallengeMode ? 'glow-breathing' : ''} flex flex-col items-center justify-center p-3`} 
                    style={{ 
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                        border: '1px solid #fbbf24', 
                        color: 'black',
                        textTransform: 'uppercase',
                        fontWeight: '900',
                        fontSize: gameState.inChallengeMode ? '0.75rem' : '0.8rem',
                        letterSpacing: '0.05em',
                        boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                        marginBottom: '15px'
                    }} 
                    onClick={onOpenChallenges}
                >
                    <span className="font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap flex-nowrap w-full">
                        🏆 {gameState.inChallengeMode ? `Challenge (${timeLeftStr})` : 'Challenge Dome'}
                    </span>
                    <div className="flex gap-2 mt-2 justify-center">
                        <div className={`w-3.5 h-3.5 rounded-full border border-black/30 transition-all ${isBronzeAchieved ? 'bg-[#b45309]' : 'bg-transparent'}`} title={isBronzeAchieved ? "Bronze Complete" : "Bronze Incomplete"} />
                        <div className={`w-3.5 h-3.5 rounded-full border border-black/30 transition-all ${isSilverAchieved ? 'bg-[#94a3b8]' : 'bg-transparent'}`} title={isSilverAchieved ? "Silver Complete" : "Silver Incomplete"} />
                        <div className={`w-3.5 h-3.5 rounded-full border border-black/30 transition-all ${isGoldAchieved ? 'bg-[#fbbf24]' : 'bg-transparent'}`} title={isGoldAchieved ? "Gold Complete" : "Gold Incomplete"} />
                    </div>
                </button>
                
                <button className="btn-toggle" onClick={onOpenStats}>
                    Stats
                </button>
                
                {(() => {
                    const isDailyRewardClaimable = gameState.dailyLogin?.lastClaimedDate !== getTodayDateString();
                    return (
                        <button 
                            className={`btn-toggle ${isDailyRewardClaimable ? 'glow-breathing !bg-[#0f1124] !border-amber-500/40 !text-amber-400' : ''}`} 
                            onClick={() => setUiState((s: any) => ({...s, dailyRewardOpen: true}))}
                        >
                            🎁 {isDailyRewardClaimable ? "Claim Daily Reward!" : "Daily Reward Calendar"}
                        </button>
                    );
                })()}
                
                <button className="btn-toggle" onClick={onOpenTutorials}>
                    Tutorials
                </button>

                <button className="btn-toggle" style={{ background: '#f39c12', boxShadow: '0 4px 0 #d35400' }} onClick={() => setUiState((s: any) => ({...s, leaderboardOpen: true, optionsOpen: false}))}>
                    Leaderboard
                </button>

                <button className={`btn-toggle ${hasClaimableAchievements ? 'glow-breathing' : ''}`} onClick={() => setUiState((s: any) => ({...s, achievementsOpen: true}))}>
                    Achievements
                </button>

                <button className={`btn-toggle ${hasClaimableMissions ? 'glow-breathing' : ''}`} onClick={() => setUiState((s: any) => ({...s, missionsOpen: true}))}>
                    Missions
                </button>
                
                <div className="option-row" style={{marginTop:'20px'}}>
                    <label className="option-label" style={{display:'flex', justifyContent:'space-between'}}>
                        SFX Volume <span>{Math.round(gameState.sfxVolume * 100)}%</span>
                    </label>
                    <input 
                        type="range" min="0" max="1" step="0.1" 
                        defaultValue={gameState.sfxVolume}
                        onChange={(e) => {
                            engine.state.sfxVolume = parseFloat(e.target.value);
                            engine.audio.setSfxVolume(parseFloat(e.target.value));
                            forceUpdate();
                        }}
                    />
                </div>
                <div className="option-row">
                    <label className="option-label" style={{display:'flex', justifyContent:'space-between'}}>
                        Music Volume <span>{Math.round(gameState.musicVolume * 100)}%</span>
                    </label>
                    <input 
                        type="range" min="0" max="1" step="0.1" 
                        defaultValue={gameState.musicVolume}
                        onChange={(e) => {
                            engine.state.musicVolume = parseFloat(e.target.value);
                            engine.audio.setMusicVolume(parseFloat(e.target.value));
                            forceUpdate();
                        }}
                    />
                </div>
                
                <button className={`btn-pill ${gameState.sfxMuted ? 'muted' : ''}`} onClick={() => {
                    engine.state.sfxMuted = !engine.state.sfxMuted;
                    engine.audio.toggleSfxMute(engine.state.sfxMuted);
                    forceUpdate();
                }}>
                    {gameState.sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
                </button>

                <button className={`btn-pill ${gameState.musicMuted ? 'muted' : ''}`} onClick={() => {
                    engine.state.musicMuted = !engine.state.musicMuted;
                    engine.audio.toggleMusicMute(engine.state.musicMuted);
                    forceUpdate();
                }}>
                    {gameState.musicMuted ? 'Unmute Music' : 'Mute Music'}
                </button>
                
                <div className="option-row" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: '10px'}}>
                    <span style={{fontSize:'0.9rem', color:'#ccc'}}>Peg Sounds</span>
                    <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'2px', display:'flex'}}>
                        <button className={`toggle-switch ${gameState.pegMuted ? 'active' : ''}`} onClick={() => {
                            engine.state.pegMuted = true; forceUpdate();
                        }}>Off</button>
                        <button className={`toggle-switch ${!gameState.pegMuted ? 'active' : ''}`} onClick={() => {
                            engine.state.pegMuted = false; forceUpdate();
                        }}>On</button>
                    </div>
                </div>

                <div className="option-row" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: '5px'}}>
                    <span style={{fontSize:'0.9rem', color:'#ccc'}}>Basket Sounds</span>
                    <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'2px', display:'flex'}}>
                        <button className={`toggle-switch ${gameState.basketMuted ? 'active' : ''}`} onClick={() => {
                            engine.state.basketMuted = true; forceUpdate();
                        }}>Off</button>
                        <button className={`toggle-switch ${!gameState.basketMuted ? 'active' : ''}`} onClick={() => {
                            engine.state.basketMuted = false; forceUpdate();
                        }}>On</button>
                    </div>
                </div>

                <div className="option-row" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: '5px'}}>
                    <span style={{fontSize:'0.9rem', color:'#ccc'}}>Critical Sounds</span>
                    <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'2px', display:'flex'}}>
                        <button className={`toggle-switch ${gameState.critMuted ? 'active' : ''}`} onClick={() => {
                            engine.state.critMuted = true; forceUpdate();
                        }}>Off</button>
                        <button className={`toggle-switch ${!gameState.critMuted ? 'active' : ''}`} onClick={() => {
                            engine.state.critMuted = false; forceUpdate();
                        }}>On</button>
                    </div>
                </div>
                
                <div className="option-row" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'15px'}}>
                    <span style={{fontSize:'0.9rem', color:'#ccc'}}>Physics</span>
                    <button className="btn-pill small" onClick={() => {
                        engine.running = !engine.running;
                        forceUpdate();
                    }}>
                        {engine.running ? 'Pause' : 'Resume'}
                    </button>
                </div>
                
                <div className="option-row" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <span style={{fontSize:'0.9rem', color:'#ccc'}}>Disable $ popups</span>
                    <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'2px', display:'flex'}}>
                        <button className={`toggle-switch ${gameState.disableMoneyPopups ? '' : 'active'}`} onClick={() => {
                            engine.state.disableMoneyPopups = false; forceUpdate();
                        }}>Off</button>
                        <button className={`toggle-switch ${gameState.disableMoneyPopups ? 'active' : ''}`} onClick={() => {
                            engine.state.disableMoneyPopups = true; forceUpdate();
                        }}>On</button>
                    </div>
                </div>

                <div className="option-row" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: '5px'}}>
                    <span style={{fontSize:'0.9rem', color:'#ccc'}}>Haptic Feedback</span>
                    <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'2px', display:'flex'}}>
                        <button className={`toggle-switch ${gameState.hapticsDisabled ? 'active' : ''}`} onClick={() => {
                            engine.state.hapticsDisabled = true; forceUpdate(); engine.saveState();
                        }}>Off</button>
                        <button className={`toggle-switch ${!gameState.hapticsDisabled ? 'active' : ''}`} onClick={() => {
                            engine.state.hapticsDisabled = false; forceUpdate(); engine.saveState();
                        }}>On</button>
                    </div>
                </div>

                <div className="option-row" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'15px'}}>
                    <span style={{fontSize:'0.9rem', color:'#ccc'}}>Theme</span>
                    <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'2px', display:'flex'}}>
                        <button className={`toggle-switch ${gameState.activeTheme === 'dark' ? 'active' : ''}`} onClick={() => {
                            engine.state.activeTheme = 'dark'; forceUpdate(); engine.saveState();
                        }}>Dark</button>
                        <button className={`toggle-switch ${gameState.activeTheme === 'purple' ? 'active' : ''}`} onClick={() => {
                            engine.state.activeTheme = 'purple'; forceUpdate(); engine.saveState();
                        }}>Purple</button>
                    </div>
                </div>

                <div className="sync-section" style={{marginTop:'25px', padding:'12px', background:'rgba(255,255,255,0.05)', borderRadius:'12px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                        <span style={{fontSize:'0.8rem', color:'#888'}}>Cloud Sync</span>
                        <span style={{fontSize:'0.8rem', color: gameState.isOffline ? '#e74c3c' : '#2ecc71'}}>
                            {gameState.isOffline ? 'Offline' : lastSyncStr}
                        </span>
                    </div>
                    {!gameState.isOffline && (
                        <button 
                            className={`btn-pill small ${syncing ? 'loading' : ''}`} 
                            style={{width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', margin:0}}
                            onClick={handleForceSync}
                            disabled={syncing}
                        >
                            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                            {syncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    )}
                </div>

                <div style={{marginTop:'auto', paddingTop:'20px'}}>
                    <details className="data-dropdown">
                        <summary>Data</summary>
                        <div className="data-content">
                            <button className="reset-btn" onClick={onReset}>Reset Progress</button>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
};
