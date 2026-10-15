# API reference

The backend listens on port `3000` by default. The frontend accesses these
routes under `/api`. JSON requests and responses use `Content-Type: application/json`
unless stated otherwise.

## GET `/health`

Checks the SQLite connection.

### Response

```json
{
  "success": true,
  "database": "connected"
}
```

## GET `/api/transactions`

Returns all transactions ordered by transaction date descending.

### Response

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "transaction_id": "TXN001",
      "lifecycle_id": "LC001",
      "account_id": "ACC123",
      "merchant_name": "Amazon.com",
      "transaction_date": "2025-08-14",
      "transaction_amount": 125.99,
      "currency": "USD",
      "status": "COMPLETED",
      "settlement_status": "FULLY_SETTLED",
      "total_settled_amount": 125.99,
      "last_settlement_date": "2025-08-15",
      "created_at": "2025-08-14 00:00:00"
    }
  ]
}
```

## GET `/api/transactions/:id`

Returns one transaction by its `transaction_id`.

### Errors

- `404` when the transaction does not exist:

```json
{
  "success": false,
  "message": "Transaction not found"
}
```

### Example

```text
GET /api/transactions/TXN001
```

## GET `/api/transactions/:id/settlements`

Returns settlement history for the requested transaction. A missing transaction
currently returns an empty list because this handler queries settlement history
directly.

### Response

```json
{
  "success": true,
  "transaction_id": "TXN001",
  "count": 1,
  "data": [
    {
      "settlement_id": "SET001",
      "transaction_id": "TXN001",
      "lifecycle_id": "LC001",
      "settlement_date": "2025-08-15",
      "settlement_amount": 125.99,
      "settlement_type": "DEBIT",
      "currency": "USD",
      "processed_at": "2025-08-15 00:00:00"
    }
  ]
}
```

## GET `/api/reconciliation`

Runs reconciliation for all transactions and returns per-transaction results.
This is the source used by the Issues page.

### Response

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "transaction_id": "TXN001",
      "debit_total": 125.99,
      "credit_total": 0,
      "net_settled_amount": 125.99,
      "settlement_status": "FULLY_SETTLED",
      "last_settlement_date": "2025-08-15",
      "issues": []
    }
  ]
}
```

## POST `/api/reconcile`

Imports a settlement CSV and then runs reconciliation.

### Request

Use `multipart/form-data` with one file field named `file`. The file name must
end in `.csv` and the file must be no larger than 5 MB. The CSV requires:

```text
settlement_id,lifecycle_id,account_id,merchant_name,transaction_date,settlement_date,settlement_amount,settlement_type,currency
```

### Response

```json
{
  "success": true,
  "message": "Settlement CSV processed successfully.",
  "import": {
    "totalRows": 1,
    "imported": 1,
    "unmatched": [],
    "invalid": [],
    "duplicates": []
  },
  "reconciliation": {
    "count": 1,
    "data": []
  }
}
```

The `reconciliation.data` array contains the same result shape documented for
`GET /api/reconciliation`.

### Errors

- `400` when `file` is missing.
- Upload middleware rejects non-CSV files or files over 5 MB.
- Invalid CSV structure or an empty file is reported as a server error by the
  current Express error path.

## GET `/api/dashboard/summary`

Runs reconciliation and returns dashboard metrics.

### Response

```json
{
  "success": true,
  "data": {
    "transactionCount": 14,
    "statusCounts": {
      "pending": 2,
      "partial": 2,
      "fullySettled": 5,
      "overSettled": 1,
      "refunded": 2,
      "notApplicable": 2
    },
    "criticalIssues": 2,
    "warnings": 1,
    "totalTransactionAmount": 3297.13,
    "totalNetSettledAmount": 3020.85
  }
}
```

The exact values depend on the database contents. Monetary totals include
completed transactions and are numeric values; callers handling multiple
currencies must group them by currency rather than add unlike currencies.

