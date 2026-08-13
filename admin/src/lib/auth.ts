import { cookies } from "next/headers";
import {
  hasAuthConfig,
  isValidSessionToken,
  SESSION_COOKIE,
} from "@/lib/auth-session";

export {
  createSessionToken,
  hasAuthConfig,
  isValidSessionToken,
  SESSION_COOKIE,
  verifyPassword,
} from "@/lib/auth-session";

export async function isAuthenticated(): Promise<boolean> {
  if (!hasAuthConfig()) return false;
  const jar = await cookies();
  return isValidSessionToken(jar.get(SESSION_COOKIE)?.value);
}
