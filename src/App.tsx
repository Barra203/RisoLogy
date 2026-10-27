import React, { useEffect } from 'react';
import { PosProvider, usePos } from './context/PosContext';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { PosView } from './components/PosView';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { CustomersView } from './components/CustomersView';
import { ExpensesView } from './components/ExpensesView';
import { ExportView } from './components/ExportView';
import { SettingsView } from './components/SettingsView';
import { SuccessReceiptModal } from './components/SuccessReceiptModal';

const PosMainApp: React.FC = () => {
  const { isAuthenticated, activeTab, login, isLoading, dbError, clearDbError, settings } = usePos();

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

  // If not authenticated, show Login Screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#F5F5F5] text-black">
      {/* Persistent Navigation (Left Sidebar on md+ desktop/tablet, Top header + Bottom Navigation Bar on < md mobile) */}
      <Sidebar />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative pb-20 md:pb-0" role="main">
        {/* Database Loading Banner */}
        {isLoading && (
          <div className="bg-[#FFD100] text-black px-4 py-1.5 text-xs font-bold uppercase tracking-wider border-b-2 border-black flex items-center justify-between">
            <span>Memuat & menyinkronkan data dari Cloud Firestore...</span>
            <span className="animate-pulse">● LIVE SYNC</span>
          </div>
        )}

        {/* Database Error Banner */}
        {dbError && (
          <div className="bg-[#E02424] text-white px-4 py-2 text-xs font-bold border-b-2 border-black flex items-center justify-between">
            <span>{dbError}</span>
            <button
              onClick={clearDbError}
              className="ml-4 px-2 py-0.5 bg-black text-white text-[10px] uppercase font-bold"
            >
              Tutup
            </button>
          </div>
        )}

        {activeTab === 'pos' && <PosView />}
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'customers' && <CustomersView />}
        {activeTab === 'expenses' && <ExpensesView />}
        {activeTab === 'export' && <ExportView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

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
