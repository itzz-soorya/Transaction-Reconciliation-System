# Transaction Reconciliation System

A backend-driven transaction reconciliation system that matches transaction records with settlement reports, calculates net settlement amounts, identifies reconciliation issues, and provides summary data for a dashboard.

## Project Overview

Financial transactions may be settled through multiple payments, partial settlements, or refunds. This system reconciles transaction records against settlement CSV files to determine settlement status and highlight discrepancies.

The application is being developed as part of the OpenFabric Software Engineer assignment.

## Tech Stack

- **Backend:** Node.js, TypeScript, Express.js
- **Database:** SQLite
- **CSV Processing:** csv-parse
- **Validation:** Zod
- **Testing:** Jest and Supertest (planned)
- **Frontend:** React with TypeScript (planned)

## Key Features

- Import and validate settlement CSV files.
- Match settlements with transactions using lifecycle IDs.
- Use account ID, merchant name, and transaction date as fallback matching criteria.
- Support multiple settlements for a transaction.
- Calculate net settlement amounts by accounting for debits and credits.
- Identify pending, partially settled, fully settled, over-settled, and refunded transactions.
- Detect settlement discrepancies and delayed settlements.
- Provide transaction details and settlement history.
- Generate reconciliation summaries for a dashboard.

## Reconciliation Rules

### Settlement Status

| Status | Description |
|---|---|
| `PENDING` | No settlements recorded |
| `PARTIAL` | Net settlement is less than the transaction amount without a refund |
| `FULLY_SETTLED` | Net settlement equals the transaction amount |
| `OVER_SETTLED` | Net settlement exceeds the transaction amount |
| `REFUNDED` | A refund or partial refund has been recorded, according to the assignment scenarios |

### Net Settlement Calculation

Net settlement amount is calculated as:

`Net Settlement = Total DEBIT Amount - Total CREDIT Amount`

For example, a transaction with a debit of $100 and a credit of $20 has a net settlement amount of $80. Under the assignment's clarified refund scenarios, the status is `REFUNDED` and the issue flag is `No issues`.

### Issue Detection

- **Critical issue:** Settlement amount exceeds the transaction amount.
- **Critical issue:** No settlement is recorded within seven days of the transaction date.
- **Warning:** A transaction remains partially settled without a refund.
- **No issues:** The transaction matches an expected scenario without a critical issue or warning.

## Project Structure

```text
openfabric-reconciliation/
├── src/
│   ├── config/
│   ├── database/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── tests/
│   └── server.ts
├── tests/
├── data/
├── docs/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

The folder structure may evolve as the implementation progresses.

## Prerequisites

Install the following before running the project:

- Node.js (LTS version recommended)
- npm
- Visual Studio Code or another code editor

## Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd openfabric-reconciliation
```

Install dependencies:

```bash
npm install
```

## Running the Application

Start the development server:

```bash
npm run dev
```

The default server address is:

`http://localhost:3000`

### Health Check

Send a GET request to:

`GET /health`

Expected response:

```json
{
  "success": true,
  "message": "Transaction Reconciliation API is running"
}
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check server availability |
| POST | `/reconcile` | Upload and process a settlement report |
| GET | `/transactions` | Retrieve transactions with optional filters |
| GET | `/transactions/:id` | Retrieve transaction details and settlement history |
| GET | `/dashboard/summary` | Retrieve reconciliation statistics |

The reconciliation endpoints will be implemented as development progresses.

## Database Design

The application uses SQLite with two primary tables.

### `transactions`

Stores transaction information, including:

- Transaction and lifecycle identifiers
- Account and merchant details
- Transaction date and amount
- Currency and transaction status
- Settlement status and total settled amount
- Last settlement date and creation timestamp

### `settlement_history`

Stores individual settlement records, including:

- Settlement and transaction identifiers
- Lifecycle identifier
- Settlement date and amount
- Settlement type (`DEBIT` or `CREDIT`)
- Currency and processing timestamp

The database schema and initialization scripts will be maintained in the project repository.

## CSV Validation

The reconciliation process will validate:

- Required column names and values
- Date and numeric formats
- Positive settlement amounts
- Currency consistency
- Missing or malformed records
- Transaction matching and unmatched settlements

Invalid records should be handled safely and reported clearly.

## Testing

The project will include unit tests for reconciliation calculations and status determination, along with integration tests for REST API endpoints.

Run the available TypeScript validation:

```bash
npm run typecheck
```

Run the available test suite once configured:

```bash
npm test
```

## Assumptions and Limitations

- Transaction and settlement data must contain sufficient information for matching.
- Lifecycle ID is the primary matching key.
- Account ID, merchant name, and transaction date are used as fallback matching criteria when appropriate.
- Refund scenarios follow the expected outcomes clarified for the assignment.
- Reconciliation and dashboard features are being implemented incrementally.
- Production-grade authentication, authorization, deployment, and monitoring are outside the initial development scope unless subsequently required.

## Future Improvements

- Interactive reconciliation dashboard
- Detailed transaction timeline
- Downloadable reconciliation reports
- Improved audit logging
- More extensive automated test coverage
- Production deployment and monitoring

