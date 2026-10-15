import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

const repositoryRoot = process.cwd();
let temporaryDirectory: string;
let reconcileTransactions: typeof import("../src/services/reconciliation.service.js").reconcileTransactions;
let db: typeof import("../src/database/connection.js").default;

before(async () => {
  temporaryDirectory = await mkdtemp(
    path.join(os.tmpdir(), "transaction-reconciliation-")
  );

  const databaseDirectory = path.join(temporaryDirectory, "src", "database");
  await mkdir(databaseDirectory, { recursive: true });
  await writeFile(
    path.join(databaseDirectory, "schema.sql"),
    await readFile(path.join(repositoryRoot, "src", "database", "schema.sql"))
  );

  process.chdir(temporaryDirectory);
  ({ reconcileTransactions } = await import(
    "../src/services/reconciliation.service.js"
  ));
  ({ default: db } = await import("../src/database/connection.js"));
});

after(async () => {
  db.close();
  process.chdir(repositoryRoot);
  await rm(temporaryDirectory, { recursive: true, force: true });
});

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateRelativeToToday(daysFromToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return formatDate(date);
}

function seedTransaction(
  transactionId: string,
  transactionDate = "2026-10-01"
): void {
  db.prepare(`
    INSERT INTO transactions (
      transaction_id,
      account_id,
      merchant_name,
      transaction_date,
      transaction_amount,
      currency,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    transactionId,
    "test-account",
    "Test merchant",
    transactionDate,
    100,
    "USD",
    "COMPLETED"
  );
}

function seedSettlement(
  transactionId: string,
  settlementId: string,
  amount: number,
  type: "DEBIT" | "CREDIT",
  settlementDate = "2026-10-02"
): void {
  const insertSettlement = db.prepare(`
    INSERT INTO settlement_history (
      settlement_id,
      transaction_id,
      settlement_date,
      settlement_amount,
      settlement_type,
      currency
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertSettlement.run(
    settlementId,
    transactionId,
    settlementDate,
    amount,
    type,
    "USD"
  );
}

async function seedRefundScenario(
  transactionId: string,
  creditAmount: number
): Promise<void> {
  seedTransaction(transactionId);
  seedSettlement(transactionId, `${transactionId}-debit`, 100, "DEBIT");
  seedSettlement(
    transactionId,
    `${transactionId}-credit`,
    creditAmount,
    "CREDIT",
    "2026-10-03"
  );
}

test("Scenario 3: a partial refund has an 80.00 net and no issues", async () => {
  await seedRefundScenario("scenario-3", 20);

  const result = reconcileTransactions().find(
    ({ transaction_id }) => transaction_id === "scenario-3"
  );

  assert.ok(result);
  assert.equal(result.transaction_id, "scenario-3");
  assert.equal(result.net_settled_amount, 80);
  assert.equal(result.settlement_status, "REFUNDED");
  assert.deepEqual(result.issues, []);
});

test("Scenario 7: a complex refund has a 70.00 net and no issues", async () => {
  await seedRefundScenario("scenario-7", 30);

  const result = reconcileTransactions().find(
    ({ transaction_id }) => transaction_id === "scenario-7"
  );

  assert.ok(result);
  assert.equal(result.transaction_id, "scenario-7");
  assert.equal(result.net_settled_amount, 70);
  assert.equal(result.settlement_status, "REFUNDED");
  assert.deepEqual(result.issues, []);
});

test("Test 1: a perfect match is fully settled without issues", () => {
  seedTransaction("test-perfect-match");
  seedSettlement("test-perfect-match", "test-perfect-match-debit", 100, "DEBIT");

  const result = reconcileTransactions().find(
    ({ transaction_id }) => transaction_id === "test-perfect-match"
  );

  assert.ok(result);
  assert.equal(result.net_settled_amount, 100);
  assert.equal(result.settlement_status, "FULLY_SETTLED");
  assert.equal(result.issues.length, 0);
  assert.deepEqual(result.issues, []);
});

test("Test 2: a partial settlement reports one warning", () => {
  seedTransaction("test-partial-settlement");
  seedSettlement(
    "test-partial-settlement",
    "test-partial-settlement-debit",
    80,
    "DEBIT"
  );

  const result = reconcileTransactions().find(
    ({ transaction_id }) => transaction_id === "test-partial-settlement"
  );

  assert.ok(result);
  assert.equal(result.net_settled_amount, 80);
  assert.equal(result.settlement_status, "PARTIAL");
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].severity, "WARNING");
  assert.equal(result.issues[0].code, "PARTIAL_SETTLEMENT");
});

test("Test 3: an over-settlement reports one critical issue", () => {
  seedTransaction("test-over-settlement");
  seedSettlement(
    "test-over-settlement",
    "test-over-settlement-debit",
    120,
    "DEBIT"
  );

  const result = reconcileTransactions().find(
    ({ transaction_id }) => transaction_id === "test-over-settlement"
  );

  assert.ok(result);
  assert.equal(result.net_settled_amount, 120);
  assert.equal(result.settlement_status, "OVER_SETTLED");
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].severity, "CRITICAL");
  assert.equal(result.issues[0].code, "OVER_SETTLEMENT");
});

test("Test 4: an overdue pending settlement reports one critical issue", () => {
  seedTransaction(
    "test-pending-overdue",
    dateRelativeToToday(-8)
  );

  const result = reconcileTransactions().find(
    ({ transaction_id }) => transaction_id === "test-pending-overdue"
  );

  assert.ok(result);
  assert.equal(result.net_settled_amount, 0);
  assert.equal(result.settlement_status, "PENDING");
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].severity, "CRITICAL");
  assert.equal(result.issues[0].code, "SETTLEMENT_OVERDUE");
});

test("Test 5: a recent pending settlement has no issues", () => {
  seedTransaction(
    "test-pending-within-seven-days",
    dateRelativeToToday(-6)
  );

  const result = reconcileTransactions().find(
    ({ transaction_id }) => transaction_id === "test-pending-within-seven-days"
  );

  assert.ok(result);
  assert.equal(result.net_settled_amount, 0);
  assert.equal(result.settlement_status, "PENDING");
  assert.equal(result.issues.length, 0);
  assert.deepEqual(result.issues, []);
});
