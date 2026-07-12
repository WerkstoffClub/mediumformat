import { prisma } from "@/lib/db";

// Mark an order's payment(s) PAID, advance the order to PAID (only from an
// unpaid state), and decrement stock. Idempotent — safe to call repeatedly
// from the webhook and the success page.
export async function markOrderPaid(orderId: string, method?: string | null) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  await prisma.payment.updateMany({
    where: { orderId, status: { not: "PAID" } },
    data: { status: "PAID", paidAt: new Date(), ...(method ? { method } : {}) },
  });
  if (order.status === "DRAFT" || order.status === "PENDING_PAYMENT") {
    await prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } });
  }
  await commitOrderStock(orderId);
}

// Book a SALE stock movement for every line of an order and decrement on-hand
// stock at the default location. Idempotent: if any ORDER movement already
// exists for this order, it's a no-op (so re-marking PAID won't double-count).
export async function commitOrderStock(orderId: string, userId?: string) {
  const already = await prisma.stockMovement.findFirst({
    where: { refType: "ORDER", refId: orderId },
    select: { id: true },
  });
  if (already) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.items.length === 0) return;

  const location =
    (await prisma.location.findFirst({ where: { isDefault: true } })) ??
    (await prisma.location.findFirst());
  if (!location) return;

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          locationId: location.id,
          delta: -item.qty,
          reason: "SALE",
          refType: "ORDER",
          refId: order.id,
          userId: userId ?? null,
          note: `Order ${order.number}`,
        },
      });
      await tx.stock.upsert({
        where: { variantId_locationId: { variantId: item.variantId, locationId: location.id } },
        create: { variantId: item.variantId, locationId: location.id, onHand: -item.qty },
        update: { onHand: { decrement: item.qty } },
      });
    }
  });
}
