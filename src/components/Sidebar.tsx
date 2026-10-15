import React, { useState } from 'react';
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
} from 'lucide-react';
import { RisolIcon } from './RisolIcon';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, settings, logout, activeCashier, setActiveCashier, cashierList } = usePos();
  const [cashierDropdownOpen, setCashierDropdownOpen] = useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; description?: string }[] = [
    {
      id: 'pos',
      label: 'Kasir (PoS)',
      icon: <Store className="w-4 h-4 stroke-[1.8]" />,
      description: 'Shift, Order & Diskon',
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 stroke-[1.8]" />,
      description: 'Tren Omzet & Best Seller',
    },
    {
      id: 'history',
      label: 'Riwayat Transaksi',
      icon: <History className="w-4 h-4 stroke-[1.8]" />,
      description: 'Nota & Laporan Struk',
    },
    {
      id: 'customers',
      label: 'Data Pelanggan',
      icon: <Users className="w-4 h-4 stroke-[1.8]" />,
      description: 'LTV, Tier & Kunjungan',
    },
    {
      id: 'expenses',
      label: 'Belanja Supplier',
      icon: <Truck className="w-4 h-4 stroke-[1.8]" />,
      description: 'Pencatatan Bahan Baku',
    },
    {
      id: 'export',
      label: 'Modul Ekspor',
      icon: <FileSpreadsheet className="w-4 h-4 stroke-[1.8]" />,
      description: '6 Template CSV / Excel',
    },
    {
      id: 'settings',
      label: 'Pengaturan Toko',
      icon: <Settings className="w-4 h-4 stroke-[1.8]" />,
      description: 'Profil & Kategori Menu',
    },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR (lg and up) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#E5E5E5] flex-col justify-between h-screen shrink-0 select-none print:hidden">
        {/* Top Header & Store Identity */}
        <div>
          <div className="p-5 border-b border-[#E5E5E5]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-black/10 rounded-full flex items-center justify-center p-0.5 bg-[#FAFAFA] overflow-hidden shrink-0">
                <img
                  src={settings.logoUrl || '/assets/logo.png'}
                  alt={settings.storeName}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-black tracking-tight uppercase truncate">
                  {settings.storeName}
                </h2>
                <p className="text-[10px] text-[#666666] uppercase tracking-[0.18em] truncate">
                  Point of Sale System
                </p>
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer border rounded-md ${
                    isActive
                      ? 'bg-[#1854BA] text-white border-[#1854BA] font-semibold shadow-xs'
                      : 'bg-transparent text-slate-800 border-transparent hover:bg-slate-100 hover:border-slate-200'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-600'}>{item.icon}</span>
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
          {/* Shift Kasir Dropdown / Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCashierDropdownOpen(!cashierDropdownOpen)}
              className="w-full flex items-center justify-between p-2 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-left cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-3.5 h-3.5 text-[#1854BA] shrink-0" />
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
                        ? 'bg-[#1854BA] text-white font-bold'
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

      {/* MOBILE / TABLET TOP BAR (< lg) */}
      <div className="lg:hidden w-full bg-white border-b border-[#E5E5E5] flex flex-col px-4 py-2 shrink-0 print:hidden z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full border border-black/10 overflow-hidden flex items-center justify-center p-0.5">
              <img
                src={settings.logoUrl || '/assets/logo.png'}
                alt={settings.storeName}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xs font-bold text-black uppercase tracking-tight">
              {settings.storeName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Shift pill */}
            <span className="text-[10px] font-bold bg-blue-50 text-[#1854BA] border border-blue-200 px-2 py-0.5 rounded">
              Kasir: {activeCashier}
            </span>

            <button
              type="button"
              onClick={logout}
              className="p-1 border border-slate-300 hover:border-rose-600 text-slate-600 hover:text-rose-600 rounded cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pt-2 pb-1 scrollbar-none">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`px-2.5 py-1 text-xs font-semibold whitespace-nowrap cursor-pointer rounded transition-colors ${
                activeTab === item.id
                  ? 'bg-[#1854BA] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
