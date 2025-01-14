import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import wallet from './dev-wallet.json';

const from = Keypair.fromSecretKey(new Uint8Array(wallet));
const to = new PublicKey("GZve3eFCooBCSQNEZthY4Liv6EwuWVXgVp4f2o9zYMEB");
const connection = new Connection("https://api.devnet.solana.com");

(async()=>{
    try{
        const balance = await connection.getBalance(from.publicKey); 
        const transaction = new Transaction().add(SystemProgram.transfer({
            fromPubkey: from.publicKey,
            toPubkey: to,
            lamports: balance
        }));
        transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
        transaction.feePayer = from.publicKey;

        // Calculate exact fee
        const fee = (await connection.getFeeForMessage(transaction.compileMessage(),'confirmed')).value || 0;
        transaction.instructions.pop();

        transaction.add(SystemProgram.transfer({
            fromPubkey: from.publicKey,
            toPubkey: to,
            lamports: balance - fee
        }));
        
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [from]
        );

        console.log(`Success! Check out your TX here: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    }catch(e){
        console.error(`Oops, something went wrong: ${e}`);
    }
})();

//Transfer 0.1 sol
//https://explorer.solana.com/tx/2HkfALxRD5gUKxTsn7DcQcr8T2SraYajNddEdkVpcsiXjy6oCdJumCNNPT5MhT5xLiAYkXnXkXHqrDo3fKxSRkk7?cluster=devnet

//Empty devnet wallet into Turbin3 wallet
//https://explorer.solana.com/tx/5iz6gjU2ktwDzwASeAiLXYAv2vdJ2sjEw6uqhZnVkGVDikrsqfciDzmu293uNgGQujw2REdyDJdcssYzkze6T4V2?cluster=devnet
