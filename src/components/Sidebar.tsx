import React, { useState, useEffect } from 'react';
import { usePos } from '../context/PosContext';
import { ActiveTab } from '../types/pos';
import {
  Store,
  LayoutDashboard,
  History,
  Users,
  Truck,
  FileSpreadsheet,
  Settings,
  LogOut,
  ChevronDown,
  UserCheck,
  Cloud,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    settings,
    logout,
    activeCashier,
    setActiveCashier,
    cashierList,
    currentUser,
  } = usePos();
  const [cashierDropdownOpen, setCashierDropdownOpen] = useState(false);
  const [mobileShiftOpen, setMobileShiftOpen] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  const activeLogoSrc = settings?.storeLogo || settings?.logoUrl || '';

  // Reset status error gambar setiap kali pengguna mengganti/mengunggah logo baru di SettingsView
  useEffect(() => {
    setLogoLoadError(false);
  }, [activeLogoSrc]);

  const navItems: { id: ActiveTab; label: string; shortLabel: string; icon: React.ReactNode; description?: string }[] = [
    {
      id: 'pos',
      label: 'Kasir (PoS)',
      shortLabel: 'Kasir',
      icon: <Store className="w-4 h-4 stroke-[1.8]" />,
      description: 'Shift, Order & Diskon',
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 stroke-[1.8]" />,
      description: 'Tren Omzet & Best Seller',
    },
    {
      id: 'history',
      label: 'Riwayat Transaksi',
      shortLabel: 'Riwayat',
      icon: <History className="w-4 h-4 stroke-[1.8]" />,
      description: 'Nota & Laporan Struk',
    },
    {
      id: 'customers',
      label: 'Data Pelanggan',
      shortLabel: 'Pelanggan',
      icon: <Users className="w-4 h-4 stroke-[1.8]" />,
      description: 'LTV, Tier & Kunjungan',
    },
    {
      id: 'expenses',
      label: 'Belanja Supplier',
      shortLabel: 'Belanja',
      icon: <Truck className="w-4 h-4 stroke-[1.8]" />,
      description: 'Pencatatan Bahan Baku',
    },
    {
      id: 'export',
      label: 'Modul Ekspor',
      shortLabel: 'Ekspor',
      icon: <FileSpreadsheet className="w-4 h-4 stroke-[1.8]" />,
      description: '6 Template CSV / Excel',
    },
    {
      id: 'settings',
      label: 'Pengaturan Toko',
      shortLabel: 'Pengaturan',
      icon: <Settings className="w-4 h-4 stroke-[1.8]" />,
      description: 'Profil & Kategori Menu',
    },
  ];

  // 5 Menu Esensial untuk Mobile Bottom Navigation Bar
  const mobileBottomNavItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'pos', label: 'Kasir', icon: Store },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: 'Riwayat', icon: History },
    { id: 'expenses', label: 'Belanja Bahan', icon: Truck },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <>
      {/* =================================================================== */}
      {/* DESKTOP & TABLET LANDSCAPE SIDEBAR (md:flex)                        */}
      {/* =================================================================== */}
      <aside className="hidden md:flex w-64 bg-white border-r border-[#E5E5E5] flex-col justify-between h-screen shrink-0 select-none print:hidden">
        {/* Top Header & Dynamic Store Identity */}
        <div>
          <div className="border-b border-[#E5E5E5]">
            <div className="flex items-center gap-3 px-4 py-4">
              <div
                className={`w-10 h-10 min-w-10 min-h-10 aspect-square rounded-xl overflow-hidden border flex items-center justify-center shadow-sm shrink-0 ${
                  activeLogoSrc && !logoLoadError
                    ? 'border-slate-200 bg-white'
                    : 'bg-amber-500/10 border-amber-500/20'
                }`}
              >
                {activeLogoSrc && !logoLoadError ? (
                  <img
                    key={activeLogoSrc}
                    src={activeLogoSrc}
                    alt={settings?.storeName || 'Logo'}
                    className="w-full h-full aspect-square object-cover"
                    onError={() => setLogoLoadError(true)}
                  />
                ) : (
                  <span className="font-bold text-amber-600 text-base">
                    {settings?.storeName?.charAt(0) || 'R'}
                  </span>
                )}
              </div>
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="font-bold text-sm text-zinc-900 uppercase tracking-tight truncate">
                  {settings?.storeName || 'RisoLogy POS'}
                </span>
                <span className="text-xs text-zinc-500 truncate">
                  {settings?.brandName || 'Artisan Risol'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-2.5 space-y-1" aria-label="Menu Utama POS">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer border rounded-md group ${
                    isActive
                      ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 font-semibold shadow-md shadow-amber-600/20'
                      : 'bg-transparent text-slate-800 border-transparent hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-600 group-hover:text-amber-600'}>
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs tracking-tight font-bold">{item.label}</div>
                    {item.description && (
                      <div
                        className={`text-[10px] truncate ${
                          isActive ? 'text-white/80' : 'text-[#666666]'
                        }`}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Footer Actions: Shift Kasir Selector & Logout */}
        <div className="p-3 border-t border-[#E5E5E5] space-y-2">
          {/* Real-time Firebase Sync Status */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-emerald-50/80 border border-emerald-200/80 rounded text-[11px] text-emerald-800">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span>Sync: @{currentUser || 'RisoLogy'}</span>
            </div>
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
          </div>

          {/* Shift Kasir Dropdown / Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCashierDropdownOpen(!cashierDropdownOpen)}
              className="w-full flex items-center justify-between p-2 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-left cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block leading-none">
                    Shift Aktif:
                  </span>
                  <span className="font-bold text-slate-900 text-xs truncate block mt-0.5">
                    {activeCashier}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {cashierDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded shadow-lg p-1 z-30 space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase">
                  Pilih Shift Kasir:
                </div>
                {cashierList.map((cashier) => (
                  <button
                    key={cashier}
                    type="button"
                    onClick={() => {
                      setActiveCashier(cashier);
                      setCashierDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded cursor-pointer flex items-center justify-between ${
                      activeCashier === cashier
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cashier}</span>
                    {activeCashier === cashier && <span className="text-[10px]">Aktif</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 border border-[#CCCCCC] hover:border-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer uppercase tracking-wider rounded"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Kunci / Keluar</span>
          </button>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* MOBILE COMPACT TOP HEADER BAR (< md)                                */}
      {/* =================================================================== */}
      <div className="flex md:hidden w-full bg-white border-b border-slate-200 items-center justify-between px-3.5 py-2.5 shrink-0 print:hidden z-30">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 min-w-8 min-h-8 aspect-square rounded-lg overflow-hidden border flex items-center justify-center shadow-xs shrink-0 ${
              activeLogoSrc && !logoLoadError
                ? 'border-slate-200 bg-white'
                : 'bg-amber-500/10 border-amber-500/20'
            }`}
          >
            {activeLogoSrc && !logoLoadError ? (
              <img
                key={activeLogoSrc}
                src={activeLogoSrc}
                alt={settings?.storeName || 'Logo'}
                className="w-full h-full aspect-square object-cover"
                onError={() => setLogoLoadError(true)}
              />
            ) : (
              <span className="font-bold text-amber-600 text-xs">
                {settings?.storeName?.charAt(0) || 'R'}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-tight truncate block">
              {settings?.storeName || 'RisoLogy POS'}
            </span>
            <span className="text-[10px] text-slate-500 truncate block leading-none">
              {settings?.brandName || 'Artisan Risol'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick access buttons for Pelanggan & Ekspor on Mobile */}
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'customers'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-amber-600'
            }`}
            title="Data Pelanggan"
          >
            <Users className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'export'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-amber-600'
            }`}
            title="Modul Ekspor Spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </button>

          {/* Interactive Mobile Shift Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMobileShiftOpen(!mobileShiftOpen)}
              className="flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg cursor-pointer"
              title="Klik untuk ganti shift kasir"
            >
              <span>{activeCashier}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {mobileShiftOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-50 space-y-0.5">
                <div className="px-2 py-1 text-[9px] font-bold text-slate-500 uppercase">
                  Shift Kasir:
                </div>
                {cashierList.map((cashier) => (
                  <button
                    key={cashier}
                    type="button"
                    onClick={() => {
                      setActiveCashier(cashier);
                      setMobileShiftOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between cursor-pointer ${
                      activeCashier === cashier
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cashier}</span>
                    {activeCashier === cashier && <span className="text-[9px]">Aktif</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={logout}
            className="p-1.5 border border-slate-200 hover:border-rose-600 text-slate-600 hover:text-rose-600 rounded-lg cursor-pointer"
            title="Keluar"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (flex md:hidden)                       */}
      {/* =================================================================== */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex md:hidden items-center justify-around shadow-lg print:hidden"
      >
        {mobileBottomNavItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer touch-manipulation ${
                isActive ? 'text-amber-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              <IconComponent className={`w-5 h-5 ${isActive ? 'stroke-[2.2] text-amber-600' : 'stroke-[1.75]'}`} />
              <span className="text-[10px] leading-none tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
