
import React, { useState } from 'react';
import { engine } from '../../game/engine';
import { assets } from '../../game/assets';
import { formatNumber } from '../../game/utils';

export const CoreModal = ({ onClose, onOpenShop, onActivate }: { onClose: () => void, onOpenShop: () => void, onActivate: (shards: number, mult: number) => void }) => {
    const [view, setView] = useState<'main' | 'activate'>('main');
    
    const s = engine.state;
    const balls = s.upgrades.extraBall; // Removed 1+
    const money = s.money;
    const prestiged = s.timesPrestiged > 0;
    
    // Requirements
    const reqBalls = 50;
    const reqMoney = 100000000; // $100M
    const hasBalls = balls >= reqBalls;
    const hasMoney = money >= reqMoney;
    
    // Legacy Calculation Logic
    // Shards: (Marbles / 10) + (Lifetime / 2B) + (Peak / 1M)
    const lifetime = s.lifetimeEarnings;
    const peak = s.peakMps;
    
    let baseShards = Math.floor(
        (balls / 10) + 
        (lifetime / 2000000000) + 
        (peak / 1000000)
    );
    baseShards = Math.max(1, baseShards);

    // Apply Permanent Shard Multiplier (+10% per level)
    // Use state.shardMultiplierPercent directly, as it includes permanent upgrades applied in engine
    const shardMultiPercent = s.shardMultiplierPercent || 0;
    
    let totalShards = baseShards;
    if (shardMultiPercent > 0) {
        totalShards = Math.floor(baseShards * (1 + shardMultiPercent / 100));
    }

    // Master Multiplier Calculation
    // Base: 5 for every 50 marbles
    const baseMasterMult = Math.floor(5 * (balls / 50));
    // Bonus from Owned Skins (derived in engine)
    const ownedMasterBonus = s.derivedMasterBonus || 0; 
    
    const totalMasterMultGain = baseMasterMult + ownedMasterBonus;

    const handlePrestigeClick = () => { onActivate(totalShards, totalMasterMultGain); };

    // Two-Column Selection Menu (If already prestiged once)
    // Moved up so players can access Shard Shop even if they don't meet activation requirements
    if (prestiged && view === 'main') {
        return (
            <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="confirm-modal prestige-modal">
                    <div className="prestige-header" style={{gap:'14px', alignItems:'center'}}>
                        <div className="prestige-badge" style={{flex:'0 0 62px'}}>
                            <img src={assets.getSrc('core')} alt="" style={{width:'44px', height:'44px', objectFit:'contain'}} />
                        </div>
                        <div className="prestige-title" style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                            <span style={{fontWeight:900, color:'#fff', fontSize:'1.05rem'}}>Kinetic Core</span>
                            <span className="prestige-sub">Choose your core action</span>
                        </div>
                    </div>
                    <div className="prestige-body" style={{marginTop:'10px'}}>
                        <div style={{display:'flex', gap:'12px', flexWrap:'wrap'}}>
                            <div className="core-option-card" onClick={() => setView('activate')}>
                                <div style={{fontWeight:900, marginBottom:'8px'}}>Activate Core</div>
                                <div style={{fontSize:'0.85rem', marginBottom:'12px', color:'#ccc'}}>Melt marbles to gain Shards & Power.</div>
                                <button className="btn confirm" style={{width:'100%'}}>Activate Core</button>
                            </div>
                            <div className="core-option-card" onClick={onOpenShop}>
                                <div style={{fontWeight:900, marginBottom:'8px'}}>Shard Shop</div>
                                <div style={{fontSize:'0.85rem', marginBottom:'12px', color:'#ccc'}}>Spend Kinetic Shards on upgrades.</div>
                                <button className="btn cancel" style={{width:'100%'}}>Open Shard Shop</button>
                            </div>
                        </div>
                    </div>
                    <div className="footer-center" style={{marginTop:'15px'}}>
                        <button className="close-core" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    // Locked State (Need 50 Marbles)
    if (!hasBalls) {
        return (
            <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="confirm-modal prestige-modal">
                    <h3>Kinetic Core is Locked.</h3>
                    <p style={{marginBottom:'10px'}}>The energy required to activate the Core is immense.</p>
                    <ul style={{textAlign:'left', marginBottom:'15px', color:'#ccc'}}>
                        <li>Marbles: <span style={{color:'#ff6b6b'}}>{balls} / {reqBalls}</span></li>
                        <li>Your money: <span style={{color: hasMoney ? '#4caf50' : '#ff6b6b'}}>${formatNumber(money)} / $100M</span></li>
                    </ul>
                    <p>Keep expanding your operation to unlock the ultimate power.</p>
                    <div className="footer-center">
                        <button className="close-core" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    // Main Activation Confirmation (First time or selected from menu)
    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="confirm-modal prestige-modal">
                <div className="prestige-header">
                    <div className="prestige-badge">
                        <img src={assets.getSrc('core')} alt="" style={{width:'44px', height:'44px', objectFit:'contain'}} />
                    </div>
                    <div className="prestige-title">
                        <span>KINETIC CORE</span>
                        <span className="prestige-sub">Melt your marbles into a Master Marble</span>
                    </div>
                </div>

                <div className="prestige-body">
                    <p>The Kinetic Core allows you to <strong>melt down your marbles</strong> into a single, powerful <strong>Master Marble</strong> which provides a massive profit boost!</p>
                    <p>This process also creates <strong>KINETIC SHARDS</strong>, which can be used in the Shard Shop to buy powerful, permanent upgrades!</p>
                    <p>Powering the Kinetic Core requires <strong>$100M</strong> and will <strong>reset all of your stats and upgrades to ZERO!</strong></p>
                    
                    <div className="prestige-stats">
                        <div className="prestige-stat">
                            <div className="label">Kinetic Shards</div>
                            <div className="value" style={{color:'#00ffff'}}>{formatNumber(totalShards)}</div>
                        </div>
                        <div className="prestige-stat">
                            <div className="label">Master Multiplier</div>
                            <div className="value" style={{color:'#ffd700'}}>x{formatNumber(totalMasterMultGain)}</div>
                        </div>
                    </div>
                </div>

                {hasMoney ? (
                    <>
                        <div style={{textAlign:'center', fontWeight:800, marginTop:'12px'}}>Activate the Kinetic Core?</div>
                        <div className="prestige-actions">
                            <button className="btn cancel" onClick={onClose}>No</button>
                            <button className="btn confirm" onClick={handlePrestigeClick}>Yes</button>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{marginTop:'14px', textAlign:'center', fontWeight:700, color:'#e74c3c'}}>
                            You do not have enough money.
                        </div>
                        <div className="footer-center" style={{marginTop:'12px'}}>
                            <button className="close-core" onClick={onClose}>Close</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
