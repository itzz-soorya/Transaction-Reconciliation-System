
import { useEffect } from "react";
import type { Transaction, Settlement } from "../types/transaction";

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  settlements: Settlement[];
  loading: boolean;
  error: string;
  onClose: () => void;
}

function TransactionDetailsModal({
  transaction,
  settlements,
  loading,
  error,
  onClose,
}: TransactionDetailsModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function money(amount: number, currency: string) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="transaction-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
      >
        <header className="modal-header">
          <div>
            <h2 id="transaction-modal-title">Transaction Details</h2>
            <p>{transaction?.transaction_id ?? "Loading transaction..."}</p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close transaction details"
          >
            ×
          </button>
        </header>

        <div className="modal-content">
          {loading && <p>Loading transaction details...</p>}

          {!loading && error && (
            <p className="dashboard-error">{error}</p>
          )}

          {!loading && !error && transaction && (
            <>
              <div className="details-grid">
                <div>
                  <span>Merchant</span>
                  <strong>{transaction.merchant_name}</strong>
                </div>
                <div>
                  <span>Account ID</span>
                  <strong>{transaction.account_id}</strong>
                </div>
                <div>
                  <span>Lifecycle ID</span>
                  <strong>{transaction.lifecycle_id}</strong>
                </div>
                <div>
                  <span>Transaction Date</span>
                  <strong>{transaction.transaction_date}</strong>
                </div>
                <div>
                  <span>Transaction Amount</span>
                  <strong>
                    {money(transaction.transaction_amount, transaction.currency)}
                  </strong>
                </div>
                <div>
                  <span>Transaction Status</span>
                  <strong>{transaction.status}</strong>
                </div>
                <div>
                  <span>Settlement Status</span>
                  <strong>
                    {transaction.settlement_status.replaceAll("_", " ")}
                  </strong>
                </div>
                <div>
                  <span>Net Settled Amount</span>
                  <strong>
                    {money(transaction.total_settled_amount, transaction.currency)}
                  </strong>
                </div>
                <div>
                  <span>Latest Settlement Date</span>
                  <strong>{transaction.last_settlement_date || "—"}</strong>
                </div>
              </div>

              <h3>Settlement History</h3>

              {settlements.length === 0 ? (
                <p>No settlement records found.</p>
              ) : (
                <div className="transaction-table-container">
                  <table className="transaction-table">
                    <thead>
                      <tr>
                        <th>Settlement ID</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Currency</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlements.map((settlement) => (
                        <tr key={settlement.settlement_id}>
                          <td>{settlement.settlement_id}</td>
                          <td>{settlement.settlement_type}</td>
                          <td>
                            {money(
                              settlement.settlement_amount,
                              settlement.currency
                            )}
                          </td>
                          <td>{settlement.currency}</td>
                          <td>{settlement.settlement_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default TransactionDetailsModal;
