import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.newsPost.findUnique({ where: { slug } });
  if (!post || post.status !== "PUBLISHED") return notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <p className="font-mono text-xs text-zinc-400">
        {post.publishedAt?.toLocaleDateString("en-US")}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{post.title}</h1>
      <div className="prose prose-zinc dark:prose-invert mt-6 whitespace-pre-wrap">
        {post.bodyMd}
      </div>
    </article>
  );
}
