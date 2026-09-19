import type { NextRequest } from "next/server";

/** Solo quien conozca CRON_SECRET puede disparar los endpoints de cron. */
export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
