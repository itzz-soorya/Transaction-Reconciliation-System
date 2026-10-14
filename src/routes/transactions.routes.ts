import { Router } from "express";
import db from "../database/connection.js";

const router = Router();

router.get("/", (_req, res, next) => {
  try {
    const transactions = db.prepare(`
      SELECT *
      FROM transactions
      ORDER BY transaction_date DESC
    `).all();

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/settlements", (req, res, next) => {
  try {
    const settlements = db.prepare(`
      SELECT *
      FROM settlement_history
      WHERE transaction_id = ?
      ORDER BY settlement_date DESC
    `).all(req.params.id);

    res.json({
      success: true,
      transaction_id: req.params.id,
      count: settlements.length,
      data: settlements
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", (req, res, next) => {
  try {
    const transaction = db.prepare(`
      SELECT *
      FROM transactions
      WHERE transaction_id = ?
    `).get(req.params.id);

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
      return;
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
});

export default router;
