import { ChallengesManager, CHALLENGES } from './challenges';

/**
 * Interface definition for Android Native Bridge objects attached to window
 */
export interface AndroidBridgeInterface {
    scheduleNotification?: (id: string | number, title: string, body: string, delayMs: number) => void;
    scheduleLocalNotification?: (title: string, body: string, delayMs: number, id?: string | number) => void;
    postNotification?: (title: string, body: string, delayMs: number) => void;
    cancelNotification?: (id: string | number) => void;
    isNativeAndroid?: () => boolean;
}

declare global {
    interface Window {
        AndroidBridge?: AndroidBridgeInterface;
        AndroidNotificationBridge?: AndroidBridgeInterface;
        Android?: AndroidBridgeInterface;
        Capacitor?: {
            isNativePlatform?: () => boolean;
            Plugins?: {
                LocalNotifications?: {
                    schedule?: (options: {
                        notifications: Array<{
                            id: number;
                            title: string;
                            body: string;
                            schedule: { at: Date };
                        }>;
                    }) => Promise<void>;
                };
            };
        };
    }
}

/**
 * Checks whether the app is running within an Android APK or native Webview container
 */
export function isAndroidNative(): boolean {
    if (typeof window === 'undefined') return false;

    if (window.AndroidBridge || window.AndroidNotificationBridge || window.Android) {
        return true;
    }
    if (window.Capacitor?.isNativePlatform?.()) {
        return true;
    }
    return /Android/i.test(navigator.userAgent) && (
        /wv/i.test(navigator.userAgent) || 
        typeof (window as any).AndroidInterface !== 'undefined'
    );
}

/**
 * Dispatches a local notification to Android native bridge or gracefully falls back
 */
export function sendLocalNotification(
    id: string | number,
    title: string,
    body: string,
    delayMs: number
): boolean {
    if (typeof window === 'undefined') return false;

    // Ensure non-negative delay
    const safeDelay = Math.max(0, Math.floor(delayMs));

    // Try primary Android bridge interfaces
    const bridges = [
        window.AndroidBridge,
        window.AndroidNotificationBridge,
        window.Android,
        (window as any).AndroidInterface
    ];

    for (const bridge of bridges) {
        if (!bridge) continue;
        try {
            if (typeof bridge.scheduleNotification === 'function') {
                bridge.scheduleNotification(id, title, body, safeDelay);
                return true;
            }
            if (typeof bridge.scheduleLocalNotification === 'function') {
                bridge.scheduleLocalNotification(title, body, safeDelay, id);
                return true;
            }
            if (typeof bridge.postNotification === 'function') {
                bridge.postNotification(title, body, safeDelay);
                return true;
            }
        } catch (err) {
            console.warn('[AndroidBridge] Error calling bridge method:', err);
        }
    }

    // Try Capacitor LocalNotifications plugin if present
    if (window.Capacitor?.Plugins?.LocalNotifications?.schedule) {
        try {
            const numericId = typeof id === 'number' ? id : Math.abs(id.toString().split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
            window.Capacitor.Plugins.LocalNotifications.schedule({
                notifications: [{
                    id: numericId,
                    title,
                    body,
                    schedule: { at: new Date(Date.now() + safeDelay) }
                }]
            });
            return true;
        } catch (err) {
            console.warn('[AndroidBridge] Error calling Capacitor LocalNotifications:', err);
        }
    }

    // Graceful web fallback using Web Notification API / setTimeout if available and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            setTimeout(() => {
                new Notification(title, { body, icon: '/favicon.ico' });
            }, safeDelay);
            return true;
        } catch (err) {
            console.warn('[AndroidBridge] Web Notification fallback error:', err);
        }
    }

    // No native bridge available - fallback gracefully without throwing errors
    console.log(`[AndroidBridge Fallback] Notification scheduled (id=${id}, delay=${Math.round(safeDelay / 1000)}s): "${title}" - "${body}"`);
    return false;
}

/**
 * Calculates the exact delay until the stored local date changes (local midnight)
 * and schedules the Daily Reward local notification via the bridge.
 * 
 * Title: "Daily reward ready!"
 * Body: "Come see your new daily missions, too!"
 */
export function scheduleDailyRewardNotification(): void {
    const now = new Date();
    const tomorrowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const delayMs = tomorrowMidnight.getTime() - now.getTime();

    sendLocalNotification(
        'daily_reward',
        'Daily reward ready!',
        'Come see your new daily missions, too!',
        delayMs
    );
}

/**
 * Calculates the remaining time for the current active timed challenge
 * and schedules a local notification to trigger when 2 hours remain.
 * 
 * Title: "Challenge nearly over!"
 * Body: "The (challengeName) challenge ends in 2hrs. Have you gotten the gold yet?"
 */
export function scheduleChallengeNotification(): void {
    const rotInfo = ChallengesManager.getRotationInfo();
    const activeChallengeId = rotInfo.activeChallengeId;
    const challengeDef = CHALLENGES[activeChallengeId];
    const challengeName = challengeDef ? challengeDef.name : 'Timed Challenge';

    const totalRemainingMs = rotInfo.timeLeftSeconds * 1000;
    const twoHoursMs = 2 * 60 * 60 * 1000; // 2 hours = 7,200,000 ms

    let delayMs = 0;
    if (totalRemainingMs > twoHoursMs) {
        // Trigger exactly when 2 hours remain
        delayMs = totalRemainingMs - twoHoursMs;
    } else if (totalRemainingMs > 0) {
        // Less than 2 hours remaining in current challenge
        delayMs = 0;
    } else {
        // Challenge already expired/rotating
        return;
    }

    sendLocalNotification(
        'challenge_warning_2h',
        'Challenge nearly over!',
        `The ${challengeName} challenge ends in 2hrs. Have you gotten the gold yet?`,
        delayMs
    );
}

/**
 * Convenience helper to sync all Android local push notifications
 */
export function syncAndroidNotifications(): void {
    try {
        scheduleDailyRewardNotification();
        scheduleChallengeNotification();
    } catch (err) {
        console.warn('[AndroidNotifications] Failed to sync notifications:', err);
    }
}
