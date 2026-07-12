"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  FileText,
  type LucideIcon,
} from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "Overview",
    items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/catalog", label: "Catalog", icon: Disc3 },
      { href: "/admin/inventory", label: "Inventory", icon: Package },
      { href: "/admin/purchase-orders", label: "Purchase orders", icon: FileText },
    ],
  },
  {
    title: "Selling",
    items: [
      { href: "/admin/pos", label: "POS", icon: ScanBarcode },
      { href: "/admin/orders", label: "Orders", icon: Receipt },
      { href: "/admin/customers", label: "Customers", icon: Users },
    ],
  },
  {
    title: "Engage",
    items: [
      { href: "/admin/messages", label: "Messages", icon: MessageSquare },
      { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
      { href: "/admin/news", label: "News", icon: Newspaper },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/channels", label: "Channels", icon: Cable },
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="sb-nav">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <div className="sb-group">{group.title}</div>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sb-item${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon strokeWidth={1.6} />
                <span className="sb-txt">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
