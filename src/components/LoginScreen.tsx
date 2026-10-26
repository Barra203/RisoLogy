import React, { useState } from 'react';
import { usePos } from '../context/PosContext';
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle, Cloud, ShieldCheck } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, settings } = usePos();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setErrorMsg('Silakan masukkan username');
      triggerShake();
      return;
    }

    if (!trimmedPass) {
      setErrorMsg('Silakan masukkan password');
      triggerShake();
      return;
    }

    setIsSubmitting(true);

    // Call context login with username and password
    const success = login(trimmedUser, trimmedPass);

    if (!success) {
      setErrorMsg('Username atau password salah. Silakan coba lagi.');
      triggerShake();
      setIsSubmitting(false);
    } else {
      // Simpan sesi autentikasi kasir ke localStorage agar tidak logout saat halaman dimuat ulang (refresh)
      try {
        const cashierData = {
          username: 'RisoLogy',
          role: 'admin_cashier',
        };
        localStorage.setItem(
          'pos_cashier_session',
          JSON.stringify({
            isAuthenticated: true,
            user: cashierData,
            loginTime: Date.now(),
          })
        );
      } catch (err) {
        console.warn('Gagal menyimpan sesi login:', err);
      }
      setIsSubmitting(false);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-4 select-none">
      <div
        className={`w-full max-w-sm sm:max-w-md bg-white border border-[#E5E5E5] shadow-lg p-6 sm:p-8 transition-transform duration-200 ${
          isShaking ? 'translate-x-[-8px]' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 mb-3 rounded-full border border-black/10 flex items-center justify-center p-1.5 bg-white shadow-xs">
            <img
              src={settings.logoUrl || '/assets/logo.png'}
              alt={settings.storeName || 'RisoLogy'}
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                e.currentTarget.src = '/assets/logo.png';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
            {settings.storeName || 'RisoLogy POS'}
          </h1>
          <p className="text-xs text-slate-500 tracking-[0.2em] uppercase mt-0.5 font-medium">
            Sistem Kasir &amp; Operasional Toko
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-medium">
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cloud Database Sync Active</span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Masukkan username..."
                autoComplete="username"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 focus:outline-none bg-white font-medium text-slate-900 placeholder:text-slate-400 transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Masukkan password..."
                autoComplete="current-password"
                className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 focus:outline-none bg-white font-medium text-slate-900 placeholder:text-slate-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-colors rounded cursor-pointer shadow-md shadow-amber-600/25 active:scale-[0.99] disabled:opacity-70"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk ke Sistem'}</span>
          </button>
        </form>

        {/* Security & Sync Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Akses Terverifikasi</span>
          </div>
          <span className="font-semibold text-slate-700">RisoLogy POS</span>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-[#888888]">
        <span>Point of Sale • Artisan Risol Modern System</span>
      </div>
    </div>
  );
};
