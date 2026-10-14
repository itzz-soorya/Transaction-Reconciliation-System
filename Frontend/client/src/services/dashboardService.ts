
import { get } from "../api/httpClient";
import type {
  DashboardSummary,
  DashboardSummaryResponse,
} from "../types/dashboard";

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await get<DashboardSummaryResponse>(
    "/dashboard/summary"
  );

  if (!response.success) {
    throw new Error("Failed to fetch dashboard summary.");
  }

  return response.data;
}
