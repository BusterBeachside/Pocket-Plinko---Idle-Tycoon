/// <reference types="vite/client" />

export interface CrazyGamesUser {
    userId: string;
    username: string;
    profilePictureUrl: string;
}

export class CrazyGamesService {
    private static cachedAuthListener: any = null;
    private static isSdkBlocked = false;
    private static isInitialized = false;
    private static initPromise: Promise<void> | null = null;

    /**
     * Clear loaded cache or local references.
     */
    static getSDK() {
        if (this.isSdkBlocked) return null;
        if (typeof window !== 'undefined' && (window as any).CrazyGames && (window as any).CrazyGames.SDK) {
            return (window as any).CrazyGames.SDK;
        }
        return null;
    }

    /**
     * Check if CrazyGames SDK is loaded and available
     */
    static isAvailable(): boolean {
        return this.getSDK() !== null;
    }

    /**
     * Initialize the CrazyGames SDK asynchronously.
     * Ensures we only trigger init once and return the initialization promise.
     * Generously times out after 3000ms if run outside of CrazyGames iframe.
     */
    static async initSDK(): Promise<void> {
        if (this.isSdkBlocked) return;
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        const sdk = this.getSDK();
        if (!sdk) {
            return;
        }

        this.initPromise = new Promise<void>((resolve) => {
            const timeoutId = setTimeout(() => {
                console.warn("[CrazyGames SDK] Association handshake with the parent frame timed out (3000ms). Activating Sandbox Mock Mode.");
                this.isSdkBlocked = true;
                resolve();
            }, 3000);

            try {
                if (typeof sdk.init === 'function') {
                    sdk.init()
                        .then(() => {
                            clearTimeout(timeoutId);
                            this.isInitialized = true;
                            console.log("[CrazyGames SDK] Successfully initialized handshake.");
                            resolve();
                        })
                        .catch((err: any) => {
                            clearTimeout(timeoutId);
                            console.warn("[CrazyGames SDK] Handshake declined by CrazyGames wrapper:", err);
                            this.isSdkBlocked = true;
                            resolve();
                        });
                } else {
                    clearTimeout(timeoutId);
                    this.isSdkBlocked = true;
                    resolve();
                }
            } catch (err) {
                clearTimeout(timeoutId);
                console.warn("[CrazyGames SDK] SDK initialization failed with exception:", err);
                this.isSdkBlocked = true;
                resolve();
            }
        });

        return this.initPromise;
    }

    /**
     * Get the current authenticated user's profile.
     */
    static async getCurrentUser(): Promise<CrazyGamesUser | null> {
        await this.initSDK();
        const sdk = this.getSDK();
        if (!sdk) {
            const username = localStorage.getItem('crazy_mock_username') || localStorage.getItem('guest_username');
            if (username) {
                return {
                    userId: 'mock_unauthenticated_or_offline_user',
                    username,
                    profilePictureUrl: 'marble_white'
                };
            }
            return null;
        }

        try {
            const hasUser = await sdk.user.isUserSignedIn();
            if (!hasUser) return null;

            const user = await sdk.user.getUser();
            if (user) {
                return {
                    userId: user.userId || user.id,
                    username: user.username || 'CrazyPlayer',
                    profilePictureUrl: user.profilePictureUrl || 'marble_white'
                };
            }
            return null;
        } catch (err: any) {
            console.error("CrazyGames: Error checking signed-in user status", err);
            return null;
        }
    }

    /**
     * Display CrazyGames native sign-in dialog prompt.
     */
    static async showAuthPrompt(): Promise<CrazyGamesUser | null> {
        await this.initSDK();
        const sdk = this.getSDK();
        if (!sdk) {
            // Simulate local login inside preview sandbox
            const randomSuffix = Math.floor(Math.random() * 900) + 100;
            const newUsername = 'CrazyPlayer' + randomSuffix;
            localStorage.setItem('crazy_mock_username', newUsername);
            return {
                userId: 'mock_sandbox_id',
                username: newUsername,
                profilePictureUrl: 'marble_yellow'
            };
        }

        try {
            const user = await sdk.user.showAuthPrompt();
            if (user) {
                return {
                    userId: user.userId || user.id,
                    username: user.username || 'CrazyPlayer',
                    profilePictureUrl: user.profilePictureUrl || 'marble_white'
                };
            }
            return null;
        } catch (err) {
            console.error("CrazyGames Auth error", err);
            throw err;
        }
    }

    /**
     * Listen to CrazyGames auth status changes.
     */
    static addAuthListener(callback: (user: CrazyGamesUser | null) => void) {
        this.initSDK().then(() => {
            const sdk = this.getSDK();
            if (!sdk) return;

            try {
                this.cachedAuthListener = async () => {
                    const user = await this.getCurrentUser();
                    callback(user);
                };
                sdk.user.addAuthListener(this.cachedAuthListener);
            } catch (err) {
                console.error("CrazyGames addAuthListener error", err);
            }
        });
    }

    /**
     * Remove the active auth status listener
     */
    static removeAuthListener() {
        this.initSDK().then(() => {
            const sdk = this.getSDK();
            if (!sdk || !this.cachedAuthListener) return;

            try {
                sdk.user.removeAuthListener(this.cachedAuthListener);
                this.cachedAuthListener = null;
            } catch (err) {
                console.error("CrazyGames removeAuthListener error", err);
            }
        });
    }

