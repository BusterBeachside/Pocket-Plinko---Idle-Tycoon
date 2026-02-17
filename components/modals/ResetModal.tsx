import React from 'react';

export const ResetModal = ({ step, onCancel, onConfirm }: { step: 1 | 2, onCancel: () => void, onConfirm: () => void }) => {
    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="confirm-modal" style={{padding: '25px', maxWidth: '400px', textAlign: 'center'}}>
                {step === 1 && (
                    <p style={{fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '25px', lineHeight: '1.4'}}>
                        PERMANENTLY DELETE all game data and start fresh. Are you sure?
                    </p>
                )}
                {step === 2 && (
                    <p style={{fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '25px', color: '#ff6b6b', lineHeight: '1.4'}}>
                        This is irreversible! Are you REALLY sure?
                    </p>
                )}
                <div style={{display: 'flex', justifyContent: 'center', gap: '15px'}}>
                    <button style={{
                        background: '#e74c3c', color: 'white', border: 'none', padding: '12px 24px', 
                        borderRadius: '8px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer',
                        boxShadow: '0 4px 0 #c0392b', transition: 'transform 0.1s'
                    }} onClick={onConfirm} className="active-btn">Yes</button>
                    <button style={{
                        background: '#95a5a6', color: '#2c3e50', border: 'none', padding: '12px 24px', 
                        borderRadius: '8px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer',
                        boxShadow: '0 4px 0 #7f8c8d', transition: 'transform 0.1s'
                    }} onClick={onCancel} className="active-btn">No</button>
                </div>
            </div>
        </div>
    );
};