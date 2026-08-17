
import React, { useEffect, useState, useRef } from 'react';
import { engine } from '../game/engine';
import { assets } from '../game/assets';
import { DailyEventsManager } from '../game/dailyEvents';
import { CHALLENGES, ChallengesManager } from '../game/challenges';
import { AdventureLevelsManager } from '../game/adventureLevels';
import { UnderdogService } from '../services/underdogService';

import { User, Bug, Cloud, CloudUpload, Check } from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';

export function isAIStudioPreview(): boolean {
    if (typeof window === 'undefined') return false;
    if ((window as any).__FORCE_DEBUG_BUTTON__ === true) return true;
    if (UnderdogService.isWebsim()) return false;
    const hostname = window.location.hostname;
    if (
        hostname.includes('websim') ||
        hostname.includes('itch.io') ||
        hostname.includes('itch.zone') ||
        hostname.includes('hwcdn.net')
    ) {
        return false;
    }

    return (
        hostname.includes('run.app') ||
        hostname.includes('ais-') ||
        hostname.includes('localhost') ||
        hostname.includes('127.0.0.1')
    );
}

const formatVal = (n: number) => {
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
};

export const Header = ({ 
    onCoreClick, 
    onAuthClick, 
    profile, 
    onEventClick,
    onChallengeClick,
    onAdventureDetailsClick,
    onDebugClick
}: { 
    onCoreClick: () => void, 
    onAuthClick: () => void, 
    profile?: any, 
    onEventClick: () => void,
    onChallengeClick?: () => void,
    onAdventureDetailsClick?: () => void,
    onDebugClick?: () => void
}) => {
    const [glow, setGlow] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(DailyEventsManager.getCurrentEvent());

    const [timeLeft, setTimeLeft] = useState('');

    // Cloud Save status tracking
    const [cloudStatus, setCloudStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
    const savedTimeoutRef = useRef<any>(null);

    useEffect(() => {
        const handleCloudSaveStatus = (e: any) => {
            const { status } = e.detail || {};
            if (status === 'saving') {
                if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
                setCloudStatus('saving');
            } else if (status === 'saved') {
                setCloudStatus('saved');
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setLastSavedTime(timeStr);
                if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
                savedTimeoutRef.current = setTimeout(() => {
                    setCloudStatus('idle');
                }, 3000);
            } else if (status === 'error') {
                setCloudStatus('error');
                if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
                savedTimeoutRef.current = setTimeout(() => {
                    setCloudStatus('idle');
                }, 3000);
            }
        };

        window.addEventListener('cloud-save-status', handleCloudSaveStatus);
        return () => {
            window.removeEventListener('cloud-save-status', handleCloudSaveStatus);
            if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        };
    }, []);

    // Challenge & Adventure Mode state tracking for header banner replacement
    const [inChallenge, setInChallenge] = useState(engine.state.inChallengeMode);
    const [inAdventure, setInAdventure] = useState(engine.state.gameMode === 'adventure');
    const [adventureInfo, setAdventureInfo] = useState({
        level: 1,
        name: '',
        earnings: 0,
        goal: 10000,
        isBoss: false
    });
    const [challengeInfo, setChallengeInfo] = useState({
        nextTier: 'bronze' as 'bronze' | 'silver' | 'gold',
        currentMetricVal: 0,
        target: 1,
        progressPercent: 0,
        allCompleted: false
    });

    useEffect(() => {
        const update = () => {
            const balls = engine.state.upgrades.extraBall; // Level = Count
            const money = engine.state.money || 0;
            const timesPrestiged = engine.state.timesPrestiged || 0;

            if (timesPrestiged > 0) {
                const reqMoney = 100000000 * Math.pow(2.0, timesPrestiged);
                setGlow(balls >= 50 && money >= reqMoney);
            } else {
                setGlow(balls >= 50);
            }

            setCurrentEvent(DailyEventsManager.getCurrentEvent());

            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const diff = tomorrow.getTime() - now.getTime();
            const hrs = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);

            // Sync challenge & adventure info
            const inChal = engine.state.inChallengeMode;
            const inAdv = engine.state.gameMode === 'adventure';
            setInChallenge(inChal);
            setInAdventure(inAdv);

            if (inAdv && engine.state.adventureState) {
                const curLvl = engine.state.adventureState.currentLevel || 1;
                const cfg = AdventureLevelsManager.getLevelConfig(curLvl);
                setAdventureInfo({
                    level: curLvl,
                    name: cfg.name,
                    earnings: engine.state.adventureState.levelEarnings || 0,
                    goal: cfg.targetGoal,
                    isBoss: cfg.isBoss
                });
            }

            if (inChal) {
                const activeId = ChallengesManager.getActiveChallengeId();
                const challenge = CHALLENGES[activeId];
                if (challenge) {
                    const cState = engine.state.challengeState || { money: 0, lifetimeEarnings: 0, lifetimePegsBroken: 0 };
                    const goalsStatus = engine.state.challengeGoalClaimed?.[activeId] || { bronze: false, silver: false, gold: false };
                    
                    const metricType = challenge.goals.bronze.metric;
                    const curVal = metricType === 'pegsBroken' ? (cState.lifetimePegsBroken || 0) : (cState.lifetimeEarnings || cState.money || 0);
                    
                    let tier: 'bronze' | 'silver' | 'gold' = 'bronze';
                    let allCompleted = false;
                    if (!goalsStatus.bronze) {
                        tier = 'bronze';
                    } else if (!goalsStatus.silver) {
                        tier = 'silver';
                    } else if (!goalsStatus.gold) {
                        tier = 'gold';
                    } else {
                        tier = 'gold';
                        allCompleted = true;
                    }
                    const nextGoal = challenge.goals[tier];
                    const targetVal = nextGoal.target;
                    const pct = Math.min(100, (curVal / targetVal) * 100);

                    setChallengeInfo({
                        nextTier: tier,
                        currentMetricVal: curVal,
                        target: targetVal,
                        progressPercent: pct,
                        allCompleted
                    });
                }
            }
        };
        update();
        const i = setInterval(update, 1000);
        return () => clearInterval(i);
    }, []);

    const getIndicatorColor = () => {
        switch (currentEvent.id) {
            case 'shard_event': return 'bg-cyan-400';
            case 'market_event': return 'bg-amber-400';
            case 'mission_event': return 'bg-indigo-400';
            case 'winged_event': return 'bg-emerald-400';
            case 'peg_event': return 'bg-rose-400';
            case 'rarity_event': return 'bg-purple-400';
            case 'critical_event': return 'bg-orange-400';
            default: return 'bg-white';
        }
    };

    return (
        <div className="header flex flex-row items-center justify-between relative w-full px-2 sm:px-4">
            <div className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                <div 
                    className="auth-trigger flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-2 py-1 transition-all cursor-pointer"
                    onClick={onAuthClick}
                >
                    {profile ? (
                        <AvatarDisplay avatarId={profile.avatar_url || 'marble_white'} size={18} ownedSkins={engine.state.ownedMarbles} />
                    ) : (
                        <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                    <span className="hidden sm:inline text-[10px] font-bold text-white/60 uppercase tracking-wider pr-1">
                        {profile?.username || 'Guest'}
                    </span>
                </div>

                {/* Cloud Save Indicator Pill */}
                <div 
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full border text-[9.5px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer select-none shrink-0 ${
                        cloudStatus === 'saving'
                            ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse'
                            : cloudStatus === 'saved'
                            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                            : cloudStatus === 'error'
                            ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/50 hover:text-white/80'
                    }`}
                    onClick={() => {
                        if (cloudStatus !== 'saving') {
                            engine.saveState(true);
                        }
                    }}
                    title={
                        cloudStatus === 'saving'
                            ? 'Actively saving progress to cloud...'
                            : cloudStatus === 'saved'
                            ? `Cloud save complete! ${lastSavedTime ? `(Last save at ${lastSavedTime})` : ''}`
                            : cloudStatus === 'error'
                            ? 'Cloud save failed. Click to retry.'
                            : `Cloud Save Active ${lastSavedTime ? `(Last save at ${lastSavedTime})` : ''} - Click to save now!`
                    }
                >
                    {cloudStatus === 'saving' ? (
                        <>
                            <CloudUpload className="w-3.5 h-3.5 text-cyan-400 animate-bounce shrink-0" />
                            <span className="hidden sm:inline text-[9px] font-black text-cyan-300">Saving...</span>
                        </>
                    ) : cloudStatus === 'saved' ? (
                        <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3] shrink-0" />
                            <span className="hidden sm:inline text-[9px] font-black text-emerald-300">Saved</span>
                        </>
                    ) : cloudStatus === 'error' ? (
                        <>
                            <Cloud className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="hidden sm:inline text-[9px] font-black text-rose-300">Retry</span>
                        </>
                    ) : (
                        <>
                            <Cloud className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
                            <span className="hidden lg:inline text-[9px] font-extrabold text-white/50 group-hover:text-white/80">
                                {lastSavedTime ? `Saved ${lastSavedTime}` : 'Cloud Save'}
                            </span>
                        </>
                    )}
                </div>

                {isAIStudioPreview() && onDebugClick && (
                    <button
                        onClick={onDebugClick}
                        className="hidden md:flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-md shrink-0"
                        title="Open Debug Menu"
                    >
                        <Bug className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Debug</span>
                    </button>
                )}
            </div>
            
            <div className="flex flex-col items-center select-none w-full px-20 xs:px-28 sm:px-44 overflow-hidden my-auto" style={{ alignSelf: 'center' }}>
                <h1 className="header-title text-center" style={{ fontSize: '1.4rem', lineHeight: '1.1' }}>Pocket Plinko</h1>
                {inChallenge ? (
                    <div 
                        onClick={onChallengeClick}
                        className="flex flex-col gap-0.5 mt-0.5 px-2.5 py-0.5 bg-black/60 border border-white/5 cursor-pointer hover:bg-black/90 hover:border-white/15 transition-all w-40 xs:w-48 sm:w-56 select-none shadow-md rounded-lg max-w-full overflow-hidden"
                        title={challengeInfo.allCompleted ? "All Goals Completed! Click to view Challenges!" : `Progress toward ${challengeInfo.nextTier.toUpperCase()} Goal. Click to view Challenges!`}
                    >
                        <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-extrabold tracking-wider uppercase leading-none">
                            <span className={`font-black ${
                                challengeInfo.nextTier === 'bronze' ? 'text-amber-500' : (challengeInfo.nextTier === 'silver' ? 'text-slate-300' : 'text-amber-400')
                            }`}>
                                {challengeInfo.allCompleted ? "All Goals Complete" : `${challengeInfo.nextTier} Goal`}
                            </span>
                            <span className="font-mono text-slate-300">
                                {challengeInfo.allCompleted ? "100%" : `${formatVal(challengeInfo.currentMetricVal)} / ${formatVal(challengeInfo.target)}`}
                            </span>
                        </div>
                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                    challengeInfo.nextTier === 'bronze' ? 'bg-amber-700' : (challengeInfo.nextTier === 'silver' ? 'bg-slate-400' : 'bg-amber-400')
                                }`}
                                style={{ width: `${challengeInfo.allCompleted ? 100 : challengeInfo.progressPercent}%` }}
                            />
                        </div>
                    </div>
                ) : inAdventure ? (
                    <div 
                        onClick={onAdventureDetailsClick}
                        className="flex flex-col gap-0.5 mt-0.5 px-2.5 py-0.5 bg-black/70 border border-amber-500/40 cursor-pointer hover:bg-black/90 hover:border-amber-400/60 transition-all w-44 xs:w-52 sm:w-64 select-none shadow-md rounded-lg max-w-full overflow-hidden"
                        title="Click to view details and gimmick for this board!"
                    >
                        <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-extrabold tracking-wider uppercase leading-none">
                            <span className="text-amber-400 font-black truncate max-w-[110px] xs:max-w-[140px]">
                                Board {adventureInfo.level}: {adventureInfo.name} {adventureInfo.isBoss ? '👑' : ''}
                            </span>
                            <span className="font-mono text-emerald-400 font-bold">
                                ${formatVal(adventureInfo.earnings)} / ${formatVal(adventureInfo.goal)}
                            </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700/60">
                            <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                    adventureInfo.isBoss 
                                        ? 'bg-gradient-to-r from-red-500 via-amber-500 to-orange-400' 
                                        : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
                                }`}
                                style={{ width: `${Math.min(100, (adventureInfo.earnings / adventureInfo.goal) * 100)}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <div 
                        onClick={onEventClick}
                        className="flex items-center gap-1 mt-0.5 px-2.5 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider bg-black/60 border border-white/5 cursor-pointer hover:bg-black/90 hover:border-white/15 transition-all text-slate-400 select-none shadow-md max-w-full overflow-hidden"
                        title="Click to view today's active event details!"
                    >
                        <span className="flex h-1.5 w-1.5 relative shrink-0">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${getIndicatorColor()} opacity-75`} />
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${getIndicatorColor()}`} />
                        </span>
                        <span style={{ color: '#aaa' }} className="shrink-0">Event:</span>
                        <span className={`${currentEvent.color.split(' ')[0]} font-black truncate max-w-[95px] xs:max-w-[140px] sm:max-w-none`}>
                            {currentEvent.name}
                        </span>
                        <span className="ml-0.5 pl-1 border-l border-white/10 text-[7.5px] font-mono text-slate-500 tabular-nums shrink-0">
                            {timeLeft}
                        </span>
                    </div>
                )}
            </div>
            
            <div 
                className={`kinetic-icon absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-10 ${glow && !inChallenge && !inAdventure ? 'glow' : ''}`} 
                onClick={(inChallenge || inAdventure) ? undefined : onCoreClick} 
                style={{
                    cursor: (inChallenge || inAdventure) ? 'not-allowed' : 'pointer',
                    opacity: (inChallenge || inAdventure) ? 0.35 : 1,
                    pointerEvents: (inChallenge || inAdventure) ? 'none' : 'auto'
                }}
                title={inChallenge ? "Kinetic Core is disabled while on a Challenge board!" : inAdventure ? "Kinetic Core is disabled in Adventure Mode!" : "Access Kinetic Core"}
            >
                {/* Use preloaded asset source if available, else raw path */}
                <img src={assets.getSrc('core')} alt="Core" />
            </div>
        </div>
    );
};
