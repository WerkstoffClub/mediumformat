import type { Role } from "@prisma/client";

export type Capability =
  | "catalog.read"
  | "catalog.write"
  | "inventory.adjust"
  | "pos.sell"
  | "pos.session"
  | "orders.manage"
  | "customers.manage"
  | "messages.manage"
  | "marketing.manage"
  | "news.manage"
  | "channels.manage"
  | "reports.financial"
  | "reports.sales"
  | "settings.manage"
  | "users.manage"
  | "site.shop"
  | "site.wholesale";

const matrix: Record<Role, Capability[]> = {
  ADMIN: [
    "catalog.read",
    "catalog.write",
    "inventory.adjust",
    "pos.sell",
    "pos.session",
    "orders.manage",
    "customers.manage",
    "messages.manage",
    "marketing.manage",
    "news.manage",
    "channels.manage",
    "reports.financial",
    "reports.sales",
    "settings.manage",
    "users.manage",
    "site.shop",
    "site.wholesale",
  ],
  STAFF: [
    "catalog.read",
    "catalog.write",
    "inventory.adjust",
    "pos.sell",
    "pos.session",
    "orders.manage",
    "customers.manage",
    "messages.manage",
    "marketing.manage",
    "news.manage",
    "reports.sales",
    "site.shop",
  ],
  SHOPKEEPER: ["catalog.read", "pos.sell", "pos.session", "site.shop"],
  WHOLESALER: ["site.shop", "site.wholesale"],
  CUSTOMER: ["site.shop"],
};

export function can(role: Role | undefined | null, cap: Capability): boolean {
  if (!role) return false;
  return matrix[role]?.includes(cap) ?? false;
}

export const STAFF_ROLES = new Set<Role>(["ADMIN", "STAFF", "SHOPKEEPER"]);

export function isStaff(role: Role | undefined | null): boolean {
  return !!role && STAFF_ROLES.has(role);
}
