use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod nft_swap {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        collection_id: String,
        swap_fee: u64,
    ) -> Result<()> {
        require!(collection_id.len() <= 32, SwapError::InvalidCollectionId);
        
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.collection_id = collection_id;
        pool.swap_fee = swap_fee;
        pool.nft_count = 0;
        pool.total_volume = 0;
        pool.bump = ctx.bumps.pool;
        
        msg!("Pool initialized successfully");
        Ok(())
    }

    pub fn update_pool_stats(
        ctx: Context<UpdatePoolStats>,
        nft_count: u32,
        volume: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
        require!(
            ctx.accounts.authority.key() == pool.authority,
            SwapError::Unauthorized
        );

        pool.nft_count = nft_count;
        pool.total_volume = pool.total_volume.checked_add(volume).unwrap();
        
        msg!("Pool stats updated successfully");
        Ok(())
    }

    pub fn deposit_sol(
        ctx: Context<DepositSol>,
        amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
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
        
        msg!("SOL deposited successfully");
        Ok(())
    }

    pub fn withdraw_sol(
        ctx: Context<WithdrawSol>,
        amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
        require!(
            ctx.accounts.authority.key() == pool.authority,
            SwapError::Unauthorized
        );

        // Transfer SOL from pool to authority
        **pool.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? += amount;
        
        msg!("SOL withdrawn successfully");
        Ok(())
    }

    pub fn create_swap_order(
        ctx: Context<CreateSwapOrder>,
        nft_mint: Pubkey,
        desired_traits: Vec<String>,
    ) -> Result<()> {
        let swap_order = &mut ctx.accounts.swap_order;
        swap_order.user = ctx.accounts.user.key();
        swap_order.nft_mint = nft_mint;
        swap_order.desired_traits = desired_traits;
        swap_order.is_active = true;
        swap_order.bump = ctx.bumps.swap_order;
        
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
        require!(swap_fee >= pool.swap_fee, SwapError::InsufficientFunds);

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

        // Update pool volume
        pool.total_volume = pool.total_volume.checked_add(swap_fee).unwrap();
        
        // Deactivate swap order
        swap_order.is_active = false;
        
        msg!("Swap executed successfully");
        Ok(())
    }
}

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
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePoolStats<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateSwapOrder<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 4 + 100 + 1 + 1, // Adjust space as needed
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
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    
    #[account(mut)]
    pub swap_order: Account<'info, SwapOrder>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: This is the fee collector account
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

#[error_code]
pub enum SwapError {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid operation")]
    InvalidOperation,
    #[msg("Collection ID must be 32 characters or less")]
    InvalidCollectionId,
}