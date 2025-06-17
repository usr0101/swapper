import React, { useState } from 'react';
import { X, ArrowRightLeft, AlertTriangle, CheckCircle, Loader2, ExternalLink, Key } from 'lucide-react';
import { executeSwapTransaction, validateTransaction } from '../lib/solana';
import { useWallet } from '../contexts/WalletContext';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { getPoolWalletData, getPool } from '../lib/pool-manager';
import { getPoolWalletData as getPoolWalletFromSupabase } from '../lib/supabase';
import { PublicKey } from '@solana/web3.js';

interface SwapModalProps {
  poolNFT: any;
  userNFT: any;
  swapFee: number;
  collectionId: string;
  onConfirm: () => void;
  onClose: () => void;
}

type SwapStatus = 'pending' | 'validating' | 'processing' | 'success' | 'error';

export const SwapModal: React.FC<SwapModalProps> = ({
  poolNFT,
  userNFT,
  swapFee,
  collectionId,
  onConfirm,
  onClose,
}) => {
  const { refreshBalance, address } = useWallet();
  const wallet = useSolanaWallet(); // Get the actual wallet adapter
  const [swapStatus, setSwapStatus] = useState<SwapStatus>('pending');
  const [txData, setTxData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [validationResult, setValidationResult] = useState<any>(null);

  // ENHANCED: Calculate total cost with proper buffer for account creation
  const networkFee = 0.0005; // Base network fee
  const accountCreationBuffer = 0.002; // Buffer for potential account creation
  const totalCost = swapFee + networkFee + accountCreationBuffer;

  // CRITICAL FIX: Use Supabase directly for pool access check
  const checkPoolAccess = async () => {
    console.log('🔍 [SwapModal] Checking pool access for swap modal...');
    
    const pool = await getPool(collectionId);
    if (!pool) {
      console.log('❌ Pool not found for collection:', collectionId);
      return false;
    }
    
    console.log('🔍 [SwapModal] Pool found, checking wallet data for:', pool.pool_address);
    
    try {
      // CRITICAL FIX: Use Supabase directly instead of pool manager
      const poolWalletData = await getPoolWalletFromSupabase(pool.pool_address);
      
      console.log('🔍 [SwapModal] Pool wallet data check results:');
      console.log('  - Wallet data found:', !!poolWalletData);
      
      if (poolWalletData) {
        console.log('  - Has secret key:', !!(poolWalletData.secretKey && poolWalletData.secretKey.trim() !== ''));
        console.log('  - Secret key length:', poolWalletData.secretKey ? poolWalletData.secretKey.length : 0);
        console.log('  - Has private key flag:', poolWalletData.hasPrivateKey);
        
        // ENHANCED: More thorough validation
        const hasValidSecretKey = poolWalletData.secretKey && 
                                 poolWalletData.secretKey.trim() !== '' &&
                                 poolWalletData.secretKey.length > 10; // Basic length check
        
        const hasPrivateKeyFlag = poolWalletData.hasPrivateKey === true;
        
        console.log('  - Valid secret key:', hasValidSecretKey);
        console.log('  - Private key flag set:', hasPrivateKeyFlag);
        
        const hasAccess = hasValidSecretKey && hasPrivateKeyFlag;
        
        console.log('✅ [SwapModal] Final pool access result:', hasAccess);
        
        if (!hasAccess) {
          console.log('❌ Pool access failed because:');
          if (!hasValidSecretKey) console.log('  - Invalid or missing secret key');
          if (!hasPrivateKeyFlag) console.log('  - hasPrivateKey flag not set to true');
        }
        
        return hasAccess;
      } else {
        console.log('❌ No wallet data found for pool');
        return false;
      }
    } catch (error) {
      console.error('❌ [SwapModal] Error checking pool access:', error);
      return false;
    }
  };

  const [hasPoolAccess, setHasPoolAccess] = useState<boolean | null>(null);

  // Check pool access on component mount
  React.useEffect(() => {
    checkPoolAccess().then(setHasPoolAccess);
  }, [collectionId]);

  const handleConfirmSwap = async () => {
    if (!address || !wallet.publicKey) {
      setError('Wallet not connected');
      setSwapStatus('error');
      return;
    }

    // FAIL IMMEDIATELY if no pool access
    if (hasPoolAccess === false) {
      setError('Swap not available: This pool does not have the necessary wallet access to execute swaps. Both NFTs must be exchanged simultaneously, but the pool cannot authorize the transfer of its NFT. Please contact the admin to enable swaps for this pool.');
      setSwapStatus('error');
      return;
    }

    setSwapStatus('validating');
    setError('');
    
    try {
      console.log('🔍 Starting swap validation...');
      
      // ENHANCED: Validate the transaction with proper cost calculation
      const validation = await validateTransaction(new PublicKey(address), totalCost);
      setValidationResult(validation);
      
      if (!validation.valid) {
        setError(validation.message);
        setSwapStatus('error');
        return;
      }
      
      console.log('✅ Validation passed, executing swap...');
      setSwapStatus('processing');
      
      // Execute the swap transaction
      const result = await executeSwapTransaction(
        new PublicKey(address),
        userNFT.mint,
        poolNFT.mint,
        collectionId,
        wallet // Pass the wallet adapter for signing
      );
      
      console.log('✅ Swap executed successfully:', result);
      setTxData(result);
      setSwapStatus('success');
      
      // Refresh wallet balance after successful swap
      setTimeout(() => {
        refreshBalance();
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Swap failed:', err);
      
      // Handle specific error types
      let errorMessage = 'Swap failed';
      
      if (err.message.includes('User rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (err.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient SOL balance for transaction';
      } else if (err.message.includes('Wallet not connected')) {
        errorMessage = 'Please connect your wallet and try again';
      } else if (err.message.includes('Network error')) {
        errorMessage = 'Network error - please try again';
      } else if (err.message.includes('collection')) {
        errorMessage = err.message; // Collection validation errors
      } else if (err.message.includes('same collection')) {
        errorMessage = 'Both NFTs must be from the same verified collection';
      } else if (err.message.includes('Pool wallet access required')) {
        errorMessage = err.message; // Pool access errors
      } else if (err.message.includes('do not own')) {
        errorMessage = err.message; // Ownership errors
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setSwapStatus('error');
    }
  };

  const getStatusIcon = () => {
    switch (swapStatus) {
      case 'validating':
        return <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />;
      case 'processing':
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-8 w-8 text-red-500" />;
      default:
        return <ArrowRightLeft className="h-8 w-8 text-purple-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (swapStatus) {
      case 'validating':
        return 'Validating NFTs, collection, and swap requirements...';
      case 'processing':
        return 'Executing atomic swap on Solana blockchain...';
      case 'success':
        return 'Atomic swap completed successfully!';
      case 'error':
        return error || 'Swap failed. Please try again.';
      default:
        return 'Review your NFT swap details';
    }
  };

  // Show loading while checking pool access
  if (hasPoolAccess === null) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-2xl max-w-lg w-full p-6 relative">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Checking Pool Access</h2>
            <p className="text-gray-400">Verifying swap capability...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-2xl max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            NFT Swap
          </h2>
          <p className="text-gray-400">{getStatusMessage()}</p>
        </div>

        {swapStatus === 'pending' && (
          <>
            {/* Pool Access Status */}
            {hasPoolAccess ? (
              <div className="mb-4 p-3 rounded-lg border bg-green-500/10 border-green-500/20">
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4 text-green-400" />
                  <span className="text-green-200 text-sm font-medium">Atomic Swap Available</span>
                </div>
                <p className="text-xs mt-1 opacity-80 text-green-100">
                  Both NFTs will be exchanged simultaneously in one transaction
                </p>
              </div>
            ) : (
              <div className="mb-4 p-3 rounded-lg border bg-red-500/10 border-red-500/20">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-red-200 text-sm font-medium">Swap Not Available</span>
                </div>
                <p className="text-xs mt-1 opacity-80 text-red-100">
                  This pool does not have the necessary access to execute swaps. Contact the admin to enable this feature.
                </p>
              </div>
            )}

            {/* Swap Preview */}
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <img
                    src={userNFT.image}
                    alt={userNFT.name}
                    className="w-20 h-20 rounded-lg object-cover mx-auto mb-2"
                  />
                  <p className="text-sm font-medium text-white">{userNFT.name}</p>
                  <p className="text-xs text-gray-400">Your NFT</p>
                </div>
                
                <div className="px-4">
                  <ArrowRightLeft className={`h-6 w-6 ${hasPoolAccess ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                
                <div className="text-center flex-1">
                  <img
                    src={poolNFT.image}
                    alt={poolNFT.name}
                    className="w-20 h-20 rounded-lg object-cover mx-auto mb-2"
                  />
                  <p className="text-sm font-medium text-white">{poolNFT.name}</p>
                  <p className="text-xs text-gray-400">Pool NFT</p>
                </div>
              </div>
            </div>

            {/* ENHANCED Transaction Details with visible costs */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Swap Fee</span>
                <span className="text-white font-medium">{swapFee} SOL</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Network Fee (est.)</span>
                <span className="text-white font-medium">{networkFee} SOL</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Account Creation Buffer</span>
                <span className="text-white font-medium">{accountCreationBuffer} SOL</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Transaction Type</span>
                <span className={`text-sm font-medium ${hasPoolAccess ? 'text-green-400' : 'text-red-400'}`}>
                  {hasPoolAccess ? 'Atomic Swap' : 'Not Available'}
                </span>
              </div>
              <div className="border-t border-white/10 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Total Cost (Max)</span>
                  <span className="text-white font-bold">{totalCost.toFixed(4)} SOL</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Includes swap fee + network fees + buffer for account creation
                </p>
              </div>
            </div>

            {/* Warning/Info */}
            <div className={`border rounded-lg p-4 mb-6 ${
              hasPoolAccess 
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className="flex items-start space-x-3">
                {hasPoolAccess ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                )}
                <div className="text-sm">
                  <p className={`font-medium mb-1 ${hasPoolAccess ? 'text-green-200' : 'text-red-200'}`}>
                    {hasPoolAccess ? 'Atomic Transaction Ready' : 'Swap Unavailable'}
                  </p>
                  <p className={`${hasPoolAccess ? 'text-green-100/80' : 'text-red-100/80'}`}>
                    {hasPoolAccess 
                      ? 'This will execute a complete atomic swap. Both NFTs will be verified and exchanged simultaneously. The swap fee will be sent to the configured fee collector wallet. This action cannot be undone.'
                      : 'This pool cannot execute swaps because it lacks the necessary wallet access. Both NFTs must be exchanged simultaneously, or the transaction will not proceed.'
                    }
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmSwap}
              disabled={!wallet.connected || !hasPoolAccess}
              className={`w-full py-3 rounded-xl font-bold transition-all duration-200 hover:shadow-lg transform hover:scale-105 ${
                hasPoolAccess && wallet.connected
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                  : 'bg-gray-600 cursor-not-allowed'
              } text-white`}
            >
              {!wallet.connected 
                ? 'Connect Wallet First'
                : !hasPoolAccess
                ? 'Swap Not Available'
                : 'Execute Atomic Swap'
              }
            </button>
          </>
        )}

        {(swapStatus === 'validating' || swapStatus === 'processing') && (
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-blue-200">
                  {swapStatus === 'validating' 
                    ? 'Validating swap requirements...' 
                    : 'Broadcasting atomic transaction...'
                  }
                </span>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              {swapStatus === 'validating' 
                ? 'Verifying both NFTs are from the same collection, checking ownership, and validating wallet balance...'
                : 'Please confirm the transaction in your wallet. Both NFTs will be exchanged simultaneously and the swap fee will be sent to the fee collector...'
              }
            </p>
            {validationResult && (
              <div className="mt-4 text-sm text-gray-300">
                <p>Balance: {validationResult.balance.toFixed(4)} SOL</p>
                <p>Required: {validationResult.required.toFixed(4)} SOL</p>
                <p>Swap Fee: {validationResult.swapFee.toFixed(4)} SOL</p>
                <p>Buffer: {validationResult.buffer.toFixed(4)} SOL</p>
              </div>
            )}
          </div>
        )}

        {swapStatus === 'success' && txData && (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2 mb-4">
                <CheckCircle className="h-4 w-4" />
                <span className="text-green-200">Atomic swap confirmed</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Your NFT atomic swap has been executed successfully! Both NFTs have been exchanged simultaneously and the swap fee has been sent to the fee collector.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                <p className="text-blue-200 text-sm">
                  <strong>Transaction ID:</strong> {txData.signature.slice(0, 8)}...{txData.signature.slice(-8)}
                </p>
                <p className="text-blue-100/80 text-xs mt-1">
                  <strong>Type:</strong> {txData.type} | <strong>Instructions:</strong> {txData.instructions}
                </p>
                {txData.feeCollector && (
                  <p className="text-blue-100/80 text-xs mt-1">
                    <strong>Fee Collector:</strong> {txData.feeCollector.slice(0, 8)}...{txData.feeCollector.slice(-8)}
                  </p>
                )}
                <p className="text-blue-100/80 text-xs mt-1">{txData.note}</p>
              </div>
              {txData.signature && (
                <a
                  href={txData.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-purple-400 hover:text-purple-300 text-sm underline"
                >
                  <span>View on Solana Explorer</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            
            <button
              onClick={onConfirm}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 rounded-xl font-bold transition-all duration-200"
            >
              Continue
            </button>
          </div>
        )}

        {swapStatus === 'error' && (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="inline-flex items-center space-x-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 mb-4">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-red-200">Swap failed</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                {error}
              </p>
              {validationResult && !validationResult.valid && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                  <p className="text-yellow-200 text-sm">
                    Balance: {validationResult.balance.toFixed(4)} SOL | Required: {validationResult.required.toFixed(4)} SOL
                  </p>
                  <p className="text-yellow-100/80 text-xs mt-1">
                    Get free devnet SOL from the Solana faucet
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setSwapStatus('pending')}
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-xl font-medium transition-all duration-200"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-xl font-medium transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};