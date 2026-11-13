/** Indonesian number conventions (DESIGN.md): dot thousands, comma decimals,
 *  abbreviated money as rb / jt / M (miliar). */
const nf = new Intl.NumberFormat('id-ID');
const nf1 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

export const fmtNum = (v: number | null | undefined) => nf.format(Number(v ?? 0));

export const fmtPct = (ratio: number | null | undefined) =>
  ratio == null ? '—' : `${nf1.format(ratio * 100)}%`;

/** Rp 485.000 */
export const fmtRp = (v: number | null | undefined) => `Rp ${nf.format(Math.round(Number(v ?? 0)))}`;

/** Rp 236 rb · Rp 58,4 jt · Rp 7,42 M */
export function fmtRpShort(v: number | null | undefined): string {
  const n = Number(v ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1e9) return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n / 1e9)} M`;
  if (abs >= 1e6) return `Rp ${nf1.format(n / 1e6)} jt`;
  if (abs >= 1e3) return `Rp ${nf.format(Math.round(n / 1e3))} rb`;
  return fmtRp(n);
}

/** Sat 14 Nov · 19:00 (year added when not this year). */
export function fmtShowTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date.replace(',', '')} · ${time}`;
}

export const fmtClock = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

/** "2 min ago", "3 h ago", "4 d ago" */
export function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

/** ISO → value for <input type="datetime-local">, and back. */
export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
