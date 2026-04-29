import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const channels = await prisma.channel.findMany({ orderBy: { type: "asc" } });
  return (
    <PageShell
      title="Channels"
      description="Where your inventory is sold. Sync status and config."
    >
      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {channels.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                {c.type}
              </div>
            </div>
            <span
              className={
                c.enabled
                  ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                  : "rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800"
              }
            >
              {c.enabled ? "ENABLED" : "DISABLED"}
            </span>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
