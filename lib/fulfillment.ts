import { prisma } from "@/lib/db";

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
