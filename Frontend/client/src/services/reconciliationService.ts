import { get, postFormData } from "../api/httpClient";
import { fetchTransactions } from "./transactionService";
import type {
  ReconciliationDisplayResult,
  ReconciliationIssueRecord,
  ReconciliationListResponse,
  ReconciliationResponse,
} from "../types/reconciliation";

export interface ReconciliationRun {
  importSummary: ReconciliationResponse["import"];
  results: ReconciliationDisplayResult[];
}

export async function fetchReconciliationIssues(): Promise<
  ReconciliationIssueRecord[]
> {
  const [reconciliationResponse, transactions] = await Promise.all([
    get<ReconciliationListResponse>("/reconciliation"),
    fetchTransactions(),
  ]);

  if (!reconciliationResponse.success) {
    throw new Error("Failed to fetch reconciliation issues.");
  }

  const transactionsById = new Map(
    transactions.map((transaction) => [transaction.transaction_id, transaction])
  );

  return reconciliationResponse.data.flatMap((result) => {
    const transaction = transactionsById.get(result.transaction_id);

    return result.issues.map((issue) => ({
      ...issue,
      transaction_id: result.transaction_id,
      transaction,
      net_settled_amount: result.net_settled_amount,
    }));
  });
}

export async function uploadSettlementReport(
  file: File
): Promise<ReconciliationRun> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await postFormData<ReconciliationResponse>(
    "/reconcile",
    formData
  );

  if (!response.success) {
    throw new Error(response.message || "Settlement report could not be processed.");
  }

  const transactions = await fetchTransactions();
  const transactionsById = new Map(
    transactions.map((transaction) => [transaction.transaction_id, transaction])
  );

  return {
    importSummary: response.import,
    results: response.reconciliation.data.map((result) => ({
      ...result,
      transaction: transactionsById.get(result.transaction_id),
    })),
  };
}
