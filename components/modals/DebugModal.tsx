import React, { useState } from 'react';
import { 
    X, Bug, Zap, Plus, RefreshCw, Trash2, Sparkles, 
    Calendar, Trophy, Gift, Gauge, Flame, ShieldAlert, Globe, RotateCcw,
    Compass, Play, MapPin
} from 'lucide-react';
import { engine } from '../../game/engine';
import { SaveSystem } from '../../game/saveSystem';
import { DailyEventsManager } from '../../game/dailyEvents';
import { ChallengesManager } from '../../game/challenges';
import { ProgressionManager } from '../../game/progression';
import { AdventureLevelsManager } from '../../game/adventureLevels';
import { UnderdogService } from '../../services/underdogService';
import { formatNumber } from '../../game/utils';

interface DebugModalProps {
    onClose: () => void;
    onUpdate: () => void;
    onTestPrestige: () => void;
}

export const DebugModal: React.FC<DebugModalProps> = ({ onClose, onUpdate, onTestPrestige }) => {
    const state = engine.state;
    const isDebugActive = !!state.debugMode;

    const [moneyInput, setMoneyInput] = useState('1000000');
    const [shardsInput, setShardsInput] = useState('1000');
    const [marblesInput, setMarblesInput] = useState('10');
    const [masterInput, setMasterInput] = useState('5');
    const [isWebsimMode, setIsWebsimMode] = useState(() => UnderdogService.isWebsim());
    const [isDoubleSpeed, setIsDoubleSpeed] = useState(() => engine.debugDoubleSpeed);
    const [selectedLevelId, setSelectedLevelId] = useState<number>(() => state.adventureState?.currentLevel || 1);
    const [customLevelInput, setCustomLevelInput] = useState<string>('1');

    const refreshApp = () => {
        onUpdate();
        engine.notify();
    };

    const handleStartAdventureLevel = (lvl: number) => {
        const validLevel = Math.max(1, lvl);
        engine.startAdventureLevel(validLevel);
        setSelectedLevelId(validLevel);
        setCustomLevelInput(String(validLevel));
        refreshApp();
    };

    const enableDebugMode = () => {
        if (state.debugMode) return;
        // Instantly take a snapshot of clean state in local storage BEFORE activating Debug Mode
        SaveSystem.saveState(state);
        state.debugMode = true;
        (window as any).__DEBUG_MODE__ = true;
        refreshApp();
    };

    const disableDebugMode = () => {
        if (!state.debugMode) return;
        state.debugMode = false;
        (window as any).__DEBUG_MODE__ = false;
        DailyEventsManager.debugOverrideEventIndex = null;
        ChallengesManager.debugOverrideChallengeId = null;

        // Restore progress clean snapshot from local storage
        const restored = SaveSystem.loadState();
        Object.assign(state, restored);
        state.debugMode = false;
        engine.respawnAllPegs();
        engine.syncSocketedPegs();
        SaveSystem.saveState(state);
        
        // Force refresh game to remove any lingering debug effects
        window.location.reload();
    };

    const handleAddMoney = () => {
        const val = Number(moneyInput);
        if (isNaN(val) || val <= 0) return;

        if (state.inChallengeMode && state.challengeState) {
            state.challengeState.money = (state.challengeState.money || 0) + val;
            state.challengeState.lifetimeEarnings = (state.challengeState.lifetimeEarnings || 0) + val;
        } else {
            engine.addMoney(val, true);
        }
        engine.saveState(false);
        refreshApp();
    };

    const handleAddShards = () => {
        const val = Number(shardsInput);
        if (isNaN(val) || val <= 0) return;

        state.kineticShards = (state.kineticShards || 0) + val;
        engine.saveState(false);
        refreshApp();
    };

    const handleSetMarbles = () => {
        const val = Math.max(1, Math.floor(Number(marblesInput)));
        if (isNaN(val)) return;

        if (state.inChallengeMode && state.challengeState) {
            state.challengeState.upgrades.extraBall = val;
        } else {
            state.upgrades.extraBall = val;
        }
        engine.balls = [];
        engine.saveState(false);
        refreshApp();
    };

    const handleSetMasterMarbles = () => {
        const val = Math.max(0, Math.floor(Number(masterInput)));
        if (isNaN(val)) return;

        state.masterMultiplier = val;
        engine.balls = [];
        engine.saveState(false);
        refreshApp();
    };

    const handleResetUpgrades = () => {
        if (state.inChallengeMode && state.challengeState) {
            state.challengeState.upgrades = {
                extraBall: state.challengeState.challengeId === 'micro_mania' ? 0 : 1,
                pegValue: 0,
                ballSpeed: 0,
                basketValue: 0,
                uncommonChance: 0,
                rareChance: 0,
                legendaryChance: 0,
                criticalChance: 0,
                microValue: 0,
                bonusValue: 0,
                sandPegMultiplier: 0,
                microAutoclicker: 0
            };
        } else {
            state.upgrades = {
                extraBall: 1,
                pegValue: 0,
                ballSpeed: 0,
                basketValue: 0,
                uncommonChance: 0,
                rareChance: 0,
                legendaryChance: 0,
                criticalChance: 0,
                microValue: 0,
                bonusValue: 0
            };
        }
        engine.respawnAllPegs();
        engine.syncSocketedPegs();
        engine.saveState(false);
        refreshApp();
    };

    const handleResetShardShop = () => {
        state.permUpgradesLevels = {};
        state.permanentIncomeBoostPercent = 0;
        engine.saveState(false);
        refreshApp();
    };

    const handleRemoveSkins = () => {
        state.ownedMarbles = ['tie_dye_1'];
        state.activeMarbleSkinID = 'tie_dye_1';
        engine.saveState(false);
        refreshApp();
    };

    const handleRemoveGems = () => {
        engine.pegs.forEach(p => {
            p.gemType = null;
        });
        state.socketedPegs = {};
        state.gems = { crimson: 0, azure: 0, amber: 0 };
        engine.syncSocketedPegs();
        engine.saveState(false);
        refreshApp();
    };

    const handleToggleWebsimMode = () => {
        const next = !isWebsimMode;
        (window as any).__FORCE_WEBSIM_MODE__ = next;
        localStorage.setItem('debug_force_websim', next ? 'true' : 'false');
        setIsWebsimMode(next);
        refreshApp();
    };

    const handleTestPrestige = () => {
        onClose();
        const wasDebug = state.debugMode;
        onTestPrestige();
        if (wasDebug) {
            state.debugMode = true;
            (window as any).__DEBUG_MODE__ = true;
            refreshApp();
        }
    };

    const handleSpawnBonusMarble = () => {
        engine.spawnBonusMarble();
        refreshApp();
    };

    const handleSpawnGoldenMarble = () => {
        engine.spawnGoldenBonusMarble(true);
        refreshApp();
    };

    const handleNextEvent = () => {
        DailyEventsManager.forceNextEvent();
        refreshApp();
    };

    const handleNextChallenge = () => {
        ChallengesManager.forceNextChallenge(state);
        engine.respawnAllPegs();
        engine.syncSocketedPegs();
        engine.saveState(false);
        refreshApp();
    };

    const handleResetChallenge = () => {
        ChallengesManager.resetChallenge(state);
        engine.respawnAllPegs();
        engine.syncSocketedPegs();
        engine.saveState(false);
        refreshApp();
    };

    const handleToggleDailyReward = () => {
        state.dailyLogin.lastClaimedDate = '';
        engine.saveState(false);
        refreshApp();
    };

    const handleResetDailyMissions = () => {
        ProgressionManager.resetDailyMissions(state);
        engine.saveState(false);
        refreshApp();
    };

    const handleToggleDoubleSpeed = () => {
        const next = !isDoubleSpeed;
        engine.debugDoubleSpeed = next;
        setIsDoubleSpeed(next);
        refreshApp();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4">
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-amber-500/20 bg-slate-950/80">
                    <div className="flex items-center gap-2">
                        <Bug className="w-5 h-5 text-amber-400" />
                        <h2 className="text-base sm:text-lg font-black text-amber-300 tracking-wide uppercase">
                            AI Studio Debug Menu
                        </h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 overflow-y-auto space-y-4 text-xs">
                    
                    {/* Debug Mode Master Toggle */}
                    <div className={`p-3.5 rounded-xl border transition-all ${isDebugActive ? 'bg-red-950/40 border-red-500/40' : 'bg-slate-800/60 border-amber-500/30'}`}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <ShieldAlert className={`w-5 h-5 ${isDebugActive ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
                                <div>
                                    <div className="font-black uppercase tracking-wider text-slate-100 text-sm">
                                        Debug Mode: <span className={isDebugActive ? 'text-red-400 font-extrabold' : 'text-slate-400'}>{isDebugActive ? 'ACTIVE' : 'OFF'}</span>
                                    </div>
                                    <div className="text-[10.5px] text-slate-400 mt-0.5">
                                        {isDebugActive 
                                            ? 'Cloud Sync is DISABLED. Cheated data will NOT submit to leaderboards.' 
                                            : 'Must be enabled to unlock debug commands.'}
                                    </div>
                                </div>
                            </div>
                            
                            <button
                                onClick={isDebugActive ? disableDebugMode : enableDebugMode}
                                className={`px-3 py-1.5 rounded-lg font-black uppercase text-[11px] tracking-wider transition-all shrink-0 ${
                                    isDebugActive 
                                        ? 'bg-red-500/30 text-red-200 border border-red-500/50 hover:bg-red-500/40 active:scale-95 shadow-md'
                                        : 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 shadow-md'
                                }`}
                            >
                                {isDebugActive ? 'Turn OFF & Restore' : 'Turn ON'}
                            </button>
                        </div>

                        {isDebugActive && (
                            <div className="mt-2 pt-2 border-t border-red-500/20 text-[10px] text-red-300/80 font-mono italic">
                                Note: Local Storage saving & Cloud Sync are SUSPENDED. Refreshing or turning OFF Debug Mode will revert to your clean pre-debug snapshot.
                            </div>
                        )}
                    </div>

                    {/* Controls Grid */}
                    <div className={`space-y-4 transition-opacity duration-200 ${!isDebugActive ? 'opacity-40 pointer-events-none select-none relative' : ''}`}>
                        
                        {!isDebugActive && (
                            <div className="text-center py-2 text-amber-400/90 font-bold tracking-wider uppercase text-[11px]">
                                🔒 Enable Debug Mode above to unlock controls
                            </div>
                        )}

                        {/* Input Value Manipulators */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Add Money */}
                            <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                    <Plus className="w-3 h-3 text-emerald-400" />
                                    Add Money {state.inChallengeMode ? '(Challenge)' : ''}
                                </label>
                                <div className="flex gap-1.5">
                                    <input 
                                        type="number"
                                        value={moneyInput}
                                        onChange={e => setMoneyInput(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1 w-full font-mono focus:outline-none focus:border-amber-500"
                                    />
                                    <button 
                                        onClick={handleAddMoney}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg shrink-0 transition-all active:scale-95"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Add Shards */}
                            <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-cyan-400" />
                                    Add Kinetic Shards
                                </label>
                                <div className="flex gap-1.5">
                                    <input 
                                        type="number"
                                        value={shardsInput}
                                        onChange={e => setShardsInput(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1 w-full font-mono focus:outline-none focus:border-cyan-500"
                                    />
                                    <button 
                                        onClick={handleAddShards}
                                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1 rounded-lg shrink-0 transition-all active:scale-95"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Set Marbles */}
                            <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-amber-400" />
                                    Set Marbles
                                </label>
                                <div className="flex gap-1.5">
                                    <input 
                                        type="number"
                                        value={marblesInput}
                                        onChange={e => setMarblesInput(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1 w-full font-mono focus:outline-none focus:border-amber-500"
                                    />
                                    <button 
                                        onClick={handleSetMarbles}
                                        className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold px-3 py-1 rounded-lg shrink-0 transition-all active:scale-95"
                                    >
                                        Set
                                    </button>
                                </div>
                            </div>

                            {/* Set Master Marbles */}
                            <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                    <Flame className="w-3 h-3 text-purple-400" />
                                    Set Master Marbles
                                </label>
                                <div className="flex gap-1.5">
                                    <input 
                                        type="number"
                                        value={masterInput}
                                        onChange={e => setMasterInput(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1 w-full font-mono focus:outline-none focus:border-purple-500"
                                    />
                                    <button 
                                        onClick={handleSetMasterMarbles}
                                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-lg shrink-0 transition-all active:scale-95"
                                    >
                                        Set
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Adventure Mode Level Select */}
                        <div className="bg-slate-800/60 border border-amber-500/40 p-3 rounded-xl space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                                    Adventure Mode Level Select
                                </div>
                                {state.gameMode === 'adventure' && (
                                    <span className="text-[9.5px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                        Active: Level {state.adventureState?.currentLevel || 1}
                                    </span>
                                )}
                            </div>

                            {/* Dropdown level selection */}
                            <div className="flex gap-1.5 items-center">
                                <select 
                                    value={selectedLevelId}
                                    onChange={(e) => setSelectedLevelId(Number(e.target.value))}
                                    className="bg-slate-900 border border-slate-700 text-amber-200 text-xs rounded-lg px-2.5 py-1.5 w-full font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
                                >
                                    {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => {
                                        const cfg = AdventureLevelsManager.getLevelConfig(lvl);
                                        return (
                                            <option key={lvl} value={lvl} className="bg-slate-900 text-white">
                                                Lvl {lvl}: {cfg.name} {cfg.isBoss ? '👑 (BOSS)' : ''} — {cfg.gimmickName}
                                            </option>
                                        );
                                    })}
                                </select>
                                <button 
                                    onClick={() => handleStartAdventureLevel(selectedLevelId)}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs shrink-0 transition-all active:scale-95 flex items-center gap-1 shadow-md cursor-pointer"
                                >
                                    <Play className="w-3 h-3 fill-current" /> Launch
                                </button>
                            </div>

                            {/* Custom Level Input */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/40">
                                <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">Custom Level ID:</span>
                                <div className="flex items-center gap-1.5">
                                    <input 
                                        type="number"
                                        min="1"
                                        max="999"
                                        value={customLevelInput}
                                        onChange={(e) => setCustomLevelInput(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1 w-16 font-mono focus:outline-none focus:border-amber-500 text-center"
                                    />
                                    <button 
                                        onClick={() => {
                                            const num = parseInt(customLevelInput, 10);
                                            if (!isNaN(num) && num >= 1) {
                                                handleStartAdventureLevel(num);
                                            }
                                        }}
                                        className="bg-slate-700 hover:bg-slate-600 text-amber-300 border border-amber-500/30 font-bold px-2.5 py-1 rounded-lg text-[10.5px] transition-all active:scale-95 cursor-pointer"
                                    >
                                        Jump to Level
                                    </button>
                                </div>
                            </div>

                            {/* Quick Preset Effect Buttons */}
                            <div className="space-y-1 pt-1.5 border-t border-slate-700/40">
                                <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Quick Gimmick & Atmosphere Test:
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                    {[
                                        { lvl: 1, label: 'Lvl 1: Blueprint', icon: '📐' },
                                        { lvl: 2, label: 'Lvl 2: Oak Bounce', icon: '🪵' },
                                        { lvl: 3, label: 'Lvl 3: Gale Breeze', icon: '🍃' },
                                        { lvl: 4, label: 'Lvl 4: Heavy Gravity', icon: '🪨' },
                                        { lvl: 5, label: 'Lvl 5: Sand Pegs 👑', icon: '⏳' },
                                        { lvl: 6, label: 'Lvl 6: Fortress Grid', icon: '🧱' },
                                        { lvl: 7, label: 'Lvl 7: Sky Thermals', icon: '☁️' },
                                        { lvl: 8, label: 'Lvl 8: Frosted Cafe', icon: '☕' },
                                        { lvl: 9, label: 'Lvl 9: High Society', icon: '🏛️' },
                                        { lvl: 10, label: 'Lvl 10: Zero-G 👑', icon: '🪐' },
                                        { lvl: 15, label: 'Lvl 15: Micro Frenzy 👑', icon: '⚡' },
                                        { lvl: 20, label: 'Lvl 20: Meltdown 👑', icon: '🔥' },
                                    ].map((item) => (
                                        <button
                                            key={item.lvl}
                                            onClick={() => handleStartAdventureLevel(item.lvl)}
                                            className="bg-slate-900/90 hover:bg-amber-950/60 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 border border-slate-700/60 font-bold px-2 py-1.5 rounded-lg text-[10px] text-left transition-all truncate flex items-center gap-1 active:scale-95 cursor-pointer"
                                            title={`Test level ${item.lvl}`}
                                        >
                                            <span className="text-xs">{item.icon}</span>
                                            <span className="truncate">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Reset & Wipe Actions */}
                        <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-xl space-y-2">
                            <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                Reset & Wipe Actions
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <button 
                                    onClick={handleResetUpgrades}
                                    className="bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 font-bold p-2 rounded-lg text-[10px] transition-all flex flex-col items-center gap-1 text-center"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                                    Reset Upgrades
                                </button>
                                <button 
                                    onClick={handleResetShardShop}
                                    className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold p-2 rounded-lg text-[10px] transition-all flex flex-col items-center gap-1 text-center"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-cyan-400" />
                                    Reset Shard Shop
                                </button>
                                <button 
                                    onClick={handleRemoveSkins}
                                    className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold p-2 rounded-lg text-[10px] transition-all flex flex-col items-center gap-1 text-center"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                                    Remove Skins
                                </button>
                                <button 
                                    onClick={handleRemoveGems}
                                    className="bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-bold p-2 rounded-lg text-[10px] transition-all flex flex-col items-center gap-1 text-center"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-purple-400" />
                                    Remove Gems
                                </button>
                            </div>
                        </div>

                        {/* Spawning & Event Triggers */}
                        <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-xl space-y-2">
                            <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                Immediate Spawns & Events
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <button 
                                    onClick={handleSpawnBonusMarble}
                                    className="bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 font-bold p-2 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                    Spawn Bonus
                                </button>
                                <button 
                                    onClick={handleSpawnGoldenMarble}
                                    className="bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 font-bold p-2 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    Spawn Golden
                                </button>
                                <button 
                                    onClick={handleNextEvent}
                                    className="bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 font-bold p-2 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                    Next Event
                                </button>
                                <button 
                                    onClick={handleNextChallenge}
                                    className="bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 font-bold p-2 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Trophy className="w-3.5 h-3.5 text-rose-400" />
                                    Next Challenge
                                </button>
                                <button 
                                    onClick={handleResetChallenge}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/40 font-bold p-2 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1.5"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                                    Reset Challenge
                                </button>
                                <button 
                                    onClick={handleToggleDailyReward}
                                    className="bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 font-bold p-2 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Gift className="w-3.5 h-3.5 text-purple-400" />
                                    Daily Reward
                                </button>
                                <button 
                                    onClick={handleResetDailyMissions}
                                    className="bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 font-bold p-2 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1.5"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                                    New Daily Missions
                                </button>
                            </div>
                        </div>

                        {/* Special Toggles & Systems */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* Websim Mode Toggle */}
                            <button 
                                onClick={handleToggleWebsimMode}
                                className={`p-2.5 rounded-xl border font-bold text-[10px] flex items-center justify-between transition-all ${
                                    isWebsimMode 
                                        ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300' 
                                        : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
                                }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                                    Websim Mode
                                </span>
                                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-black/40">
                                    {isWebsimMode ? 'ON' : 'OFF'}
                                </span>
                            </button>

                            {/* Double Speed Toggle */}
                            <button 
                                onClick={handleToggleDoubleSpeed}
                                className={`p-2.5 rounded-xl border font-bold text-[10px] flex items-center justify-between transition-all ${
                                    isDoubleSpeed 
                                        ? 'bg-amber-950/60 border-amber-500/50 text-amber-300' 
                                        : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
                                }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                                    Double Speed
                                </span>
                                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-black/40">
                                    {isDoubleSpeed ? '2x' : '1x'}
                                </span>
                            </button>

                            {/* Test Prestige */}
                            <button 
                                onClick={handleTestPrestige}
                                className="p-2.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900/80 hover:to-blue-900/80 text-cyan-200 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
                            >
                                <Zap className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                                Test Prestige
                            </button>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-1.5 rounded-lg text-xs transition-colors"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};
