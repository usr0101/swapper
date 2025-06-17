import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  BarChart3, 
  Users, 
  Coins, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  RefreshCw,
  Code,
  Upload,
  Key,
  Database,
  Network,
  DollarSign,
  Trash,
  Type,
  Image,
  Zap,
  Copy,
  Menu,
  X,
  Loader2
} from 'lucide-react';
import { CreatePoolModal } from './CreatePoolModal';
import { EditPoolModal } from './EditPoolModal';
import { ProgramDeployModal } from './ProgramDeployModal';
import { useWallet } from '../contexts/WalletContext';
import { 
  getAllPools, 
  saveAdminSettings, 
  getAdminSettings, 
  saveApiConfig, 
  getApiConfig, 
  togglePoolStatus, 
  deletePool,
  cleanupLocalStorage,
  forceCleanup,
  PoolConfig 
} from '../lib/supabase';
import { updateProgramId, getCurrentProgramId } from '../lib/anchor';

export const AdminDashboard: React.FC = () => {
  const { address, isAdmin, network, switchNetwork, forceCleanup: contextForceCleanup, platformName, platformDescription, platformIcon, updatePlatformBranding } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'pools' | 'settings' | 'deploy'>('overview');
  const [showCreatePool, setShowCreatePool] = useState(false);
  const [showEditPool, setShowEditPool] = useState(false);
  const [showProgramDeploy, setShowProgramDeploy] = useState(false);
  const [editingPool, setEditingPool] = useState<PoolConfig | null>(null);
  const [pools, setPools] = useState<PoolConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Admin settings state - CRITICAL FIX: Initialize with current context values
  const [adminSettings, setAdminSettings] = useState({
    feeCollectorWallet: address || '',
    defaultSwapFee: '0.05',
    platformActive: true,
    maintenanceMessage: 'Platform is currently under maintenance. Please check back later.',
    heliusApiKey: 'd260d547-850c-4cb6-8412-9c764f0c9df1',
    network: network,
    platformName: platformName,
    platformDescription: platformDescription,
    platformIcon: platformIcon,
  });

  // API config state
  const [apiConfig, setApiConfig] = useState({
    heliusApiKey: 'd260d547-850c-4cb6-8412-9c764f0c9df1',
    heliusRpc: 'https://devnet.helius-rpc.com/?api-key=d260d547-850c-4cb6-8412-9c764f0c9df1',
    network: network,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [validatingRpc, setValidatingRpc] = useState(false);
  const [rpcValidationResult, setRpcValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [poolStats, setPoolStats] = useState({
    totalPools: 0,
    activePools: 0,
    totalNFTs: 0,
    totalVolume: 0,
  });

  // CRITICAL FIX: Sync admin settings with context values when they change
  useEffect(() => {
    console.log('🔄 Context values changed, updating admin settings form...');
    setAdminSettings(prev => ({
      ...prev,
      platformName: platformName,
      platformDescription: platformDescription,
      platformIcon: platformIcon,
      network: network,
      feeCollectorWallet: address || prev.feeCollectorWallet,
    }));
  }, [platformName, platformDescription, platformIcon, network, address]);

  // Load data on component mount
  useEffect(() => {
    if (isAdmin && address) {
      loadAdminData();
    }
  }, [isAdmin, address]);

  const loadAdminData = async () => {
    if (!address) return;

    try {
      setLoading(true);

      // Load pools
      const poolsData = await getAllPools();
      setPools(poolsData);

      // Calculate stats
      const stats = {
        totalPools: poolsData.length,
        activePools: poolsData.filter(p => p.is_active).length,
        totalNFTs: poolsData.reduce((sum, p) => sum + (p.nft_count || 0), 0),
        totalVolume: poolsData.reduce((sum, p) => sum + (p.total_volume || 0), 0),
      };
      setPoolStats(stats);

      // Load admin settings
      console.log('📋 Loading admin settings for dashboard...');
      const settings = await getAdminSettings(address);
      if (settings) {
        console.log('✅ Admin settings loaded:', settings);
        
        // CRITICAL FIX: Update form state with loaded settings
        setAdminSettings({
          feeCollectorWallet: settings.fee_collector_wallet,
          defaultSwapFee: settings.default_swap_fee.toString(),
          platformActive: settings.platform_active,
          maintenanceMessage: settings.maintenance_message,
          heliusApiKey: settings.helius_api_key,
          network: settings.network,
          platformName: settings.platform_name || platformName,
          platformDescription: settings.platform_description || platformDescription,
          platformIcon: settings.platform_icon || platformIcon,
        });

      } else {
        console.log('⚠️ No admin settings found, using defaults');
      }

      // Load API config
      const config = await getApiConfig(address);
      if (config) {
        setApiConfig({
          heliusApiKey: config.helius_api_key,
          heliusRpc: config.helius_rpc,
          network: config.network,
        });
      }

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!address) return;

    setSaving(true);
    try {
      console.log('💾 Saving admin settings:', adminSettings);

      // CRITICAL FIX: Save admin settings with proper structure
      const settingsToSave = {
        user_wallet: address,
        fee_collector_wallet: adminSettings.feeCollectorWallet,
        default_swap_fee: parseFloat(adminSettings.defaultSwapFee),
        platform_active: adminSettings.platformActive,
        maintenance_message: adminSettings.maintenanceMessage,
        helius_api_key: adminSettings.heliusApiKey,
        network: adminSettings.network as 'devnet' | 'mainnet-beta',
        platform_name: adminSettings.platformName,
        platform_description: adminSettings.platformDescription,
        platform_icon: adminSettings.platformIcon,
      };

      console.log('💾 Saving settings to Supabase:', settingsToSave);
      const savedSettings = await saveAdminSettings(settingsToSave);
      console.log('✅ Settings saved successfully:', savedSettings);

      // Save API config
      const apiConfigToSave = {
        user_wallet: address,
        helius_api_key: apiConfig.heliusApiKey,
        helius_rpc: apiConfig.heliusRpc,
        network: apiConfig.network as 'devnet' | 'mainnet-beta',
      };

      console.log('💾 Saving API config to Supabase:', apiConfigToSave);
      const savedApiConfig = await saveApiConfig(apiConfigToSave);
      console.log('✅ API config saved successfully:', savedApiConfig);

      // CRITICAL FIX: Update platform branding in context immediately after saving
      console.log('🎨 Updating platform branding in context after save...');
      updatePlatformBranding(adminSettings.platformName, adminSettings.platformDescription, adminSettings.platformIcon);

      // Update network if changed
      if (adminSettings.network !== network) {
        switchNetwork(adminSettings.network as 'devnet' | 'mainnet-beta');
      }

      console.log('✅ Settings saved successfully and applied to platform');
      
      // FIXED: Show success feedback without interfering with saving state
      const saveButton = document.querySelector('[data-save-button]') as HTMLButtonElement;
      if (saveButton) {
        // Find the icon and text elements
        const iconElement = saveButton.querySelector('svg');
        const textElement = saveButton.querySelector('span');
        
        // Temporarily show success state while preserving icon
        if (textElement) {
          textElement.textContent = 'Saved!';
        }
        saveButton.style.background = 'linear-gradient(to right, #10b981, #059669)';
        saveButton.disabled = true; // Prevent clicking during success display
        
        setTimeout(() => {
          if (textElement) {
            textElement.textContent = 'Save Settings';
          }
          saveButton.style.background = '';
          saveButton.disabled = false;
        }, 2000);
      }

      // Verify the save by reloading from database
      console.log('🔍 Verifying save by reloading from database...');
      setTimeout(async () => {
        try {
          const verifySettings = await getAdminSettings(address);
          console.log('🔍 Verification - settings in database:', verifySettings);
          
          if (verifySettings) {
            console.log('✅ Verification successful - settings are in database');
            console.log('Platform name in DB:', verifySettings.platform_name);
            console.log('Platform description in DB:', verifySettings.platform_description);
            console.log('Platform icon in DB:', verifySettings.platform_icon);
          } else {
            console.error('❌ Verification failed - no settings found in database');
          }
        } catch (error) {
          console.error('❌ Verification error:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      
      // Show detailed error message
      let errorMessage = 'Failed to save settings. ';
      if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      alert(errorMessage);
      console.error('Full error details:', error);
    } finally {
      // CRITICAL FIX: Reset saving state immediately after operations complete
      setTimeout(() => {
        setSaving(false);
      }, 100); // Small delay to ensure UI updates properly
    }
  };

  const handleCreatePool = async (poolData: any) => {
    try {
      // Pool creation is handled in the modal
      setShowCreatePool(false);
      await loadAdminData(); // Refresh data
    } catch (error) {
      console.error('Error creating pool:', error);
    }
  };

  const handleEditPool = (pool: PoolConfig) => {
    setEditingPool(pool);
    setShowEditPool(true);
  };

  const handleSavePool = async (updatedPool: PoolConfig) => {
    setShowEditPool(false);
    setEditingPool(null);
    await loadAdminData(); // Refresh data
  };

  const handleTogglePool = async (collectionId: string) => {
    try {
      await togglePoolStatus(collectionId);
      await loadAdminData(); // Refresh data
    } catch (error) {
      console.error('Error toggling pool status:', error);
    }
  };

  const handleDeletePool = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this pool? This action cannot be undone.')) {
      return;
    }

    try {
      await deletePool(collectionId);
      await loadAdminData(); // Refresh data
    } catch (error) {
      console.error('Error deleting pool:', error);
    }
  };

  const handleProgramDeploy = (newProgramId: string) => {
    // Update the program ID in the frontend
    const success = updateProgramId(newProgramId);
    if (success) {
      setShowProgramDeploy(false);
      console.log('✅ Program deployment completed');
    }
  };

  // ENHANCED: Force cleanup handler
  const handleForceCleanup = async () => {
    if (!confirm('This will remove ALL test data and localStorage. Are you sure?')) {
      return;
    }

    setCleaning(true);
    try {
      await contextForceCleanup();
      console.log('✅ Force cleanup completed');
    } catch (error) {
      console.error('Error during force cleanup:', error);
    } finally {
      setCleaning(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleValidateRpc = async () => {
    if (!apiConfig.heliusRpc.trim()) {
      setRpcValidationResult({ valid: false, message: 'Please enter an RPC URL' });
      return;
    }

    setValidatingRpc(true);
    setRpcValidationResult(null);

    try {
      console.log('🔍 Validating RPC URL:', apiConfig.heliusRpc);
      
      // Test the RPC with a simple getHealth call
      const response = await fetch(apiConfig.heliusRpc, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'RPC returned an error');
      }

      // Check if it's a Helius endpoint
      const isHelius = apiConfig.heliusRpc.includes('helius-rpc.com');
      const network = apiConfig.heliusRpc.includes('mainnet') ? 'mainnet' : 'devnet';
      
      setRpcValidationResult({ 
        valid: true, 
        message: `✅ RPC is working! ${isHelius ? `Helius ${network}` : 'Custom'} endpoint responding correctly.` 
      });
      
      console.log('✅ RPC validation successful:', data);
      
    } catch (error) {
      console.error('❌ RPC validation failed:', error);
      
      let errorMessage = 'RPC validation failed: ';
      if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Network error or invalid URL';
      } else if (error.message.includes('HTTP 401')) {
        errorMessage += 'Invalid API key';
      } else if (error.message.includes('HTTP 403')) {
        errorMessage += 'API key lacks permissions';
      } else if (error.message.includes('HTTP 429')) {
        errorMessage += 'Rate limit exceeded';
      } else {
        errorMessage += error.message;
      }
      
      setRpcValidationResult({ valid: false, message: errorMessage });
    } finally {
      setValidatingRpc(false);
    }
  };
  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-16 px-4">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-400">
            You need admin privileges to access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Manage your NFT swap platform</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => setShowProgramDeploy(true)}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Code className="h-4 w-4" />
            <span>Deploy Program</span>
          </button>
          <button
            onClick={() => setShowCreatePool(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Pool</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="sm:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg text-white"
        >
          <span className="font-medium">
            {activeTab === 'overview' && 'Overview'}
            {activeTab === 'pools' && 'Pools'}
            {activeTab === 'settings' && 'Settings'}
            {activeTab === 'deploy' && 'Deployment'}
          </span>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        
        {mobileMenuOpen && (
          <div className="mt-2 bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'pools', label: 'Pools', icon: Database },
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'deploy', label: 'Deployment', icon: Upload },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 p-4 text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="hidden sm:block border-b border-white/10">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'pools', label: 'Pools', icon: Database },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'deploy', label: 'Deployment', icon: Upload },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-xs sm:text-sm font-medium">Total Pools</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{poolStats?.totalPools || 0}</p>
                </div>
                <Database className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-xs sm:text-sm font-medium">Active Pools</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{poolStats?.activePools || 0}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-xs sm:text-sm font-medium">Total NFTs</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{poolStats?.totalNFTs || 0}</p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-200 text-xs sm:text-sm font-medium">Total Volume</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{(poolStats?.totalVolume || 0).toFixed(2)} SOL</p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Recent Pools */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white">Recent Pools</h3>
              <button
                onClick={loadAdminData}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {pools.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No pools created yet</p>
                  <p className="text-gray-500 text-sm">Create your first pool to get started</p>
                </div>
              ) : (
                pools.slice(0, 5).map((pool) => (
                  <div key={pool.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white/5 rounded-lg space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <img
                        src={pool.collection_image}
                        alt={pool.collection_name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <h4 className="font-medium text-white">{pool.collection_name}</h4>
                        <p className="text-sm text-gray-400 break-all">{pool.collection_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                      <div className="text-left sm:text-right">
                        <p className="text-sm text-gray-400">NFTs: {pool.nft_count}</p>
                        <p className="text-sm text-gray-400">Fee: {pool.swap_fee} SOL</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pool.is_active 
                          ? 'bg-green-500/20 text-green-200' 
                          : 'bg-red-500/20 text-red-200'
                      }`}>
                        {pool.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pools' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <h3 className="text-xl font-semibold text-white">Pool Management</h3>
            <button
              onClick={() => setShowCreatePool(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Pool</span>
            </button>
          </div>

          <div className="grid gap-6">
            {pools.length === 0 ? (
              <div className="text-center py-16">
                <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Pools Yet</h3>
                <p className="text-gray-400 mb-6">Create your first pool to start managing NFT swaps</p>
                <button
                  onClick={() => setShowCreatePool(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                >
                  Create First Pool
                </button>
              </div>
            ) : (
              pools.map((pool) => (
                <div key={pool.id} className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex items-center space-x-4">
                      <img
                        src={pool.collection_image}
                        alt={pool.collection_name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-lg font-semibold text-white">{pool.collection_name}</h4>
                        <p className="text-gray-400 break-all">{pool.collection_id}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 mt-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">Pool:</span>
                            <span className="text-sm text-gray-400 font-mono">{formatAddress(pool.pool_address)}</span>