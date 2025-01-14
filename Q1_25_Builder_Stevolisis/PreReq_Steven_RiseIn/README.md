## TX Link
```bash 
 https://explorer.solana.com/tx/BSJGNa4eHskdhc3f3GwdBryUhuYKfhxAMVYxr4NdWwThmQeqmf8hbkNY5i5CvM2zZ3iVpcDv9aecqDmHg9NmkY4?cluster=devnet
```

# Prerequisites: Enrollment dApp

## Overview
These prerequisites are meant to assess your ability to follow processes, execute tasks, debug
simple errors (intentionally placed), and ship code. They are not a test of your typescript or
coding skills.

- **Program Derived Addresses (PDA)**: PDAs allow us to sign transactions with a Public Key derived from a deterministic seed, providing additional security.
- **Interface Definition Language (IDL)**: The IDL is a JSON file that defines the public interface for interacting with the program. It contains account structures, instructions, and error codes for Solana programs.
- **Anchor Framework**: This framework simplifies development on Solana by providing a way to interact with Solana programs using TypeScript and Rust.

In this final project, we enroll our GitHub username on the blockchain to mark our completion of the course prerequisites.

---

## How the Code Works
This project interacts with the WBA program using Solana's Anchor framework. Here's an overview of what each file does:

- **enroll.ts**: This is the main script that connects to the Solana Devnet and submits your GitHub account to the WBA program, proving that you've completed the course prerequisites.
- **programs/Turbin3_prereq.ts**: Contains the TypeScript definition of the program's IDL. It defines the structure of the Turbin3_prereq program and its functions.
- **wallet.json**: Contains the private key of your Solana wallet. This file is used to sign transactions.
- **tsconfig.json**: Contains TypeScript configuration settings, including enabling JSON module resolution.

---

## **Setup and Execution Instructions**

1. **Clone the Repository**:
   ```bash
   git clone git@github.com:Stevolisis/PreReq_Steven_RiseIn.git
    ```
    ```bash 
    cd PreReq_Steven_RiseIn
    ```

2. **Install Repo**:
   ```bash
   yarn install
   ```

3. **Generate your wallet.json**:
   ```bash
   yarn keygen
   ```

4 **Transfer SOL**:
   ```bash
   yarn transfer
   ```

5. **Run the Enrollment Script**:
   ```bash
   yarn enroll
   ```

6. **Expected Output**:
   ```bash
   Success! Check out your TX here: https://explorer.solana.com/tx/<transaction-hash>?cluster=devnet
    ```
    