import db from "../database/connection.js";
import { reconcileTransactions } from "./reconciliation.service.js";

export function getDashboardSummary() {
  const results = reconcileTransactions();

  const transactionCount = results.length;

  const statusCounts = {
    pending: 0,
    partial: 0,
    fullySettled: 0,
    overSettled: 0,
    refunded: 0,
    notApplicable: 0
  };

  let criticalIssues = 0;
  let warnings = 0;

  for (const transaction of results) {
    switch (transaction.settlement_status) {
      case "PENDING":
        statusCounts.pending++;
        break;
      case "PARTIAL":
        statusCounts.partial++;
        break;
      case "FULLY_SETTLED":
        statusCounts.fullySettled++;
        break;
      case "OVER_SETTLED":
        statusCounts.overSettled++;
        break;
      case "REFUNDED":
        statusCounts.refunded++;
        break;
      case "NOT_APPLICABLE":
        statusCounts.notApplicable++;
        break;
    }

    for (const issue of transaction.issues) {
      if (issue.severity === "CRITICAL") {
        criticalIssues++;
      } else {
        warnings++;
      }
    }
  }

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(transaction_amount), 0) AS transaction_amount,
      COALESCE(SUM(total_settled_amount), 0) AS net_settled_amount
    FROM transactions
    WHERE status = 'COMPLETED'
  `).get() as {
    transaction_amount: number;
    net_settled_amount: number;
  };

  return {
    transactionCount,
    statusCounts,
    criticalIssues,
    warnings,
    totalTransactionAmount: Number(
      totals.transaction_amount.toFixed(2)
    ),
    totalNetSettledAmount: Number(
      totals.net_settled_amount.toFixed(2)
    )
  };
}
