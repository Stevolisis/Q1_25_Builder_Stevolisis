use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        transfer_checked,
        Mint,
        TokenInterface,
        TokenAccount,
        TransferChecked,
    },
   token::{close_account, CloseAccount} 
};

use crate::state::Escrow;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Take <'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(mut)]
    pub maker: SystemAccount<'info>,
    pub mint_a: InterfaceAccount<'info, Mint>,
    pub mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = mint_b,
        associated_token::authority = maker,
    )]
    pub maker_ata_b: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = mint_a,
        associated_token::authority = taker,
    )]
    pub taker_ata_a: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = taker,
    )]
    pub taker_ata_b: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        close = maker,
        has_one = mint_b,
        has_one = mint_a,
        seeds = [b"escrow", maker.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = escrow,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>
}

impl <'info> Take <'info> {
    pub fn transfer_to_maker(&mut self) -> Result<()> {
        let recieve = self.escrow.recieve;
        
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: self.taker_ata_b.to_account_info(),
            to: self.maker_ata_b.to_account_info(),
            authority: self.taker.to_account_info(),
            mint: self.mint_b.to_account_info()
        };
        let cpi_ctx: CpiContext<'_, '_, '_, '_, _> = CpiContext::new(cpi_program, cpi_accounts);
        transfer_checked(cpi_ctx, recieve, self.mint_b.decimals)?;

        let cpi_accounts = TransferChecked {
            from: self.vault.to_account_info(),
            to: self.taker_ata_a.to_account_info(),
            authority: self.escrow.to_account_info(),
            mint: self.mint_a.to_account_info()
        };

        let maker_key = self.maker.key();
        let seed_bytes = self.escrow.seed.to_le_bytes();
        let seeds = &[
            b"escrow",
            maker_key.as_ref(),
            &seed_bytes[..],
        ];
        
        let signer_seeds = &[&seeds[..]];

        let cpi_ctx: CpiContext<'_, '_, '_, '_, _> = CpiContext::new_with_signer(
            cpi_program, 
            cpi_accounts, 
            signer_seeds
        );
        transfer_checked(cpi_ctx, recieve, self.mint_a.decimals)?;

        Ok(())
    }
    pub fn close(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = CloseAccount {
            account: self.vault.to_account_info(),
            destination: self.maker.to_account_info(), // Rent goes back to the maker
            authority: self.escrow.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            cpi_accounts,
            &[&[b"escrow", self.maker.key().as_ref(), &[self.escrow.bump]]],
        );
        close_account(cpi_ctx)?;
        Ok(())
    }
    
    pub fn close(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = CloseAccount {
            account: self.vault.to_account_info(),
            destination: self.maker.to_account_info(), // Rent goes back to the maker
            authority: self.escrow.to_account_info(),
        };
    
        let maker_key = self.maker.key();
        let bump = self.escrow.bump;
        let bump_slice = &[bump]; // Store the bump in a variable
    
        let seeds = &[
            b"escrow",
            maker_key.as_ref(),
            bump_slice,
        ];
    
        let signer_seeds = &[&seeds[..]];
    
        let cpi_ctx = CpiContext::new_with_signer(
            &cpi_program,
            cpi_accounts,
            signer_seeds,
        );
        close_account(cpi_ctx)?;
        Ok(())
    }
}