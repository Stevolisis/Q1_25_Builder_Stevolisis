import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { Keypair, PublicKey } from '@solana/web3.js';
import { createMint, getAssociatedTokenAddressSync } from '@solana/spl-token';
import {  } from "chai";

describe("escrow", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow as Program<Escrow>;
  // Test Costants
  let seed = 1234;
  const depositAmount = 1000;
  const recieveAmount = 500;

  // Accounts
  let mintA: PublicKey;
  let mintB: PublicKey;
  let maker: Keypair;
  let taker: Keypair;
  let escrowPda: PublicKey;
  let vaultPda: PublicKey;

  before("Creating and initializing Accounts!", async () => {
    maker = anchor.web3.Keypair.generate();
    taker = anchor.web3.Keypair.generate();
    console.log("Maker Created", maker);
    console.log("Taker Created", taker);
        
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
    
    const [escrowPubkey] = anchor.web3.PublicKey.findProgramAddressSync([
      Buffer.from("escrow"),
      maker.publicKey.toBuffer(),
      new anchor.BN(seed).toArrayLike(Buffer, "le", 8),
    ], program.programId);
    escrowPda = escrowPubkey;

    vaultPda = getAssociatedTokenAddressSync(
      mintA,
      escrowPda,
      true
    );

    const tx = await program.methods.make(
      seed,
      recieveAmount,
      depositAmount
    )
  });
});
