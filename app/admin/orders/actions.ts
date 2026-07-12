"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { commitOrderStock } from "@/lib/fulfillment";
import type { OrderStatus } from "@prisma/client";

// Statuses at which stock is considered sold and should be decremented.
const COMMITTED: OrderStatus[] = ["PAID", "PACKED", "SHIPPED", "COMPLETED"];

const VALID: OrderStatus[] = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAID",
  "PACKED",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

export async function updateOrderStatus(formData: FormData) {
  const session = await auth();
  if (!can(session?.user?.role, "orders.manage")) throw new Error("Forbidden");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!id || !VALID.includes(status)) return;

  await prisma.order.update({ where: { id }, data: { status } });

  // Decrement stock the first time an order reaches a committed state.
  if (COMMITTED.includes(status)) {
    await commitOrderStock(id, session!.user.id);
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory/movements");
}
