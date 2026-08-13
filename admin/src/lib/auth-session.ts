import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ofertas_admin_session";

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("Falta ADMIN_PASSWORD en el entorno del admin");
  }
  return password;
}

export function hasAuthConfig(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sign(value: string): string {
  return createHmac("sha256", getAdminPassword()).update(value).digest("hex");
}

export function createSessionToken(): string {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token || !token.includes(".")) return false;
  try {
    const [issuedAt, signature] = token.split(".");
    if (!issuedAt || !signature) return false;
    const expected = sign(issuedAt);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;

    const ageMs = Date.now() - Number(issuedAt);
    const maxAgeMs = 1000 * 60 * 60 * 24 * 14;
    return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < maxAgeMs;
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  const expected = getAdminPassword();
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
