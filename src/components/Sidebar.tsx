import React, { useState, useEffect } from 'react';
import { usePos } from '../context/PosContext';
import { ActiveTab } from '../types/pos';
import {
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  Truck,
  Settings,
} from 'lucide-react';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    groupTitle: 'Penjualan',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        ),
      },
      {
        id: 'pos',
        label: 'Kasir (PoS)',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
      },
      {
        id: 'history',
        label: 'Riwayat Transaksi',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
        ),
      },
    ],
  },
  {
    groupTitle: 'Operasional',
    items: [
      {
        id: 'expenses',
        label: 'Belanja Bahan',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        ),
      },
      {
        id: 'customers',
        label: 'Direktori Pelanggan',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
      },
    ],
  },
  {
    groupTitle: 'Laporan & Pengaturan',
    items: [
      {
        id: 'export',
        label: 'Ekspor Laporan',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
      },
      {
        id: 'settings',
        label: 'Pengaturan Toko',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        ),
      },
    ],
  },
];

export const PrivacyToggleButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isPrivacyMode, togglePrivacyMode } = usePos();

  if (compact) {
    return (
      <button
        type="button"
        onClick={togglePrivacyMode}
        title={isPrivacyMode ? 'Tampilkan Saldo (Tekan H)' : 'Sensor Saldo (Tekan H)'}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border select-none cursor-pointer touch-manipulation ${
          isPrivacyMode
            ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs'
            : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        {isPrivacyMode ? (
          <svg
            className="w-3.5 h-3.5 text-amber-700 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
            />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5 text-slate-500 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        )}
        <span className="hidden sm:inline">
          {isPrivacyMode ? 'Sensor Aktif' : 'Mode Privasi'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={togglePrivacyMode}
      title={isPrivacyMode ? 'Tampilkan Saldo (Tekan H)' : 'Sensor Saldo (Tekan H)'}
      className={`w-full flex items-center justify-center xl:justify-start gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer touch-manipulation ${
        isPrivacyMode
          ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      }`}
    >
      {isPrivacyMode ? (
        <svg
          className="w-4 h-4 text-amber-700 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4 text-slate-500 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      )}
      <span className="hidden xl:inline-block truncate">
        {isPrivacyMode ? 'Sensor Aktif' : 'Mode Privasi'}
      </span>
      <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[9px] font-bold bg-white text-slate-400 rounded border border-slate-200 ml-auto">
        H
      </kbd>
    </button>
  );
};

export const Sidebar: React.FC = () => {
  const {
    activeTab: currentView,
    setActiveTab: setCurrentView,
    settings,
    logout: handleLogout,
    activeCashier,
    setActiveCashier,
    cashierList,
    cart: cartItems,
    isPrivacyMode,
    togglePrivacyMode,
  } = usePos();

  const [cashierDropdownOpen, setCashierDropdownOpen] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  const activeLogoSrc = settings?.storeLogo || settings?.logoUrl || '';

  useEffect(() => {
    setLogoLoadError(false);
  }, [activeLogoSrc]);

  // 5 Menu Utama untuk Mobile Bottom Navigation Bar (< md)
  const mobileBottomNavItems: {
    id: ActiveTab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Kasir', icon: ShoppingBag },
    { id: 'history', label: 'Riwayat', icon: Receipt },
    { id: 'expenses', label: 'Belanja', icon: Truck },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <>
      {/* =================================================================== */}
      {/* DESKTOP & TABLET SIDEBAR (md:flex, md:w-20 xl:w-64)                 */}
      {/* =================================================================== */}
      <aside className="hidden md:flex flex-col md:w-20 xl:w-64 h-full shrink-0 bg-white border-r border-slate-200/80 z-30 select-none transition-all duration-200 justify-between print:hidden">
        {/* A. BAGIAN ATAS: LOGO & BRAND */}
        <div
          className="p-4 xl:p-5 border-b border-slate-100 flex items-center justify-center xl:justify-start gap-3 shrink-0"
          title="RISOLOGY POS - Sistem Kasir & PO"
        >
          {/* Thumbnail Logo Bulat / Rounded Segi Empat Amber */}
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {activeLogoSrc && !logoLoadError ? (
              <img
                key={activeLogoSrc}
                src={activeLogoSrc}
                alt="Logo RisoLogy"
                className="w-full h-full object-contain p-1"
                onError={() => setLogoLoadError(true)}
              />
            ) : (
              <span className="text-xl" role="img" aria-label="Risol">
                🥟
              </span>
            )}
          </div>

          {/* Teks Identitas Brand (Hanya tampil di Desktop XL) */}
          <div className="hidden xl:flex flex-col min-w-0">
            <span className="font-extrabold text-sm text-slate-900 tracking-tight leading-none truncate">
              RISOLOGY POS
            </span>
            <span className="text-[11px] font-semibold text-amber-600 mt-1 truncate">
              Sistem Kasir &amp; PO
            </span>
          </div>
        </div>

        {/* B. BAGIAN TENGAH: DAFTAR MENU NAVIGASI BERDASARKAN GRUP */}
        <nav
          className="flex-1 overflow-y-auto px-2.5 xl:px-3 py-4 space-y-5 no-scrollbar"
          aria-label="Menu Utama POS"
        >
          {navigationGroups.map((group, groupIdx) => (
            <div key={group.groupTitle} className="space-y-1">
              {/* 1. Header Grup (Tampil pada Desktop XL) */}
              <div className="hidden xl:block px-3 py-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.groupTitle}
                </span>
              </div>

              {/* 2. Garis Pemisah Halus (Tampil hanya pada Tablet MD jika bukan grup pertama) */}
              {groupIdx > 0 && (
                <div className="block xl:hidden mx-auto my-2 w-8 h-[1px] bg-slate-200" />
              )}

              {/* 3. Daftar Item Tombol */}
              {group.items.map((item) => {
                const isActive = currentView === item.id;
                const isPos = item.id === 'pos';
                const showCartBadge = isPos && cartItems && cartItems.length > 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentView(item.id)}
                    title={item.label}
                    className={`w-full flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group relative cursor-pointer touch-manipulation ${
                      isActive
                        ? 'bg-amber-100/70 text-amber-900 border border-amber-200/60 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {/* Ikon Tombol */}
                    <span
                      className={`shrink-0 transition-transform group-hover:scale-105 ${
                        isActive ? 'text-amber-700' : 'text-slate-500 group-hover:text-slate-700'
                      }`}
                    >
                      {item.icon}
                    </span>

                    {/* Label Tombol (Hanya Desktop XL) */}
                    <span className="hidden xl:inline-block truncate">{item.label}</span>

                    {/* Badge Jumlah Item Kasir */}
                    {showCartBadge && (
                      <>
                        {/* Desktop Badge */}
                        <span className="hidden xl:inline-flex ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white">
                          {cartItems.length}
                        </span>
                        {/* Tablet Indicator Dot */}
                        <span className="block xl:hidden absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-600 ring-2 ring-white" />
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* C. BAGIAN BAWAH: MODE PRIVASI, INFO KASIR & LOGOUT */}
        <div className="p-3 xl:p-4 border-t border-slate-100 bg-white shrink-0 space-y-2">
          {/* 1. Tombol Mode Privasi / Sensor Saldo (Hotkey 'H') */}
          <button
            type="button"
            onClick={togglePrivacyMode}
            title={isPrivacyMode ? 'Tampilkan Saldo (Tekan H)' : 'Sensor Saldo (Tekan H)'}
            className={`w-full flex items-center justify-center xl:justify-start gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer touch-manipulation ${
              isPrivacyMode
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {isPrivacyMode ? (
              <svg
                className="w-4 h-4 text-amber-700 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-slate-500 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
            <span className="hidden xl:inline-block">
              {isPrivacyMode ? 'Sensor Aktif' : 'Mode Privasi'}
            </span>
            <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[9px] font-bold bg-white text-slate-400 rounded border border-slate-200 ml-auto">
              H
            </kbd>
          </button>

          {/* 2. Kartu Profil Kasir & Tombol Logout */}
          <div className="relative flex flex-col xl:flex-row items-center justify-between gap-2 pt-1">
            {cashierDropdownOpen && (
              <div className="absolute bottom-full left-0 w-48 xl:w-full mb-2 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pilih Shift Kasir
                </div>
                {cashierList.map((cashier) => (
                  <button
                    key={cashier}
                    type="button"
                    onClick={() => {
                      setActiveCashier(cashier);
                      setCashierDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      activeCashier === cashier
                        ? 'bg-amber-100/80 text-amber-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span>{cashier}</span>
                    {activeCashier === cashier && (
                      <span className="text-[10px] font-bold text-amber-700">Aktif</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setCashierDropdownOpen(!cashierDropdownOpen)}
              title={`Kasir Shift Aktif: ${activeCashier || 'Kasir'} (Klik untuk ganti shift)`}
              className="flex items-center justify-center xl:justify-start gap-2.5 min-w-0 w-full xl:w-auto xl:flex-1 p-1 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer touch-manipulation"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                {(activeCashier || 'K').charAt(0).toUpperCase()}
              </div>
              <div className="hidden xl:flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-800 truncate">
                  {activeCashier || 'Kasir'}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Shift Aktif
                </span>
              </div>
            </button>

            {/* Tombol Logout */}
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar / Ganti Kasir"
              className="w-full xl:w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer touch-manipulation"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (fixed bottom-0, < md)                 */}
      {/* =================================================================== */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-40 flex md:hidden items-center justify-around px-2 print:hidden"
      >
        {mobileBottomNavItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentView === item.id;
          const showMobileBadge = item.id === 'pos' && cartItems && cartItems.length > 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg transition-colors cursor-pointer touch-manipulation ${
                isActive
                  ? 'text-amber-600 font-bold'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              <IconComponent
                className={`w-5 h-5 ${
                  isActive ? 'stroke-[2.2] text-amber-600' : 'stroke-[1.75]'
                }`}
              />
              <span className="text-[10px] leading-none tracking-tight">{item.label}</span>
              {showMobileBadge && (
                <span className="absolute top-0.5 right-1 min-w-3.5 h-3.5 px-1 rounded-full text-[8px] font-bold bg-amber-600 text-white flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
