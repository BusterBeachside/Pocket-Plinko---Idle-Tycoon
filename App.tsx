
import React, { useEffect, useState } from 'react';
import { engine } from './game/engine';
import { motion, AnimatePresence } from 'motion/react';
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
import { UnderdogService } from './services/underdogService';
import { TutorialOverlay, TutorialMenu } from './components/Tutorials';
import { PrestigeOverlay } from './components/PrestigeOverlay';
import { ShardShopModal } from './components/modals/ShardShopModal';
import { CoreModal } from './components/modals/CoreModal';
import { StatsModal } from './components/modals/StatsModal';
import { ResetModal } from './components/modals/ResetModal';
import { AchievementsModal } from './components/modals/AchievementsModal';
import { MissionsModal } from './components/modals/MissionsModal';
import { DebugModal } from './components/modals/DebugModal';
import { LeaderboardModal } from './components/modals/LeaderboardModal';
import { UpgradesPanel } from './components/panels/UpgradesPanel';
import { OptionsPanel } from './components/panels/OptionsPanel';
import { ChallengesPanel } from './components/panels/ChallengesPanel';
import { CHALLENGES, ChallengesManager } from './game/challenges';
import { GemSocketHud } from './components/GemSocketHud';
import { DailyLoginModal } from './components/modals/DailyLoginModal';
import { GoldenBonusModal } from './components/modals/GoldenBonusModal';
import { getTodayDateString } from './game/dailyLoginRewards';
import { ChallengeSummaryModal } from './components/modals/ChallengeSummaryModal';
import { syncAndroidNotifications } from './game/androidNotifications';
import { AdventureLevelInfoModal } from './components/modals/AdventureLevelInfoModal';
import { AdventureLevelModal } from './components/modals/AdventureLevelModal';
import { AdventureVictoryModal } from './components/modals/AdventureVictoryModal';

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
    const [goldenBonusModalOpen, setGoldenBonusModalOpen] = useState(false);
    const [adventureLevelModalOpen, setAdventureLevelModalOpen] = useState(false);
    const [adventureInfoModalOpen, setAdventureInfoModalOpen] = useState(false);
    const [adventureInfoLevelId, setAdventureInfoLevelId] = useState<number | null>(null);

    // Fade Transition Helper
    const runWithFade = (action: () => void) => {
        setFadeActive(true);
        setUiState(prev => ({
            ...prev,
            challengesOpen: false,
            optionsOpen: false,
            upgradesOpen: false
        }));
        engine.audio.fadeSfx(0, 400);

        setTimeout(() => {
            action();
            setGameState({ ...engine.state });
            setTimeout(() => {
                setFadeActive(false);
                engine.audio.fadeSfx(1, 400);
            }, 300);
        }, 450);
    };

    useEffect(() => {
        const introHandler = (e: any) => {
            if (e.detail && e.detail.levelId) {
                setAdventureInfoLevelId(e.detail.levelId);
                setAdventureInfoModalOpen(true);
            }
        };
        window.addEventListener('adventure-board-intro', introHandler);
        return () => window.removeEventListener('adventure-board-intro', introHandler);
    }, []);
    const [started, setStarted] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(true);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [assetsLoaded, setAssetsLoaded] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [toast, setToast] = useState<{msg: string, visible: boolean} | null>(null);
    const [pendingPrestige, setPendingPrestige] = useState<{shards: number, mult: number} | null>(null);
    const initialTutorialSeen = () => {
        return !!(engine.state.tutorials['plinko_tutorial_v1'] || (typeof window !== 'undefined' && localStorage.getItem('plinko_tutorial_v1')));
    };
    const [showTutorial, setShowTutorial] = useState(!initialTutorialSeen());
    
    // New States
    const [tutorialMenuOpen, setTutorialMenuOpen] = useState(false);
    const [specificTutorial, setSpecificTutorial] = useState<any>(null); // keyof ASSET_PATHS
    const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
    const [notifications, setNotifications] = useState(engine.notifications);

    const [dailyEventModalOpen, setDailyEventModalOpen] = useState(false);
    const [debugModalOpen, setDebugModalOpen] = useState(false);
    const [timeLeftStr, setTimeLeftStr] = useState('');
    const [, setDebugUnlocked] = useState(false);

    useEffect(() => {
        let keyBuffer = '';
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
                return;
            }

            if (e.key && e.key.length === 1) {
                keyBuffer += e.key.toLowerCase();
                if (keyBuffer.length > 40) {
                    keyBuffer = keyBuffer.slice(-30);
                }
                if (keyBuffer.includes('busterisawesome')) {
                    (window as any).__FORCE_DEBUG_BUTTON__ = true;
                    setDebugUnlocked(true);
                    keyBuffer = '';
                    setToast({ msg: '🛠️ Debug Mode Button Unlocked!', visible: true });
                    setTimeout(() => {
                        setToast(prev => prev && prev.msg === '🛠️ Debug Mode Button Unlocked!' ? { ...prev, visible: false } : prev);
                    }, 4000);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        syncAndroidNotifications();
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
                    syncAndroidNotifications();
                    if (engine.state.showChallengeSummary) {
                        if (engine.state.inChallengeMode) {
                            engine.running = false; // Pause the plinko board physics loop
                        }
                    }
                    engine.saveState();
                    setGameState({ ...engine.state });
                    engine.notify();
                }
            }
        };
        const interval = setInterval(checkChallengeRotation, 1000);
        return () => clearInterval(interval);
    }, [gameState.inChallengeMode]);

    useEffect(() => {

        // Check for existing session or dynamically handle state updates from the portal
        UnderdogService.addAuthListener(async (u) => {
            console.log("[Underdog Auth] dynamic auth update received:", u);
            if (u) {
                setUser(u);
                setProfile({
                    username: u.username,
                    avatar_url: u.profilePictureUrl
                });
                setAuthModalOpen(false);
                
                // Sync progress with Underdog
                engine.isSyncing = true;
                const syncedState = await UnderdogService.syncData(engine.state);
                if (syncedState) {
                    engine.state = { ...syncedState };
                    engine.state.inChallengeMode = false; // Always default to main board on login/open
                    SaveSystem.calculateDerivedState(engine.state);
                    engine.initPegs();
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

        UnderdogService.getCurrentUser().then(async u => {
            if (u) {
                setUser(u);
                setProfile({
                    username: u.username,
                    avatar_url: u.profilePictureUrl
                });
                setAuthModalOpen(false);
                
                // Sync progress with Underdog
                engine.isSyncing = true;
                const syncedState = await UnderdogService.syncData(engine.state);
                if (syncedState) {
                    engine.state = { ...syncedState };
                    engine.state.inChallengeMode = false; // Always default to main board when opening game while logged in
                    SaveSystem.calculateDerivedState(engine.state);
                    engine.initPegs();
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

        const goldenBonusHandler = () => {
            setGoldenBonusModalOpen(true);
        };
        window.addEventListener('open-golden-bonus-modal', goldenBonusHandler);

        if (typeof window !== 'undefined') {
            const spawnFn = () => {
                console.log("[Pocket Plinko] Spawning Golden Bonus Marble...");
                engine.spawnGoldenBonusMarble(true);
                window.dispatchEvent(new CustomEvent('open-golden-bonus-modal'));
            };
            (window as any).engine = engine;
            (window as any).spawnGoldenBonus = spawnFn;
            (window as any).spawnGoldenBonusMarble = spawnFn;
            try {
                if (window.top && window.top !== window) {
                    (window.top as any).engine = engine;
                    (window.top as any).spawnGoldenBonus = spawnFn;
                    (window.top as any).spawnGoldenBonusMarble = spawnFn;
                }
            } catch (e) {}
        }

        return () => { 
            UnderdogService.removeAuthListener();
            unsub(); 
            window.removeEventListener('request-tutorial', tutorialHandler);
            window.removeEventListener('open-golden-bonus-modal', goldenBonusHandler);
        };
    }, []);

    useEffect(() => {
        if (!started) return;
        if (engine.offlineEarnings > 0) {
            setToast({ msg: `Welcome back! You earned $${engine.offlineEarnings.toLocaleString()} offline.`, visible: true });
            setTimeout(() => setToast(null), 5000);
            engine.offlineEarnings = 0; // clear
        }

        const currentEvent = DailyEventsManager.getCurrentEvent();
        const seen = gameState.tutorials['plinko_tutorial_v1'] || localStorage.getItem('plinko_tutorial_v1');
        if (!seen) {
            // New Player Onboarding takes precedence
            setShowTutorial(true);
            engine.state.lastSeenDailyEventId = currentEvent.id;
            engine.saveState(false);
        } else {
            // Returning Player: Only show daily event if they haven't seen it today
            if (engine.state.lastSeenDailyEventId !== currentEvent.id) {
                setDailyEventModalOpen(true);
                engine.state.lastSeenDailyEventId = currentEvent.id;
                engine.saveState(false);
            }
        }
    }, [started, gameState.tutorials]);

    // Challenge real-time progress notification listeners
    useEffect(() => {
        const handleChallengeNotif = (e: any) => {
            if (!started) return;
            const { msg } = e.detail;
            setToast({ msg, visible: true });
            engine.audio.play('goal_complete');

            setTimeout(() => {
                setToast(prev => prev && prev.msg === msg ? { ...prev, visible: false } : prev);
            }, 4500);
        };
        window.addEventListener('challenge-notif', handleChallengeNotif);
        return () => window.removeEventListener('challenge-notif', handleChallengeNotif);
    }, [started]);

    // Underdog gameplay start/stop menu flow tracker
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
            showTutorial ||
            authModalOpen ||
            gameState.showChallengeSummary;

        if (isMenuOpen) {

        } else {

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
        showTutorial,
        authModalOpen,
        gameState.showChallengeSummary
    ]);

    // Underdog achievement notification happytime celebrator
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

        }
    }, [notifications]);

    // Check for Kinetic Core Tutorial (>= 50 Marbles)
    useEffect(() => {
        if (!started) return;
        const balls = gameState.upgrades.extraBall; // Fixed: Do not add +1, level is the count
        if (balls >= 50 && !gameState.tutorials['plinko_seen_kinetic_tutorial_v1'] && !localStorage.getItem('plinko_seen_kinetic_tutorial_v1')) {
             setSpecificTutorial('tut_kinetic');
        }
    }, [started, gameState.upgrades.extraBall]);

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
            const syncedState = await UnderdogService.syncData(engine.state);
            if (syncedState) {
                engine.state = { ...syncedState };
                engine.state.inChallengeMode = false; // Always default to main board
                SaveSystem.calculateDerivedState(engine.state);
                SaveSystem.saveState(engine.state);
            } else {
                engine.state.inChallengeMode = false;
                SaveSystem.saveState(engine.state);
            }
            engine.isSyncing = false;
            engine.state.isOffline = false;
            // Full reload of the game so that things like peg sockets can be properly setup
            window.location.reload();
        } else {
            engine.state.isOffline = true;
            engine.notify();
        }
    };

    const [fadeActive, setFadeActive] = useState(false);

    const handleToggleChallengeMode = () => {
        setFadeActive(true);
        
        // Immediately close all drawer overlay panels
        setUiState(prev => ({
            ...prev,
            challengesOpen: false,
            optionsOpen: false,
            upgradesOpen: false
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

    const draggingRef = React.useRef<{ [key: string]: boolean }>({});

    const dismissNotification = (id: string) => {
        engine.notifications = engine.notifications.filter(n => n.id !== id);
        setNotifications([...engine.notifications]);
        engine.notify();
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
            
            {started && !isAuthChecking && authModalOpen && (
                <UnderdogAuth 
                    onAuthComplete={handleAuthComplete} 
                    onClose={() => setAuthModalOpen(false)}
                    initialMode={user ? 'profile' : 'login'}
                />
            )}

            {started && uiState.prestigeAnim && <PrestigeOverlay onComplete={completePrestige} />}
            
            {/* Standard First-run Tutorial */}
            {started && showTutorial && !specificTutorial && <TutorialOverlay onClose={() => { 
                setShowTutorial(false); 
                engine.state.tutorials['plinko_tutorial_v1'] = true;
                localStorage.setItem('plinko_tutorial_v1', '1'); 
                engine.saveState(false);
            }} />}
            
            {/* Specific Tutorial from Menu or Logic Trigger */}
            {started && specificTutorial && <TutorialOverlay imageKey={specificTutorial} onClose={handleTutorialClose} />}
            
            {started && toast && <Toast msg={toast.msg} visible={toast.visible} />}
            
            {started && dailyEventModalOpen && !gameState.showChallengeSummary && <DailyEventModal currentEvent={DailyEventsManager.getCurrentEvent()} onClose={() => setDailyEventModalOpen(false)} />}
            {started && uiState.statsOpen && <StatsModal onClose={() => setUiState(s => ({...s, statsOpen: false}))} />}
            {started && uiState.shardShopOpen && <ShardShopModal onClose={() => setUiState(s => ({...s, shardShopOpen: false}))} />}
            {started && uiState.coreModalOpen && <CoreModal onClose={() => setUiState(s => ({...s, coreModalOpen: false}))} onOpenShop={() => setUiState(s => ({...s, coreModalOpen: false, shardShopOpen: true}))} onActivate={handleActivatePrestige} />}
            {started && uiState.achievementsOpen && <AchievementsModal gameState={gameState} onClose={() => setUiState(s => ({...s, achievementsOpen: false}))} />}
            {started && uiState.missionsOpen && <MissionsModal onClose={() => setUiState(s => ({...s, missionsOpen: false}))} />}
            {started && uiState.leaderboardOpen && <LeaderboardModal onClose={() => setUiState(s => ({...s, leaderboardOpen: false}))} />}
            {started && uiState.dailyRewardOpen && <DailyLoginModal gameState={gameState} onClose={() => setUiState(s => ({...s, dailyRewardOpen: false}))} onUpdate={() => setGameState({...engine.state})} />}
            {started && goldenBonusModalOpen && <GoldenBonusModal onClose={() => setGoldenBonusModalOpen(false)} />}
            
            {started && gameState.showChallengeSummary && gameState.pendingChallengeSummary && (
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
            
            {started && tutorialMenuOpen && <TutorialMenu onClose={() => setTutorialMenuOpen(false)} onSelect={(key) => { setTutorialMenuOpen(false); setSpecificTutorial(key); }} />}
            
            {started && resetStep > 0 && <ResetModal step={resetStep as 1|2} onCancel={() => setResetStep(0)} onConfirm={() => {
                if (resetStep === 1) setResetStep(2);
                else {
                    engine.hardReset();
                }
            }} />}

            {started && (
                <div className="notification-layer">
                    <AnimatePresence mode="popLayout">
                        {notifications.map(n => (
                            <motion.div 
                                key={n.id} 
                                drag="x"
                                dragConstraints={{ left: 0, right: 350 }}
                                dragElastic={0.6}
                                onDragStart={() => {
                                    draggingRef.current[n.id] = true;
                                }}
                                onDragEnd={(e, info) => {
                                    if (info.offset.x > 80) {
                                        dismissNotification(n.id);
                                    } else {
                                        setTimeout(() => {
                                            draggingRef.current[n.id] = false;
                                        }, 80);
                                    }
                                }}
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 250, scale: 0.95, transition: { duration: 0.25 } }}
                                className={`notification-item ${n.type === 'multiple_achievements' ? 'achievement cursor-pointer' : n.type} ${n.fading ? 'fading' : ''}`}
                                onClick={() => {
                                    if (draggingRef.current[n.id]) return;
                                    if (n.type === 'multiple_achievements') {
                                        n.expanded = !n.expanded;
                                        setNotifications([...engine.notifications]);
                                        engine.notify();
                                        return;
                                    }
                                    if (n.type === 'mission') setUiState(s => ({ ...s, missionsOpen: true }));
                                    if (n.type === 'achievement') setUiState(s => ({ ...s, achievementsOpen: true }));
                                }}
                                style={{ x: 0 }}
                            >
                                {n.type === 'multiple_achievements' ? (
                                    <div className="flex flex-col gap-2 w-full text-left">
                                        <div className="flex items-center justify-between font-extrabold text-amber-300">
                                            <span className="flex items-center gap-1">🏆 Multiple Achievements Unlocked!</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
                                                {n.expanded ? 'Hide ▴' : `Show (${n.achievements?.length}) ▾`}
                                            </span>
                                        </div>
                                        {n.expanded && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="flex flex-col gap-1 text-[11px] font-medium text-slate-200 pl-2 border-l border-amber-500/30 mt-1"
                                                onClick={(e) => {
                                                    // Prevent outer toggle on list click
                                                    e.stopPropagation();
                                                }}
                                            >
                                                {n.achievements?.map((ach, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 py-0.5">
                                                        <span className="text-amber-400">✦</span> {ach}
                                                    </div>
                                                ))}
                                                <button 
                                                    className="mt-2 text-xs font-black text-black bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 px-3 py-1.5 rounded-lg active:scale-95 transition-all text-center uppercase tracking-wider"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent toggling expand
                                                        setUiState(s => ({ ...s, achievementsOpen: true }));
                                                        dismissNotification(n.id);
                                                    }}
                                                >
                                                    Claim All Rewards
                                                </button>
                                            </motion.div>
                                        )}
                                    </div>
                                ) : (
                                    n.message
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <Header 
                onCoreClick={handleCoreClick} 
                onAuthClick={() => setAuthModalOpen(true)} 
                profile={profile}
                onEventClick={() => setDailyEventModalOpen(true)}
                onChallengeClick={() => togglePanel('challenges')}
                onAdventureDetailsClick={() => {
                    const curLvl = gameState.adventureState?.currentLevel || 1;
                    setAdventureInfoLevelId(curLvl);
                    setAdventureInfoModalOpen(true);
                }}
                onDebugClick={() => setDebugModalOpen(true)}
            />

            {/* Game Mode Selector Bar */}
            <div className="flex justify-center items-center gap-2 py-1.5 bg-slate-950/90 border-b border-slate-800/80 shadow-md z-20">
                <button
                    onClick={() => {
                        if (gameState.gameMode === 'classic') return;
                        runWithFade(() => {
                            engine.setGameMode('classic');
                        });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all border cursor-pointer ${
                        gameState.gameMode === 'classic' || !gameState.gameMode
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800'
                    }`}
                >
                    🎲 Classic Mode
                </button>
                <button
                    onClick={() => {
                        if (gameState.gameMode === 'adventure') return;
                        runWithFade(() => {
                            engine.setGameMode('adventure');
                        });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all border cursor-pointer ${
                        gameState.gameMode === 'adventure'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30 font-black'
                            : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800'
                    }`}
                >
                    🗺️ Adventure Mode
                </button>
            </div>
            
            <div className="main-content">
                <UpgradesPanel 
                    isOpen={uiState.upgradesOpen} 
                    onClose={() => setUiState(prev => ({ ...prev, upgradesOpen: false }))} 
                    gameState={gameState} 
                    onBuy={handleBuy} 
                />

                <ChallengesPanel
                    isOpen={uiState.challengesOpen}
                    onClose={() => setUiState(prev => ({ ...prev, challengesOpen: false }))}
                    gameState={gameState}
                    forceUpdateState={() => setGameState({ ...engine.state })}
                    onToggleChallenge={handleToggleChallengeMode}
                />

                {/* Dismiss Backdrop: closes sidebar panels on click/touch-off */}
                {(uiState.upgradesOpen || uiState.challengesOpen || uiState.optionsOpen) && !engine.socketingActive && (
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
                    {gameState.gameMode !== 'adventure' && (
                        <GemSocketHud onUpdate={() => setGameState({ ...engine.state })} />
                    )}
                    <div className="mobile-controls">
                        <button className="mobile-btn" onClick={() => togglePanel('upgrades')}>⚡ Upgrades</button>
                        {gameState.inChallengeMode ? (() => {
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
                                    style={{ color: '#ef4444' }} 
                                    onClick={handleToggleChallengeMode}
                                >
                                    <span className="text-[10px] font-extrabold leading-none uppercase">🔙 MAIN BOARD</span>
                                    <span className="text-[8.5px] font-mono opacity-80 leading-none mt-0.5">{timeLeftStr}</span>
                                    <div className="flex gap-1 mt-1">
                                        <div className={`w-2 h-2 rounded-full border border-white/20 transition-all ${isBronzeAchieved ? 'bg-[#b45309]' : 'bg-transparent'}`} title="Bronze" />
                                        <div className={`w-2 h-2 rounded-full border border-white/20 transition-all ${isSilverAchieved ? 'bg-[#94a3b8]' : 'bg-transparent'}`} title="Silver" />
                                        <div className={`w-2 h-2 rounded-full border border-white/20 transition-all ${isGoldAchieved ? 'bg-[#fbbf24]' : 'bg-transparent'}`} title="Gold" />
                                    </div>
                                </button>
                            );
                        })() : gameState.gameMode !== 'adventure' ? (() => {
                            const activeRot = ChallengesManager.getRotationInfo();
                            const activeId = activeRot.activeChallengeId;
                            const cState = gameState.challengeState;
                            const hasProgress = !!(
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
                                <button 
                                    className={`mobile-btn flex flex-col items-center justify-center py-1 ${!hasProgress ? 'glow-breathing' : ''}`}
                                    style={{ color: '#f59e0b' }}
                                    onClick={() => togglePanel('challenges')}
                                >
                                    <span className="text-[10px] font-extrabold leading-none uppercase">🏆 Challenge Dome</span>
                                    {hasProgress ? (
                                        <span className="text-[8.5px] font-mono text-emerald-400 font-bold leading-none mt-0.5">In Progress ({timeLeftStr})</span>
                                    ) : (
                                        <span className="text-[8.5px] font-mono opacity-80 leading-none mt-0.5">{timeLeftStr}</span>
                                    )}
                                </button>
                            );
                        })() : null}
                        <button className={`mobile-btn ${(hasClaimableMissions || hasClaimableAchievements || claimableToday) ? 'glow-breathing' : ''}`} onClick={() => togglePanel('options')}>⚙ Options</button>
                    </div>
                </div>

                <OptionsPanel 
                    isOpen={uiState.optionsOpen} 
                    onClose={() => setUiState(prev => ({ ...prev, optionsOpen: false }))} 
                    gameState={gameState}
                    forceUpdate={() => setGameState({...engine.state})}
                    onOpenStats={() => setUiState(s => ({...s, statsOpen: true, optionsOpen: false}))}
                    onOpenTutorials={() => { setTutorialMenuOpen(true); setUiState(s => ({...s, optionsOpen: false})); }}
                    onReset={() => { setResetStep(1); setUiState(s => ({...s, optionsOpen: false})); }}
                    onOpenChallenges={() => togglePanel('challenges')}
                    onToggleChallenge={handleToggleChallengeMode}
                    uiState={uiState}
                    setUiState={setUiState}
                    hasClaimableMissions={hasClaimableMissions}
                    hasClaimableAchievements={hasClaimableAchievements}
                />

                {debugModalOpen && (
                    <DebugModal 
                        onClose={() => setDebugModalOpen(false)}
                        onUpdate={() => setGameState({ ...engine.state })}
                        onTestPrestige={() => handleActivatePrestige(10, 1.5)}
                    />
                )}

                <AdventureLevelModal
                    state={gameState}
                    isOpen={adventureLevelModalOpen}
                    onClose={() => setAdventureLevelModalOpen(false)}
                    onSelectLevel={(lvl) => {
                        runWithFade(() => {
                            engine.startAdventureLevel(lvl);
                        });
                    }}
                />
                <AdventureVictoryModal 
                    onAdvanceLevel={() => {
                        runWithFade(() => {
                            engine.completeAdventureLevel();
                        });
                    }}
                />
                <AdventureLevelInfoModal 
                    levelId={adventureInfoLevelId}
                    isOpen={adventureInfoModalOpen}
                    onClose={() => setAdventureInfoModalOpen(false)}
                />
            </div>
        </div>
    );
};

export default App;
