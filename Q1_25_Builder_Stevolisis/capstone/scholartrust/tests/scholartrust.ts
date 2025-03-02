import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Scholartrust } from "../target/types/scholartrust";
import { assert } from "chai";
import { Keypair } from '@solana/web3.js';

describe("scholartrust", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Scholartrust as Program<Scholartrust>;

  let sponsor: Keypair;
  let students: Keypair[];;
  let escrowBump: number;
  let studentApplicationPdas: anchor.web3.PublicKey[];
  let escrowPda: anchor.web3.PublicKey;
  let vaultPda: anchor.web3.PublicKey;
  const applicationLimit = new anchor.BN(2);
  const funds = new anchor.BN(100_000_000); // 0.1 SOL

  before("Creating and initializing Accounts!", async () => {
    sponsor = anchor.web3.Keypair.generate();
    await provider.connection.confirmTransaction({
      signature: await provider.connection.requestAirdrop(sponsor.publicKey, 1e9), // 1 SOL
      blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight,
    });

    students = [anchor.web3.Keypair.generate(), anchor.web3.Keypair.generate(), anchor.web3.Keypair.generate()];
    for (const student of students) {
      await provider.connection.confirmTransaction({
        signature: await provider.connection.requestAirdrop(student.publicKey, 1e9), // 1 SOL
        blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
        lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight,
      });
    }
  });

  it("Create Scholarship!", async () => {
    // Derive the escrow PDA.
    [escrowPda, escrowBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), sponsor.publicKey.toBuffer()],
      program.programId
    );

    // Derive the vault PDA.
    [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowPda.toBuffer()],
      program.programId
    );

    console.log("EscrowPda: ", escrowPda.toString());
    console.log("VaultPda: ", vaultPda.toString());

    // Get the initial balance of the sponsor and vault accounts.
    const initialSponsorBalance = await provider.connection.getBalance(sponsor.publicKey);
    const initialVaultBalance = await provider.connection.getBalance(vaultPda);

    console.log("Initial Sponsor Balance: ", initialSponsorBalance);
    console.log("Initial Vault Balance: ", initialVaultBalance);

    // Call the initialize function.
    const txSignature = await program.methods
      .initialize(applicationLimit, funds)
      .accounts({
        sponsor: sponsor.publicKey,
        escrow: escrowPda,
        vault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([sponsor])
      .rpc();

    console.log("Transaction Signature: ", txSignature);

    // Get the final balance of the sponsor and vault accounts.
    const finalSponsorBalance = await provider.connection.getBalance(sponsor.publicKey);
    const finalVaultBalance = await provider.connection.getBalance(vaultPda);

    console.log("Final Sponsor Balance: ", finalSponsorBalance);
    console.log("Final Vault Balance: ", finalVaultBalance);

    // Fetch the escrow account to verify its state.
    const escrowAccount = await program.account.scholarshipEscrow.fetch(escrowPda);
    console.log("Escrow Account: ", escrowAccount);

    // Assert that the escrow account was initialized correctly.
    assert.equal(
      escrowAccount.sponsor.toString(),
      sponsor.publicKey.toString(),
      "Sponsor public key does not match"
    );
    assert.equal(
      escrowAccount.funds.toString(),
      funds.toString(),
      "Funds do not match"
    );
    assert.equal(
      escrowAccount.applicationLimit.toString(),
      applicationLimit.toString(),
      "Application limit does not match"
    );
    assert.equal(
      escrowAccount.applied.toString(),
      "0",
      "Applied count is not zero"
    );
    assert.equal(
      escrowAccount.approved.toString(),
      "0",
      "Approved count is not zero"
    );
    assert.isFalse(escrowAccount.isClosed, "Escrow account is closed");

    // Assert that the funds were transferred correctly.
    const expectedSponsorBalance = initialSponsorBalance - funds.toNumber() - 5000; // Subtract funds and transaction fee
    const expectedVaultBalance = initialVaultBalance + funds.toNumber();

    // assert.approximately(
    //   finalSponsorBalance,
    //   expectedSponsorBalance,
    //   10000, // Allow a small margin of error for transaction fees
    //   "Sponsor balance is incorrect"
    // );
    assert.equal(
      finalVaultBalance,
      expectedVaultBalance,
      "Vault balance is incorrect"
    );
  });

  
  it("Apply for Scholarship!", async () => {
    // Derive the escrow PDA.
    studentApplicationPdas = [];

    [escrowPda, escrowBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), sponsor.publicKey.toBuffer()],
      program.programId
    );

    for (let i = 0; i < 2; i++) {
      const student = students[i];

      // Derive the student application PDA.
      const [studentApplicationPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("application"), student.publicKey.toBuffer(), escrowPda.toBuffer()],
        program.programId
      );
      studentApplicationPdas.push(studentApplicationPda);

      const ipfsHash = `QmExampleIPFSHash${i}`;
      await program.methods
        .applyForScholarship(ipfsHash)
        .accounts({
          escrow: escrowPda,
          studentApplication: studentApplicationPda,
          student: student.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([student])
        .rpc();

        const studentApplication = await program.account.studentApplication.fetch(studentApplicationPda);

        // Assert that the student application was created correctly.
        assert.equal(
          studentApplication.student.toString(),
          student.publicKey.toString(),
          "Student public key does not match"
        );
        assert.equal(
          studentApplication.scholarship.toString(),
          escrowPda.toString(),
          "Scholarship public key does not match"
        );
        assert.equal(
          studentApplication.ipfsHash,
          ipfsHash,
          "IPFS hash does not match"
        );
        assert.equal(
          studentApplication.status.toString(),
          "0",
          "Application status is not pending"
        );
    }

      console.log("EscrowPda", escrowPda);  
      // Fetch the escrow account to verify the applied count.
      const escrowAccount = await program.account.scholarshipEscrow.fetch(escrowPda);
      assert.equal(
        escrowAccount.applied.toString(),
        "2",
        "Applied count is not 2"
      );
  });

  it("Fail to Apply for Scholarship (Third Student)", async () => {
    const student = students[2]; // Third student tries to apply

    // Derive the student application PDA.
    const [studentApplicationPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("application"), student.publicKey.toBuffer(), escrowPda.toBuffer()],
      program.programId
    );

    const ipfsHash = "QmExampleIPFSHash2";
    try {
      await program.methods
        .applyForScholarship(ipfsHash)
        .accounts({
          escrow: escrowPda,
          studentApplication: studentApplicationPda,
          student: student.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([student])
        .rpc();

      assert.fail("Expected an error but the transaction succeeded");
    } catch (error) {
      console.log("Error: ", error);
      assert.include(error.message, "ScholarshipClosed");
    }
  });

  it("Approve First Student", async () => {
    const studentApplicationPda = studentApplicationPdas[0];

    // Approve the first student application.
    await program.methods
      .approveStudent()
      .accounts({
        escrow: escrowPda,
        student: studentApplicationPda,
        sponsor: sponsor.publicKey,
      })
      .signers([sponsor])
      .rpc();

    // Fetch the student application account to verify its state.
    const studentApplication = await program.account.studentApplication.fetch(studentApplicationPda);

    // Assert that the student application was approved.
    assert.equal(
      studentApplication.status.toString(),
      "1",
      "Application status is not approved"
    );

    // Fetch the escrow account to verify the approved count.
    const escrowAccount = await program.account.scholarshipEscrow.fetch(escrowPda);
    assert.equal(
      escrowAccount.approved.toString(),
      "1",
      "Approved count is not 1"
    );
  });

  it("Reject Second Student", async () => {
    const studentApplicationPda = studentApplicationPdas[1];

    // Reject the second student application.
    await program.methods
      .rejectStudent()
      .accounts({
        escrow: escrowPda,
        student: studentApplicationPda,
        sponsor: sponsor.publicKey,
      })
      .signers([sponsor])
      .rpc();

    // Fetch the student application account to verify its state.
    const studentApplication = await program.account.studentApplication.fetch(studentApplicationPda);

    // Assert that the student application was rejected.
    assert.equal(
      studentApplication.status.toString(),
      "2",
      "Application status is not rejected"
    );

    // Fetch the escrow account to verify the approved count.
    const escrowAccount = await program.account.scholarshipEscrow.fetch(escrowPda);
    assert.equal(
      escrowAccount.approved.toString(),
      "1",
      "Approved count should not change"
    );
  });

  it("Fail to Approve Already Processed Application", async () => {
    const studentApplicationPda = studentApplicationPdas[0];
    try {
      await program.methods
        .approveStudent()
        .accounts({
          escrow: escrowPda,
          student: studentApplicationPda,
          sponsor: sponsor.publicKey,
        })
        .signers([sponsor])
        .rpc();

      assert.fail("Expected an error but the transaction succeeded");
    } catch (error) {
      assert.include(error.message, "AlreadyProcessed");
    }
  });

  it("Fail to Reject Already Processed Application", async () => {
    const studentApplicationPda = studentApplicationPdas[1];

    try {
      await program.methods
        .rejectStudent()
        .accounts({
          escrow: escrowPda,
          student: studentApplicationPda,
          sponsor: sponsor.publicKey,
        })
        .signers([sponsor])
        .rpc();

      assert.fail("Expected an error but the transaction succeeded");
    } catch (error) {
      assert.include(error.message, "AlreadyProcessed");
    }
  });

  
});