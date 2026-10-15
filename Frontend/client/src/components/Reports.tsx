import { useEffect, useMemo, useState } from "react";
import { fetchReportData } from "../services/reportService";
import type { DashboardSummary } from "../types/dashboard";
import type { CurrencyTotals } from "../services/reportService";

interface ReportState {
  summary: DashboardSummary;
  currencyTotals: CurrencyTotals[];
}

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function Reports() {
  const [report, setReport] = useState<ReportState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        const data = await fetchReportData();

        if (!cancelled) {
          setReport(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load report data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusBreakdown = useMemo(() => {
    if (!report) {
      return [];
    }

    const { statusCounts } = report.summary;
    return [
      { label: "Fully settled", value: statusCounts.fullySettled, color: "green" },
      { label: "Pending", value: statusCounts.pending, color: "orange" },
      { label: "Partial", value: statusCounts.partial, color: "orange" },
      { label: "Refunded", value: statusCounts.refunded, color: "purple" },
      { label: "Over-settled", value: statusCounts.overSettled, color: "red" },
    ];
  }, [report]);

  if (loading) {
    return (
      <main className="main-content">
        <p>Loading reports...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="main-content">
        <h1>Reports</h1>
        <p className="dashboard-error">{error}</p>
      </main>
    );
  }

  if (!report || report.summary.transactionCount === 0) {
    return (
      <main className="main-content">
        <h1>Reports</h1>
        <p>No transaction data is available to generate a report.</p>
      </main>
    );
  }

  const { summary, currencyTotals } = report;
  const maxStatusCount = Math.max(
    ...statusBreakdown.map((status) => status.value),
    1
  );

  return (
    <main className="main-content reports-page">
      <div className="dashboard-heading">
        <div>
          <h1>Reports</h1>
          <p>Review settlement performance and reconciliation totals.</p>
        </div>
        <span className="live-badge">
          {summary.transactionCount} transactions
        </span>
      </div>

      <section className="report-metric-grid">
        <article className="report-metric-card">
          <span>Total transactions</span>
          <strong>{summary.transactionCount}</strong>
        </article>
        <article className="report-metric-card">
          <span>Total transaction amount</span>
          <div className="report-currency-values">
            {currencyTotals.length === 0 ? (
              <strong>—</strong>
            ) : (
              currencyTotals.map((totals) => (
                <strong key={totals.currency}>
                  {formatAmount(totals.transactionAmount, totals.currency)}
                </strong>
              ))
            )}
          </div>
        </article>
        <article className="report-metric-card">
          <span>Total net settled amount</span>
          <div className="report-currency-values">
            {currencyTotals.length === 0 ? (
              <strong>—</strong>
            ) : (
              currencyTotals.map((totals) => (
                <strong key={totals.currency}>
                  {formatAmount(totals.netSettledAmount, totals.currency)}
                </strong>
              ))
            )}
          </div>
        </article>
        <article className="report-metric-card critical">
          <span>Critical issues</span>
          <strong>{summary.criticalIssues}</strong>
        </article>
        <article className="report-metric-card warning">
          <span>Warnings</span>
          <strong>{summary.warnings}</strong>
        </article>
      </section>

      <section className="report-status-section">
        <div className="report-section-heading">
          <div>
            <h2>Settlement status breakdown</h2>
            <p>
              {currencyTotals.length > 0
                ? "Amounts are grouped separately by currency."
                : "Currency data is unavailable."}
            </p>
          </div>
          <strong>{summary.transactionCount} total</strong>
        </div>

        <div className="report-status-list">
          {statusBreakdown.map((status) => (
            <div className="report-status-row" key={status.label}>
              <div className="report-status-label">
                <span>{status.label}</span>
                <strong>{status.value}</strong>
              </div>
              <div className="report-status-track">
                <span
                  className={`report-status-bar ${status.color}`}
                  style={{
                    width: `${(status.value / maxStatusCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="report-secondary-grid">
        <article className="report-detail-card">
          <span>Not applicable</span>
          <strong>{summary.statusCounts.notApplicable}</strong>
          <p>Transactions that do not require settlement reconciliation.</p>
        </article>
        <article className="report-detail-card">
          <span>Currency coverage</span>
          <strong>{currencyTotals.length}</strong>
          <p>
            {currencyTotals.length === 1
              ? currencyTotals[0].currency
              : currencyTotals.length > 1
                ? currencyTotals.map(({ currency }) => currency).join(", ")
                : "No currencies returned"}
          </p>
        </article>
      </section>
    </main>
  );
}

export default Reports;
