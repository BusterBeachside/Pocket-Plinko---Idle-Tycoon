
import React, { useEffect, useState } from 'react';
import { engine } from './game/engine';
import { assets } from './game/assets';
import { SaveSystem } from './game/saveSystem';
import './App.css';

import { GameCanvas } from './components/GameCanvas';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { DailyEventsManager } from './game/dailyEvents';
import { DailyEventModal } from './components/modals/DailyEventModal';
import { TitleScreen } from './components/TitleScreen';
import { UnderdogAuth } from './components/UnderdogAuth';
import { Toast } from './components/Toast';
import { CrazyGamesService } from './services/crazyGamesService';
import { TutorialOverlay, TutorialMenu } from './components/Tutorials';
import { PrestigeOverlay } from './components/PrestigeOverlay';
import { ShardShopModal } from './components/modals/ShardShopModal';
import { CoreModal } from './components/modals/CoreModal';
import { StatsModal } from './components/modals/StatsModal';
import { ResetModal } from './components/modals/ResetModal';
import { AchievementsModal } from './components/modals/AchievementsModal';
import { MissionsModal } from './components/modals/MissionsModal';
import { LeaderboardModal } from './components/modals/LeaderboardModal';
import { UpgradesPanel } from './components/panels/UpgradesPanel';
import { OptionsPanel } from './components/panels/OptionsPanel';
import { ChallengesPanel } from './components/panels/ChallengesPanel';
import { CHALLENGES, ChallengesManager } from './game/challenges';
import { GemSocketHud } from './components/GemSocketHud';
import { DailyLoginModal } from './components/modals/DailyLoginModal';
import { getTodayDateString } from './game/dailyLoginRewards';
import { ChallengeSummaryModal } from './components/modals/ChallengeSummaryModal';

const FloatingTextLayer = () => {
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => {
        const handler = (e: any) => {
            const { x, y, text, type } = e.detail;
            const id = Date.now() + Math.random();
            setItems(prev => [...prev, { id, x, y, text, type }]);
            setTimeout(() => {
                setItems(prev => prev.filter(i => i.id !== id));
            }, 1000); 
        };
        window.addEventListener('spawn-floating-text', handler);
        return () => window.removeEventListener('spawn-floating-text', handler);
    }, []);

    return (
        <div className="floating-layer">
            {items.map(i => (
                <div key={i.id} className={`floating-text ${i.type}`} style={{left: i.x, top: i.y}}>
                    {i.text}
                </div>
            ))}
        </div>
    );
};

