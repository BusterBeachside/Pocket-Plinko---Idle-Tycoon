import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Avoid throwing error if env variables are missing (for local dummy mode)
export const supabase = createClient(
    supabaseUrl || 'https://dummy.supabase.co', 
    supabaseKey || 'dummy_key'
);

export interface UnderdogUser {
    userId: string;
    username: string;
    profilePictureUrl: string;
}

export class UnderdogService {
    private static authListener: any = null;

    static async getCurrentUser(): Promise<UnderdogUser | null> {
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
        if (!supabaseUrl) {
            localStorage.removeItem('underdog_mock_username');
            return;
        }
        await supabase.auth.signOut();
    }

    static addAuthListener(callback: (user: UnderdogUser | null) => void) {
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

    static async submitScore(score: number, leaderboardId: string = 'mps', playerStats?: any): Promise<void> {
        const user = await this.getCurrentUser();
        if (!user) {
            const currentMockScore = parseFloat(localStorage.getItem(`underdog_mock_highscore_${leaderboardId}`) || '-1');
            if (score > currentMockScore) {
                localStorage.setItem(`underdog_mock_highscore_${leaderboardId}`, score.toString());
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
