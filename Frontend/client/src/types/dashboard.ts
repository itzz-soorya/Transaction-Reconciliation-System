export interface DashboardSummary {
  transactionCount: number;

  statusCounts: {
    pending: number;
    partial: number;
    fullySettled: number;
    overSettled: number;
    refunded: number;
    notApplicable: number;
  };

  criticalIssues: number;
  warnings: number;
  totalTransactionAmount: number;
  totalNetSettledAmount: number;
}

export interface DashboardSummaryResponse {
  success: boolean;
  data: DashboardSummary;
}
