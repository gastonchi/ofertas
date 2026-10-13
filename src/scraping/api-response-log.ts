import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { StoreId } from "../lib/types";
import { argentinaDay } from "./db";

let loggingActive = false;

/** Activa el log de respuestas (p. ej. al inicio de `runOfferCheck`). */
export function activateApiResponseLogging(): void {
  loggingActive = true;
}

export function shouldLogApiResponses(): boolean {
  if (process.env.API_RESPONSE_LOG === "false") return false;
  return loggingActive || process.env.API_RESPONSE_LOG === "true";
}

function logDirectory(): string {
  const base = process.env.API_RESPONSE_LOG_DIR?.trim() || "logs/api-responses";
  return join(process.cwd(), base, argentinaDay());
}

export type StoreApiLogEntry = {
  store: StoreId;
  ean: string;
  url: string;
  httpStatus?: number;
  /** Cuerpo parseado (JSON) o texto crudo si no es JSON válido. */
  body?: unknown;
  error?: string;
  durationMs?: number;
};

export function appendStoreApiLog(entry: StoreApiLogEntry): void {
  if (!shouldLogApiResponses()) return;

  const dir = logDirectory();
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${entry.store}.jsonl`);

  const line = JSON.stringify({
    at: new Date().toISOString(),
    store: entry.store,
    ean: entry.ean,
    url: entry.url,
    httpStatus: entry.httpStatus,
    durationMs: entry.durationMs,
    error: entry.error,
    body: entry.body,
  });

  appendFileSync(filePath, `${line}\n`, "utf8");
}
