import React, { useEffect, useState } from 'react';
import { engine } from '../../game/engine';
import { PERM_UPGRADES, MARBLE_SKINS } from '../../game/shardShopConfig';
import { formatNumber } from '../../game/utils';

// Helper component to handle independent fetch logic for each skin card
const SkinCard = ({ skin, isOwned, isEquipped, canAfford, onBuy, onEquip }: any) => {
    const [bgUrl, setBgUrl] = useState<string>('');

    useEffect(() => {
        if (!skin.texture) return;
        let active = true;
        fetch(`./images/${skin.texture}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to load');
                return res.blob();
            })
            .then(blob => {
                if (active) setBgUrl(URL.createObjectURL(blob));
            })
            .catch(() => { /* ignore loading errors */ });
        return () => { active = false; };
    }, [skin.texture]);

    const displayStyle = skin.texture 
        ? (bgUrl ? { backgroundImage: `url(${bgUrl})` } : { backgroundColor: '#333' })
        : { background: 'radial-gradient(circle at 30% 30%, #fff, #ffd700, #ff6b6b)' };

    return (
        <div className={`skin-card ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}`}>
            <div className="skin-preview" style={displayStyle}></div>
            <div className="skin-name">{skin.name}</div>
            <div className="skin-rarity" style={{color: skin.rarity === 'Legendary' ? '#39ff14' : (skin.rarity === 'Epic' ? '#b200ff' : (skin.rarity === 'Rare' ? '#ff2e2e' : '#fff'))}}>{skin.rarity}</div>
            
            {isOwned ? (
                <button className="skin-btn select" disabled={isEquipped} onClick={() => onEquip(skin.id)}>
                    {isEquipped ? 'Equipped' : 'Select'}
                </button>
            ) : (
                <button className="skin-btn buy" disabled={!canAfford} onClick={() => onBuy(skin.id)}>
                    Buy ({formatNumber(Math.round(skin.cost * (1 + engine.state.ownedMarbles.length * 0.25)))})
                </button>
            )}
        </div>
    );
};

export const ShardShopModal = ({ onClose }: { onClose: () => void }) => {
    const [tab, setTab] = useState<'upgrades' | 'skins'>('upgrades');
    const [shards, setShards] = useState(engine.state.kineticShards);
    const [updateTick, setUpdateTick] = useState(0);

    useEffect(() => {
        const unsub = engine.subscribe(() => {
            setShards(engine.state.kineticShards);
            setUpdateTick(t => t + 1);
        });
        
        // Trigger Shard Shop Tutorial if not seen
        const seen = localStorage.getItem('plinko_seen_shardshop_tutorial_v1');
        if (!seen) {
            window.dispatchEvent(new CustomEvent('request-tutorial', { detail: { key: 'tut_shard' } }));
        }

        return () => { unsub(); };
    }, []);

    const handleBuyPerm = (id: string) => { engine.buyPermanentUpgrade(id); };
    const handleBuySkin = (id: string) => { engine.buySkin(id); };
    const handleEquipSkin = (id: string) => { engine.equipSkin(id); };

    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="confirm-modal shard-shop-modal">
                <div className="shop-header">
                    <h3>Shard Shop</h3>
                    <div className="shard-balance">Shards: <span style={{color:'#00ffff'}}>{formatNumber(shards)}</span></div>
                    <button className="close-core" onClick={onClose}>Close</button>
                </div>
                
                <div className="shop-tabs">
                    <button className={`tab-btn ${tab === 'upgrades' ? 'active' : ''}`} onClick={() => setTab('upgrades')}>Upgrades</button>
                    <button className={`tab-btn ${tab === 'skins' ? 'active' : ''}`} onClick={() => setTab('skins')}>Skins</button>
                </div>

                <div className="shop-content">
                    {tab === 'upgrades' && (
                        <div className="perm-upgrades-list">
                            {PERM_UPGRADES.map(u => {
                                const level = engine.state.permUpgradesLevels[u.id] || 0;
                                const cost = engine.state.permUpgradeCosts[u.id] || u.baseCost;
                                const isMax = u.maxLevel && level >= u.maxLevel;
                                const canAfford = shards >= cost;
                                return (
                                    <div className="perm-card" key={u.id}>
                                        <div className="perm-info">
                                            <div className="perm-name">{u.name}</div>
                                            <div className="perm-desc">{u.description}</div>
                                            <div className="perm-level">Lvl {level} {isMax ? '(MAX)' : ''}</div>
                                        </div>
                                        <button 
                                            className={`perm-buy ${canAfford ? 'can' : 'cant'}`} 
                                            disabled={isMax || !canAfford}
                                            onClick={() => handleBuyPerm(u.id)}
                                        >
                                            {isMax ? 'MAX' : `Buy (${formatNumber(cost)})`}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {tab === 'skins' && (
                        <div className="skins-grid">
                            {MARBLE_SKINS.map(s => {
                                const ownedCount = engine.state.ownedMarbles.length;
                                const cost = Math.round(s.cost * (1 + ownedCount * 0.25));
                                const isOwned = engine.state.ownedMarbles.includes(s.id);
                                const isEquipped = engine.state.activeMarbleSkinID === s.id;
                                const canAfford = shards >= cost;

                                return (
                                    <SkinCard 
                                        key={s.id}
                                        skin={s}
                                        isOwned={isOwned}
                                        isEquipped={isEquipped}
                                        canAfford={canAfford}
                                        onBuy={handleBuySkin}
                                        onEquip={handleEquipSkin}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
