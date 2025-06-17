import React, { useState } from 'react';
import { Header } from './components/Header';
import { SwapInterface } from './components/SwapInterface';
import { AdminDashboard } from './components/AdminDashboard';
import { WalletProvider, useWallet } from './contexts/WalletContext';

type View = 'swap' | 'admin';

function AppContent() {
  const { brandingLoaded } = useWallet();
  const [currentView, setCurrentView] = useState<View>('swap');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'swap':
        return <SwapInterface />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <SwapInterface />;
    }
  };

  // No loading screen needed - we always have defaults available

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        
        <div className="relative z-10">
          <Header currentView={currentView} onViewChange={setCurrentView} />
          
          <main className="container mx-auto px-4 py-8">
            {renderCurrentView()}
          </main>
        </div>
      </div>
  );
}

const App = () => (
  <WalletProvider>
    <AppContent />
  </WalletProvider>
);

export default App;