const App = () => {
    const [gameState, setGameState] = useState(engine.state);
    const [uiState, setUiState] = useState({ upgradesOpen: false, optionsOpen: false, statsOpen: false, shardShopOpen: false, coreModalOpen: false, prestigeAnim: false, achievementsOpen: false, missionsOpen: false, leaderboardOpen: false, challengesOpen: false, dailyRewardOpen: false });
    const [started, setStarted] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(true);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [assetsLoaded, setAssetsLoaded] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [toast, setToast] = useState<{msg: string, visible: boolean} | null>(null);
    const [pendingPrestige, setPendingPrestige] = useState<{shards: number, mult: number} | null>(null);
    const [showTutorial, setShowTutorial] = useState(false);
    
    // New States
    const [tutorialMenuOpen, setTutorialMenuOpen] = useState(false);
    const [specificTutorial, setSpecificTutorial] = useState<any>(null); // keyof ASSET_PATHS
    const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
    const [notifications, setNotifications] = useState(engine.notifications);
    const [dailyEventModalOpen, setDailyEventModalOpen] = useState(false);
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

    useEffect(() => {
        const checkChallengeRotation = () => {
            if (engine.state) {
                const rotationChanged = ChallengesManager.checkAndSyncChallengeState(engine.state);
                if (rotationChanged) {
                    if (engine.state.showChallengeSummary) {
                        if (engine.state.inChallengeMode) {
                            engine.running = false; // Pause the plinko board physics loop
                        }
                        engine.saveState();
                        setGameState({ ...engine.state });
                        engine.notify();
                    }
                }
            }
        };
        const interval = setInterval(checkChallengeRotation, 1000);
        return () => clearInterval(interval);
    }, [gameState.inChallengeMode]);

    useEffect(() => {
        CrazyGamesService.loadingStart();
        // Check for existing session or dynamically handle state updates from the portal
        CrazyGamesService.addAuthListener(async (u) => {
            console.log("[CrazyGames Auth] dynamic auth update received:", u);
            if (u) {
                setUser(u);
                setProfile({
                    username: u.username,
                    avatar_url: u.profilePictureUrl
                });
                setAuthModalOpen(false);
                
                // Sync progress with CrazyGames
                engine.isSyncing = true;
                const syncedState = await CrazyGamesService.syncData(engine.state);
                if (syncedState) {
                    engine.state = { ...syncedState };
                    SaveSystem.calculateDerivedState(engine.state);
                    engine.notify();
                }
                engine.isSyncing = false;
                engine.state.isOffline = false;
                engine.notify();
            } else {
                setUser(null);
                setProfile(null);
                engine.state.isOffline = true;
                engine.notify();
            }
            setIsAuthChecking(false);
        });

        CrazyGamesService.getCurrentUser().then(async u => {
            if (u) {
                setUser(u);
                setProfile({
                    username: u.username,
                    avatar_url: u.profilePictureUrl
                });
                setAuthModalOpen(false);
                
                // Sync progress with CrazyGames
                engine.isSyncing = true;
                const syncedState = await CrazyGamesService.syncData(engine.state);
                if (syncedState) {
                    engine.state = { ...syncedState };
                    SaveSystem.calculateDerivedState(engine.state);
                    engine.notify();
                }
                engine.isSyncing = false;
                engine.state.isOffline = false;
                engine.notify();
            } else {
                // Bypass login screen under guest (Local Only) status
                setAuthModalOpen(false);
                engine.state.isOffline = true;
                engine.notify();
            }
            setIsAuthChecking(false);
        });

        // Combined loading for images and audio
        let imgProgress = 0;
        let audioProgress = 0;
        
        const update = () => {
            // Rough weighting: Audio is often larger/slower
            setLoadProgress((imgProgress * 0.3) + (audioProgress * 0.7));
        };

        const pImages = assets.loadAll((p) => { imgProgress = p; update(); });
        const pAudio = engine.audio.loadAll((p) => { audioProgress = p; update(); });

        Promise.all([pImages, pAudio]).then(() => {
            setLoadProgress(1);
            setAssetsLoaded(true);
            CrazyGamesService.loadingStop();
        });
        
        // Use Subscription for updates
        const unsub = engine.subscribe(() => {
            setGameState({ ...engine.state });
            setNotifications([...engine.notifications]);
        });
        
        // Listen for tutorial requests from engine or components
        const tutorialHandler = (e: any) => {
            const key = e.detail?.key;
            if (key) setSpecificTutorial(key);
        };
        window.addEventListener('request-tutorial', tutorialHandler);

        return () => { 
            CrazyGamesService.removeAuthListener();
            unsub(); 
            window.removeEventListener('request-tutorial', tutorialHandler);
        };
    }, []);

    useEffect(() => {
        if (!started) return;
        if (engine.offlineEarnings > 0) {
            setToast({ msg: `Welcome back! You earned $${engine.offlineEarnings.toLocaleString()} offline.`, visible: true });
            setTimeout(() => setToast(null), 5000);
            engine.offlineEarnings = 0; // clear
        }

        // Check if there is an unannounced Daily Event
        const currentEvent = DailyEventsManager.getCurrentEvent();
        if (engine.state.lastSeenDailyEventId !== currentEvent.id) {
            const isFirstLogin = !localStorage.getItem('plinko_react_v1');
            if (!isFirstLogin) {
                setDailyEventModalOpen(true);
            }
            engine.state.lastSeenDailyEventId = currentEvent.id;
            engine.saveState(false);
        }

        const seen = gameState.tutorials['plinko_tutorial_v1'] || localStorage.getItem('plinko_tutorial_v1');
        if (!seen) { setTimeout(() => setShowTutorial(true), 500); }
    }, [started, gameState.tutorials]);

    // Challenge real-time progress notification listeners
    useEffect(() => {
        const handleChallengeNotif = (e: any) => {
            const { msg } = e.detail;
            setToast({ msg, visible: true });
            engine.audio.play('goal_complete');
            CrazyGamesService.happytime();
            setTimeout(() => {
                setToast(prev => prev && prev.msg === msg ? { ...prev, visible: false } : prev);
            }, 4500);
        };
        window.addEventListener('challenge-notif', handleChallengeNotif);
        return () => window.removeEventListener('challenge-notif', handleChallengeNotif);
    }, []);

    // CrazyGames gameplay start/stop menu flow tracker
    useEffect(() => {
        if (!started) return;
        const isMenuOpen = 
            uiState.upgradesOpen || 
            uiState.optionsOpen || 
            uiState.challengesOpen || 
            uiState.statsOpen || 
            uiState.shardShopOpen || 
            uiState.coreModalOpen || 
            uiState.achievementsOpen || 
            uiState.missionsOpen || 
            uiState.leaderboardOpen || 
            uiState.dailyRewardOpen || 
            tutorialMenuOpen || 
            dailyEventModalOpen || 
            authModalOpen;

        if (isMenuOpen) {
            CrazyGamesService.gameplayStop();
        } else {
            CrazyGamesService.gameplayStart();
        }
    }, [
        started,
        uiState.upgradesOpen,
        uiState.optionsOpen,
        uiState.challengesOpen,
        uiState.statsOpen,
        uiState.shardShopOpen,
        uiState.coreModalOpen,
        uiState.achievementsOpen,
        uiState.missionsOpen,
        uiState.leaderboardOpen,
        uiState.dailyRewardOpen,
        tutorialMenuOpen,
        dailyEventModalOpen,
        authModalOpen
    ]);

    // CrazyGames achievement notification happytime celebrator
    const seenNotificationIds = React.useRef(new Set<string>());
    useEffect(() => {
        let hasNewAchievement = false;
        notifications.forEach(n => {
            if (!seenNotificationIds.current.has(n.id)) {
                seenNotificationIds.current.add(n.id);
                if (n.type === 'achievement') {
                    hasNewAchievement = true;
                }
            }
        });
        if (hasNewAchievement) {
            CrazyGamesService.happytime();
        }
    }, [notifications]);

    // Check for Kinetic Core Tutorial (>= 50 Marbles)
    useEffect(() => {
        const balls = gameState.upgrades.extraBall; // Fixed: Do not add +1, level is the count
        if (balls >= 50 && !gameState.tutorials['plinko_seen_kinetic_tutorial_v1'] && !localStorage.getItem('plinko_seen_kinetic_tutorial_v1')) {
             setSpecificTutorial('tut_kinetic');
        }
    }, [gameState.upgrades.extraBall]);

    const togglePanel = (panel: 'upgrades' | 'options' | 'challenges') => {
        setUiState(prev => ({
            ...prev,
            upgradesOpen: panel === 'upgrades' ? !prev.upgradesOpen : false,
            optionsOpen: panel === 'options' ? !prev.optionsOpen : false,
            challengesOpen: panel === 'challenges' ? !prev.challengesOpen : false
        }));
    };

    const handleStart = async () => {
        if (!assetsLoaded) return;
        // Resume context on user gesture
        await engine.audio.init(); 
        engine.audio.startMusic();
        engine.start();
        setStarted(true);
        CrazyGamesService.gameplayStart();
        // Apply saved volumes
        setTimeout(() => {
            engine.audio.setSfxVolume(engine.state.sfxVolume);
            engine.audio.setMusicVolume(engine.state.musicVolume);
            engine.audio.toggleSfxMute(engine.state.sfxMuted);
            engine.audio.toggleMusicMute(engine.state.musicMuted);
        }, 50);
    };

    const handleAuthComplete = async (u: any, offline: boolean) => {
        setUser(u);
        setAuthModalOpen(false);
        
        if (u) {
            setProfile({
                username: u.username,
                avatar_url: u.profilePictureUrl
            });
            // Sync current local progress to cloud (as requested)
            engine.isSyncing = true;
            const syncedState = await CrazyGamesService.syncData(engine.state);
            if (syncedState) {
                engine.state = { ...syncedState };
                SaveSystem.calculateDerivedState(engine.state);
                engine.notify();
            }
            engine.isSyncing = false;
            engine.state.isOffline = false;
            engine.notify();
        } else {
            engine.state.isOffline = true;
            engine.notify();
        }
    };

    const [fadeActive, setFadeActive] = useState(false);

    const handleToggleChallengeMode = () => {
        setFadeActive(true);
        
        // Immediately close the Challenge Dome panel
        setUiState(prev => ({
            ...prev,
            challengesOpen: false
        }));

        // Smoothly fade out sound effects over 800ms
        engine.audio.fadeSfx(0, 800);

        setTimeout(() => {
            // Respawn all broken pegs from Sand Peg (or other states) immediately on scene switch
            engine.respawnAllPegs();
            
            // Clear income buffer to ensure no leak into challenges, but preserve main board's persistent stats
            engine.incomeBuffer = 0;
            engine.socketingActive = false; // Turn off gem socketing view
            
            // Check & apply offline income for either layer before toggling state
            engine.applyAllOfflineIncome(false);
            
            engine.state.inChallengeMode = !engine.state.inChallengeMode;
            ChallengesManager.checkAndSyncChallengeState(engine.state);
            
            // Re-sync socketed pegs to correctly apply or strip gem modifiers
            engine.syncSocketedPegs();
            
            engine.balls = []; // Clear existing balls
            engine.saveState();
            setGameState({ ...engine.state });
            engine.notify();
            
            setTimeout(() => {
                setFadeActive(false);
                // Smoothly fade sound effects back in over 800ms once board is visible
                engine.audio.fadeSfx(1, 800);
            }, 400);
        }, 1200);
    };

    const handleBuy = (id: any) => {
        if (gameState.inChallengeMode) {
            if (ChallengesManager.buyUpgrade(engine.state, id)) {
                engine.audio.play('upgrade');
                engine.saveState();
                setGameState({ ...engine.state });
                engine.notify();
            }
        } else {
            engine.buyUpgrade(id);
        }
    };

    const handleCoreClick = () => { 
        if (gameState.inChallengeMode) return;
        setUiState(s => ({ ...s, coreModalOpen: true })); 
    };
    const handleActivatePrestige = (shards: number, mult: number) => {
        setPendingPrestige({ shards, mult });
        setUiState(s => ({ ...s, coreModalOpen: false, prestigeAnim: true }));
    };
    const completePrestige = () => {
        if (pendingPrestige) { engine.resetForPrestige(pendingPrestige.shards, pendingPrestige.mult); }
        setPendingPrestige(null);
        setUiState(s => ({ ...s, prestigeAnim: false }));
        CrazyGamesService.happytime();
    };

    const handleTutorialClose = () => {
        const current = specificTutorial;
        // Mark current as seen
        if (current === 'tut_bonus') {
            engine.state.tutorials['plinko_seen_bonus_tutorial_v1'] = true;
            localStorage.setItem('plinko_seen_bonus_tutorial_v1', '1');
        }
        if (current === 'tut_kinetic') {
            engine.state.tutorials['plinko_seen_kinetic_tutorial_v1'] = true;
            localStorage.setItem('plinko_seen_kinetic_tutorial_v1', '1');
        }
        if (current === 'tut_shard') {
            engine.state.tutorials['plinko_seen_shardshop_tutorial_v1'] = true;
            localStorage.setItem('plinko_seen_shardshop_tutorial_v1', '1');
        }
        if (current === 'tut_skins') {
            engine.state.tutorials['plinko_seen_shardshop_skins_tutorial_v1'] = true;
            localStorage.setItem('plinko_seen_shardshop_skins_tutorial_v1', '1');
        }
        if (current === 'tut_sockets') {
            engine.state.tutorials['plinko_seen_sockets_tutorial_v1'] = true;
            localStorage.setItem('plinko_seen_sockets_tutorial_v1', '1');
        }
        engine.saveState(false);

        // Unpause bonus marble if that was the tutorial
        if (current === 'tut_bonus') {
            engine.unpauseBonusMarble();
        }
        
        // Chain Shard -> Skins tutorial
        if (current === 'tut_shard') {
            if (!engine.state.tutorials['plinko_seen_shardshop_skins_tutorial_v1'] && !localStorage.getItem('plinko_seen_shardshop_skins_tutorial_v1')) {
                setSpecificTutorial(null); // Close current first to allow fade out
                setTimeout(() => setSpecificTutorial('tut_skins'), 300); 
                return;
            }
        }
        
        setSpecificTutorial(null);
    };

    const isPurple = gameState.activeTheme === 'purple';

    const hasClaimableMissions = [...gameState.missions.activeDailies, ...gameState.missions.activeRepeatables].some(m => m.completed && !m.claimed);
    const hasClaimableAchievements = Object.values(gameState.achievements).some(a => (a === true || (a && a.completed)) && !(a && a.claimed));
    const claimableToday = gameState.dailyLogin?.lastClaimedDate !== getTodayDateString();

    return (
        <div className={`app-container ${isPurple ? 'theme-purple' : 'theme-dark'}`}>
            {/* Visual Board-Switch Transition Overlay */}
            <div 
                className={`fixed inset-0 bg-black z-[99999] pointer-events-none transition-opacity duration-[800ms] ${
                    fadeActive ? 'opacity-100' : 'opacity-0'
                }`}
            />

            {!started && <TitleScreen onStart={handleStart} loading={!assetsLoaded} progress={loadProgress} />}
            
            {!isAuthChecking && authModalOpen && (
                <UnderdogAuth 
                    onAuthComplete={handleAuthComplete} 
                    onClose={() => setAuthModalOpen(false)}
                    initialMode={user ? 'profile' : 'login'}
                />
            )}

            {uiState.prestigeAnim && <PrestigeOverlay onComplete={completePrestige} />}
            
            {/* Standard First-run Tutorial */}
            {started && showTutorial && !specificTutorial && <TutorialOverlay onClose={() => { 
                setShowTutorial(false); 
                engine.state.tutorials['plinko_tutorial_v1'] = true;
                localStorage.setItem('plinko_tutorial_v1', '1'); 
                engine.saveState(false);
            }} />}
            
            {/* Specific Tutorial from Menu or Logic Trigger */}
            {started && specificTutorial && <TutorialOverlay imageKey={specificTutorial} onClose={handleTutorialClose} />}
            
            {toast && <Toast msg={toast.msg} visible={toast.visible} />}
            
            {dailyEventModalOpen && <DailyEventModal currentEvent={DailyEventsManager.getCurrentEvent()} onClose={() => setDailyEventModalOpen(false)} />}
            {uiState.statsOpen && <StatsModal onClose={() => setUiState(s => ({...s, statsOpen: false}))} />}
            {uiState.shardShopOpen && <ShardShopModal onClose={() => setUiState(s => ({...s, shardShopOpen: false}))} />}
            {uiState.coreModalOpen && <CoreModal onClose={() => setUiState(s => ({...s, coreModalOpen: false}))} onOpenShop={() => setUiState(s => ({...s, coreModalOpen: false, shardShopOpen: true}))} onActivate={handleActivatePrestige} />}
            {uiState.achievementsOpen && <AchievementsModal gameState={gameState} onClose={() => setUiState(s => ({...s, achievementsOpen: false}))} />}
            {uiState.missionsOpen && <MissionsModal onClose={() => setUiState(s => ({...s, missionsOpen: false}))} />}
            {uiState.leaderboardOpen && <LeaderboardModal onClose={() => setUiState(s => ({...s, leaderboardOpen: false}))} />}
            {uiState.dailyRewardOpen && <DailyLoginModal gameState={gameState} onClose={() => setUiState(s => ({...s, dailyRewardOpen: false}))} onUpdate={() => setGameState({...engine.state})} />}
            
            {gameState.showChallengeSummary && gameState.pendingChallengeSummary && (
                <ChallengeSummaryModal 
                    summary={gameState.pendingChallengeSummary} 
                    onClose={() => {
                        engine.state.inChallengeMode = false;
                        engine.state.showChallengeSummary = false;
                        engine.state.pendingChallengeSummary = undefined;
                        engine.balls = [];
                        engine.respawnAllPegs();
                        ChallengesManager.checkAndSyncChallengeState(engine.state);
                        engine.syncSocketedPegs();
                        engine.running = true;
                        engine.saveState();
                        setGameState({ ...engine.state });
                        engine.notify();
                    }}
                />
            )}
            
            {tutorialMenuOpen && <TutorialMenu onClose={() => setTutorialMenuOpen(false)} onSelect={(key) => { setTutorialMenuOpen(false); setSpecificTutorial(key); }} />}
            
            {resetStep > 0 && <ResetModal step={resetStep as 1|2} onCancel={() => setResetStep(0)} onConfirm={() => {
                if (resetStep === 1) setResetStep(2);
                else {
                    engine.hardReset();
                }
            }} />}

            <div className="notification-layer">
                {notifications.map(n => (
                    <div 
                        key={n.id} 
                        className={`notification-item ${n.type} ${n.fading ? 'fading' : ''}`}
                        onClick={() => {
                            if (n.type === 'mission') setUiState(s => ({ ...s, missionsOpen: true }));
                            if (n.type === 'achievement') setUiState(s => ({ ...s, achievementsOpen: true }));
                        }}
                    >
                        {n.message}
                    </div>
                ))}
            </div>

            <Header 
                onCoreClick={handleCoreClick} 
                onAuthClick={() => setAuthModalOpen(true)} 
                profile={profile}
                onEventClick={() => setDailyEventModalOpen(true)}
                onChallengeClick={() => togglePanel('challenges')}
            />
            
            <div className="main-content">
                <UpgradesPanel 
                    isOpen={uiState.upgradesOpen} 
                    onClose={() => togglePanel('upgrades')} 
                    gameState={gameState} 
                    onBuy={handleBuy} 
                />

                <ChallengesPanel
                    isOpen={uiState.challengesOpen}
                    onClose={() => togglePanel('challenges')}
                    gameState={gameState}
                    forceUpdateState={() => setGameState({ ...engine.state })}
                    onToggleChallenge={handleToggleChallengeMode}
                />

                {/* Dismiss Backdrop: closes sidebar panels on click/touch-off */}
                {(uiState.upgradesOpen || uiState.challengesOpen || uiState.optionsOpen) && (
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[90] cursor-pointer" 
                        onClick={() => {
                            setUiState(prev => ({
                                ...prev,
                                upgradesOpen: false,
                                challengesOpen: false,
                                optionsOpen: false
                            }));
                        }}
                    />
                )}

                <div className="game-area">
                    <StatsBar />
                    <FloatingTextLayer />
                    <GameCanvas inChallengeMode={gameState.inChallengeMode} />
                    <GemSocketHud onUpdate={() => setGameState({ ...engine.state })} />
                    <div className="mobile-controls">
                        <button className="mobile-btn" onClick={() => togglePanel('upgrades')}>⚡ Upgrades</button>
                        {gameState.inChallengeMode && (() => {
                            const activeRot = ChallengesManager.getRotationInfo();
                            const activeChall = CHALLENGES[activeRot.activeChallengeId];
                            const challengeState = gameState.challengeState || { money: 0, lifetimeEarnings: 0, lifetimePegsBroken: 0 };
                            const trackerMetric = activeChall.goals.bronze.metric;
                            const currentVal = trackerMetric === 'pegsBroken' ? (challengeState.lifetimePegsBroken || 0) : ((challengeState as any).lifetimeEarnings || challengeState.money || 0);

                            const isBronzeAchieved = currentVal >= activeChall.goals.bronze.target;
                            const isSilverAchieved = currentVal >= activeChall.goals.silver.target;
                            const isGoldAchieved = currentVal >= activeChall.goals.gold.target;

                            return (
                                <button 
                                    className="mobile-btn flex flex-col items-center justify-center py-1" 
                                    style={{ color: '#f59e0b' }} 
                                    onClick={() => togglePanel('challenges')}
                                >
                                    <span className="text-[10px] font-extrabold leading-none uppercase">🏆 Challenge</span>
                                    <span className="text-[8.5px] font-mono opacity-80 leading-none mt-0.5">{timeLeftStr}</span>
                                    <div className="flex gap-1 mt-1">
                                        <div className={`w-2 h-2 rounded-full border border-white/20 transition-all ${isBronzeAchieved ? 'bg-[#b45309]' : 'bg-transparent'}`} title="Bronze" />
                                        <div className={`w-2 h-2 rounded-full border border-white/20 transition-all ${isSilverAchieved ? 'bg-[#94a3b8]' : 'bg-transparent'}`} title="Silver" />
                                        <div className={`w-2 h-2 rounded-full border border-white/20 transition-all ${isGoldAchieved ? 'bg-[#fbbf24]' : 'bg-transparent'}`} title="Gold" />
                                    </div>
                                </button>
                            );
                        })()}
                        <button className={`mobile-btn ${(hasClaimableMissions || hasClaimableAchievements || claimableToday) ? 'glow-breathing' : ''}`} onClick={() => togglePanel('options')}>⚙ Options</button>
                    </div>
                </div>

                <OptionsPanel 
                    isOpen={uiState.optionsOpen} 
                    onClose={() => togglePanel('options')} 
                    gameState={gameState}
                    forceUpdate={() => setGameState({...engine.state})}
                    onOpenStats={() => setUiState(s => ({...s, statsOpen: true, optionsOpen: false}))}
                    onOpenTutorials={() => { setTutorialMenuOpen(true); setUiState(s => ({...s, optionsOpen: false})); }}
                    onReset={() => { setResetStep(1); setUiState(s => ({...s, optionsOpen: false})); }}
                    onOpenChallenges={() => togglePanel('challenges')}
                    uiState={uiState}
                    setUiState={setUiState}
                    hasClaimableMissions={hasClaimableMissions}
                    hasClaimableAchievements={hasClaimableAchievements}
                />
            </div>
        </div>
    );
};

export default App;
