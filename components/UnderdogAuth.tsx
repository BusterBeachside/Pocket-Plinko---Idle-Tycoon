import React, { useState, useEffect } from 'react';
import { CrazyGamesService, CrazyGamesUser } from '../services/crazyGamesService';
import { motion, AnimatePresence } from 'motion/react';
import { UserCircle, LogOut, X, ArrowRight, ShieldCheck, RefreshCw, Gamepad2 } from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';
import { engine } from '../game/engine';

interface UnderdogAuthProps {
  onAuthComplete: (user: CrazyGamesUser | null, isOffline: boolean) => void;
  onClose?: () => void;
  initialMode?: 'login' | 'profile';
}

export const UnderdogAuth: React.FC<UnderdogAuthProps> = ({ onAuthComplete, onClose, initialMode = 'login' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CrazyGamesUser | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const user = await CrazyGamesService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    };
    checkUser();
  }, []);

  const handleConnectCrazyGames = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await CrazyGamesService.showAuthPrompt();
      if (user) {
        setCurrentUser(user);
        onAuthComplete(user, false);
      } else {
        setError('Connection declined or cancelled.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to establish CrazyGames connection');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await CrazyGamesService.signOut();
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
            <Gamepad2 className="w-4 h-4 text-orange-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">CrazyGames Engine Link</span>
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
                    CRAZYGAMES <span className="text-orange-500">LINK</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-mono">Cloud Protection & Sync</p>
                </div>

                <div className="bg-orange-950/20 border border-orange-500/20 rounded-xl p-4 text-[12px] leading-relaxed text-slate-300">
                  <div className="flex gap-2 items-start">
                    <span className="text-lg">☁️</span>
                    <p>
                      Link your <strong className="text-orange-400 font-extrabold">CrazyGames Account</strong> to enable automatic <strong className="text-orange-400 font-extrabold">Cloud Saves</strong> and secure your placement on the global high score charts.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="text-[11px] text-red-400 bg-red-400/5 p-3 rounded-lg border border-red-400/10 text-center">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleConnectCrazyGames}
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-600/20 mt-6 active:scale-[0.98] cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'CONNECT CRAZYGAMES'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>

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
                className="space-y-6 text-center"
              >
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    <AvatarDisplay 
                      avatarId={currentUser.profilePictureUrl || 'marble_white'} 
                      size={80} 
                      className="ring-4 ring-orange-500/20 transition-all rounded-full"
                      ownedSkins={engine.state.ownedMarbles}
                    />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-white mt-4">
                    {currentUser.username}
                  </h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-1">
                    CrazyGames Profile
                  </p>
                </div>

                <div className="p-4 bg-orange-500/5 rounded-xl border border-orange-500/15 flex items-center gap-3 text-left">
                  <span className="text-xl">✅</span>
                  <div>
                    <h4 className="text-xs text-orange-400 font-extrabold uppercase">Cloud Engine Sync Active</h4>
                    <p className="text-[11px] text-slate-400">All progress is being continuously and automatically synced to CrazyGames cloud service.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-black/40 rounded-xl border border-white/10 text-center">
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 font-mono">Status</p>
                    <p className="text-emerald-400 font-bold text-sm">Synchronized</p>
                  </div>
                  <div className="p-4 bg-black/40 rounded-xl border border-white/10 text-center">
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 font-mono">Engine</p>
                    <p className="text-white font-bold text-sm">CrazyGames v3</p>
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
