import React, { useState } from 'react';
import { UnderdogService } from '../services/underdogService';

export const TitleScreen = ({ onStart, loading, progress }: { onStart: () => void, loading: boolean, progress: number }) => {
    const [expanded, setExpanded] = useState<string | null>('v3.3 - The Adventure Update');
    const isWebsim = UnderdogService.isWebsim();

    const updates = [
        {
            version: 'v3.3 - The Adventure Update',
            blurb: `Greetings, Tycoons! Update 3.3 has arrived, and it brings with it a brand new game mode!

- Added Adventure Mode. In this mode, you will make progress on new and unique boards, separate from your main progression. Each board type has its own unique gimmick! Meet the earnings goal to clear it and move on to the next board. See how far you can get!
- Fixed particularly large Websim Ad banner sometimes taking up way too much space in menus
- Another attempted fix for leaderboard cheats (Note: Websim databases are impossible to make 100% secure as of now, but I've done about as much as I can to put some roadblocks in place. A determined cheater could still get around these with enough dedication, but in case it wasn't clear, I'll say it here: PLEASE DO NOT ATTEMPT TO SUBMIT CHEATED SCORES. Players submitting cheated scores will be banned upon detection. Thank you!)
- The game now always loads into the main board when a Challenge was the last-played mode.
- Pop-ups for things like Challenges ending or daily events should no longer appear on the title screen.
- Updated the mobile layout to make slightly better use of space on some screen sizes

Please remember to leave feature suggestions, bug reports, and, ahem, Credit tips, in the comments! :)

Thank you for playing Pocket Plinko!`
        },
        {
            version: 'v3.2 - The Performance Update',
            blurb: `Greetings Tycoons! Today brings an update for bug fixes and new performance features.

- Fixed video ads lagging and/or continuing to play in the background after closed (Attempted fix; please continue reporting bugs!)
- When pausing the game via the "Physics Engine" option, the game should now be less laggy than before
- Fixed the board being smaller than intended on some screen sizes. This was caused by a previous fix to remove letterboxing. The board should now scale to fit your screen dynamically!
- Fixed prestige animation being broken (Thanks for the report, CoponStackos!)
- Fixed Challenges being shown as "In Progress" prior to actually being started under certain conditions
- Micro marbles can no longer be spawned while physics are paused
- Added Low and Medium quality options. Players with weaker devices can use this disable some special effects in exchange for better performance
- Added an option to display FPS to help players find a performance setup that works for them. Appears at the top-right of the plinko board
- Made various optimizations to help improve performance. If the game is still laggy, try some of the new Performance options such as Dynamic Merge, disabling Money Popups, or lowering the Quality
- Added a robust Debug Mode. It's only visible to me, but it will greatly help in testing things going forward. Why am I telling you this? Well, because anybody can access it by typing a certain string of letters while playing. When Debug Mode is enabled, the game will no longer save. When disabling Debug Mode, the game will restore your last save. Therefore, it's just an Easter Egg for regular players. Good luck finding it!

Thank you for playing Pocket Plinko!`
        },
        {
            version: 'v3.1',
            blurb: `Today I've brought a semi-major update to you! It includes QoL updates, fixes, and a few new features!
- Fixed regular and micro marbles sometimes not counting towards missions
- Changed Anti-Gravity Chamber challenge (Should now be easier)
- Fixed Bonus Chance and Micro Value upgrades in Challenge mode to reflect their modern effects
- Refactored the Options panel into new drop-down menus to reduce visual clutter
- Added a dynamic "Merge Mode" that will combine like marbles into one object. Use this if your performance is suffering with a lot of marbles on-screen. Located under Gameplay & Visuals.
- The Challenge Dome button will no longer animate once you've started the current challenge
- On mobile, the Challenge Dome button now appears directly on the bottom navbar
- The Kinetic Core (Prestige) button now only animates when you meet both the Marble AND Money requirements to prestige
- Fixed black letterboxing margins appearing by the plinko board on odd screen resolution (e.g. taller/wider phone screens)
- Changed the Shard Shop button coloration to match the main upgrade design language (Green = can buy, red = not enough money, gray = locked/maxed out)
- Re-Added Websim Ads by CoponStackos. You will now see a few image ads appearing throughout the game in non-obtrusive places. You can also watch Rewarded Ads for some generous in-game boosts!
- Added a Gems section to the Shard Shop. Peg Socket gems may be purchased here, but they are extremely expensive. Intended to give end-game players something to spend their shards on!

Thank you for playing Pocket Plinko!`
        },
        { 
            version: 'v3.0.2', 
            blurb: `Another minor bug fix update!
- Fixed Shard Shop prices not increasing
- Fixed Peg Socket Builder having inaccurate controls on mobile
- Made Peg Socket window collapsable so you can access the rest of the board on mobile
- More leaderboard fixes (Should now show all 50 marble skins)
- Your avatar selection will now be saved (Accessible by clicking the profile button in the top-left)
- Re-added the "Pin for later" ad to the loading screen (We have daily events and offline income, why not check back occasionally?)
Thank you for playing Pocket Plinko!` 
        },
        { 
            version: 'v3.0.1', 
            blurb: 'Account system ported back to Websim. Your game progress and leaderboard position will now be automatically saved and tracked between devices. Thank you for playing Pocket Plinko!' 
        },
        { 
            version: 'v3.0', 
            blurb: "I've returned! After rebuilding Pocket Plinko from the ground up, this version is far more optimized and packed with new features. Progress from earlier versions has been reset. The account system uses my own custom database for now — create an account for cloud saves and leaderboard access." 
        }
    ];

    return (
        <div className="title-screen select-none px-4 py-6 overflow-y-auto" onClick={loading ? undefined : onStart}>
            <h1 className="header-title" style={{ fontSize: '3rem', marginBottom: '1rem', textShadow: '0 0 20px rgba(255, 154, 0, 0.4)' }}>
                Pocket Plinko
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%', maxWidth: '580px' }}>
                <div className="start-prompt">
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '240px',
                                height: '14px',
                                background: '#222',
                                borderRadius: '10px',
                                border: '1px solid #444',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${progress * 100}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #ffd700, #ff9a00)',
                                    transition: 'width 0.2s ease-out'
                                }} />
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                                Loading Assets... {Math.round(progress * 100)}%
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em' }}>
                            Click to Start
                        </div>
                    )}
                </div>

                {/* Websim-only Pin Ad (Persists into Title Screen after loading, full resolution) */}
                {isWebsim && (
                    <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'center' }}>
                        <img 
                            src="images/PinAd.png" 
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = './PinAd.png'; }}
                            alt="Pin for later" 
                            style={{ 
                                maxWidth: '100%', 
                                maxHeight: '240px',
                                borderRadius: '12px', 
                                border: '1px solid rgba(255,255,255,0.12)', 
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                objectFit: 'contain'
                            }} 
                        />
                    </div>
                )}

                {/* Websim-only Recent Updates */}
                {isWebsim && (
                    <div style={{ 
                        width: '100%', 
                        maxHeight: '220px', 
                        overflowY: 'auto', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '6px', 
                        scrollbarWidth: 'thin',
                        marginTop: '4px' 
                    }}>
                        <div style={{ 
                            color: '#ffd700', 
                            fontSize: '11px', 
                            fontWeight: 900, 
                            letterSpacing: '0.2em', 
                            textAlign: 'center', 
                            marginBottom: '2px', 
                            fontFamily: 'monospace' 
                        }}>
                            RECENT UPDATES
                        </div>
                        {updates.map(u => {
                            const open = expanded === u.version;
                            return (
                                <div 
                                    key={u.version} 
                                    onClick={e => { e.stopPropagation(); setExpanded(open ? null : u.version); }} 
                                    style={{ 
                                        background: 'rgba(0,0,0,0.65)', 
                                        border: open ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.08)', 
                                        borderRadius: '8px', 
                                        padding: '8px 12px', 
                                        cursor: 'pointer', 
                                        transition: 'border-color 0.2s',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffd700', fontSize: '12px', fontWeight: 800 }}>
                                        <span>{u.version}</span>
                                        <span style={{ fontSize: '10px', color: '#888', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
                                            ▼
                                        </span>
                                    </div>
                                    {open && (
                                        <div style={{ color: '#e6e6e6', fontSize: '12px', lineHeight: '1.4', marginTop: '6px', paddingTop: '6px', whiteSpace: 'pre-line', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                            {u.blurb}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
