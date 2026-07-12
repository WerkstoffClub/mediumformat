"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CART_COOKIE, readCartLines, getCartView, type CartLine } from "@/lib/cart";
import { xendit } from "@/lib/integrations/xendit/client";
import { sendOrderConfirmationEmail } from "@/lib/email";
import type { Prisma } from "@prisma/client";

async function writeCart(lines: CartLine[]) {
  const store = await cookies();
  store.set(CART_COOKIE, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function addToCart(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  if (!variantId) return;

  const variant = await prisma.variant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant || variant.product.status !== "ACTIVE") return;

  const lines = await readCartLines();
  const existing = lines.find((l) => l.variantId === variantId);
  if (existing) existing.qty = Math.min(99, existing.qty + 1);
  else lines.push({ variantId, qty: 1 });

  await writeCart(lines);
  redirect("/cart");
}

export async function setQty(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  const delta = Number(formData.get("delta") ?? 0);
  const lines = await readCartLines();
  const line = lines.find((l) => l.variantId === variantId);
  if (line) {
    line.qty += delta;
    if (line.qty < 1) {
      await writeCart(lines.filter((l) => l.variantId !== variantId));
    } else {
      line.qty = Math.min(99, line.qty);
      await writeCart(lines);
    }
  }
  revalidatePath("/cart");
}

export async function removeFromCart(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  const lines = await readCartLines();
  await writeCart(lines.filter((l) => l.variantId !== variantId));
  revalidatePath("/cart");
}

export async function placeOrder(formData: FormData) {
  const cart = await getCartView();
  if (cart.items.length === 0) redirect("/cart");

  let name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  let phone = String(formData.get("phone") ?? "").trim();
  let address = String(formData.get("address") ?? "").trim();
  let city = String(formData.get("city") ?? "").trim();
  const addressId = String(formData.get("addressId") ?? "").trim();
  const saveAddress = formData.get("saveAddress") === "on";

  // Website channel (seeded as ch-website; create defensively if missing).
  let channel = await prisma.channel.findFirst({ where: { type: "WEBSITE" } });
  if (!channel) {
    channel = await prisma.channel.create({
      data: { type: "WEBSITE", name: "Website" },
    });
  }

  // Link the order to a logged-in customer's account, if any.
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Resolve the shipping address: a chosen saved address, else the typed one
  // (optionally saved to the account).
  let shippingAddressId: string | null = null;
  if (userId && addressId) {
    const saved = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (saved) {
      shippingAddressId = saved.id;
      name = saved.name;
      phone = saved.phone;
      address = `${saved.line1}${saved.line2 ? `, ${saved.line2}` : ""}`;
      city = [saved.city, saved.province].filter(Boolean).join(", ");
    }
  } else if (userId && saveAddress && address) {
    const count = await prisma.address.count({ where: { userId } });
    const created = await prisma.address.create({
      data: {
        userId,
        name: name || email,
        phone,
        line1: address,
        city: String(formData.get("city") ?? "").trim(),
        province: String(formData.get("province") ?? "").trim(),
        postal: String(formData.get("postal") ?? "").trim(),
        country: "ID",
        isDefault: count === 0,
      },
    });
    shippingAddressId = created.id;
  }

  const shippingFee = Math.max(0, Number(formData.get("shippingFee") ?? 0) || 0);
  const shippingLabel = String(formData.get("shippingLabel") ?? "").trim();
  const grandTotal = cart.total + shippingFee;

  const number = `WEB-${Date.now().toString(36).toUpperCase()}`;
  const order = await prisma.order.create({
    data: {
      number,
      channelId: channel.id,
      customerId: userId,
      shippingAddressId,
      status: "PENDING_PAYMENT",
      currency: "IDR",
      subtotal: cart.subtotal,
      tax: cart.tax,
      shippingFee,
      total: grandTotal,
      notes: [
        `Web checkout`,
        cart.wholesale && `Wholesale pricing`,
        name && `Name: ${name}`,
        email && `Email: ${email}`,
        phone && `Phone: ${phone}`,
        address && `Address: ${address}${city ? `, ${city}` : ""}`,
        shippingLabel && `Courier: ${shippingLabel}`,
      ]
        .filter(Boolean)
        .join("\n"),
      items: {
        create: cart.items.map((i) => ({
          variantId: i.variantId,
          qty: i.qty,
          unitPriceIdr: i.unitPrice,
          nameSnapshot: `${i.artist ? `${i.artist} — ` : ""}${i.title}`,
          conditionSnapshot: i.condition,
        })),
      },
    },
  });

  // Order-confirmation email (best-effort).
  const recipient = email || session?.user?.email || "";
  if (recipient) {
    try {
      await sendOrderConfirmationEmail(recipient, {
        number: order.number,
        items: cart.items.map((i) => ({
          qty: i.qty,
          name: `${i.artist ? `${i.artist} — ` : ""}${i.title}`,
          lineTotal: i.lineTotal,
        })),
        shippingFee,
        total: grandTotal,
      });
    } catch {
      // best-effort — don't block checkout on email failures
    }
  }

  // Try Xendit unified checkout; fall back to a pending order if unconfigured.
  let redirectTo = `/checkout/success?order=${order.number}`;
  if (process.env.XENDIT_SECRET_KEY) {
    const appUrl = process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
    try {
      const invoice = (await xendit.createInvoice({
        externalId: order.number,
        amountIdr: Math.round(grandTotal),
        description: `Medium Format order ${order.number}`,
        customer: {
          email: email || undefined,
          givenNames: name || undefined,
          mobileNumber: phone || undefined,
        },
        successRedirectUrl: `${appUrl}/checkout/success?order=${order.number}`,
        failureRedirectUrl: `${appUrl}/checkout?failed=1`,
      })) as { id?: string; invoice_url?: string };

      await prisma.payment.create({
        data: {
          orderId: order.id,
          gateway: "XENDIT",
          gatewayRef: invoice.id ?? null,
          status: "PENDING",
          amount: grandTotal,
          rawJson: invoice as unknown as Prisma.InputJsonValue,
        },
      });
      if (invoice.invoice_url) redirectTo = invoice.invoice_url;
    } catch {
      // Xendit failed — leave the order pending and show the confirmation page.
    }
  }

  await writeCart([]);
  redirect(redirectTo);
}
