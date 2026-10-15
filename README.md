# Transaction Reconciliation System

A backend-driven transaction reconciliation application that imports settlement
reports, matches settlements to transactions, calculates net settlement, and
surfaces reconciliation issues through a React dashboard.

## Technology stack

- Backend: Node.js, TypeScript, Express 5
- Database: SQLite through `better-sqlite3`
- CSV parsing: `csv-parse`
- Uploads: `multer`
- Frontend: React, TypeScript, Vite
- Tests: Node's built-in test runner through `tsx`

## Prerequisites

- Node.js 22 or newer
- npm

`better-sqlite3` contains native code. On Windows, a local installation may
require Visual Studio 2022 Desktop development with C++ and a Windows SDK.

## Installation

From the repository root:

```bash
npm install
cd Frontend/client
npm install
cd ../..
```

The backend and frontend have separate `package.json` files and dependency
installations.

## Database setup

The backend opens `reconciliation.db` in the current working directory and
initializes the tables from `src/database/schema.sql`.

To create the assignment transaction rows without deleting existing data:

```bash
npx tsx src/database/seed-transactions.ts
```

The seed uses `INSERT OR IGNORE` by transaction ID. It is safe to rerun and does
not clear transactions or settlement history.

The repository includes the baseline settlement report at
`data/settlement_report.csv` and focused CSV fixtures under `data/fixtures/`.
The fixtures cover valid, partial, refund, over-settlement, duplicate, invalid,
unmatched, and currency-mismatch cases. They are intended for isolated testing
or manual verification; do not import them into a shared database unless that
is intended.

The command-line importer reads `data/settlement_report.csv`:

```bash
npx tsx src/database/import-settlements.ts
```

It does not clear existing data and skips settlement IDs already present.

## Running the application

Start the backend from the repository root:

```bash
npm run dev
```

The backend listens on `http://localhost:3000`. `PORT` may be set in the shell
before starting it; no `.env` file is required by the current implementation.

Start the frontend in a second terminal:

```bash
cd Frontend/client
npm run dev
```

Vite serves the client and proxies `/api` requests to the backend at
`http://localhost:3000`.

## Backend scripts

From the repository root:

| Command | Purpose |
|---|---|
| `npm run dev` | Run the backend with `tsx watch` |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run build` | Compile backend TypeScript to `dist/` |
| `npm test` | Run backend unit and API integration tests |

Useful database utilities can be run directly with `npx tsx`, including
`src/database/seed-transactions.ts`, `src/database/import-settlements.ts`,
`src/database/run-reconciliation.ts`, and the check/fix scripts in
`src/database/`.

## Frontend scripts

From `Frontend/client`:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and build the production client |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

## API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Check database connectivity |
| `GET` | `/api/transactions` | List transactions |
| `GET` | `/api/transactions/:id` | Retrieve one transaction |
| `GET` | `/api/transactions/:id/settlements` | Retrieve settlement history |
| `GET` | `/api/reconciliation` | Reconcile all transactions and return issues |
| `POST` | `/api/reconcile` | Import a CSV under multipart field `file`, then reconcile |
| `GET` | `/api/dashboard/summary` | Return dashboard and report metrics |

See [docs/api.md](docs/api.md) for request formats, response examples, and
error behavior.

## Application behavior

Settlements match by lifecycle ID first, then by account ID, normalized merchant
name, and transaction date. Net settlement is total DEBIT minus total CREDIT.
The application supports pending, partial, fully settled, over-settled,
refunded, and not-applicable statuses and reports critical or warning issues.

See:

- [docs/architecture.md](docs/architecture.md)
- [docs/assumptions-and-limitations.md](docs/assumptions-and-limitations.md)

## Validation

From the repository root:

```bash
npm run typecheck
npm test
npm run build
```

From `Frontend/client`:

```bash
npm run build
npm run lint
```

Tests use temporary SQLite databases and do not modify the repository's
`reconciliation.db`.
