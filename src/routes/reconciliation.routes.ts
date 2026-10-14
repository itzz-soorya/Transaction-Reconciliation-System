import { Router } from "express";
import multer from "multer";
import { importSettlementCsv } from "../services/settlement-import.service.js";
import { reconcileTransactions } from "../services/reconciliation.service.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      callback(new Error("Please upload a .csv file."));
      return;
    }

    callback(null, true);
  },
});

router.post(
  "/reconcile",
  upload.single("file"),
  (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'CSV file is required. Use the field name "file".',
        });
        return;
      }

      const csvContent = req.file.buffer.toString("utf8");

      const importResult = importSettlementCsv(csvContent);

      // Run the existing reconciliation logic after importing.
      const reconciliationResult = reconcileTransactions();

      res.status(200).json({
        success: true,
        message: "Settlement CSV processed successfully.",
        import: importResult,
        reconciliation: {
          count: reconciliationResult.length,
          data: reconciliationResult,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;