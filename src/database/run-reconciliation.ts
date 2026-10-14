import { reconcileTransactions } from "../services/reconciliation.service.js";
import db from "./connection.js";

try {
  const results = reconcileTransactions();

  console.log(
  JSON.stringify(results, null, 2)
);

  console.log(
    `Reconciliation completed for ${results.length} transactions.`
  );
} catch (error) {
  console.error("Reconciliation failed:", error);
  process.exitCode = 1;
} finally {
  db.close();
}