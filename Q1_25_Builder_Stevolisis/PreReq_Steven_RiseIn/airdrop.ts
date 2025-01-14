import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import wallet from './dev-wallet.json';

const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
const connection = new Connection("https://api.devnet.solana.com");

(async()=>{
    try{
        const txhash = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
        console.log(`Success! Check out your TX here: https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
    }catch(e){
        console.error(`Oops, something went wrong: ${e}`);
    }
})();

// Check out your TX here: https://explorer.solana.com/tx/4W8QrqA2xzHLsN2hp9JRMgQHoSEb6BLJghAMuwYEsqtE471ZsSmrLZDQwFp6jXxCB9zUEv8BgaNdzTYXERZyVt7S?cluster=devnet
