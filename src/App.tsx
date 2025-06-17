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

  // Show loading screen until branding is loaded from database
  if (!brandingLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading platform...</p>
        </div>
      </div>
    );
  }

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