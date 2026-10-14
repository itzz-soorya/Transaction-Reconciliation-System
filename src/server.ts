
import express from "express";
import db from "./database/connection.js";
import { reconcileTransactions } from "./services/reconciliation.service.js";
import { getDashboardSummary } from "./services/dashboard.service.js";
import transactionRoutes from "./routes/transactions.routes.js";
import reconciliationRoutes from "./routes/reconciliation.routes.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.use("/api/transactions", transactionRoutes);
app.use("/api", reconciliationRoutes);

app.get("/health", (_req, res) => {
  const result = db
    .prepare("SELECT 1 AS connected")
    .get() as { connected: number };

  res.json({
    success: true,
    database: result.connected === 1 ? "connected" : "disconnected"
  });
});

app.get("/api/reconciliation", (_req, res, next) => {
  try {
    const results = reconcileTransactions();

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/summary", (_req, res, next) => {
  try {
    res.json({
      success: true,
      data: getDashboardSummary()
    });
  } catch (error) {
    next(error);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
