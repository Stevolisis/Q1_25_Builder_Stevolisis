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
  let escrowBump: number;
  let vaultBump: number;
  let escrowPda: anchor.web3.PublicKey;
  let vaultPda: anchor.web3.PublicKey;
  const applicationLimit = new anchor.BN(10);
  const funds = new anchor.BN(100_000_000); // 0.1 SOL

  before("Creating and initializing Accounts!", async () => {
    sponsor = anchor.web3.Keypair.generate();
    await provider.connection.confirmTransaction({
      signature: await provider.connection.requestAirdrop(sponsor.publicKey, 1e9), // 1 SOL
      blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight,
    });
  });

  it("Create Scholarship!", async () => {
    // Derive the escrow PDA.
    [escrowPda, escrowBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), sponsor.publicKey.toBuffer()],
      program.programId
    );

    // Derive the vault PDA.
    [vaultPda, vaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
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
});