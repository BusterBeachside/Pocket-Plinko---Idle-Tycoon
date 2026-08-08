import { UnderdogService } from './underdogService';

declare global {
    interface Window {
        WebSimAds?: any;
        websimAdsInstance?: any;
    }
}

export class WebsimAdsService {
    private static instance: any = null;

    /**
     * Initializes or retrieves the WebSimAds singleton instance.
     */
    public static getInstance(): any {
        if (!UnderdogService.isWebsim()) return null;

        if (this.instance) return this.instance;

        if (typeof window !== 'undefined') {
            if (window.websimAdsInstance) {
                this.instance = window.websimAdsInstance;
                return this.instance;
            }

            if (window.WebSimAds) {
                try {
                    this.instance = new window.WebSimAds({ creator: 'BusterBeachside' });
                    window.websimAdsInstance = this.instance;
                    return this.instance;
                } catch (e) {
                    console.error("[WebSimAds] Failed to instantiate WebSimAds:", e);
                }
            }
        }
        return null;
    }

    /**
     * Renders a Banner Ad (adaptive horizontal, vertical, or square aspect ratio).
     */
    public static renderBannerAd(containerSelectorOrEl: string | HTMLElement): void {
        if (!UnderdogService.isWebsim()) return;

        const ads = this.getInstance();
        if (ads) {
            try {
                if (typeof ads.renderBannerAd === 'function') {
                    ads.renderBannerAd(containerSelectorOrEl);
                } else if (typeof ads.renderBanner === 'function') {
                    ads.renderBanner(containerSelectorOrEl);
                }
            } catch (err) {
                console.error("[WebSimAds] Error rendering banner ad:", err);
            }
        } else {
            // Retry briefly if SDK script is still loading asynchronously
            setTimeout(() => {
                const retryAds = this.getInstance();
                if (retryAds) {
                    try {
                        if (typeof retryAds.renderBannerAd === 'function') {
                            retryAds.renderBannerAd(containerSelectorOrEl);
                        } else if (typeof retryAds.renderBanner === 'function') {
                            retryAds.renderBanner(containerSelectorOrEl);
                        }
                    } catch (e) {}
                }
            }, 300);
        }
    }

    /**
     * Renders a Square Image Block Ad.
     */
    public static renderBanner(containerSelectorOrEl: string | HTMLElement): void {
        if (!UnderdogService.isWebsim()) return;

        const ads = this.getInstance();
        if (ads) {
            try {
                if (typeof ads.renderBanner === 'function') {
                    ads.renderBanner(containerSelectorOrEl);
                } else if (typeof ads.renderBannerAd === 'function') {
                    ads.renderBannerAd(containerSelectorOrEl);
                }
            } catch (err) {
                console.error("[WebSimAds] Error rendering image block ad:", err);
            }
        } else {
            setTimeout(() => {
                const retryAds = this.getInstance();
                if (retryAds) {
                    try {
                        if (typeof retryAds.renderBanner === 'function') {
                            retryAds.renderBanner(containerSelectorOrEl);
                        } else if (typeof retryAds.renderBannerAd === 'function') {
                            retryAds.renderBannerAd(containerSelectorOrEl);
                        }
                    } catch (e) {}
                }
            }, 300);
        }
    }

    /**
     * Statically stops all video/audio playback and cleans up ad overlay elements in DOM.
     */
    public static cleanupAdElements(): void {
        if (typeof document === 'undefined') return;
        try {
            // Stop and unload all audio/video elements in document
            const mediaEls = document.querySelectorAll('video, audio');
            mediaEls.forEach((media: any) => {
                try {
                    media.pause();
                    media.currentTime = 0;
                    media.removeAttribute('src');
                    media.load();
                } catch (e) {
                    // Ignore individual media element cleanup errors
                }
            });

            // Remove any fullscreen ad container/iframe elements injected by ad networks
            const adContainers = document.querySelectorAll(
                '[class*="websim-ad-overlay"], [id*="websim-ad-overlay"], [class*="rewarded-ad"], [id*="rewarded-ad"], iframe[src*="websim"]'
            );
            adContainers.forEach((el: any) => {
                try {
                    // Remove if it's an overlay or iframe element
                    if (el && el.parentNode && (el.style?.position === 'fixed' || el.style?.position === 'absolute' || el.tagName === 'IFRAME')) {
                        el.parentNode.removeChild(el);
                    }
                } catch (e) {
                    // Ignore removal error
                }
            });
        } catch (err) {
            console.error("[WebSimAds] Error cleaning up ad elements:", err);
        }
    }

    /**
     * Shows a Rewarded Ad (30s) and handles reward/completion callbacks.
     */
    public static showRewarded(callbacks: {
        onStart?: () => void;
        onReward?: () => void;
        onClose?: () => void;
    }): void {
        const handleClose = () => {
            WebsimAdsService.cleanupAdElements();
            if (callbacks.onClose) callbacks.onClose();
        };

        if (!UnderdogService.isWebsim()) {
            // Non-websim or fallback mode: execute reward and close directly for testing/local play
            if (callbacks.onStart) callbacks.onStart();
            if (callbacks.onReward) callbacks.onReward();
            handleClose();
            return;
        }

        const ads = this.getInstance();
        if (ads && typeof ads.showRewarded === 'function') {
            try {
                ads.showRewarded({
                    onStart: () => {
                        if (callbacks.onStart) callbacks.onStart();
                    },
                    onReward: () => {
                        if (callbacks.onReward) callbacks.onReward();
                    },
                    onClose: () => {
                        handleClose();
                    }
                });
            } catch (err) {
                console.error("[WebSimAds] Error calling showRewarded:", err);
                if (callbacks.onStart) callbacks.onStart();
                if (callbacks.onReward) callbacks.onReward();
                handleClose();
            }
        } else {
            if (callbacks.onStart) callbacks.onStart();
            if (callbacks.onReward) callbacks.onReward();
            handleClose();
        }
    }
}
