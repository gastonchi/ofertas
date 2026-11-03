import { createHmac, timingSafeEqual } from "node:crypto";
import { hasAuthConfig } from "@/lib/env";
import {
  type AppUser,
  isAppUser,
  requirePasswordForUser,
} from "@/lib/auth/users";

export const SESSION_COOKIE = "ofertas_session";

export { hasAuthConfig };

function sign(user: AppUser, issuedAt: string): string {
  const secret = requirePasswordForUser(user);
  return createHmac("sha256", secret)
    .update(`${user}.${issuedAt}`)
    .digest("hex");
}

export function createSessionToken(user: AppUser): string {
  const issuedAt = Date.now().toString();
  return `${user}.${issuedAt}.${sign(user, issuedAt)}`;
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const [userRaw, issuedAt, signature] = parts;
    if (!userRaw || !issuedAt || !signature || !isAppUser(userRaw)) {
      return false;
    }

    const expected = sign(userRaw, issuedAt);
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

export function sessionUserFromToken(
  token: string | undefined | null,
): AppUser | null {
  if (!isValidSessionToken(token)) return null;
  const userRaw = token!.split(".")[0]!;
  return isAppUser(userRaw) ? userRaw : null;
}

export function verifyPassword(user: AppUser, password: string): boolean {
  const expected = requirePasswordForUser(user);
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
