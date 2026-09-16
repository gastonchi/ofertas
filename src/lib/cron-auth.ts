import type { NextRequest } from "next/server";

/** Vercel Cron envía Authorization: Bearer <CRON_SECRET> si la variable está definida. */
export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
