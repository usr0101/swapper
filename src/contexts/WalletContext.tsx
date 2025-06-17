import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { getUserBalance } from '../lib/solana';
import { getAdminSettings, getApiConfig, migrateFromLocalStorage, cleanupLocalStorage, forceCleanup, getGlobalPlatformBranding } from '../lib/supabase';

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
  brandingLoaded: boolean;
  brandingLoading: boolean;
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
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Platform branding state
  const [platformName, setPlatformName] = useState(() => {
    // Start with hardcoded default, will be updated from database
    return 'Swapper';
  });
  const [platformDescription, setPlatformDescription] = useState(() => {
    return 'Real NFT Exchange';
  });
  const [platformIcon, setPlatformIcon] = useState(() => {
    return '⚡';
  });
  const [brandingLoaded, setBrandingLoaded] = useState(false); // Start as not loaded
  const [brandingLoading, setBrandingLoading] = useState(false); // No loading needed initially

  const ADMIN_ADDRESS = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M';
  const isAdmin = publicKey?.toString() === ADMIN_ADDRESS;

  // ENHANCED: Immediate cleanup on component mount
  useEffect(() => {
    // Always clean localStorage on app start
    cleanupLocalStorage();
  }, []);

  // Load platform branding from database and update defaults
  useEffect(() => {
    const loadGlobalBranding = async () => {
      try {
        setBrandingLoading(true);
        console.log('🌍 Loading platform branding from database...');
        
        // FIRST: Try to load from localStorage as cache
        const cachedName = localStorage.getItem('platform_name');
        const cachedDescription = localStorage.getItem('platform_description');
        const cachedIcon = localStorage.getItem('platform_icon');
        
        if (cachedName && cachedDescription && cachedIcon) {
          console.log('📦 Using cached branding while loading from database...');
          setPlatformName(cachedName);
          setPlatformDescription(cachedDescription);
          setPlatformIcon(cachedIcon);
        }
        
        const branding = await getGlobalPlatformBranding();
        
        if (branding) {
          console.log('✅ Platform branding loaded from database:', branding);
          
          // Update current state with database values
          setPlatformName(branding.platform_name);
          setPlatformDescription(branding.platform_description);
          setPlatformIcon(branding.platform_icon);
          
          // Update localStorage cache for next app load
          localStorage.setItem('platform_name', branding.platform_name);
          localStorage.setItem('platform_description', branding.platform_description);
          localStorage.setItem('platform_icon', branding.platform_icon);
          console.log('💾 Updated localStorage cache for next app load');
          
          // Also update other platform settings if available
          if (branding.platform_active !== undefined) {
            setPlatformActiveState(branding.platform_active);
          }
          if (branding.maintenance_message) {
            setMaintenanceMessage(branding.maintenance_message);
          }
          if (branding.network) {
            setNetwork(branding.network);
          }
        } else {
          console.log('⚠️ No platform branding found in database');
          
          // If no cached values and no database values, use hardcoded defaults
          if (!cachedName || !cachedDescription || !cachedIcon) {
            console.log('Using hardcoded defaults');
            localStorage.setItem('platform_name', 'Swapper');
            localStorage.setItem('platform_description', 'Real NFT Exchange');
            localStorage.setItem('platform_icon', '⚡');
          }
        }
      } catch (error) {
        console.error('❌ Error loading platform branding from database:', error);
        
        // On error, try to use cached values
        const cachedName = localStorage.getItem('platform_name');
        const cachedDescription = localStorage.getItem('platform_description');
        const cachedIcon = localStorage.getItem('platform_icon');
        
        if (cachedName && cachedDescription && cachedIcon) {
          console.log('Using cached values due to database error');
          setPlatformName(cachedName);
          setPlatformDescription(cachedDescription);
          setPlatformIcon(cachedIcon);
        } else {
          console.log('Using hardcoded defaults due to database error and no cache');
        }
      } finally {
        setBrandingLoaded(true);
        setBrandingLoading(false);
      }
    };

    loadGlobalBranding();
  }, []); // Only run once on app start

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

  // CRITICAL FIX: Load settings immediately when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      console.log('🔄 Wallet connected, loading user-specific settings...');
      loadSettingsFromSupabase();
    }
  }, [connected, publicKey]);


  const loadSettingsFromSupabase = async () => {
    if (!publicKey) return;

    try {
      console.log('🔄 Loading user-specific settings from Supabase for wallet:', publicKey.toString());
      console.log('🔄 Is admin:', isAdmin);

      // ENHANCED: Always clean localStorage first
      cleanupLocalStorage();

      // Try to migrate from localStorage if needed (but skip test data)
      if (!migrationCompleted) {
        try {
          await migrateFromLocalStorage(publicKey.toString());
          setMigrationCompleted(true);
          console.log('✅ Migration completed');
        } catch (error) {
          console.log('Migration not needed or already completed:', error);
          setMigrationCompleted(true);
        }
      }

      // Load admin settings (but don't override global branding unless this user has different settings)
      console.log('📋 Loading user admin settings from Supabase...');
      const settings = await getAdminSettings(publicKey.toString());
      
      if (settings) {
        console.log('✅ User admin settings found in Supabase');

        // Apply other settings
        setAdminSettings(settings);
        setPlatformActiveState(settings.platform_active);
        setMaintenanceMessage(settings.maintenance_message);
        setNetwork(settings.network);
        
        console.log('✅ User admin settings loaded from Supabase');
      } else {
        console.log('⚠️ No user admin settings found in Supabase');
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

      // Mark settings as loaded
      setSettingsLoaded(true);

      // Refresh balance
      refreshBalance();

    } catch (error) {
      console.error('❌ Error loading settings from Supabase:', error);
      setSettingsLoaded(true); // Mark as loaded even if failed to prevent infinite loops
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
      setSettingsLoaded(false);
      
      // DON'T reset platform branding - it should stay from database
      
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

  // CRITICAL FIX: Update platform branding and persist immediately
  const updatePlatformBranding = (name: string, description: string, icon: string) => {
    console.log('🎨 Updating platform branding:', { name, description, icon });
    
    // Update local state immediately
    setPlatformName(name);
    setPlatformDescription(description);
    setPlatformIcon(icon);
    
    // CRITICAL: Update localStorage defaults immediately
    localStorage.setItem('platform_name', name);
    localStorage.setItem('platform_description', description);
    localStorage.setItem('platform_icon', icon);
    console.log('💾 Updated localStorage defaults immediately');
    
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
        brandingLoaded,
        brandingLoading,
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

// Add loading states to context type
interface WalletContextType {
  // ... existing properties
  brandingLoaded: boolean;
  brandingLoading: boolean;
  // ... rest of properties
}

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