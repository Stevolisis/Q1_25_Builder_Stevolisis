use super::*;

pub fn make(ctx: Context<Make>, seed: u64, receive: u64, deposit: u64) -> Result<()> {
    ctx.accounts.init_escrow(seed, receive, ctx.bumps)?;
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
