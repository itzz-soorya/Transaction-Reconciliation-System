import db from "./connection.js";
import { parse } from "csv-parse/sync";
import fs from "node:fs";
import path from "node:path";

interface SettlementRow {
  settlement_id: string;
  lifecycle_id: string;
  account_id: string;
  merchant_name: string;
  transaction_date: string;
  settlement_date: string;
  settlement_amount: string;
  settlement_type: string;
  currency: string;
}

const csvPath = path.resolve(
  process.cwd(),
  "data",
  "settlement_report.csv"
);

if (!fs.existsSync(csvPath)) {
  throw new Error(`CSV file not found: ${csvPath}`);
}

const csvContent = fs.readFileSync(csvPath, "utf8");

const rows = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true
}) as SettlementRow[];

const findByLifecycleId = db.prepare(`
  SELECT transaction_id, currency
  FROM transactions
  WHERE lifecycle_id = ?
`);

const findByFallback = db.prepare(`
  SELECT transaction_id, currency
  FROM transactions
  WHERE account_id = ?
    AND LOWER(TRIM(merchant_name)) = LOWER(TRIM(?))
    AND transaction_date = ?
`);

const insertSettlement = db.prepare(`
  INSERT INTO settlement_history (
    settlement_id,
    transaction_id,
    lifecycle_id,
    settlement_date,
    settlement_amount,
    settlement_type,
    currency
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const settlementExists = db.prepare(`
  SELECT 1
  FROM settlement_history
  WHERE settlement_id = ?
`);

const requiredColumns = [
  "settlement_id",
  "lifecycle_id",
  "account_id",
  "merchant_name",
  "transaction_date",
  "settlement_date",
  "settlement_amount",
  "settlement_type",
  "currency"
];

const results = {
  imported: 0,
  unmatched: [] as string[],
  invalid: [] as string[],
  duplicates: [] as string[]
};

const importRows = db.transaction(() => {
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;

    const missingColumns = requiredColumns.filter(
      (column) =>
        !Object.prototype.hasOwnProperty.call(row, column)
    );

    if (missingColumns.length > 0) {
      results.invalid.push(
        `Row ${rowNumber}: Missing columns: ${missingColumns.join(", ")}`
      );
      continue;
    }

    const settlementId = row.settlement_id?.trim();
    const lifecycleId = row.lifecycle_id?.trim() || null;
    const accountId = row.account_id?.trim();
    const merchantName = row.merchant_name?.trim();
    const transactionDate = row.transaction_date?.trim();
    const settlementDate = row.settlement_date?.trim();
    const currency = row.currency?.trim().toUpperCase();
    const type = row.settlement_type?.trim().toUpperCase();
    const amount = Number(row.settlement_amount);

    const validDate = (value: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(`${value}T00:00:00.000Z`)
        .toISOString()
        .startsWith(value);

    if (
      !settlementId ||
      !accountId ||
      !merchantName ||
      !transactionDate ||
      !settlementDate ||
      !currency ||
      !/^[A-Z]{3}$/.test(currency) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !["DEBIT", "CREDIT"].includes(type) ||
      !validDate(transactionDate) ||
      !validDate(settlementDate)
    ) {
      results.invalid.push(`Row ${rowNumber}: Invalid or missing data`);
      continue;
    }

    if (settlementExists.get(settlementId)) {
      results.duplicates.push(settlementId);
      continue;
    }

    let transaction: { transaction_id: string; currency: string } | undefined;

    if (lifecycleId) {
      transaction = findByLifecycleId.get(lifecycleId) as
        | { transaction_id: string; currency: string }
        | undefined;
    }

    if (!transaction) {
      transaction = findByFallback.get(
        accountId,
        merchantName,
        transactionDate
      ) as { transaction_id: string; currency: string } | undefined;
    }

    if (!transaction) {
      results.unmatched.push(
        `${settlementId}: No matching transaction`
      );
      continue;
    }

    if (transaction.currency.toUpperCase() !== currency) {
      results.invalid.push(
        `${settlementId}: Currency does not match transaction`
      );
      continue;
    }

    if (lifecycleId) {
      const lifecycleMatch = findByLifecycleId.get(lifecycleId) as
        | { transaction_id: string }
        | undefined;

      if (
        lifecycleMatch &&
        lifecycleMatch.transaction_id !== transaction.transaction_id
      ) {
        results.invalid.push(
          `${settlementId}: Lifecycle ID and fallback data conflict`
        );
        continue;
      }
    }

    insertSettlement.run(
      settlementId,
      transaction.transaction_id,
      lifecycleId,
      settlementDate,
      amount,
      type,
      currency
    );

    results.imported++;
  }
});

try {
  importRows();
} finally {
  db.close();
}

console.log("\nCSV import summary");
console.log("------------------");
console.log("CSV rows:", rows.length);
console.log("Imported:", results.imported);
console.log("Duplicates:", results.duplicates.length);
console.log("Unmatched:", results.unmatched.length);
console.log("Invalid:", results.invalid.length);

if (results.duplicates.length) {
  console.log("\nDuplicate settlement IDs:", results.duplicates);
}

if (results.unmatched.length) {
  console.log("\nUnmatched records:", results.unmatched);
}

if (results.invalid.length) {
  console.log("\nInvalid records:", results.invalid);
}