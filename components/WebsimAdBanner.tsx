import React, { useEffect, useRef } from 'react';
import { UnderdogService } from '../services/underdogService';
import { WebsimAdsService } from '../services/websimAdsService';

interface WebsimAdBannerProps {
    id: string;
    type?: 'banner' | 'square';
    className?: string;
    style?: React.CSSProperties;
}

export const WebsimAdBanner: React.FC<WebsimAdBannerProps> = ({ 
    id, 
    type = 'banner', 
    className = '', 
    style 
}) => {
    const isWebsim = UnderdogService.isWebsim();
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isWebsim) return;

        const timer = setTimeout(() => {
            if (containerRef.current) {
                if (type === 'square') {
                    WebsimAdsService.renderBanner(`#${id}`);
                } else {
                    WebsimAdsService.renderBannerAd(`#${id}`);
                }
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [isWebsim, id, type]);

    if (!isWebsim) return null;

    return (
        <div 
            className={`ad-container p-1.5 rounded-lg bg-black/40 border border-white/10 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center my-1.5 mx-auto w-full max-w-full overflow-hidden ${className}`}
            style={style}
        >
            <div 
                id={id} 
                ref={containerRef}
                className="websim-ad-block w-full flex items-center justify-center rounded-md overflow-hidden bg-black/30"
                style={{
                    width: '100%',
                    minHeight: type === 'square' ? '200px' : '55px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            />
            <div className="flex items-center gap-1.5 mt-1 opacity-60">
                <span className="text-[7.5px] font-mono tracking-widest text-slate-400 uppercase font-black px-1.5 py-0.2 rounded bg-white/5 border border-white/10">
                    AD
                </span>
                <span className="text-[7.5px] font-mono tracking-wider text-slate-500 uppercase font-bold">
                    ADVERTISEMENT
                </span>
            </div>
        </div>
    );
};

