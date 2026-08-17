import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TrackedProduct } from "../lib/types";

function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export function loadProductsFile(path = "products.json"): TrackedProduct[] {
  const fullPath = resolve(process.cwd(), path);
  const raw = JSON.parse(readFileSync(fullPath, "utf8")) as TrackedProduct[];
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("products.json debe ser un array con al menos un producto");
  }
  for (const p of raw) {
    if (!p.name || !p.ean || typeof p.target_price !== "number") {
      throw new Error(`Producto inválido en products.json: ${JSON.stringify(p)}`);
    }
  }
  return raw;
}

export function isDryRun(argv = process.argv): boolean {
  return argv.includes("--dry-run") || process.env.DRY_RUN === "true";
}

export function isForceAlert(argv = process.argv): boolean {
  return argv.includes("--force") || process.env.FORCE_ALERT === "true";
}

export function isIgnoreSchedule(argv = process.argv): boolean {
  return argv.includes("--ignore-schedule") || process.env.IGNORE_SCHEDULE === "true";
}

export function getCheckConfig(dryRun: boolean) {
  if (dryRun) {
    return {
      dryRun: true as const,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      gmailUser: process.env.GMAIL_USER,
      gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
      alertTo: process.env.ALERT_TO_EMAIL ?? process.env.GMAIL_USER,
    };
  }

  return {
    dryRun: false as const,
    supabaseUrl: env("SUPABASE_URL"),
    supabaseKey: env("SUPABASE_SERVICE_ROLE_KEY"),
    gmailUser: env("GMAIL_USER"),
    gmailAppPassword: env("GMAIL_APP_PASSWORD"),
    alertTo: env("ALERT_TO_EMAIL", process.env.GMAIL_USER),
  };
}

export type CheckConfig = ReturnType<typeof getCheckConfig>;
