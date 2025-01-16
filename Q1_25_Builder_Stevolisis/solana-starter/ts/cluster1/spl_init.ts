import { Keypair, Connection, Commitment } from "@solana/web3.js";
import { createMint } from '@solana/spl-token';
import wallet from "../../Turbin3-wallet.json";

// Import our keypair from the wallet file
const mintAuthority = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

(async () => {
    try {
        const mint = await createMint(
            connection,
            mintAuthority,
            mintAuthority.publicKey,
            null,
            6
        );
        console.log("Create Mint: ", mint);
        console.log("Create Mint2: ", mint.toBase58());
    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})();

// Create Mint:  PublicKey [PublicKey(HbXBXrZ2MSXXgcfsAHSxLaSKJSjdLr3PohnkHfyMhuyH)] {
//     _bn: <BN: f692dd60c6feb857014ffebf9e4daeba1d7940a4f7ae668843fec7391b091110>
//   }
//   Create Mint2:  HbXBXrZ2MSXXgcfsAHSxLaSKJSjdLr3PohnkHfyMhuyH
