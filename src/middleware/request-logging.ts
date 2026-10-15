import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import logger from "../utils/logger.js";

const requestLogging: RequestHandler = (req, res, next) => {
  const startedAt = performance.now();
  const requestId = req.header("x-request-id") ?? randomUUID();
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    logger.info("http.request.completed", {
      event: "http.request.completed",
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    });
  });

  next();
};

export default requestLogging;
