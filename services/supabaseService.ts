/// <reference types="vite/client" />
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

const GAME_SLUG = "pocket-plinko";

let cachedGameId: string | null = null;

export class SupabaseService {
    /**
     * Get the game ID for the current GAME_SLUG. Caches the result.
     */
    static async getGameId(): Promise<string | null> {
        if (cachedGameId) return cachedGameId;

        const { data, error } = await supabase
            .from('games')
            .select('id')
            .eq('slug', GAME_SLUG)
            .single();

        if (error || !data) {
            console.error("Error fetching game ID:", error);
            return null;
        }

        cachedGameId = data.id;
        return cachedGameId;
    }

    /**
     * Authentication
     */
    static async signUp(email: string, password: string): Promise<User | null> {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            console.error("Sign up error:", error);
            throw error;
        }
        return data.user;
    }

    static async verifyOtp(email: string, token: string): Promise<void> {
        const { error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'signup'
        });
        if (error) {
            console.error("OTP Verification error:", error);
            throw error;
        }
    }

    static async resetPassword(email: string): Promise<void> {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) {
            console.error("Reset password error:", error);
            throw error;
        }
    }

    static async signIn(email: string, password: string): Promise<User | null> {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error("Sign in error:", error);
            throw error;
        }
        return data.user;
    }

    static async signOut(): Promise<void> {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Sign out error:", error);
            throw error;
        }
    }

    static async getCurrentUser(): Promise<User | null> {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }

    static async getProfile(userId: string): Promise<any> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    }

    static async updateProfile(username: string, avatarUrl?: string): Promise<void> {
        const user = await this.getCurrentUser();
        if (!user) throw new Error("Not authenticated");

        const updates: any = { id: user.id, username };
        if (avatarUrl) updates.avatar_url = avatarUrl;

        const { error } = await supabase
            .from('profiles')
            .upsert(updates);

        if (error) {
            console.error("Update profile error:", error);
            throw error;
        }
    }

    /**
     * Data Syncing
     */
    static async saveProgress(stats: any, currency: number = 0, settings: any = {}): Promise<void> {
        const user = await this.getCurrentUser();
        if (!user) return; // Silent fail if not logged in

        const gameId = await this.getGameId();
        if (!gameId) return;

        // Ensure we are saving a clean object
        const statsToSave = JSON.parse(JSON.stringify(stats));

        const { error } = await supabase
            .from('user_game_data')
            .upsert({
                user_id: user.id,
                game_id: gameId,
                currency: Math.floor(currency), 
                stats: statsToSave,
                settings,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,game_id' });

        if (error) {
            console.error("Save progress error:", error);
            throw error;
        }
    }

    /**
     * Sync local progress with cloud progress.
     * Favors the progress with higher lifetime earnings.
     */
    static async syncData(localState: any): Promise<any> {
        const user = await this.getCurrentUser();
        if (!user) return localState;

        try {
            const cloudData = await this.loadProgress();
            
            if (!cloudData) {
                // No cloud data, upload local
                const { money, ...stats } = localState;
                await this.saveProgress(stats, money, {});
                return localState;
            }

            // Compare earnings to see which is "better"
            const cloudAllTime = cloudData.stats?.allTimeEarnings || cloudData.stats?.lifetimeEarnings || 0;
            const localAllTime = localState.allTimeEarnings || localState.lifetimeEarnings || 0;

            if (localAllTime > cloudAllTime) {
                // Local is better, sync to cloud
                const { money, ...stats } = localState;
                await this.saveProgress(stats, money, {});
                return localState;
            } else {
                // Cloud is better or equal, use cloud
                return {
                    ...localState,
                    ...cloudData.stats,
                    money: cloudData.currency,
                    // Ensure settings are merged if they exist
                    ...(cloudData.settings || {})
                };
            }
        } catch (err) {
            console.error("Sync error:", err);
            return localState;
        }
    }

    static async loadProgress(): Promise<any | null> {
        const user = await this.getCurrentUser();
        if (!user) return null;

        const gameId = await this.getGameId();
        if (!gameId) return null;

        const { data, error } = await supabase
            .from('user_game_data')
            .select('stats, currency, settings')
            .eq('user_id', user.id)
            .eq('game_id', gameId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // No rows found
            console.error("Load progress error:", error);
            throw error;
        }

        return data;
    }

    /**
     * Leaderboards
     */
    static async getGlobalLeaderboard(): Promise<any[]> {
        const gameId = await this.getGameId();
        if (!gameId) return [];

        const { data, error } = await supabase
            .from('leaderboards')
            .select(`
                user_id,
                score,
                metadata
            `)
            .eq('game_id', gameId)
            .eq('metadata->>mode', 'mps')
            .order('score', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Get global leaderboard error:", error);
            throw error;
        }

        const entries = data || [];
        if (entries.length === 0) return [];

        // Fetch profiles for these users
        const userIds = entries.map(e => e.user_id);
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);

        if (profileError) {
            console.error("Error fetching profiles for leaderboard:", profileError);
        }

        const profileMap = (profiles || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
        }, {});

        // Map metadata to stats and attach profiles
        const results = entries.map(item => ({
            ...item,
            stats: item.metadata,
            currency: item.metadata?.money || 0,
            profiles: profileMap[item.user_id] || { 
                username: item.metadata?.username || 'Anonymous', 
                avatar_url: item.metadata?.avatar_url || 'marble_white' 
            }
        }));

        // Sort by score first, then by allTimeEarnings (handling JSON numbers)
        return results.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const aEarnings = a.stats?.allTimeEarnings || a.stats?.lifetimeEarnings || 0;
            const bEarnings = b.stats?.allTimeEarnings || b.stats?.lifetimeEarnings || 0;
            return bEarnings - aEarnings;
        });
    }

    static async submitScore(score: number, mode: string = 'default', metadata: any = {}): Promise<void> {
        const user = await this.getCurrentUser();
        if (!user) return;

        const gameId = await this.getGameId();
        if (!gameId) return;

        // Fetch profile to include in metadata for easier display
        const profile = await this.getProfile(user.id);

        // Check if this is a personal best
        const { data: existingEntry, error: fetchError } = await supabase
            .from('leaderboards')
            .select('id, score, metadata')
            .eq('user_id', user.id)
            .eq('game_id', gameId)
            .eq('metadata->>mode', mode)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error("Error checking existing score:", fetchError);
            return;
        }

        // Update if no existing entry, new score is higher, OR score is the same (to sync metadata)
        // We also update if the new allTimeEarnings is higher than what's in metadata
        const existingAllTime = existingEntry?.metadata?.allTimeEarnings || 0;
        const newAllTime = metadata?.allTimeEarnings || 0;

        if (!existingEntry || score > existingEntry.score || (score === existingEntry.score && newAllTime >= existingAllTime)) {
            // Upsert the new high score
            const payload: any = {
                user_id: user.id,
                game_id: gameId,
                score: Math.floor(score),
                metadata: { 
                    ...metadata, 
                    mode,
                    username: profile?.username || 'Anonymous',
                    avatar_url: profile?.avatar_url || 'marble_white'
                }
            };

            if (existingEntry) {
                payload.id = existingEntry.id;
            }

            const { error: upsertError } = await supabase
                .from('leaderboards')
                .upsert(payload, { onConflict: 'id' });

            if (upsertError) {
                console.error("Submit score error:", upsertError);
                throw upsertError;
            }
        }
    }

    static async getTop50(mode: string = 'default'): Promise<any[]> {
        const gameId = await this.getGameId();
        if (!gameId) return [];

        const { data, error } = await supabase
            .from('leaderboards')
            .select(`
                id,
                score,
                metadata,
                profiles (
                    username,
                    avatar_url
                )
            `)
            .eq('game_id', gameId)
            .eq('metadata->>mode', mode)
            .order('score', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Get top 50 error:", error);
            throw error;
        }

        return data || [];
    }
}
