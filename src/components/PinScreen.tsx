import React, { useState, useEffect } from 'react';
import { usePos } from '../context/PosContext';
import { Delete, Lock, ArrowRight } from 'lucide-react';

export const PinScreen: React.FC = () => {
  const { login, settings } = usePos();
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setErrorMsg('');
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg('');
    setPin('');
  };

  const handleSubmit = (currentPin?: string) => {
    const pinToTest = currentPin ?? pin;
    if (pinToTest.length !== 6) {
      setErrorMsg('Masukkan 6 digit PIN kasir');
      return;
    }

    const success = login(pinToTest);
    if (!success) {
      setErrorMsg('PIN salah');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
    }
  };

  // Auto submit when 6 digits are typed
  useEffect(() => {
    if (pin.length === 6) {
      handleSubmit(pin);
    }
  }, [pin]);

  // Support physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-4 select-none">
      <div
        className={`w-full max-w-sm bg-white border border-[#E5E5E5] p-8 transition-transform duration-200 ${
          isShaking ? 'translate-x-[-8px]' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 mb-3 rounded-full border border-black/10 flex items-center justify-center p-1 bg-white">
            <img
              src={settings.logoUrl || '/assets/logo.png'}
              alt={settings.storeName}
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                // Fallback elegant monogram
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black uppercase">
            {settings.storeName}
          </h1>
          <p className="text-xs text-[#666666] tracking-[0.2em] uppercase mt-0.5">
            Sistem Kasir Modern
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-[#666666]">
            <Lock className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Masukkan PIN Kasir untuk Masuk</span>
          </div>
        </div>

        {/* PIN Dots (hidden digits) */}
        <div className="flex justify-center items-center gap-3.5 mb-8">
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const isFilled = index < pin.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-amber-600 scale-110 shadow-sm shadow-amber-600/25'
                    : 'border-2 border-[#CCCCCC] bg-transparent'
                }`}
                aria-label={`Digit ${index + 1}`}
              />
            );
          })}
        </div>

        {/* Error message */}
        <div className="h-6 mb-4 text-center">
          {errorMsg ? (
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 border border-red-200">
              {errorMsg}
            </span>
          ) : (
            <span className="text-xs text-[#999999]">Default PIN: Rahasia</span>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 text-xl font-medium text-black bg-[#F9F9F9] border border-[#E5E5E5] hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
            >
              {digit}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 text-sm font-semibold tracking-wider text-[#666666] bg-[#F9F9F9] border border-[#E5E5E5] hover:bg-neutral-800 hover:text-white transition-colors flex items-center justify-center cursor-pointer active:scale-95 uppercase"
          >
            Clear
          </button>

          {/* Zero */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 text-xl font-medium text-black bg-[#F9F9F9] border border-[#E5E5E5] hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Hapus satu angka"
            className="h-14 text-black bg-[#F9F9F9] border border-[#E5E5E5] hover:bg-neutral-800 hover:text-white transition-colors flex items-center justify-center cursor-pointer active:scale-95"
          >
            <Delete className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={pin.length === 0}
          className="w-full h-12 bg-amber-600 text-white text-sm font-semibold tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-amber-600/25"
        >
          <span>Masuk Kasir</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-6 text-center text-xs text-[#888888]">
        <span>Point of Sale • Minimalist & Modern Edition</span>
      </div>
    </div>
  );
};
