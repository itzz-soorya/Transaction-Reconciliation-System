
import { get } from "../api/httpClient";

import type {
  Transaction,
  TransactionListResponse,
  Settlement,
} from "../types/transaction";

// Fetch all transactions
export async function fetchTransactions(): Promise<Transaction[]> {
  const response =
    await get<TransactionListResponse>("/transactions");

  if (!response.success) {
    throw new Error("Failed to fetch transactions.");
  }

  return response.data;
}

// Fetch one transaction by ID
export async function fetchTransactionById(
  transactionId: string
): Promise<Transaction> {
  const response = await get<{
    success: boolean;
    data: Transaction;
  }>(
    `/transactions/${encodeURIComponent(transactionId)}`
  );

  if (!response.success) {
    throw new Error("Failed to fetch transaction details.");
  }

  return response.data;
}

// Fetch settlement history for one transaction
export async function fetchSettlements(
  transactionId: string
): Promise<Settlement[]> {
  const response = await get<{
    success: boolean;
    transaction_id: string;
    count: number;
    data: Settlement[];
  }>(
    `/transactions/${encodeURIComponent(transactionId)}/settlements`
  );

  if (!response.success) {
    throw new Error("Failed to fetch settlement history.");
  }

  return response.data;
}
