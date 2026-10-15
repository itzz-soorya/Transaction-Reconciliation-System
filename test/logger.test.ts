import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { Logger } from "../src/utils/logger.js";

test("logger creates a daily file and appends severity entries", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "transaction-logger-"));

  try {
    const logger = new Logger({ directory, timezone: "UTC" });
    logger.info("logger.info.test", { event: "logger.info.test" });
    logger.warn("logger.warn.test");
    logger.error("logger.error.test", new Error("password=should-not-appear"));
    logger.debug("logger.debug.test");

    const files = await readdir(directory);
    assert.equal(files.length, 1);
    assert.match(files[0], /^\d{2}[A-Z][a-z]{2}\d{4}logfile\.txt$/);

    const logPath = path.join(directory, files[0]);
    const firstContent = await readFile(logPath, "utf8");
    assert.match(firstContent, /\[INFO\] logger\.info\.test/);
    assert.match(firstContent, /\[WARN\] logger\.warn\.test/);
    assert.match(firstContent, /\[ERROR\] logger\.error\.test/);
    assert.match(firstContent, /\[DEBUG\] logger\.debug\.test/);
    assert.doesNotMatch(firstContent, /password=should-not-appear/);

    logger.info("logger.append.test");
    const secondContent = await readFile(logPath, "utf8");
    assert.ok(secondContent.length > firstContent.length);
    assert.match(secondContent, /\[INFO\] logger\.append\.test/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
