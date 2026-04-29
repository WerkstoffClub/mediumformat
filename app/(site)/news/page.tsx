import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewsListPage() {
  const posts = await prisma.newsPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">News</h1>
      <ul className="mt-8 divide-y divide-zinc-200 dark:divide-zinc-800">
        {posts.length === 0 && (
          <li className="py-8 text-zinc-500">No posts yet.</li>
        )}
        {posts.map((p) => (
          <li key={p.id} className="py-6">
            <Link href={`/news/${p.slug}`} className="block">
              <h2 className="text-xl font-medium">{p.title}</h2>
              {p.excerpt && (
                <p className="mt-1 text-sm text-zinc-500">{p.excerpt}</p>
              )}
              <p className="mt-2 font-mono text-xs text-zinc-400">
                {p.publishedAt?.toLocaleDateString("en-US")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
