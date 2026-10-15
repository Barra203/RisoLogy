import React, { useState } from 'react';
import { usePos } from '../context/PosContext';
import { Lock, Eye, EyeOff, LogIn, UserCheck, AlertCircle, Sparkles, Check } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, settings, cashierList } = usePos();
  const [selectedCashier, setSelectedCashier] = useState<string>(cashierList[0] || 'Harits');
  const [typedCashier, setTypedCashier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isTypingManual, setIsTypingManual] = useState<boolean>(false);

  const activeCashierName = isTypingManual ? typedCashier : selectedCashier;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cashierToUse = activeCashierName.trim();
    if (!cashierToUse) {
      setErrorMsg('Silakan pilih atau ketik nama kasir yang bertugas');
      triggerShake();
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Silakan masukkan password kasir');
      triggerShake();
      return;
    }

    // Call context login with username and password
    const success = login(cashierToUse, password);
    if (!success) {
      setErrorMsg('Nama kasir atau password salah! (Password: RisoLogyKeren)');
      triggerShake();
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleQuickPasswordFill = () => {
    setPassword('RisoLogyKeren');
    setErrorMsg('');
  };

  // Color badges for cashier initials
  const cashierColors: Record<string, { bg: string; text: string; ring: string }> = {
    Harits: { bg: 'bg-blue-100', text: 'text-[#1854BA]', ring: 'ring-blue-500' },
    Rafi: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-500' },
    Barra: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-500' },
    Dimas: { bg: 'bg-amber-100', text: 'text-amber-800', ring: 'ring-amber-500' },
    Akhyar: { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-500' },
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-4 select-none">
      <div
        className={`w-full max-w-md bg-white border border-[#E5E5E5] shadow-lg p-6 sm:p-8 transition-transform duration-200 ${
          isShaking ? 'translate-x-[-8px]' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 mb-3 rounded-full border border-black/10 flex items-center justify-center p-1.5 bg-white shadow-xs">
            <img
              src={settings.logoUrl || '/assets/logo.png'}
              alt={settings.storeName}
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                e.currentTarget.src = '/assets/logo.png';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
            {settings.storeName}
          </h1>
          <p className="text-xs text-slate-500 tracking-[0.2em] uppercase mt-0.5 font-medium">
            Sistem Kasir &amp; Operasional Toko
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 font-semibold">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Login Petugas Kasir</span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section: Pilih Kasir Bertugas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Pilih Shift Kasir:
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsTypingManual(!isTypingManual);
                  setErrorMsg('');
                }}
                className="text-[11px] text-[#1854BA] hover:underline cursor-pointer font-medium"
              >
                {isTypingManual ? 'Pilih dari List' : 'Ketik Manual'}
              </button>
            </div>

            {!isTypingManual ? (
              <div className="grid grid-cols-5 gap-2">
                {cashierList.map((cashier) => {
                  const isSelected = selectedCashier === cashier;
                  const color = cashierColors[cashier] || {
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                    ring: 'ring-slate-400',
                  };

                  return (
                    <button
                      key={cashier}
                      type="button"
                      onClick={() => {
                        setSelectedCashier(cashier);
                        setErrorMsg('');
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#1854BA] bg-blue-50/60 shadow-xs ring-2 ring-[#1854BA]/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${color.bg} ${color.text}`}
                      >
                        {cashier.charAt(0)}
                      </div>
                      <span className="text-[11px] font-bold text-slate-900 truncate w-full text-center">
                        {cashier}
                      </span>
                      {isSelected && (
                        <span className="mt-0.5 inline-block text-[#1854BA]">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={typedCashier}
                  onChange={(e) => {
                    setTypedCashier(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="Ketik nama kasir (Harits, Rafi, Barra, Dimas, Akhyar)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none bg-white font-medium"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Section: Password Kasir */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>2. Password Kasir:</span>
              </label>
              <button
                type="button"
                onClick={handleQuickPasswordFill}
                className="text-[11px] text-[#1854BA] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                title="Isi otomatis dengan password RisoLogyKeren"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Isi: RisoLogyKeren</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Masukkan password kasir..."
                className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-300 rounded focus:border-[#1854BA] focus:ring-1 focus:ring-[#1854BA] focus:outline-none bg-white font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <span>Password resmi kasir:</span>
              <code className="bg-slate-100 text-[#1854BA] px-1.5 py-0.5 rounded font-mono font-bold">
                RisoLogyKeren
              </code>
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-[#1854BA] text-white text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-[#12408F] transition-colors rounded cursor-pointer shadow-sm active:scale-[0.99]"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk ke Web PoS (Shift: {activeCashierName || 'Kasir'})</span>
          </button>
        </form>

        {/* Info card footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Kasir Terdaftar: 5 Petugas</span>
          <span className="font-semibold text-slate-700">RisoLogy v3.0</span>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-[#888888]">
        <span>Point of Sale • Artisan Risol Modern System</span>
      </div>
    </div>
  );
};
