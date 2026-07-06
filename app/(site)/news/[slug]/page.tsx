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
    <article className="article">
      <p className="article-date">
        {post.publishedAt?.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
      <h1>{post.title}</h1>
      <div className="article-body">{post.bodyMd}</div>
    </article>
  );
}
