import db from "../database/connection.js";
import { parse } from "csv-parse/sync";
import logger from "../utils/logger.js";

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

const REQUIRED_COLUMNS = [
  "settlement_id",
  "lifecycle_id",
  "account_id",
  "merchant_name",
  "transaction_date",
  "settlement_date",
  "settlement_amount",
  "settlement_type",
  "currency",
] as const;

export interface ImportResult {
  totalRows: number;
  imported: number;
  unmatched: string[];
  invalid: string[];
  duplicates: string[];
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function importSettlementCsv(csvContent: string): ImportResult {
  logger.info("settlement.import.started", {
    event: "settlement.import.started",
    inputBytes: Buffer.byteLength(csvContent, "utf8"),
  });

  if (!csvContent.trim()) {
    throw new Error("The uploaded CSV file is empty.");
  }

  let headers: string[];
  let rows: SettlementRow[];

  try {
    const records = parse(csvContent, {
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false,
    }) as string[][];

    if (records.length < 1) {
      throw new Error("The CSV does not contain a header row.");
    }

    headers = records[0].map((header) => header.trim());

    const missingHeaders = REQUIRED_COLUMNS.filter(
      (column) => !headers.includes(column),
    );

    if (missingHeaders.length > 0) {
      throw new Error(
        `Missing required columns: ${missingHeaders.join(", ")}`,
      );
    }

    const dataRows = records.slice(1);

    rows = dataRows.map((values) => {
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });

      return row as unknown as SettlementRow;
    });
  } catch (error) {
    throw new Error(
      `Unable to parse CSV: ${
        error instanceof Error ? error.message : "Invalid CSV format"
      }`,
    );
  }

  const result: ImportResult = {
    totalRows: rows.length,
    imported: 0,
    unmatched: [],
    invalid: [],
    duplicates: [],
  };

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

  const settlementExists = db.prepare(`
    SELECT 1
    FROM settlement_history
    WHERE settlement_id = ?
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

  // Validate and prepare rows before writing anything.
  const preparedRows: Array<{
    settlementId: string;
    lifecycleId: string | null;
    accountId: string;
    merchantName: string;
    transactionDate: string;
    settlementDate: string;
    amount: number;
    type: "DEBIT" | "CREDIT";
    currency: string;
    rowNumber: number;
  }> = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;

    const settlementId = row.settlement_id?.trim();
    const lifecycleId = row.lifecycle_id?.trim() || null;
    const accountId = row.account_id?.trim();
    const merchantName = row.merchant_name?.trim();
    const transactionDate = row.transaction_date?.trim();
    const settlementDate = row.settlement_date?.trim();
    const currency = row.currency?.trim().toUpperCase();
    const type = row.settlement_type?.trim().toUpperCase();
    const amount = Number(row.settlement_amount);

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
      !isValidDate(transactionDate) ||
      !isValidDate(settlementDate)
    ) {
      result.invalid.push(`Row ${rowNumber}: Invalid or missing data`);
      continue;
    }

    preparedRows.push({
      settlementId,
      lifecycleId,
      accountId,
      merchantName,
      transactionDate,
      settlementDate,
      amount,
      type: type as "DEBIT" | "CREDIT",
      currency,
      rowNumber,
    });
  }

  // All database inserts happen in one transaction.
  // Unexpected database errors roll back every insert from this upload.
  const importRows = db.transaction(() => {
    for (const row of preparedRows) {
      if (settlementExists.get(row.settlementId)) {
        result.duplicates.push(row.settlementId);
        continue;
      }

      let transaction:
        | { transaction_id: string; currency: string }
        | undefined;

      // Primary match: lifecycle ID.
      if (row.lifecycleId) {
        transaction = findByLifecycleId.get(
          row.lifecycleId,
        ) as typeof transaction;
      }

      // Fallback: account + merchant + transaction date.
      if (!transaction) {
        transaction = findByFallback.get(
          row.accountId,
          row.merchantName,
          row.transactionDate,
        ) as typeof transaction;
      }

      if (!transaction) {
        result.unmatched.push(
          `${row.settlementId}: No matching transaction`,
        );
        continue;
      }

      if (transaction.currency.toUpperCase() !== row.currency) {
        result.invalid.push(
          `${row.settlementId}: Currency does not match transaction`,
        );
        continue;
      }

      insertSettlement.run(
        row.settlementId,
        transaction.transaction_id,
        row.lifecycleId,
        row.settlementDate,
        row.amount,
        row.type,
        row.currency,
      );

      result.imported++;
    }
  });

  importRows();

  logger.info("settlement.import.completed", {
    event: "settlement.import.completed",
    totalRows: result.totalRows,
    imported: result.imported,
    invalid: result.invalid.length,
    duplicates: result.duplicates.length,
    unmatched: result.unmatched.length,
  });

  return result;
}