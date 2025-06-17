# 🔒 Security Best Practices

## 🚨 Critical Security Issues Fixed

### 1. Environment Variables
**BEFORE (Vulnerable):**
- API keys hardcoded in source code
- Production credentials in `.env` committed to Git
- Same Program ID across all environments

**AFTER (Secure):**
- All sensitive data moved to environment variables
- `.env` added to `.gitignore`
- `.env.example` template provided
- Network-specific Program IDs

### 2. API Key Management
**BEFORE:**
```javascript
const API_KEY = 'd260d547-850c-4cb6-8412-9c764f0c9df1'; // Hardcoded!
```

**AFTER:**
```javascript
const apiKey = import.meta.env.VITE_HELIUS_API_KEY; // From environment
```

### 3. Program ID Security
**BEFORE:**
- Same Program ID for devnet and mainnet
- Risk of state corruption between clusters

**AFTER:**
- Separate Program IDs per environment
- Environment-specific configuration
- Proper cluster isolation

## 🛡️ Security Checklist

### ✅ Environment Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in your actual API keys and credentials
- [ ] Never commit `.env` to version control
- [ ] Use different Program IDs for each environment
- [ ] Verify `.gitignore` includes sensitive files

### ✅ API Keys
- [ ] Use your own Helius API key
- [ ] Use your own Supabase credentials
- [ ] Rotate API keys regularly
- [ ] Monitor API usage for anomalies

### ✅ Wallet Security
- [ ] Use different admin wallets for different environments
- [ ] Never commit private keys to Git
- [ ] Store wallet files securely
- [ ] Use hardware wallets for mainnet

### ✅ Program Deployment
- [ ] Deploy separate programs for devnet/mainnet
- [ ] Test thoroughly on devnet before mainnet
- [ ] Use upgrade authority carefully
- [ ] Monitor program accounts

## 🔧 Setup Instructions

### 1. Environment Configuration
```bash
# Copy the template
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Required Environment Variables
```env
# Supabase (get from supabase.com)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Helius API (get from helius.xyz)
VITE_HELIUS_API_KEY=your_helius_key_here

# Admin wallet (your wallet address)
VITE_ADMIN_WALLET=your_wallet_address_here

# Network (devnet or mainnet-beta)
VITE_SOLANA_NETWORK=devnet

# Program ID (different for each deployment)
VITE_PROGRAM_ID=your_program_id_here
```

### 3. Deployment Security
```bash
# For devnet
anchor build
anchor deploy --provider.cluster devnet

# For mainnet (separate program)
anchor build
anchor deploy --provider.cluster mainnet-beta
```

## 🚫 What NOT to Do

### ❌ Never Commit These Files:
- `.env` (contains secrets)
- `*.json` wallet files
- Private keys in any format
- API keys in source code

### ❌ Never Use Same Credentials For:
- Development and production
- Different team members
- Public repositories

### ❌ Never Hardcode:
- API keys
- Private keys
- Wallet addresses (use env vars)
- RPC endpoints with embedded keys

## 🔍 Security Monitoring

### Monitor These:
- API usage and rate limits
- Wallet transaction history
- Program account changes
- Unauthorized access attempts

### Set Up Alerts For:
- Unusual API usage patterns
- Large wallet transactions
- Program upgrade attempts
- Failed authentication attempts

## 🆘 Incident Response

### If API Keys Are Compromised:
1. Immediately rotate all affected keys
2. Update environment variables
3. Redeploy applications
4. Monitor for unauthorized usage
5. Review access logs

### If Wallet Is Compromised:
1. Transfer funds to secure wallet
2. Update admin wallet address
3. Revoke program authorities if needed
4. Update all configurations
5. Investigate breach source

## 📚 Additional Resources

- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/security)
- [Anchor Security Guidelines](https://book.anchor-lang.com/anchor_in_depth/security.html)
- [Environment Variable Security](https://12factor.net/config)
- [API Key Management](https://owasp.org/www-community/vulnerabilities/Insecure_Storage_of_Sensitive_Information)

## 🔄 Regular Security Tasks

### Weekly:
- Review API usage
- Check for new vulnerabilities
- Monitor wallet balances

### Monthly:
- Rotate API keys
- Review access permissions
- Update dependencies

### Quarterly:
- Security audit
- Penetration testing
- Backup verification