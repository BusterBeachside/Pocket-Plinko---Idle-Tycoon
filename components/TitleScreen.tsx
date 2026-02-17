import React from 'react';

export const TitleScreen = ({ onStart, loading, progress }: { onStart: () => void, loading: boolean, progress: number }) => {
    return (
        <div className="title-screen" onClick={loading ? undefined : onStart}>
            <h1 className="header-title" style={{fontSize: '3rem', marginBottom:'2rem'}}>Pocket Plinko</h1>
            <div className="start-prompt" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'12px'}}>
                {loading ? (
                    <>
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
                        <div style={{fontSize: '0.9rem', color: '#aaa'}}>
                            Loading Assets... {Math.round(progress * 100)}%
                        </div>
                    </>
                ) : (
                    'Click to Start'
                )}
            </div>
        </div>
    );
};