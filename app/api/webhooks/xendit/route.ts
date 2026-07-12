import { NextResponse } from "next/server";
import { verifyXenditCallback } from "@/lib/integrations/xendit/client";
import { prisma } from "@/lib/db";
import { markOrderPaid } from "@/lib/fulfillment";
import { logger } from "@/lib/logger";

const log = logger.child({ component: "xendit-webhook" });

export async function POST(req: Request) {
  const token = req.headers.get("x-callback-token");
  if (!verifyXenditCallback(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    external_id?: string;
    status?: string;
    payment_method?: string;
  };
  const externalId = body.external_id;
  const status = (body.status ?? "").toUpperCase();
  log.info({ externalId, status }, "xendit callback");

  if (externalId) {
    const order = await prisma.order.findUnique({ where: { number: externalId } });
    if (order) {
      if (status === "PAID" || status === "SETTLED") {
        await markOrderPaid(order.id, body.payment_method ?? "XENDIT");
      } else if (status === "EXPIRED") {
        await prisma.payment.updateMany({
          where: { orderId: order.id, gateway: "XENDIT" },
          data: { status: "EXPIRED" },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
