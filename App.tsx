import React, { useEffect, useState } from 'react';
import { engine } from './game/engine';
import { assets } from './game/assets';
import './App.css';

import { GameCanvas } from './components/GameCanvas';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { TitleScreen } from './components/TitleScreen';
import { Toast } from './components/Toast';
import { TutorialOverlay, TutorialMenu } from './components/Tutorials';
import { PrestigeOverlay } from './components/PrestigeOverlay';
import { ShardShopModal } from './components/modals/ShardShopModal';
import { CoreModal } from './components/modals/CoreModal';
import { StatsModal } from './components/modals/StatsModal';
import { ResetModal } from './components/modals/ResetModal';
import { UpgradesPanel } from './components/panels/UpgradesPanel';
import { OptionsPanel } from './components/panels/OptionsPanel';

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
    const [uiState, setUiState] = useState({ upgradesOpen: false, optionsOpen: false, statsOpen: false, shardShopOpen: false, coreModalOpen: false, prestigeAnim: false });
    const [started, setStarted] = useState(false);
    const [assetsLoaded, setAssetsLoaded] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [toast, setToast] = useState<{msg: string, visible: boolean} | null>(null);
    const [pendingPrestige, setPendingPrestige] = useState<{shards: number, mult: number} | null>(null);
    const [showTutorial, setShowTutorial] = useState(false);
    
    // New States
    const [tutorialMenuOpen, setTutorialMenuOpen] = useState(false);
    const [specificTutorial, setSpecificTutorial] = useState<any>(null); // keyof ASSET_PATHS
    const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);

    useEffect(() => {
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
        });
        
        // Listen for tutorial requests from engine or components
        const tutorialHandler = (e: any) => {
            const key = e.detail?.key;
            if (key) setSpecificTutorial(key);
        };
        window.addEventListener('request-tutorial', tutorialHandler);

        return () => { 
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
        const seen = localStorage.getItem('plinko_tutorial_v1');
        if (!seen) { setTimeout(() => setShowTutorial(true), 500); }
    }, [started]);

    // Check for Kinetic Core Tutorial (>= 50 Marbles)
    useEffect(() => {
        const balls = 1 + gameState.upgrades.extraBall;
        if (balls >= 50 && !localStorage.getItem('plinko_seen_kinetic_tutorial_v1')) {
             setSpecificTutorial('tut_kinetic');
        }
    }, [gameState.upgrades.extraBall]);

    const togglePanel = (panel: 'upgrades' | 'options') => {
        setUiState(prev => ({
            ...prev,
            upgradesOpen: panel === 'upgrades' ? !prev.upgradesOpen : false,
            optionsOpen: panel === 'options' ? !prev.optionsOpen : false
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

    const handleBuy = (id: any) => { engine.buyUpgrade(id); };
    const handleCoreClick = () => { setUiState(s => ({ ...s, coreModalOpen: true })); };
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
        if (current === 'tut_bonus') localStorage.setItem('plinko_seen_bonus_tutorial_v1', '1');
        if (current === 'tut_kinetic') localStorage.setItem('plinko_seen_kinetic_tutorial_v1', '1');
        if (current === 'tut_shard') localStorage.setItem('plinko_seen_shardshop_tutorial_v1', '1');
        if (current === 'tut_skins') localStorage.setItem('plinko_seen_shardshop_skins_tutorial_v1', '1');

        // Unpause bonus marble if that was the tutorial
        if (current === 'tut_bonus') {
            engine.unpauseBonusMarble();
        }
        
        // Chain Shard -> Skins tutorial
        if (current === 'tut_shard') {
            if (!localStorage.getItem('plinko_seen_shardshop_skins_tutorial_v1')) {
                setSpecificTutorial(null); // Close current first to allow fade out
                setTimeout(() => setSpecificTutorial('tut_skins'), 300); 
                return;
            }
        }
        
        setSpecificTutorial(null);
    };

    const isPurple = gameState.activeTheme === 'purple';

    return (
        <div className={`app-container ${isPurple ? 'theme-purple' : 'theme-dark'}`}>
            {!started && <TitleScreen onStart={handleStart} loading={!assetsLoaded} progress={loadProgress} />}
            {uiState.prestigeAnim && <PrestigeOverlay onComplete={completePrestige} />}
            
            {/* Standard First-run Tutorial */}
            {started && showTutorial && !specificTutorial && <TutorialOverlay onClose={() => { setShowTutorial(false); localStorage.setItem('plinko_tutorial_v1', '1'); }} />}
            
            {/* Specific Tutorial from Menu or Logic Trigger */}
            {started && specificTutorial && <TutorialOverlay imageKey={specificTutorial} onClose={handleTutorialClose} />}
            
            {toast && <Toast msg={toast.msg} visible={toast.visible} />}
            
            {uiState.statsOpen && <StatsModal onClose={() => setUiState(s => ({...s, statsOpen: false}))} />}
            {uiState.shardShopOpen && <ShardShopModal onClose={() => setUiState(s => ({...s, shardShopOpen: false}))} />}
            {uiState.coreModalOpen && <CoreModal onClose={() => setUiState(s => ({...s, coreModalOpen: false}))} onOpenShop={() => setUiState(s => ({...s, coreModalOpen: false, shardShopOpen: true}))} onActivate={handleActivatePrestige} />}
            
            {tutorialMenuOpen && <TutorialMenu onClose={() => setTutorialMenuOpen(false)} onSelect={(key) => { setTutorialMenuOpen(false); setSpecificTutorial(key); }} />}
            
            {resetStep > 0 && <ResetModal step={resetStep as 1|2} onCancel={() => setResetStep(0)} onConfirm={() => {
                if (resetStep === 1) setResetStep(2);
                else {
                    localStorage.clear();
                    location.reload();
                }
            }} />}

            <Header onCoreClick={handleCoreClick} />
            
            <div className="main-content">
                <UpgradesPanel 
                    isOpen={uiState.upgradesOpen} 
                    onClose={() => togglePanel('upgrades')} 
                    gameState={gameState} 
                    onBuy={handleBuy} 
                />

                <div className="game-area">
                    <StatsBar />
                    <FloatingTextLayer />
                    <GameCanvas />
                    <div className="mobile-controls">
                        <button className="mobile-btn" onClick={() => togglePanel('upgrades')}>⚡ Upgrades</button>
                        <button className="mobile-btn" onClick={() => setUiState(s => ({...s, statsOpen: true}))}>📊 Stats</button>
                        <button className="mobile-btn" onClick={() => togglePanel('options')}>⚙ Options</button>
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
                />
            </div>
        </div>
    );
};

export default App;