use anchor_lang::{ prelude::*, system_program::{ transfer, Transfer } };

declare_id!("6FNxriJHA11Per2YzEiGDMJ1iJsN64Khx3D3iE64U5SF");

#[program]
pub mod scholartrust {
    use super::*;

    pub fn initialize(ctx: Context<CreateSholarship>, application_limit: u64, funds: u64) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        ctx.accounts.create_scholarship(application_limit, funds);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateSholarship<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,

    #[account(
        init,
        payer = sponsor,
        seeds = [b"escrow", sponsor.key().as_ref()],
        bump,
        space = ScholarshipEscrow::INIT_SPACE
    )]
    pub escrow: Account<'info, ScholarshipEscrow>,

    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info,System>,
}

impl <'info> CreateSholarship <'info> {
    pub fn create_scholarship(&mut self, application_limit: u64, funds: u64) -> Result<()> {
        self.escrow.set_inner(ScholarshipEscrow {
            sponsor: self.sponsor.key(),
            funds: funds,
            application_limit: application_limit,
            applied: 0,
            approved: 0,
            is_closed: false,
            creation_timestamp: Clock::get()?.unix_timestamp as u64,  
        });

        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.sponsor.to_account_info(),
            to: self.vault.to_account_info()
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_ctx, funds);
        Ok(())
    }
}

#[account]
pub struct ScholarshipEscrow {
    pub sponsor: Pubkey,
    pub funds: u64,
    pub application_limit: u64,
    pub applied: u64,
    pub approved: u64,
    pub is_closed: bool,
    pub creation_timestamp: u64,
}

impl ScholarshipEscrow {
    pub const INIT_SPACE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 1 + 8;
}
// #[account]
// pub struct InitializeBumps {
//     pub escrow: u8,
//     pub vault: u8,
// }