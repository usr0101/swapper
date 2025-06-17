import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { getUserBalance } from '../lib/solana';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  isAdmin: boolean;
  balance: number;
  platformActive: boolean;
  maintenanceMessage: string;
  network: 'devnet' | 'mainnet-beta';
  connect: () => void;
  disconnect: () => void;
  setPlatformStatus: (active: boolean, message?: string) => void;
  refreshBalance: () => void;
  switchNetwork: (network: 'devnet' | 'mainnet-beta') => void;
  getHeliusRpcUrl: () => string;
  getHeliusApiKey: () => string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

// Inner component that uses Solana wallet hooks
const WalletContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { connected, publicKey, connect: solanaConnect, disconnect: solanaDisconnect } = useSolanaWallet();
  const [balance, setBalance] = useState(0);
  const [platformActive, setPlatformActiveState] = useState(true);
  const [maintenanceMessage, setMaintenanceMessage] = useState('Platform is currently under maintenance. Please check back later.');
  const [network, setNetwork] = useState<'devnet' | 'mainnet-beta'>('devnet');

  // Admin wallet address - this should be your actual wallet address
  const ADMIN_ADDRESS = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M';
  const isAdmin = publicKey?.toString() === ADMIN_ADDRESS;

  // Load network preference from localStorage
  useEffect(() => {
    const savedNetwork = localStorage.getItem('swapper_network') as 'devnet' | 'mainnet-beta';
    if (savedNetwork && (savedNetwork === 'devnet' || savedNetwork === 'mainnet-beta')) {
      setNetwork(savedNetwork);
    }
  }, []);

  // Fetch balance when wallet connects or network changes
  useEffect(() => {
    if (connected && publicKey) {
      refreshBalance();
    } else {
      setBalance(0);
    }
  }, [connected, publicKey, network]);

  const refreshBalance = async () => {
    if (publicKey) {
      try {
        const newBalance = await getUserBalance(publicKey);
        setBalance(newBalance);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance(0);
      }
    }
  };

  const connect = async () => {
    try {
      await solanaConnect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnect = async () => {
    try {
      await solanaDisconnect();
      setBalance(0);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const setPlatformStatus = (active: boolean, message?: string) => {
    setPlatformActiveState(active);
    if (message) {
      setMaintenanceMessage(message);
    }
  };

  const switchNetwork = (newNetwork: 'devnet' | 'mainnet-beta') => {
    console.log('Switching network from', network, 'to', newNetwork);
    setNetwork(newNetwork);
    
    // Save to localStorage
    localStorage.setItem('swapper_network', newNetwork);
    
    // Update API configuration with CORRECT mainnet endpoints
    updateApiEndpoints(newNetwork);
    
    // Refresh balance for new network
    if (connected && publicKey) {
      setTimeout(() => refreshBalance(), 1000);
    }
  };

  const updateApiEndpoints = (targetNetwork: 'devnet' | 'mainnet-beta') => {
    const apiKey = getHeliusApiKey();
    
    // Map mainnet-beta to mainnet for Helius API endpoints
    const heliusNetwork = targetNetwork === 'mainnet-beta' ? 'mainnet' : 'devnet';
    
    // CORRECT mainnet endpoints
    const newConfig = {
      heliusApiKey: apiKey,
      heliusRpc: `https://${heliusNetwork}.helius-rpc.com/?api-key=${apiKey}`,
      heliusParseTransactions: targetNetwork === 'devnet' 
        ? `https://api-devnet.helius-rpc.com/v0/transactions/?api-key=${apiKey}`
        : `https://api.helius.xyz/v0/transactions/?api-key=${apiKey}`, // CORRECT mainnet URL
      heliusTransactionHistory: targetNetwork === 'devnet'
        ? `https://api-devnet.helius-rpc.com/v0/addresses/{address}/transactions/?api-key=${apiKey}`
        : `https://api.helius.xyz/v0/addresses/{address}/transactions/?api-key=${apiKey}`, // CORRECT mainnet URL
    };
    
    // Update stored API configuration
    localStorage.setItem('swapper_api_config', JSON.stringify(newConfig));
    
    console.log('Updated API endpoints for', targetNetwork, newConfig);
  };

  const getHeliusApiKey = () => {
    try {
      const savedConfig = localStorage.getItem('swapper_api_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        return config.heliusApiKey || 'd260d547-850c-4cb6-8412-9c764f0c9df1';
      }
    } catch (error) {
      console.error('Error loading API config:', error);
    }
    return 'd260d547-850c-4cb6-8412-9c764f0c9df1';
  };

  const getHeliusRpcUrl = () => {
    const apiKey = getHeliusApiKey();
    // Map mainnet-beta to mainnet for Helius RPC URL
    const heliusNetwork = network === 'mainnet-beta' ? 'mainnet' : 'devnet';
    return `https://${heliusNetwork}.helius-rpc.com/?api-key=${apiKey}`;
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected: connected,
        address: publicKey?.toString() || null,
        isAdmin,
        balance,
        platformActive,
        maintenanceMessage,
        network,
        connect,
        disconnect,
        setPlatformStatus,
        refreshBalance,
        switchNetwork,
        getHeliusRpcUrl,
        getHeliusApiKey,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  // Get network from localStorage or default to devnet
  const [currentNetwork, setCurrentNetwork] = useState<'devnet' | 'mainnet-beta'>(() => {
    const saved = localStorage.getItem('swapper_network') as 'devnet' | 'mainnet-beta';
    return saved || 'devnet';
  });

  // Convert to WalletAdapterNetwork
  const network = currentNetwork === 'devnet' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;

  // Get Helius API key from localStorage or use default
  const getApiKey = () => {
    try {
      const savedConfig = localStorage.getItem('swapper_api_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        return config.heliusApiKey || 'd260d547-850c-4cb6-8412-9c764f0c9df1';
      }
    } catch (error) {
      console.error('Error loading API config:', error);
    }
    return 'd260d547-850c-4cb6-8412-9c764f0c9df1';
  };

  // Use Helius RPC endpoint based on current network
  const endpoint = useMemo(() => {
    const apiKey = getApiKey();
    // Map mainnet-beta to mainnet for Helius RPC URL
    const heliusNetwork = currentNetwork === 'mainnet-beta' ? 'mainnet' : 'devnet';
    const rpcUrl = `https://${heliusNetwork}.helius-rpc.com/?api-key=${apiKey}`;
    console.log('Using RPC endpoint:', rpcUrl);
    return rpcUrl;
  }, [currentNetwork]);

  // Listen for network changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'swapper_network' && e.newValue) {
        const newNetwork = e.newValue as 'devnet' | 'mainnet-beta';
        if (newNetwork !== currentNetwork) {
          setCurrentNetwork(newNetwork);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentNetwork]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextProvider>
            {children}
          </WalletContextProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};