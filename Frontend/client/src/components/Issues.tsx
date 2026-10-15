import { useEffect, useMemo, useState } from "react";
import { fetchReconciliationIssues } from "../services/reconciliationService";
import type {
  ReconciliationIssueRecord,
} from "../types/reconciliation";

type IssueFilter = "ALL" | "CRITICAL" | "WARNING";

function formatMoney(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function Issues() {
  const [issues, setIssues] = useState<ReconciliationIssueRecord[]>([]);
  const [filter, setFilter] = useState<IssueFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadIssues() {
      try {
        const data = await fetchReconciliationIssues();

        if (!cancelled) {
          setIssues(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load reconciliation issues."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadIssues();

    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: issues.length,
      critical: issues.filter((issue) => issue.severity === "CRITICAL").length,
      warning: issues.filter((issue) => issue.severity === "WARNING").length,
    }),
    [issues]
  );

  const filteredIssues = useMemo(
    () =>
      filter === "ALL"
        ? issues
        : issues.filter((issue) => issue.severity === filter),
    [filter, issues]
  );

  if (loading) {
    return (
      <main className="main-content">
        <p>Loading issues...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="main-content">
        <h1>Issues</h1>
        <p className="dashboard-error">{error}</p>
      </main>
    );
  }

  return (
    <main className="main-content issues-page">
      <div className="dashboard-heading">
        <div>
          <h1>Issues</h1>
          <p>Review warnings and critical reconciliation discrepancies.</p>
        </div>
        <span className="live-badge">{counts.all} issues</span>
      </div>

      <section className="issue-summary-grid">
        <button
          type="button"
          className={`issue-summary-card ${filter === "ALL" ? "selected" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          <span>All issues</span>
          <strong>{counts.all}</strong>
        </button>
        <button
          type="button"
          className={`issue-summary-card critical ${
            filter === "CRITICAL" ? "selected" : ""
          }`}
          onClick={() => setFilter("CRITICAL")}
        >
          <span>Critical</span>
          <strong>{counts.critical}</strong>
        </button>
        <button
          type="button"
          className={`issue-summary-card warning ${
            filter === "WARNING" ? "selected" : ""
          }`}
          onClick={() => setFilter("WARNING")}
        >
          <span>Warnings</span>
          <strong>{counts.warning}</strong>
        </button>
      </section>

      {/* <section className="issue-filter-bar" aria-label="Issue severity filter">
        {(["ALL", "CRITICAL", "WARNING"] as IssueFilter[]).map((option) => (
          <button
            type="button"
            key={option}
            className={filter === option ? "selected" : ""}
            onClick={() => setFilter(option)}
          >
            {option === "ALL" ? "All" : option === "CRITICAL" ? "Critical" : "Warning"}
          </button>
        ))}
      </section> */}

      <section className="issue-table-container">
        <table className="transaction-table issue-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Issue</th>
              <th>Transaction</th>
              <th>Merchant</th>
              <th>Amounts</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.map((issue, index) => (
              <tr key={`${issue.transaction_id}-${issue.code}-${index}`}>
                <td>
                  <span className={`issue-severity issue-${issue.severity.toLowerCase()}`}>
                    {issue.severity}
                  </span>
                </td>
                <td>
                  <strong>{issue.code}</strong>
                </td>
                <td>{issue.transaction_id}</td>
                <td>{issue.transaction?.merchant_name ?? "—"}</td>
                <td>
                  {issue.transaction
                    ? `Transaction: ${formatMoney(
                        issue.transaction.transaction_amount,
                        issue.transaction.currency
                      )}`
                    : "Transaction: —"}
                  <span className="secondary-text">
                    Net settled:{" "}
                    {formatMoney(
                      issue.net_settled_amount,
                      issue.transaction?.currency
                    )}
                  </span>
                </td>
                <td className="issue-description">{issue.message}</td>
              </tr>
            ))}
            {filteredIssues.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  No reconciliation issues found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

export default Issues;
