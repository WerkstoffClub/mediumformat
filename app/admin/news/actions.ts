"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import type { NewsStatus } from "@prisma/client";

async function requireEditor() {
  const session = await auth();
  if (!can(session?.user?.role, "news.manage")) throw new Error("Forbidden");
  return session!.user;
}

function readForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const bodyMd = String(formData.get("bodyMd") ?? "").trim();
  const heroImage = String(formData.get("heroImage") ?? "").trim();
  const status = (String(formData.get("status") ?? "DRAFT") as NewsStatus);
  return {
    title,
    slug: slugify(slugRaw || title),
    excerpt: excerpt || null,
    bodyMd,
    heroImage: heroImage || null,
    status,
  };
}

export async function createNews(formData: FormData) {
  const user = await requireEditor();
  const data = readForm(formData);
  if (!data.title || !data.bodyMd) redirect("/admin/news/new?error=1");

  await prisma.newsPost.create({
    data: {
      ...data,
      authorId: user.id,
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
    },
  });
  revalidatePath("/admin/news");
  revalidatePath("/news");
  redirect("/admin/news");
}

export async function updateNews(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/news");
  const data = readForm(formData);

  const existing = await prisma.newsPost.findUnique({ where: { id } });
  if (!existing) redirect("/admin/news");

  await prisma.newsPost.update({
    where: { id },
    data: {
      ...data,
      // Stamp publishedAt the first time it goes live.
      publishedAt:
        data.status === "PUBLISHED"
          ? existing.publishedAt ?? new Date()
          : existing.publishedAt,
    },
  });
  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath(`/news/${data.slug}`);
  redirect("/admin/news");
}

export async function deleteNews(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.newsPost.delete({ where: { id } });
    revalidatePath("/admin/news");
    revalidatePath("/news");
  }
  redirect("/admin/news");
}
