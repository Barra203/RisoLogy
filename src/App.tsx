import React, { useEffect, useState } from 'react';
import { PosProvider, usePos } from './context/PosContext';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar, PrivacyToggleButton } from './components/Sidebar';
import { PosView } from './components/PosView';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { CustomersView } from './components/CustomersView';
import { ExpensesView } from './components/ExpensesView';
import { ExportView } from './components/ExportView';
import { SettingsView } from './components/SettingsView';
import { SuccessReceiptModal } from './components/SuccessReceiptModal';
import { Users, FileSpreadsheet, ChevronDown, LogOut } from 'lucide-react';

const PosMainApp: React.FC = () => {
  const {
    isAuthenticated,
    activeTab,
    setActiveTab,
    login,
    logout,
    isLoading,
    dbError,
    clearDbError,
    settings,
    activeCashier,
    setActiveCashier,
    cashierList,
  } = usePos();

  const [mobileShiftOpen, setMobileShiftOpen] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const activeLogoSrc = settings?.storeLogo || settings?.logoUrl || '';

  useEffect(() => {
    setLogoLoadError(false);
  }, [activeLogoSrc]);

  // Sinkronisasi Dinamis Favicon Tab Browser dengan Logo Toko (settings.storeLogo / settings.logoUrl)
  useEffect(() => {
    const updateFavicon = (iconUrl: string) => {
      let link =
        (document.getElementById('app-favicon') as HTMLLinkElement | null) ||
        (document.querySelector("link[rel*='icon']") as HTMLLinkElement | null);

      if (!link) {
        link = document.createElement('link');
        link.id = 'app-favicon';
        link.rel = 'icon';
        document.head.appendChild(link);
      }

      if (iconUrl.startsWith('data:image/svg+xml') || iconUrl.endsWith('.svg')) {
        link.type = 'image/svg+xml';
      } else if (
        iconUrl.startsWith('data:image/jpeg') ||
        iconUrl.endsWith('.jpg') ||
        iconUrl.endsWith('.jpeg')
      ) {
        link.type = 'image/jpeg';
      } else {
        link.type = 'image/png';
      }
      link.href = iconUrl;

      const appleLink = document.querySelector(
        "link[rel='apple-touch-icon']"
      ) as HTMLLinkElement | null;
      if (appleLink) {
        appleLink.href = iconUrl;
      }
    };

    const activeLogo =
      settings?.storeLogo && settings.storeLogo.trim() !== ''
        ? settings.storeLogo
        : settings?.logoUrl && settings.logoUrl.trim() !== ''
        ? settings.logoUrl
        : '/logo.png';

    updateFavicon(activeLogo);
  }, [settings?.storeLogo, settings?.logoUrl]);

  // Support ?autostart=1 for headless testing & preview
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' && !isAuthenticated) {
        login('RisoLogy', 'kelompokrisol6');
      }
    }
  }, [isAuthenticated, login]);

  const renderCurrentView = () => {
    switch (activeTab) {
      case 'pos':
        return <PosView />;
      case 'dashboard':
        return <DashboardView />;
      case 'history':
        return <HistoryView />;
      case 'customers':
        return <CustomersView />;
      case 'expenses':
        return <ExpensesView />;
      case 'export':
        return <ExportView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <PosView />;
    }
  };

  // If not authenticated, show Login Screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* 1. Sidebar Navigasi Desktop: Terkunci tetap & tidak bisa ikut ter-scroll window */}
      <Sidebar />

      {/* 2. Container Area Konten Utama: Satu-satunya area yang memiliki scroll vertikal */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden relative">
        {/* Mobile Global Top Navbar (< md, shrink-0) */}
        <header className="flex md:hidden w-full bg-white border-b border-slate-200 items-center justify-between px-3.5 py-2.5 shrink-0 print:hidden z-30">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-8 h-8 min-w-8 min-h-8 aspect-square rounded-lg overflow-hidden border flex items-center justify-center shadow-xs shrink-0 ${
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
            <PrivacyToggleButton compact />

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
        </header>

        {/* Database Loading Banner (shrink-0) */}
        {isLoading && (
          <div className="bg-amber-400 text-slate-900 px-4 py-1.5 text-xs font-bold uppercase tracking-wider border-b border-amber-500 flex items-center justify-between shrink-0">
            <span>Memuat &amp; menyinkronkan data dari Cloud Firestore...</span>
            <span className="animate-pulse">● LIVE SYNC</span>
          </div>
        )}

        {/* Database Error Banner (shrink-0) */}
        {dbError && (
          <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold border-b border-rose-700 flex items-center justify-between shrink-0">
            <span>{dbError}</span>
            <button
              onClick={clearDbError}
              className="ml-4 px-2 py-0.5 bg-slate-900 text-white text-[10px] uppercase font-bold rounded-md cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Area View (PosView, DashboardView, HistoryView, dsb.) */}
        <main
          className={
            activeTab === 'dashboard' || activeTab === 'pos'
              ? 'flex-1 h-full min-h-0 overflow-hidden'
              : 'flex-1 h-full min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 safe-bottom-clearance md:pb-8'
          }
          role="main"
        >
          {renderCurrentView()}
        </main>
      </div>

      {/* Receipt Modal (Thermal Preview, Print & Email) */}
      <SuccessReceiptModal />
    </div>
  );
};

export default function App() {
  return (
    <PosProvider>
      <PosMainApp />
    </PosProvider>
  );
}
