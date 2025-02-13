use anchor_lang::prelude::*;

declare_id!("7gYYBx9NfW8jdbmxgDvg6joBoV1Ms5hKxfVDx1c7ZuZE");

#[program]
pub mod market_place {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
