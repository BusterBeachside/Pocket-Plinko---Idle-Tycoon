import { createClient } from "@supabase/supabase-js";
import { engine } from "../game/engine";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Avoid throwing error if env variables are missing (for local dummy mode)
export const supabase = createClient(
    supabaseUrl || 'https://dummy.supabase.co', 
    supabaseKey || 'dummy_key'
);

let roomPromise: Promise<any> | null = null;
async function getRoom() {
    if (!roomPromise) {
        roomPromise = (async () => {
            try {
                if (typeof window !== 'undefined' && (window as any).WebsimSocket) {
                    return new (window as any).WebsimSocket();
                }
                // @ts-ignore
                const { WebsimSocket } = await import(/* @vite-ignore */ 'https://esm.websim.com/@websim/websim-socket');
                return new WebsimSocket();
            } catch (e) {
                console.error("Failed to load WebsimSocket:", e);
                return null;
            }
        })();
    }
    return roomPromise;
}

// ============================================================================
// DEBUG TOGGLE: Set to true to force Websim mode during testing/development!
// You can also toggle this at runtime in the console via:
// window.__FORCE_WEBSIM_MODE__ = true  OR localStorage.setItem('debug_force_websim', 'true')
// ============================================================================
export const FORCE_WEBSIM_MODE_DEBUG = false;

export interface UnderdogUser {
    userId: string;
    username: string;
    profilePictureUrl: string;
    isWebsim?: boolean;
}

export class UnderdogService {
    private static authListener: any = null;

    /**
     * Detects whether the application is currently executing inside Websim environment
     * or if debug Websim mode is explicitly forced.
     */
    public static isWebsim(): boolean {
        if (FORCE_WEBSIM_MODE_DEBUG) return true;
        if (typeof window !== 'undefined') {
            if ((window as any).__FORCE_WEBSIM_MODE__ === true) return true;
            if (localStorage.getItem('debug_force_websim') === 'true') return true;
            
            if (!(window as any).toggleWebsimDebug) {
                (window as any).toggleWebsimDebug = (enable?: boolean) => {
                    const current = localStorage.getItem('debug_force_websim') === 'true';
                    const next = enable !== undefined ? enable : !current;
                    localStorage.setItem('debug_force_websim', next ? 'true' : 'false');
                    console.log(`[Pocket Plinko] Websim Debug Mode set to: ${next}`);
                    window.location.reload();
                };
            }
        }
        return typeof (window as any).websim !== 'undefined' && (window as any).websim !== null;
    }

