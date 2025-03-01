import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { TOKEN_PROGRAM_ID, createMint, getAssociatedTokenAddress, createAssociatedTokenAccount, mintTo, getAccount } from "@solana/spl-token";
import { assert } from "chai";

describe("escrow - make instruction", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Escrow as Program<Escrow>;
  const provider = anchor.getProvider();
  const connection = provider.connection;
  const wallet = provider.wallet;

  let mintA = null;
  let mintB = null;
  let makerAtaA = null;
  let vaultAta = null;
  let escrowPda = null;
  let escrowBump = null;

  const seed = new anchor.BN(12345);
  const depositAmount = new anchor.BN(1000);
  const receiveAmount = new anchor.BN(500);

  it("Initializes escrow and deposits tokens", async () => {
    // Create Mints
    mintA = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6 // decimals
    );

    mintB = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6
    );

    // Create Maker's ATA for Mint A
    makerAtaA = await getAssociatedTokenAddress(
      mintA,
      wallet.publicKey
    );
    await createAssociatedTokenAccount(
      connection,
      wallet.payer,
      mintA,
      wallet.publicKey
    );

    // Mint tokens to Maker's ATA
    await mintTo(
      connection,
      wallet.payer,
      mintA,
      makerAtaA,
      wallet.publicKey,
      2000 // Mint 2000 tokens
    );

    // Derive PDA for Escrow
    [escrowPda, escrowBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("escrow"), wallet.publicKey.toBuffer(), seed.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Call make instruction
    await program.methods
      .make(seed, receiveAmount, depositAmount)
      .accounts({
        maker: wallet.publicKey,
        mintA: mintA,
        mintB: mintB,
        makerAtaA: makerAtaA,
        escrow: escrowPda,
        vault: await getAssociatedTokenAddress(mintA, escrowPda, true),
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([])
      .rpc();

    // Verify Vault Token Balance
    const vaultAta = await getAssociatedTokenAddress(mintA, escrowPda, true);
    const vaultAccount = await getAccount(connection, vaultAta);
    assert.equal(Number(vaultAccount.amount), depositAmount.toNumber(), "Vault should have the deposited amount");

    console.log("Escrow initialized and deposit successful.");
  });
});
