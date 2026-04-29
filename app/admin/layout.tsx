import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import {
  LayoutDashboard,
  Disc3,
  Package,
  ScanBarcode,
  Receipt,
  Users,
  MessageSquare,
  Megaphone,
  Newspaper,
  Cable,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/catalog", label: "Catalog", icon: Disc3 },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
  { href: "/admin/pos", label: "POS", icon: ScanBarcode },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/news", label: "News", icon: Newspaper },
  { href: "/admin/channels", label: "Channels", icon: Cable },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  // Login page renders without sidebar.
  // Middleware already gates access; we just hide chrome.
  if (!session) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-60 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 px-5 py-5 font-mono text-sm font-semibold tracking-tight"
        >
          <span className="inline-block h-3 w-3 rounded-full bg-[var(--color-mf-accent)]" />
          MEDIUM·FORMAT
        </Link>
        <nav className="flex flex-1 flex-col px-2 py-2">
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-200 px-3 py-3 text-xs text-zinc-500 dark:border-zinc-800">
          <div className="mb-2">
            <div className="font-medium text-zinc-700 dark:text-zinc-200">
              {session.user.name ?? session.user.email}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest">
              {session.user.role}
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
