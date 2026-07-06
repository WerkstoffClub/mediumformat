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
    <div className="page-narrow">
      <h1 className="page-title">News</h1>
      <p className="page-lead">Reviews, staff picks, new arrivals and features.</p>

      {posts.length === 0 ? (
        <p className="page-lead">No posts yet.</p>
      ) : (
        <div className="news-list">
          {posts.map((p) => (
            <Link key={p.id} href={`/news/${p.slug}`} className="news-item">
              <h2>{p.title}</h2>
              {p.excerpt && <p className="news-excerpt">{p.excerpt}</p>}
              <div className="news-date">
                {p.publishedAt?.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
