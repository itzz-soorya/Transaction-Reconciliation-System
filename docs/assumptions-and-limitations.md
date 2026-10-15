# Assumptions and limitations

## Verified implementation behavior

### Matching

Settlement import first searches for an exact lifecycle ID. If no transaction is
found by lifecycle ID, it falls back to account ID, case-insensitive trimmed
merchant name, and exact transaction date.

### Settlement calculation

For each transaction:

`net settlement = sum(DEBIT) - sum(CREDIT)`

Amounts are rounded to cents when stored in reconciliation results.

### Statuses

- `PENDING`: completed transaction with no settlement records.
- `PARTIAL`: net settlement is below the transaction amount and there is no
  credit/refund.
- `FULLY_SETTLED`: net settlement equals the transaction amount.
- `OVER_SETTLED`: net settlement exceeds the transaction amount.
- `REFUNDED`: a credit exists and the resulting net settlement is below the
  transaction amount.
- `NOT_APPLICABLE`: the source transaction status is not `COMPLETED`.

### Issues

- A non-completed transaction with settlements receives
  `SETTLEMENT_FOR_INACTIVE_TRANSACTION` with critical severity.
- A completed transaction whose net settlement exceeds its amount receives
  `OVER_SETTLEMENT` with critical severity.
- A completed transaction with no settlement more than seven elapsed UTC days
  after its transaction date receives `SETTLEMENT_OVERDUE` with critical
  severity.
- A non-refund net partial settlement receives `PARTIAL_SETTLEMENT` with warning
  severity.

### Duplicate handling

Settlement IDs are primary keys. CSV import detects an existing settlement ID
and reports it in `duplicates` without inserting it.

### Currency validation

CSV currency values must be three uppercase letters after normalization and must
match the matched transaction currency. A mismatch is reported as invalid.
There is no currency conversion.

### Refund handling

Any positive credit total combined with a net amount below the transaction
amount is treated as `REFUNDED` and does not receive the non-refund partial
warning.

## Reproducibility and data safety

`src/database/seed-transactions.ts` inserts the assignment transactions using
`INSERT OR IGNORE`, so rerunning it does not replace existing rows. It does not
delete transactions or settlements. The CLI settlement importer does not clear
existing data; it skips duplicate settlement IDs.

The test suite uses a temporary SQLite directory. It does not use the repository
database.

## Assumptions and limitations

- The assignment does not define user-editable application settings; the
  Settings page is therefore read-only documentation of verified rules.
- The application stores amounts as SQLite `REAL`; financial production systems
  should consider integer minor units or a decimal strategy.
- The dashboard summary returns scalar monetary totals. The Reports page groups
  transaction data by currency so unlike currencies are not presented as one
  combined amount.
- The server uses a process-local SQLite connection and has no authentication or
  authorization.
- Express's current default error path is used for several malformed-upload
  errors, so those responses are not consistently JSON.
- There is no pagination on transaction, settlement, reconciliation, or report
  endpoints.
- CSV uploads are memory-buffered and limited to 5 MB.
- Future improvements could add structured error middleware, pagination,
  authentication, audit logging, and currency-aware backend report totals.

