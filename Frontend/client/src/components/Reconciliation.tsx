import { useState } from "react";
import { uploadSettlementReport } from "../services/reconciliationService";
import type {
  ImportSummary,
  ReconciliationDisplayResult,
} from "../types/reconciliation";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function Reconciliation() {
  const [file, setFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [results, setResults] = useState<ReconciliationDisplayResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setError("");
    setSuccess("");
    setImportSummary(null);
    setResults([]);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setError("Please select a CSV file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("The CSV file must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || loading) {
      if (!file) {
        setError("Select a CSV settlement report before uploading.");
      }
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setImportSummary(null);
    setResults([]);

    try {
      const run = await uploadSettlementReport(file);
      setImportSummary(run.importSummary);
      setResults(run.results);
      setSuccess("Settlement report processed successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process the settlement report."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="main-content reconciliation-page">
      <div className="dashboard-heading">
        <div>
          <h1>Reconciliation</h1>
          <p>Upload a settlement report to match and reconcile transactions.</p>
        </div>
        <span className="live-badge">CSV import</span>
      </div>

      <section className="reconciliation-upload">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="settlement-report">Settlement report</label>
          <div className="upload-row">
            <input
              id="settlement-report"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={loading}
            />
            <button type="submit" className="primary-button" disabled={loading || !file}>
              {loading ? "Processing..." : "Upload and reconcile"}
            </button>
          </div>
          <p className="upload-help">
            CSV files only, up to 5 MB. The required settlement columns are validated by the server.
          </p>
        </form>
      </section>

      {error && <p className="feedback-message feedback-error">{error}</p>}
      {success && <p className="feedback-message feedback-success">{success}</p>}

      {importSummary && (
        <section className="reconciliation-summary">
          <h2>Import summary</h2>
          <div className="reconciliation-summary-grid">
            <div><span>Rows processed</span><strong>{importSummary.totalRows}</strong></div>
            <div><span>Imported</span><strong>{importSummary.imported}</strong></div>
            <div><span>Unmatched</span><strong>{importSummary.unmatched.length}</strong></div>
            <div><span>Invalid</span><strong>{importSummary.invalid.length}</strong></div>
            <div><span>Duplicates</span><strong>{importSummary.duplicates.length}</strong></div>
          </div>
          <div className="import-detail-grid">
            {([
              ["Unmatched rows", importSummary.unmatched],
              ["Invalid rows", importSummary.invalid],
              ["Duplicate rows", importSummary.duplicates],
            ] as Array<[string, string[]]>).map(([label, values]) => (
              <div key={label} className="import-detail">
                <h3>{label}</h3>
                {values.length === 0 ? (
                  <p>None</p>
                ) : (
                  <ul>
                    {values.map((value) => <li key={value}>{value}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {importSummary && (
        <section className="reconciliation-results">
          <div className="results-heading">
            <h2>Reconciliation results</h2>
            <span className="live-badge">{results.length} transactions</span>
          </div>
          <div className="transaction-table-container">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Net settled</th>
                  <th>Status</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.transaction_id}>
                    <td>{result.transaction_id}</td>
                    <td>{result.transaction?.merchant_name ?? "Transaction not found"}</td>
                    <td>
                      {result.transaction
                        ? formatMoney(result.transaction.transaction_amount, result.transaction.currency)
                        : "—"}
                    </td>
                    <td>
                      {formatMoney(
                        result.net_settled_amount,
                        result.transaction?.currency
                      )}
                    </td>
                    <td>
                      <span
                        className={`transaction-status status-${result.settlement_status
                          .toLowerCase()
                          .replaceAll("_", "-")}`}
                      >
                        {statusLabel(result.settlement_status)}
                      </span>
                    </td>
                    <td>
                      {result.issues.length === 0 ? (
                        <span className="no-issues">No issues</span>
                      ) : (
                        <ul className="issue-list">
                          {result.issues.map((issue) => (
                            <li key={`${issue.code}-${issue.message}`}>
                              <strong>{issue.severity}</strong> {issue.code}: {issue.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      No reconciliation results returned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

export default Reconciliation;
