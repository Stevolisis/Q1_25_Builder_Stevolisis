import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import wallet from "../../Turbin3-wallet.json";
import wallet2 from "../../dev-wallet.json";

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));


//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const token_decimals = 1_000_000n;

// Mint address
const mintAddress = new PublicKey("HbXBXrZ2MSXXgcfsAHSxLaSKJSjdLr3PohnkHfyMhuyH");

(async () => {
    try {
        // Create an ATA
        const ata = await getOrCreateAssociatedTokenAccount(
            connection, 
            keypair, 
            mintAddress, 
            keypair.publicKey
        );
        console.log(`Your ata is: ${ata.address.toBase58()}`);

        // Mint to ATA
        const mintSignature = await mintTo(
            connection,
            keypair,
            mintAddress,
            ata.address,
            keypair,
            100e6
        )
        console.log(`https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`);

    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
