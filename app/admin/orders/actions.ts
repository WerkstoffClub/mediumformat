"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import type { OrderStatus } from "@prisma/client";

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
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}
