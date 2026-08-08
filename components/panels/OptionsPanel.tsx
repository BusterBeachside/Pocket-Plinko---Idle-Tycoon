
import React, { useRef, useState, useEffect } from 'react';
import { 
    RefreshCw, Volume2, Sliders, Gamepad2, Cloud, Trophy, 
    Gift, BarChart2, BookOpen, Award, Target, ChevronDown, 
    Palette, Vibrate, Coins, Trash2, Zap, Gem, Sparkles, Gauge, Activity
} from 'lucide-react';
import { engine } from '../../game/engine';
import { GameState } from '../../game/types';
import { CHALLENGES, ChallengesManager } from '../../game/challenges';
import { getTodayDateString } from '../../game/dailyLoginRewards';
import { WebsimAdBanner } from '../WebsimAdBanner';

interface OptionsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    gameState: GameState;
    onOpenStats: () => void;
    onOpenTutorials: () => void;
    onReset: () => void;
    onOpenChallenges: () => void;
    onToggleChallenge?: () => void;
    forceUpdate: () => void;
    uiState: any;
    setUiState: (state: any) => void;
    hasClaimableMissions: boolean;
    hasClaimableAchievements: boolean;
}

export const OptionsPanel = ({ 
    isOpen, onClose, gameState, onOpenStats, onOpenTutorials, onReset, 
    onOpenChallenges, onToggleChallenge, forceUpdate, uiState, setUiState, 
    hasClaimableMissions, hasClaimableAchievements 
}: OptionsPanelProps) => {
    const touchStart = useRef<{x: number, y: number} | null>(null);
    const isSwiping = useRef(false);
    const [timeLeftStr, setTimeLeftStr] = useState('');
    const [syncing, setSyncing] = useState(false);

    // Collapsible category section states (Audio default open for quick access)
    const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
        navigation: true,
        audio: true,
        gameplay: false,
        account: false
    });

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
        engine.audio.play('click');
    };

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
        
        if (Math.abs(dx) > 100 && Math.abs(dx) > Math.abs(dy) * 2) {
            if (dx > 0 && isOpen) {
                onClose();
            }
        }
        
        touchStart.current = null;
        isSwiping.current = false;
    };

    const handleForceSync = async () => {
        if (gameState.isOffline || gameState.debugMode || syncing) return;
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

    const isDailyRewardClaimable = gameState.dailyLogin?.lastClaimedDate !== getTodayDateString();

    const activeId = rot.activeChallengeId;
    const hasChallengeStarted = !!(
        cState &&
        cState.challengeId === activeId &&
        ((cState.lifetimeEarnings || 0) > 0 ||
         (cState.lifetimePegsBroken || 0) > 0 ||
         (cState.money || 0) > 0 ||
         (cState.pegsBrokenCurrency || 0) > 0 ||
         (cState.lifetimeMicroMarblesDropped || 0) > 0 ||
         Object.entries(cState.upgrades || {}).some(([k, v]: [string, any]) => {
             if (k === 'extraBall') {
                 return activeId === 'micro_mania' ? v > 0 : v > 1;
             }
             return v > 0;
         }))
    );

    return (
        <div 
            className={`sidebar-right ${isOpen ? 'open' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="panel-header">
                <h2>Settings & Hub</h2>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <div className="sidebar-content space-y-3 pb-8">
                
                {/* 1. Main Action Button: Challenge Dome / Return to Main Board */}
                <button 
                    className={`btn-toggle w-full flex flex-col items-center justify-center p-3 transition-all cursor-pointer ${(!gameState.inChallengeMode && !hasChallengeStarted) ? 'glow-breathing' : ''}`} 
                    style={{ 
                        background: gameState.inChallengeMode 
                            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                            : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                        border: gameState.inChallengeMode ? '1px solid #f87171' : '1px solid #fbbf24', 
                        color: gameState.inChallengeMode ? 'white' : 'black',
                        textTransform: 'uppercase',
                        fontWeight: '900',
                        fontSize: gameState.inChallengeMode ? '0.75rem' : '0.8rem',
                        letterSpacing: '0.05em',
                        boxShadow: gameState.inChallengeMode 
                            ? '0 4px 15px rgba(239, 68, 68, 0.4)' 
                            : '0 4px 15px rgba(245, 158, 11, 0.4)',
                    }} 
                    onClick={() => {
                        if (gameState.inChallengeMode && onToggleChallenge) {
                            onClose();
                            onToggleChallenge();
                        } else {
                            onOpenChallenges();
                        }
                    }}
                >
                    <span className="font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap flex-nowrap w-full">
                        {gameState.inChallengeMode ? '🔙 Return to Main Board' : '🏆 Challenge Dome'}
                    </span>
                    {!gameState.inChallengeMode && hasChallengeStarted && (
                        <div className="flex items-center gap-1.5 mt-1.5 bg-black/40 border border-black/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-black/90">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            <span>IN PROGRESS</span>
                            <span className="opacity-60">•</span>
                            <span className="font-mono">{timeLeftStr}</span>
                        </div>
                    )}
                    <div className="flex gap-2 mt-2 justify-center">
                        <div className={`w-3.5 h-3.5 rounded-full border border-black/30 transition-all ${isBronzeAchieved ? 'bg-[#b45309]' : 'bg-transparent'}`} title={isBronzeAchieved ? "Bronze Complete" : "Bronze Incomplete"} />
                        <div className={`w-3.5 h-3.5 rounded-full border border-black/30 transition-all ${isSilverAchieved ? 'bg-[#94a3b8]' : 'bg-transparent'}`} title={isSilverAchieved ? "Silver Complete" : "Silver Incomplete"} />
                        <div className={`w-3.5 h-3.5 rounded-full border border-black/30 transition-all ${isGoldAchieved ? 'bg-[#fbbf24]' : 'bg-transparent'}`} title={isGoldAchieved ? "Gold Complete" : "Gold Incomplete"} />
                    </div>
                </button>

                {!gameState.inChallengeMode && (
                    <button 
                        className={`btn-toggle w-full flex items-center justify-center gap-2 ${engine.socketingActive ? 'glow-breathing !bg-[#0f2a3a] !border-cyan-400/60 !text-cyan-300' : ''}`} 
                        onClick={() => {
                            engine.socketingActive = !engine.socketingActive;
                            engine.audio.play('upgrade');
                            engine.notify();
                            onClose();
                        }}
                    >
                        <Gem className="w-4 h-4 text-cyan-400" />
                        <span>{engine.socketingActive ? 'Deactivate Socket Builder' : 'Peg Sockets Builder'}</span>
                    </button>
                )}

                {/* CATEGORY 1: Navigation & Stats Grid */}
                {(() => {
                    const hasRewardWaiting = hasClaimableMissions || hasClaimableAchievements || isDailyRewardClaimable;
                    return (
                        <div className={`border rounded-xl bg-black/30 overflow-hidden transition-all ${!openSections.navigation && hasRewardWaiting ? 'border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.25)]' : 'border-white/10'}`}>
                            <button 
                                onClick={() => toggleSection('navigation')}
                                className={`w-full px-3 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-200 bg-white/5 hover:bg-white/10 transition-all cursor-pointer ${
                                    !openSections.navigation && hasRewardWaiting ? 'glow-breathing !bg-amber-500/20 !border-amber-400 !text-amber-300' : ''
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Gamepad2 className="w-4 h-4 text-amber-400" />
                                    Game Views & Rewards
                                    {!openSections.navigation && hasRewardWaiting && (
                                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block ml-1 shadow-[0_0_8px_#fbbf24]" />
                                    )}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.navigation ? 'rotate-180' : ''}`} />
                            </button>

                            {openSections.navigation && (
                                <div className="p-2.5 grid grid-cols-2 gap-2">
                                    <button className="btn-toggle !py-2 text-xs flex items-center justify-center gap-1.5" onClick={onOpenStats}>
                                        <BarChart2 className="w-3.5 h-3.5 text-cyan-400" /> Stats
                                    </button>

                                    <button 
                                        className={`btn-toggle !py-2 text-xs flex items-center justify-center gap-1.5 ${isDailyRewardClaimable ? 'glow-breathing !bg-[#0f1124] !border-amber-500/40 !text-amber-400' : ''}`} 
                                        onClick={() => setUiState((s: any) => ({...s, dailyRewardOpen: true}))}
                                    >
                                        <Gift className="w-3.5 h-3.5 text-amber-400" /> {isDailyRewardClaimable ? "Daily Reward!" : "Daily Reward"}
                                    </button>

                                    <button className="btn-toggle !py-2 text-xs flex items-center justify-center gap-1.5" onClick={onOpenTutorials}>
                                        <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Tutorials
                                    </button>

                                    <button 
                                        className="btn-toggle !py-2 text-xs flex items-center justify-center gap-1.5" 
                                        style={{ background: '#f39c12', boxShadow: '0 3px 0 #d35400' }} 
                                        onClick={() => setUiState((s: any) => ({...s, leaderboardOpen: true, optionsOpen: false}))}
                                    >
                                        <Trophy className="w-3.5 h-3.5 text-amber-100" /> Leaderboard
                                    </button>

                                    <button className={`btn-toggle !py-2 text-xs flex items-center justify-center gap-1.5 ${hasClaimableAchievements ? 'glow-breathing' : ''}`} onClick={() => setUiState((s: any) => ({...s, achievementsOpen: true}))}>
                                        <Award className="w-3.5 h-3.5 text-emerald-400" /> Achievements
                                    </button>

                                    <button className={`btn-toggle !py-2 text-xs flex items-center justify-center gap-1.5 ${hasClaimableMissions ? 'glow-breathing' : ''}`} onClick={() => setUiState((s: any) => ({...s, missionsOpen: true}))}>
                                        <Target className="w-3.5 h-3.5 text-rose-400" /> Missions
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* CATEGORY 2: Audio Settings */}
                <div className="border border-white/10 rounded-xl bg-black/30 overflow-hidden">
                    <button 
                        onClick={() => toggleSection('audio')}
                        className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-200 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <Volume2 className="w-4 h-4 text-cyan-400" />
                            Audio & Sound Effects
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.audio ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.audio && (
                        <div className="p-3 space-y-3">
                            <div className="option-row">
                                <label className="option-label flex justify-between text-xs font-semibold text-slate-300 mb-1">
                                    <span>SFX Volume</span>
                                    <span className="text-cyan-400">{Math.round(gameState.sfxVolume * 100)}%</span>
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
                                <label className="option-label flex justify-between text-xs font-semibold text-slate-300 mb-1">
                                    <span>Music Volume</span>
                                    <span className="text-purple-400">{Math.round(gameState.musicVolume * 100)}%</span>
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

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button className={`btn-pill !py-1.5 text-xs ${gameState.sfxMuted ? 'muted' : ''}`} onClick={() => {
                                    engine.state.sfxMuted = !engine.state.sfxMuted;
                                    engine.audio.toggleSfxMute(engine.state.sfxMuted);
                                    forceUpdate();
                                }}>
                                    {gameState.sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
                                </button>

                                <button className={`btn-pill !py-1.5 text-xs ${gameState.musicMuted ? 'muted' : ''}`} onClick={() => {
                                    engine.state.musicMuted = !engine.state.musicMuted;
                                    engine.audio.toggleMusicMute(engine.state.musicMuted);
                                    forceUpdate();
                                }}>
                                    {gameState.musicMuted ? 'Unmute Music' : 'Mute Music'}
                                </button>
                            </div>

                            {/* Sound FX Details */}
                            <div className="pt-2 border-t border-white/10 space-y-2">
                                <div className="option-row flex items-center justify-between">
                                    <span className="text-xs text-slate-300">Peg Bounce Sounds</span>
                                    <div className="bg-white/10 rounded-xl p-0.5 flex">
                                        <button className={`toggle-switch ${gameState.pegMuted ? 'active' : ''}`} onClick={() => {
                                            engine.state.pegMuted = true; forceUpdate();
                                        }}>Off</button>
                                        <button className={`toggle-switch ${!gameState.pegMuted ? 'active' : ''}`} onClick={() => {
                                            engine.state.pegMuted = false; forceUpdate();
                                        }}>On</button>
                                    </div>
                                </div>

                                <div className="option-row flex items-center justify-between">
                                    <span className="text-xs text-slate-300">Basket Drop Sounds</span>
                                    <div className="bg-white/10 rounded-xl p-0.5 flex">
                                        <button className={`toggle-switch ${gameState.basketMuted ? 'active' : ''}`} onClick={() => {
                                            engine.state.basketMuted = true; forceUpdate();
                                        }}>Off</button>
                                        <button className={`toggle-switch ${!gameState.basketMuted ? 'active' : ''}`} onClick={() => {
                                            engine.state.basketMuted = false; forceUpdate();
                                        }}>On</button>
                                    </div>
                                </div>

                                <div className="option-row flex items-center justify-between">
                                    <span className="text-xs text-slate-300">Critical Hit Sounds</span>
                                    <div className="bg-white/10 rounded-xl p-0.5 flex">
                                        <button className={`toggle-switch ${gameState.critMuted ? 'active' : ''}`} onClick={() => {
                                            engine.state.critMuted = true; forceUpdate();
                                        }}>Off</button>
                                        <button className={`toggle-switch ${!gameState.critMuted ? 'active' : ''}`} onClick={() => {
                                            engine.state.critMuted = false; forceUpdate();
                                        }}>On</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* CATEGORY 3: Gameplay & Visuals */}
                <div className="border border-white/10 rounded-xl bg-black/30 overflow-hidden">
                    <button 
                        onClick={() => toggleSection('gameplay')}
                        className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-200 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-purple-400" />
                            Gameplay & Visuals
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.gameplay ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.gameplay && (
                        <div className="p-3 space-y-2.5">
                            <div className="option-row flex items-center justify-between">
                                <span className="text-xs text-slate-300 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> Physics Engine</span>
                                <button className="btn-pill small !py-1 text-xs cursor-pointer" onClick={() => {
                                    engine.running = !engine.running;
                                    forceUpdate();
                                }}>
                                    {engine.running ? 'Pause' : 'Resume'}
                                </button>
                            </div>

                            <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl flex flex-col gap-2">
                                <div className="flex flex-col gap-1.5 w-full">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5" title="Graphics quality setting for physics & canvas effects">
                                            <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Graphics Quality
                                        </span>
                                        <span className="text-[10.5px] font-semibold text-slate-400 capitalize">
                                            {(!gameState.qualityMode || gameState.qualityMode === 'high') ? 'High' : (gameState.qualityMode === 'medium' ? 'Medium' : 'Low')}
                                        </span>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-1 grid grid-cols-3 gap-1 w-full">
                                        <button 
                                            className={`text-[11px] font-bold py-1.5 px-1 rounded-md transition-all text-center flex items-center justify-center cursor-pointer ${
                                                (!gameState.qualityMode || gameState.qualityMode === 'high')
                                                    ? 'bg-white text-black font-black shadow-sm' 
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                            onClick={() => {
                                                engine.state.qualityMode = 'high'; forceUpdate(); engine.saveState();
                                            }}
                                        >High</button>
                                        <button 
                                            className={`text-[11px] font-bold py-1.5 px-1 rounded-md transition-all text-center flex items-center justify-center cursor-pointer ${
                                                gameState.qualityMode === 'medium'
                                                    ? 'bg-white text-black font-black shadow-sm' 
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                            onClick={() => {
                                                engine.state.qualityMode = 'medium'; forceUpdate(); engine.saveState();
                                            }}
                                        >Medium</button>
                                        <button 
                                            className={`text-[11px] font-bold py-1.5 px-1 rounded-md transition-all text-center flex items-center justify-center cursor-pointer ${
                                                gameState.qualityMode === 'low'
                                                    ? 'bg-white text-black font-black shadow-sm' 
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                            onClick={() => {
                                                engine.state.qualityMode = 'low'; forceUpdate(); engine.saveState();
                                            }}
                                        >Low</button>
                                    </div>
                                </div>
                            </div>

                            <div className="option-row flex items-center justify-between">
                                <span className="text-xs text-slate-300 flex items-center gap-1.5" title="Display live FPS on game screen"><Activity className="w-3.5 h-3.5 text-emerald-400" /> Display FPS</span>
                                <div className="bg-white/10 rounded-xl p-0.5 flex">
                                    <button className={`toggle-switch ${gameState.showFps ? 'active' : ''}`} onClick={() => {
                                        engine.state.showFps = true; forceUpdate(); engine.saveState();
                                    }}>On</button>
                                    <button className={`toggle-switch ${!gameState.showFps ? 'active' : ''}`} onClick={() => {
                                        engine.state.showFps = false; forceUpdate(); engine.saveState();
                                    }}>Off</button>
                                </div>
                            </div>

                            <div className="option-row flex items-center justify-between">
                                <span className="text-xs text-slate-300 flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-emerald-400" /> Money Popups</span>
                                <div className="bg-white/10 rounded-xl p-0.5 flex">
                                    <button className={`toggle-switch ${gameState.disableMoneyPopups ? '' : 'active'}`} onClick={() => {
                                        engine.state.disableMoneyPopups = false; forceUpdate();
                                    }}>On</button>
                                    <button className={`toggle-switch ${gameState.disableMoneyPopups ? 'active' : ''}`} onClick={() => {
                                        engine.state.disableMoneyPopups = true; forceUpdate();
                                    }}>Off</button>
                                </div>
                            </div>

                            <div className="option-row flex items-center justify-between">
                                <span className="text-xs text-slate-300 flex items-center gap-1.5"><Vibrate className="w-3.5 h-3.5 text-pink-400" /> Haptic Feedback</span>
                                <div className="bg-white/10 rounded-xl p-0.5 flex">
                                    <button className={`toggle-switch ${gameState.hapticsDisabled ? '' : 'active'}`} onClick={() => {
                                        engine.state.hapticsDisabled = false; forceUpdate(); engine.saveState();
                                    }}>On</button>
                                    <button className={`toggle-switch ${gameState.hapticsDisabled ? 'active' : ''}`} onClick={() => {
                                        engine.state.hapticsDisabled = true; forceUpdate(); engine.saveState();
                                    }}>Off</button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="option-row flex items-center justify-between">
                                    <span className="text-xs text-slate-300 flex items-center gap-1.5" title="Dynamically merges multiple marbles into combined value marbles to boost performance when full"><Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Dynamic Merge Mode</span>
                                    <div className="bg-white/10 rounded-xl p-0.5 flex">
                                        <button className={`toggle-switch ${gameState.mergeModeEnabled !== false ? 'active' : ''}`} onClick={() => {
                                            engine.state.mergeModeEnabled = true; forceUpdate(); engine.saveState();
                                        }}>On</button>
                                        <button className={`toggle-switch ${gameState.mergeModeEnabled === false ? 'active' : ''}`} onClick={() => {
                                            engine.state.mergeModeEnabled = false; forceUpdate(); engine.saveState();
                                        }}>Off</button>
                                    </div>
                                </div>

                                {gameState.mergeModeEnabled !== false && (
                                    <div className="mt-1 p-2.5 bg-black/40 border border-white/10 rounded-xl flex flex-col gap-2">
                                        <div className="flex flex-col gap-1.5 w-full">
                                            <span className="text-[11px] font-bold text-slate-300">Merge Aggression</span>
                                            <div className="bg-white/10 rounded-lg p-1 grid grid-cols-3 gap-1 w-full">
                                                <button 
                                                    className={`text-[10.5px] font-bold py-1 px-1 rounded-md transition-all text-center flex items-center justify-center cursor-pointer ${
                                                        (gameState.mergeAggression || 'low') === 'low' 
                                                            ? 'bg-white text-black font-black shadow-sm' 
                                                            : 'text-slate-400 hover:text-white'
                                                    }`}
                                                    onClick={() => {
                                                        engine.state.mergeAggression = 'low'; forceUpdate(); engine.saveState();
                                                    }}
                                                >Low</button>
                                                <button 
                                                    className={`text-[10.5px] font-bold py-1 px-1 rounded-md transition-all text-center flex items-center justify-center cursor-pointer ${
                                                        (gameState.mergeAggression || 'low') === 'medium' 
                                                            ? 'bg-white text-black font-black shadow-sm' 
                                                            : 'text-slate-400 hover:text-white'
                                                    }`}
                                                    onClick={() => {
                                                        engine.state.mergeAggression = 'medium'; forceUpdate(); engine.saveState();
                                                    }}
                                                >Medium</button>
                                                <button 
                                                    className={`text-[10.5px] font-bold py-1 px-1 rounded-md transition-all text-center flex items-center justify-center cursor-pointer ${
                                                        (gameState.mergeAggression || 'low') === 'high' 
                                                            ? 'bg-white text-black font-black shadow-sm' 
                                                            : 'text-slate-400 hover:text-white'
                                                    }`}
                                                    onClick={() => {
                                                        engine.state.mergeAggression = 'high'; forceUpdate(); engine.saveState();
                                                    }}
                                                >High</button>
                                            </div>
                                        </div>
                                        <p className="text-[9.5px] text-amber-300/80 leading-snug">
                                            💡 Note: More aggressive merging can increase performance, but may lower income.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="option-row flex items-center justify-between pt-1 border-t border-white/10">
                                <span className="text-xs text-slate-300 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5 text-indigo-400" /> Theme</span>
                                <div className="bg-white/10 rounded-xl p-0.5 flex">
                                    <button className={`toggle-switch ${gameState.activeTheme === 'dark' ? 'active' : ''}`} onClick={() => {
                                        engine.state.activeTheme = 'dark'; forceUpdate(); engine.saveState();
                                    }}>Dark</button>
                                    <button className={`toggle-switch ${gameState.activeTheme === 'purple' ? 'active' : ''}`} onClick={() => {
                                        engine.state.activeTheme = 'purple'; forceUpdate(); engine.saveState();
                                    }}>Purple</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* CATEGORY 4: Cloud Sync & Account Data */}
                <div className="border border-white/10 rounded-xl bg-black/30 overflow-hidden">
                    <button 
                        onClick={() => toggleSection('account')}
                        className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-200 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <Cloud className="w-4 h-4 text-blue-400" />
                            Cloud Sync & Data
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.account ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.account && (
                        <div className="p-3 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Last Cloud Sync</span>
                                <span className={`font-mono font-bold ${gameState.debugMode ? 'text-rose-400' : gameState.isOffline ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {gameState.debugMode ? 'DISABLED (Debug Mode)' : gameState.isOffline ? 'Offline' : lastSyncStr}
                                </span>
                            </div>

                            {!gameState.isOffline && (
                                <button 
                                    className={`btn-pill small w-full flex items-center justify-center gap-2 !py-2 text-xs ${syncing ? 'loading' : ''} ${gameState.debugMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    onClick={handleForceSync}
                                    disabled={syncing || !!gameState.debugMode}
                                >
                                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                                    {gameState.debugMode ? 'Sync Disabled (Debug Mode)' : syncing ? 'Syncing Game State...' : 'Sync Now'}
                                </button>
                            )}

                            <div className="pt-2 border-t border-white/10">
                                <button 
                                    className="reset-btn w-full flex items-center justify-center gap-1.5 !py-2 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer font-bold" 
                                    onClick={onReset}
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Reset Game Progress
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <WebsimAdBanner id="websim-ad-options-panel" type="banner" style={{ marginTop: '12px' }} />
            </div>
        </div>
    );
};

