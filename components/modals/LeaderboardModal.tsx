
import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';
import { formatNumber } from '../../game/utils';
import { assets } from '../../game/assets';
import { AvatarDisplay } from '../AvatarDisplay';

interface LeaderboardEntry {
    currency: number;
    stats: any;
    profiles: {
        username: string;
        avatar_url: string;
    };
}

export const LeaderboardModal = ({ onClose }: { onClose: () => void }) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hoveredEntry, setHoveredEntry] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [data, user] = await Promise.all([
                SupabaseService.getGlobalLeaderboard(),
                SupabaseService.getCurrentUser()
            ]);
            setEntries(data);
            if (user) setCurrentUserId(user.id);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="confirm-modal leaderboard-modal" onMouseMove={handleMouseMove}>
                <div className="modal-header-row">
                    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                        <h2 className="column-title daily" style={{ fontSize: '1.5rem', margin: 0 }}>Global Leaderboard</h2>
                        <button 
                            className={`refresh-btn ${refreshing ? 'spinning' : ''}`} 
                            onClick={() => fetchData(true)}
                            disabled={loading || refreshing}
                            title="Refresh rankings"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                    <button className="close-core" onClick={onClose}>Close</button>
                </div>

                <div className="leaderboard-container">
                    {loading ? (
                        <div className="loading-spinner">Loading rankings...</div>
                    ) : entries.length === 0 ? (
                        <div className="empty-state">No rankings found yet. Be the first!</div>
                    ) : (
                        <div className="leaderboard-list">
                            <div className="leaderboard-header">
                                <span className="rank">#</span>
                                <span className="player">Player</span>
                                <span className="mps">Peak $/s</span>
                                <span className="earnings">Lifetime</span>
                            </div>
                             {entries.map((entry, index) => {
                                const isMe = (entry as any).user_id === currentUserId;
                                
                                return (
                                    <div 
                                        key={index} 
                                        className={`leaderboard-row ${isMe ? 'is-me' : ''}`}
                                        onMouseEnter={() => setHoveredEntry(index)}
                                        onMouseLeave={() => setHoveredEntry(null)}
                                    >
                                        <span className="rank">{index + 1}</span>
                                        <div className="player-info">
                                            <AvatarDisplay 
                                                avatarId={entry.profiles?.avatar_url || 'marble_white'} 
                                                size={32} 
                                                ownedSkins={entry.stats?.ownedMarbles || []}
                                            />
                                            <span className="username">
                                                {entry.profiles?.username || 'Anonymous'}
                                                {isMe && <span className="me-tag"> (You)</span>}
                                            </span>
                                        </div>
                                        <span className="mps">${formatNumber(entry.stats?.peakMps || 0)}</span>
                                        <span className="earnings">${formatNumber(entry.stats?.lifetimeEarnings || 0)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {hoveredEntry !== null && entries[hoveredEntry] && (
                    <div 
                        className="leaderboard-tooltip"
                        style={{ 
                            left: mousePos.x + 15, 
                            top: mousePos.y + 15,
                            position: 'fixed',
                            zIndex: 10000
                        }}
                    >
                        <div className="tooltip-header">
                            {entries[hoveredEntry].profiles?.username || 'Anonymous'}
                        </div>
                        <div className="tooltip-stats">
                            <div className="tooltip-stat">
                                <span>Times Prestiged:</span>
                                <strong>{entries[hoveredEntry].stats?.timesPrestiged || 0}</strong>
                            </div>
                            <div className="tooltip-stat">
                                <span>Master Multiplier:</span>
                                <strong>x{formatNumber(entries[hoveredEntry].stats?.masterMultiplier || 1)}</strong>
                            </div>
                            <div className="tooltip-stat">
                                <span>Achievements:</span>
                                <strong>{entries[hoveredEntry].stats?.achievementsUnlocked || 0}</strong>
                            </div>
                            <div className="tooltip-stat">
                                <span>Skins Unlocked:</span>
                                <strong>{entries[hoveredEntry].stats?.ownedMarbles?.length || 1}</strong>
                            </div>
                            <div className="tooltip-stat">
                                <span>Kinetic Shards:</span>
                                <strong>{formatNumber(entries[hoveredEntry].stats?.kineticShards || 0)}</strong>
                            </div>
                            <div className="tooltip-stat">
                                <span>Total Play Time:</span>
                                <strong>{Math.floor((entries[hoveredEntry].stats?.totalPlayTime || 0) / 3600)}h</strong>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
