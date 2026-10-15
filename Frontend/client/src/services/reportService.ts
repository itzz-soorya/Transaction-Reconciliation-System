import { fetchDashboardSummary } from "./dashboardService";
import { fetchTransactions } from "./transactionService";
import type { DashboardSummary } from "../types/dashboard";

export interface CurrencyTotals {
  currency: string;
  transactionAmount: number;
  netSettledAmount: number;
}

export interface ReportData {
  summary: DashboardSummary;
  currencyTotals: CurrencyTotals[];
}

export async function fetchReportData(): Promise<ReportData> {
  const [summary, transactions] = await Promise.all([
    fetchDashboardSummary(),
    fetchTransactions(),
  ]);

  return {
    summary,
    currencyTotals: Array.from(
      transactions
        .filter((transaction) => transaction.status === "COMPLETED")
        .reduce((totals, transaction) => {
          const currency = transaction.currency.toUpperCase();
          const current = totals.get(currency) ?? {
            currency,
            transactionAmount: 0,
            netSettledAmount: 0,
          };

          current.transactionAmount += transaction.transaction_amount;
          current.netSettledAmount += transaction.total_settled_amount;
          totals.set(currency, current);
          return totals;
        }, new Map<string, CurrencyTotals>())
        .values()
    ).map((totals) => ({
      ...totals,
      transactionAmount: Number(totals.transactionAmount.toFixed(2)),
      netSettledAmount: Number(totals.netSettledAmount.toFixed(2)),
    })),
  };
}
