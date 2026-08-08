
import React, { useEffect, useState } from 'react';
import { engine } from '../game/engine';
import { assets } from '../game/assets';
import { DailyEventsManager } from '../game/dailyEvents';
import { CHALLENGES, ChallengesManager } from '../game/challenges';
import { UnderdogService } from '../services/underdogService';

import { User, Bug } from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';

export function isAIStudioPreview(): boolean {
    if (typeof window === 'undefined') return false;
    if ((window as any).__FORCE_DEBUG_BUTTON__ === true) return true;
    if (UnderdogService.isWebsim()) return false;
    const hostname = window.location.hostname;
    if (hostname.includes('websim')) return false;

    return (
        hostname.includes('run.app') ||
        hostname.includes('ais-') ||
        hostname.includes('localhost') ||
        hostname.includes('127.0.0.1') ||
        window !== window.parent
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
    onDebugClick
}: { 
    onCoreClick: () => void, 
    onAuthClick: () => void, 
    profile?: any, 
    onEventClick: () => void,
    onChallengeClick?: () => void,
    onDebugClick?: () => void
}) => {
    const [glow, setGlow] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(DailyEventsManager.getCurrentEvent());

    const [timeLeft, setTimeLeft] = useState('');

    // Challenge Mode state tracking for header banner replacement
    const [inChallenge, setInChallenge] = useState(engine.state.inChallengeMode);
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

            // Sync challenge info
            const inChal = engine.state.inChallengeMode;
            setInChallenge(inChal);
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
            
            <div className="flex flex-col items-center select-none w-full px-12 sm:px-32 overflow-hidden my-auto" style={{ alignSelf: 'center' }}>
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
                className={`kinetic-icon absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-10 ${glow && !inChallenge ? 'glow' : ''}`} 
                onClick={inChallenge ? undefined : onCoreClick} 
                style={{
                    cursor: inChallenge ? 'not-allowed' : 'pointer',
                    opacity: inChallenge ? 0.35 : 1,
                    pointerEvents: inChallenge ? 'none' : 'auto'
                }}
                title={inChallenge ? "Kinetic Core is disabled while on a Challenge board!" : "Access Kinetic Core"}
            >
                {/* Use preloaded asset source if available, else raw path */}
                <img src={assets.getSrc('core')} alt="Core" />
            </div>
        </div>
    );
};
