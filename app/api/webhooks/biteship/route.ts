import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger.child({ component: "biteship-webhook" });

export async function POST(req: Request) {
  const expected = process.env.BITESHIP_WEBHOOK_TOKEN;
  if (!expected || req.headers.get("x-biteship-signature") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  log.info({ status: body?.status }, "biteship callback");
  return NextResponse.json({ ok: true });
}
