import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { createRateLimiter } from "../src/middleware/rate-limiter.js";

test("general rate limiter allows requests within the limit and returns 429 after it", async () => {
  const app = express();
  app.use(createRateLimiter(2));
  app.get("/api/test", (_req, res) => {
    res.json({ success: true });
  });

  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${port}/api/test`;

    const first = await fetch(url);
    const second = await fetch(url);
    const third = await fetch(url);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 429);
    assert.equal((await third.json()).success, false);
    assert.ok(
      third.headers.get("ratelimit") ??
        third.headers.get("ratelimit-policy") ??
        third.headers.get("retry-after"),
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
