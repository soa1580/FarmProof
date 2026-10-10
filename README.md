# FarmProof

### Blockchain-Based Agricultural Produce Traceability

FarmProof is a blockchain-based agricultural traceability project designed to improve transparency and accountability throughout the agricultural supply chain.

It uses a Solidity smart contract deployed on an Ethereum-compatible blockchain to record produce registration, ownership transfers, status updates, and batch history.

By recording these events on-chain, FarmProof provides a tamper-evident history that authorized participants and other interested parties can inspect.

## Problem Statement

Agricultural supply chains can suffer from limited traceability, fragmented records, and difficulties verifying the movement of produce between participants.

FarmProof explores how blockchain technology can help address these challenges by recording important produce-batch events in a shared, verifiable ledger.

**Important:** Blockchain records make submitted information tamper-evident; they do not independently verify the physical existence, quality, or origin of agricultural produce. Those claims require appropriate real-world verification.

## Project Objectives

- Register agricultural produce batches on-chain.
- Record the farmer associated with each batch.
- Track current ownership as produce moves through the supply chain.
- Record produce status changes.
- Preserve a history of registration, transfers, and status updates.
- Restrict sensitive operations to authorized participants.
- Enforce valid status transitions through smart-contract rules.

## Core Features

### 1. Batch Registration

A participant can register a produce batch with details including:

- Produce type
- Quantity
- Unit of measurement
- Farmer address
- Initial status
- Registration timestamp

Each batch receives a unique, incrementing identifier.

### 2. Ownership Transfers

The current batch owner can transfer ownership to another address, subject to the contract's authorization and status rules.

The transfer is recorded in the batch history.

### 3. Status Management

FarmProof uses the following statuses:

| Status | Meaning |
|---|---|
| `Registered` | The batch has been registered. |
| `InTransit` | The batch is moving through the supply chain. |
| `Delivered` | The batch has been delivered. |
| `Sold` | The batch has been sold. |
| `Cancelled` | The batch has been cancelled. |

The smart contract restricts status changes to valid transitions and prevents further transfers of sold or cancelled batches.

### 4. Batch History

The contract records historical events containing information such as:

- Actor address
- Previous or source address
- Destination address
- Batch status
- Timestamp

This allows users to inspect the recorded history of a batch.

### 5. Access Control and Validation

The contract includes checks to prevent unauthorized ownership transfers and status updates.

It also validates quantities, recipient addresses, batch existence, and permitted status transitions.

### 6. Farmer Batch Tracking

The contract maintains farmer-associated batch records and provides functions for retrieving batch information and counting batches by status.

## Technology Stack

- **Solidity:** Smart-contract development
- **Foundry:** Contract compilation, testing, and deployment
- **Forge:** Automated smart-contract tests
- **Cast:** Blockchain interaction and contract calls
- **Anvil:** Local Ethereum-compatible development network
- **Git and GitHub:** Version control and project collaboration

## Project Structure

```text
FarmProof/
├── .github/
│   └── workflows/
├── lib/
│   └── forge-std/
├── script/
│   └── FarmProof.s.sol
├── src/
│   └── FarmProof.sol
├── test/
│   └── FarmProof.t.sol
├── .gitignore
├── .gitmodules
├── foundry.lock
├── foundry.toml
└── README.md
