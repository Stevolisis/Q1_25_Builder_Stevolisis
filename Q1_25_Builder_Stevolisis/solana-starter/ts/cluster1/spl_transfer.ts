import { Commitment, Connection, Keypair, PublicKey } from "@solana/web3.js"
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import wallet from "../../Turbin3-wallet.json";
import wallet2 from "../../dev-wallet.json";

// We're going to import our keypair from the wallet file
const fromKeypair = Keypair.fromSecretKey(new Uint8Array(wallet));
const toKeypair = Keypair.fromSecretKey(new Uint8Array(wallet2));  //FcdADqkvJe45QqNTdXABpKrbEBZtWjhPZBzTWYrRZwpZ 0

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

// Mint address
const mintAddress = new PublicKey("HbXBXrZ2MSXXgcfsAHSxLaSKJSjdLr3PohnkHfyMhuyH");


(async () => {
    try {
        // Get the token account of the fromWallet address, and if it does not exist, create it
        const fromAta = await getOrCreateAssociatedTokenAccount(
            connection,
            fromKeypair,
            mintAddress,
            fromKeypair.publicKey
        );

        // Get the token account of the toWallet address, and if it does not exist, create it
        const toAta = await getOrCreateAssociatedTokenAccount(
            connection,
            fromKeypair,
            mintAddress,
            toKeypair.publicKey
        );

        // Transfer the new token to the "toTokenAccount" we just created
        const transferSignature = await transfer(
            connection,
            fromKeypair,
            fromAta.address,
            toAta.address,
            fromKeypair,
            fromAta.amount
        );
        console.log(`https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);

    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})();

//https://explorer.solana.com/tx/5hvCegNFMvnFEn7f7nGTbkNd9RicMc2kidCxU7mHyyzwxXdygnLKZFuwHwzPonBHPS15c4X59Mn3n87MQAoVHQ5f?cluster=devnet
//