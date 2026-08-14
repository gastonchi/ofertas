import { cookies } from "next/headers";
import { hasAuthConfig, isValidSessionToken, SESSION_COOKIE } from "./session";

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
