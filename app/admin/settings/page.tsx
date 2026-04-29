import { PageShell } from "@/components/admin/PageShell";
import Link from "next/link";

const sections = [
  ["Users & roles", "MVP-1"],
  ["Store profile", "MVP-1"],
  ["Payments (Xendit)", "MVP-1"],
  ["Shipping (Biteship + Discogs policies)", "MVP-1"],
  ["Taxes (PPN 11%)", "MVP-1"],
  ["Integrations (Discogs, Tokopedia, Shopee, YouTube, OpenRouter, Listmonk)", "MVP-1"],
];

export default function SettingsPage() {
  return (
    <PageShell title="Settings" description="Store, users, integrations, taxes.">
      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {sections.map(([label, phase]) => (
          <li
            key={label}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span>{label}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              {phase}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-zinc-500">
        <Link href="/admin/dashboard" className="underline">
          Back to dashboard
        </Link>
      </p>
    </PageShell>
  );
}
