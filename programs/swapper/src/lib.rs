use anchor_lang::prelude::*;
use anchor_spl::token::{self, TokenAccount, Token, Transfer};
declare_id!("REPLACE_WITH_YOUR_PROGRAM_ID_AFTER_DEPLOY");

#[program]
pub mod swapper {
  use super::*;

  pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    pool.admin = *ctx.accounts.admin.key;
    pool.collection = ctx.accounts.collection.key();
    pool.bump = *ctx.bumps.get("pool").unwrap();
    Ok(())
  }

  pub fn deposit_nft(ctx: Context<AdminDeposit>) -> Result<()> {
    let admin = &ctx.accounts.admin;
    require!(ctx.accounts.pool.admin == admin.key(), SwapError::Unauthorized);
    let source = &ctx.accounts.admin_token_account;
    require!(source.owner == *admin.key, SwapError::InvalidOwner);
    require!(source.amount == 1, SwapError::InvalidAmount);
    token::transfer(ctx.accounts.into_transfer_to_pool(), 1)?;
    Ok(())
  }

  pub fn swap_nft(ctx: Context<UserSwap>) -> Result<()> {
    let user = &ctx.accounts.user;
    let pool = &ctx.accounts.pool;
    require!(ctx.accounts.pool.collection == ctx.accounts.user_mint.key(), SwapError::CollectionMismatch);
    // Fee transfer
    let amount = 50_000_000; // 0.05 SOL
    let ix = anchor_lang::solana_program::system_instruction::transfer(
      user.key, &ctx.accounts.tax_wallet.key(), amount);
    anchor_lang::solana_program::program::invoke(&ix, &[
      user.to_account_info(),
      ctx.accounts.tax_wallet.to_account_info(),
      ctx.accounts.system_program.to_account_info(),
    ])?;
    // NFT swaps
    token::transfer(ctx.accounts.into_user_to_pool(), 1)?;
    let pool_seeds = &[b"pool", pool.collection.as_ref(), &[pool.bump]];
    token::transfer(
      ctx.accounts
        .into_pool_to_user()
        .with_signer(&[&pool_seeds[..]]),
      1,
    )?;
    Ok(())
  }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
  #[account(init, payer=admin, space=8+32+32+1, seeds=[b"pool", collection.key().as_ref()], bump)]
  pub pool: Account<'info, PoolAccount>,
  pub collection: AccountInfo<'info>,
  #[account(mut)]
  pub admin: Signer<'info>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminDeposit<'info> {
  #[account(mut, seeds=[b"pool", pool.collection.as_ref()], bump=pool.bump)]
  pub pool: Account<'info, PoolAccount>,
  #[account(mut)]
  pub admin: Signer<'info>,
  #[account(mut)]
  pub admin_token_account: Account<'info, TokenAccount>,
  pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UserSwap<'info> {
  #[account(mut, seeds=[b"pool", pool.collection.as_ref()], bump=pool.bump)]
  pub pool: Account<'info, PoolAccount>,
  #[account(mut)]
  pub user: Signer<'info>,
  #[account(mut)]
  pub user_token_account: Account<'info, TokenAccount>,
  pub user_mint: AccountInfo<'info>,
  #[account(mut)]
  pub pool_token_account: Account<'info, TokenAccount>,
  #[account(mut)]
  pub tax_wallet: AccountInfo<'info>,
  pub token_program: Program<'info, Token>,
  pub system_program: Program<'info, System>,
}

#[account]
pub struct PoolAccount {
  pub admin: Pubkey,
  pub collection: Pubkey,
  pub bump: u8,
}

#[error_code]
pub enum SwapError {
  #[msg("Unauthorized")]
  Unauthorized,
  #[msg("Invalid owner of token account")]
  InvalidOwner,
  #[msg("Invalid NFT amount")]
  InvalidAmount,
  #[msg("NFT collection mismatch")]
  CollectionMismatch,
}
