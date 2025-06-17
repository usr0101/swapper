use anchor_lang::prelude::*;

declare_id!("B4eBSHpFutVS5L2YtcwqvLKuEsENVQn5TH2uL6wwnt37");

#[program]
pub mod nft_swap {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        collection_id: String,
        swap_fee: u64,
    ) -> Result<()> {
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

    pub fn update_pool(
        ctx: Context<UpdatePool>,
        nft_count: u32,
        volume: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
        require!(
            ctx.accounts.authority.key() == pool.authority,
            SwapError::Unauthorized
        );

        pool.nft_count = nft_count;
        pool.total_volume = volume;
        
        msg!("Pool updated successfully");
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(collection_id: String)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + 32 + 8 + 4 + 8 + 1,
        seeds = [b"pool", collection_id.as_bytes()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePool<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    
    pub authority: Signer<'info>,
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

#[error_code]
pub enum SwapError {
    #[msg("Unauthorized access")]
    Unauthorized,
}