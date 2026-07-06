// First-run seed:
//   - Admin user (env-configured)
//   - Default Store + Warehouse locations
//   - Default Channels (Website, POS, Discogs, Tokopedia, Shopee)
//   - PPN 11% setting + Discogs marketplace currency = IDR
//   - Sample news post
//
// Idempotent: safe to run repeatedly.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  // ---- Admin ----
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@mediumformat.info";
  const name = process.env.SEED_ADMIN_NAME ?? "Medium Format Admin";
  let password = process.env.SEED_ADMIN_PASSWORD;
  let passwordWasGenerated = false;
  if (!password) {
    password = randomBytes(12).toString("base64url");
    passwordWasGenerated = true;
  }
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    // Only reset the password on re-seed when one was explicitly supplied,
    // so routine re-seeds don't silently rotate a working admin login.
    update: {
      role: "ADMIN",
      name,
      ...(process.env.SEED_ADMIN_PASSWORD ? { passwordHash } : {}),
    },
    create: { email, name, role: "ADMIN", passwordHash },
  });

  // ---- Locations ----
  const store = await prisma.location.upsert({
    where: { id: "loc-store-default" },
    update: {},
    create: {
      id: "loc-store-default",
      name: process.env.SEED_DEFAULT_LOCATION_NAME ?? "Toko Medium Format",
      type: "STORE",
      isDefault: true,
    },
  });
  await prisma.location.upsert({
    where: { id: "loc-warehouse-default" },
    update: {},
    create: { id: "loc-warehouse-default", name: "Warehouse", type: "WAREHOUSE" },
  });

  // ---- Channels ----
  const channelDefs = [
    { id: "ch-website", type: "WEBSITE" as const, name: "Website" },
    { id: "ch-pos", type: "POS" as const, name: "POS · Toko Medium Format" },
    { id: "ch-discogs", type: "DISCOGS" as const, name: "Discogs Marketplace" },
    { id: "ch-tokopedia", type: "TOKOPEDIA" as const, name: "Tokopedia", enabled: false },
    { id: "ch-shopee", type: "SHOPEE" as const, name: "Shopee", enabled: false },
  ];
  for (const def of channelDefs) {
    await prisma.channel.upsert({
      where: { id: def.id },
      update: {},
      create: {
        id: def.id,
        type: def.type,
        name: def.name,
        enabled: def.enabled ?? true,
      },
    });
  }

  // ---- Settings ----
  for (const [key, value] of Object.entries({
    "tax.ppn_rate": 0.11,
    "discogs.marketplace_currency": process.env.DISCOGS_MARKETPLACE_CURRENCY ?? "IDR",
    "store.name": "Medium Format",
    "store.address": "Jakarta, Indonesia",
    "store.currency": "IDR",
    "store.locale_default": "id-ID",
  })) {
    await prisma.setting.upsert({
      where: { key },
      update: { valueJson: value },
      create: { key, valueJson: value },
    });
  }

  // ---- Sample news post ----
  await prisma.newsPost.upsert({
    where: { slug: "hello-medium-format" },
    update: {},
    create: {
      slug: "hello-medium-format",
      title: "Hello, Medium Format",
      excerpt: "We're building a new home for our shop online. Come crate-dig with us.",
      bodyMd:
        "We're building a new home for our shop online — new arrivals, restocks, in-store playlists, and the occasional liner-note essay.\n\nDrop by the shop in Jakarta any day of the week.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      authorId: admin.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log("\n=== Medium Format seed complete ===");
  // eslint-disable-next-line no-console
  console.log(`Admin email:    ${email}`);
  if (passwordWasGenerated) {
    // eslint-disable-next-line no-console
    console.log(`Admin password: ${password}   (generated — save it now)`);
  } else {
    // eslint-disable-next-line no-console
    console.log("Admin password: (from SEED_ADMIN_PASSWORD env)");
  }
  // eslint-disable-next-line no-console
  console.log(`Default store:  ${store.name}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
