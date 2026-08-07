import React, { useState, useEffect } from 'react';
import { UnderdogService, UnderdogUser } from '../services/underdogService';
import { motion, AnimatePresence } from 'motion/react';
import { UserCircle, LogOut, X, ArrowRight, ShieldCheck, RefreshCw, Gamepad2 } from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';
import { engine } from '../game/engine';
import { getAvatarOptions } from '../game/avatars';

interface UnderdogAuthProps {
  onAuthComplete: (user: UnderdogUser | null, isOffline: boolean) => void;
  onClose?: () => void;
  initialMode?: 'login' | 'profile';
}

export const UnderdogAuth: React.FC<UnderdogAuthProps> = ({ onAuthComplete, onClose, initialMode = 'login' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UnderdogUser | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const user = await UnderdogService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    };
    checkUser();
  }, []);

  const handleConnectUnderdog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let user = null;
      if (isRegistering) {
        if (!username.trim()) throw new Error('Username is required');
        user = await UnderdogService.signUp(email, password, username);
        if (!user) {
            setError('Please check your email to verify your account, or try logging in.');
            setLoading(false);
            return;
        }
      } else {
        user = await UnderdogService.signIn(email, password);
      }
      
      if (user) {
        setCurrentUser(user);
        onAuthComplete(user, false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to establish Underdog connection');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await UnderdogService.signOut();
      // Clear local memory structures to prevent bleeding state
      const { SaveSystem } = await import('../game/saveSystem');
      SaveSystem.clearSave();
      onAuthComplete(null, false);
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayOffline = () => {
    onAuthComplete(null, true);
  };

  return (
    <div 
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-[#1a1b1e] border border-white/10 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
      >
        {/* Window Title Bar */}
        <div className="h-10 bg-[#25262b] border-b border-white/5 flex items-center justify-between px-4 select-none relative">
          <div className="flex items-center gap-2">
            <Gamepad2 className={`w-4 h-4 ${UnderdogService.isWebsim() ? 'text-cyan-400' : 'text-orange-500'} animate-pulse`} />
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
              {UnderdogService.isWebsim() ? 'Websim Engine Link' : 'Underdog Engine Link'}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {!currentUser ? (
              <motion.div
                key="login-view"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-5"
              >
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-600/10 border border-orange-500/20 mb-4 shadow-inner">
                    <ShieldCheck className="w-8 h-8 text-orange-500" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    UNDERDOG <span className="text-orange-500">ID</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-mono">Cloud Protection & Sync</p>
                </div>

                <div className="bg-orange-950/20 border border-orange-500/20 rounded-xl p-4 text-[12px] leading-relaxed text-slate-300">
                  <div className="flex gap-2 items-start">
                    <span className="text-lg">☁️</span>
                    <p>
                      Link your <strong className="text-orange-400 font-extrabold">Underdog Account</strong> to enable automatic <strong className="text-orange-400 font-extrabold">Cloud Saves</strong> and secure your placement on the global high score charts.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="text-[11px] text-red-400 bg-red-400/5 p-3 rounded-lg border border-red-400/10 text-center">
                    {error}
                  </div>
                )}

                <form onSubmit={handleConnectUnderdog} className="space-y-3">
                  {isRegistering && (
                      <input 
                        type="text" 
                        placeholder="Username" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm mb-3"
                        required
                      />
                  )}
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm"
                    required
                  />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm mb-4"
                    required
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-600/20 mt-2 active:scale-[0.98] cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (isRegistering ? 'CREATE ACCOUNT' : 'LOGIN TO UNDERDOG ID')}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>

                <div className="text-center mt-2">
                    <button 
                        type="button"
                        onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                        className="text-xs text-orange-400 hover:text-orange-300 uppercase tracking-wider font-bold"
                    >
                        {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                    </button>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={handlePlayOffline}
                    className="w-full bg-black/40 border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold py-3.5 rounded-lg transition-all uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                  >
                    Continue as Guest (Local Save)
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="profile-view"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-4 text-center"
              >
                <div className="flex flex-col items-center mb-1">
                  <div className="relative group">
                    <AvatarDisplay 
                      avatarId={currentUser.profilePictureUrl || 'marble_white'} 
                      size={80} 
                      className="ring-4 ring-orange-500/20 transition-all rounded-full"
                      ownedSkins={engine.state.ownedMarbles}
                    />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-white mt-3">
                    {currentUser.username}
                  </h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">
                    {currentUser.isWebsim ? 'Websim Account Profile' : 'Underdog Profile'}
                  </p>
                </div>

                {/* Avatar Picker Section */}
                <div className="w-full p-4 bg-black/40 rounded-xl border border-white/10 text-left">
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold mb-3 font-mono text-center">
                    Select Avatar Skin
                  </p>
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1 select-none">
                    {getAvatarOptions(engine.state.ownedMarbles).map((option) => {
                      const isSelected = (currentUser.profilePictureUrl || 'marble_white') === option.id;
                      return (
                        <button
                          key={option.id}
                          title={option.name}
                          type="button"
                          disabled={loading}
                          onClick={async () => {
                            if (loading) return;
                            setLoading(true);
                            setError(null);
                            try {
                              const ok = await UnderdogService.updateAvatar(option.id);
                              if (ok) {
                                const updatedUser = { ...currentUser, profilePictureUrl: option.id };
                                setCurrentUser(updatedUser);
                                onAuthComplete(updatedUser, false);
                              } else {
                                setError("Failed to synchronize avatar choice.");
                              }
                            } catch (err: any) {
                              setError(err?.message || "Failed to edit avatar selection.");
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-orange-500/20 border-orange-500 ring-1 ring-orange-500/40' 
                              : 'bg-black/50 border-white/5 hover:border-white/20 hover:bg-white/5'
                          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
                        >
                          <AvatarDisplay 
                            avatarId={option.id} 
                            size={24} 
                            ownedSkins={engine.state.ownedMarbles}
                          />
                          <span className="text-[8px] text-slate-400 truncate max-w-full font-sans mt-1 text-center font-semibold">
                            {option.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <div className="text-[10px] text-red-400 bg-red-400/5 p-2 rounded-lg border border-red-400/10 text-center">
                    {error}
                  </div>
                )}

                <div className="p-3 bg-orange-500/5 rounded-xl border border-orange-500/15 flex items-center gap-2 text-left">
                  <span className="text-lg">✅</span>
                  <div>
                    <h4 className="text-[10px] text-orange-400 font-extrabold uppercase">
                      {currentUser.isWebsim ? 'Websim Cloud Sync Active' : 'Cloud Engine Sync Active'}
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      {currentUser.isWebsim 
                        ? 'Authenticated automatically via Websim. Game progress and scores are synced to Websim.' 
                        : 'Cloud saves are synchronized dynamically to safety.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 text-center">
                    <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5 font-mono">Status</p>
                    <p className="text-emerald-400 font-semibold text-xs font-mono">Synced</p>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 text-center">
                    <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5 font-mono">Engine</p>
                    <p className="text-white font-semibold text-xs font-mono">
                      {currentUser.isWebsim ? 'Websim API' : 'Underdog v2'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 border border-red-500/20 cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  DISCONNECT OUT OF SESSION
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/5 flex justify-center items-center mt-auto">
          <div className="flex gap-2 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500/40" />
            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">Authenticated Session</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

