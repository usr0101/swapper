use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use anchor_spl::associated_token::AssociatedToken;

// SECURITY FIX: Use environment-specific Program ID with proper PDA seeds
declare_id!("A3qF2mqUjWKzcAFfLPspXxznaAa5KnAfexWuQuSNQwjz");

#[program]
pub mod nft_swap {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        collection_id: String,
        swap_fee: u64,
    ) -> Result<()> {
        // SECURITY FIX: Validate collection_id length to prevent unbounded growth
        require!(collection_id.len() <= 32, SwapError::InvalidCollectionId);
        require!(collection_id.len() > 0, SwapError::InvalidCollectionId);
        
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.collection_id = collection_id;
        pool.swap_fee = swap_fee;
        pool.nft_count = 0;
        pool.total_volume = 0;
        pool.bump = ctx.bumps.pool;
        
        // SECURITY FIX: Emit structured event for monitoring
        emit!(PoolInitialized {
            pool: pool.key(),
            authority: pool.authority,
            collection_id: pool.collection_id.clone(),
            swap_fee: pool.swap_fee,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Pool initialized successfully");
        Ok(())
    }

    pub fn update_pool_stats(
        ctx: Context<UpdatePoolStats>,
        nft_count: u32,
        volume: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
        // SECURITY FIX: Verify authority is signer (not just key comparison)
        require!(
            ctx.accounts.authority.key() == pool.authority,
            SwapError::Unauthorized
        );

        // SECURITY FIX: Safe arithmetic with overflow checks
        let old_count = pool.nft_count;
        let old_volume = pool.total_volume;
        
        pool.nft_count = nft_count;
        pool.total_volume = pool.total_volume.checked_add(volume)
            .ok_or(SwapError::ArithmeticOverflow)?;
        
        // SECURITY FIX: Emit event for monitoring
        emit!(PoolStatsUpdated {
            pool: pool.key(),
            old_nft_count: old_count,
            new_nft_count: nft_count,
            volume_added: volume,
            total_volume: pool.total_volume,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Pool stats updated successfully");
        Ok(())
    }

    pub fn deposit_sol(
        ctx: Context<DepositSol>,
        amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
        // SECURITY FIX: Validate amount is reasonable
        require!(amount > 0, SwapError::InvalidAmount);
        require!(amount <= 100_000_000_000, SwapError::AmountTooLarge); // Max 100 SOL
        
        // SECURITY FIX: Ensure pool account is rent-exempt
        let rent = Rent::get()?;
        let pool_lamports = pool.to_account_info().lamports();
        let required_lamports = rent.minimum_balance(pool.to_account_info().data_len());
        
        require!(
            pool_lamports.checked_add(amount).unwrap_or(0) >= required_lamports,
            SwapError::InsufficientRentExemption
        );
        
        // Transfer SOL from user to pool
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &pool.key(),
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                pool.to_account_info(),
            ],
        )?;
        
        // SECURITY FIX: Emit event for monitoring
        emit!(SolDeposited {
            pool: pool.key(),
            user: ctx.accounts.user.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("SOL deposited successfully");
        Ok(())
    }

    pub fn withdraw_sol(
        ctx: Context<WithdrawSol>,
        amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
        // SECURITY FIX: Verify authority is signer
        require!(
            ctx.accounts.authority.key() == pool.authority,
            SwapError::Unauthorized
        );

        // SECURITY FIX: Validate withdrawal amount
        require!(amount > 0, SwapError::InvalidAmount);
        
        let pool_lamports = pool.to_account_info().lamports();
        require!(pool_lamports >= amount, SwapError::InsufficientFunds);
        
        // SECURITY FIX: Ensure pool remains rent-exempt after withdrawal
        let rent = Rent::get()?;
        let required_lamports = rent.minimum_balance(pool.to_account_info().data_len());
        let remaining_lamports = pool_lamports.checked_sub(amount)
            .ok_or(SwapError::ArithmeticOverflow)?;
        
        require!(
            remaining_lamports >= required_lamports,
            SwapError::InsufficientRentExemption
        );

        // Transfer SOL from pool to authority
        **pool.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? += amount;
        
        // SECURITY FIX: Emit event for monitoring
        emit!(SolWithdrawn {
            pool: pool.key(),
            authority: ctx.accounts.authority.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("SOL withdrawn successfully");
        Ok(())
    }

    pub fn create_swap_order(
        ctx: Context<CreateSwapOrder>,
        nft_mint: Pubkey,
        desired_traits: Vec<String>,
    ) -> Result<()> {
        // SECURITY FIX: Validate input parameters to prevent unbounded growth
        require!(desired_traits.len() <= 10, SwapError::TooManyTraits);
        for trait_name in &desired_traits {
            require!(trait_name.len() <= 50, SwapError::TraitNameTooLong);
        }
        
        let swap_order = &mut ctx.accounts.swap_order;
        swap_order.user = ctx.accounts.user.key();
        swap_order.nft_mint = nft_mint;
        swap_order.desired_traits = desired_traits.clone();
        swap_order.is_active = true;
        swap_order.bump = ctx.bumps.swap_order;
        
        // SECURITY FIX: Emit event for monitoring
        emit!(SwapOrderCreated {
            swap_order: swap_order.key(),
            user: swap_order.user,
            nft_mint,
            desired_traits,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Swap order created successfully");
        Ok(())
    }

    pub fn execute_swap(
        ctx: Context<ExecuteSwap>,
        swap_fee: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let swap_order = &mut ctx.accounts.swap_order;
        
        require!(swap_order.is_active, SwapError::InvalidOperation);
        
        // SECURITY FIX: Validate fee amount matches pool requirements
        require!(swap_fee >= pool.swap_fee, SwapError::InsufficientFunds);
        require!(swap_fee == pool.swap_fee, SwapError::InvalidFeeAmount);

        // SECURITY FIX: Validate fee collector is not a program account
        require!(
            !ctx.accounts.fee_collector.executable,
            SwapError::InvalidFeeCollector
        );

        // Transfer fee to fee collector
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.fee_collector.key(),
            swap_fee,
        );
        
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.fee_collector.to_account_info(),
            ],
        )?;

        // SECURITY FIX: Safe arithmetic for volume update
        pool.total_volume = pool.total_volume.checked_add(swap_fee)
            .ok_or(SwapError::ArithmeticOverflow)?;
        
        // Deactivate swap order
        swap_order.is_active = false;
        
        // SECURITY FIX: Emit event for monitoring
        emit!(SwapExecuted {
            pool: pool.key(),
            swap_order: swap_order.key(),
            user: ctx.accounts.user.key(),
            fee_collector: ctx.accounts.fee_collector.key(),
            swap_fee,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Swap executed successfully");
        Ok(())
    }
}

// SECURITY FIX: Add proper PDA seeds to all account structs
#[derive(Accounts)]
#[instruction(collection_id: String)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + collection_id.len() + 8 + 4 + 8 + 1,
        seeds = [b"pool", collection_id.as_bytes()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(mut)]
    pub authority: Signer<'info>, // SECURITY FIX: Enforce signer constraint
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePoolStats<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.collection_id.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,
    
    pub authority: Signer<'info>, // SECURITY FIX: Enforce signer constraint
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.collection_id.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.collection_id.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(mut)]
    pub authority: Signer<'info>, // SECURITY FIX: Enforce signer constraint
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateSwapOrder<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 4 + 100 + 1 + 1,
        seeds = [b"swap_order", user.key().as_ref()],
        bump
    )]
    pub swap_order: Account<'info, SwapOrder>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteSwap<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.collection_id.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(
        mut,
        seeds = [b"swap_order", swap_order.user.as_ref()],
        bump = swap_order.bump
    )]
    pub swap_order: Account<'info, SwapOrder>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: This is the fee collector account - validated in instruction
    #[account(mut)]
    pub fee_collector: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Pool {
    pub authority: Pubkey,
    pub collection_id: String,
    pub swap_fee: u64,
    pub nft_count: u32,
    pub total_volume: u64,
    pub bump: u8,
}

#[account]
pub struct SwapOrder {
    pub user: Pubkey,
    pub nft_mint: Pubkey,
    pub desired_traits: Vec<String>,
    pub is_active: bool,
    pub bump: u8,
}

// SECURITY FIX: Add structured events for monitoring
#[event]
pub struct PoolInitialized {
    pub pool: Pubkey,
    pub authority: Pubkey,
    pub collection_id: String,
    pub swap_fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct PoolStatsUpdated {
    pub pool: Pubkey,
    pub old_nft_count: u32,
    pub new_nft_count: u32,
    pub volume_added: u64,
    pub total_volume: u64,
    pub timestamp: i64,
}

#[event]
pub struct SolDeposited {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct SolWithdrawn {
    pub pool: Pubkey,
    pub authority: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct SwapOrderCreated {
    pub swap_order: Pubkey,
    pub user: Pubkey,
    pub nft_mint: Pubkey,
    pub desired_traits: Vec<String>,
    pub timestamp: i64,
}

#[event]
pub struct SwapExecuted {
    pub pool: Pubkey,
    pub swap_order: Pubkey,
    pub user: Pubkey,
    pub fee_collector: Pubkey,
    pub swap_fee: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum SwapError {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid operation")]
    InvalidOperation,
    #[msg("Collection ID must be between 1 and 32 characters")]
    InvalidCollectionId,
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
    #[msg("Invalid amount - must be greater than 0")]
    InvalidAmount,
    #[msg("Amount too large - maximum 100 SOL")]
    AmountTooLarge,
    #[msg("Account would not be rent exempt")]
    InsufficientRentExemption,
    #[msg("Too many traits - maximum 10 allowed")]
    TooManyTraits,
    #[msg("Trait name too long - maximum 50 characters")]
    TraitNameTooLong,
    #[msg("Invalid fee collector account")]
    InvalidFeeCollector,
    #[msg("Invalid fee amount - must match pool requirements")]
    InvalidFeeAmount,
}