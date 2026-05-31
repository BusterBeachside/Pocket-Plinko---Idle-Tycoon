import React from 'react';
import { UPGRADES } from '../game/config';
import { formatNumber } from '../game/utils';

export const UpgradeCard = ({ id, level, cost, canAfford, locked, message, onClick, customName, customDescription, costString, inChallenge }: any) => {
    const cfg = UPGRADES.find(u => u.id === id);
    const name = customName || cfg?.name;
    const description = customDescription || cfg?.description;
    
    if (!name) return null;
    return (
        <div className="upgrade-card">
            <h3>{name}</h3>
            <div className="desc" style={{fontSize:'0.8rem', color:'#aaa', marginBottom:'8px', minHeight:'2.4em', lineHeight:'1.2'}}>{description}</div>
            <div className="info">
                <span>Level: {level}</span>
                {locked ? <span style={{color:'#ff6b6b'}}>Locked</span> : null}
            </div>
            <div style={{flex:1}}></div>
            {locked ? (
                <div style={{fontSize: '0.8rem', color: '#888', marginTop: 5}}>{message}</div>
            ) : (
                <div className="cost" style={{color: inChallenge ? '#f59e0b' : '#ffd700'}}>{costString || `$${formatNumber(cost)}`}</div>
            )}
            <button 
                className={`upgrade-btn ${locked ? 'locked' : (canAfford ? 'affordable' : 'expensive')}`}
                disabled={locked || !canAfford}
                onClick={() => onClick(id)}
            >
                {locked ? 'Locked' : 'Buy'}
            </button>
        </div>
    );
};