import fs from "node:fs";
import path from "node:path";

export type LogMetadata = Record<string, unknown>;

interface LoggerOptions {
  directory?: string;
  timezone?: string;
}

const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|authorization|cookie|credential|csv|body/i;

function redactText(value: string): string {
  return value
    .replace(
      /\b(password|passwd|secret|token|authorization|cookie|credential)\s*[=:]\s*\S+/gi,
      "$1=[REDACTED]",
    )
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

function sanitizeValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactText(value.message),
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).slice(0, 50).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeValue(entryValue, entryKey),
      ]),
    );
  }

  if (typeof value === "string") {
    return redactText(value);
  }

  return value;
}

function formatDatePart(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.day}${values.month}${values.year}logfile.txt`;
}

function formatTimestamp(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    dateStyle: "short",
    timeStyle: "medium",
    hour12: false,
  }).format(date);
}

export class Logger {
  private readonly directory: string;
  private readonly timezone: string;

  constructor(options: LoggerOptions = {}) {
    this.directory =
      options.directory ??
      process.env.LOG_DIR ??
      path.resolve(process.cwd(), "logs");
    this.timezone =
      options.timezone ?? process.env.LOG_TIMEZONE ?? "UTC";
  }

  info(message: string, metadata?: LogMetadata): void {
    this.write("INFO", message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.write("WARN", message, metadata);
  }

  error(message: string, error?: unknown, metadata?: LogMetadata): void {
    const errorMetadata =
      error === undefined
        ? metadata
        : { ...metadata, error: sanitizeValue(error) };
    this.write("ERROR", message, errorMetadata);
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.write("DEBUG", message, metadata);
  }

  private write(
    severity: "INFO" | "WARN" | "ERROR" | "DEBUG",
    message: string,
    metadata?: LogMetadata,
  ): void {
    try {
      fs.mkdirSync(this.directory, { recursive: true });
      const filePath = path.join(
        this.directory,
        formatDatePart(new Date(), this.timezone),
      );
      const safeMetadata = metadata
        ? ` ${JSON.stringify(sanitizeValue(metadata))}`
        : "";
      const line =
        `${formatTimestamp(new Date(), this.timezone)} ` +
        `[${severity}] ${redactText(message)}${safeMetadata}\n`;

      fs.appendFileSync(filePath, line, "utf8");
    } catch {
      // Logging must never interrupt request processing or call itself recursively.
    }
  }
}

const logger = new Logger();

export default logger;
