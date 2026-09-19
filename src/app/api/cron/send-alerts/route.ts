import { NextRequest } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { runSendAlerts } from "@/scraping/run-send-alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await runSendAlerts();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("cron/send-alerts:", error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
