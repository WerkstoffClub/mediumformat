"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { CART_COOKIE, readCartLines, getCartView, type CartLine } from "@/lib/cart";

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

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();

  // Website channel (seeded as ch-website; create defensively if missing).
  let channel = await prisma.channel.findFirst({ where: { type: "WEBSITE" } });
  if (!channel) {
    channel = await prisma.channel.create({
      data: { type: "WEBSITE", name: "Website" },
    });
  }

  const number = `WEB-${Date.now().toString(36).toUpperCase()}`;
  const order = await prisma.order.create({
    data: {
      number,
      channelId: channel.id,
      status: "PENDING_PAYMENT",
      currency: "IDR",
      subtotal: cart.subtotal,
      tax: cart.tax,
      total: cart.total,
      notes: [
        `Guest checkout`,
        name && `Name: ${name}`,
        email && `Email: ${email}`,
        phone && `Phone: ${phone}`,
        address && `Address: ${address}${city ? `, ${city}` : ""}`,
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

  await writeCart([]);
  redirect(`/checkout/success?order=${order.number}`);
}
