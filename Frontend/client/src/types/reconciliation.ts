import type { Transaction } from "./transaction";

export interface ReconciliationIssue {
  severity: "CRITICAL" | "WARNING";
  code: string;
  message: string;
}

export interface ReconciliationResult {
  transaction_id: string;
  debit_total: number;
  credit_total: number;
  net_settled_amount: number;
  settlement_status:
    | "PENDING"
    | "PARTIAL"
    | "FULLY_SETTLED"
    | "OVER_SETTLED"
    | "REFUNDED"
    | "NOT_APPLICABLE"
    | string;
  last_settlement_date: string | null;
  issues: ReconciliationIssue[];
}

export interface ImportSummary {
  totalRows: number;
  imported: number;
  unmatched: string[];
  invalid: string[];
  duplicates: string[];
}

export interface ReconciliationResponse {
  success: boolean;
  message: string;
  import: ImportSummary;
  reconciliation: {
    count: number;
    data: ReconciliationResult[];
  };
}

export interface ReconciliationListResponse {
  success: boolean;
  count: number;
  data: ReconciliationResult[];
}

export interface ReconciliationDisplayResult extends ReconciliationResult {
  transaction: Transaction | undefined;
}

export interface ReconciliationIssueRecord extends ReconciliationIssue {
  transaction_id: string;
  transaction: Transaction | undefined;
  net_settled_amount: number;
}
