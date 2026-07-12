"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { commitOrderStock } from "@/lib/fulfillment";
import { POS_COOKIE, readPosLines, getPosView, type PosLine } from "@/lib/pos";

async function requireSell() {
  const session = await auth();
  if (!can(session?.user?.role, "pos.sell")) throw new Error("Forbidden");
  return session!.user;
}

async function writePos(lines: PosLine[]) {
  const store = await cookies();
  store.set(POS_COOKIE, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function addPosItem(formData: FormData) {
  await requireSell();
  const sku = String(formData.get("sku") ?? "").trim();
  if (!sku) return;
  const variant = await prisma.variant.findUnique({
    where: { sku },
    include: { product: true },
  });
  if (!variant || variant.product.status === "ARCHIVED") {
    redirect("/admin/pos?notfound=1");
  }
  const lines = await readPosLines();
  const existing = lines.find((l) => l.variantId === variant!.id);
  if (existing) existing.qty = Math.min(99, existing.qty + 1);
  else lines.push({ variantId: variant!.id, qty: 1 });
  await writePos(lines);
  revalidatePath("/admin/pos");
}

export async function setPosQty(formData: FormData) {
  await requireSell();
  const variantId = String(formData.get("variantId") ?? "");
  const delta = Number(formData.get("delta") ?? 0);
  const lines = await readPosLines();
  const line = lines.find((l) => l.variantId === variantId);
  if (line) {
    line.qty += delta;
    await writePos(line.qty < 1 ? lines.filter((l) => l.variantId !== variantId) : lines);
  }
  revalidatePath("/admin/pos");
}

export async function removePosItem(formData: FormData) {
  await requireSell();
  const variantId = String(formData.get("variantId") ?? "");
  const lines = await readPosLines();
  await writePos(lines.filter((l) => l.variantId !== variantId));
  revalidatePath("/admin/pos");
}

export async function clearPos() {
  await requireSell();
  await writePos([]);
  revalidatePath("/admin/pos");
}

export async function completeSale(formData: FormData) {
  const user = await requireSell();
  const pos = await getPosView();
  if (pos.items.length === 0) redirect("/admin/pos");

  let channel = await prisma.channel.findFirst({ where: { type: "POS" } });
  if (!channel) channel = await prisma.channel.create({ data: { type: "POS", name: "POS" } });

  const number = `POS-${Date.now().toString(36).toUpperCase()}`;
  const order = await prisma.order.create({
    data: {
      number,
      channelId: channel.id,
      status: "COMPLETED",
      currency: "IDR",
      subtotal: pos.subtotal,
      tax: pos.tax,
      total: pos.total,
      notes: "In-store POS sale",
      items: {
        create: pos.items.map((i) => ({
          variantId: i.variantId,
          qty: i.qty,
          unitPriceIdr: i.unitPrice,
          nameSnapshot: `${i.artist ? `${i.artist} — ` : ""}${i.title}`,
          conditionSnapshot: i.condition,
        })),
      },
      payments: {
        create: {
          gateway: "CASH",
          method: "CASH",
          status: "PAID",
          amount: pos.total,
          paidAt: new Date(),
        },
      },
    },
  });

  // Decrement stock for the sale.
  await commitOrderStock(order.id, user.id);

  await writePos([]);
  revalidatePath("/admin/pos");
  revalidatePath("/admin/inventory/movements");
  redirect(`/admin/orders/${order.id}`);
}
