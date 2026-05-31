
import React, { useEffect, useState } from 'react';
import { engine } from '../game/engine';
import { formatNumber } from '../game/utils';

export const StatsBar = () => {
    const [money, setMoney] = useState(engine.state.money);
    const [mps, setMps] = useState(0);
    const [balls, setBalls] = useState(1);
    const [pegVal, setPegVal] = useState(1);
    const [isChallenge, setIsChallenge] = useState(engine.state.inChallengeMode);
    const [isSandPeg, setIsSandPeg] = useState(engine.state.inChallengeMode && engine.state.challengeState?.challengeId === 'sand_peg');

    useEffect(() => {
        let rAF: number;
        const loop = () => {
            const hasChallenge = engine.state.inChallengeMode;
            const hasSandPeg = hasChallenge && engine.state.challengeState?.challengeId === 'sand_peg';
            
            setIsChallenge(hasChallenge);
            setIsSandPeg(hasSandPeg);

            if (hasChallenge) {
                if (hasSandPeg) {
                    setMoney(engine.state.challengeState.pegsBrokenCurrency || 0);
                    setMps(engine.state.challengeState.lifetimePegsBroken || 0);
                    setBalls(engine.state.challengeState.upgrades.extraBall);
                    setPegVal(1 + (engine.state.challengeState.upgrades.sandPegMultiplier || 0));
                } else {
                    setMoney(engine.state.challengeState.money || 0);
                    setMps(engine.state.challengeState.currentMps || 0);
                    if (engine.state.challengeState?.challengeId === 'micro_mania') {
                        setBalls(engine.state.challengeState.lifetimeMicroMarblesDropped || 0);
                    } else {
                        setBalls(engine.state.challengeState.upgrades.extraBall);
                    }
                    
                    const base = 1 + ((engine.state.challengeState.upgrades.pegValue || 0) * 2);
                    const marbleMult = Math.max(1, (engine.state.challengeState.upgrades.extraBall || 1) * 0.75);
                    setPegVal(Math.round(base * marbleMult));
                }
            } else {
                setMoney(engine.state.money);
                setMps(engine.state.currentMps || 0);
                setBalls(engine.state.upgrades.extraBall);
                
                const base = engine.state.pegValue;
                const marbleMult = Math.max(1, (engine.state.upgrades.extraBall) * 0.75);
                const totalIncomePercent = (engine.state.permanentIncomeBoostPercent || 0) + (engine.state.derivedIncomeBoostPercent || 0);
                const incomeMult = 1 + (totalIncomePercent / 100);
                
                setPegVal(Math.round(base * marbleMult * incomeMult));
            }
            
            rAF = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(rAF);
    }, []);

    return (
        <div className={`stats-bar ${isChallenge ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
            <div className="stat-item">
                <span className="stat-label">{isSandPeg ? 'Broken Pegs' : (isChallenge ? 'Chall. Cash' : 'Money')}</span>
                <span className="stat-value" style={{color: isChallenge ? '#f59e0b' : '#ffd700'}}>
                    {isSandPeg ? formatNumber(money) : `$${formatNumber(money)}`}
                </span>
            </div>
            <div className="stat-item money-stat">
                <span className="stat-label">{isSandPeg ? 'Total Broken' : 'Income'}</span>
                <span className="stat-value" style={{color: isChallenge ? '#f59e0b' : '#ffd700'}}>
                    {isSandPeg ? formatNumber(mps) : `$${formatNumber(mps)}/s`}
                </span>
            </div>
            <div className="stat-item">
                <span className="stat-label">{isChallenge && engine.state.challengeState?.challengeId === 'micro_mania' ? 'Micro Dropped' : 'Marbles'}</span>
                <span className="stat-value text-amber-100">{balls}</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">{isSandPeg ? 'Peg Multiplier' : 'Peg Value'}</span>
                <span className="stat-value">
                    {isSandPeg ? `x${pegVal}` : `$${formatNumber(pegVal)}`}
                </span>
            </div>
        </div>
    );
};
