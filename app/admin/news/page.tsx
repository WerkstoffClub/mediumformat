import Link from "next/link";
import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";
import { deleteNews } from "./actions";

export const dynamic = "force-dynamic";

function statusPill(status: string): string {
  if (status === "PUBLISHED") return "pill pill-ok";
  if (status === "ARCHIVED") return "pill";
  return "pill pill-warn";
}

export default async function AdminNewsPage() {
  const posts = await prisma.newsPost.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <PageShell
      title="News"
      description="Add, edit and remove posts shown on the public website."
      actions={
        <Link href="/admin/news/new" className="btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New post
        </Link>
      }
    >
      {posts.length === 0 ? (
        <div className="coming">No posts yet. Create your first one.</div>
      ) : (
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">All posts</span>
          </div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Slug</th>
                  <th>Updated</th>
                  <th className="t-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td className="t-ink">{p.title}</td>
                    <td>
                      <span className={statusPill(p.status)}>{p.status.toLowerCase()}</span>
                    </td>
                    <td className="mono cell-sub">{p.slug}</td>
                    <td className="cell-sub">
                      {p.updatedAt.toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <div className="row-actions">
                        {p.status === "PUBLISHED" && (
                          <Link href={`/news/${p.slug}`} className="link" target="_blank">
                            View
                          </Link>
                        )}
                        <Link href={`/admin/news/${p.id}`} className="link">
                          Edit
                        </Link>
                        <form action={deleteNews}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="link-danger" type="submit">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}
