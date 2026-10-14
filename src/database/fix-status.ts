import db from "./connection.js";

const result = db.prepare(`
  UPDATE transactions
  SET settlement_status = CASE
    WHEN status = 'COMPLETED' THEN 'PENDING'
    ELSE 'NOT_APPLICABLE'
  END
`).run();

console.log(`Updated ${result.changes} transaction records.`);

db.close();