
import React from 'react';
import { engine } from '../../game/engine';
import { GameState } from '../../game/types';

interface OptionsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    gameState: GameState;
    onOpenStats: () => void;
    onOpenTutorials: () => void;
    onReset: () => void;
    forceUpdate: () => void;
}

export const OptionsPanel = ({ isOpen, onClose, gameState, onOpenStats, onOpenTutorials, onReset, forceUpdate }: OptionsPanelProps) => {
    return (
        <div className={`sidebar-right ${isOpen ? 'open' : ''}`}>
            <div className="panel-header">
                <h2>Options</h2>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="sidebar-content">
                
                <button className="btn-toggle" onClick={onOpenStats}>
                    Stats
                </button>
                
                <button className="btn-toggle" onClick={onOpenTutorials}>
                    Tutorials
                </button>
                
                <div className="option-row" style={{marginTop:'20px'}}>
                    <label className="option-label" style={{display:'flex', justifyContent:'space-between'}}>
                        SFX Volume <span>{Math.round(gameState.sfxVolume * 100)}%</span>
                    </label>
                    <input 
                        type="range" min="0" max="1" step="0.1" 
                        defaultValue={gameState.sfxVolume}
                        onChange={(e) => {
                            engine.state.sfxVolume = parseFloat(e.target.value);
                            engine.audio.setSfxVolume(parseFloat(e.target.value));
                            forceUpdate();
                        }}
                    />
                </div>
                <div className="option-row">
                    <label className="option-label" style={{display:'flex', justifyContent:'space-between'}}>
                        Music Volume <span>{Math.round(gameState.musicVolume * 100)}%</span>
                    </label>
                    <input 
                        type="range" min="0" max="1" step="0.1" 
                        defaultValue={gameState.musicVolume}
                        onChange={(e) => {
                            engine.state.musicVolume = parseFloat(e.target.value);
                            engine.audio.setMusicVolume(parseFloat(e.target.value));
                            forceUpdate();
                        }}
                    />
                </div>
                
                <button className={`btn-pill ${gameState.sfxMuted ? 'muted' : ''}`} onClick={() => {
                    engine.state.sfxMuted = !engine.state.sfxMuted;
                    engine.audio.toggleSfxMute(engine.state.sfxMuted);
                    forceUpdate();
                }}>
                    {gameState.sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
                </button>

                <button className={`btn-pill ${gameState.musicMuted ? 'muted' : ''}`} onClick={() => {
                    engine.state.musicMuted = !engine.state.musicMuted;
                    engine.audio.toggleMusicMute(engine.state.musicMuted);
                    forceUpdate();
                }}>
                    {gameState.musicMuted ? 'Unmute Music' : 'Mute Music'}
                </button>
                
                <div className="option-row" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: '10px'}}>
                    <span style={{fontSize:'0.9rem', color:'#ccc'}}>Peg Sounds</span>
                    <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'2px', display:'flex'}}>
                        <button className={`toggle-switch ${gameState.pegMuted ? 'active' : ''}`} onClick={() => {
                            engine.state.pegMuted = true; forceUpdate();
                        }}>Off</button>
                        <button className={`toggle-switch ${!gameState.pegMuted ? 'active' : ''}`} onClick={() => {
                            engine.state.pegMuted = false; forceUpdate();
                        }}>On</button>
                    </div>
                </div>

                <div className="option-row" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: '5px'}}>
                    <span style={{fontSize:'0.9rem', color:'#ccc'}}>Basket Sounds</span>
                    <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'2px', display:'flex'}}>
                        <button className={`toggle-switch ${gameState.basketMuted ? 'active' : ''}`} onClick={() => {
                            engine.state.basketMuted = true; forceUpdate();
                        }}>Off</button>
                        <button className={`toggle-switch ${!gameState.basketMuted ? 'active' : ''}`} onClick={() => {
                            engine.state.basketMuted = false; forceUpdate();
                        }}>On</button>
                    </div>
                </div>
                
                <div className="option-row" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'15px'}}>
                    <span style={{fontSize:'0.9rem', color:'#ccc'}}>Physics</span>
                    <button className="btn-pill small" onClick={() => {
                        engine.running = !engine.running;
                        forceUpdate();
                    }}>
                        {engine.running ? 'Pause' : 'Resume'}
                    </button>
                </div>
                
                <div className="option-row" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <span style={{fontSize:'0.9rem', color:'#ccc'}}>Disable $ popups</span>
                    <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'2px', display:'flex'}}>
                        <button className={`toggle-switch ${gameState.disableMoneyPopups ? '' : 'active'}`} onClick={() => {
                            engine.state.disableMoneyPopups = false; forceUpdate();
                        }}>Off</button>
                        <button className={`toggle-switch ${gameState.disableMoneyPopups ? 'active' : ''}`} onClick={() => {
                            engine.state.disableMoneyPopups = true; forceUpdate();
                        }}>On</button>
                    </div>
                </div>

                <div className="option-row" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'15px'}}>
                    <span style={{fontSize:'0.9rem', color:'#ccc'}}>Theme</span>
                    <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'2px', display:'flex'}}>
                        <button className={`toggle-switch ${gameState.activeTheme === 'dark' ? 'active' : ''}`} onClick={() => {
                            engine.state.activeTheme = 'dark'; forceUpdate(); engine.saveState();
                        }}>Dark</button>
                        <button className={`toggle-switch ${gameState.activeTheme === 'purple' ? 'active' : ''}`} onClick={() => {
                            engine.state.activeTheme = 'purple'; forceUpdate(); engine.saveState();
                        }}>Purple</button>
                    </div>
                </div>

                <div style={{marginTop:'auto', paddingTop:'20px'}}>
                    <details className="data-dropdown">
                        <summary>Data</summary>
                        <div className="data-content">
                            <button className="reset-btn" onClick={onReset}>Reset Progress</button>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
};
