export interface Transaction {
  transaction_id: string;
  lifecycle_id: string;
  account_id: string;
  merchant_name: string;
  transaction_date: string;
  transaction_amount: number;
  currency: string;
  status: string;
  settlement_status: string;
  total_settled_amount: number;
  last_settlement_date: string | null;
  created_at: string;
}

export interface TransactionListResponse {
  success: boolean;
  count: number;
  data: Transaction[];
}

export interface TransactionFilters {
  search: string;
  status: string;
}
export interface Settlement {
  settlement_id: string;
  transaction_id: string;
  lifecycle_id: string | null;
  settlement_date: string;
  settlement_amount: number;
  settlement_type: "DEBIT" | "CREDIT";
  currency: string;
  processed_at: string;
}