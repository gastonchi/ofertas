import { cookies } from "next/headers";
import {
  hasAuthConfig,
  isValidSessionToken,
  SESSION_COOKIE,
  sessionUserFromToken,
} from "./session";
import type { AppUser } from "./users";

export {
  createSessionToken,
  hasAuthConfig,
  isValidSessionToken,
  SESSION_COOKIE,
  verifyPassword,
} from "./session";

export async function isAuthenticated(): Promise<boolean> {
  if (!hasAuthConfig()) return false;
  const jar = await cookies();
  return isValidSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    throw new Error("No autorizado");
  }
}

export async function requireSessionUser(): Promise<AppUser> {
  if (!hasAuthConfig()) throw new Error("No autorizado");
  const jar = await cookies();
  const user = sessionUserFromToken(jar.get(SESSION_COOKIE)?.value);
  if (!user) throw new Error("No autorizado");
  return user;
}
