import Link from "next/link";
import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  const posts = await prisma.newsPost.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return (
    <PageShell
      title="News"
      description="Blog posts shown on the public website."
      actions={
        <Link
          href="/admin/news/new"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          + New post
        </Link>
      }
    >
      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {posts.length === 0 && (
          <li className="px-4 py-6 text-sm text-zinc-500">No posts yet.</li>
        )}
        {posts.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <div>
              <div className="font-medium">{p.title}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                {p.status} · {p.slug}
              </div>
            </div>
            <Link href={`/admin/news/${p.id}`} className="text-zinc-500 underline">
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
