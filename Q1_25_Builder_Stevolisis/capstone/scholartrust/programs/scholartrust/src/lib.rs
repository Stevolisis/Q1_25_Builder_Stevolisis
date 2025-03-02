use anchor_lang::{ prelude::*, system_program::{ transfer, Transfer } };

declare_id!("6FNxriJHA11Per2YzEiGDMJ1iJsN64Khx3D3iE64U5SF");

#[program]
pub mod scholartrust {
    use super::*;

    pub fn initialize(ctx: Context<CreateSholarship>, application_limit: u64, funds: u64) -> Result<()> {
        ctx.accounts.create_scholarship(application_limit, funds)?;
        Ok(())
    }

    
    pub fn apply_for_scholarship(ctx: Context<ApplyForScholarship>, ipfs_hash: String) -> Result<()> {
        ctx.accounts.apply_for_scholarship(ipfs_hash)?;
        Ok(())
    }

    pub fn approve_student(ctx: Context<ProcessStudentApplication>) -> Result<()> {
        ctx.accounts.approve_student()?;
        Ok(())
    }

    pub fn reject_student(ctx: Context<ProcessStudentApplication>) -> Result<()> {
        ctx.accounts.reject_student()?;
        Ok(())
    }

    pub fn disburse_funds(ctx: Context<DisburseFunds>) -> Result<()> {
        ctx.accounts.disburse_funds()?;
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
            disbursed: false,
            is_closed: false,
            creation_timestamp: Clock::get()?.unix_timestamp as u64,  
            approved_students: Vec::new(),
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

#[derive(Accounts)]
pub struct ApplyForScholarship<'info> {
    #[account(mut)]
    pub student: Signer<'info>,

    #[account(mut)]
    pub escrow: Account<'info, ScholarshipEscrow>,

    #[account(
        init,
        payer = student,
        seeds = [b"application", student.key().as_ref(), escrow.key().as_ref()],
        bump,
        space = StudentApplication::INIT_SPACE
    )]
    pub student_application: Account<'info, StudentApplication>,
    pub system_program: Program<'info,System>,
}

impl <'info> ApplyForScholarship <'info> {
    pub fn apply_for_scholarship(&mut self, ipfs_hash: String) -> Result<()> {
        require!(!self.escrow.is_closed, ErrorCode::ScholarshipClosed);
        self.student_application.set_inner(StudentApplication{
            student: self.student.key(),
            scholarship: self.escrow.key(),
            ipfs_hash: ipfs_hash,
            status: 0,
            creation_timestamp: Clock::get()?.unix_timestamp as u64,
        });
        self.escrow.applied += 1;

        if self.escrow.applied == self.escrow.application_limit {
            self.escrow.is_closed = true;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct ProcessStudentApplication<'info> {
    #[account(mut)]
    pub escrow: Account<'info, ScholarshipEscrow>,

    #[account(mut)]
    pub student: Account<'info, StudentApplication>,

    #[account(
        mut
    )]
    pub sponsor: Signer<'info>,
}

impl <'info> ProcessStudentApplication <'info> {
    pub fn approve_student(&mut self) -> Result<()> {
        let escrow = &mut self.escrow;
        let student = &mut self.student;

        if student.status != 0 {
            return Err(ErrorCode::AlreadyProcessed.into());
        }

        if escrow.approved >= escrow.application_limit {
            return Err(ErrorCode::ScholarshipFull.into());
        }

        student.status = 1;
        escrow.approved += 1;
        escrow.approved_students.push(student.student);

        if escrow.approved == escrow.application_limit {
            escrow.is_closed = true;
        }

        Ok(())
    }

    pub fn reject_student(&mut self) -> Result<()> {
        let escrow = &mut self.escrow;
        let student = &mut self.student;

        if student.status != 0 {
            return Err(ErrorCode::AlreadyProcessed.into());
        }

        if escrow.approved >= escrow.application_limit {
            return Err(ErrorCode::ScholarshipFull.into());
        }

        student.status = 2;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct DisburseFunds<'info> {
    #[account(mut)]
    pub escrow: Account<'info, ScholarshipEscrow>,

    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub student: Account<'info, StudentApplication>,

    #[account(mut)]
    pub sponsor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> DisburseFunds<'info> {
    pub fn disburse_funds(&mut self) -> Result<()> {
        // Ensure the scholarship is closed
        require!(self.escrow.is_closed, ErrorCode::ScholarshipClosed);

        // Ensure funds have not already been disbursed
        require!(!self.escrow.disbursed, ErrorCode::AlreadyDisbursed);

        // Calculate the amount per student
        let amount_per_student = self.escrow.funds / self.escrow.approved;

        // Clone the list of approved students to avoid borrowing issues
        let approved_students = self.escrow.approved_students.clone();


        // Iterate over approved students
        // for student_pubkey in approved_students {

        //     // Store the escrow key in a variable to avoid temporary value issues
        //     let escrow_key = self.escrow.key();

        //     // Iterate over approved students
        //     for student_pubkey in approved_students {
        //         // Create a mutable u64 variable for lamports
        //         let mut lamports = 0u64;

        //         // Transfer funds from vault to student
        //         let cpi_program = self.system_program.to_account_info();
        //         let cpi_accounts = Transfer {
        //             from: self.vault.to_account_info(),
        //             to: AccountInfo::new(
        //                 &student_pubkey, // Clone the Pubkey
        //                 false, // is_signer
        //                 false, // is_writable
        //                 &mut lamports, // lamports (mutable reference)
        //                 &mut [], // data (mutable slice)
        //                 &escrow_key, // owner (escrow's key)
        //                 false, // executable
        //                 0, // rent_epoch
        //             ),
        //         };
        //         let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        //         transfer(cpi_ctx, amount_per_student)?;
        //     }

        //     // Mark the scholarship as disbursed
        //     self.escrow.disbursed = true;
        // }
        self.escrow.disbursed = true;
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
    pub disbursed: bool,
    pub is_closed: bool,
    pub creation_timestamp: u64,
    pub approved_students: Vec<Pubkey>,
}

impl ScholarshipEscrow {
    pub const INIT_SPACE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 8 + 4 + (32 * 10);
}

#[account]
pub struct StudentApplication {
    pub student: Pubkey,
    pub scholarship: Pubkey,
    pub ipfs_hash: String,
    pub status: u64,
    pub creation_timestamp: u64
}

impl StudentApplication {
    pub const INIT_SPACE: usize = 8 + 32 + 32 + 4 + 50 + 8 + 8; // 142 bytes
}

#[error_code]
pub enum ErrorCode {
    #[msg("The Scholarship is closed")]
    ScholarshipClosed,

    #[msg("The application has already been processed.")]
    AlreadyProcessed,

    #[msg("The scholarship is full.")]
    ScholarshipFull,

    #[msg("Scholarship already disbursed.")]
    AlreadyDisbursed,
}
// #[account]
// pub struct InitializeBumps {
//     pub escrow: u8,
//     pub vault: u8,
// }