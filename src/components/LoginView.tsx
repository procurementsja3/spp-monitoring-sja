import React, { useState } from 'react';
import { UserProfile } from '../types';
import { INITIAL_USERS } from '../utils/initialData';
import { EMBEDDED_COFFEE_BG } from '../utils/coffeeBackground';
import { Lock, User, ArrowRight, KeyRound, Eye, EyeOff, Sun, Moon, Shield } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  customLogo?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ 
  onLoginSuccess,
  theme = 'dark',
  onToggleTheme,
  customLogo,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim().toLowerCase();
    const matchedUser = INITIAL_USERS.find(
      (u) =>
        u.username.toLowerCase() === trimmedUser ||
        u.email.toLowerCase() === trimmedUser
    );

    if (!matchedUser) {
      setErrorMsg('Username atau Email tidak terdaftar dalam sistem.');
      return;
    }

    if (matchedUser.password && matchedUser.password !== password) {
      setErrorMsg('Password tidak sesuai. Silakan periksa kembali.');
      return;
    }

    onLoginSuccess(matchedUser);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 selection:bg-amber-600 selection:text-white transition-colors duration-200 relative overflow-hidden bg-[#18110b]">
      {/* Background Coffee Beans Photo with Subtle Soft Blur & Rich Roasted Tone */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <img
          src={EMBEDDED_COFFEE_BG}
          alt="Biji Kopi Kapal Api Background"
          className="absolute inset-0 w-full h-full object-cover scale-105 filter blur-[1.5px] brightness-[0.88] dark:brightness-[0.72] contrast-[1.12] saturate-[1.2] transition-all duration-700"
        />
        {/* Soft Radial Vignette: Menjaga detail biji kopi tetap terlihat sangat jelas di sekeliling */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/55 pointer-events-none" />
        <div className="absolute inset-0 bg-black/15 pointer-events-none" />
      </div>

      {/* Floating Theme Toggle in Login */}
      {onToggleTheme && (
        <div className="absolute top-5 right-5 z-20">
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-slate-900/60 hover:bg-slate-900/80 text-white text-xs font-medium transition-all shadow-md backdrop-blur-md cursor-pointer"
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-medium text-amber-200">Mode Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-300" />
                <span className="text-[11px] font-medium text-slate-200">Mode Gelap</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Card Header */}
        <div className="text-center space-y-2.5">
          {customLogo ? (
            <div className="inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-white/50 dark:border-slate-700/80 shadow-2xl mb-1 p-2.5 backdrop-blur-md ring-4 ring-black/15 transition-transform hover:scale-105 duration-200">
              <img
                src={customLogo}
                alt="Logo Resmi Kapal Api"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 text-white font-bold text-2xl shadow-xl mb-1 ring-2 ring-white/20">
              SJA
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-md">
            Sistem Monitoring Realisasi SPP
          </h1>
          <p className="text-xs text-amber-100/90 dark:text-slate-300 drop-shadow-sm font-medium">
            PT Santos Jaya Abadi · Enterprise Procurement &amp; SLA Management
          </p>
        </div>

        {/* Login Box with Frosted Glass Look */}
        <div className="bg-white/95 dark:bg-slate-900/90 border border-white/60 dark:border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5 transition-colors">
          <div className="border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Autentikasi Pengguna</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Masukkan kredensial akun area atau superadmin Anda.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Username / Email</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="sepanjang / superadmin"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password akun"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Masuk ke Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/70 drop-shadow-sm font-mono">
          PT SJA Procurement Management · Multi-Area Google Sheet Sync
        </p>
      </div>
    </div>
  );
};
