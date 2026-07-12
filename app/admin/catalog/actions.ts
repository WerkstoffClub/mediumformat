"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { MediaCondition, SleeveCondition, ProductStatus, Prisma } from "@prisma/client";

async function requireWriter() {
  const session = await auth();
  if (!can(session?.user?.role, "catalog.write")) throw new Error("Forbidden");
}

function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = str(v);
  if (!s) return null;
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function csv(v: FormDataEntryValue | null): string[] {
  return str(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "release";
  let slug = root;
  let i = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${root}-${i++}`;
  }
  return slug;
}

function releaseData(formData: FormData) {
  const artist = str(formData.get("artist"));
  const label = str(formData.get("label"));
  const catno = str(formData.get("catno"));
  const format = str(formData.get("format"));
  return {
    title: str(formData.get("title")),
    artistsJson: (artist ? [{ name: artist }] : []) as Prisma.InputJsonValue,
    labelsJson: (label ? [{ name: label, catno: catno || null }] : []) as Prisma.InputJsonValue,
    year: numOrNull(formData.get("year")),
    country: str(formData.get("country")) || null,
    genres: csv(formData.get("genres")),
    styles: csv(formData.get("styles")),
    formatsJson: (format ? [{ name: format, qty: "1" }] : []) as Prisma.InputJsonValue,
    catno: catno || null,
    extBarcode: str(formData.get("barcode")) || null,
    coverUrl: str(formData.get("coverUrl")) || null,
    discogsId: numOrNull(formData.get("discogsId")),
  };
}

export async function createProduct(formData: FormData) {
  await requireWriter();
  const rel = releaseData(formData);
  const artist = str(formData.get("artist"));
  if (!rel.title || !artist) redirect("/admin/catalog/new?error=1");

  const slug = await uniqueSlug(`${artist} ${rel.title}`);
  const status = (str(formData.get("status")) || "DRAFT") as ProductStatus;

  const product = await prisma.$transaction(async (tx) => {
    const release = await tx.release.create({ data: rel });
    const p = await tx.product.create({
      data: {
        type: "RELEASE",
        releaseId: release.id,
        title: rel.title,
        slug,
        descriptionMd: str(formData.get("description")) || null,
        heroImage: rel.coverUrl,
        status,
      },
    });
    const sku = str(formData.get("sku"));
    const price = numOrNull(formData.get("priceIdr"));
    if (sku && price) {
      await tx.variant.create({
        data: {
          productId: p.id,
          sku,
          conditionMedia: (str(formData.get("conditionMedia")) || null) as MediaCondition | null,
          conditionSleeve: (str(formData.get("conditionSleeve")) || null) as SleeveCondition | null,
          priceIdr: price,
        },
      });
    }
    return p;
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/shop");
  redirect(`/admin/catalog/${product.id}`);
}

export async function updateProduct(formData: FormData) {
  await requireWriter();
  const id = str(formData.get("id"));
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) redirect("/admin/catalog");

  const rel = releaseData(formData);
  const status = (str(formData.get("status")) || "DRAFT") as ProductStatus;
  const slugInput = str(formData.get("slug"));

  await prisma.$transaction(async (tx) => {
    if (product!.releaseId) {
      await tx.release.update({ where: { id: product!.releaseId }, data: rel });
    }
    await tx.product.update({
      where: { id },
      data: {
        title: rel.title || product!.title,
        slug: slugInput ? slugify(slugInput) : product!.slug,
        descriptionMd: str(formData.get("description")) || null,
        heroImage: rel.coverUrl,
        status,
      },
    });
  });

  revalidatePath("/admin/catalog");
  revalidatePath(`/admin/catalog/${id}`);
  revalidatePath("/shop");
  redirect(`/admin/catalog/${id}`);
}

// Upload a cover image file (stored under public/uploads) and set it as the
// product hero + release cover. Note: on the VPS, public/uploads should be a
// mounted volume so uploads persist across deploys.
export async function uploadProductImage(formData: FormData) {
  await requireWriter();
  const id = str(formData.get("productId"));
  if (!id) redirect("/admin/catalog");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(`/admin/catalog/${id}`);

  const maxMb = Number(process.env.MAX_UPLOAD_MB ?? 10);
  if ((file as File).size > maxMb * 1024 * 1024) redirect(`/admin/catalog/${id}?error=size`);

  const bytes = Buffer.from(await (file as File).arrayBuffer());
  const ext = ((file as File).name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  const url = `/uploads/${name}`;

  const product = await prisma.product.findUnique({ where: { id } });
  await prisma.product.update({ where: { id }, data: { heroImage: url } });
  if (product?.releaseId) {
    await prisma.release.update({ where: { id: product.releaseId }, data: { coverUrl: url } });
  }
  revalidatePath(`/admin/catalog/${id}`);
  revalidatePath("/shop");
  redirect(`/admin/catalog/${id}`);
}

export async function deleteProduct(formData: FormData) {
  await requireWriter();
  const id = str(formData.get("id"));
  if (id) {
    await prisma.product.delete({ where: { id } });
    revalidatePath("/admin/catalog");
    revalidatePath("/shop");
  }
  redirect("/admin/catalog");
}

export async function addVariant(formData: FormData) {
  await requireWriter();
  const productId = str(formData.get("productId"));
  const sku = str(formData.get("sku"));
  const price = numOrNull(formData.get("priceIdr"));
  const wholesale = numOrNull(formData.get("wholesalePriceIdr"));
  if (productId && sku && price) {
    await prisma.variant.create({
      data: {
        productId,
        sku,
        conditionMedia: (str(formData.get("conditionMedia")) || null) as MediaCondition | null,
        conditionSleeve: (str(formData.get("conditionSleeve")) || null) as SleeveCondition | null,
        priceIdr: price,
        wholesalePriceIdr: wholesale,
      },
    });
    revalidatePath(`/admin/catalog/${productId}`);
    revalidatePath("/shop");
  }
  redirect(`/admin/catalog/${productId}`);
}

export async function deleteVariant(formData: FormData) {
  await requireWriter();
  const id = str(formData.get("id"));
  const productId = str(formData.get("productId"));
  if (id) {
    await prisma.variant.delete({ where: { id } });
    revalidatePath(`/admin/catalog/${productId}`);
    revalidatePath("/shop");
  }
  redirect(`/admin/catalog/${productId}`);
}
