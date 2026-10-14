import db from "./connection.js";

const transactions = db
  .prepare(`
    SELECT transaction_id, merchant_name, transaction_amount,
           status, settlement_status
    FROM transactions
    ORDER BY transaction_id
  `)
  .all();

console.table(transactions);

console.log("Total transactions:", transactions.length);

db.close();