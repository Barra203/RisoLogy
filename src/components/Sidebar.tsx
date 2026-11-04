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
      <aside className="hidden md:flex flex-col w-64 h-full shrink-0 bg-white border-r border-slate-200 z-30 select-none print:hidden">
        {/* A. Header Logo & Brand Toko (Tetap di atas, tidak ikut ter-scroll) */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <div
            className={`w-10 h-10 min-w-10 min-h-10 aspect-square rounded-xl overflow-hidden border flex items-center justify-center shadow-xs shrink-0 ${
              activeLogoSrc && !logoLoadError
                ? 'border-slate-200 bg-white'
                : 'bg-amber-50 border-amber-200'
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
            <span className="font-bold text-sm text-slate-900 uppercase tracking-tight truncate">
              {settings?.storeName || 'RisoLogy POS'}
            </span>
            <span className="text-xs text-slate-500 truncate">
              {settings?.brandName || 'Artisan Risol'}
            </span>
          </div>
        </div>

        {/* B. Daftar Menu Navigasi (Bisa di-scroll tersendiri jika layar vertikal sempit) */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin"
          aria-label="Menu Utama POS"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer border rounded-lg group ${
                  isActive
                    ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 font-semibold shadow-xs'
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
                        isActive ? 'text-white/80' : 'text-slate-500'
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

        {/* C. Profil Kasir / Shift Aktif (Tetap menempel di bawah sidebar) */}
        <div className="p-4 border-t border-slate-100 shrink-0 bg-white space-y-2">
          {/* Real-time Firebase Sync Status */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-[11px] text-emerald-800">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span>Sync: @{currentUser || 'RisoLogy'}</span>
            </div>
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
          </div>

          {/* Shift Kasir Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCashierDropdownOpen(!cashierDropdownOpen)}
              className="w-full flex items-center justify-between p-2 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left cursor-pointer"
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
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-30 space-y-0.5">
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
                    className={`w-full text-left px-2 py-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between ${
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:border-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer uppercase tracking-wider rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Kunci / Keluar</span>
          </button>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (fixed bottom-0, < md)                 */}
      {/* =================================================================== */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-40 pointer-events-auto px-3 flex md:hidden items-center justify-around shadow-lg print:hidden"
      >
        {mobileBottomNavItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg transition-colors cursor-pointer touch-manipulation ${
                isActive
                  ? 'text-amber-600 font-bold'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              <IconComponent
                className={`w-5 h-5 ${isActive ? 'stroke-[2.2] text-amber-600' : 'stroke-[1.75]'}`}
              />
              <span className="text-[10px] leading-none tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
