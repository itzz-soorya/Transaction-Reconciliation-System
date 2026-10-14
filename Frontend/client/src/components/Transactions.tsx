
import { useEffect, useMemo, useState } from "react";
import {
  fetchTransactions,
  fetchTransactionById,
  fetchSettlements,
} from "../services/transactionService";
import type {
  Transaction,
  Settlement,
} from "../types/transaction";
import TransactionDetailsModal from "./TransactionDetailsModal";

function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTransactionId, setSelectedTransactionId] =
    useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      try {
        const data = await fetchTransactions();

        if (!cancelled) {
          setTransactions(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load transactions."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.transaction_id.toLowerCase().includes(query) ||
        transaction.merchant_name.toLowerCase().includes(query) ||
        transaction.account_id.toLowerCase().includes(query);

      const matchesStatus =
        status === "ALL" ||
        transaction.settlement_status === status;

      return matchesSearch && matchesStatus;
    });
  }, [transactions, search, status]);

  async function handleSelectTransaction(transactionId: string) {
    setSelectedTransactionId(transactionId);
    setSelectedTransaction(null);
    setSettlements([]);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const [transaction, settlementHistory] = await Promise.all([
        fetchTransactionById(transactionId),
        fetchSettlements(transactionId),
      ]);

      setSelectedTransaction(transaction);
      setSettlements(settlementHistory);
    } catch (err) {
      setDetailsError(
        err instanceof Error
          ? err.message
          : "Unable to load transaction details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetails() {
    setSelectedTransactionId(null);
    setSelectedTransaction(null);
    setSettlements([]);
    setDetailsError("");
    setDetailsLoading(false);
  }

  function formatMoney(amount: number, currency: string) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  if (loading) {
    return (
      <main className="main-content">
        <p>Loading transactions...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="main-content">
        <h1>Transactions</h1>
        <p className="dashboard-error">{error}</p>
      </main>
    );
  }

  return (
    <main className="main-content transactions-page">
      <div className="dashboard-heading">
        <div>
          
          <p>Search and review transaction settlement status.</p>
        </div>

        <span className="live-badge">
          {transactions.length} transactions
        </span>
      </div>

      <section className="transaction-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search transaction, merchant or account..."
          aria-label="Search transactions"
        />

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by settlement status"
        >
          <option value="ALL">All statuses</option>
          <option value="FULLY_SETTLED">Fully settled</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
          <option value="OVER_SETTLED">Over-settled</option>
          <option value="REFUNDED">Refunded</option>
          <option value="NOT_APPLICABLE">Not applicable</option>
        </select>
      </section>

      <section className="transaction-table-container">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Merchant</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Settled</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {filteredTransactions.map((transaction) => (
              <tr
                key={transaction.transaction_id}
                className={`clickable-row ${
                  selectedTransactionId === transaction.transaction_id
                    ? "selected-row"
                    : ""
                }`}
                onClick={() =>
                  void handleSelectTransaction(transaction.transaction_id)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void handleSelectTransaction(transaction.transaction_id);
                  }
                }}
                tabIndex={0}
                aria-label={`View details for ${transaction.transaction_id}`}
              >
                <td>
                  <strong>{transaction.transaction_id}</strong>
                  <span className="secondary-text">
                    {transaction.account_id}
                  </span>
                </td>

                <td>{transaction.merchant_name}</td>
                <td>{transaction.transaction_date}</td>

                <td>
                  {formatMoney(
                    transaction.transaction_amount,
                    transaction.currency
                  )}
                </td>

                <td>
                  {formatMoney(
                    transaction.total_settled_amount,
                    transaction.currency
                  )}
                </td>

                <td>
                  <span
                    className={`transaction-status status-${transaction.settlement_status
                      .toLowerCase()
                      .replaceAll("_", "-")}`}
                  >
                    {transaction.settlement_status.replaceAll("_", " ")}
                  </span>
                </td>
              </tr>
            ))}

            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  No matching transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <p className="table-footer">
        Showing {filteredTransactions.length} of {transactions.length} transactions
      </p>

      {selectedTransactionId && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          settlements={settlements}
          loading={detailsLoading}
          error={detailsError}
          onClose={closeDetails}
        />
      )}
    </main>
  );
}

export default Transactions;
