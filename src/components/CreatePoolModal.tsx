import React, { useState } from 'react';
import { X, Upload, AlertTriangle, CheckCircle, Loader2, Key, Plus, Copy, Eye, EyeOff } from 'lucide-react';
import { poolManager } from '../lib/pool-manager';
import { Keypair } from '@solana/web3.js';

interface CreatePoolModalProps {
  onClose: () => void;
  onSubmit: (poolData: any) => void;
  defaultSwapFee?: string;
}

export const CreatePoolModal: React.FC<CreatePoolModalProps> = ({ onClose, onSubmit, defaultSwapFee = '0.05' }) => {
  const [formData, setFormData] = useState({
    collectionId: '',
    collectionName: '',
    collectionImage: '',
    collectionAddress: '',
    swapFee: defaultSwapFee, // Use the admin-configured default
    description: '',
  });
  
  // Pool address options
  const [poolAddressOption, setPoolAddressOption] = useState<'create' | 'existing'>('create');
  const [existingPoolAddress, setExistingPoolAddress] = useState('');
  const [generatedWallet, setGeneratedWallet] = useState<{
    publicKey: string;
    secretKey: string;
    mnemonic?: string;
  } | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.collectionId.trim()) {
      newErrors.collectionId = 'Collection ID is required';
    } else if (formData.collectionId.length > 32) {
      newErrors.collectionId = 'Collection ID must be 32 characters or less';
    }

    if (!formData.collectionName.trim()) {
      newErrors.collectionName = 'Collection name is required';
    }

    if (!formData.collectionAddress.trim()) {
      newErrors.collectionAddress = 'Collection address is required';
    } else if (formData.collectionAddress.length < 32) {
      newErrors.collectionAddress = 'Invalid Solana address format';
    }

    if (!formData.collectionImage.trim()) {
      newErrors.collectionImage = 'Collection image URL is required';
    } else if (!isValidUrl(formData.collectionImage)) {
      newErrors.collectionImage = 'Invalid image URL format';
    }

    // Validate pool address based on option
    if (poolAddressOption === 'existing') {
      if (!existingPoolAddress.trim()) {
        newErrors.poolAddress = 'Pool address is required';
      } else if (existingPoolAddress.length < 32) {
        newErrors.poolAddress = 'Invalid Solana address format';
      }
    } else if (poolAddressOption === 'create' && !generatedWallet) {
      newErrors.poolAddress = 'Please generate a wallet address first';
    }

    const swapFee = parseFloat(formData.swapFee);
    if (isNaN(swapFee) || swapFee < 0 || swapFee > 10) {
      newErrors.swapFee = 'Swap fee must be between 0 and 10 SOL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const generateNewWallet = () => {
    try {
      const keypair = Keypair.generate();
      const wallet = {
        publicKey: keypair.publicKey.toString(),
        secretKey: Array.from(keypair.secretKey).join(','),
      };
      
      setGeneratedWallet(wallet);
      
      // Clear any existing pool address errors
      if (errors.poolAddress) {
        setErrors(prev => ({ ...prev, poolAddress: '' }));
      }
      
      console.log('Generated new wallet for pool:', wallet.publicKey);
    } catch (error) {
      console.error('Error generating wallet:', error);
      setErrors(prev => ({ ...prev, poolAddress: 'Failed to generate wallet' }));
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      console.log(`${type} copied to clipboard`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleValidateCollection = async () => {
    if (!formData.collectionAddress.trim()) {
      setValidationResult({ valid: false, message: 'Please enter a collection address' });
      return;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      const isValid = await poolManager.validateCollection(formData.collectionAddress);
      
      if (isValid) {
        setValidationResult({ valid: true, message: 'Collection address is valid' });
        
        // Try to fetch metadata
        const metadata = await poolManager.getCollectionMetadata(formData.collectionAddress);
        if (metadata) {
          setFormData(prev => ({
            ...prev,
            collectionName: metadata.name || prev.collectionName,
            collectionImage: metadata.image || prev.collectionImage,
            description: metadata.description || prev.description,
          }));
        }
      } else {
        setValidationResult({ valid: false, message: 'Invalid collection address or not found on devnet' });
      }
    } catch (error) {
      setValidationResult({ valid: false, message: 'Error validating collection address' });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check if pool already exists
    const existingPool = poolManager.getPool(formData.collectionId);
    if (existingPool) {
      setErrors({ collectionId: 'A pool already exists for this collection ID' });
      return;
    }

    // Prepare pool data with the selected address option
    const poolData = {
      ...formData,
      collectionSymbol: formData.collectionName.substring(0, 10).toUpperCase().replace(/\s+/g, ''), // Auto-generate from name
      poolAddress: poolAddressOption === 'create' ? generatedWallet?.publicKey : existingPoolAddress,
      poolWalletData: poolAddressOption === 'create' ? generatedWallet : null,
    };

    onSubmit(poolData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear validation result when address changes
    if (field === 'collectionAddress') {
      setValidationResult(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Create New Pool</h2>
              <p className="text-gray-400 mt-1">Add a new NFT collection to the swap platform</p>
              {defaultSwapFee && (
                <p className="text-blue-200 text-sm mt-1">
                  Default swap fee: {defaultSwapFee} SOL (can be customized)
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Collection Address */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Collection Address *
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.collectionAddress}
                onChange={(e) => handleInputChange('collectionAddress', e.target.value)}
                className={`flex-1 px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.collectionAddress ? 'border-red-500' : 'border-white/20'
                }`}
                placeholder="Enter Solana collection address"
              />
              <button
                type="button"
                onClick={handleValidateCollection}
                disabled={validating || !formData.collectionAddress.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
              >
                {validating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span>Validate</span>
              </button>
            </div>
            {errors.collectionAddress && (
              <p className="text-red-400 text-sm mt-1">{errors.collectionAddress}</p>
            )}
            {validationResult && (
              <div className={`mt-2 p-2 rounded-lg text-sm ${
                validationResult.valid 
                  ? 'bg-green-500/10 border border-green-500/20 text-green-200'
                  : 'bg-red-500/10 border border-red-500/20 text-red-200'
              }`}>
                {validationResult.message}
              </div>
            )}
          </div>

          {/* Pool Address Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Pool Address Configuration *
            </label>
            
            {/* Option Selection */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                type="button"
                onClick={() => setPoolAddressOption('create')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  poolAddressOption === 'create'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Plus className="h-5 w-5 text-purple-400" />
                  <div className="text-left">
                    <p className="text-white font-medium">Create New Wallet</p>
                    <p className="text-gray-400 text-sm">Generate a new Solana address</p>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setPoolAddressOption('existing')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  poolAddressOption === 'existing'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Key className="h-5 w-5 text-blue-400" />
                  <div className="text-left">
                    <p className="text-white font-medium">Use Existing Address</p>
                    <p className="text-gray-400 text-sm">Enter an existing wallet address</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Create New Wallet Option */}
            {poolAddressOption === 'create' && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium">Generate New Wallet</h4>
                  <button
                    type="button"
                    onClick={generateNewWallet}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Generate</span>
                  </button>
                </div>
                
                {generatedWallet ? (
                  <div className="space-y-3">
                    {/* Public Key */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Public Key (Pool Address)</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={generatedWallet.publicKey}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generatedWallet.publicKey, 'Public key')}
                          className="p-2 hover:bg-white/10 rounded transition-colors"
                        >
                          <Copy className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Private Key */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Private Key (Keep Secure!)</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type={showPrivateKey ? 'text' : 'password'}
                          value={generatedWallet.secretKey}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPrivateKey(!showPrivateKey)}
                          className="p-2 hover:bg-white/10 rounded transition-colors"
                        >
                          {showPrivateKey ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generatedWallet.secretKey, 'Private key')}
                          className="p-2 hover:bg-white/10 rounded transition-colors"
                        >
                          <Copy className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Warning */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-red-200 font-medium">Security Warning</p>
                          <p className="text-red-100/80 text-xs mt-1">
                            Save the private key securely! You'll need it to manage the pool wallet. 
                            Never share it with anyone.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Key className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Click "Generate" to create a new wallet for this pool</p>
                  </div>
                )}
              </div>
            )}

            {/* Use Existing Address Option */}
            {poolAddressOption === 'existing' && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <label className="block text-sm text-gray-300 mb-2">
                  Existing Pool Address
                </label>
                <input
                  type="text"
                  value={existingPoolAddress}
                  onChange={(e) => {
                    setExistingPoolAddress(e.target.value);
                    if (errors.poolAddress) {
                      setErrors(prev => ({ ...prev, poolAddress: '' }));
                    }
                  }}
                  className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.poolAddress ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Enter existing Solana wallet address"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Make sure you have access to this wallet for pool management
                </p>
              </div>
            )}
            
            {errors.poolAddress && (
              <p className="text-red-400 text-sm mt-1">{errors.poolAddress}</p>
            )}
          </div>

          {/* Collection ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Collection ID *
            </label>
            <input
              type="text"
              value={formData.collectionId}
              onChange={(e) => handleInputChange('collectionId', e.target.value)}
              className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.collectionId ? 'border-red-500' : 'border-white/20'
              }`}
              placeholder="e.g., my-nft-collection"
            />
            {errors.collectionId && (
              <p className="text-red-400 text-sm mt-1">{errors.collectionId}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">Unique identifier for this collection (max 32 chars)</p>
          </div>

          {/* Collection Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Collection Name *
            </label>
            <input
              type="text"
              value={formData.collectionName}
              onChange={(e) => handleInputChange('collectionName', e.target.value)}
              className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.collectionName ? 'border-red-500' : 'border-white/20'
              }`}
              placeholder="e.g., My NFT Collection"
            />
            {errors.collectionName && (
              <p className="text-red-400 text-sm mt-1">{errors.collectionName}</p>
            )}
          </div>

          {/* Collection Image */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Collection Image URL *
            </label>
            <input
              type="url"
              value={formData.collectionImage}
              onChange={(e) => handleInputChange('collectionImage', e.target.value)}
              className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.collectionImage ? 'border-red-500' : 'border-white/20'
              }`}
              placeholder="https://example.com/collection-image.jpg"
            />
            {errors.collectionImage && (
              <p className="text-red-400 text-sm mt-1">{errors.collectionImage}</p>
            )}
            {formData.collectionImage && isValidUrl(formData.collectionImage) && (
              <div className="mt-2">
                <img 
                  src={formData.collectionImage} 
                  alt="Collection preview" 
                  className="w-20 h-20 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Swap Fee */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Swap Fee (SOL) *
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              max="10"
              value={formData.swapFee}
              onChange={(e) => handleInputChange('swapFee', e.target.value)}
              className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.swapFee ? 'border-red-500' : 'border-white/20'
              }`}
            />
            {errors.swapFee && (
              <p className="text-red-400 text-sm mt-1">{errors.swapFee}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Fee charged for each swap in this pool (default: {defaultSwapFee} SOL)
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Optional description for this collection pool"
            />
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="text-sm">
                <p className="text-yellow-200 font-medium mb-1">Pool Creation</p>
                <p className="text-yellow-100/80">
                  Make sure the collection address is valid and exists on Solana devnet. 
                  The pool address will receive NFTs for swapping. Keep wallet credentials secure!
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-xl font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-3 rounded-xl font-bold transition-all duration-200 hover:shadow-lg transform hover:scale-105"
            >
              Create Pool
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};