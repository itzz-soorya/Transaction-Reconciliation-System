import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import db from "./connection.js";
import { assignmentTransactions } from "./assignment-data.js";

const backupDirectory = path.resolve(process.cwd(), "backups");
const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");
const backupPath = path.join(
  backupDirectory,
  `reconciliation-before-assignment-demo-${timestamp}.db`,
);

const insertTransaction = db.prepare(`
  INSERT INTO transactions (
    transaction_id, lifecycle_id, account_id, merchant_name,
    transaction_date, transaction_amount, currency, status,
    settlement_status, total_settled_amount, last_settlement_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const resetDatabase = db.transaction(() => {
  db.prepare("DELETE FROM settlement_history").run();
  db.prepare("DELETE FROM transactions").run();

  for (const transaction of assignmentTransactions) {
    insertTransaction.run(
      ...transaction,
      transaction[7] === "COMPLETED" ? "PENDING" : "NOT_APPLICABLE",
      0,
      null,
    );
  }
});

async function setupAssignmentDemo(): Promise<void> {
  try {
    fs.mkdirSync(backupDirectory, { recursive: true });

    if (fs.existsSync(backupPath)) {
      throw new Error(`Refusing to overwrite backup: ${backupPath}`);
    }

    await db.backup(backupPath);
    const backupStats = fs.statSync(backupPath);

    if (backupStats.size === 0) {
      throw new Error(`Backup was created but is empty: ${backupPath}`);
    }

    const backupDb = new Database(backupPath, { readonly: true });
    try {
      const backupTable = backupDb
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'transactions'",
        )
        .get();

      if (!backupTable) {
        throw new Error("Backup does not contain the transactions table.");
      }
    } finally {
      backupDb.close();
    }

    resetDatabase();

    const transactionCount = db
      .prepare("SELECT COUNT(*) AS count FROM transactions")
      .get() as { count: number };
    const settlementCount = db
      .prepare("SELECT COUNT(*) AS count FROM settlement_history")
      .get() as { count: number };

    if (
      transactionCount.count !== assignmentTransactions.length ||
      settlementCount.count !== 0
    ) {
      throw new Error(
        `Demo reset verification failed: ${transactionCount.count} transactions, ` +
        `${settlementCount.count} settlements.`,
      );
    }

    console.log("Assignment demo database is ready.");
    console.log(`Backup: ${backupPath}`);
    console.log(`Transactions restored: ${transactionCount.count}`);
    console.log("Settlement records cleared: 0");
    console.log(
      "Next: import data/settlement_report.csv, then run run-reconciliation.ts.",
    );
  } finally {
    db.close();
  }
}

setupAssignmentDemo().catch((error: unknown) => {
  console.error(
    "Assignment demo setup failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
