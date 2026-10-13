PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id TEXT PRIMARY KEY,
    lifecycle_id TEXT,
    account_id TEXT NOT NULL,
    merchant_name TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    transaction_amount REAL NOT NULL CHECK (transaction_amount > 0),
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    settlement_status TEXT NOT NULL DEFAULT 'PENDING',
    total_settled_amount REAL NOT NULL DEFAULT 0,
    last_settlement_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settlement_history (
    settlement_id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    lifecycle_id TEXT,
    settlement_date TEXT NOT NULL,
    settlement_amount REAL NOT NULL CHECK (settlement_amount > 0),
    settlement_type TEXT NOT NULL
        CHECK (settlement_type IN ('DEBIT', 'CREDIT')),
    currency TEXT NOT NULL,
    processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_id)
        REFERENCES transactions(transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_lifecycle_id
ON transactions(lifecycle_id);

CREATE INDEX IF NOT EXISTS idx_transactions_account_merchant_date
ON transactions(account_id, merchant_name, transaction_date);

CREATE INDEX IF NOT EXISTS idx_settlement_transaction_id
ON settlement_history(transaction_id);