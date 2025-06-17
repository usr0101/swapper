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
  Copy
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

  // Admin settings state
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
  const [poolStats, setPoolStats] = useState({
    totalPools: 0,
    activePools: 0,
    totalNFTs: 0,
    totalVolume: 0,
  });

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
      const settings = await getAdminSettings(address);
      if (settings) {
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
      // Save admin settings
      await saveAdminSettings({
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
      });

      // Save API config
      await saveApiConfig({
        user_wallet: address,
        helius_api_key: apiConfig.heliusApiKey,
        helius_rpc: apiConfig.heliusRpc,
        network: apiConfig.network as 'devnet' | 'mainnet-beta',
      });

      // Update platform branding in context
      updatePlatformBranding(adminSettings.platformName, adminSettings.platformDescription, adminSettings.platformIcon);

      // Update network if changed
      if (adminSettings.network !== network) {
        switchNetwork(adminSettings.network as 'devnet' | 'mainnet-beta');
      }

      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-16">
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Manage your NFT swap platform</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowProgramDeploy(true)}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
          >
            <Code className="h-4 w-4" />
            <span>Deploy Program</span>
          </button>
          <button
            onClick={() => setShowCreatePool(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Pool</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-white/10">
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
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm font-medium">Total Pools</p>
                  <p className="text-2xl font-bold text-white">{poolStats?.totalPools || 0}</p>
                </div>
                <Database className="h-8 w-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm font-medium">Active Pools</p>
                  <p className="text-2xl font-bold text-white">{poolStats?.activePools || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm font-medium">Total NFTs</p>
                  <p className="text-2xl font-bold text-white">{poolStats?.totalNFTs || 0}</p>
                </div>
                <Users className="h-8 w-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-200 text-sm font-medium">Total Volume</p>
                  <p className="text-2xl font-bold text-white">{(poolStats?.totalVolume || 0).toFixed(2)} SOL</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Recent Pools */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Recent Pools</h3>
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
                  <div key={pool.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img
                        src={pool.collection_image}
                        alt={pool.collection_name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <h4 className="font-medium text-white">{pool.collection_name}</h4>
                        <p className="text-sm text-gray-400">{pool.collection_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
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
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Pool Management</h3>
            <button
              onClick={() => setShowCreatePool(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
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
                <div key={pool.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src={pool.collection_image}
                        alt={pool.collection_name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div>
                        <h4 className="text-lg font-semibold text-white">{pool.collection_name}</h4>
                        <p className="text-gray-400">{pool.collection_id}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-500">Pool:</span>
                          <span className="text-sm text-gray-400 font-mono">{formatAddress(pool.pool_address)}</span>
                          <button
                            onClick={() => copyToClipboard(pool.pool_address)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Copy pool address"
                          >
                            <Copy className="h-3 w-3 text-gray-400 hover:text-white" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-500">Collection:</span>
                          <span className="text-sm text-gray-400 font-mono">{formatAddress(pool.collection_address)}</span>
                          <button
                            onClick={() => copyToClipboard(pool.collection_address)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Copy collection address"
                          >
                            <Copy className="h-3 w-3 text-gray-400 hover:text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-400">NFTs</p>
                        <p className="text-lg font-semibold text-white">{pool.nft_count}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Fee</p>
                        <p className="text-lg font-semibold text-white">{pool.swap_fee} SOL</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Volume</p>
                        <p className="text-lg font-semibold text-white">{pool.total_volume.toFixed(2)} SOL</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditPool(pool)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit pool"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleTogglePool(pool.collection_id)}
                          className={`p-2 rounded-lg transition-colors ${
                            pool.is_active
                              ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                              : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                          }`}
                          title={pool.is_active ? 'Deactivate pool' : 'Activate pool'}
                        >
                          {pool.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeletePool(pool.collection_id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete pool"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {pool.description && (
                    <p className="text-gray-400 text-sm mt-4">{pool.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Platform Settings</h3>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Platform Branding */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Zap className="h-5 w-5 text-purple-400" />
                <span>Platform Branding</span>
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Platform Name
                  </label>
                  <input
                    type="text"
                    value={adminSettings.platformName}
                    onChange={(e) => setAdminSettings(prev => ({ ...prev, platformName: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Swapper"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Platform Description
                  </label>
                  <input
                    type="text"
                    value={adminSettings.platformDescription}
                    onChange={(e) => setAdminSettings(prev => ({ ...prev, platformDescription: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Real NFT Exchange"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Platform Icon (Emoji)
                  </label>
                  <input
                    type="text"
                    value={adminSettings.platformIcon}
                    onChange={(e) => setAdminSettings(prev => ({ ...prev, platformIcon: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., ⚡"
                    maxLength={2}
                  />
                  <p className="text-gray-500 text-xs mt-1">Use an emoji or single character</p>
                </div>

                {/* Preview */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Preview:</p>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-lg">{adminSettings.platformIcon}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{adminSettings.platformName}</h4>
                      <p className="text-xs text-gray-400">{adminSettings.platformDescription}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* General Settings */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">General Settings</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fee Collector Wallet
                  </label>
                  <input
                    type="text"
                    value={adminSettings.feeCollectorWallet}
                    onChange={(e) => setAdminSettings(prev => ({ ...prev, feeCollectorWallet: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Solana wallet address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Swap Fee (SOL)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="10"
                    value={adminSettings.defaultSwapFee}
                    onChange={(e) => setAdminSettings(prev => ({ ...prev, defaultSwapFee: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Network
                  </label>
                  <select
                    value={adminSettings.network}
                    onChange={(e) => setAdminSettings(prev => ({ ...prev, network: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="devnet">Devnet</option>
                    <option value="mainnet-beta">Mainnet Beta</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="platformActive"
                    checked={adminSettings.platformActive}
                    onChange={(e) => setAdminSettings(prev => ({ ...prev, platformActive: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="platformActive" className="text-sm font-medium text-gray-300">
                    Platform Active
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Maintenance Message
                  </label>
                  <textarea
                    value={adminSettings.maintenanceMessage}
                    onChange={(e) => setAdminSettings(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Message shown when platform is inactive"
                  />
                </div>
              </div>
            </div>

            {/* API Configuration */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">API Configuration</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Helius API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiConfig.heliusApiKey}
                      onChange={(e) => setApiConfig(prev => ({ ...prev, heliusApiKey: e.target.value }))}
                      className="w-full px-4 py-2 pr-12 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Your Helius API key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Helius RPC URL
                  </label>
                  <input
                    type="text"
                    value={apiConfig.heliusRpc}
                    onChange={(e) => setApiConfig(prev => ({ ...prev, heliusRpc: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Helius RPC endpoint"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Network
                  </label>
                  <select
                    value={apiConfig.network}
                    onChange={(e) => setApiConfig(prev => ({ ...prev, network: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="devnet">Devnet</option>
                    <option value="mainnet-beta">Mainnet Beta</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cleanup Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Trash className="h-5 w-5 text-red-400" />
                <span>Data Management</span>
              </h4>
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-red-200 font-medium mb-1">Force Cleanup</p>
                      <p className="text-red-100/80 mb-3">
                        Remove all test data and localStorage. This action cannot be undone.
                      </p>
                      <button
                        onClick={handleForceCleanup}
                        disabled={cleaning}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                      >
                        <Trash className="h-4 w-4" />
                        <span>{cleaning ? 'Cleaning...' : 'Force Cleanup'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'deploy' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Program Deployment</h3>
            <button
              onClick={() => setShowProgramDeploy(true)}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Deploy New Program</span>
            </button>
          </div>

          {/* Current Program Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-white mb-4">Current Program</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-2">Program ID</p>
                <p className="text-white font-mono text-sm bg-white/5  p-3 rounded-lg">
                  {getCurrentProgramId()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Network</p>
                <p className="text-white font-medium">{network === 'devnet' ? 'Devnet' : 'Mainnet Beta'}</p>
              </div>
            </div>
            <div className="mt-4">
              <a
                href={`https://explorer.solana.com/address/${getCurrentProgramId()}?cluster=${network}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <span>View on Solana Explorer</span>
                <Key className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Deployment Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
            <h4 className="text-blue-200 font-semibold mb-4">📋 Deployment Instructions</h4>
            <div className="space-y-4 text-blue-100/80">
              <div>
                <h5 className="font-medium text-blue-200 mb-2">1. Build and Deploy Your Program</h5>
                <div className="bg-black/20 rounded-lg p-3 font-mono text-sm">
                  <div>anchor build</div>
                  <div>anchor deploy --provider.cluster {network}</div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-blue-200 mb-2">2. Copy the Program ID</h5>
                <p className="text-sm">Copy the Program ID from the deployment output</p>
              </div>
              
              <div>
                <h5 className="font-medium text-blue-200 mb-2">3. Update Frontend</h5>
                <p className="text-sm">Click "Deploy New Program" above and paste the new Program ID</p>
              </div>
              
              <div>
                <h5 className="font-medium text-blue-200 mb-2">4. Test</h5>
                <p className="text-sm">Test all functionality with the new program before going to mainnet</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreatePool && (
        <CreatePoolModal
          onClose={() => setShowCreatePool(false)}
          onSubmit={handleCreatePool}
          defaultSwapFee={adminSettings.defaultSwapFee}
        />
      )}

      {showEditPool && editingPool && (
        <EditPoolModal
          pool={editingPool}
          onClose={() => {
            setShowEditPool(false);
            setEditingPool(null);
          }}
          onSave={handleSavePool}
        />
      )}

      {showProgramDeploy && (
        <ProgramDeployModal
          onClose={() => setShowProgramDeploy(false)}
          onDeploy={handleProgramDeploy}
          currentProgramId={getCurrentProgramId()}
        />
      )}
    </div>
  );
};