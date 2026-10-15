# Transaction Reconciliation System

A backend-driven transaction reconciliation system that matches financial transactions with settlement reports, calculates net settlement amounts, identifies discrepancies, and provides summary data for a dashboard.

Developed as part of the OpenFabric Software Engineer assignment.

## Project Overview

Financial transactions can be settled through multiple payments, partial settlements, or refunds. This application imports settlement CSV files, matches settlement records with transactions, calculates net settled amounts, and identifies reconciliation issues.

The application includes a React frontend, a TypeScript/Express backend, and an SQLite database.

## Tech Stack

- **Backend:** Node.js, TypeScript, Express.js
- **Database:** SQLite with `better-sqlite3`
- **CSV Processing:** `csv-parse`
- **Validation:** Zod
- **Frontend:** React, TypeScript, Vite
- **Testing:** Node.js test runner with `tsx`
- **Build and Type Checking:** TypeScript compiler

## Key Features

- Import and validate settlement CSV files.
- Match settlements using lifecycle IDs.
- Fall back to account ID, merchant name, and transaction date when appropriate.
- Support multiple settlement records for a transaction.
- Calculate net settlement amounts using debit and credit records.
- Identify pending, partially settled, fully settled, over-settled, refunded, and not-applicable transactions.
- Detect over-settlement, overdue settlement, and partial settlement issues.
- Display transaction details and settlement history.
- Provide dashboard metrics, issue summaries, and reports.
- Detect duplicate settlement IDs and report unmatched or invalid CSV rows.

## Reconciliation Rules

### Settlement Status

| Status | Description |
|---|---|
| `PENDING` | No settlement records are available for the transaction. |
| `PARTIAL` | Net settlement is below the transaction amount without a refund. |
| `FULLY_SETTLED` | Net settlement equals the transaction amount. |
| `OVER_SETTLED` | Net settlement exceeds the transaction amount. |
| `REFUNDED` | A refund or partial refund has been recorded, according to the assignment scenarios. |
| `NOT_APPLICABLE` | The transaction status does not require normal settlement reconciliation. |

### Net Settlement Calculation

Net settlement is calculated as:

`Net Settlement = Total DEBIT Amount - Total CREDIT Amount`

For example, a $100 debit and a $20 credit produce a net settlement amount of $80.

For the refund scenarios clarified in the assignment, the expected status is `REFUNDED`, with no issues.

### Issue Detection

- **Critical:** Settlement amount exceeds the transaction amount.
- **Critical:** No settlement is received within seven days of the transaction date.
- **Critical:** A settlement exists for an inactive transaction, such as a failed transaction.
- **Warning:** A completed transaction remains partially settled without a refund.
- **No issues:** The transaction satisfies the applicable reconciliation rules.

## Project Structure

The main project areas include:

```text
Transaction-Reconciliation-System/
├── src/
│   ├── database/
│   ├── routes/
│   ├── services/
│   └── server.ts
├── Frontend/
│   └── client/
│       └── src/
├── data/
├── package.json
├── tsconfig.json
└── README.md
```

The actual repository may contain additional files and subdirectories.

## Prerequisites

- Node.js compatible with the project's dependencies
- npm
- Visual Studio Code or another code editor

The SQLite native dependency may require Windows C++ build tools if a compatible prebuilt binary is unavailable.

## Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd Transaction-Reconciliation-System
```

Install backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd Frontend/client
npm install
```

Return to the project root before running backend commands.

## Running the Application

### 1. Start the Backend

From the project root:

```bash
npm run dev
```

The backend runs at:

`http://localhost:3000`

### 2. Start the Frontend

Open a second terminal:

```bash
cd Frontend/client
npm run dev
```

Open the local URL printed by Vite in the terminal, typically:

`http://localhost:5173`

Keep both development servers running while using the application.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Check server availability and database connection |
| `POST` | `/api/reconcile` | Upload and process a settlement CSV |
| `GET` | `/api/reconciliation` | Retrieve reconciliation results |
| `GET` | `/api/transactions` | Retrieve transactions |
| `GET` | `/api/transactions/:id` | Retrieve transaction details |
| `GET` | `/api/dashboard/summary` | Retrieve dashboard statistics |

Confirm the available transaction settlement-history route against the current backend implementation before documenting it.

## Database

The application uses SQLite with two primary tables.

### `transactions`

Stores transaction identifiers, account and merchant details, transaction dates and amounts, currency, transaction status, settlement status, total settled amount, and the latest settlement date.

### `settlement_history`

Stores settlement IDs, transaction references, lifecycle IDs, settlement dates and amounts, settlement types, and currencies.

The database schema is maintained in the project's database files.

If a seed script is provided, it can be run from the project root using the command documented in the source code. Seed scripts may insert sample records without clearing existing data; verify their behavior before using them to reset a database.

## CSV Validation

The CSV import process checks settlement data and matching information, including:

- Required columns and values
- Numeric settlement amounts
- Settlement dates and transaction dates
- Positive settlement amounts
- Supported settlement types (`DEBIT` and `CREDIT`)
- Currency consistency
- Duplicate settlement IDs
- Transaction matching and unmatched settlements

Invalid and unmatched records are reported in the import results.

## Testing and Validation

Run the automated backend tests:

```bash
npm test
```

Run TypeScript type checking:

```bash
npm run typecheck
```

Build the backend:

```bash
npm run build
```

Build the frontend:

```bash
cd Frontend/client
npm run build
```

The automated test suite currently covers seven scenarios, including exact settlement, partial settlement, over-settlement, overdue and recent pending transactions, and the two clarified refund scenarios.

Manual integration tests have also been performed for CSV imports, duplicate detection, fallback matching, invalid data, unmatched settlements, currency mismatch, and multiple-settlement status transitions.

## Assumptions and Limitations

- Lifecycle ID is the primary matching key.
- Account ID, merchant name, and transaction date provide fallback matching when appropriate.
- Refund behavior follows the clarified assignment scenarios.
- The seven-day grace period is used for overdue settlement detection.
- Authentication, authorization, deployment, and production monitoring are outside the current scope unless required by the assignment.

## Future Improvements

- Downloadable reconciliation reports
- Enhanced audit logging
- Additional automated API integration tests
- Production deployment and monitoring
- More detailed reporting and reconciliation history
