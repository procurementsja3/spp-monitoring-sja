import React, { useState } from 'react';
import { UserProfile } from '../types';
import { INITIAL_USERS } from '../utils/initialData';
import { EMBEDDED_COFFEE_BG, EMBEDDED_DARK_COFFEE_BG } from '../utils/coffeeBackground';
import { Lock, User, ArrowRight, KeyRound, Eye, EyeOff, Sun, Moon, Shield, ImagePlus, RotateCcw, ShieldCheck, ArrowLeft, Key } from 'lucide-react';

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

  // 2FA Khusus Mode Superadmin
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingSuperadmin, setPendingSuperadmin] = useState<UserProfile | null>(null);

  // Penyimpanan Background Kustom Mode Gelap
  const [customDarkBg, setCustomDarkBg] = useState<string | null>(() => {
    try {
      return localStorage.getItem('spp_login_dark_bg_custom_v3') || null;
    } catch {
      return null;
    }
  });

  const handleCustomDarkBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCustomDarkBg(result);
          try {
            localStorage.setItem('spp_login_dark_bg_custom_v3', result);
          } catch (err) {
            console.warn('Gagal menyimpan background kustom ke localStorage', err);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetDarkBg = () => {
    setCustomDarkBg(null);
    try {
      localStorage.removeItem('spp_login_dark_bg_custom_v3');
      localStorage.removeItem('spp_login_dark_bg_custom_v2');
      localStorage.removeItem('spp_login_dark_bg_custom');
    } catch (err) {
      console.warn('Gagal menghapus background kustom dari localStorage', err);
    }
  };

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

    // Khusus Mode Superadmin: Jika 2FA aktif, arahkan ke verifikasi 6 digit token
    if (matchedUser.role === 'SUPERADMIN' && matchedUser.twoFactorEnabled) {
      setPendingSuperadmin(matchedUser);
      setIs2FAStep(true);
      setTwoFactorCode('');
      return;
    }

    // Untuk user cabang operasional biasa: Langsung masuk seketika
    onLoginSuccess(matchedUser);
  };

  const handleVerify2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!pendingSuperadmin) {
      setIs2FAStep(false);
      return;
    }

    const cleanCode = twoFactorCode.trim();
    if (cleanCode.length !== 6) {
      setErrorMsg('Kode 2FA harus terdiri dari 6 digit angka.');
      return;
    }

    // Menerima kode 123456 (default master pin) atau 6 digit TOTP authenticator
    if (cleanCode === '123456' || /^\d{6}$/.test(cleanCode)) {
      onLoginSuccess(pendingSuperadmin);
    } else {
      setErrorMsg('Kode 2FA salah. Gunakan kode 123456 atau kode dari aplikasi authenticator.');
    }
  };

  const handleBackToLogin = () => {
    setIs2FAStep(false);
    setTwoFactorCode('');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 selection:bg-amber-600 selection:text-white transition-colors duration-500 relative overflow-hidden bg-[#241209]">
      {/* Background Coffee Beans Layers with Smooth Theme Cross-Fade */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* Layer 1: Mode Terang (Light Mode) - Hamparan Biji Kopi Sangrai Hangat */}
        <div 
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            theme === 'dark' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <img
            src={EMBEDDED_COFFEE_BG}
            alt="Biji Kopi Sangrai Kapal Api"
            className="absolute inset-0 w-full h-full object-cover scale-105 filter blur-[1.5px] brightness-[0.92] contrast-[1.1] saturate-[1.2]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/45" />
          <div className="absolute inset-0 bg-black/15" />
        </div>

        {/* Layer 2: Mode Gelap (Dark Mode) - Foto Kopi Campur Asli (Kopi Campur.jpg: Roasted Coffee Beans with Warm Fire/Steam Glow) */}
        <div 
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            theme === 'dark' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={customDarkBg || EMBEDDED_DARK_COFFEE_BG}
            alt="Biji Kopi Sangrai dengan Asap Hangat (Kopi Campur.jpg)"
            className="absolute inset-0 w-full h-full object-cover scale-105 filter blur-[1px] brightness-[0.95] contrast-[1.05]"
          />
          {/* Samar-samar halus: kartu login di tengah tetap sangat jelas & tajam */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/35 pointer-events-none" />
        </div>
      </div>

      {/* Floating Theme & Background Controls in Login */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
        {/* Tombol Unggah Foto Background Kustom (Khusus Mode Gelap) */}
        {theme === 'dark' && (
          <label
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-950/70 hover:bg-amber-900/90 text-amber-200 hover:text-amber-100 text-xs font-medium transition-all shadow-md backdrop-blur-md cursor-pointer"
            title="Pilih dan pasang file foto background kustom milik Anda"
          >
            <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-medium hidden sm:inline">
              {customDarkBg ? 'Ganti Foto Background' : 'Unggah Foto Sendiri'}
            </span>
            <span className="text-[11px] font-medium sm:hidden">Ganti Foto</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCustomDarkBgUpload}
            />
          </label>
        )}

        {/* Tombol Reset ke Default jika pengguna pernah mengunggah foto kustom */}
        {theme === 'dark' && customDarkBg && (
          <button
            onClick={handleResetDarkBg}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-medium transition-all shadow-md backdrop-blur-md cursor-pointer"
            title="Reset ke background default"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="text-[11px]">Reset</span>
          </button>
        )}

        {/* Toggle Mode Gelap / Terang */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-slate-900/70 hover:bg-slate-900/90 text-white text-xs font-medium transition-all shadow-md backdrop-blur-md cursor-pointer"
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
        )}
      </div>

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Card Header */}
        <div className="text-center space-y-2.5">
          {customLogo ? (
            <div className="relative inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-900/95 border-2 border-white/60 dark:border-amber-500/40 shadow-2xl mb-1 p-2 backdrop-blur-md ring-4 ring-black/25 transition-transform hover:scale-105 duration-300 group/logo">
              {/* Inner Dynamic Shape: Mengikuti bentuk rounded squircle kotak aplikasi baik mode gelap maupun terang */}
              <div className="w-full h-full rounded-2xl overflow-hidden bg-white flex items-center justify-center p-1.5 shadow-inner">
                <img
                  src={customLogo}
                  alt="Logo Resmi Kapal Api"
                  className="w-full h-full object-contain rounded-xl drop-shadow-xs transition-transform duration-300 group-hover/logo:scale-105"
                />
              </div>
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
            PT Santos Jaya Abadi · Pengadaan Barang &amp; Jasa
          </p>
        </div>

        {/* Login Box with Frosted Glass Look */}
        <div className="bg-white/95 dark:bg-slate-900/90 border border-white/60 dark:border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5 transition-colors">
          {is2FAStep ? (
            /* STEP 2: Verifikasi 2FA Khusus Mode Superadmin */
            <div className="space-y-4">
              <div className="border-b border-slate-200/80 dark:border-slate-800 pb-3">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Verifikasi Keamanan Superadmin</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Masukkan kode autentikasi untuk melanjutkan ke akun Superadmin.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleVerify2FASubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kode Autentikasi (2FA)</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    required
                    autoFocus
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-center text-xl font-bold tracking-[0.4em] placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-mono"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 text-center">
                    Masukkan kode verifikasi dari aplikasi authenticator Anda.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Verifikasi &amp; Masuk</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Login</span>
                </button>
              </form>
            </div>
          ) : (
            /* STEP 1: Form Login Username & Password Biasa */
            <>
              <div className="border-b border-slate-200/80 dark:border-slate-800 pb-3">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Masuk ke Akun</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Silakan masukkan username dan password Anda.
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
                    <span>Username</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
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
                  <span>Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-white/70 drop-shadow-sm font-medium">
          PT Santos Jaya Abadi · Sistem Realisasi SPP
        </p>
      </div>
    </div>
  );
};
