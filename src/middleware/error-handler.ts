import type { ErrorRequestHandler } from "express";
import logger from "../utils/logger.js";

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  logger.error("http.request.failed", error, {
    event: "http.request.failed",
    method: req.method,
    path: req.path,
    requestId: res.getHeader("x-request-id"),
  });

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    success: false,
    message: error instanceof Error ? error.message : "Internal server error.",
  });
};

export default errorHandler;
