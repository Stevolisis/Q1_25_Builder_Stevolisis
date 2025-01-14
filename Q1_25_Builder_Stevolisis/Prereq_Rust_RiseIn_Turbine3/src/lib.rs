mod programs;

#[cfg(test)]
mod tests {
    use solana_sdk::{
        message::Message,
        signature::{Keypair, Signer, read_keypair_file},
        transaction::Transaction
    };
    use bs58;
    use std::io::{self, BufRead};
    use solana_client::rpc_client::RpcClient; 
    use solana_program::{
        pubkey::Pubkey,
        system_instruction::transfer,
    };
    use std::str::FromStr;
    use crate::programs::wba_prereq::{WbaPrereqProgram, CompleteArgs};
    use solana_program::system_program;

    const RPC_URL: &str = "https://api.devnet.solana.com";

    #[test]
    fn keygen() {
        let kp = Keypair::new();
        println!("You've generated a new Solana wallet: {}", kp.pubkey().to_string()); 
        println!("");
        println!("To save your wallet, copy and paste the following into a JSON file:");

        println!("{:?}", kp.to_bytes());
    }

    #[test]
    fn base58_to_wallet(){
        println!("Input your private key as base58:");
        let stdin = io::stdin();
        let base58 = stdin.lock().lines().next().unwrap().unwrap();
        println!("Your wallet file is:");
        let wallet = bs58::decode(base58).into_vec().unwrap(); println!("{:?}", wallet);
        //[134, 155, 125, 57, 19, 102, 198, 5, 174, 183, 49, 29, 72, 36, 136, 117, 243, 197, 98, 86, 18, 201, 139, 155, 167, 254, 202, 240, 188, 118, 96, 68]
    }

    #[test]
    fn wallet_to_base58() {
        println!("Input your private key as a wallet file byte array:");
        let stdin = std::io::stdin();
        let wallet = stdin
            .lock()
            .lines()
            .next()
            .unwrap()
            .unwrap()
            .trim_start_matches('[')
            .trim_end_matches(']')
            .split(',')
            .map(|s| s.trim().parse::<u8>().unwrap())
            .collect::<Vec<u8>>();
        println!("Your private key is:");
        let base58 = bs58::encode(wallet).into_string();
        println!("{:?}", base58);
    }

    #[test]
    fn airdrop() {
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        let client = RpcClient::new(RPC_URL);

        match client.request_airdrop(&keypair.pubkey(), 2_000_000_000u64) {
            Ok(signature) => {
                println!("Success! Check out your TX here:");
                println!(
                    "https://explorer.solana.com/tx/{}?cluster=devnet",
                    signature.to_string()
                );
            }
            Err(error) => println!("Oops, something went wrong: {}", error.to_string()),
        };

        //Success! Check out your TX here: https://explorer.solana.com/tx/52xjbpFNbeQ71BYT69wGfvVMu2AqCEeXnaucWtn1A5mE5QAW6u4jQzL59PgRdjMSYFdZhCN6bUcFjeow23XV8Kq1?cluster=devnet
    }

    #[test]
    fn transfer_sol() {
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        let to_pubkey = Pubkey::from_str("GZve3eFCooBCSQNEZthY4Liv6EwuWVXgVp4f2o9zYMEB").unwrap();
        let rpc_client = RpcClient::new(RPC_URL);

        let recent_blockhash = rpc_client.get_latest_blockhash().expect("Failed to get recent blockhash");

        // Create a transaction to transfer 0.1 SOL (1_000_000 lamports)
        let transaction = Transaction::new_signed_with_payer(
            &[transfer(
                &keypair.pubkey(),
                &to_pubkey,
                100_000_000,
            )],
            Some(&keypair.pubkey()), // Payer's public key
            &vec![&keypair],         // Signer(s)
            recent_blockhash,        // Blockhash for signing
        );

        // Send and confirm the transaction
        let signature = rpc_client
        .send_and_confirm_transaction(&transaction)
        .expect("Failed to send transaction");

        println!(
            "Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet",
            signature
        );
    }

    #[test]
    fn transfer_all_sol() {
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        let to_pubkey = Pubkey::from_str("GZve3eFCooBCSQNEZthY4Liv6EwuWVXgVp4f2o9zYMEB").unwrap();
        let rpc_client = RpcClient::new(RPC_URL);

        let recent_blockhash = rpc_client.get_latest_blockhash().expect("Failed to get recent blockhash");

        let balance = rpc_client.get_balance(&keypair.pubkey()).expect("Failed to get balance");
        println!("User Balance is: {}", balance); 

        // Create a test transaction to calculate fees
        let message = Message::new_with_blockhash(
            &[transfer(
                &keypair.pubkey(),
                &to_pubkey,
                balance,
            )],
            Some(&keypair.pubkey()), // Payer's public key
            &recent_blockhash, // Blockhash for signing
        );

        let fee = rpc_client.get_fee_for_message(&message).expect("Failed to get fee calculator");
        println!("Fee for this transaction is: {}", fee); 

        // Deduct fee from lamports amount and create a TX with correct balance
        let transaction = Transaction::new_signed_with_payer(
            &[transfer(
                &keypair.pubkey(),
                &to_pubkey,
                balance - fee,
            )],
            Some(&keypair.pubkey()), // Payer's public key
            &vec![&keypair],         // Signer(s)
            recent_blockhash,        // Blockhash for signing
        );

        // Send and confirm the transaction
        let signature = rpc_client
        .send_and_confirm_transaction(&transaction)
        .expect("Failed to send transaction");

        println!(
            "Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet",
            signature
        );
    }

    #[test]
    fn complete_prereq() {
        let rpc_client = RpcClient::new(RPC_URL);
        let signer = read_keypair_file("Turbin3-wallet.json").expect("Couldn't find wallet file");

        // Create PDA
        let prereq = WbaPrereqProgram::derive_program_address(&[
            b"prereq",
            signer.pubkey().to_bytes().as_ref(),
        ]);

        // Populate instruction data
        let args = CompleteArgs { github: b"Stevolisis".to_vec() };

        let blockhash = rpc_client.get_latest_blockhash().expect("Failed to get recent blockhash");

        // Invoke "complete" function
        let transaction = WbaPrereqProgram::complete(
            &[&signer.pubkey(), &prereq, &system_program::id()],
            &args,
            Some(&signer.pubkey()),
            &[&signer],
            blockhash,
        );

        let signature = rpc_client.send_and_confirm_transaction(&transaction).expect("Failed to send transaction");
        
        println!(
            "Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet",
            signature
        );

        //Success! Check out your TX here: https://explorer.solana.com/tx/5dziqBf2JEVWY7uDRQa6i5hYpLKNhJt1rXSKDBQVYT15bZyWjcoLxDkYBbULKqt8LBHSvcDPuvtEBEY9r252Xzqg/?cluster=devnet
    }
}