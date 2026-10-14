import db from "./connection.js";

const settlements = db.prepare(`
  SELECT
    settlement_id,
    transaction_id,
    settlement_date,
    settlement_amount,
    settlement_type,
    currency
  FROM settlement_history
  ORDER BY settlement_id
`).all();

console.table(settlements);
console.log("Total settlement records:", settlements.length);

db.close();