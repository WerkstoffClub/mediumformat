import { NextResponse } from "next/server";
import { verifyXenditCallback } from "@/lib/integrations/xendit/client";
import { logger } from "@/lib/logger";

const log = logger.child({ component: "xendit-webhook" });

export async function POST(req: Request) {
  const token = req.headers.get("x-callback-token");
  if (!verifyXenditCallback(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  log.info({ event: body?.event ?? body?.status }, "xendit callback");
  // TODO: enqueue order status update job, update Payment + Order.
  return NextResponse.json({ ok: true });
}
