import React, { useEffect, useState } from 'react';
import { engine } from '../game/engine';
import { formatNumber } from '../game/utils';

export const StatsBar = () => {
    const [money, setMoney] = useState(engine.state.money);
    const [mps, setMps] = useState(0);
    const [balls, setBalls] = useState(1);
    const [pegVal, setPegVal] = useState(1);

    useEffect(() => {
        let rAF: number;
        const loop = () => {
            setMoney(engine.state.money);
            setMps(engine.state.currentMps || 0);
            setBalls(1 + engine.state.upgrades.extraBall);
            
            // Calculate effective Peg Value for display
            // Base * MarbleMult * IncomeMult
            const base = engine.state.pegValue;
            const marbleMult = Math.max(1, (1 + engine.state.upgrades.extraBall) * 0.75);
            const totalIncomePercent = (engine.state.permanentIncomeBoostPercent || 0) + (engine.state.derivedIncomeBoostPercent || 0);
            const incomeMult = 1 + (totalIncomePercent / 100);
            
            setPegVal(Math.round(base * marbleMult * incomeMult));
            
            rAF = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(rAF);
    }, []);

    return (
        <div className="stats-bar">
            <div className="stat-item">
                <span className="stat-label">Money</span>
                <span className="stat-value" style={{color: '#ffd700'}}>${formatNumber(money)}</span>
            </div>
            <div className="stat-item money-stat">
                <span className="stat-label">Income</span>
                <span className="stat-value" style={{color: '#ffd700'}}>${formatNumber(mps)}/s</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">Marbles</span>
                <span className="stat-value">{balls}</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">Peg Value</span>
                <span className="stat-value">${formatNumber(pegVal)}</span>
            </div>
        </div>
    );
};