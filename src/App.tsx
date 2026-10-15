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
  const { isAuthenticated, activeTab, login } = usePos();

  // Support ?autostart=1 for headless testing & preview
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' && !isAuthenticated) {
        login('Harits', 'RisoLogyKeren');
      }
    }
  }, [isAuthenticated, login]);

  // If not authenticated, show Login Screen (Cashier user + Password RisoLogyKeren)
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-[#F5F5F5] text-black">
      {/* Persistent Sidebar (Left on desktop, Top bar on mobile/tablet) */}
      <Sidebar />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden" role="main">
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
