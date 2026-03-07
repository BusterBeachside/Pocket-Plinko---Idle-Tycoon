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
                currency,
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

            // Compare lifetime earnings to see which is "better"
            const cloudLifetime = cloudData.stats?.lifetimeEarnings || 0;
            const localLifetime = localState.lifetimeEarnings || 0;

            if (localLifetime > cloudLifetime) {
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

        // Fetch user game data and join with profiles
        // We sort by peakMps (primary) and lifetimeEarnings (secondary)
        // Note: stats is a JSONB column, so we use ->> to extract values and cast them
        const { data, error } = await supabase
            .from('user_game_data')
            .select(`
                user_id,
                currency,
                stats,
                profiles (
                    username,
                    avatar_url
                )
            `)
            .eq('game_id', gameId)
            .order('stats->peakMps', { ascending: false })
            .order('stats->lifetimeEarnings', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Get global leaderboard error:", error);
            throw error;
        }

        return data || [];
    }

    static async submitScore(score: number, mode: string = 'default', metadata: any = {}): Promise<void> {
        const user = await this.getCurrentUser();
        if (!user) return;

        const gameId = await this.getGameId();
        if (!gameId) return;

        // Check if this is a personal best
        const { data: existingEntry, error: fetchError } = await supabase
            .from('leaderboards')
            .select('id, score')
            .eq('user_id', user.id)
            .eq('game_id', gameId)
            .eq('metadata->>mode', mode)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error("Error checking existing score:", fetchError);
            return;
        }

        // Only update if no existing entry or new score is higher
        if (!existingEntry || score > existingEntry.score) {
            // Upsert the new high score
            const payload: any = {
                user_id: user.id,
                game_id: gameId,
                score,
                metadata: { ...metadata, mode }
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
