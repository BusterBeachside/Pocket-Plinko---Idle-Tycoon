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
     * Shows a Rewarded Ad (30s) and handles reward/completion callbacks.
     */
    public static showRewarded(callbacks: {
        onStart?: () => void;
        onReward?: () => void;
        onClose?: () => void;
    }): void {
        if (!UnderdogService.isWebsim()) {
            // Non-websim or fallback mode: execute reward and close directly for testing/local play
            if (callbacks.onStart) callbacks.onStart();
            if (callbacks.onReward) callbacks.onReward();
            if (callbacks.onClose) callbacks.onClose();
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
                        if (callbacks.onClose) callbacks.onClose();
                    }
                });
            } catch (err) {
                console.error("[WebSimAds] Error calling showRewarded:", err);
                if (callbacks.onStart) callbacks.onStart();
                if (callbacks.onReward) callbacks.onReward();
                if (callbacks.onClose) callbacks.onClose();
            }
        } else {
            if (callbacks.onStart) callbacks.onStart();
            if (callbacks.onReward) callbacks.onReward();
            if (callbacks.onClose) callbacks.onClose();
        }
    }
}
