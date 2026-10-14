
import db from "../database/connection.js";

interface TransactionRow {
  transaction_id: string;
  transaction_amount: number;
  transaction_date: string;
  status: string;
}

interface SettlementSummary {
  debit_total: number;
  credit_total: number;
  net_total: number;
  latest_settlement_date: string | null;
  settlement_count: number;
}

interface ReconciliationIssue {
  severity: "CRITICAL" | "WARNING";
  code: string;
  message: string;
}

interface ReconciliationResult {
  transaction_id: string;
  debit_total: number;
  credit_total: number;
  net_settled_amount: number;
  settlement_status: string;
  last_settlement_date: string | null;
  issues: ReconciliationIssue[];
}

const getTransactions = db.prepare(`
  SELECT
    transaction_id,
    transaction_amount,
    transaction_date,
    status
  FROM transactions
`);

const getSettlementSummary = db.prepare(`
  SELECT
    COALESCE(
      SUM(CASE WHEN settlement_type = 'DEBIT'
          THEN settlement_amount ELSE 0 END), 0
    ) AS debit_total,

    COALESCE(
      SUM(CASE WHEN settlement_type = 'CREDIT'
          THEN settlement_amount ELSE 0 END), 0
    ) AS credit_total,

    COALESCE(
      SUM(CASE WHEN settlement_type = 'DEBIT'
          THEN settlement_amount
          WHEN settlement_type = 'CREDIT'
          THEN -settlement_amount
          ELSE 0 END), 0
    ) AS net_total,

    MAX(settlement_date) AS latest_settlement_date,
    COUNT(*) AS settlement_count

  FROM settlement_history
  WHERE transaction_id = ?
`);

const updateTransaction = db.prepare(`
  UPDATE transactions
  SET
    total_settled_amount = ?,
    settlement_status = ?,
    last_settlement_date = ?
  WHERE transaction_id = ?
`);

function determineStatus(
  transaction: TransactionRow,
  summary: SettlementSummary
): string {
  if (transaction.status !== "COMPLETED") {
    return "NOT_APPLICABLE";
  }

  if (summary.settlement_count === 0) {
    return "PENDING";
  }

  const amount = Math.round(summary.net_total * 100);
  const expected = Math.round(transaction.transaction_amount * 100);
  const hasRefund = summary.credit_total > 0;

  if (hasRefund && amount < expected) {
    return "REFUNDED";
  }

  if (amount > expected) {
    return "OVER_SETTLED";
  }

  if (amount === expected) {
    return "FULLY_SETTLED";
  }

  return "PARTIAL";
}

function detectIssues(
  transaction: TransactionRow,
  summary: SettlementSummary
): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = [];

  const amount = Math.round(transaction.transaction_amount * 100);
  const netAmount = Math.round(summary.net_total * 100);

  // A failed or declined transaction should not have settlements.
  if (
    transaction.status !== "COMPLETED" &&
    summary.settlement_count > 0
  ) {
    issues.push({
      severity: "CRITICAL",
      code: "SETTLEMENT_FOR_INACTIVE_TRANSACTION",
      message:
        `Transaction status is ${transaction.status}, ` +
        "but settlement records exist."
    });

    return issues;
  }

  // Only completed transactions need the settlement checks below.
  if (transaction.status !== "COMPLETED") {
    return issues;
  }

  // Settlement exceeds the original transaction amount.
  if (netAmount > amount) {
    issues.push({
      severity: "CRITICAL",
      code: "OVER_SETTLEMENT",
      message:
        `Net settled amount ${summary.net_total.toFixed(2)} ` +
        `exceeds transaction amount ${transaction.transaction_amount.toFixed(2)}.`
    });
  }

  // No settlement within seven days of the transaction date.
  if (summary.settlement_count === 0) {
    const transactionDate = new Date(
      `${transaction.transaction_date.slice(0, 10)}T00:00:00Z`
    );

    const today = new Date();
    const todayUtc = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    );

    const transactionUtc = transactionDate.getTime();
    const daysElapsed = Math.floor(
      (todayUtc - transactionUtc) / (24 * 60 * 60 * 1000)
    );

    if (
      Number.isFinite(transactionUtc) &&
      daysElapsed > 7
    ) {
      issues.push({
        severity: "CRITICAL",
        code: "SETTLEMENT_OVERDUE",
        message:
          `No settlement received within 7 days. ` +
          `${daysElapsed} days have elapsed.`
      });
    }

    return issues;
  }

  // A partial settlement without any refund is a warning.
  // Refund scenarios are intentionally excluded from this warning.
  if (
    netAmount < amount &&
    summary.credit_total === 0
  ) {
    issues.push({
      severity: "WARNING",
      code: "PARTIAL_SETTLEMENT",
      message:
        `Net settled amount ${summary.net_total.toFixed(2)} ` +
        `is less than transaction amount ${transaction.transaction_amount.toFixed(2)}.`
    });
  }

  return issues;
}

export function reconcileTransactions(): ReconciliationResult[] {
  const transactions = getTransactions.all() as TransactionRow[];

  const reconcileAll = db.transaction(() => {
    const results: ReconciliationResult[] = [];

    for (const transaction of transactions) {
      const summary = getSettlementSummary.get(
        transaction.transaction_id
      ) as SettlementSummary;

      const status = determineStatus(transaction, summary);
      const netAmount = Math.round(summary.net_total * 100) / 100;
      const issues = detectIssues(transaction, summary);

      updateTransaction.run(
        netAmount,
        status,
        summary.latest_settlement_date,
        transaction.transaction_id
      );

      results.push({
        transaction_id: transaction.transaction_id,
        debit_total: summary.debit_total,
        credit_total: summary.credit_total,
        net_settled_amount: netAmount,
        settlement_status: status,
        last_settlement_date: summary.latest_settlement_date,
        issues
      });
    }

    return results;
  });

  return reconcileAll();
}