    /**
     * Submit score to the native CrazyGames leaderboards.
     * Maps to ID "mps" (money per second) or another specified ID.
     */
    static async submitScore(score: number, leaderboardId: string = 'mps'): Promise<void> {
        await this.initSDK();
        const sdk = this.getSDK();
        if (!sdk) {
            console.log(`[CrazyGames Mock] High score submit: ${score} to ${leaderboardId}`);
            localStorage.setItem(`crazy_mock_highscore_${leaderboardId}`, score.toString());
            return;
        }

        try {
            await sdk.leaderboard.submitScore({
                leaderboardId,
                score: Math.floor(score)
            });
            console.log(`[CrazyGames API] Submitted score: ${score} -> ${leaderboardId}`);
        } catch (err) {
            console.error("CrazyGames submitScore error:", err);
        }
    }

    /**
     * Show the built-in, fully-featured Native Leaderboard Overlay.
     */
    static showLeaderboard(leaderboardId: string = 'mps') {
        this.initSDK().then(() => {
            const sdk = this.getSDK();
            if (!sdk) {
                alert(`[Local Preview Sandbox]\nCrazyGames native leaderboard "${leaderboardId}" requested!\nDeployed builds will show the beautiful immersive full screen overlay.`);
                return;
            }

            try {
                sdk.leaderboard.showLeaderboard({
                    leaderboardId
                });
            } catch (err) {
                console.error("CrazyGames showLeaderboard error:", err);
            }
        });
    }

    /**
     * Save current game progress using CrazyGames Data Module.
     */
    static async saveProgress(stats: any, currency: number = 0, settings: any = {}): Promise<void> {
        await this.initSDK();
        const sdk = this.getSDK();
        if (!sdk) {
            // Emulated saved progress via standard localStorage API inside preview
            localStorage.setItem('crazy_save_currency', Math.floor(currency).toString());
            localStorage.setItem('crazy_save_stats', JSON.stringify(stats));
            localStorage.setItem('crazy_save_settings', JSON.stringify(settings));
            localStorage.setItem('crazy_save_timestamp', new Date().toISOString());
            return;
        }

        try {
            const statsToSave = JSON.parse(JSON.stringify(stats));
            const payload = {
                currency: Math.floor(currency),
                stats: statsToSave,
                settings,
                updated_at: new Date().toISOString()
            };
            await sdk.data.setItem('pocket_plinko_save', JSON.stringify(payload));
        } catch (err) {
            console.error("CrazyGames saveProgress error:", err);
            throw err;
        }
    }

    /**
     * Load game progress from CrazyGames Cloud.
     */
    static async loadProgress(): Promise<any | null> {
        await this.initSDK();
        const sdk = this.getSDK();
        if (!sdk) {
            const currencyStr = localStorage.getItem('crazy_save_currency');
            const statsStr = localStorage.getItem('crazy_save_stats');
            const settingsStr = localStorage.getItem('crazy_save_settings');
            if (!statsStr) return null;
            return {
                currency: parseInt(currencyStr || '0', 10),
                stats: JSON.parse(statsStr),
                settings: settingsStr ? JSON.parse(settingsStr) : {}
            };
        }

        try {
            const dataStr = await sdk.data.getItem('pocket_plinko_save');
            if (!dataStr) return null;
            return JSON.parse(dataStr);
        } catch (err) {
            console.error("CrazyGames loadProgress error:", err);
            return null;
        }
    }

    /**
     * Sync data between local state and cloud state (uses highest allTimeEarnings/lifetimeEarnings)
     */
    static async syncData(localState: any): Promise<any> {
        await this.initSDK();
        const user = await this.getCurrentUser();
        if (!user) return localState;

        try {
            const cloudData = await this.loadProgress();
            
            if (!cloudData) {
                // No cloud data yet, sync local to cloud
                const { money, ...stats } = localState;
                await this.saveProgress(stats, money, {});
                return localState;
            }

            const cloudAllTime = cloudData.stats?.allTimeEarnings || cloudData.stats?.lifetimeEarnings || 0;
            const localAllTime = localState.allTimeEarnings || localState.lifetimeEarnings || 0;

            if (localAllTime > cloudAllTime) {
                // Local is superior, save local to cloud
                const { money, ...stats } = localState;
                if (stats.bonusMarble) {
                    stats.bonusMarble = { active: false, x: 0, y: 0, baseY: 0, t: 0 }; // Sanitize
                }
                await this.saveProgress(stats, money, {});
                return localState;
            } else {
                // Cloud is superior or equal, apply cloud progress
                const merged = {
                    ...localState,
                    ...cloudData.stats,
                    money: cloudData.currency,
                    ...(cloudData.settings || {})
                };
                
                if (merged.bonusMarble) {
                    merged.bonusMarble = { active: false, x: 0, y: 0, baseY: 0, t: 0 };
                }
                
                return merged;
            }
        } catch (err) {
            console.error("CrazyGames syncData error:", err);
            return localState;
        }
    }

    /**
     * Logout / disconnect.
     */
    static async signOut(): Promise<void> {
        await this.initSDK();
        // CrazyGames SDK doesn't support forcing sign out programmatically on player behalf, 
        // but we clear the local emulated state
        localStorage.removeItem('crazy_mock_username');
        localStorage.removeItem('crazy_save_currency');
        localStorage.removeItem('crazy_save_stats');
        localStorage.removeItem('crazy_save_settings');
        localStorage.removeItem('crazy_save_timestamp');
    }
}
