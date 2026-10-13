import db from "./connection.js";

const transactions = [
  ["TXN001", "LC001", "ACC123", "Amazon.com", "2025-08-14", 125.99, "USD", "COMPLETED"],
  ["TXN002", "LC002", "ACC124", "Starbucks", "2025-08-14", 4.75, "USD", "COMPLETED"],
  ["TXN003", "LC003", "ACC125", "Shell Gas", "2025-08-14", 45.30, "USD", "COMPLETED"],
  ["TXN004", "LC004", "ACC126", "Best Buy", "2025-08-14", 899.99, "USD", "COMPLETED"],
  ["TXN005", "LC005", "ACC127", "Home Depot", "2025-08-14", 234.50, "USD", "COMPLETED"],
  ["TXN006", "LC006", "ACC128", "Target", "2025-08-14", 87.25, "USD", "COMPLETED"],
  ["TXN007", "LC007", "ACC129", "Walmart", "2025-08-14", 156.78, "USD", "COMPLETED"],
  ["TXN008", "LC008", "ACC130", "Apple", "2025-08-05", 1299.99, "USD", "COMPLETED"],
  ["TXN009", "LC009", "ACC131", "Nike", "2025-08-14", 189.95, "USD", "COMPLETED"],
  ["TXN010", "LC010", "ACC132", "Netflix", "2025-08-07", 15.99, "USD", "COMPLETED"],
  ["TXN013", "LC011", "ACC135", "Corner Deli", "2025-08-14", 32.45, "USD", "COMPLETED"],
  ["TXN014", "LC012", "ACC136", "Shell Gas", "2025-08-14", 28.90, "USD", "COMPLETED"],
  ["TXN015", "LC013", "ACC137", "Amazon.com", "2025-08-14", 199.99, "USD", "FAILED"],
  ["TXN016", "LC014", "ACC138", "Uber Taxi", "2025-08-14", 75.25, "USD", "DECLINED"]
] as const;

const insert = db.prepare(`
  INSERT OR IGNORE INTO transactions (
    transaction_id, lifecycle_id, account_id, merchant_name,
    transaction_date, transaction_amount, currency, status,
    settlement_status, total_settled_amount, last_settlement_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const seed = db.transaction(() => {
  for (const t of transactions) {
    insert.run(...t, "NOT_APPLICABLE", 0, null);
  }
});

seed();

console.log(`${transactions.length} assignment transactions processed.`);