import { PageShell } from "@/components/admin/PageShell";
import { NewsForm } from "@/components/admin/NewsForm";
import { createNews } from "../actions";

export const dynamic = "force-dynamic";

export default function NewNewsPage() {
  return (
    <PageShell title="New post" description="Write a post for the public website.">
      <NewsForm action={createNews} submitLabel="Create post" />
    </PageShell>
  );
}
