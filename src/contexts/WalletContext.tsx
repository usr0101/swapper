import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { getUserBalance } from '../lib/solana';
import { getAdminSettings, getApiConfig, migrateFromLocalStorage, cleanupLocalStorage, forceCleanup } from '../lib/supabase';

import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  isAdmin: boolean;
  balance: number;
  platformActive: boolean;
  maintenanceMessage: string;
  network: 'devnet' | 'mainnet-beta';
  platformName: string;
  platformDescription: string;
  platformIcon: string;
  connect: () => void;
  disconnect: () => void;
  setPlatformStatus: (active: boolean, message?: string) => void;
  refreshBalance: () => void;
  switchNetwork: (network: 'devnet' | 'mainnet-beta') => void;
  getHeliusRpcUrl: () => string;
  getHeliusApiKey: () => string;
  forceCleanup: () => Promise<void>;
  updatePlatformBranding: (name: string, description: string, icon: string) => void;
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

const WalletContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { connected, publicKey, connect: solanaConnect, disconnect: solanaDisconnect } = useSolanaWallet();
  const [balance, setBalance] = useState(0);
  const [platformActive, setPlatformActiveState] = useState(true);
  const [maintenanceMessage, setMaintenanceMessage] = useState('Platform is currently under maintenance. Please check back later.');
  const [network, setNetwork] = useState<'devnet' | 'mainnet-beta'>('devnet');
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [apiConfig, setApiConfig] = useState<any>(null);
  const [migrationCompleted, setMigrationCompleted] = useState(false);
  
  // Platform branding state
  const [platformName, setPlatformName] = useState('Swapper');
  const [platformDescription, setPlatformDescription] = useState('Real NFT Exchange');
  const [platformIcon, setPlatformIcon] = useState('⚡');

  const ADMIN_ADDRESS = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M';
  const isAdmin = publicKey?.toString() === ADMIN_ADDRESS;

  // ENHANCED: Immediate cleanup on component mount
  useEffect(() => {
    // Always clean localStorage on app start
    cleanupLocalStorage();
  }, []);

  // Auto-reconnect wallet on page reload
  useEffect(() => {
    const handleAutoConnect = async () => {
      if (!connected && publicKey) {
        try {
          await solanaConnect();
        } catch (error) {
          console.log('Auto-connect failed:', error);
        }
      }
    };

    // Small delay to allow wallet adapter to initialize
    const timer = setTimeout(handleAutoConnect, 1000);
    return () => clearTimeout(timer);
  }, []);

  // CRITICAL FIX: Load settings from Supabase when wallet connects OR when admin status changes
  useEffect(() => {
    if (connected && publicKey && !migrationCompleted) {
      loadSettingsFromSupabase();
    }
  }, [connected, publicKey, migrationCompleted]);

  // CRITICAL FIX: Also load settings when admin status changes (for non-admin users who might have settings)
  useEffect(() => {
    if (connected && publicKey && migrationCompleted && isAdmin) {
      console.log('🔄 Admin status detected, reloading settings...');
      loadSettingsFromSupabase();
    }
  }, [isAdmin, connected, publicKey, migrationCompleted]);

  const loadSettingsFromSupabase = async () => {
    if (!publicKey) return;

    try {
      console.log('🔄 Loading settings from Supabase for wallet:', publicKey.toString());

      // ENHANCED: Always clean localStorage first
      cleanupLocalStorage();

      // Try to migrate from localStorage if needed (but skip test data)
      try {
        await migrateFromLocalStorage(publicKey.toString());
        setMigrationCompleted(true);
        console.log('✅ Migration completed');
      } catch (error) {
        console.log('Migration not needed or already completed:', error);
        setMigrationCompleted(true);
      }

      // CRITICAL FIX: Load admin settings and apply platform branding immediately
      console.log('📋 Loading admin settings from Supabase...');
      const settings = await getAdminSettings(publicKey.toString());
      if (settings) {
        console.log('✅ Admin settings found:', {
          platform_name: settings.platform_name,
          platform_description: settings.platform_description,
          platform_icon: settings.platform_icon,
          platform_active: settings.platform_active,
          network: settings.network,
        });

        setAdminSettings(settings);
        setPlatformActiveState(settings.platform_active);
        setMaintenanceMessage(settings.maintenance_message);
        setNetwork(settings.network);
        
        // CRITICAL FIX: Apply platform branding immediately
        if (settings.platform_name) {
          console.log('🎨 Applying platform name:', settings.platform_name);
          setPlatformName(settings.platform_name);
        }
        if (settings.platform_description) {
          console.log('🎨 Applying platform description:', settings.platform_description);
          setPlatformDescription(settings.platform_description);
        }
        if (settings.platform_icon) {
          console.log('🎨 Applying platform icon:', settings.platform_icon);
          setPlatformIcon(settings.platform_icon);
        }
        
        console.log('✅ Admin settings loaded and applied from Supabase');
      } else {
        console.log('⚠️ No admin settings found in Supabase');
      }

      // Load API config
      console.log('🔧 Loading API config from Supabase...');
      const config = await getApiConfig(publicKey.toString());
      if (config) {
        setApiConfig(config);
        setNetwork(config.network);
        console.log('✅ API config loaded from Supabase');
      } else {
        console.log('⚠️ No API config found in Supabase');
      }

      // Refresh balance
      refreshBalance();

    } catch (error) {
      console.error('❌ Error loading settings from Supabase:', error);
    }
  };

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
      setAdminSettings(null);
      setApiConfig(null);
      setMigrationCompleted(false);
      
      // Reset platform branding to defaults
      setPlatformName('Swapper');
      setPlatformDescription('Real NFT Exchange');
      setPlatformIcon('⚡');
      
      // Clean up on disconnect
      cleanupLocalStorage();
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
    
    if (connected && publicKey) {
      setTimeout(() => refreshBalance(), 1000);
    }
  };

  const getHeliusApiKey = () => {
    return apiConfig?.helius_api_key || adminSettings?.helius_api_key || 'd260d547-850c-4cb6-8412-9c764f0c9df1';
  };

  const getHeliusRpcUrl = () => {
    const apiKey = getHeliusApiKey();
    const heliusNetwork = network === 'mainnet-beta' ? 'mainnet' : 'devnet';
    return `https://${heliusNetwork}.helius-rpc.com/?api-key=${apiKey}`;
  };

  // ENHANCED: Force cleanup function for admin
  const handleForceCleanup = async () => {
    if (isAdmin) {
      console.log('🧹 Admin force cleanup initiated...');
      await forceCleanup();
      
      // Reload the page to ensure clean state
      window.location.reload();
    }
  };

  // CRITICAL FIX: Update platform branding and persist to Supabase
  const updatePlatformBranding = async (name: string, description: string, icon: string) => {
    console.log('🎨 Updating platform branding:', { name, description, icon });
    
    // Update local state immediately
    setPlatformName(name);
    setPlatformDescription(description);
    setPlatformIcon(icon);
    
    // CRITICAL FIX: Also update the adminSettings state so it persists
    setAdminSettings((prev: any) => prev ? {
      ...prev,
      platform_name: name,
      platform_description: description,
      platform_icon: icon,
    } : null);
    
    console.log('✅ Platform branding updated in context');
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
        platformName,
        platformDescription,
        platformIcon,
        connect,
        disconnect,
        setPlatformStatus,
        refreshBalance,
        switchNetwork,
        getHeliusRpcUrl,
        getHeliusApiKey,
        forceCleanup: handleForceCleanup,
        updatePlatformBranding,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [currentNetwork, setCurrentNetwork] = useState<'devnet' | 'mainnet-beta'>('devnet');

  const network = currentNetwork === 'devnet' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;

  const endpoint = useMemo(() => {
    const heliusNetwork = currentNetwork === 'mainnet-beta' ? 'mainnet' : 'devnet';
    const rpcUrl = `https://${heliusNetwork}.helius-rpc.com/?api-key=d260d547-850c-4cb6-8412-9c764f0c9df1`;
    console.log('Using RPC endpoint:', rpcUrl);
    return rpcUrl;
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