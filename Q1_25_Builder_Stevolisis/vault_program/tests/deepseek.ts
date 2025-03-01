import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createMint, getAssociatedTokenAddressSync, createAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { assert } from "chai";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow as Program<Escrow>;

  // Test constants
  const seed = 1234;
  const depositAmount = 1000;
  const receiveAmount = 500;

  // Accounts
  let mintA: PublicKey;
  let mintB: PublicKey;
  let maker: Keypair;
  let taker: Keypair;
  let escrowPda: PublicKey;
  let vaultPda: PublicKey;

  before(async () => {
    // Generate test keypairs
    maker = anchor.web3.Keypair.generate();
    taker = anchor.web3.Keypair.generate();

    // Fund maker and taker with SOL
    await provider.connection.confirmTransaction({
      signature: await provider.connection.requestAirdrop(maker.publicKey, 1e9),
      blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight
    });
    
    await provider.connection.confirmTransaction({
      signature: await provider.connection.requestAirdrop(taker.publicKey, 1e9),
      blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight
    });
    
    // Create mints
    mintA = await createMint(
      provider.connection,
      maker,
      maker.publicKey,
      null,
      6
    );

    mintB = await createMint(
      provider.connection,
      maker,
      maker.publicKey,
      null,
      6
    );
  });

  it("Initialize escrow and deposit tokens", async () => {
    // Get PDAs
    const [escrowPubkey] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        new anchor.BN(seed).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    escrowPda = escrowPubkey;

    vaultPda = getAssociatedTokenAddressSync(
      mintA,
      escrowPda,
      true
    );

    // Create maker's ATA for mintA
    const makerAtaA = await createAssociatedTokenAccount(
      provider.connection,
      maker,
      mintA,
      maker.publicKey
    );

    // Mint tokens to maker
    await mintTo(
      provider.connection,
      maker,
      mintA,
      makerAtaA,
      maker,
      depositAmount * 2
    );

    // Create escrow
    const tx = await program.methods.make(
      seed,
      receiveAmount,
      depositAmount
    ).accounts({
      maker: maker.publicKey,
      mintA,
      mintB,
      makerAtaA,
      escrow: escrowPda,
      vault: vaultPda,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([maker]).rpc();

    console.log("Escrow created:", tx);

    // Check escrow state
    const escrowAccount = await program.account.escrow.fetch(escrowPda);
    
    // Assertions
    assert.ok(escrowAccount.seed === seed);
    assert.ok(escrowAccount.maker.equals(maker.publicKey));
    assert.ok(escrowAccount.mintA.equals(mintA));
    assert.ok(escrowAccount.mintB.equals(mintB));
    assert.ok(escrowAccount.receive === receiveAmount);

    // Check vault balance
    const vaultBalance = await provider.connection.getTokenAccountBalance(vaultPda);
    assert.ok(vaultBalance.value.amount === depositAmount.toString());
  });

  it("Take escrow successfully", async () => {
    // Create required ATAs
    const takerAtaA = await createAssociatedTokenAccount(
      provider.connection,
      taker,
      mintA,
      taker.publicKey
    );

    const makerAtaB = await createAssociatedTokenAccount(
      provider.connection,
      taker,
      mintB,
      maker.publicKey
    );

    const takerAtaB = await createAssociatedTokenAccount(
      provider.connection,
      taker,
      mintB,
      taker.publicKey
    );

    // Mint receive tokens to taker
    await mintTo(
      provider.connection,
      taker,
      mintB,
      takerAtaB,
      taker,
      receiveAmount
    );

    // Execute take
    const tx = await program.methods.take().accounts({
      taker: taker.publicKey,
      maker: maker.publicKey,
      mintA,
      mintB,
      takerAtaA,
      takerAtaB,
      makerAtaB,
      escrow: escrowPda,
      vault: vaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([taker]).rpc();

    console.log("Escrow taken:", tx);

    // Check balances
    const finalMakerAtaB = await provider.connection.getTokenAccountBalance(makerAtaB);
    assert.ok(finalMakerAtaB.value.amount === receiveAmount.toString());

    const finalTakerAtaA = await provider.connection.getTokenAccountBalance(takerAtaA);
    assert.ok(finalTakerAtaA.value.amount === depositAmount.toString());
  });

  it("Refund escrow successfully", async () => {
    // This test would be similar to take test but checks refund functionality
    // Should include setup for refund scenario and balance checks
  });
});