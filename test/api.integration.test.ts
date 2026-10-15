import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";

const repositoryRoot = process.cwd();
const schemaPath = path.join(repositoryRoot, "src", "database", "schema.sql");
const tsxCli = path.join(repositoryRoot, "node_modules", "tsx", "dist", "cli.mjs");

interface ApiResponse {
  success?: boolean;
  message?: string;
  import?: {
    imported: number;
    unmatched: string[];
    invalid: string[];
    duplicates: string[];
  };
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to allocate a test port."));
        return;
      }

      server.close(() => resolve(address.port));
    });
  });
}

async function waitForHealth(baseUrl: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error("Test server exited before becoming ready.");
    }

    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // The server may still be starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Timed out waiting for the test server.");
}

async function postCsv(
  baseUrl: string,
  csv: string,
  filename = "test.csv"
): Promise<Response> {
  const form = new FormData();
  form.append("file", new Blob([csv], { type: "text/csv" }), filename);
  return fetch(`${baseUrl}/api/reconcile`, {
    method: "POST",
    body: form,
  });
}

test("API endpoints support isolated reconciliation and validation flows", async () => {
  const temporaryDirectory = await mkdtemp(
    path.join(os.tmpdir(), "transaction-reconciliation-api-")
  );
  const databaseDirectory = path.join(temporaryDirectory, "src", "database");
  await mkdir(databaseDirectory, { recursive: true });
  await writeFile(
    path.join(databaseDirectory, "schema.sql"),
    await readFile(schemaPath)
  );

  const database = new Database(path.join(temporaryDirectory, "reconciliation.db"));
  database.exec(await readFile(schemaPath, "utf8"));
  const insertTransaction = database.prepare(`
    INSERT INTO transactions (
      transaction_id, lifecycle_id, account_id, merchant_name,
      transaction_date, transaction_amount, currency, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTransaction.run("API-PARTIAL", "API-LC-PARTIAL", "API-ACC-1", "API Merchant", "2020-01-01", 100, "USD", "COMPLETED");
  insertTransaction.run("API-OVER", "API-LC-OVER", "API-ACC-2", "Over Merchant", "2020-01-01", 100, "USD", "COMPLETED");
  insertTransaction.run("API-INACTIVE", "API-LC-INACTIVE", "API-ACC-3", "Inactive Merchant", "2020-01-01", 100, "USD", "FAILED");
  insertTransaction.run("API-PENDING", "API-LC-PENDING", "API-ACC-4", "Pending Merchant", "2020-01-01", 100, "USD", "COMPLETED");
  database.prepare(`
    INSERT INTO settlement_history (
      settlement_id, transaction_id, lifecycle_id, settlement_date,
      settlement_amount, settlement_type, currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run("API-OVER-SETTLEMENT", "API-OVER", "API-LC-OVER", "2020-01-02", 120, "DEBIT", "USD");
  database.prepare(`
    INSERT INTO settlement_history (
      settlement_id, transaction_id, lifecycle_id, settlement_date,
      settlement_amount, settlement_type, currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run("API-INACTIVE-SETTLEMENT", "API-INACTIVE", "API-LC-INACTIVE", "2020-01-02", 10, "DEBIT", "USD");
  database.close();

  const port = await getFreePort();
  const child = spawn(process.execPath, [tsxCli, path.join(repositoryRoot, "src", "server.ts")], {
    cwd: temporaryDirectory,
    env: {
      ...process.env,
      PORT: String(port),
      UPLOAD_RATE_LIMIT_MAX: "3",
      LOG_DIR: path.join(temporaryDirectory, "test-logs"),
    },
    stdio: "ignore",
  });
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await waitForHealth(baseUrl, child);

    const health = await fetch(`${baseUrl}/health`);
    assert.deepEqual(await health.json(), {
      success: true,
      database: "connected",
    });

    const missingTransaction = await fetch(`${baseUrl}/api/transactions/missing-id`);
    assert.equal(missingTransaction.status, 404);

    const missingFile = await fetch(`${baseUrl}/api/reconcile`, { method: "POST" });
    assert.equal(missingFile.status, 400);

    const invalidFile = await postCsv(baseUrl, "not,a,valid,settlement", "invalid.csv");
    assert.equal(invalidFile.status, 500);

    const csv = [
      "settlement_id,lifecycle_id,account_id,merchant_name,transaction_date,settlement_date,settlement_amount,settlement_type,currency",
      "API-DUP,API-LC-PARTIAL,API-ACC-1,API Merchant,2020-01-01,2020-01-02,80,DEBIT,USD",
      "API-DUP,API-LC-PARTIAL,API-ACC-1,API Merchant,2020-01-01,2020-01-02,80,DEBIT,USD",
      "API-UNMATCHED,NO-LIFECYCLE,NO-ACCOUNT,Unknown,2020-01-01,2020-01-02,10,DEBIT,USD",
      "API-CURRENCY,API-LC-PARTIAL,API-ACC-1,API Merchant,2020-01-01,2020-01-02,10,DEBIT,EUR",
    ].join("\n");
    const importResponse = await postCsv(baseUrl, csv);
    assert.equal(importResponse.status, 200);
    const importBody = (await importResponse.json()) as ApiResponse;
    assert.equal(importBody.import?.imported, 1);
    assert.deepEqual(importBody.import?.duplicates, ["API-DUP"]);
    assert.deepEqual(importBody.import?.unmatched, ["API-UNMATCHED: No matching transaction"]);
    assert.deepEqual(importBody.import?.invalid, ["API-CURRENCY: Currency does not match transaction"]);

    const rateLimitedUpload = await postCsv(baseUrl, csv);
    assert.equal(rateLimitedUpload.status, 429);
    assert.equal((await rateLimitedUpload.json()).success, false);

    const reconciliation = await fetch(`${baseUrl}/api/reconciliation`);
    assert.equal(reconciliation.status, 200);
    const reconciliationBody = (await reconciliation.json()) as {
      data: Array<{ transaction_id: string; issues: Array<{ code: string }> }>;
    };
    const issuesByTransaction = new Map(
      reconciliationBody.data.map((result) => [
        result.transaction_id,
        result.issues.map((issue) => issue.code),
      ])
    );
    assert.deepEqual(issuesByTransaction.get("API-PARTIAL"), ["PARTIAL_SETTLEMENT"]);
    assert.deepEqual(issuesByTransaction.get("API-OVER"), ["OVER_SETTLEMENT"]);
    assert.deepEqual(issuesByTransaction.get("API-INACTIVE"), ["SETTLEMENT_FOR_INACTIVE_TRANSACTION"]);
    assert.deepEqual(issuesByTransaction.get("API-PENDING"), ["SETTLEMENT_OVERDUE"]);
  } finally {
    if (child.exitCode === null) {
      await new Promise<void>((resolve) => {
        child.once("exit", () => resolve());
        child.kill();
      });
    }
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
