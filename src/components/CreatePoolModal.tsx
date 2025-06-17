import React, { useState } from 'react';
import { X, Upload, AlertTriangle, CheckCircle, Loader2, Key, Plus, Copy, Eye, EyeOff, FileText } from 'lucide-react';
import { createNewPool } from '../lib/pool-manager';
import { useWallet } from '../contexts/WalletContext';
import { Keypair } from '@solana/web3.js';

interface CreatePoolModalProps {
  onClose: () => void;
  onSubmit: (poolData: any) => void;
  defaultSwapFee?: string;
}

export const CreatePoolModal: React.FC<CreatePoolModalProps> = ({ onClose, onSubmit, defaultSwapFee = '0.05' }) => {
  const { address } = useWallet();
  const [formData, setFormData] = useState({
    collectionId: '',
    collectionName: '',
    collectionImage: '',
    collectionAddress: '',
    swapFee: defaultSwapFee,
    description: '',
  });
  
  // Pool address options - removed "existing" option
  const [poolAddressOption, setPoolAddressOption] = useState<'create' | 'import'>('create');
  const [importPrivateKey, setImportPrivateKey] = useState('');
  const [generatedWallet, setGeneratedWallet] = useState<{
    publicKey: string;
    secretKey: string;
    mnemonic?: string;
  } | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  
  const [validating, setValidating] = useState(false);
  const [creating, setCreating] = useState(false);
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
    if (poolAddressOption === 'import') {
      if (!importPrivateKey.trim()) {
        newErrors.poolAddress = 'Private key is required';
      } else {
        try {
          // Validate private key format
          const keyArray = importPrivateKey.includes(',') 
            ? importPrivateKey.split(',').map(n => parseInt(n.trim()))
            : Array.from(new Uint8Array(Buffer.from(importPrivateKey, 'base64')));
          
          if (keyArray.length !== 64 || keyArray.some(n => isNaN(n) || n < 0 || n > 255)) {
            newErrors.poolAddress = 'Invalid private key format';
          }
        } catch {
          newErrors.poolAddress = 'Invalid private key format';
        }
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

  const importWalletFromPrivateKey = () => {
    try {
      let keyArray: number[];
      
      // Handle different private key formats
      if (importPrivateKey.includes(',')) {
        // Comma-separated format
        keyArray = importPrivateKey.split(',').map(n => parseInt(n.trim()));
      } else if (importPrivateKey.startsWith('[') && importPrivateKey.endsWith(']')) {
        // JSON array format
        keyArray = JSON.parse(importPrivateKey);
      } else {
        // Base64 format
        keyArray = Array.from(new Uint8Array(Buffer.from(importPrivateKey, 'base64')));
      }
      
      if (keyArray.length !== 64 || keyArray.some(n => isNaN(n) || n < 0 || n > 255)) {
        throw new Error('Invalid key length or values');
      }
      
      const keypair = Keypair.fromSecretKey(new Uint8Array(keyArray));
      const wallet = {
        publicKey: keypair.publicKey.toString(),
        secretKey: keyArray.join(','),
      };
      
      setGeneratedWallet(wallet);
      
      // Clear any existing errors
      if (errors.poolAddress) {
        setErrors(prev => ({ ...prev, poolAddress: '' }));
      }
      
      console.log('Imported wallet from private key:', wallet.publicKey);
    } catch (error) {
      console.error('Error importing wallet:', error);
      setErrors(prev => ({ ...prev, poolAddress: 'Invalid private key format. Supported formats: comma-separated numbers, JSON array, or base64' }));
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
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
      // Simple validation - check if it's a valid Solana address format
      if (formData.collectionAddress.length >= 32 && formData.collectionAddress.length <= 44) {
        setValidationResult({ valid: true, message: 'Collection address format is valid' });
      } else {
        setValidationResult({ valid: false, message: 'Invalid collection address format' });
      }
    } catch (error) {
      setValidationResult({ valid: false, message: 'Error validating collection address' });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!address) {
      setErrors({ general: 'Wallet not connected' });
      return;
    }

    setCreating(true);

    try {
      // Prepare pool data with the selected address option
      let poolData = {
        ...formData,
        // REMOVED: collectionSymbol generation
        poolAddress: '',
        poolWalletData: null as any,
      };

      if (poolAddressOption === 'create') {
        poolData.poolAddress = generatedWallet?.publicKey || '';
        poolData.poolWalletData = generatedWallet;
      } else if (poolAddressOption === 'import') {
        poolData.poolAddress = generatedWallet?.publicKey || '';
        poolData.poolWalletData = generatedWallet;
      }

      // Create the pool using the pool manager (without collection symbol)
      await createNewPool(
        formData.collectionId,
        formData.collectionName,
        '', // Empty collection symbol
        formData.collectionImage,
        formData.collectionAddress,
        address,
        parseFloat(formData.swapFee),
        formData.description,
        poolData.poolAddress,
        poolData.poolWalletData
      );

      console.log('✅ Pool created successfully');
      onSubmit(poolData);
    } catch (error) {
      console.error('❌ Error creating pool:', error);
      setErrors({ general: error.message || 'Failed to create pool. Please try again.' });
    } finally {
      setCreating(false);
    }
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
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-red-200 font-medium">Error</p>
                  <p className="text-red-100/80 text-sm mt-1">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

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

          {/* Pool Address Options - REMOVED "Use Existing" */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Pool Wallet Configuration *
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
                    <p className="text-gray-400 text-sm">Generate a new Solana wallet</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPoolAddressOption('import')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  poolAddressOption === 'import'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-green-400" />
                  <div className="text-left">
                    <p className="text-white font-medium">Import Wallet</p>
                    <p className="text-gray-400 text-sm">Use existing private key</p>
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

            {/* Import Wallet Option */}
            {poolAddressOption === 'import' && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <label className="block text-sm text-gray-300 mb-2">
                  Import Private Key
                </label>
                <textarea
                  value={importPrivateKey}
                  onChange={(e) => {
                    setImportPrivateKey(e.target.value);
                    if (errors.poolAddress) {
                      setErrors(prev => ({ ...prev, poolAddress: '' }));
                    }
                  }}
                  rows={3}
                  className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm ${
                    errors.poolAddress ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Paste private key (comma-separated numbers, JSON array, or base64)"
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-gray-500 text-xs">
                    Supported formats: [1,2,3...], 1,2,3... or base64
                  </p>
                  <button
                    type="button"
                    onClick={importWalletFromPrivateKey}
                    disabled={!importPrivateKey.trim()}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Import
                  </button>
                </div>
                
                {generatedWallet && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-200 text-sm font-medium">✅ Wallet Imported Successfully</p>
                    <p className="text-green-100/80 text-xs mt-1">
                      Address: {generatedWallet.publicKey.slice(0, 8)}...{generatedWallet.publicKey.slice(-8)}
                    </p>
                  </div>
                )}
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
                  Make sure the collection address is valid and exists on Solana. 
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
              disabled={creating}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-xl font-bold transition-all duration-200 hover:shadow-lg transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Pool</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};