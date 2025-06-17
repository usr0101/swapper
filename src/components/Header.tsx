import React, { useState } from 'react';
import { Shield, Zap, Menu, X, Wallet } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface HeaderProps {
  currentView: 'swap' | 'admin';
  onViewChange: (view: 'swap' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  const { isConnected, address, isAdmin, balance, network, platformName, platformDescription, platformIcon } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <header className="border-b border-white/10 backdrop-blur-xl bg-white/5">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title - Left Aligned */}
          <div className="flex items-center space-x-8">
            <button
              onClick={() => onViewChange('swap')}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-xl">{platformIcon}</span>
              </div>
              <div className="text-left">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {platformName}
                </h1>
                {/* Always show platform description on all screen sizes */}
                <p className="text-xs text-gray-400">{platformDescription}</p>
              </div>
            </button>

            {/* Desktop Navigation - Next to Logo */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => onViewChange('swap')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === 'swap'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Swap NFTs
              </button>

              {isAdmin && (
                <button
                  onClick={() => onViewChange('admin')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                    currentView === 'admin'
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </button>
              )}
            </nav>
          </div>

          {/* Desktop Right Side - Wallet Info with Network Dot (only when connected) */}
          <div className="hidden md:flex items-center space-x-4">
            {isConnected && address ? (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {balance.toFixed(4)} SOL
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatAddress(address)}
                  </div>
                </div>
                {/* Network dot only shown when wallet is connected */}
                <div className={`w-2 h-2 rounded-full ${
                  network === 'devnet' ? 'bg-yellow-400' : 'bg-green-400'
                }`}></div>
                <div className="wallet-adapter-button-trigger">
                  <WalletMultiButton />
                </div>
              </div>
            ) : (
              <div className="wallet-adapter-button-trigger">
                <WalletMultiButton />
              </div>
            )}
          </div>

          {/* Mobile Right Side - Wallet and Menu */}
          <div className="md:hidden flex items-center space-x-3">
            {/* Mobile Wallet Info (only when connected) */}
            {isConnected && address ? (
              <div className="flex items-center space-x-2 bg-white/5 rounded-lg px-3 py-2">
                <div className="text-right">
                  <div className="text-xs font-medium text-white">
                    {balance.toFixed(2)} SOL
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatAddress(address)}
                  </div>
                </div>
                {/* Network dot only shown when wallet is connected */}
                <div className={`w-2 h-2 rounded-full ${
                  network === 'devnet' ? 'bg-yellow-400' : 'bg-green-400'
                }`}></div>
              </div>
            ) : (
              /* FIXED: Proper wallet button with smaller size for mobile */
              <div className="wallet-adapter-button-trigger">
                <WalletMultiButton style={{ 
                  fontSize: '14px', 
                  padding: '8px 16px',
                  minHeight: 'auto',
                  height: '36px'
                }} />
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-300 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4">
            <div className="space-y-4">
              {/* Mobile Navigation */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onViewChange('swap');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 text-left ${
                    currentView === 'swap'
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Swap NFTs
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      onViewChange('admin');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                      currentView === 'admin'
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </button>
                )}
              </div>

              {/* FIXED: Remove "Devnet" text from mobile menu - only show when connected */}
              {/* Mobile Network Indicator removed completely */}

              {/* Mobile Wallet Button (if not connected) */}
              {!isConnected && (
                <div className="px-3">
                  <div className="wallet-adapter-button-trigger">
                    <WalletMultiButton style={{ 
                      width: '100%',
                      fontSize: '14px',
                      padding: '12px 16px'
                    }} />
                  </div>
                </div>
              )}

              {/* Mobile Wallet Details (if connected) */}
              {isConnected && address && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white mb-1">
                        {balance.toFixed(4)} SOL
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatAddress(address)}
                      </div>
                    </div>
                    <div className="wallet-adapter-button-trigger">
                      <WalletMultiButton style={{ 
                        fontSize: '12px',
                        padding: '6px 12px',
                        minHeight: 'auto'
                      }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};