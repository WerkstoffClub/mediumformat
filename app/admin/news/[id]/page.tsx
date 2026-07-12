import { notFound } from "next/navigation";
import { PageShell } from "@/components/admin/PageShell";
import { NewsForm } from "@/components/admin/NewsForm";
import { prisma } from "@/lib/db";
import { updateNews, deleteNews } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await prisma.newsPost.findUnique({ where: { id } });
  if (!post) return notFound();

  return (
    <PageShell
      title="Edit post"
      description={post.title}
      actions={
        <form action={deleteNews}>
          <input type="hidden" name="id" value={post.id} />
          <button className="btn-danger" type="submit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            Delete
          </button>
        </form>
      }
    >
      <NewsForm action={updateNews} post={post} submitLabel="Save changes" />
    </PageShell>
  );
}
