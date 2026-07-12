"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";

async function requireCustomers() {
  const session = await auth();
  if (!can(session?.user?.role, "customers.manage")) throw new Error("Forbidden");
}

export async function approveWholesale(formData: FormData) {
  await requireCustomers();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  await prisma.user.update({ where: { id: userId }, data: { role: "WHOLESALER" } });
  await prisma.customerProfile.upsert({
    where: { userId },
    create: { userId, wholesaleApproved: true },
    update: { wholesaleApproved: true },
  });
  revalidatePath("/admin/customers");
}

export async function revokeWholesale(formData: FormData) {
  await requireCustomers();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  await prisma.user.update({ where: { id: userId }, data: { role: "CUSTOMER" } });
  await prisma.customerProfile.upsert({
    where: { userId },
    create: { userId, wholesaleApproved: false },
    update: { wholesaleApproved: false },
  });
  revalidatePath("/admin/customers");
}
