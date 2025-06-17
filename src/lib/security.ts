// Security utilities and validation functions

import { PublicKey } from '@solana/web3.js';

// Environment validation
export const validateEnvironment = () => {
  const issues: string[] = [];
  
  // Check required environment variables
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_ADMIN_WALLET',
    'VITE_SOLANA_NETWORK'
  ];
  
  requiredVars.forEach(varName => {
    const value = import.meta.env[varName];
    if (!value || value.includes('your_') || value.includes('_here')) {
      issues.push(`${varName} not properly configured`);
    }
  });
  
  // Validate network
  const network = import.meta.env.VITE_SOLANA_NETWORK;
  if (network && !['devnet', 'mainnet-beta', 'localnet'].includes(network)) {
    issues.push('VITE_SOLANA_NETWORK must be devnet, mainnet-beta, or localnet');
  }
  
  // Validate admin wallet format
  const adminWallet = import.meta.env.VITE_ADMIN_WALLET;
  if (adminWallet && !isValidSolanaAddress(adminWallet)) {
    issues.push('VITE_ADMIN_WALLET is not a valid Solana address');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

// Validate Solana address format
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

// Sanitize user input
export const sanitizeInput = (input: string, maxLength: number = 100): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
    .replace(/\s+/g, ' '); // Normalize whitespace
};

// Validate NFT mint address
export const validateNFTMint = (mint: string): boolean => {
  if (!mint || typeof mint !== 'string') return false;
  return isValidSolanaAddress(mint);
};

// Validate swap fee amount
export const validateSwapFee = (fee: number): boolean => {
  return typeof fee === 'number' && 
         fee >= 0 && 
         fee <= 10 && 
         !isNaN(fee) && 
         isFinite(fee);
};

// Rate limiting for API calls
class RateLimiter {
  private calls: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxCalls: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.calls.has(key)) {
      this.calls.set(key, []);
    }
    
    const callTimes = this.calls.get(key)!;
    
    // Remove old calls outside the window
    const validCalls = callTimes.filter(time => time > windowStart);
    
    if (validCalls.length >= maxCalls) {
      return false;
    }
    
    validCalls.push(now);
    this.calls.set(key, validCalls);
    
    return true;
  }
  
  reset(key: string): void {
    this.calls.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

// Secure random string generation
export const generateSecureId = (length: number = 16): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

// Validate URL format
export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

// Validate image URL
export const isValidImageUrl = (url: string): boolean => {
  if (!isValidUrl(url)) return false;
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const lowerUrl = url.toLowerCase();
  
  return imageExtensions.some(ext => lowerUrl.includes(ext)) ||
         lowerUrl.includes('ipfs') ||
         lowerUrl.includes('arweave') ||
         lowerUrl.includes('cloudinary');
};

// Content Security Policy headers
export const getCSPHeaders = () => {
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
  const isProduction = network === 'mainnet-beta';
  
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Vite dev
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.helius-rpc.com https://*.supabase.co https://explorer.solana.com wss://*.supabase.co",
      isProduction ? "upgrade-insecure-requests" : "",
    ].filter(Boolean).join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
};

// Audit logging
export const auditLog = (action: string, details: any, userId?: string) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    details,
    userId,
    userAgent: navigator.userAgent,
    url: window.location.href,
    network: import.meta.env.VITE_SOLANA_NETWORK,
  };
  
  // In production, send to monitoring service
  if (import.meta.env.VITE_SOLANA_NETWORK === 'mainnet-beta') {
    // Send to monitoring service
    console.log('AUDIT:', logEntry);
  } else {
    console.log('AUDIT:', logEntry);
  }
};

// Error boundary for security errors
export class SecurityError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

// Validate transaction parameters
export const validateTransactionParams = (params: {
  userNFTMint: string;
  poolNFTMint: string;
  swapFee: number;
  userWallet: string;
}): void => {
  if (!validateNFTMint(params.userNFTMint)) {
    throw new SecurityError('Invalid user NFT mint address', 'INVALID_USER_NFT');
  }
  
  if (!validateNFTMint(params.poolNFTMint)) {
    throw new SecurityError('Invalid pool NFT mint address', 'INVALID_POOL_NFT');
  }
  
  if (!validateSwapFee(params.swapFee)) {
    throw new SecurityError('Invalid swap fee amount', 'INVALID_SWAP_FEE');
  }
  
  if (!isValidSolanaAddress(params.userWallet)) {
    throw new SecurityError('Invalid user wallet address', 'INVALID_USER_WALLET');
  }
};

// Monitor for suspicious activity
export const monitorActivity = (activity: {
  type: string;
  frequency: number;
  threshold: number;
  windowMs: number;
}) => {
  const key = `${activity.type}_${Date.now()}`;
  
  if (!rateLimiter.isAllowed(key, activity.threshold, activity.windowMs)) {
    auditLog('SUSPICIOUS_ACTIVITY', {
      type: activity.type,
      frequency: activity.frequency,
      threshold: activity.threshold,
    });
    
    throw new SecurityError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
  }
};