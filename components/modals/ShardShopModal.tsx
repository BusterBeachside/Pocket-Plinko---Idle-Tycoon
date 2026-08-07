import React, { useEffect, useState } from 'react';
import { engine } from '../../game/engine';
import { PERM_UPGRADES, MARBLE_SKINS, SHARD_SHOP_GEMS, getPermanentUpgradeCost } from '../../game/shardShopConfig';
import { formatNumber } from '../../game/utils';
import { assets } from '../../game/assets';

const SkinCard = ({ skin, cost, isOwned, isEquipped, canAfford, onBuy, onEquip }: any) => {
    const displayStyle = skin.texture 
        ? { backgroundImage: `url(images/${skin.texture})` }
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
                    Buy ({formatNumber(cost)})
                </button>
            )}
        </div>
    );
};

export const ShardShopModal = ({ onClose }: { onClose: () => void }) => {
    const [tab, setTab] = useState<'upgrades' | 'skins' | 'gems'>('upgrades');
    const [shards, setShards] = useState(engine.state.kineticShards);
    const [updateTick, setUpdateTick] = useState(0);

    useEffect(() => {
        const unsub = engine.subscribe(() => {
            setShards(engine.state.kineticShards);
            setUpdateTick(t => t + 1);
        });
        
        // Trigger Shard Shop Tutorial if not seen
        const seen = engine.state.tutorials['plinko_seen_shardshop_tutorial_v1'] || localStorage.getItem('plinko_seen_shardshop_tutorial_v1');
        if (!seen) {
            window.dispatchEvent(new CustomEvent('request-tutorial', { detail: { key: 'tut_shard' } }));
        }

        return () => { unsub(); };
    }, []);

    const handleBuyPerm = (id: string) => { engine.buyPermanentUpgrade(id); };
    const handleBuySkin = (id: string) => { engine.buySkin(id); };
    const handleEquipSkin = (id: string) => { engine.equipSkin(id); };
    const handleBuyGem = (type: 'ruby' | 'emerald' | 'diamond') => { engine.buyGem(type); };

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
                    <button className={`tab-btn ${tab === 'gems' ? 'active' : ''}`} onClick={() => setTab('gems')}>Gems 💎</button>
                </div>

                <div className="shop-content">
                    {tab === 'upgrades' && (
                        <div className="perm-upgrades-list">
                            {PERM_UPGRADES.map(u => {
                                const level = engine.state.permUpgradesLevels[u.id] || 0;
                                const cost = getPermanentUpgradeCost(level, u.id);
                                const isMax = u.maxLevel !== undefined && u.maxLevel > 0 && level >= u.maxLevel;
                                const canAfford = shards >= cost;
                                return (
                                    <div className="perm-card" key={u.id}>
                                        <div className="perm-info">
                                            <div className="perm-name">{u.name}</div>
                                            <div className="perm-desc">{u.description}</div>
                                            <div className="perm-level">Lvl {level} {isMax ? '(MAX)' : ''}</div>
                                        </div>
                                        <button 
                                            className={`perm-buy ${isMax ? 'maxed' : (canAfford ? 'can' : 'cant')}`} 
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
                                const ownedOfRarity = engine.state.ownedMarbles.filter(oId => {
                                    const matchingSkin = MARBLE_SKINS.find(x => x.id === oId);
                                    return matchingSkin && matchingSkin.rarity === s.rarity && matchingSkin.cost > 0;
                                }).length;
                                const cost = Math.round(s.cost * (1 + ownedOfRarity * 0.25));
                                const isOwned = engine.state.ownedMarbles.includes(s.id);
                                const isEquipped = engine.state.activeMarbleSkinID === s.id;
                                const canAfford = shards >= cost;

                                return (
                                    <SkinCard 
                                        key={s.id}
                                        skin={s}
                                        cost={cost}
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

                    {tab === 'gems' && (
                        <div className="perm-upgrades-list">
                            <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl mb-3 text-xs text-cyan-200 leading-relaxed font-medium">
                                💎 <span className="font-bold text-cyan-300">End-Game Gem Market:</span> Directly purchase socketable Gems with Kinetic Shards! Socket them onto pegs for permanent board-wide multiplier powers.
                            </div>
                            {SHARD_SHOP_GEMS.map(g => {
                                const currentOwned = engine.state.gems?.[g.gemKey] || 0;
                                const canAfford = shards >= g.cost;
                                return (
                                    <div className="perm-card flex items-center justify-between p-3.5 bg-black/40 border border-white/10 rounded-xl mb-2.5" key={g.type}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-black/50 border border-white/10 p-1.5 shrink-0">
                                                <img src={assets.getSrc(g.imgKey as any)} alt={g.name} className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                                            </div>
                                            <div className="perm-info">
                                                <div className="perm-name flex items-center gap-2 text-sm font-bold text-white">
                                                    <span>{g.name}</span>
                                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-white/10 text-cyan-300 border border-white/10">
                                                        Owned: {currentOwned}
                                                    </span>
                                                </div>
                                                <div className="perm-desc text-xs text-slate-300 mt-0.5">{g.description}</div>
                                            </div>
                                        </div>
                                        <button 
                                            className={`perm-buy shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${canAfford ? 'can' : 'cant'}`} 
                                            disabled={!canAfford}
                                            onClick={() => handleBuyGem(g.type)}
                                        >
                                            Buy ({formatNumber(g.cost)})
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
