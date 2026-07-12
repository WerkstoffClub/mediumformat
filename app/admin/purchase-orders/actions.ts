"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";

async function requireStock() {
  const session = await auth();
  if (!can(session?.user?.role, "inventory.adjust")) throw new Error("Forbidden");
  return session!.user;
}

type ParsedLine = { description: string; qty: number; unit: number };

// Parse pasted invoice text: "description, qty, unit price" per line
// (or "description, unit price" → qty 1). Header rows are skipped.
function parseInvoice(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const row = raw.trim();
    if (!row) continue;
    const cells = row.split(/[\t,;]/).map((c) => c.trim());
    if (cells.length < 2) continue;
    const num = (s: string) => Number((s ?? "").replace(/[^0-9.]/g, ""));
    let description: string;
    let qty: number;
    let unit: number;
    if (cells.length >= 3) {
      description = cells[0];
      qty = Math.round(num(cells[1])) || 0;
      unit = num(cells[cells.length - 1]);
    } else {
      description = cells[0];
      qty = 1;
      unit = num(cells[1]);
    }
    if (!description || (!qty && !unit)) continue;
    out.push({ description, qty: qty || 1, unit: Number.isFinite(unit) ? unit : 0 });
  }
  return out;
}

export async function createPurchaseOrder(formData: FormData) {
  const user = await requireStock();
  const invoice = String(formData.get("invoice") ?? "");
  const supplierName = String(formData.get("supplierName") ?? "").trim();
  let locationId = String(formData.get("locationId") ?? "").trim();

  const lines = parseInvoice(invoice);
  if (lines.length === 0) redirect("/admin/purchase-orders?error=empty");

  if (!locationId) {
    const loc =
      (await prisma.location.findFirst({ where: { isDefault: true } })) ??
      (await prisma.location.findFirst());
    if (!loc) redirect("/admin/purchase-orders?error=nolocation");
    locationId = loc!.id;
  }

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unit, 0);
  const number = `PO-${Date.now().toString(36).toUpperCase()}`;

  const po = await prisma.purchaseOrder.create({
    data: {
      number,
      supplierName: supplierName || null,
      status: "DRAFT",
      locationId,
      subtotalIdr: subtotal,
      createdById: user.id,
      lines: {
        create: lines.map((l) => ({
          description: l.description,
          qty: l.qty,
          unitCostIdr: l.unit,
        })),
      },
    },
  });

  revalidatePath("/admin/purchase-orders");
  redirect(`/admin/purchase-orders/${po.id}`);
}

export async function assignLineVariant(formData: FormData) {
  await requireStock();
  const lineId = String(formData.get("lineId") ?? "");
  const poId = String(formData.get("poId") ?? "");
  const sku = String(formData.get("sku") ?? "").trim();
  if (!lineId) return;

  let variantId: string | null = null;
  if (sku) {
    const variant = await prisma.variant.findUnique({ where: { sku } });
    variantId = variant?.id ?? null;
  }
  await prisma.purchaseOrderLine.update({ where: { id: lineId }, data: { variantId } });
  revalidatePath(`/admin/purchase-orders/${poId}`);
}

// Receive a PO: for every line linked to a variant, book the outstanding
// quantity as a RECEIVING StockMovement and bump on-hand Stock at the PO's
// location. Idempotent per line via qtyReceived.
export async function receivePurchaseOrder(formData: FormData) {
  const user = await requireStock();
  const poId = String(formData.get("poId") ?? "");
  if (!poId) return;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { lines: true },
  });
  if (!po) redirect("/admin/purchase-orders");

  await prisma.$transaction(async (tx) => {
    for (const line of po!.lines) {
      const outstanding = line.qty - line.qtyReceived;
      if (!line.variantId || outstanding <= 0) continue;

      await tx.stockMovement.create({
        data: {
          variantId: line.variantId,
          locationId: po!.locationId,
          delta: outstanding,
          reason: "RECEIVING",
          refType: "PURCHASE_ORDER",
          refId: po!.id,
          userId: user.id,
          note: `PO ${po!.number}`,
        },
      });
      await tx.stock.upsert({
        where: { variantId_locationId: { variantId: line.variantId, locationId: po!.locationId } },
        create: { variantId: line.variantId, locationId: po!.locationId, onHand: outstanding },
        update: { onHand: { increment: outstanding } },
      });
      await tx.purchaseOrderLine.update({
        where: { id: line.id },
        data: { qtyReceived: line.qty },
      });
    }

    const refreshed = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: po!.id } });
    const anyReceived = refreshed.some((l) => l.qtyReceived > 0);
    const allReceived = refreshed.every((l) => !l.variantId || l.qtyReceived >= l.qty);
    await tx.purchaseOrder.update({
      where: { id: po!.id },
      data: {
        status: allReceived && anyReceived ? "RECEIVED" : anyReceived ? "PARTIAL" : po!.status,
        receivedAt: anyReceived ? new Date() : po!.receivedAt,
      },
    });
  });

  revalidatePath(`/admin/purchase-orders/${poId}`);
  revalidatePath("/admin/inventory");
  redirect(`/admin/purchase-orders/${poId}`);
}

export async function deletePurchaseOrder(formData: FormData) {
  await requireStock();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.purchaseOrder.delete({ where: { id } });
    revalidatePath("/admin/purchase-orders");
  }
  redirect("/admin/purchase-orders");
}
