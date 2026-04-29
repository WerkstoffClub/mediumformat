// Indonesian Rupiah formatting. Display style: "IDR 850,000".
// We store amounts as Prisma Decimal (string-safe).

export function formatIdr(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "IDR 0";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "IDR 0";
  return `IDR ${Math.round(n).toLocaleString("en-US")}`;
}

export function parseIdr(input: string): number {
  return Number(input.replace(/[^0-9.-]/g, ""));
}
