
import { useEffect, useState } from "react";
import { fetchDashboardSummary } from "../services/dashboardService";
import type { DashboardSummary } from "../types/dashboard";

function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await fetchDashboardSummary();
        setSummary(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadSummary();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  if (loading) {
    return (
      <main className="main-content">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  if (error || !summary) {
    return (
      <main className="main-content">
        <h1>Dashboard</h1>
        <p className="dashboard-error">
          {error || "Dashboard data is unavailable."}
        </p>
      </main>
    );
  }

  const cards = [
    {
      label: "Total Transactions",
      value: summary.transactionCount,
      color: "blue",
    },
    {
      label: "Fully Settled",
      value: summary.statusCounts.fullySettled,
      color: "green",
    },
    {
      label: "Pending",
      value: summary.statusCounts.pending,
      color: "orange",
    },
    {
      label: "Critical Issues",
      value: summary.criticalIssues,
      color: "red",
    },
  ];

  return (
    <main className="main-content">
      <div className="dashboard-heading">
        <div>
          <p>Monitor your transactions and settlements.</p>
        </div>
        <span className="live-badge">Connected to API</span>
      </div>

      <section className="summary-grid">
        {cards.map((card) => (
          <article className="summary-card" key={card.label}>
            <div className="summary-card-top">
              <span>{card.label}</span>
              <span className={`status-dot ${card.color}`} />
            </div>
            <h2>{card.value}</h2>
          </article>
        ))}
      </section>

      <section className="amount-grid">
        <article className="amount-card">
          <p>Total Transaction Amount</p>
          <h2>{formatCurrency(summary.totalTransactionAmount)}</h2>
        </article>

        <article className="amount-card">
          <p>Net Settled Amount</p>
          <h2>{formatCurrency(summary.totalNetSettledAmount)}</h2>
        </article>
      </section>

      <section className="status-section">
        <h2>Settlement Overview</h2>

        <div className="status-list">
          <div>
            <span>Partial</span>
            <strong>{summary.statusCounts.partial}</strong>
          </div>
          <div>
            <span>Over-settled</span>
            <strong>{summary.statusCounts.overSettled}</strong>
          </div>
          <div>
            <span>Refunded</span>
            <strong>{summary.statusCounts.refunded}</strong>
          </div>
          <div>
            <span>Not applicable</span>
            <strong>{summary.statusCounts.notApplicable}</strong>
          </div>
          <div>
            <span>Warnings</span>
            <strong>{summary.warnings}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
