import { Prisma } from '@prisma/client';

/**
 * DealPOS remap: marketplace orders are booked against a placeholder
 * CUSTOMER record named after the platform ("TikTok" = Tokopedia, "Shopee"),
 * not against the buyer. Those records are channels, not people, so:
 *   - they never appear as customers (list, counts, top, analytics);
 *   - an invoice whose customer is a placeholder takes that placeholder's
 *     channel, ahead of its free-text tag.
 * Invoice tags are normalised the same way ("Penjualan Tiktok" → Tokopedia,
 * "Penjualan Shopee" → Shopee, other "Penjualan X" → X).
 *
 * Add a platform here when a new marketplace placeholder shows up in DealPOS.
 */
export const MARKETPLACE_CUSTOMERS: Record<string, string> = {
  tiktok: 'Tokopedia',
  'tiktok shop': 'Tokopedia',
  tiktokshop: 'Tokopedia',
  tokopedia: 'Tokopedia',
  shopee: 'Shopee',
  lazada: 'Lazada',
  blibli: 'Blibli',
};

/** Tag patterns (ILIKE) that resolve to a marketplace channel. */
const TAG_CHANNELS: Array<[string[], string]> = [
  [['%tiktok%', '%tokopedia%'], 'Tokopedia'],
  [['%shopee%'], 'Shopee'],
  [['%lazada%'], 'Lazada'],
  [['%blibli%'], 'Blibli'],
  // DealPOS defaults: "Normal" is a register sale; "Penjualan Web" the website.
  [['normal', 'penjualan normal'], 'POS'],
  [['web', 'penjualan web', 'website', 'penjualan website'], 'Website'],
];

export const PLACEHOLDER_NAMES = Object.keys(MARKETPLACE_CUSTOMERS);

/** Channel for a placeholder customer name, or null for a real buyer. */
export function placeholderChannel(name: string | null | undefined): string | null {
  if (!name) return null;
  return MARKETPLACE_CUSTOMERS[name.trim().toLowerCase()] ?? null;
}

/** Display channel for an invoice tag (mirrors the SQL expression below). */
export function tagChannel(tag: string | null | undefined): string | null {
  if (!tag) return null;
  for (const [patterns, label] of TAG_CHANNELS) {
    const t = tag.trim().toLowerCase();
    if (patterns.some(p => (p.includes('%') ? t.includes(p.replace(/%/g, '')) : t === p))) return label;
  }
  return tag.replace(/^Penjualan\s+/i, '').trim() || null;
}

/** Resolved channel of one invoice: placeholder customer first, then tag. */
export function invoiceChannel(customerName: string | null, tag: string | null): string {
  return placeholderChannel(customerName) ?? tagChannel(tag) ?? 'Direct';
}

/** SQL list of placeholder names, for `lower(btrim(x)) IN (...)`. */
export const placeholderList = Prisma.join(PLACEHOLDER_NAMES);

/** SQL predicate: this DpCustomer row is a real person (not a placeholder). */
export const realCustomer = (alias: string) =>
  Prisma.sql`lower(btrim(${Prisma.raw(`${alias}."name"`)})) NOT IN (${placeholderList})`;

/** SQL expression: normalised channel of a raw invoice tag (NULL stays NULL). */
export function tagChannelSql(tagCol: Prisma.Sql): Prisma.Sql {
  const whens = TAG_CHANNELS.map(
    ([patterns, label]) =>
      Prisma.sql`WHEN ${Prisma.join(patterns.map(p => Prisma.sql`btrim(${tagCol}) ILIKE ${p}`), ' OR ')} THEN ${label}::text`,
  );
  return Prisma.sql`CASE ${Prisma.join(whens, ' ')}
    ELSE NULLIF(btrim(regexp_replace(${tagCol}, ${'^Penjualan\\s+'}::text, '', 'i')), '') END`;
}

/** SQL expression: resolved channel of an invoice row aliased `i`. */
export function invoiceChannelSql(alias = 'i'): Prisma.Sql {
  const cust = Prisma.raw(`${alias}."customerName"`);
  const tag = Prisma.raw(`${alias}."tag"`);
  const whens = Object.entries(MARKETPLACE_CUSTOMERS).map(
    ([name, label]) => Prisma.sql`WHEN lower(btrim(${cust})) = ${name} THEN ${label}::text`,
  );
  return Prisma.sql`COALESCE(CASE ${Prisma.join(whens, ' ')} END, ${tagChannelSql(tag)}, 'Direct'::text)`;
}
