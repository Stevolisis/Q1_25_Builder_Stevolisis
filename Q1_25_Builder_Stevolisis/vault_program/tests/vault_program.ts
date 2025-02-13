import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VaultProgram } from "../target/types/vault_program";
import { assert } from "chai";
import { BN } from "bn.js";

describe("vault_program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.VaultProgram as Program<VaultProgram>;

  const user = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(require("/home/stevolisis/.config/solana/id.json"))
  );
  let stateBump: number;
  let vaultBump: number;
  let statePda: anchor.web3.PublicKey;
  let vaultPda: anchor.web3.PublicKey;

  it("Is initialized!", async () => {
    [statePda, stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("state"), user.publicKey.toBuffer()],
      program.programId
    );

    [vaultPda, vaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), statePda.toBuffer()],
      program.programId
    );

    const tx = await program.methods
    .initialize()
    .accounts({
      user: user.publicKey,
      state: statePda,
      vault: vaultPda,
      system_program: anchor.web3.SystemProgram.programId
    })
    .rpc();
    console.log("Your transaction signature1", tx);
    const stateAccount = await program.account.vaultState.fetch(statePda);
    assert.equal(stateAccount.vaultBump, vaultBump);
    assert.equal(stateAccount.stateBump, stateBump);
  });


  it("Deposit SOL into vault", async () => {
    [statePda, stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("state"), user.publicKey.toBuffer()],
      program.programId
    );

    [vaultPda, vaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), statePda.toBuffer()],
      program.programId
    );
    
    const depositAmount = new anchor.BN(1_000_000_000); // 1 SOL
    const initialVaultBalance = await provider.connection.getBalance(vaultPda);
    console.log("Deposited", depositAmount);
    console.log("Initial Balance", initialVaultBalance);

    const tx = await program.methods
    .deposit(depositAmount)
    .accounts({
      user: user.publicKey,
      state: statePda,
      vault: vaultPda,
      system_program: anchor.web3.SystemProgram.programId
    })
    .rpc();
    console.log("Your transaction signature1", tx);

    const finalVaultBalance = await provider.connection.getBalance(vaultPda);
    console.log("FinalVault Balance", finalVaultBalance);

    assert.equal(finalVaultBalance, initialVaultBalance + depositAmount.toNumber());
  });
});
