import React, { useEffect, useState } from 'react';
import { engine } from '../../game/engine';
import { formatNumber } from '../../game/utils';

export const StatsModal = ({ onClose }: { onClose: () => void }) => {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const i = setInterval(() => setTick(t => t + 1), 100);
        return () => clearInterval(i);
    }, []);

    const s = engine.state;
    const format = formatNumber;
    const ownedArr = Array.isArray(s.ownedMarbles) ? s.ownedMarbles : [];
    const ownedCount = ownedArr.length;
    const milestoneLevels = Math.floor(ownedCount / 10);
    const ownedSkinsMasterBonus = ownedCount; 
    const milestoneMasterBonus = milestoneLevels * 5;
    const derivedMasterBonus = (ownedSkinsMasterBonus || 0) + (milestoneMasterBonus || 0);
    const totalMasterMultiplier = (s.masterMultiplier || 0) + derivedMasterBonus;
    const derivedIncomeBoost = ownedCount + (milestoneLevels * 5); 
    const totalIncomeBoost = (s.permanentIncomeBoostPercent || 0) + derivedIncomeBoost;
    const timeSecs = Math.floor(s.totalPlayTime || 0);
    const hh = Math.floor(timeSecs / 3600);
    const mm = Math.floor((timeSecs % 3600) / 60);
    const ss = timeSecs % 60;
    const timeStr = `${hh}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;

    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="confirm-modal stats-modal">
                <div style={{display:'flex', alignItems:'center', gap:'12px', justifyContent:'space-between', marginBottom:'15px'}}>
                    <h3>Player Stats</h3>
                    <button className="close-core" onClick={onClose}>Close</button>
                </div>
                <div className="stats-grid">
                    <div className="stat-tile"><div className="stat-label">Lifetime $</div><div className="stat-value" style={{color:'#ffd700'}}>${format(s.lifetimeEarnings + s.money)}</div></div>
                    <div className="stat-tile"><div className="stat-label">Peak $/s</div><div className="stat-value">${format(s.peakMps)}/s</div></div>
                    <div className="stat-tile"><div className="stat-label">Times Prestiged</div><div className="stat-value">{s.timesPrestiged}</div></div>
                    <div className="stat-tile"><div className="stat-label">Kinetic Shards</div><div className="stat-value" style={{color:'#00ffff'}}>{format(s.kineticShards)}</div></div>
                    <div className="stat-tile"><div className="stat-label">Master Multiplier</div><div className="stat-value">x{format(totalMasterMultiplier)}</div></div>
                    <div className="stat-tile"><div className="stat-label">Income Boost</div><div className="stat-value">{totalIncomeBoost}%</div></div>
                    <div className="stat-tile"><div className="stat-label">Micro Value</div><div className="stat-value">{1 + (s.microValuePercent || 0) + (s.permanentMicroBoostPercent || 0)}%</div></div>
                    <div className="stat-tile"><div className="stat-label">Bonus Chance</div><div className="stat-value">{Math.round((s.bonusChance || 0.5) * 100)}%</div></div>
                    <div className="stat-tile"><div className="stat-label">Skins Owned</div><div className="stat-value">{ownedCount}</div></div>
                    <div className="stat-tile"><div className="stat-label">Total Play Time</div><div className="stat-value">{timeStr}</div></div>
                </div>
                <div className="footer-center" style={{marginTop:'20px'}}>
                    <button className="no" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};