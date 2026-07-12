"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";

async function requireStock() {
  const session = await auth();
  if (!can(session?.user?.role, "inventory.adjust")) throw new Error("Forbidden");
}

function read(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createSupplier(formData: FormData) {
  await requireStock();
  const data = read(formData);
  if (!data.name) redirect("/admin/suppliers?error=name");
  await prisma.supplier.create({ data });
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/purchase-orders");
  redirect("/admin/suppliers");
}

export async function updateSupplier(formData: FormData) {
  await requireStock();
  const id = String(formData.get("id") ?? "");
  const data = read(formData);
  if (!id || !data.name) redirect("/admin/suppliers");
  await prisma.supplier.update({ where: { id }, data });
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/purchase-orders");
  redirect("/admin/suppliers");
}

export async function deleteSupplier(formData: FormData) {
  await requireStock();
  const id = String(formData.get("id") ?? "");
  if (id) {
    // PO.supplierId is ON DELETE SET NULL, so existing POs keep their name snapshot.
    await prisma.supplier.delete({ where: { id } });
    revalidatePath("/admin/suppliers");
  }
  redirect("/admin/suppliers");
}
