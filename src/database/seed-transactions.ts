import db from "./connection.js";
import { assignmentTransactions } from "./assignment-data.js";

const insert = db.prepare(`
  INSERT OR IGNORE INTO transactions (
    transaction_id, lifecycle_id, account_id, merchant_name,
    transaction_date, transaction_amount, currency, status,
    settlement_status, total_settled_amount, last_settlement_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const seed = db.transaction(() => {
  for (const t of assignmentTransactions) {
    insert.run(
      ...t,
      t[7] === "COMPLETED" ? "PENDING" : "NOT_APPLICABLE",
      0,
      null,
    );
  }
});

seed();

console.log(`${assignmentTransactions.length} assignment transactions processed.`);