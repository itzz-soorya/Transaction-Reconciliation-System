import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_API_LIMIT = 100;
const DEFAULT_UPLOAD_LIMIT = 10;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const apiRateLimitWindowMs = positiveInteger(
  process.env.RATE_LIMIT_WINDOW_MS,
  DEFAULT_WINDOW_MS,
);
export const apiRateLimitMax = positiveInteger(
  process.env.RATE_LIMIT_MAX,
  DEFAULT_API_LIMIT,
);
export const uploadRateLimitMax = positiveInteger(
  process.env.UPLOAD_RATE_LIMIT_MAX,
  DEFAULT_UPLOAD_LIMIT,
);

export function createRateLimiter(max: number): RequestHandler {
  return rateLimit({
    windowMs: apiRateLimitWindowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    },
  });
}

export const apiRateLimiter = createRateLimiter(apiRateLimitMax);
export const uploadRateLimiter = createRateLimiter(uploadRateLimitMax);