    static async getCurrentUser(): Promise<UnderdogUser | null> {
        if (this.isWebsim()) {
            try {
                const ws = (window as any).websim;
                let u = null;
                if (typeof ws.getUser === 'function') {
                    u = await ws.getUser();
                } else if (ws.user) {
                    u = ws.user;
                } else if (typeof ws.getCreatedBy === 'function') {
                    u = await ws.getCreatedBy();
                }

                if (u) {
                    const userId = u.id || u.username || 'websim_user';
                    const username = u.username || u.name || 'WebsimPlayer';
                    const avatar = localStorage.getItem(`websim_avatar_${userId}`) || u.avatar_url || u.avatar || 'marble_white';
                    return {
                        userId: String(userId),
                        username: String(username),
                        profilePictureUrl: avatar,
                        isWebsim: true
                    };
                }
            } catch (e) {
                console.error("Error fetching Websim user:", e);
            }

            const guestUsername = localStorage.getItem('websim_mock_username') || 'WebsimPlayer';
            const guestAvatar = localStorage.getItem('websim_mock_avatar') || 'marble_white';
            return {
                userId: 'websim_player_id',
                username: guestUsername,
                profilePictureUrl: guestAvatar,
                isWebsim: true
            };
        }

        if (!supabaseUrl) {
            const username = localStorage.getItem('underdog_mock_username');
            const avatar = localStorage.getItem('underdog_mock_avatar') || 'marble_white';
            if (username) {
                return {
                    userId: 'mock_sandbox_id',
                    username,
                    profilePictureUrl: avatar
                };
            }
            return null;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, avatar_url, avatar_id')
                    .eq('id', session.user.id)
                    .maybeSingle();

                return {
                    userId: session.user.id,
                    username: profile?.username || session.user.user_metadata?.username || 'UnderdogPlayer',
                    profilePictureUrl: profile?.avatar_url || profile?.avatar_id || session.user.user_metadata?.avatar_url || 'marble_white'
                };
            } catch (err) {
                console.error("Error fetching user profile:", err);
                return {
                    userId: session.user.id,
                    username: session.user.user_metadata?.username || 'UnderdogPlayer',
                    profilePictureUrl: session.user.user_metadata?.avatar_url || 'marble_white'
                };
            }
        }
        return null;
    }

    static async updateAvatar(avatarId: string): Promise<boolean> {
        const user = await this.getCurrentUser();
        if (!user) {
            localStorage.setItem('underdog_mock_avatar', avatarId);
            return true;
        }

        if (this.isWebsim()) {
            localStorage.setItem(`websim_avatar_${user.userId}`, avatarId);
            return true;
        }

        if (supabaseUrl) {
            try {
                // Update Auth user metadata
                await supabase.auth.updateUser({
                    data: { avatar_url: avatarId }
                });

                // Update profiles table (both avatar_url and avatar_id)
                const { error } = await supabase
                    .from('profiles')
                    .update({ 
                        avatar_url: avatarId,
                        avatar_id: avatarId
                    })
                    .eq('id', user.userId);

                if (error) {
                    console.error("Error updating profiles table:", error);
                    return false;
                }
                return true;
            } catch (err) {
                console.error("Failed to update avatar:", err);
                return false;
            }
        }
        return true;
    }

    static async signIn(email: string, pass: string): Promise<UnderdogUser | null> {
        if (this.isWebsim()) {
            return this.getCurrentUser();
        }

        if (!supabaseUrl) {
            console.error("Missing supabaseUrl or supabaseKey");
            throw new Error("Missing Supabase configuration");
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) {
            console.error("Supabase Sign In Error:", error);
            throw error;
        }
        
        return {
            userId: data.user!.id,
            username: data.user!.user_metadata?.username || email.split('@')[0],
            profilePictureUrl: data.user!.user_metadata?.avatar_url || 'marble_white'
        };
    }

    static async signUp(email: string, pass: string, username: string): Promise<UnderdogUser | null> {
        if (this.isWebsim()) {
            localStorage.setItem('websim_mock_username', username);
            return this.getCurrentUser();
        }

        if (!supabaseUrl) {
            console.error("Missing supabaseUrl or supabaseKey");
            throw new Error("Missing Supabase configuration");
        }
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password: pass,
            options: {
                data: { username }
            }
        });
        if (error) {
            console.error("Supabase Sign Up Error:", error);
            throw error;
        }
        
        if (!data.user) return null;
        
        // Auto-login after sign up if email confirmation isn't required but session is missing
        if (!data.session) {
            console.log("No session returned. Email verification might be required. Attempting immediate sign in...");
            const signInRes = await supabase.auth.signInWithPassword({ email, password: pass });
            if (signInRes.error) {
                 throw new Error("Account created but email verification is required. Please check your inbox.");
            }
            return {
                userId: signInRes.data.user!.id,
                username: signInRes.data.user!.user_metadata?.username || username,
                profilePictureUrl: 'marble_white'
            };
        }
        
        return {
            userId: data.user.id,
            username: data.user.user_metadata?.username || username,
            profilePictureUrl: 'marble_white'
        };
    }

    static async signOut(): Promise<void> {
        if (this.isWebsim()) {
            localStorage.removeItem('websim_mock_username');
            localStorage.removeItem('websim_mock_avatar');
            return;
        }

        if (!supabaseUrl) {
            localStorage.removeItem('underdog_mock_username');
            return;
        }
        await supabase.auth.signOut();
    }

    static addAuthListener(callback: (user: UnderdogUser | null) => void) {
        if (this.isWebsim()) {
            this.getCurrentUser().then(u => callback(u));
            try {
                const ws = (window as any).websim;
                if (ws && typeof ws.addEventListener === 'function') {
                    ws.addEventListener('userChange', async () => {
                        const u = await this.getCurrentUser();
                        callback(u);
                    });
                }
            } catch (e) {}
            return;
        }

        if (!supabaseUrl) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                callback({
                    userId: session.user.id,
                    username: session.user.user_metadata?.username || 'UnderdogPlayer',
                    profilePictureUrl: session.user.user_metadata?.avatar_url || 'marble_white'
                });
            } else {
                callback(null);
            }
        });
        this.authListener = subscription;
    }

    static removeAuthListener() {
        if (this.authListener) {
            this.authListener.unsubscribe();
            this.authListener = null;
        }
    }

    static toScore(value: any): number {
        const n = Number(value);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    }

    static parseMetadata(record: any): any {
        let meta = record?.metadata;
        if (typeof meta === 'string') {
            try {
                meta = JSON.parse(meta);
            } catch (e) {
                meta = {};
            }
        }
        return (meta && typeof meta === 'object') ? meta : {};
    }

    static parseStats(record: any): any {
        const raw = record || {};
        const meta = UnderdogService.parseMetadata(raw);
        const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
        const maxNum = (...vals: any[]) => Math.max(0, ...vals.map(v => num(v, 0)));
        return {
            timesPrestiged: maxNum(raw.timesPrestiged, meta.timesPrestiged),
            masterMultiplier: Math.max(1, num(raw.masterMultiplier, 1), num(meta.masterMultiplier, 1)),
            derivedIncomeBoostPercent: maxNum(raw.derivedIncomeBoostPercent, meta.derivedIncomeBoostPercent),
            activeMarbleSkinID: raw.activeMarbleSkinID || meta.activeMarbleSkinID || 'default',
            ownedMarblesCount: Math.max(1, num(raw.ownedMarblesCount, 1), num(meta.ownedMarblesCount, 1)),
            kineticShards: maxNum(raw.kineticShards, meta.kineticShards),
            totalPlayTime: maxNum(raw.totalPlayTime, meta.totalPlayTime)
        };
    }

    static mergeStats(existingRecord: any, playerStats: any): any {
        const prev = UnderdogService.parseStats(existingRecord);
        const next = { ...prev };
        for (const [key, value] of Object.entries(playerStats || {})) {
            if (value === undefined || value === null) continue;
            const n = Number(value);
            if (Number.isFinite(n)) {
                next[key] = Math.max(Number(next[key]) || 0, n);
            } else {
                next[key] = value;
            }
        }
        return next;
    }

    static async submitScore(score: number, leaderboardId: string = 'mps', playerStats?: any): Promise<void> {
        const user = await this.getCurrentUser();
        if (!user || user.userId === 'local') {
            const currentMockScore = parseFloat(localStorage.getItem(`underdog_mock_highscore_${leaderboardId}`) || '-1');
            if (score > currentMockScore) {
                localStorage.setItem(`underdog_mock_highscore_${leaderboardId}`, score.toString());
            }
            return;
        }

        if (this.isWebsim()) {
            const numericScore = UnderdogService.toScore(score);
            try {
                const room = await getRoom();
                if (room) {
                    const id = `${user.userId}-${leaderboardId}`;
                    const existingList = await room.collection('leaderboard').filter({ id }).getList();
                    const existingRecord = existingList ? existingList[0] : null;
                    const bestScore = Math.max(UnderdogService.toScore(existingRecord?.score), numericScore);
                    const stats = UnderdogService.mergeStats(existingRecord, playerStats);
                    await room.collection('leaderboard').upsert({
                        id,
                        score: bestScore,
                        mode: leaderboardId,
                        user_id: user.userId,
                        username: user.username,
                        ...stats,
                        metadata: {
                            ...stats,
                            mode: leaderboardId,
                            peakMps: bestScore
                        }
                    });
                    localStorage.setItem(`underdog_last_submitted_score_${leaderboardId}`, bestScore.toString());
                }
            } catch (err) {
                console.error("Error in Websim submitScore:", err);
            }

            // Also call native ws.submitScore if present
            const ws = (window as any).websim;
            if (typeof ws?.submitScore === 'function') {
                try {
                    await ws.submitScore({
                        score: numericScore,
                        leaderboard: leaderboardId,
                        metadata: playerStats
                    });
                } catch (e) {}
            }
            return;
        }

        if (supabaseUrl) {
            try {
                const numericScore = Math.floor(score);

                // Fetch any existing record for this user & game mode to avoid unique key constraint violation
                const { data: existing } = await supabase
                    .from('leaderboards')
                    .select('id, score, metadata')
                    .eq('game_id', '7bb15041-7cb9-44cd-aed0-c7549ae19803')
                    .eq('user_id', user.userId)
                    .contains('metadata', { mode: leaderboardId })
                    .maybeSingle();

                const existingMetadata = existing?.metadata || {};
                const mergedMetadata = {
                    ...existingMetadata,
                    mode: leaderboardId,
                    peakMps: Math.max(existing?.score || 0, numericScore),
                    ...(playerStats || {})
                };

                if (existing) {
                    const shouldUpdateScore = numericScore > existing.score;
                    const updatePayload: any = {
                        metadata: mergedMetadata
                    };
                    if (shouldUpdateScore) {
                        updatePayload.score = numericScore;
                    }

                    const { error } = await supabase
                        .from('leaderboards')
                        .update(updatePayload)
                        .eq('id', existing.id);

                    if (error) {
                        console.error("Underdog leaderboard update error:", error);
                    } else if (shouldUpdateScore) {
                        localStorage.setItem(`underdog_last_submitted_score_${leaderboardId}`, numericScore.toString());
                    }
                } else {
                    const { error } = await supabase.from('leaderboards').insert({
                        game_id: '7bb15041-7cb9-44cd-aed0-c7549ae19803',
                        user_id: user.userId,
                        score: numericScore,
                        metadata: mergedMetadata
                    });

                    if (!error) {
                        localStorage.setItem(`underdog_last_submitted_score_${leaderboardId}`, numericScore.toString());
                    } else {
                        console.error("Underdog leaderboard insert error:", error);
                    }
                }
            } catch (err) {
                console.error("Error in submitScore flow:", err);
            }
        }
    }

    static async getLeaderboard(leaderboardId: string = 'mps', limit: number = 50): Promise<{username: string, score: number, metadata?: any, avatarUrl?: string}[]> {
        if (this.isWebsim()) {
            try {
                const room = await getRoom();
                if (room) {
                    let entries: any[] = [];
                    try {
                        entries = await new Promise((resolve) => {
                            let resolved = false;
                            const unsub = room.query(`
                                SELECT l.id, l.score, l.metadata, l.mode, l.user_id, u.username
                                FROM public.leaderboard l
                                JOIN public.user u ON l.user_id = u.id
                                WHERE l.mode = $1
                                ORDER BY l.score DESC
                            `, [leaderboardId]).subscribe((data: any) => {
                                if (!resolved) {
                                    resolved = true;
                                    resolve(data || []);
                                    if (typeof unsub === 'function') unsub();
                                    else if (unsub && typeof unsub.unsubscribe === 'function') unsub.unsubscribe();
                                }
                            });

                            setTimeout(() => {
                                if (!resolved) {
                                    resolved = true;
                                    resolve([]);
                                }
                            }, 3000);
                        });
                    } catch (err) {
                        console.error("Leaderboard query failed, falling back to collection list:", err);
                        entries = await room.collection('leaderboard').getList();
                    }

                    if (!Array.isArray(entries) || entries.length === 0) {
                        try {
                            entries = await room.collection('leaderboard').getList();
                        } catch (e) {
                            entries = [];
                        }
                    }

                    if (Array.isArray(entries) && entries.length > 0) {
                        const highestScores: Record<string, any> = {};
                        for (const entry of entries) {
                            if (!entry) continue;
                            if (entry.mode && entry.mode !== leaderboardId) continue;
                            const username = entry.username || entry.user?.username || 'Unknown';
                            const score = UnderdogService.toScore(entry.score);
                            if (!highestScores[username] || highestScores[username].score < score) {
                                const stats = UnderdogService.parseStats(entry);
                                highestScores[username] = {
                                    username,
                                    score,
                                    metadata: {
                                        ...stats,
                                        mode: leaderboardId,
                                        peakMps: score
                                    },
                                    avatarUrl: stats.activeMarbleSkinID || 'marble_white'
                                };
                            }
                        }
                        const list = Object.values(highestScores)
                            .sort((a: any, b: any) => b.score - a.score)
                            .slice(0, limit);

                        if (list.length > 0) return list;
                    }
                }
            } catch (err) {
                console.error("Error in Websim getLeaderboard:", err);
            }

            // Fallback 1: Websim native getLeaderboard
            const ws = (window as any).websim;
            if (typeof ws?.getLeaderboard === 'function') {
                try {
                    const res = await ws.getLeaderboard(leaderboardId);
                    if (Array.isArray(res) && res.length > 0) {
                        return res.map((r: any) => ({
                            username: r.username || r.user?.username || 'WebsimPlayer',
                            score: r.score || 0,
                            metadata: r.metadata || {},
                            avatarUrl: r.avatar_url || r.avatarUrl || 'marble_white'
                        })).slice(0, limit);
                    }
                } catch (e) {}
            }

            // Fallback 2: Local user
            const currentUser = await this.getCurrentUser();
            if (currentUser) {
                return [{
                    username: currentUser.username,
                    score: Math.floor(engine?.state?.peakMps || 0),
                    avatarUrl: currentUser.profilePictureUrl,
                    metadata: { mode: leaderboardId }
                }];
            }

            return [];
        }

        if (!supabaseUrl) return [];

        const { data, error } = await supabase
            .from('leaderboards')
            .select(`
                user_id,
                score,
                metadata,
                profiles(username, avatar_url, avatar_id)
            `)
            .eq('game_id', '7bb15041-7cb9-44cd-aed0-c7549ae19803')
            .contains('metadata', {mode: leaderboardId})
            .order('score', { ascending: false })
            .limit(500);

        if (error) {
            console.error("Error fetching leaderboard:", error);
            return [];
        }

        const highestScores: Record<string, {username: string, score: number, metadata?: any, avatarUrl?: string}> = {};
        
        for (const rawRow of data || []) {
            const row = rawRow as any;
            let username = 'Unknown';
            let avatarUrl = 'marble_white';
            if (row.profiles) {
                if (Array.isArray(row.profiles)) {
                    username = row.profiles[0]?.username || 'Unknown';
                    avatarUrl = row.profiles[0]?.avatar_url || row.profiles[0]?.avatar_id || 'marble_white';
                } else {
                    username = row.profiles.username || 'Unknown';
                    avatarUrl = row.profiles.avatar_url || row.profiles.avatar_id || 'marble_white';
                }
            }
            if (!highestScores[username] || highestScores[username].score < row.score) {
                highestScores[username] = { 
                    username, 
                    score: row.score, 
                    metadata: row.metadata || {},
                    avatarUrl 
                };
            }
        }

        // Sort globally
        return Object.values(highestScores)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    static showLeaderboard(leaderboardId: string = 'mps') {
        alert("Leaderboard UI opens here.");
    }

    static async saveProgress(stats: any, currency: number = 0, settings: any = {}): Promise<void> {
        const user = await this.getCurrentUser();
        if (!user) {
            localStorage.setItem('underdog_save_currency', Math.floor(currency).toString());
            localStorage.setItem('underdog_save_stats', JSON.stringify(stats));
            localStorage.setItem('underdog_save_settings', JSON.stringify(settings));
            return;
        }

        if (this.isWebsim()) {
            const ws = (window as any).websim;
            const userId = user.userId;
            const payload = {
                user_id: userId,
                stats,
                currency: Math.floor(currency),
                settings,
                updated_at: new Date().toISOString()
            };

            if (typeof ws?.setKV === 'function') {
                try { await ws.setKV(`save_${userId}`, payload); } catch (e) {}
            }
            if (typeof ws?.database?.upsert === 'function') {
                try { await ws.database.upsert('user_game_data', payload); } catch (e) {}
            }

            localStorage.setItem(`websim_save_currency_${userId}`, Math.floor(currency).toString());
            localStorage.setItem(`websim_save_stats_${userId}`, JSON.stringify(stats));
            localStorage.setItem(`websim_save_settings_${userId}`, JSON.stringify(settings));
            return;
        }

        if (supabaseUrl) {
            await supabase.from('user_game_data').upsert({
                game_id: '7bb15041-7cb9-44cd-aed0-c7549ae19803',
                user_id: user.userId,
                stats,
                currency,
                settings,
                updated_at: new Date().toISOString()
            });
        }
    }

    static async loadProgress(): Promise<any | null> {
        const user = await this.getCurrentUser();
        if (!user) {
            const currencyStr = localStorage.getItem('underdog_save_currency');
            const statsStr = localStorage.getItem('underdog_save_stats');
            const settingsStr = localStorage.getItem('underdog_save_settings');
            if (!statsStr) return null;
            return {
                currency: parseInt(currencyStr || '0', 10),
                stats: JSON.parse(statsStr),
                settings: settingsStr ? JSON.parse(settingsStr) : {}
            };
        }

        if (this.isWebsim()) {
            const ws = (window as any).websim;
            const userId = user.userId;

            if (typeof ws?.getKV === 'function') {
                try {
                    const kvData = await ws.getKV(`save_${userId}`);
                    if (kvData && kvData.stats) {
                        return {
                            currency: kvData.currency || 0,
                            stats: kvData.stats,
                            settings: kvData.settings || {}
                        };
                    }
                } catch (e) {}
            }

            if (typeof ws?.database?.from === 'function') {
                try {
                    const { data } = await ws.database
                        .from('user_game_data')
                        .select('*')
                        .eq('user_id', userId)
                        .single();
                    if (data && data.stats) {
                        return {
                            currency: data.currency || 0,
                            stats: data.stats,
                            settings: data.settings || {}
                        };
                    }
                } catch (e) {}
            }

            const currencyStr = localStorage.getItem(`websim_save_currency_${userId}`);
            const statsStr = localStorage.getItem(`websim_save_stats_${userId}`);
            const settingsStr = localStorage.getItem(`websim_save_settings_${userId}`);
            if (statsStr) {
                return {
                    currency: parseInt(currencyStr || '0', 10),
                    stats: JSON.parse(statsStr),
                    settings: settingsStr ? JSON.parse(settingsStr) : {}
                };
            }
            return null;
        }

        if (supabaseUrl) {
            const { data, error } = await supabase
                .from('user_game_data')
                .select('*')
                .eq('game_id', '7bb15041-7cb9-44cd-aed0-c7549ae19803')
                .eq('user_id', user.userId)
                .single();

            if (error || !data) return null;

            return {
                currency: data.currency,
                stats: data.stats,
                settings: data.settings
            };
        }
    }

    static async syncData(localState: any): Promise<any> {
        const user = await this.getCurrentUser();
        if (!user) return localState;

        try {
            const cloudData = await this.loadProgress();
            
            if (!cloudData) {
                const { money, ...stats } = localState;
                await this.saveProgress(stats, money, {});
                return localState;
            }

            const cloudAllTime = cloudData.stats?.allTimeEarnings || cloudData.stats?.lifetimeEarnings || 0;
            const localAllTime = localState.allTimeEarnings || localState.lifetimeEarnings || 0;

            if (localAllTime > cloudAllTime) {
                const { money, ...stats } = localState;
                if (stats.bonusMarble) {
                    stats.bonusMarble = { active: false, x: 0, y: 0, baseY: 0, t: 0 };
                }
                await this.saveProgress(stats, money, {});
                return localState;
            } else {
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
            console.error("Underdog syncData error:", err);
            return localState;
        }
    }
}
