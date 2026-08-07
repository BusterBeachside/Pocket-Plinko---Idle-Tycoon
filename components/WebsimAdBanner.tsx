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
            id={id} 
            ref={containerRef}
            className={`websim-ad-block ${className}`}
            style={{
                width: '100%',
                minHeight: type === 'square' ? '220px' : '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '12px 0 6px 0',
                borderRadius: '10px',
                overflow: 'hidden',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.06)',
                ...style
            }}
        />
    );
};
