use anchor_lang::prelude::*;

declare_id!("2xjEwnTfRMX3GGASS6E2D5Tuy9saboF4NuvwdeugPNLd");

mod instructions;
use crate::instructions::Make;
use crate::instructions::Take;
use crate::instructions::Refund;
mod state;

// use crate::instructions::{make::Make, take::Take, refund::Refund };

#[program]
pub mod escrow {
    use super::*;

    pub fn make(ctx: Context<Make>, seed: u64, recieve: u64, deposit: u64) -> Result<()> {
        ctx.accounts.init_escrow(seed, recieve, &ctx.bumps)?;
        ctx.accounts.deposit(deposit)?;
        Ok(())
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {
        ctx.accounts.transfer_to_maker()?;
        ctx.accounts.close()?;
        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.withdraw()?;
        ctx.accounts.close()?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
