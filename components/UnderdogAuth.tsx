import React, { useState, useEffect } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Lock, UserCircle, LogOut, X, ArrowRight, ShieldCheck, RefreshCw, ChevronRight } from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';
import { getAvatarOptions } from '../game/avatars';
import { engine } from '../game/engine';

interface UnderdogAuthProps {
  onAuthComplete: (user: any | null, isOffline: boolean) => void;
  onClose?: () => void;
  initialMode?: 'login' | 'signup' | 'profile';
}

export const UnderdogAuth: React.FC<UnderdogAuthProps> = ({ onAuthComplete, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'otp' | 'forgot' | 'profile'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const user = await SupabaseService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const p = await SupabaseService.getProfile(user.id);
        setProfile(p);
      }
    };
    checkUser();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await SupabaseService.signIn(email, password);
      if (user) {
        onAuthComplete(user, false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await SupabaseService.signUp(email, password);
      setMode('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await SupabaseService.verifyOtp(email, otp);
      // After verification, we might need to update profile with username
      const user = await SupabaseService.signIn(email, password);
      if (user && username) {
        await SupabaseService.updateProfile(username);
      }
      onAuthComplete(user, false);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await SupabaseService.resetPassword(email);
      alert('Password reset link sent to your email!');
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await SupabaseService.signOut();
      // Clear local data to prevent persistence across identities
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

  const handleUpdateAvatar = async (avatarId: string) => {
    setLoading(true);
    try {
      await SupabaseService.updateProfile(profile?.username || currentUser?.email?.split('@')[0], avatarId);
      const p = await SupabaseService.getProfile(currentUser.id);
      setProfile(p);
      setShowAvatarPicker(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update avatar');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (mode) {
      case 'login':
        return (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-4 shadow-inner">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">UNDERDOG <span className="text-blue-500">ID</span></h2>
              <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-mono">Access Global Profile</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 text-white"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 text-white"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="text-[11px] text-red-400 bg-red-400/5 p-3 rounded-lg border border-red-400/10 flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 mt-6 active:scale-[0.98]"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'ESTABLISH CONNECTION'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
            <div className="flex justify-between text-[11px] font-medium mt-6">
              <button type="button" onClick={() => setMode('forgot')} className="text-slate-500 hover:text-blue-400 transition-colors">Forgot Password?</button>
              <button type="button" onClick={() => setMode('signup')} className="text-slate-500 hover:text-blue-400 transition-colors">CREATE NEW IDENTITY</button>
            </div>
            <div className="mt-6 pt-6 border-t border-white/5">
              <button
                type="button"
                onClick={handlePlayOffline}
                className="w-full bg-white/5 hover:bg-white/10 text-slate-400 text-[11px] font-bold py-3 rounded-lg transition-all border border-white/5 uppercase tracking-widest"
              >
                Continue as Guest (Local Only)
              </button>
            </div>
          </form>
        );
      case 'signup':
        return (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-4 shadow-inner">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">UNDERDOG <span className="text-blue-500">ID</span></h2>
              <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-mono">Initialize New Identity</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Identity Tag"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 text-white"
                  required
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 text-white"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 text-white"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="text-[11px] text-red-400 bg-red-400/5 p-3 rounded-lg border border-red-400/10 flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 mt-6 active:scale-[0.98]"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'INITIALIZE PROFILE'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <button type="button" onClick={() => setMode('login')} className="text-[11px] text-slate-500 hover:text-blue-400 transition-colors font-medium">
                RETURN TO LOGIN
              </button>
            </div>
          </form>
        );
      case 'otp':
        return (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-4 shadow-inner">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">VERIFICATION</h2>
              <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-mono">Enter 8-digit code sent to {email}</p>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="00000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-4 text-center text-3xl font-mono tracking-[0.5em] text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 transition-all"
                required
              />
            </div>
            {error && (
              <div className="text-[11px] text-red-400 bg-red-400/5 p-3 rounded-lg border border-red-400/10 flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 mt-6 active:scale-[0.98]"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'VERIFY ACCOUNT'}
            </button>
            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <button type="button" onClick={() => setMode('signup')} className="text-[11px] text-slate-500 hover:text-blue-400 transition-colors font-medium">
                BACK TO SIGN UP
              </button>
            </div>
          </form>
        );
      case 'forgot':
        return (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-4 shadow-inner">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">Forgot Password?</h2>
              <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-mono">We'll send a recovery link</p>
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 text-white"
                required
              />
            </div>
            {error && (
              <div className="text-[11px] text-red-400 bg-red-400/5 p-3 rounded-lg border border-red-400/10 flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 mt-6 active:scale-[0.98]"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'SEND RECOVERY LINK'}
            </button>
            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <button type="button" onClick={() => setMode('login')} className="text-[11px] text-slate-500 hover:text-blue-400 transition-colors font-medium">
                RETURN TO LOGIN
              </button>
            </div>
          </form>
        );
      case 'profile':
        if (showAvatarPicker) {
          const options = getAvatarOptions(engine.state.ownedMarbles);
          return (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <button 
                  onClick={() => setShowAvatarPicker(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
                <h2 className="text-xl font-black tracking-tight text-white">Select Avatar</h2>
              </div>
              
              <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleUpdateAvatar(opt.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${profile?.avatar_url === opt.id ? 'bg-blue-600/20 border-blue-500' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
                  >
                    <AvatarDisplay avatarId={opt.id} size={40} ownedSkins={engine.state.ownedMarbles} />
                    <span className="text-[9px] text-slate-400 font-bold uppercase text-center leading-tight">{opt.name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center mb-8">
              <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(true)}>
                <AvatarDisplay 
                  avatarId={profile?.avatar_url || 'marble_white'} 
                  size={80} 
                  className="ring-4 ring-blue-600/20 group-hover:ring-blue-600/40 transition-all"
                  ownedSkins={engine.state.ownedMarbles}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-all">
                  <RefreshCw className="w-6 h-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white mt-4">{profile?.username || currentUser?.email?.split('@')[0] || 'Player'}</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-1">Global Identity</p>
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={() => setShowAvatarPicker(true)}
                className="w-full p-4 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between hover:bg-black/60 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                    <UserCircle className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Identity Graphic</p>
                    <p className="text-white font-bold text-sm">Change Avatar</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-all" />
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-black/40 rounded-xl border border-white/10 text-center">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 font-bold">Status</p>
                  <p className="text-blue-400 font-bold text-sm">Online</p>
                </div>
                <div className="p-4 bg-black/40 rounded-xl border border-white/10 text-center">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 font-bold">ID Type</p>
                  <p className="text-white font-bold text-sm">Underdog ID</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-red-500/20 mt-6"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              DISCONNECT IDENTITY
            </button>
          </div>
        );
    }
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
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold ml-2">System Authentication</span>
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
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/5 flex justify-center items-center mt-auto">
          <div className="flex gap-2 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">Secure Session</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
