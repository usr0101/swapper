import React, { useState, useEffect } from 'react';
import { Shield, Plus, Download, Settings, TrendingUp, Upload, X, Save, AlertTriangle, Edit, Trash2, Eye, Copy, CheckCircle, Key, FileDown, Globe, Link, RefreshCw, Search } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { poolManager, createNewPool, getAllPools, getPoolStats, PoolConfig, getPoolWalletData, exportPoolWallet, refreshAllPoolCounts } from '../lib/pool-manager';
import { CreatePoolModal } from './CreatePoolModal';
import { getCurrentNetworkInfo } from '../lib/helius-api';

export const AdminDashboard: React.FC = () => {
  const { isAdmin, platformActive, maintenanceMessage, setPlatformStatus, address, network, switchNetwork, getHeliusRpcUrl, getHeliusApiKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'pools' | 'settings' | 'debug'>('overview');
  const [showCreatePool, setShowCreatePool] = useState(false);
  const [pools, setPools] = useState<PoolConfig[]>([]);
  const [poolStats, setPoolStats] = useState({
    totalPools: 0,
    activePools: 0,
    totalNFTs: 0,
    totalVolume: 0,
  });
  
  // Platform Configuration State
  const [defaultSwapFee, setDefaultSwapFee] = useState('0.05');
  const [feeCollectorWallet, setFeeCollectorWallet] = useState('J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M');
  const [tempMaintenanceMessage, setTempMaintenanceMessage] = useState(maintenanceMessage);
  const [tempPlatformActive, setTempPlatformActive] = useState(platformActive);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [selectedPoolForWallet, setSelectedPoolForWallet] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [refreshingCounts, setRefreshingCounts] = useState(false);

  // Debug state
  const [debugPoolAddress, setDebugPoolAddress] = useState('GizdTFQoCbVXPB8eCm2Qy6zQB7ZfzDbcxRGWd8p7GCDo');
  const [debugResult, setDebugResult] = useState<any>(null);

  // API Configuration State
  const [apiConfig, setApiConfig] = useState({
    heliusApiKey: '',
    heliusRpc: '',
    heliusParseTransactions: '',
    heliusTransactionHistory: '',
  });

  // Load all settings on component mount
  useEffect(() => {
    loadPoolsData();
    loadApiConfig();
    loadPlatformSettings();
  }, []);

  // Update API config when network changes
  useEffect(() => {
    loadApiConfig();
  }, [network]);

  // Load platform settings from localStorage
  const loadPlatformSettings = () => {
    try {
      const savedSettings = localStorage.getItem('swapper_platform_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setDefaultSwapFee(settings.defaultSwapFee || '0.05');
        setFeeCollectorWallet(settings.feeCollectorWallet || 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M');
      }
    } catch (error) {
      console.error('Error loading platform settings:', error);
    }
  };

  // Save platform settings to localStorage
  const savePlatformSettings = () => {
    try {
      const settings = {
        defaultSwapFee,
        feeCollectorWallet,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem('swapper_platform_settings', JSON.stringify(settings));
      console.log('Platform settings saved:', settings);
      return true;
    } catch (error) {
      console.error('Error saving platform settings:', error);
      return false;
    }
  };

  const loadPoolsData = () => {
    const allPools = getAllPools();
    const stats = getPoolStats();
    setPools(allPools);
    setPoolStats(stats);
  };

  // NEW: Refresh all pool NFT counts
  const handleRefreshAllCounts = async () => {
    setRefreshingCounts(true);
    try {
      console.log('Refreshing all pool NFT counts...');
      await refreshAllPoolCounts();
      
      // Reload the pools data to show updated counts
      loadPoolsData();
      
      console.log('All pool counts refreshed successfully');
    } catch (error) {
      console.error('Error refreshing pool counts:', error);
    } finally {
      setRefreshingCounts(false);
    }
  };

  const loadApiConfig = () => {
    try {
      const apiKey = getHeliusApiKey();
      const rpcUrl = getHeliusRpcUrl();
      
      const config = {
        heliusApiKey: apiKey,
        heliusRpc: rpcUrl,
        heliusParseTransactions: network === 'devnet' 
          ? `https://api-devnet.helius-rpc.com/v0/transactions/?api-key=${apiKey}`
          : `https://api.helius.xyz/v0/transactions/?api-key=${apiKey}`,
        heliusTransactionHistory: network === 'devnet'
          ? `https://api-devnet.helius-rpc.com/v0/addresses/{address}/transactions/?api-key=${apiKey}`
          : `https://api.helius.xyz/v0/addresses/{address}/transactions/?api-key=${apiKey}`,
      };
      
      setApiConfig(config);
      console.log('Loaded API config for', network, ':', config);
    } catch (error) {
      console.error('Error loading API config:', error);
    }
  };

  const saveApiConfig = () => {
    try {
      localStorage.setItem('swapper_api_config', JSON.stringify(apiConfig));
      console.log('API configuration saved');
      return true;
    } catch (error) {
      console.error('Error saving API config:', error);
      return false;
    }
  };

  const handleCreatePool = async (poolData: any) => {
    if (!address) return;

    try {
      // Use the default swap fee if not specified
      const swapFee = poolData.swapFee ? parseFloat(poolData.swapFee) : parseFloat(defaultSwapFee);
      
      await createNewPool(
        poolData.collectionId,
        poolData.collectionName,
        poolData.collectionSymbol,
        poolData.collectionImage,
        poolData.collectionAddress,
        address,
        swapFee, // Use the configured default or specified fee
        poolData.description,
        poolData.poolAddress,
        poolData.poolWalletData
      );
      
      loadPoolsData(); // Refresh data
      setShowCreatePool(false);
    } catch (error) {
      console.error('Error creating pool:', error);
      alert('Failed to create pool: ' + error.message);
    }
  };

  const handleTogglePool = (collectionId: string) => {
    poolManager.togglePoolStatus(collectionId);
    loadPoolsData();
  };

  const handleDeletePool = (collectionId: string) => {
    if (confirm('Are you sure you want to delete this pool? This action cannot be undone.')) {
      poolManager.deletePool(collectionId);
      loadPoolsData();
    }
  };

  const handleExportWallet = (poolAddress: string) => {
    const walletData = exportPoolWallet(poolAddress);
    if (walletData) {
      // Create and download file
      const blob = new Blob([walletData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pool-wallet-${poolAddress.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert('No wallet data found for this pool');
    }
  };

  // Save settings function
  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    
    try {
      // Save platform status (active/maintenance)
      setPlatformStatus(tempPlatformActive, tempMaintenanceMessage);
      
      // Save platform settings (swap fee, collector wallet)
      const platformSaved = savePlatformSettings();
      
      // Save API configuration
      const apiSaved = saveApiConfig();
      
      if (platformSaved && apiSaved) {
        setSaveStatus('saved');
        console.log('All settings saved successfully:', { 
          defaultSwapFee, 
          feeCollectorWallet, 
          platformActive: tempPlatformActive, 
          maintenanceMessage: tempMaintenanceMessage,
          apiConfig,
          network 
        });
        
        // Show success for 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Failed to save some settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const getNetworkExplorerUrl = (address: string) => {
    const networkInfo = getCurrentNetworkInfo();
    return `${networkInfo.explorerUrl}/address/${address}`;
  };

  const getTransactionExplorerUrl = (signature: string) => {
    const networkInfo = getCurrentNetworkInfo();
    return `${networkInfo.explorerUrl}/tx/${signature}`;
  };

  const updateApiConfigField = (field: string, value: string) => {
    setApiConfig(prev => ({ ...prev, [field]: value }));
  };

  const resetApiConfigToDefaults = () => {
    const apiKey = 'd260d547-850c-4cb6-8412-9c764f0c9df1';
    
    const defaultConfig = {
      heliusApiKey: apiKey,
      heliusRpc: `https://${network}.helius-rpc.com/?api-key=${apiKey}`,
      heliusParseTransactions: network === 'devnet'
        ? `https://api-devnet.helius-rpc.com/v0/transactions/?api-key=${apiKey}`
        : `https://api.helius.xyz/v0/transactions/?api-key=${apiKey}`,
      heliusTransactionHistory: network === 'devnet'
        ? `https://api-devnet.helius-rpc.com/v0/addresses/{address}/transactions/?api-key=${apiKey}`
        : `https://api.helius.xyz/v0/addresses/{address}/transactions/?api-key=${apiKey}`,
    };
    setApiConfig(defaultConfig);
  };

  const handleNetworkSwitch = (newNetwork: 'devnet' | 'mainnet') => {
    console.log('Admin switching network to:', newNetwork);
    switchNetwork(newNetwork);
    
    // Show confirmation
    setTimeout(() => {
      alert(`Network switched to ${newNetwork}. API endpoints have been updated.`);
    }, 500);
  };

  const refreshApiConfig = () => {
    loadApiConfig();
    alert('API configuration refreshed from current network settings');
  };

  // NEW: Debug pool wallet access
  const debugPoolWalletAccess = () => {
    console.log('🔍 Debugging pool wallet access for:', debugPoolAddress);
    
    try {
      // Check if pool exists in our system
      const pool = pools.find(p => p.poolAddress === debugPoolAddress);
      console.log('Pool found in system:', !!pool);
      
      if (pool) {
        console.log('Pool details:', pool);
      }
      
      // Check stored wallet data
      const walletData = getPoolWalletData(debugPoolAddress);
      console.log('Stored wallet data:', walletData);
      
      // Check localStorage directly
      const directCheck = localStorage.getItem(`pool_wallet_${debugPoolAddress}`);
      console.log('Direct localStorage check:', directCheck);
      
      // Check all pool wallet keys in localStorage
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('pool_wallet_'));
      console.log('All pool wallet keys in localStorage:', allKeys);
      
      const result = {
        poolExists: !!pool,
        poolDetails: pool || null,
        hasWalletData: !!walletData,
        walletData: walletData,
        directStorageCheck: directCheck,
        allPoolWalletKeys: allKeys,
        timestamp: new Date().toISOString(),
      };
      
      setDebugResult(result);
      
    } catch (error) {
      console.error('Debug error:', error);
      setDebugResult({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // NEW: Fix pool wallet access
  const fixPoolWalletAccess = () => {
    const pool = pools.find(p => p.poolAddress === debugPoolAddress);
    if (!pool) {
      alert('Pool not found in system');
      return;
    }

    // Check if we have wallet data in the pool config
    if (pool.poolWalletData && pool.poolWalletData.secretKey) {
      console.log('Found wallet data in pool config, storing it properly...');
      
      // Store the wallet data with the correct key
      const walletData = {
        publicKey: pool.poolWalletData.publicKey,
        secretKey: pool.poolWalletData.secretKey,
        createdAt: new Date().toISOString(),
        fixedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(`pool_wallet_${debugPoolAddress}`, JSON.stringify(walletData));
      
      alert('Pool wallet access has been fixed! The private key is now properly stored.');
      
      // Re-run debug to verify
      debugPoolWalletAccess();
    } else {
      alert('No wallet data found in pool configuration. You may need to recreate the pool or import the wallet data.');
    }
  };

  // Validate fee collector wallet address
  const isValidSolanaAddress = (address: string): boolean => {
    try {
      // Basic validation - Solana addresses are typically 32-44 characters
      return address.length >= 32 && address.length <= 44 && /^[A-Za-z0-9]+$/.test(address);
    } catch {
      return false;
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-16">
        <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400 mb-4">You don't have admin privileges to access this dashboard.</p>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-blue-200 text-sm">
            <strong>Admin Wallet:</strong> J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M
          </p>
          <p className="text-blue-100/80 text-xs mt-2">
            Connect with this wallet address to access admin features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Shield className="h-8 w-8 text-orange-500" />
            <span>Admin Dashboard</span>
          </h1>
          <p className="text-gray-400 mt-1">Manage pools, monitor swaps, and configure platform settings</p>
          <div className="mt-2 flex items-center space-x-4">
            {/* Network Status */}
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-lg ${
              network === 'devnet' 
                ? 'bg-yellow-500/10 border border-yellow-500/20'
                : 'bg-green-500/10 border border-green-500/20'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                network === 'devnet' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <span className={`text-sm ${
                network === 'devnet' ? 'text-yellow-200' : 'text-green-200'
              }`}>
                Connected to Solana {network === 'devnet' ? 'Devnet' : 'Mainnet'}
              </span>
            </div>
            
            {/* Network Switch (Admin Only) */}
            <button
              onClick={() => handleNetworkSwitch(network === 'devnet' ? 'mainnet' : 'devnet')}
              className={`inline-flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                network === 'devnet'
                  ? 'bg-orange-500/10 border border-orange-500/20 text-orange-200 hover:bg-orange-500/20'
                  : 'bg-blue-500/10 border border-blue-500/20 text-blue-200 hover:bg-blue-500/20'
              }`}
            >
              <Globe className="h-3 w-3" />
              <span>Switch to {network === 'devnet' ? 'Mainnet' : 'Devnet'}</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowCreatePool(true)}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Pool</span>
          </button>
          <button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'pools', label: 'Pool Management', icon: Upload },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'debug', label: 'Debug Tools', icon: Search },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'debug' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Debug Tools</h2>
          
          {/* Pool Wallet Debug */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Pool Wallet Access Debug</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pool Address to Debug
                </label>
                <input
                  type="text"
                  value={debugPoolAddress}
                  onChange={(e) => setDebugPoolAddress(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter pool address"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={debugPoolWalletAccess}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                >
                  <Search className="h-4 w-4" />
                  <span>Debug Pool Access</span>
                </button>
                
                <button
                  onClick={fixPoolWalletAccess}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                >
                  <Key className="h-4 w-4" />
                  <span>Fix Pool Access</span>
                </button>
              </div>
              
              {debugResult && (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Debug Results:</h4>
                  <pre className="text-xs text-gray-300 overflow-auto max-h-96">
                    {JSON.stringify(debugResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm font-medium">Total Pools</p>
                  <p className="text-3xl font-bold text-white">{poolStats?.totalPools || 0}</p>
                </div>
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <Upload className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm font-medium">Active Pools</p>
                  <p className="text-3xl font-bold text-white">{poolStats?.activePools || 0}</p>
                </div>
                <div className="bg-green-500/20 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm font-medium">Total NFTs</p>
                  <p className="text-3xl font-bold text-white">{poolStats?.totalNFTs || 0}</p>
                </div>
                <div className="bg-purple-500/20 p-3 rounded-lg">
                  <Eye className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-200 text-sm font-medium">Total Volume</p>
                  <p className="text-3xl font-bold text-white">{(poolStats?.totalVolume || 0).toFixed(2)} SOL</p>
                </div>
                <div className="bg-yellow-500/20 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Pools */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Recent Pools</h2>
                <button
                  onClick={handleRefreshAllCounts}
                  disabled={refreshingCounts}
                  className="text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500 flex items-center space-x-1"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshingCounts ? 'animate-spin' : ''}`} />
                  <span>Refresh Counts</span>
                </button>
              </div>
            </div>
            {pools.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Collection</th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">NFTs</th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Volume</th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Status</th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pools.slice(0, 5).map((pool) => (
                      <tr key={pool.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <img src={pool.collectionImage} alt={pool.collectionName} className="w-8 h-8 rounded-lg object-cover" />
                            <span className="text-white font-medium">{pool.collectionName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-300">{pool.nftCount || 0}</td>
                        <td className="py-4 px-6">
                          <span className="text-green-400 font-medium">{(pool.totalVolume || 0).toFixed(2)} SOL</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            pool.isActive 
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {pool.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-400">
                          {new Date(pool.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Pools Created</h3>
                <p className="text-gray-400 mb-4">Create your first pool to start managing NFT swaps</p>
                <button 
                  onClick={() => setShowCreatePool(true)}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                >
                  Create First Pool
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'pools' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Pool Management</h2>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleRefreshAllCounts}
                disabled={refreshingCounts}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-500 disabled:to-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshingCounts ? 'animate-spin' : ''}`} />
                <span>{refreshingCounts ? 'Refreshing...' : 'Refresh All Counts'}</span>
              </button>
              <button 
                onClick={() => setShowCreatePool(true)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Pool</span>
              </button>
            </div>
          </div>

          {pools.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {pools.map(pool => {
                const walletData = getPoolWalletData(pool.poolAddress);
                const hasWalletAccess = walletData && walletData.secretKey;
                
                return (
                  <div key={pool.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-200">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={pool.collectionImage}
                        alt={pool.collectionName}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      
                      {/* Status Badge */}
                      <div className={`absolute top-4 right-4 px-3 py-1 rounded-lg text-sm font-medium flex items-center space-x-1 ${
                        pool.isActive 
                          ? 'bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-green-200'
                          : 'bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-200'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${pool.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span>{pool.isActive ? 'Active' : 'Inactive'}</span>
                      </div>

                      {/* Wallet Access Indicator */}
                      {hasWalletAccess ? (
                        <div className="absolute top-4 left-4 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 text-blue-200 px-2 py-1 rounded-lg text-xs font-medium flex items-center space-x-1">
                          <Key className="h-3 w-3" />
                          <span>Swap Ready</span>
                        </div>
                      ) : (
                        <div className="absolute top-4 left-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-200 px-2 py-1 rounded-lg text-xs font-medium flex items-center space-x-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>No Swap Access</span>
                        </div>
                      )}
                      
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-xl font-bold text-white mb-1">{pool.collectionName}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-300">
                          <span>Fee: {pool.swapFee || 0} SOL</span>
                          <span>NFTs: {pool.nftCount || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{pool.description}</p>
                      
                      {/* Pool Address */}
                      <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Pool Address</p>
                            <p className="text-sm text-white font-mono">
                              {pool.poolAddress.slice(0, 8)}...{pool.poolAddress.slice(-8)}
                            </p>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleCopyAddress(pool.poolAddress)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              {copiedAddress === pool.poolAddress ? (
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              ) : (
                                <Copy className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                            {hasWalletAccess && (
                              <button
                                onClick={() => handleExportWallet(pool.poolAddress)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                title="Export wallet data"
                              >
                                <FileDown className="h-4 w-4 text-blue-400" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {hasWalletAccess ? (
                              <span className="text-green-400 text-xs flex items-center space-x-1">
                                <Key className="h-3 w-3" />
                                <span>Swap Ready</span>
                              </span>
                            ) : (
                              <span className="text-red-400 text-xs flex items-center space-x-1">
                                <AlertTriangle className="h-3 w-3" />
                                <span>No Swap Access</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleTogglePool(pool.collectionId)}
                          className={`flex-1 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                            pool.isActive 
                              ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-200'
                              : 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-200'
                          }`}
                        >
                          {pool.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleDeletePool(pool.collectionId)}
                          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-200 py-2 px-3 rounded-lg font-medium transition-all duration-200 text-sm"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-4">No Pools Created</h3>
              <p className="text-gray-400 mb-6">Create your first pool to start managing NFT collections</p>
              <button 
                onClick={() => setShowCreatePool(true)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
              >
                Create First Pool
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
          
          <div className="grid gap-6">
            {/* Platform Configuration */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Platform Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Swap Fee (SOL) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="10"
                    value={defaultSwapFee}
                    onChange={(e) => setDefaultSwapFee(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0.05"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Default fee used when creating new pools (can be overridden per pool)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fee Collector Wallet Address *
                  </label>
                  <input
                    type="text"
                    value={feeCollectorWallet}
                    onChange={(e) => setFeeCollectorWallet(e.target.value)}
                    className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      isValidSolanaAddress(feeCollectorWallet) ? 'border-white/20' : 'border-red-500/50'
                    }`}
                    placeholder="Enter Solana wallet address"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-gray-500 text-xs">
                      Wallet address that receives swap fees from all pools
                    </p>
                    {feeCollectorWallet && (
                      <span className={`text-xs ${
                        isValidSolanaAddress(feeCollectorWallet) ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isValidSolanaAddress(feeCollectorWallet) ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Current Settings Display */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-200 text-sm">
                    <strong>Current Settings:</strong> Default fee: {defaultSwapFee} SOL | 
                    Collector: {feeCollectorWallet.slice(0, 8)}...{feeCollectorWallet.slice(-8)}
                  </p>
                </div>
              </div>
            </div>

            {/* Platform Status */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Platform Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-300 font-medium">Platform Active</span>
                    <p className="text-gray-400 text-sm">Enable or disable the entire platform</p>
                  </div>
                  <button
                    onClick={() => setTempPlatformActive(!tempPlatformActive)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      tempPlatformActive ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute w-4 h-4 bg-white rounded-full shadow-md transform transition-transform top-1 ${
                      tempPlatformActive ? 'translate-x-7' : 'translate-x-1'
                    }`}></div>
                  </button>
                </div>
                
                {!tempPlatformActive && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Maintenance Message
                    </label>
                    <textarea
                      value={tempMaintenanceMessage}
                      onChange={(e) => setTempMaintenanceMessage(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      placeholder="Enter maintenance message for users..."
                    />
                  </div>
                )}

                {/* Status Display */}
                <div className={`p-3 rounded-lg border ${
                  tempPlatformActive 
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <p className={`text-sm ${
                    tempPlatformActive ? 'text-green-200' : 'text-red-200'
                  }`}>
                    <strong>Status:</strong> Platform is currently {tempPlatformActive ? 'ACTIVE' : 'IN MAINTENANCE'}
                  </p>
                  {!tempPlatformActive && tempMaintenanceMessage && (
                    <p className="text-red-100/80 text-xs mt-1">
                      Message: "{tempMaintenanceMessage}"
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Network Configuration */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                  <span>Network Configuration</span>
                </h3>
                <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  network === 'devnet' 
                    ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-200'
                    : 'bg-green-500/10 border border-green-500/20 text-green-200'
                }`}>
                  Current: {network === 'devnet' ? 'Devnet' : 'Mainnet'}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-300 font-medium">Switch Network</span>
                    <p className="text-gray-400 text-sm">Toggle between Solana devnet and mainnet</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-medium ${
                      network === 'devnet' ? 'text-yellow-200' : 'text-green-200'
                    }`}>
                      {network === 'devnet' ? 'Devnet' : 'Mainnet'}
                    </span>
                    <button
                      onClick={() => handleNetworkSwitch(network === 'devnet' ? 'mainnet' : 'devnet')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        network === 'mainnet' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                    >
                      <div className={`absolute w-4 h-4 bg-white rounded-full shadow-md transform transition-transform top-1 ${
                        network === 'mainnet' ? 'translate-x-7' : 'translate-x-1'
                      }`}></div>
                    </button>
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg border ${
                  network === 'devnet' 
                    ? 'bg-yellow-500/10 border-yellow-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <p className={`text-sm ${
                    network === 'devnet' ? 'text-yellow-200' : 'text-red-200'
                  }`}>
                    {network === 'devnet' 
                      ? '⚠️ Currently on Devnet - Use for testing only'
                      : '🚨 Currently on Mainnet - Real transactions with real SOL'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* API Configuration */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <Link className="h-5 w-5 text-blue-400" />
                  <span>Helius API Configuration ({network})</span>
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={refreshApiConfig}
                    className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-200 px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={resetApiConfigToDefaults}
                    className="bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/20 text-gray-200 px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Helius API Key
                  </label>
                  <input
                    type="text"
                    value={apiConfig.heliusApiKey}
                    onChange={(e) => updateApiConfigField('heliusApiKey', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Helius API key"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Helius RPC Endpoint ({network})
                  </label>
                  <input
                    type="text"
                    value={apiConfig.heliusRpc}
                    onChange={(e) => updateApiConfigField('heliusRpc', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Helius RPC URL"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Parse Transactions URL ({network})
                  </label>
                  <input
                    type="text"
                    value={apiConfig.heliusParseTransactions}
                    onChange={(e) => updateApiConfigField('heliusParseTransactions', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={network === 'devnet' 
                      ? 'https://api-devnet.helius-rpc.com/v0/transactions/?api-key=YOUR_KEY'
                      : 'https://api.helius.xyz/v0/transactions/?api-key=YOUR_KEY'
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Transaction History URL ({network})
                  </label>
                  <input
                    type="text"
                    value={apiConfig.heliusTransactionHistory}
                    onChange={(e) => updateApiConfigField('heliusTransactionHistory', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={network === 'devnet'
                      ? 'https://api-devnet.helius-rpc.com/v0/addresses/{address}/transactions/?api-key=YOUR_KEY'
                      : 'https://api.helius.xyz/v0/addresses/{address}/transactions/?api-key=YOUR_KEY'
                    }
                  />
                  <p className="text-gray-500 text-xs mt-1">Use {'{address}'} as placeholder for wallet address</p>
                </div>

                {/* API Status */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-200 text-sm">
                    <strong>Status:</strong> Helius API configured for {network} network
                  </p>
                </div>
              </div>
            </div>

            {/* Network Information */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-200 mb-4">Current Network Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Network</span>
                  <span className="text-white">Solana {network === 'devnet' ? 'Devnet' : 'Mainnet'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Primary RPC</span>
                  <span className="text-white">Helius API</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Explorer</span>
                  <a 
                    href={getCurrentNetworkInfo().explorerUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Solana Explorer ({network === 'devnet' ? 'Devnet' : 'Mainnet'})
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">API Status</span>
                  <span className="text-green-400">Connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Default Swap Fee</span>
                  <span className="text-white">{defaultSwapFee} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fee Collector</span>
                  <span className="text-white text-xs font-mono">{feeCollectorWallet.slice(0, 8)}...{feeCollectorWallet.slice(-8)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button 
            onClick={handleSaveSettings}
            disabled={saveStatus === 'saving'}
            className={`w-full py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
              saveStatus === 'saving'
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : saveStatus === 'saved'
                ? 'bg-green-500 text-white'
                : saveStatus === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span>Saving Settings...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Settings Saved Successfully!</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>Error Saving Settings</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Create Pool Modal */}
      {showCreatePool && (
        <CreatePoolModal
          onClose={() => setShowCreatePool(false)}
          onSubmit={handleCreatePool}
          defaultSwapFee={defaultSwapFee}
        />
      )}
    </div>
  );
};