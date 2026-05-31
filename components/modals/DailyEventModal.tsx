import React from 'react';
import { DailyEvent } from '../../game/dailyEvents';

interface DailyEventModalProps {
    currentEvent: DailyEvent;
    onClose: () => void;
}

export const DailyEventModal: React.FC<DailyEventModalProps> = ({ currentEvent, onClose }) => {
    return (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="confirm-modal prestige-modal max-w-md text-white" style={{ background: '#11131a', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Header */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Special Event!</h2>
                    </div>
                    <button onClick={onClose} className="text-xl hover:text-red-400 transition-colors cursor-pointer px-2">×</button>
                </div>
                {/* Main Card */}
                <div className={`p-4 rounded-xl border border-white/5 ${currentEvent.bgClass} flex flex-col gap-2 mb-4`}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs bg-black/40 px-2 py-0.5 rounded font-bold uppercase text-emerald-400">
                            ACTIVE TODAY
                        </span>
                        
                    </div>
                    <div className={`text-2xl font-black tracking-tight ${currentEvent.color}`}>
                        {currentEvent.name}
                    </div>
                    <p className="text-sm text-slate-300 font-medium leading-relaxed my-1">
                        {currentEvent.explanation}
                    </p>
                    <div className="mt-2 text-xs bg-black/35 p-2 rounded text-amber-400 font-mono flex items-center gap-2">
                        <span>ACTIVE BUFF:</span>
                        <span className="font-bold text-slate-100">{currentEvent.description}</span>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="flex justify-end pt-2 border-t border-white/5 mt-4">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded transition-all cursor-pointer font-bold uppercase tracking-wider"
                    >
                        Let's Play!
                    </button>
                </div>
            </div>
        </div>
    );
};
