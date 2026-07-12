"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { commitOrderStock } from "@/lib/fulfillment";
import { sendOrderStatusEmail } from "@/lib/email";
import { biteship } from "@/lib/integrations/biteship/client";
import type { OrderStatus, Prisma } from "@prisma/client";

const COMMITTED: OrderStatus[] = ["PAID", "PACKED", "SHIPPED", "COMPLETED"];
const NOTIFY: OrderStatus[] = ["SHIPPED", "COMPLETED"];
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

async function requireOrders() {
  const session = await auth();
  if (!can(session?.user?.role, "orders.manage")) throw new Error("Forbidden");
  return session!.user;
}

// Guest orders keep the email in notes ("Email: x@y.z").
function extractEmail(notes: string | null): string | null {
  const m = (notes ?? "").match(/Email:\s*(\S+@\S+)/i);
  return m ? m[1] : null;
}

export async function updateOrderStatus(formData: FormData) {
  const user = await requireOrders();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!id || !VALID.includes(status)) return;

  await prisma.order.update({ where: { id }, data: { status } });
  if (COMMITTED.includes(status)) await commitOrderStock(id, user.id);

  if (NOTIFY.includes(status)) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { customer: true, shipments: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const to = order?.customer?.email ?? extractEmail(order?.notes ?? null);
    if (order && to) {
      const shp = order.shipments[0];
      try {
        await sendOrderStatusEmail(to, {
          number: order.number,
          status,
          courier: shp?.courier,
          awb: shp?.awb,
        });
      } catch {
        /* best-effort */
      }
    }
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory/movements");
}

// Create a shipment: manual AWB, or a live Biteship booking when configured and
// the order has a structured shipping address. Advances the order to SHIPPED
// and emails the customer.
export async function createShipment(formData: FormData) {
  const user = await requireOrders();
  const orderId = String(formData.get("orderId") ?? "");
  const manualAwb = String(formData.get("awb") ?? "").trim();
  const rateId = String(formData.get("rateId") ?? "").trim(); // "jne:reg"

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shippingAddress: true,
      customer: true,
      items: { include: { variant: true } },
    },
  });
  if (!order) redirect("/admin/orders");

  let awb: string | null = manualAwb || null;
  let labelUrl: string | null = null;
  let courier = rateId.includes(":") ? rateId.split(":")[0] : "manual";
  const service = rateId.includes(":") ? rateId.split(":")[1] : null;
  let rawJson: Prisma.InputJsonValue | undefined;

  if (!awb && process.env.BITESHIP_API_KEY && order!.shippingAddress && rateId.includes(":")) {
    const [company, type] = rateId.split(":");
    const a = order!.shippingAddress;
    try {
      const res = (await biteship.createOrder({
        origin_contact_name: process.env.BITESHIP_ORIGIN_NAME ?? "Medium Format",
        origin_contact_phone: process.env.BITESHIP_ORIGIN_PHONE ?? "0",
        origin_address: process.env.BITESHIP_ORIGIN_ADDRESS ?? "",
        origin_postal_code: Number(process.env.BITESHIP_ORIGIN_POSTAL ?? 0),
        destination_contact_name: a.name,
        destination_contact_phone: a.phone,
        destination_address: `${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.city}, ${a.province}`,
        destination_postal_code: Number(a.postal || 0),
        courier_company: company,
        courier_type: type,
        delivery_type: "now",
        items: order!.items.map((it) => ({
          name: it.nameSnapshot.slice(0, 50),
          value: Number(it.unitPriceIdr.toString()),
          quantity: it.qty,
          weight: it.variant.weightG,
        })),
      })) as {
        id?: string;
        label?: string;
        courier?: { waybill_id?: string; tracking_id?: string; company?: string };
      };
      awb = res.courier?.waybill_id ?? res.courier?.tracking_id ?? null;
      labelUrl = res.label ?? null;
      courier = res.courier?.company ?? company;
      rawJson = res as unknown as Prisma.InputJsonValue;
    } catch {
      // Fall through: record a pending shipment for manual handling.
    }
  }

  await prisma.shipment.create({
    data: {
      orderId: order!.id,
      courier,
      service,
      awb,
      labelUrl,
      status: awb ? "LABEL_CREATED" : "PENDING",
      shippedAt: awb ? new Date() : null,
      rawJson,
    },
  });

  if (order!.status !== "SHIPPED" && order!.status !== "COMPLETED") {
    await prisma.order.update({ where: { id: order!.id }, data: { status: "SHIPPED" } });
    await commitOrderStock(order!.id, user.id);
    const to = order!.customer?.email ?? extractEmail(order!.notes);
    if (to) {
      try {
        await sendOrderStatusEmail(to, {
          number: order!.number,
          status: "SHIPPED",
          courier,
          awb,
        });
      } catch {
        /* best-effort */
      }
    }
  }

  revalidatePath(`/admin/orders/${order!.id}`);
  redirect(`/admin/orders/${order!.id}`);
}
