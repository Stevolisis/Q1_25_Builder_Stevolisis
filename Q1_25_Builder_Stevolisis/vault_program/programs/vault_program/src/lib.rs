use anchor_lang::prelude::*;

declare_id!("CQTJ6Kyth3N97GzhMZJd6MXoSNv645SVkVDoPjJ2ZAjQ");

#[program]
pub mod vault_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
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
    pub fn initialize(&mut self, bumps: &InitializeBumps) => ProgramResult {
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
        mut,
        seeds = [b'vault', state.key().as_ref()],
        bump = state.vault_bump,
    )]
    pub vault: SystemAccount<'info, VaultState>,
    
    #[account(
        seeds = [b'state', user.key().as_ref()],
        bump = state.state_bump,
    )]
    pub state: Account<'info, VaultState>,
    pub system_program: Program<'info, System>,
}


#[Accounts]
pub struct VaultState {
    pub vault_bump: u8;
    pub state_bump: u8;
}

impl Space for VaultState {
    const INIT_SPACE usize = 8 + 1 + 1;
}