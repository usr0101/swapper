import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { getUserBalance } from '../lib/solana';
import { getAdminSettings, getApiConfig, migrateFromLocalStorage, cleanupLocalStorage, forceCleanup, getGlobalPlatformBranding } from '../lib/supabase';
import { validateEnvironment } from '../lib/anchor';

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
  const [network, setNetwork] = useState<'devnet' | 'mainnet-beta'>(() => {
    // Get network from environment variable
    const envNetwork = import.meta.env.VITE_SOLANA_NETWORK;
    return (envNetwork === 'mainnet-beta') ? 'mainnet-beta' : 'devnet';
  });
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [apiConfig, setApiConfig] = useState<any>(null);
  const [migrationCompleted, setMigrationCompleted] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Platform branding state
  const [platformName, setPlatformName] = useState(() => {
    return 'Swapper';
  });
  const [platformDescription, setPlatformDescription] = useState(() => {
    return 'Real NFT Exchange';
  });
  const [platformIcon, setPlatformIcon] = useState(() => {
    return '⚡';
  });
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  const [brandingLoading, setBrandingLoading] = useState(false);

  // Get admin address from environment variable
  const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_WALLET || 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M';
  const isAdmin = publicKey?.toString() === ADMIN_ADDRESS;

  // Validate environment on startup
  useEffect(() => {
    const isValid = validateEnvironment();
    if (!isValid) {
      console.warn('⚠️ Please check your environment configuration in .env file');
    }
  }, []);

  // Immediate cleanup on component mount
  useEffect(() => {
    cleanupLocalStorage();
  }, []);

  // Update HTML meta tags when branding changes
  useEffect(() => {
    if (brandingLoaded && typeof window !== 'undefined') {
      // Update meta tags using the global function
      if (window.updateMetaTags) {
        window.updateMetaTags(platformName, platformDescription, platformIcon);
      }
      
      // Dispatch custom event for any other listeners
      window.dispatchEvent(new CustomEvent('platformBrandingUpdated', {
        detail: { platformName, platformDescription, platformIcon }
      }));
    }
  }, [platformName, platformDescription, platformIcon, brandingLoaded]);

  // Load platform branding from database and update defaults
  useEffect(() => {
    const loadGlobalBranding = async () => {
      try {
        setBrandingLoading(true);
        
        // Try to load from localStorage as cache
        const cachedName = localStorage.getItem('platform_name');
        const cachedDescription = localStorage.getItem('platform_description');
        const cachedIcon = localStorage.getItem('platform_icon');
        
        if (cachedName && cachedDescription && cachedIcon) {
          setPlatformName(cachedName);
          setPlatformDescription(cachedDescription);
          setPlatformIcon(cachedIcon);
        }
        
        const branding = await getGlobalPlatformBranding();
        
        if (branding) {
          // Update current state with database values
          setPlatformName(branding.platform_name);
          setPlatformDescription(branding.platform_description);
          setPlatformIcon(branding.platform_icon);
          
          // Update localStorage cache for next app load
          localStorage.setItem('platform_name', branding.platform_name);
          localStorage.setItem('platform_description', branding.platform_description);
          localStorage.setItem('platform_icon', branding.platform_icon);
          
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
          // If no cached values and no database values, use hardcoded defaults
          if (!cachedName || !cachedDescription || !cachedIcon) {
            localStorage.setItem('platform_name', 'Swapper');
            localStorage.setItem('platform_description', 'Real NFT Exchange');
            localStorage.setItem('platform_icon', '⚡');
          }
        }
      } catch (error) {
        console.error('Error loading platform branding from database:', error);
        
        // On error, try to use cached values
        const cachedName = localStorage.getItem('platform_name');
        const cachedDescription = localStorage.getItem('platform_description');
        const cachedIcon = localStorage.getItem('platform_icon');
        
        if (cachedName && cachedDescription && cachedIcon) {
          setPlatformName(cachedName);
          setPlatformDescription(cachedDescription);
          setPlatformIcon(cachedIcon);
        }
      } finally {
        setBrandingLoaded(true);
        setBrandingLoading(false);
      }
    };

    loadGlobalBranding();
  }, []);

  // Auto-reconnect wallet on page reload
  useEffect(() => {
    const handleAutoConnect = async () => {
      if (!connected && publicKey) {
        try {
          await solanaConnect();
        } catch (error) {
          // Auto-connect failed
        }
      }
    };

    const timer = setTimeout(handleAutoConnect, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Load settings immediately when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      loadSettingsFromSupabase();
    }
  }, [connected, publicKey]);


  const loadSettingsFromSupabase = async () => {
    if (!publicKey) return;

    try {
      // Always clean localStorage first
      cleanupLocalStorage();

      // Try to migrate from localStorage if needed (but skip test data)
      if (!migrationCompleted) {
        try {
          await migrateFromLocalStorage(publicKey.toString());
          setMigrationCompleted(true);
        } catch (error) {
          setMigrationCompleted(true);
        }
      }

      // Load admin settings (but don't override global branding unless this user has different settings)
      const settings = await getAdminSettings(publicKey.toString());
      
      if (settings) {
        // Apply other settings
        setAdminSettings(settings);
        setPlatformActiveState(settings.platform_active);
        setMaintenanceMessage(settings.maintenance_message);
        setNetwork(settings.network);
      }

      // Load API config
      const config = await getApiConfig(publicKey.toString());
      if (config) {
        setApiConfig(config);
        setNetwork(config.network);
      }

      // Mark settings as loaded
      setSettingsLoaded(true);

      // Refresh balance
      refreshBalance();

    } catch (error) {
      console.error('Error loading settings from Supabase:', error);
      setSettingsLoaded(true);
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
    setNetwork(newNetwork);
    
    if (connected && publicKey) {
      setTimeout(() => refreshBalance(), 1000);
    }
  };

  const getHeliusApiKey = () => {
    // Get from environment variable first, then fallback to user config
    const envApiKey = import.meta.env.VITE_HELIUS_API_KEY;
    if (envApiKey && envApiKey !== 'your_helius_api_key_here') {
      return envApiKey;
    }
    
    return apiConfig?.helius_api_key || adminSettings?.helius_api_key || 'd260d547-850c-4cb6-8412-9c764f0c9df1';
  };

  const getHeliusRpcUrl = () => {
    const apiKey = getHeliusApiKey();
    const heliusNetwork = network === 'mainnet-beta' ? 'mainnet' : 'devnet';
    return `https://${heliusNetwork}.helius-rpc.com/?api-key=${apiKey}`;
  };

  // Force cleanup function for admin
  const handleForceCleanup = async () => {
    if (isAdmin) {
      await forceCleanup();
      
      // Reload the page to ensure clean state
      window.location.reload();
    }
  };

  // Update platform branding and persist immediately
  const updatePlatformBranding = (name: string, description: string, icon: string) => {
    // Update local state immediately
    setPlatformName(name);
    setPlatformDescription(description);
    setPlatformIcon(icon);
    
    // Update localStorage defaults immediately
    localStorage.setItem('platform_name', name);
    localStorage.setItem('platform_description', description);
    localStorage.setItem('platform_icon', icon);
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

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  // Get network from environment variable
  const [currentNetwork, setCurrentNetwork] = useState<'devnet' | 'mainnet-beta'>(() => {
    const envNetwork = import.meta.env.VITE_SOLANA_NETWORK;
    return (envNetwork === 'mainnet-beta') ? 'mainnet-beta' : 'devnet';
  });

  const network = currentNetwork === 'devnet' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;

  const endpoint = useMemo(() => {
    // Use environment-specific RPC endpoints
    const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
    
    if (currentNetwork === 'mainnet-beta') {
      // For mainnet, use Helius if available, otherwise fallback to public RPC
      if (heliusApiKey && heliusApiKey !== 'your_helius_api_key_here') {
        return `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
      }
      return clusterApiUrl('mainnet-beta');
    } else {
      // For devnet, use Helius if available, otherwise fallback to public RPC
      if (heliusApiKey && heliusApiKey !== 'your_helius_api_key_here') {
        return `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`;
      }
      return clusterApiUrl('devnet');
    }
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