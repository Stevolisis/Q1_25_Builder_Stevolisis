use anchor_lang::{ prelude::*, system_program::{ transfer, Transfer }};

declare_id!("CQTJ6Kyth3N97GzhMZJd6MXoSNv645SVkVDoPjJ2ZAjQ");

#[program]
pub mod vault_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps);
    }

}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init,
        payer = user,
        seeds = [b'state', user.key().as_ref()],
        bump,
        space = VaultState::INIT_SPACE,
    )]
    pub state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b'vault', state.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

impl <'info> Initialize <'info> {
    pub fn initialize(&mut self, bumps: &InitializeBumps) -> Result<()> {
        self.state.vault_bump = bumps.vault;
        self.state.state_bump = bumps.state;
        Ok(())
    }
}


#[derive(Accounts)]
pub struct Deposit<'info>{
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b'state', user.key().as_ref()],
        bump = state.state_bump,
    )]
    pub state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b'vault', state.key().as_ref()],
        bump = state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

imp, <'info> Deposit <'info> {
    pub fn deposit(&mut self, amount:u6) -> Result<()> {
        let cpi_program: AccountInfo<'_> = self.system_program.to_account_info();
        let cpi_accounts: Transfer<'_> = Transfer {
            from: self.user.to_account_info(),
            to: self.vault.to_account_info()
        };
        let cpi_ctx: CpiContext<'_, '_, '_, '_> = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_ctx, lamports:amount)?;
    }
}

#[Accounts]
pub struct VaultState {
    pub vault_bump: u8;
    pub state_bump: u8;
}

impl Space for VaultState {
    const INIT_SPACE usize = 8 + 1 + 1;
}