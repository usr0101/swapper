import React from 'react';
import { Shield, Zap } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface HeaderProps {
  currentView: 'swap' | 'admin';
  onViewChange: (view: 'swap' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  const { isConnected, address, isAdmin, balance, network } = useWallet();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <header className="border-b border-white/10 backdrop-blur-xl bg-white/5">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => onViewChange('swap')}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Swapper
                </h1>
                <p className="text-xs text-gray-400">Real NFT Exchange</p>
              </div>
            </button>

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

          <div className="flex items-center space-x-4">
            {/* Network Indicator (Read-only for non-admin) */}
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium ${
              network === 'devnet'
                ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-200'
                : 'bg-green-500/10 border border-green-500/20 text-green-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                network === 'devnet' ? 'bg-yellow-400' : 'bg-green-400'
              }`}></div>
              <span>{network === 'devnet' ? 'Devnet' : 'Mainnet Beta'}</span>
            </div>

            {isConnected && address && (
              <div className="text-right">
                <div className="text-sm font-medium text-white">
                  {balance.toFixed(4)} SOL
                </div>
                <div className="text-xs text-gray-400">
                  {formatAddress(address)}
                </div>
              </div>
            )}
            
            <div className="wallet-adapter-button-trigger">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};